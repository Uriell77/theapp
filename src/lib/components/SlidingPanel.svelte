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
			interval = setInterval(() => {
				if (index < txt.length) {
					currentText += txt[index];
					node.textContent = currentText;
					index++;
				} else {
					clearInterval(interval);
				}
			}, speed);
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

						<div>
							<h2 class="subtitle has-text-white is-capitalized mb-3">{taskData.title}</h2>
							<div class="box is-shadowless pb-4 p-0 is-transparent">
								<div class="tags are-medium mb-3">
									<span class="tag is-dark has-text-grey-light is-size-7">
										Temática: <strong class="has-text-primary ml-1">{taskData.tema}</strong>
									</span>
									<span class="tag is-dark has-text-grey-light is-size-7">
										Progreso: <strong class="has-text-info ml-1">
											{taskData.status === '-1' ? 'Abandonada' : `${Number(taskData.status) + 1} / ${taskData.cantidad_de_niveles}`}
										</strong>
									</span>
								</div>

								<p class="mt-4 mb-2 is-hidden"><strong>Narrativa de la Aventura:</strong></p>
								{#if taskData.status === '-1'}
  <div class="narrative-container">
            <Visualizer >
    <div class="is-light p-0 mb-1 levelcontent is-transparent" style="border-left: 4px solid hsl(155, 81%, 41%);">
      <p class="is-italic has-text-weight-bold is-size-6-mobile" style="color: #f0f0f0; line-height: 1.6;" use:typewriter={{ text: taskData.levels?.[0]?.vista?.[0], speed: 100 }}></p>
    </div>
            </Visualizer>
  </div>
{:else}
  {#if taskData.levels && taskData.levels.length > 0}
    {#each taskData.levels as level (level.id)}
      <div class="narrative-container">
        <!-- Imagen Cinemática si existe para el estado actual -->

        <!-- Narrativa Actual -->
        {#if level.content && level.content[taskData.status] !== undefined}
          {#if level.cinematica && level.cinematica[taskData.status]}
            <Visualizer effectConfig={`effect:${JSON.parse(level.cinematica[taskData.status]).effect};color:${JSON.parse(level.cinematica[taskData.status]).color};speed:${JSON.parse(level.cinematica[taskData.status]).speed};lighting:${JSON.parse(level.cinematica[taskData.status]).lighting};mood:${JSON.parse(level.cinematica[taskData.status]).mood}`}>
              <div class=" is-light p-0 mb-1 levelcontent is-transparent" style="border-left: 4px solid hsl(155, 81%, 41%);">
                <p class="is-italic has-text-weight-bold is-size-6-mobile" style="color: #f0f0f0; line-height: 1.6;" use:typewriter={{ text: `${level.content[taskData.status]}`, speed: 100 }}></p>
              </div>
            </Visualizer>
          {:else}
            <Visualizer>
              <div class=" is-light p-0 mb-1 levelcontent is-transparent" style="border-left: 4px solid hsl(155, 81%, 41%);">
                <p class="is-italic has-text-weight-bold is-size-6-mobile" style="color: #f0f0f0; line-height: 1.6;" use:typewriter={{ text: `${level.content[taskData.status]}`, speed: 100 }}></p>
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
    <p class="has-text-grey-light">No hay narrativa asociada a esta tarea.</p>
  {/if}
{/if}
							</div>
						</div>
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
		background: hsla(134, 15%, 17%, 0.99);
		backdrop-filter: blur(25px);
		-webkit-backdrop-filter: blur(25px);
		border: 1px solid rgba(255, 255, 255, 0.15);
		width: 100vw;
		max-height: 80vh;
		min-height: 45vh;
		border-radius: 1.25rem 1.25rem 0 0;
		box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.6);
		padding: 1.0rem 1.0rem 1.5rem 1.0rem;
		color: white;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.section {
		flex: 1;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
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
