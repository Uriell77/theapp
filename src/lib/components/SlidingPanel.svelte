<script lang="ts">
	import Visualizer from './Visualizer.svelte';
	import SoundEngine from './SoundEngine.svelte';
	import Narrador from './Narrador.svelte';
	import { untrack, type Snippet } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { Motion } from 'svelte-motion';
	import { playClick, playClose, playComplete, playSlide, playSuccess } from '$lib/audio';
	import {
		parseChapter,
		isKidsTheme,
		getGenreTypography,
		splitDropCap
	} from '$lib/chapterUtils';

	let {
		isOpen = $bindable(),
		mode = 'form',
		taskData,
		selectedChapter = null,
		startInVictory = false,
		children
	}: {
		isOpen: boolean;
		mode: 'form' | 'details';
		taskData?: any;
		selectedChapter?: number | null;
		/** Abre directamente el Salón de la Victoria (tarea ya completada) */
		startInVictory?: boolean;
		children?: Snippet;
	} = $props();

	let isKids = $derived(isKidsTheme(taskData?.tema));
	let genreConfig = $derived(getGenreTypography(taskData?.tema));
	let activeChapter = $derived(
		selectedChapter !== null && selectedChapter !== undefined
			? selectedChapter
			: Number(taskData?.status ?? 0)
	);

	// ───────── SALÓN DE LA VICTORIA ─────────
	const DEFAULT_EFFECT_CONFIG =
		'effect:space-cockpit;color:deep-space-blue;speed:normal;lighting:none;mood:intro';
	const VICTORY_EFFECT_CONFIG =
		'effect:victory-gold;color:fantasy-gold;speed:slow;lighting:lens-flare;mood:victory';

	let isVictoryMode = $state(false);
	let victoryTab = $state<'bitacora' | 'libro'>('bitacora');
	let projectLogs = $state<any[]>([]);
	let logIdx = $state(0);
	let isSliderPaused = $state(false);
	let victoryLoading = $state(false);
	let isSaving = $state(false);
	let wheelCooldown = 0;
	let touchStartY = 0;

	let levelData = $derived(taskData?.levels?.[0]);
	let totalLevels = $derived(Number(taskData?.cantidad_de_niveles ?? 0));
	let isAbandoned = $derived(String(taskData?.status) === '-1');
	let isCompleted = $derived(!isAbandoned && Number(taskData?.status ?? 0) >= totalLevels - 1);
	let canClaimVictory = $derived(
		mode === 'details' &&
			!!taskData &&
			isCompleted &&
			!isVictoryMode &&
			Number(activeChapter) >= totalLevels - 1
	);

	function safeJson(raw: any): any {
		try {
			return raw ? JSON.parse(raw) : null;
		} catch {
			return null;
		}
	}

	function buildEffectConfig(c: any, fallback: string): string {
		return c?.effect
			? `effect:${c.effect};color:${c.color};speed:${c.speed};lighting:${c.lighting};mood:${c.mood}`
			: fallback;
	}

	// Saga completa: prólogo (primer registro) + todos los capítulos en orden
	let bookEntries = $derived.by(() => {
		const content: any[] = levelData?.content ?? [];
		return content.map((raw, i) => {
			const p = parseChapter(String(raw || ''));
			return {
				index: i,
				eyebrow: i === 0 ? 'Prólogo' : '',
				title: p.title,
				body: p.body || ''
			};
		});
	});

	let view = $derived.by(() => {
		if (!taskData) return null;

		if (isVictoryMode) {
			const narration =
				victoryTab === 'libro'
					? bookEntries.map((e) => `${e.title}. ${e.body}`).join(' ')
					: `${taskData.title}. ` +
						projectLogs.map((l) => `Nivel ${l.level}. ${l.log_text}`).join(' ');
			return {
				kind: 'victory' as const,
				effect: 'victory-gold',
				mood: 'victory',
				effectConfig: VICTORY_EFFECT_CONFIG,
				narration,
				key: `victory-${victoryTab}`,
				autoPlay: false,
				title: '',
				body: ''
			};
		}

		if (isAbandoned) {
			const raw = String(
				levelData?.vista?.[0] || 'Final Alternativo: Retirada Táctica. Misión abandonada.'
			);
			const p = parseChapter(raw);
			const c = safeJson(levelData?.vista?.[1]);
			return {
				kind: 'story' as const,
				effect: c?.effect || 'ash-storm',
				mood: c?.mood || 'defeat',
				effectConfig: buildEffectConfig(
					c,
					'effect:ash-storm;color:apocalyptic-rust;speed:slow;lighting:vignette-dark;mood:defeat'
				),
				narration: `${p.title || ''}. ${p.body || ''}`,
				key: 'defeat',
				autoPlay: true,
				title: p.title,
				body: p.body || p.title
			};
		}

		const content: any[] = levelData?.content ?? [];
		if (!content.length) return null;
		const hasActive = content[activeChapter] !== undefined;
		const idx = hasActive ? activeChapter : 0;
		const p = parseChapter(String(content[idx] || ''));
		const c = hasActive ? safeJson(levelData?.cinematica?.[activeChapter]) ?? {} : null;
		return {
			kind: 'story' as const,
			effect: c?.effect ?? 'space-cockpit',
			mood: c?.mood ?? 'intro',
			effectConfig: c?.effect ? buildEffectConfig(c, DEFAULT_EFFECT_CONFIG) : DEFAULT_EFFECT_CONFIG,
			narration: `${p.title || ''}. ${p.body || ''}`,
			key: idx,
			autoPlay: true,
			title: p.title,
			body: p.body || p.title
		};
	});

	let viewDropCap = $derived(splitDropCap(view?.body));

	function closePanel() {
		playClose();
		isOpen = false;
	}

	function selectVictoryTab(tab: 'bitacora' | 'libro') {
		playClick();
		if (victoryTab !== tab) {
			playSlide();
			victoryTab = tab;
		}
	}

	async function enterVictory() {
		if (!taskData) return;
		playComplete();
		isVictoryMode = true;
		victoryTab = 'bitacora';
		logIdx = 0;
		isSliderPaused = false;
		victoryLoading = true;
		try {
			const taskIdNum = Number(taskData.id);
			let rows: any[] = [];

			const { data, error } = await supabase
				.from('project_logs')
				.select('*')
				.or(`task_id.eq.${taskIdNum},project_id.eq.${taskIdNum}`)
				.order('level', { ascending: true })
				.order('created_at', { ascending: true });

			if (!error && Array.isArray(data) && data.length > 0) {
				rows = data;
			} else {
				const res = await fetch(`/api/project-logs?taskId=${encodeURIComponent(String(taskData.id))}`);
				if (res.ok) {
					const payload = await res.json();
					if (Array.isArray(payload?.logs)) {
						rows = payload.logs;
					}
				}
			}

			projectLogs = rows;
		} catch (err) {
			console.error('Error al cargar project_logs:', err);
			projectLogs = [];
		} finally {
			victoryLoading = false;
		}
	}

	async function saveToHall() {
		if (!taskData || isSaving) return;
		playClick();
		isSaving = true;
		try {
			const fd = new FormData();
			fd.append('taskId', String(taskData.id));
			const res = await fetch('/dashboard?/archiveTask', {
				method: 'POST',
				body: fd,
				headers: { 'x-sveltekit-action': 'true' }
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			playSuccess();
			await invalidateAll();
			isOpen = false;
		} catch (err) {
			console.error('Error al guardar en el Salón de la Victoria:', err);
		} finally {
			isSaving = false;
		}
	}

	function shiftLog(delta: number, withAudio = false) {
		if (!projectLogs.length) return;
		if (withAudio) {
			playClick();
			playSlide();
		}
		logIdx = (logIdx + delta + projectLogs.length) % projectLogs.length;
	}

	function selectLogIndex(index: number) {
		playClick();
		if (logIdx !== index) {
			playSlide();
			logIdx = index;
		}
	}

	function handleSliderWheel(e: WheelEvent) {
		if (projectLogs.length < 2) return;
		if (Math.abs(e.deltaY) < 12) return;
		const now = Date.now();
		if (now - wheelCooldown < 380) return;
		e.preventDefault();
		wheelCooldown = now;
		shiftLog(e.deltaY > 0 ? 1 : -1, true);
	}

	function handleTouchStart(e: TouchEvent) {
		touchStartY = e.touches[0]?.clientY ?? 0;
	}

	function handleTouchEnd(e: TouchEvent) {
		if (projectLogs.length < 2) return;
		const endY = e.changedTouches[0]?.clientY ?? touchStartY;
		const deltaY = endY - touchStartY;
		if (Math.abs(deltaY) > 36) {
			shiftLog(deltaY < 0 ? 1 : -1, true);
		}
	}

	function formatLogDate(value: string) {
		const d = new Date(value);
		return isNaN(d.getTime())
			? ''
			: d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
	}

	// Reset al cerrar / apertura directa en modo victoria
	$effect(() => {
		if (!isOpen) {
			isVictoryMode = false;
			victoryTab = 'bitacora';
			projectLogs = [];
			logIdx = 0;
			isSliderPaused = false;
			return;
		}
		if (mode === 'details' && startInVictory && taskData && isCompleted) {
			untrack(() => {
				if (!isVictoryMode) enterVictory();
			});
		}
	});

	// Carrusel vertical automático de la bitácora
	$effect(() => {
		if (!isVictoryMode || victoryTab !== 'bitacora' || projectLogs.length < 2 || isSliderPaused) return;
		void logIdx;
		const timer = setInterval(() => shiftLog(1), 7000);
		return () => clearInterval(timer);
	});


// Acción de Svelte para el efecto
	function typewriter(node: HTMLElement, { text, speed }: { text: string; speed: number }) {
		let currentText = '';
		let index = 0;
		let interval: ReturnType<typeof setInterval>;

		function startEffect(txt: string) {
			clearInterval(interval);
			currentText = '';
			index = 0;
			node.textContent = '';
			const safeText = txt || '';
			interval = setInterval(() => {
				if (index < safeText.length) {
					currentText += safeText[index];
					node.textContent = currentText;
					index++;
				} else {
					clearInterval(interval);
				}
			}, speed || 50);
		}

		startEffect(text);

		return {
			update({ text: newText }: { text: string; speed: number }) {
				startEffect(newText);
			},
			destroy() {
				clearInterval(interval);
			}
		};
	}



</script>

{#if isOpen}
	<div class="panel-overlay">
		<!-- Fondo oscuro atenuado con fade -->
		<div
			class="panel-background"
			onclick={closePanel}
			transition:fade={{ duration: 250 }}
			role="button"
			tabindex="0"
			aria-label="Cerrar panel"
			onkeydown={(e) => e.key === 'Escape' && closePanel()}
		></div>

		<!-- Panel deslizante con transición fly suave desde el fondo -->
		<div
			class="panel-content px-1"
			transition:fly={{ y: 600, duration: 350, easing: cubicOut }}
		>
			<!-- Manija de arrastre / indicador visual estético -->
			<div class="drag-handle-bar"></div>

			<Motion whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} let:motion>
				<button
					use:motion
					class="close-btn"
					onclick={closePanel}
					aria-label="Cerrar"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</Motion>

			<section class="section p-0">
				<div class="container is-fluid h-full flex flex-col px-0">
					{#if mode === 'form'}
						<div class="p-4">
							<h2 class="panel-title mb-3">Nueva Tarea</h2>
							{@render children?.()}
						</div>
					{:else if mode === 'details' && taskData}
						<div
							class="flex flex-col h-full overflow-hidden {genreConfig.genreClass}"
							style="
								--genre-title-font: {genreConfig.titleFont};
								--genre-body-font: {genreConfig.bodyFont};
								--genre-dropcap-font: {genreConfig.dropCapFont};
								--genre-accent: {genreConfig.accentColor};
								--genre-glow: {genreConfig.accentGlow};
								--genre-dropcap-bg: {genreConfig.dropCapBg};
								--genre-dropcap-border: {genreConfig.dropCapBorder};
								--genre-body-color: {genreConfig.bodyColor};
							"
						>
							<div class="p-1 pb-2">
								<h2 class="panel-title is-capitalized {isKids ? 'font-kids' : ''}">{taskData.title}</h2>
								<div class="meta-tags">
									<span class="meta-tag {isKids ? 'font-kids' : ''}">
										Temática: <strong style="color: {genreConfig.accentColor};">{taskData.tema}</strong>
									</span>
									<span class="meta-tag {isKids ? 'font-kids' : ''}">
										{isVictoryMode ? 'Estado' : 'Capítulo'}: <strong style="color: {genreConfig.accentColor};">
											{isVictoryMode
												? '🏆 Victoria'
												: isAbandoned
													? 'Abandonada'
													: `${Number(activeChapter) + 1} / ${taskData.cantidad_de_niveles}`}
										</strong>
									</span>
								</div>
							</div>

							{#if isVictoryMode}
								<div class="tabs is-centered is-toggle is-small victory-tabs mb-2">
									<ul>
										<li class:is-active={victoryTab === 'bitacora'}>
											<!-- svelte-ignore a11y_missing_attribute -->
											<a class="is-size-7-mobile" role="button" tabindex="0" onclick={() => selectVictoryTab('bitacora')} onkeydown={(e) => e.key === 'Enter' && selectVictoryTab('bitacora')}>
												📸 Bitácora de Desbloqueo
											</a>
										</li>
										<li class:is-active={victoryTab === 'libro'}>
											<!-- svelte-ignore a11y_missing_attribute -->
											<a class="is-size-7-mobile" role="button" tabindex="0" onclick={() => selectVictoryTab('libro')} onkeydown={(e) => e.key === 'Enter' && selectVictoryTab('libro')}>
												📖 Crónica Completa
											</a>
										</li>
									</ul>
								</div>
							{/if}

							<div class="narrative-container flex-grow overflow-hidden px-2 pb-2">
								{#if view}
									<SoundEngine effect={view.effect} mood={view.mood} active={isOpen}>
										{#snippet controls()}
											{#key view.key}
												<Narrador
													text={view.narration}
													active={isOpen}
													autoPlay={view.autoPlay}
													taskId={taskData.id}
													chapterKey={view.key}
												/>
											{/key}
										{/snippet}
										<Visualizer effectConfig={view.effectConfig}>
											<article class="book-folio-sheet levelcontent">
												{#if view.kind === 'victory' && victoryTab === 'bitacora'}
													<div class="victory-tab-pane" in:fly={{ x: 18, duration: 280, easing: cubicOut }}>
													<header class="book-folio-header">
														<h4 class="book-chapter-title">🏆 {taskData.title}</h4>
														<div class="book-ornament-divider" aria-hidden="true">{genreConfig.ornament}</div>
													</header>
													<div class="book-page-scroll">
														{#if victoryLoading}
															<p class="book-story-paragraph">Cargando tu bitácora…</p>
														{:else if projectLogs.length === 0}
															<p class="book-story-paragraph">Aún no hay registros de bitácora para esta misión.</p>
														{:else}
															<div
																class="vertical-slider-shell"
																role="region"
																aria-label="Slider vertical de Bitácora de Desbloqueo"
																onmouseenter={() => (isSliderPaused = true)}
																onmouseleave={() => (isSliderPaused = false)}
																onwheel={handleSliderWheel}
																ontouchstart={handleTouchStart}
																ontouchend={handleTouchEnd}
															>
																<div class="vertical-slider-viewport">
																	{#key logIdx}
																		{@const log = projectLogs[logIdx]}
																		<div class="log-slide vertical-fade-slide" in:fade={{ duration: 600 }}>
																			<div class="log-media">
																				{#if log.media_url}
																					<img class="ken-burns" src={log.media_url} alt="Evidencia del capítulo {Number(log.level) + 1}" />
																				{:else}
																					<div class="ken-burns log-media-fallback" aria-hidden="true">🏆</div>
																				{/if}
																			</div>
																			<div class="log-meta is-flex is-align-items-center is-justify-content-space-between">
																				<span class="tag is-warning is-light">🔓 Capítulo {Number(log.level) + 1} desbloqueado</span>
																				<time class="log-date">{formatLogDate(log.created_at)}</time>
																			</div>
																			<p class="book-story-paragraph log-text">{log.log_text}</p>
																		</div>
																	{/key}
																</div>

																{#if projectLogs.length > 1}
																	<div class="vertical-slider-rail">
																		<button type="button" class="log-nav-btn" aria-label="Capítulo anterior" onclick={() => shiftLog(-1, true)}>▲</button>
																		<div class="vertical-dots">
																			{#each projectLogs as logItem, i}
																				<button
																					type="button"
																					class="log-dot-vertical"
																					class:active={i === logIdx}
																					title="Capítulo {Number(logItem.level) + 1}"
																					aria-label="Ir al capítulo {Number(logItem.level) + 1}"
																					onclick={() => selectLogIndex(i)}
																				></button>
																			{/each}
																		</div>
																		<span class="vertical-counter">{logIdx + 1}/{projectLogs.length}</span>
																		<button type="button" class="log-nav-btn" aria-label="Capítulo siguiente" onclick={() => shiftLog(1, true)}>▼</button>
																	</div>
																{/if}
															</div>
														{/if}
													</div>
													</div>
												{:else if view.kind === 'victory'}
													<div class="book-page-scroll" in:fly={{ x: 18, duration: 280, easing: cubicOut }}>
														{#each bookEntries as entry, i (entry.index)}
															{#if i > 0}
																<div class="book-ornament-divider book-chapter-break" aria-hidden="true">{genreConfig.ornament}</div>
															{/if}
															{#if entry.eyebrow}
																<div class="book-ornament-divider">{entry.eyebrow}</div>
															{/if}
															{#if entry.title}
																<h4 class="book-chapter-title">{entry.title.endsWith('.') ? entry.title : `${entry.title}.`}</h4>
															{/if}
															<p class="book-story-paragraph">{entry.body}</p>
														{:else}
															<p class="book-story-paragraph">No hay narrativa asociada a esta tarea.</p>
														{/each}
														<div class="book-ornament-divider book-chapter-break" aria-hidden="true">{genreConfig.ornament} FIN {genreConfig.ornament}</div>
													</div>
												{:else}
													<header class="book-folio-header">
														{#if view.title}
															<h4 class="book-chapter-title">
																{view.title.endsWith('.') ? view.title : `${view.title}.`}
															</h4>
															<div class="book-ornament-divider" aria-hidden="true">{genreConfig.ornament}</div>
														{/if}
													</header>
													<div class="book-page-scroll">
														<p class="book-story-paragraph">
															{#if viewDropCap.initial}
																<span class="book-drop-cap" aria-hidden="true">{viewDropCap.initial}</span>
															{/if}
															<span class="book-story-stream" use:typewriter={{ text: viewDropCap.rest, speed: 42 }}></span>
														</p>
													</div>
												{/if}
											</article>
										</Visualizer>
									</SoundEngine>
								{:else}
									<div class="p-4">
										<p style="color: var(--text-muted, #9aa6ad);">No hay narrativa asociada a esta tarea.</p>
									</div>
								{/if}
							</div>

							{#if canClaimVictory}
								<div class="victory-footer px-2 pb-3">
									<button
										type="button"
										class="button is-small is-fullwidth victory-claim-btn"
										onclick={() => {
											playClick();
											enterVictory();
										}}
									>
										🏆 Reclamar Victoria y Ver Epílogo
									</button>
								</div>
							{:else if isVictoryMode && !taskData.isArchived}
								<div class="victory-footer px-2 pb-3">
									<button
										type="button"
										class="button is-small is-fullwidth victory-save-btn"
										class:is-loading={isSaving}
										disabled={isSaving}
										onclick={saveToHall}
									>
										Guardar en el Salón de la Victoria
									</button>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</section>
		</div>
	</div>
{/if}

<style>
	.levelcontent {
		width: 100%;
		height: 100%;
	}

	.panel-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		z-index: 1000;
		pointer-events: auto;
		overflow: hidden;
		font-family: var(--font-hierarchy-body);
	}

	.panel-background {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(10, 18, 22, 0.7);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		z-index: 1001;
	}

	.panel-content {
		position: relative;
		z-index: 1002;
		background: rgba(22, 33, 40, 0.9);
		backdrop-filter: blur(28px);
		-webkit-backdrop-filter: blur(28px);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-bottom: none;
		width: 100vw;
		max-height: 95vh;
		min-height: 95vh;
		border-radius: 28px 28px 0 0;
		box-shadow: 0 -12px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12);
		padding: 1.2rem 0.5rem 0 0.5rem;
		color: var(--text-main, #ffffff);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		font-family: var(--font-hierarchy-body);
	}

	.section {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.container {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.drag-handle-bar {
		width: 42px;
		height: 4px;
		background: rgba(255, 255, 255, 0.25);
		border-radius: 4px;
		margin: 0 auto 0.8rem auto;
		flex-shrink: 0;
	}

	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1.2rem;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: var(--text-muted, #9aa6ad);
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
		z-index: 1010;
		transition: all 0.2s ease;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.16);
		color: #ffffff;
	}

	.panel-title {
		font-family: var(--font-hierarchy-display);
		font-size: 1.35rem;
		font-weight: 700;
		color: #ffffff;
		margin-bottom: 0.5rem;
		letter-spacing: -0.01em;
	}

	.meta-tags {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.meta-tag {
		font-family: var(--font-hierarchy-ui);
		background: rgba(0, 0, 0, 0.28);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 4px 10px;
		font-size: 0.75rem;
		color: var(--text-muted, #9aa6ad);
		font-weight: 500;
	}

	.meta-tag strong {
		color: var(--accent-primary, #19d4a8);
		font-weight: 700;
	}

	.narrative-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 100%;
	}

	/* === DISEÑO DE PÁGINA DE LIBRO ILUMINADO SOBRE FONDO CINEMÁTICO === */
	.book-folio-sheet {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		padding: clamp(1rem, 3vw, 1.5rem) clamp(1rem, 3.5vw, 1.65rem);
		box-sizing: border-box;
		pointer-events: auto;
		border-radius: 18px;
		/* Velo oscuro tipo pergamino/vitela translúcido que preserva la vista de la cinemática pero garantiza contraste total */
		background: linear-gradient(
			165deg,
			rgba(9, 15, 21, 0.76) 0%,
			rgba(13, 21, 28, 0.84) 55%,
			rgba(8, 13, 18, 0.88) 100%
		);
		backdrop-filter: blur(5px);
		-webkit-backdrop-filter: blur(5px);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-left: 4px solid var(--genre-accent, #19d4a8);
		box-shadow:
			0 14px 38px rgba(0, 0, 0, 0.65),
			inset 14px 0 24px -12px rgba(0, 0, 0, 0.7),
			inset 0 1px 0 rgba(255, 255, 255, 0.14);
		/* El scroll vive solo en .book-page-scroll; los controles de audio quedan fijos */
		overflow: hidden;
		min-height: 0;
	}

	.book-folio-header {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.55rem;
		margin-bottom: 0.85rem;
	}

	.book-chapter-title {
		font-family: var(--genre-title-font);
		color: var(--genre-accent, #ffd670);
		font-size: clamp(1.22rem, 3.6vw, 1.55rem);
		font-weight: 800;
		line-height: 1.3;
		margin: 0.15rem 0 0 0;
		letter-spacing: 0.03em;
		text-shadow:
			0 2px 6px rgba(0, 0, 0, 0.95),
			0 0 18px var(--genre-glow, rgba(255, 214, 112, 0.45));
	}

	.book-ornament-divider {
		font-family: var(--genre-title-font);
		color: var(--genre-accent, #ffd670);
		font-size: 0.78rem;
		letter-spacing: 0.25em;
		opacity: 0.85;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
		margin-bottom: 0.15rem;
		user-select: none;
	}

	.book-page-scroll {
		flex: 1;
		min-height: 0;
		width: 100%;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
	}

	.book-folio-header {
		flex-shrink: 0;
	}

	.book-chapter-break {
		text-align: center;
		margin: 0.5rem 0 1.25rem 0;
		font-size: 1rem;
	}

	/* === SALÓN DE LA VICTORIA === */
	.victory-tab-pane {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		width: 100%;
		overflow: hidden;
	}

	.victory-tabs :global(a) {
		font-size: 0.78rem;
	}

	.victory-tabs :global(li.is-active a) {
		background: linear-gradient(135deg, #ffd670, #19d4a8);
		border-color: transparent;
		color: #1a1203;
		font-weight: 700;
	}

	.victory-footer {
		flex-shrink: 0;
	}

	:global(.victory-claim-btn) {
		background: linear-gradient(135deg, #ffd670 0%, #f2a900 45%, #19d4a8 100%);
		border: none;
		color: #1a1203;
		font-weight: 800;
		letter-spacing: 0.02em;
		box-shadow: 0 0 22px rgba(255, 214, 112, 0.55);
		animation: victory-pulse 2s ease-in-out infinite;
	}

	:global(.victory-save-btn) {
		background: linear-gradient(135deg, #19d4a8, #0f9d7a);
		border: 1px solid rgba(255, 214, 112, 0.6);
		color: #fff;
		font-weight: 700;
	}

	@keyframes victory-pulse {
		0%, 100% { box-shadow: 0 0 14px rgba(255, 214, 112, 0.35); }
		50% { box-shadow: 0 0 30px rgba(255, 214, 112, 0.75); }
	}

	.vertical-slider-shell {
		display: flex;
		align-items: stretch;
		gap: 0.75rem;
		min-height: 0;
	}

	.vertical-slider-viewport {
		flex: 1;
		min-width: 0;
	}

	.vertical-fade-slide {
		animation: vertical-fade-rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes vertical-fade-rise {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.vertical-slider-rail {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		flex-shrink: 0;
		padding: 0.35rem 0.2rem;
	}

	.vertical-dots {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}

	.log-dot-vertical {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		border: none;
		padding: 0;
		background: rgba(255, 255, 255, 0.3);
		cursor: pointer;
		transition: all 0.25s ease;
	}

	.log-dot-vertical.active {
		height: 20px;
		background: #ffd670;
		box-shadow: 0 0 8px rgba(255, 214, 112, 0.8);
	}

	.vertical-counter {
		font-size: 0.66rem;
		font-weight: 700;
		color: #ffd670;
		letter-spacing: 0.04em;
	}

	.log-slide {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.log-media {
		position: relative;
		width: 100%;
		height: clamp(160px, 32vh, 280px);
		overflow: hidden;
		border-radius: 14px;
		border: 1px solid rgba(255, 214, 112, 0.35);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
	}

	.ken-burns {
		width: 100%;
		height: 100%;
		object-fit: cover;
		animation: ken-burns 9s ease-in-out infinite alternate;
		transform-origin: center;
	}

	.log-media-fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 4rem;
		background: radial-gradient(circle at 50% 40%, rgba(255, 214, 112, 0.35), rgba(30, 20, 5, 0.9));
	}

	@keyframes ken-burns {
		from { transform: scale(1) translate(0, 0); }
		to { transform: scale(1.18) translate(-2%, -2%); }
	}

	.log-date {
		font-size: 0.75rem;
		color: var(--genre-body-color, #f8f3e6);
		opacity: 0.8;
	}

	.log-text {
		margin-bottom: 0.75rem;
	}

	.log-nav-btn {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 214, 112, 0.4);
		color: #ffd670;
		border-radius: 50%;
		width: 28px;
		height: 28px;
		font-size: 0.7rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.book-story-paragraph {
		font-family: var(--genre-body-font);
		color: var(--genre-body-color, #f8f3e6);
		font-size: clamp(1.08rem, 2.8vw, 1.24rem);
		font-weight: 500;
		line-height: 1.88;
		letter-spacing: 0.015em;
		margin: 0.25rem 0 2.5rem 0;
		white-space: pre-wrap;
		/* Sombra multicapa para máxima nitidez sobre cualquier partícula o destello del canvas */
		text-shadow:
			0 1px 2px rgba(0, 0, 0, 0.98),
			0 2px 8px rgba(0, 0, 0, 0.88),
			0 0 18px rgba(0, 0, 0, 0.65);
	}

	/* === LETRA CAPITAL / CAPITULAR DE LIBRO (DROP CAP) === */
	.book-drop-cap {
		float: left;
		font-family: var(--genre-dropcap-font);
		font-size: clamp(2.35rem, 7vw, 3.6rem);
		font-weight: 800;
		line-height: 0.86;
		color: var(--genre-accent, #ffd670);
		background: var(--genre-dropcap-bg);
		border: 1px solid var(--genre-dropcap-border);
		border-radius: 12px;
		padding: 0.22em 0.28em 0.18em 0.28em;
		margin: 0.04em 0.42rem 0.1rem 0;
		box-shadow:
			0 6px 16px rgba(0, 0, 0, 0.55),
			0 0 14px var(--genre-glow, rgba(255, 214, 112, 0.3)),
			inset 0 1px 1px rgba(255, 255, 255, 0.35);
		text-shadow:
			0 2px 4px rgba(0, 0, 0, 0.9),
			0 0 12px var(--genre-glow, rgba(255, 214, 112, 0.5));
		user-select: none;
	}

	.book-story-stream {
		display: inline;
		font-size: small;
	}

	.flex-grow {
		flex-grow: 1;
	}

	.h-full {
		height: 100%;
	}

	.flex {
		display: flex;
	}

	.flex-col {
		flex-direction: column;
	}

	.overflow-hidden {
		overflow: hidden;
	}

	@media (min-width: 1024px) {
		.panel-content {
			width: 60vw;
			max-width: 900px;
			border-radius: 28px 28px 0 0;
		}
	}
</style>
