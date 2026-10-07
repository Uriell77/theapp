<script lang="ts">
	import Visualizer from './Visualizer.svelte';
	import type { Snippet } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { Motion } from 'svelte-motion';

	let {
		isOpen = $bindable(),
		mode = 'form',
		taskData,
		children
	}: { isOpen: boolean; mode: 'form' | 'details'; taskData?: any; children?: Snippet } = $props();




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
							<h2 class="panel-title is-capitalized">{taskData.title}</h2>
							<div class="meta-tags mb-4">
								<span class="meta-tag">
									Temática: <strong>{taskData.tema}</strong>
								</span>
								<span class="meta-tag">
									Progreso: <strong>
										{taskData.status === '-1' ? 'Abandonada' : `${Number(taskData.status) + 1} / ${taskData.cantidad_de_niveles}`}
									</strong>
								</span>
							</div>

							{#if taskData.status === '-1'}
								{@const defeatRaw = String(taskData.levels?.[0]?.vista?.[0] || 'Final Alternativo: Retirada Táctica. Misión abandonada.')}
								{@const dotPos = defeatRaw.indexOf('.')}
								{@const formattedDefeatText = dotPos !== -1 ? `${defeatRaw.slice(0, dotPos).trim()}\n\n${defeatRaw.slice(dotPos + 1).trim()}` : defeatRaw}
								{@const defeatCinematicaRaw = taskData.levels?.[0]?.vista?.[1]}
								{@const defeatCinematicaParsed = defeatCinematicaRaw ? (() => { try { return JSON.parse(defeatCinematicaRaw); } catch { return null; } })() : null}
								{@const defeatEffectConfig = defeatCinematicaParsed ? `effect:${defeatCinematicaParsed.effect};color:${defeatCinematicaParsed.color};speed:${defeatCinematicaParsed.speed};lighting:${defeatCinematicaParsed.lighting};mood:${defeatCinematicaParsed.mood}` : 'effect:ash-storm;color:apocalyptic-rust;speed:slow;lighting:vignette-dark;mood:defeat'}
								<div class="narrative-container">
									<Visualizer effectConfig={defeatEffectConfig}>
										<div class="p-2 mb-1 levelcontent" style="border-left: 4px solid var(--accent-primary, #19d4a8);">
											<p class="is-italic has-text-weight-bold is-size-7-mobile" style="color: #f0f0f0; line-height: 1.7; white-space: pre-wrap;" use:typewriter={{ text: formattedDefeatText, speed: 100 }}></p>
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
												{@const dotPos = currentRaw.indexOf('.')}
												{@const formattedText = dotPos !== -1 ? `${currentRaw.slice(0, dotPos).trim()}\n\n${currentRaw.slice(dotPos + 1).trim()}` : currentRaw}
												{#if level.cinematica && level.cinematica[taskData.status]}
													<Visualizer effectConfig={`effect:${JSON.parse(level.cinematica[taskData.status]).effect};color:${JSON.parse(level.cinematica[taskData.status]).color};speed:${JSON.parse(level.cinematica[taskData.status]).speed};lighting:${JSON.parse(level.cinematica[taskData.status]).lighting};mood:${JSON.parse(level.cinematica[taskData.status]).mood}`}>
														<div class="p-2 mb-1 levelcontent" style="border-left: 4px solid var(--accent-primary, #19d4a8);">
															<p class="is-italic has-text-weight-bold is-size-7-mobile" style="color: #f0f0f0; line-height: 1.7; white-space: pre-wrap;" use:typewriter={{ text: formattedText, speed: 100 }}></p>
														</div>
													</Visualizer>
												{:else}
													<Visualizer>
														<div class="p-2 mb-1 levelcontent" style="border-left: 4px solid var(--accent-primary, #19d4a8);">
															<p class="is-italic has-text-weight-bold is-size-7-mobile" style="color: #f0f0f0; line-height: 1.7; white-space: pre-wrap;" use:typewriter={{ text: formattedText, speed: 100 }}></p>
														</div>
													</Visualizer>
												{/if}
											{:else if level.content && level.content[0] !== undefined}
												<div class="notification is-light p-3 mb-3" style="border-left: 4px solid #ccc; background-color: #f9fafb;">
													<p class="is-italic has-text-dark" use:typewriter={{ text: level.content[0], speed: 100 }}></p>
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
		max-height: 85vh;
		min-height: 48vh;
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

	@media (min-width: 1024px) {
		.panel-content {
			width: 50vw;
			max-width: 680px;
			border-radius: 28px 28px 0 0;
		}
	}
</style>
