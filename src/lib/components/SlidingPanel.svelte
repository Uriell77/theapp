<script lang="ts">
	import Visualizer from './Visualizer.svelte';
	import SoundEngine from './SoundEngine.svelte';
	import Narrador from './Narrador.svelte';
	import type { Snippet } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { Motion } from 'svelte-motion';
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
		children
	}: {
		isOpen: boolean;
		mode: 'form' | 'details';
		taskData?: any;
		selectedChapter?: number | null;
		children?: Snippet;
	} = $props();

	let isKids = $derived(isKidsTheme(taskData?.tema));
	let genreConfig = $derived(getGenreTypography(taskData?.tema));
	let activeChapter = $derived(
		selectedChapter !== null && selectedChapter !== undefined
			? selectedChapter
			: Number(taskData?.status ?? 0)
	);




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
			onclick={() => (isOpen = false)}
			transition:fade={{ duration: 250 }}
			role="button"
			tabindex="0"
			aria-label="Cerrar panel"
			onkeydown={(e) => e.key === 'Escape' && (isOpen = false)}
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
					onclick={() => (isOpen = false)}
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
										Capítulo: <strong style="color: {genreConfig.accentColor};">
											{taskData.status === '-1' ? 'Abandonada' : `${Number(activeChapter) + 1} / ${taskData.cantidad_de_niveles}`}
										</strong>
									</span>
								</div>
							</div>

							{#if taskData.status === '-1'}
								{@const defeatRaw = String(taskData.levels?.[0]?.vista?.[0] || 'Final Alternativo: Retirada Táctica. Misión abandonada.')}
								{@const parsedDefeat = parseChapter(defeatRaw)}
								{@const defeatText = parsedDefeat.body || parsedDefeat.title}
								{@const defeatDropCap = splitDropCap(defeatText)}
								{@const defeatCinematicaRaw = taskData.levels?.[0]?.vista?.[1]}
								{@const defeatCinematicaParsed = defeatCinematicaRaw ? (() => { try { return JSON.parse(defeatCinematicaRaw); } catch { return null; } })() : null}
								{@const defeatEffectConfig = defeatCinematicaParsed ? `effect:${defeatCinematicaParsed.effect};color:${defeatCinematicaParsed.color};speed:${defeatCinematicaParsed.speed};lighting:${defeatCinematicaParsed.lighting};mood:${defeatCinematicaParsed.mood}` : 'effect:ash-storm;color:apocalyptic-rust;speed:slow;lighting:vignette-dark;mood:defeat'}
								<div class="narrative-container flex-grow overflow-hidden px-2 pb-2">
									<SoundEngine effect={defeatCinematicaParsed?.effect || 'ash-storm'} mood={defeatCinematicaParsed?.mood || 'defeat'} active={isOpen}>
										<Visualizer effectConfig={defeatEffectConfig}>
											<article class="book-folio-sheet levelcontent">
												<header class="book-folio-header">
													<Narrador text={`${parsedDefeat.title || ''}. ${parsedDefeat.body || ''}`} active={isOpen} taskId={taskData.id} chapterKey="defeat" />
													{#if parsedDefeat.title}
														<h4 class="book-chapter-title">
															{parsedDefeat.title.endsWith('.') ? parsedDefeat.title : `${parsedDefeat.title}.`}
														</h4>
														<div class="book-ornament-divider" aria-hidden="true">{genreConfig.ornament}</div>
													{/if}
												</header>
												<div class="book-page-scroll">
													<p class="book-story-paragraph">
														{#if defeatDropCap.initial}
															<span class="book-drop-cap" aria-hidden="true">{defeatDropCap.initial}</span>
														{/if}
														<span class="book-story-stream" use:typewriter={{ text: defeatDropCap.rest, speed: 42 }}></span>
													</p>
												</div>
											</article>
										</Visualizer>
									</SoundEngine>
								</div>
							{:else}
								{#if taskData.levels && taskData.levels.length > 0}
									{#each taskData.levels as level (level.id)}
										<div class="narrative-container flex-grow overflow-hidden px-2 pb-2">
											<!-- Narrativa del Capítulo Seleccionado -->
											{#if level.content && level.content[activeChapter] !== undefined}
												{@const currentRaw = String(level.content[activeChapter] || '')}
												{@const parsed = parseChapter(currentRaw)}
												{@const storyText = parsed.body || parsed.title}
												{@const dropCap = splitDropCap(storyText)}
												{#if level.cinematica && level.cinematica[activeChapter]}
													{@const parsedCinematica = (() => { try { return JSON.parse(level.cinematica[activeChapter]); } catch { return {}; } })()}
													<SoundEngine effect={parsedCinematica.effect} mood={parsedCinematica.mood} active={isOpen}>
														<Visualizer effectConfig={`effect:${parsedCinematica.effect};color:${parsedCinematica.color};speed:${parsedCinematica.speed};lighting:${parsedCinematica.lighting};mood:${parsedCinematica.mood}`}>
															<article class="book-folio-sheet levelcontent">
																<header class="book-folio-header">
																	<Narrador text={`${parsed.title || ''}. ${parsed.body || ''}`} active={isOpen} taskId={taskData.id} chapterKey={activeChapter} />
																	{#if parsed.title}
																		<h4 class="book-chapter-title">
																			{parsed.title.endsWith('.') ? parsed.title : `${parsed.title}.`}
																		</h4>
																		<div class="book-ornament-divider" aria-hidden="true">{genreConfig.ornament}</div>
																	{/if}
																</header>
																<div class="book-page-scroll">
																	<p class="book-story-paragraph">
																		{#if dropCap.initial}
																			<span class="book-drop-cap" aria-hidden="true">{dropCap.initial}</span>
																		{/if}
																		<span class="book-story-stream" use:typewriter={{ text: dropCap.rest, speed: 42 }}></span>
																	</p>
																</div>
															</article>
														</Visualizer>
													</SoundEngine>
												{:else}
													<SoundEngine effect="space-cockpit" mood="intro" active={isOpen}>
														<Visualizer>
															<article class="book-folio-sheet levelcontent">
																<header class="book-folio-header">
																	<Narrador text={`${parsed.title || ''}. ${parsed.body || ''}`} active={isOpen} taskId={taskData.id} chapterKey={activeChapter} />
																	{#if parsed.title}
																		<h4 class="book-chapter-title">
																			{parsed.title.endsWith('.') ? parsed.title : `${parsed.title}.`}
																		</h4>
																		<div class="book-ornament-divider" aria-hidden="true">{genreConfig.ornament}</div>
																	{/if}
																</header>
																<div class="book-page-scroll">
																	<p class="book-story-paragraph">
																		{#if dropCap.initial}
																			<span class="book-drop-cap" aria-hidden="true">{dropCap.initial}</span>
																		{/if}
																		<span class="book-story-stream" use:typewriter={{ text: dropCap.rest, speed: 42 }}></span>
																	</p>
																</div>
															</article>
														</Visualizer>
													</SoundEngine>
												{/if}
											{:else if level.content && level.content[0] !== undefined}
												{@const parsed0 = parseChapter(level.content[0])}
												{@const story0Text = parsed0.body || parsed0.title}
												{@const dropCap0 = splitDropCap(story0Text)}
												<article class="book-folio-sheet levelcontent">
													<header class="book-folio-header">
														<Narrador text={`${parsed0.title || ''}. ${parsed0.body || ''}`} active={isOpen} taskId={taskData.id} chapterKey={0} />
														{#if parsed0.title}
															<h4 class="book-chapter-title">
																{parsed0.title.endsWith('.') ? parsed0.title : `${parsed0.title}.`}
															</h4>
															<div class="book-ornament-divider" aria-hidden="true">{genreConfig.ornament}</div>
														{/if}
													</header>
													<div class="book-page-scroll">
														<p class="book-story-paragraph">
															{#if dropCap0.initial}
																<span class="book-drop-cap" aria-hidden="true">{dropCap0.initial}</span>
															{/if}
															<span class="book-story-stream" use:typewriter={{ text: dropCap0.rest, speed: 42 }}></span>
														</p>
													</div>
												</article>
											{/if}
										</div>
									{/each}
								{:else}
									<div class="p-4">
										<p style="color: var(--text-muted, #9aa6ad);">No hay narrativa asociada a esta tarea.</p>
									</div>
								{/if}
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
		overflow-y: auto;
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
		width: 100%;
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
