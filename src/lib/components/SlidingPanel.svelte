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

			<Motion whileHover={{ scale: 1.15, rotate: 90 }} whileTap={{ scale: 0.85 }} let:motion>
				<button
					use:motion
					class="delete"
					onclick={() => (isOpen = false)}
					aria-label="Cerrar"
				></button>
			</Motion>

			<section class="section p-0">
				<div class="container">
					{#if mode === 'form'}
						<div>
							<h2 class="title has-text-white mb-4">Nueva Tarea</h2>
							{@render children?.()}
						</div>
					{:else if mode === 'details' && taskData}
					<Visualizer>

						<div>
							<h2 class="subtitle has-text-white is-capitalized mb-3">{taskData.title}</h2>
							<div class="box pb-4 p-0 is-transparent">
								<div class="tags are-medium mb-3">
									<span class="tag is-dark has-text-grey-light is-size-7">
										Temática: <strong class="has-text-primary ml-1">{taskData.tema}</strong>
									</span>
									<span class="tag is-dark has-text-grey-light is-size-7">
										Progreso: <strong class="has-text-info ml-1">
											{Number(taskData.status) + 1} / {taskData.cantidad_de_niveles}
										</strong>
									</span>
								</div>

								<p class="mt-4 mb-2 is-hidden"><strong>Narrativa de la Aventura:</strong></p>
								{#if taskData.levels && taskData.levels.length > 0}
									{#each taskData.levels as level (level.id)}
										<div class="narrative-container">
											<!-- Imagen Cinemática si existe para el estado actual -->
											{#if level.cinematica && level.cinematica[taskData.status]}
												<div class="mb-3 mt-2">
													<figure class="image is-16by9" style="max-width: 320px; margin: 0 auto;">
														<img
															src={level.cinematica[taskData.status]}
															alt="Cinemática"
															style="border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15);"
														/>
													</figure>
												</div>
											{/if}

											<!-- Narrativa Actual -->
											{#if level.content && level.content[taskData.status] !== undefined}
												<div
													class=" is-light p-4 mb-3 levelcontent"
													style="border-left: 4px solid hsl(155, 81%, 41%); background-color: #f0fdf4;"
												>
													<p
														class="is-italic has-text-weight-bold is-size-7-mobile"
														style="color: #052e16; line-height: 1.6;"
													>
														"{level.content[taskData.status]}"
													</p>
												</div>
											{:else if level.content && level.content[0] !== undefined}
												<div
													class="notification is-light p-3 mb-3"
													style="border-left: 4px solid #ccc; background-color: #f9fafb;"
												>
													<p class="is-italic" style="color: #4b5563;">"{level.content[0]}"</p>
												</div>
											{/if}
										</div>
									{/each}
								{:else}
									<p class="has-text-grey-light">No hay narrativa asociada a esta tarea.</p>
								{/if}
							</div>
						</div>
					</Visualizer>
					{/if}
				</div>
			</section>
		</div>
	</div>
{/if}

<style>
	.levelcontent{
		min-height: 30vh;
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
	}

	.panel-background {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.65);
		backdrop-filter: blur(5px);
		-webkit-backdrop-filter: blur(5px);
		z-index: 1001;
	}

	.panel-content {
		position: relative;
		z-index: 1002;
		background: rgba(22, 27, 34, 0.95);
		backdrop-filter: blur(25px);
		-webkit-backdrop-filter: blur(25px);
		border: 1px solid rgba(255, 255, 255, 0.15);
		width: 100vw;
		max-height: 80vh;
		min-height: 45vh;
		border-radius: 1.25rem 1.25rem 0 0;
		box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.6);
		padding: 1.5rem 1.75rem 2.5rem 1.75rem;
		color: white;
		overflow-y: auto;
	}

	.drag-handle-bar {
		width: 44px;
		height: 5px;
		background: rgba(255, 255, 255, 0.3);
		border-radius: 3px;
		margin: 0 auto 1.25rem auto;
	}

	.delete {
		background: rgba(255, 255, 255, 0.2);
		border: none;
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 50%;
		cursor: pointer;
		position: absolute;
		top: 1.25rem;
		right: 1.25rem;
		z-index: 10;
	}

	.box {
		background-color: transparent;
	}

	@media (min-width: 1024px) {
		.panel-content {
			width: 50vw;
			max-width: 680px;
			border-radius: 1.25rem 1.25rem 0 0;
		}
	}
</style>
