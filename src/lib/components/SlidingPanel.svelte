<script lang="ts">
	import Visualizer from './Visualizer.svelte';
	import type { Snippet } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { Motion } from 'svelte-motion';
	import { parseChapter, isKidsTheme } from '$lib/chapterUtils';

	let {
		isOpen = $bindable(),
		mode = 'form',
		taskData,
		children
	}: { isOpen: boolean; mode: 'form' | 'details'; taskData?: any; children?: Snippet } = $props();

	let isKids = $derived(isKidsTheme(taskData?.tema));




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
			class="panel-content px-4"
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
				<div class="container">
					{#if mode === 'form'}
						<div>
							<h2 class="panel-title">Nueva Tarea</h2>
							{@render children?.()}
						</div>
					{:else if mode === 'details' && taskData}
						<div>
							<h2 class="panel-title is-capitalized {isKids ? 'font-kids' : ''}">{taskData.title}</h2>
							<div class="meta-tags mb-4">
								<span class="meta-tag {isKids ? 'font-kids' : ''}">
									Temática: <strong style="color: {isKids ? '#ffd166' : 'var(--accent-primary)'};">{taskData.tema}</strong>
								</span>
								<span class="meta-tag {isKids ? 'font-kids' : ''}">
									Progreso: <strong>
										{taskData.status === '-1' ? 'Abandonada' : `${Number(taskData.status) + 1} / ${taskData.cantidad_de_niveles}`}
									</strong>
								</span>
							</div>

							{#if taskData.status === '-1'}
								{@const defeatRaw = String(taskData.levels?.[0]?.vista?.[0] || 'Final Alternativo: Retirada Táctica. Misión abandonada.')}
								{@const parsedDefeat = parseChapter(defeatRaw)}
								{@const defeatCinematicaRaw = taskData.levels?.[0]?.vista?.[1]}
								{@const defeatCinematicaParsed = defeatCinematicaRaw ? (() => { try { return JSON.parse(defeatCinematicaRaw); } catch { return null; } })() : null}
								{@const defeatEffectConfig = defeatCinematicaParsed ? `effect:${defeatCinematicaParsed.effect};color:${defeatCinematicaParsed.color};speed:${defeatCinematicaParsed.speed};lighting:${defeatCinematicaParsed.lighting};mood:${defeatCinematicaParsed.mood}` : 'effect:ash-storm;color:apocalyptic-rust;speed:slow;lighting:vignette-dark;mood:defeat'}
								<div class="narrative-container">
									<Visualizer effectConfig={defeatEffectConfig}>
										<div class="p-3 mb-1 levelcontent hud-container {isKids ? 'kids-narrative' : 'modern-narrative'}" style="border-left: 4px solid {isKids ? '#ffd166' : 'var(--accent-primary, #19d4a8)'};">
											{#if parsedDefeat.title}
												<div class="chapter-badge-wrapper mb-2">
													<h4 class="chapter-title-display {isKids ? 'font-kids chapter-title-kids' : 'font-modern-chapter chapter-title-modern'}">
														{parsedDefeat.title.endsWith('.') ? parsedDefeat.title : `${parsedDefeat.title}.`}
													</h4>
												</div>
											{/if}
											<p class="is-italic has-text-weight-bold is-size-7-mobile narrative-body-text {isKids ? 'font-kids text-kids' : 'text-standard'}" style="color: {isKids ? '#fff9e6' : '#f0f0f0'}; line-height: 1.75; white-space: pre-wrap;" use:typewriter={{ text: parsedDefeat.body || parsedDefeat.title, speed: 45 }}></p>
										</div>
									</Visualizer>
								</div>
							{:else}
								{#if taskData.levels && taskData.levels.length > 0}
									{#each taskData.levels as level (level.id)}
										<div class="narrative-container">
											<!-- Narrativa Actual -->
											{#if level.content && level.content[taskData.status] !== undefined}
												{@const currentRaw = String(level.content[taskData.status] || '')}
												{@const parsed = parseChapter(currentRaw)}
												{#if level.cinematica && level.cinematica[taskData.status]}
													<Visualizer effectConfig={`effect:${JSON.parse(level.cinematica[taskData.status]).effect};color:${JSON.parse(level.cinematica[taskData.status]).color};speed:${JSON.parse(level.cinematica[taskData.status]).speed};lighting:${JSON.parse(level.cinematica[taskData.status]).lighting};mood:${JSON.parse(level.cinematica[taskData.status]).mood}`}>
														<div class="p-3 mb-1 levelcontent hud-container {isKids ? 'kids-narrative' : 'modern-narrative'}" style="border-left: 4px solid {isKids ? '#ffd166' : 'var(--accent-primary, #19d4a8)'};">
															{#if parsed.title}
																<div class="chapter-badge-wrapper mb-2">
																	<h4 class="chapter-title-display {isKids ? 'font-kids chapter-title-kids' : 'font-modern-chapter chapter-title-modern'}">
																		{parsed.title.endsWith('.') ? parsed.title : `${parsed.title}.`}
																	</h4>
																</div>
															{/if}
															<p class="is-italic has-text-weight-bold is-size-7-mobile narrative-body-text {isKids ? 'font-kids text-kids' : 'text-standard'}" style="color: {isKids ? '#fff9e6' : '#f0f0f0'}; line-height: 1.75; white-space: pre-wrap;" use:typewriter={{ text: parsed.body || parsed.title, speed: 45 }}></p>
														</div>
													</Visualizer>
												{:else}
													<Visualizer>
														<div class="p-3 mb-1 levelcontent hud-container {isKids ? 'kids-narrative' : 'modern-narrative'}" style="border-left: 4px solid {isKids ? '#ffd166' : 'var(--accent-primary, #19d4a8)'};">
															{#if parsed.title}
																<div class="chapter-badge-wrapper mb-2">
																	<h4 class="chapter-title-display {isKids ? 'font-kids chapter-title-kids' : 'font-modern-chapter chapter-title-modern'}">
																		{parsed.title.endsWith('.') ? parsed.title : `${parsed.title}.`}
																	</h4>
																</div>
															{/if}
															<p class="is-italic has-text-weight-bold is-size-7-mobile narrative-body-text {isKids ? 'font-kids text-kids' : 'text-standard'}" style="color: {isKids ? '#fff9e6' : '#f0f0f0'}; line-height: 1.75; white-space: pre-wrap;" use:typewriter={{ text: parsed.body || parsed.title, speed: 45 }}></p>
														</div>
													</Visualizer>
												{/if}
											{:else if level.content && level.content[0] !== undefined}
												{@const parsed0 = parseChapter(level.content[0])}
												<div class="notification is-light p-3 mb-3 {isKids ? 'font-kids' : ''}" style="border-left: 4px solid #ccc; background-color: #f9fafb;">
													{#if parsed0.title}
														<h5 class="{isKids ? 'font-kids' : 'font-modern-chapter'}" style="font-weight: 700; margin-bottom: 6px;">{parsed0.title.endsWith('.') ? parsed0.title : `${parsed0.title}.`}</h5>
													{/if}
													<p class="is-italic has-text-dark {isKids ? 'font-kids' : ''}" use:typewriter={{ text: parsed0.body || parsed0.title, speed: 45 }}></p>
												</div>
											{/if}
										</div>
									{/each}
								{:else}
									<p style="color: var(--text-muted, #9aa6ad);">No hay narrativa asociada a esta tarea.</p>
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
		min-height: 10%;
		max-height: 120%;
		overflow-y: auto;
		scroll-behavior: smooth;
		top: 1px;
		position: absolute;
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
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
		max-height: 90vh;
		min-height: 90vh;
		border-radius: 28px 28px 0 0;
		box-shadow: 0 -12px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12);
		padding: 1.2rem 1.4rem 2rem 1.4rem;
		color: var(--text-main, #ffffff);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
	}

	.section {
		flex: 1;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
	}

	.drag-handle-bar {
		width: 42px;
		height: 4px;
		background: rgba(255, 255, 255, 0.25);
		border-radius: 4px;
		margin: 0 auto 1.2rem auto;
	}

	.close-btn {
		position: absolute;
		top: 1.2rem;
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
		z-index: 10;
		transition: all 0.2s ease;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.16);
		color: #ffffff;
	}

	.panel-title {
		font-size: 1.35rem;
		font-weight: 700;
		color: #ffffff;
		margin-bottom: 0.75rem;
		letter-spacing: -0.01em;
	}

	.meta-tags {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.meta-tag {
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		padding: 6px 12px;
		font-size: 0.8rem;
		color: var(--text-muted, #9aa6ad);
		font-weight: 500;
	}

	.meta-tag strong {
		color: var(--accent-primary, #19d4a8);
		font-weight: 700;
	}


    .hud-container {
        /* Asegura contraste agresivo para que el texto siempre se lea */
        background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 50%, transparent 100%);
        /* Permite scroll si la historia es muy larga */
        max-height: 55vh; /* Ajusta según el tamaño de tu tarjeta */
        overflow-y: auto;
        padding: 1.5rem;
        pointer-events: auto; /* Permite al usuario hacer scroll manual */
    }
    
    /* Estilizar la barra de scroll para que no se vea fea */
    .hud-container::-webkit-scrollbar {
        width: 6px;
    }
    .hud-container::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 10px;
    }

	@media (min-width: 1024px) {
		.panel-content {
			width: 50vw;
			max-width: 680px;
			border-radius: 28px 28px 0 0;
		}
	}

	/* Estilos tipográficos para el título de capítulos e historias infantiles */
	.chapter-title-display {
		font-size: 1.15rem;
		margin: 0;
		line-height: 1.35;
	}

	.chapter-title-modern {
		font-family: var(--font-modern-title);
		font-weight: 700;
		color: #ffffff;
		letter-spacing: 0.02em;
	}

	.chapter-title-kids {
		font-family: var(--font-kids);
		font-weight: 600;
		color: #ffd166;
		letter-spacing: 0.02em;
		font-size: 1.25rem;
	}

	.text-kids {
		font-family: var(--font-kids) !important;
		font-size: 1.05rem;
		line-height: 1.8 !important;
		letter-spacing: 0.015em;
	}

	.text-standard {
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		font-size: 0.95rem;
		line-height: 1.7;
	}

	.kids-narrative {
		border-left-color: #ffd166 !important;
	}
</style>
