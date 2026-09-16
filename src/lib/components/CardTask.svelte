<script lang="ts">
	import { enhance } from '$app/forms';
	import { Motion } from 'svelte-motion';

	interface Props {
		task: any;
		hasViewed?: boolean;
		onSelect?: () => void;
	}

	let { task, hasViewed = false, onSelect }: Props = $props();

	let statusNum = $derived(parseInt(task?.status, 10) || 0);
	let isAbandoned = $derived(statusNum === -1);

	function handleAdvanceClick(e: MouseEvent) {
		if (isAbandoned) {
			return;
		}
		if (!hasViewed) {
			e.preventDefault();
			if (onSelect) onSelect();
		}
	}
	let isLastLevel = $derived(task ? statusNum >= task.cantidad_de_niveles - 1 : false);
	let currentLevelContent = $derived.by(() => {
		if (!task?.levels?.[0]?.content) return '';
		return task.levels[0].content[statusNum]?.split('.')[0] || `Nivel ${statusNum + 1}`;
	});
	let currentCinematica = $derived.by(() => {
		if (!task?.levels?.[0]?.cinematica) return null;
		return task.levels[0].cinematica[statusNum] || null;
	});
	let progressPercent = $derived(
		task && task.cantidad_de_niveles > 1
			? Math.min(100, (statusNum / (task.cantidad_de_niveles - 1)) * 100).toFixed(1)
			: statusNum > 0
				? '100'
				: '0'
	);
	let defeatChapter = $derived.by(() => {
		if (!task?.levels?.[0]?.vista) return null;
		return task.levels[0].vista || null;
	});

	let chapterTitle = $derived.by(() => {
		if (statusNum === -1) {
			if (Array.isArray(defeatChapter) && typeof defeatChapter[0] === 'string') {
				return defeatChapter[0].split('.')[0].trim();
			}
			return 'Final Alternativo';
		}
		return currentLevelContent ? currentLevelContent.split('.')[0].trim() : `Nivel ${statusNum + 1}`;
	});

	let renunciar = $state(false);

	function renunciarMision() {
		renunciar = true;
	}
</script>

{#if task}
	<Motion
		initial={{ opacity: 0, y: 12 }}
		animate={{ opacity: 1, y: 0 }}
		whileHover={{ y: -3, transition: { duration: 0.2 } }}
		transition={{ duration: 0.3 }}
		let:motion
	>
		<div use:motion class="componente-cardtask mb-3" id={`task-${task.id}`}>
			<div class="box is-rounded mb-2 has-background-dark py-1 px-3 card-wrapper">
				<button
					type="button"
					class="clicker-btn"
					onclick={onSelect}
					aria-label={`Ver detalles de ${task.title}`}
				></button>

				
					<strong class="has-text-weight-bold has-text-centered py-0">
						<p class="is-size-6-mobile py-0 has-text-white">{task.title}</p>
					</strong>
				<hr class="py-0 my-2 divider" />

				<div class="columns is-centered  is-multiline is-mobile py-0 my-0">
					<div class="column is-full is-align-items-center ">

						<div class="columns is-mobile is-multiline is-centered is-gapless py-0 my-0 px-0 is-narrow">
							<div class="column is-one-third">
						<div class="is-size-7-mobile has-text-aligned-center">
							<span class="label-field">Temática:</span>
							<p class="has-text-white pl-0">{task.tema}</p>
						</div>
							</div>
							<div class="column is-one-third">
						<div class="is-size-7-mobile has-text-aligned-center">
							<span class="label-field">Progreso:</span>
							<p class="has-text-white pl-0">{statusNum === -1 ? 'Abandonada' : `${statusNum + 1} / ${task.cantidad_de_niveles}`}</p>
						</div>
							</div>
							<div class="column is-one-third">
						<div class="is-size-7-mobile has-text-aligned-center">
							<span class="label-field">Capítulo:</span>
							<p class="has-text-white pl-0 is-italic ">
							{chapterTitle}
							</p>
						</div>
							</div>
						</div>



					</div>

					

					<div class="column is-full pt-2">
						<div class="is-flex is-align-items-center is-justify-content-space-between is-tags-centered is-tags">
							<div class="tags are-small mb-0">
								{#each Array(task.cantidad_de_niveles) as _, idx}
									<span class="tag {statusNum !== -1 && idx <= statusNum ? 'is-primary' : 'is-dark'} mb-0 mx-0">
										{idx + 1}
									</span>
								{/each}
							</div>
							<span class="tag {statusNum === -1 ? 'is-danger' : isLastLevel ? 'is-success' : 'is-info'} has-text-weight-bold ml-2">
								{statusNum === -1 ? '0%' : `${progressPercent}%`}
							</span>
						</div>
					</div>
				</div>

				<div class="buttons is-flex is-justify-content-space-between is-align-items-center is-flex-wrap-wrap">

				<form
					method="POST"
					action='?/advanceLevel'
					use:enhance={() => {
						return async ({ update, result }) => {
							if (result.type === 'success') {
								// Eliminamos la mutación manual de task.status y hasViewed
								// ya que await update() refrescará los datos del servidor
								// y la reactividad de Svelte 5 se encargará del resto.
							}
							await update();
						};
					}}
					class="mt-3"
				>
					<input type="hidden" name="taskId" value={task.id} />
					<Motion
						whileHover={!isLastLevel || isAbandoned ? { scale: 1.04 } : {}}
						whileTap={!isLastLevel || isAbandoned ? { scale: 0.95 } : {}}
						let:motion
					>
						<button
							use:motion
							class="button is-small is-primary is-rounded"
							disabled={isLastLevel && !isAbandoned}
							type={isAbandoned || hasViewed ? 'submit' : 'button'}
							onclick={handleAdvanceClick}
						>
							{ isAbandoned
								? 'Reiniciar'
								: isLastLevel
									? '¡Completada!'
									: hasViewed
										? 'Avanzar'
										: 'Abrir para Avanzar'}
						</button>
					</Motion>
				</form>
				<form
					method="POST"
					action="?/abandonTask"
					use:enhance={() => {
						return async ({ update, result }) => {
							if (result.type === 'success') {
								// Al igual que en avanzar, dejamos que update() maneje la sincronización
							}
							await update();
						};
					}}
					class="mt-3"
				>
					<input type="hidden" name="taskId" value={task.id} />
					<input type="hidden" name="status" value=-1 />
					<Motion
						whileHover={hasViewed && !isLastLevel && !isAbandoned ? { scale: 1.04 } : {}}
						whileTap={hasViewed && !isLastLevel && !isAbandoned ? { scale: 0.95 } : {}}
						let:motion
					>
						<button
							use:motion
							class="button is-small is-danger is-rounded {isAbandoned ? 'is-hidden' : ''}"
							disabled={!hasViewed || isLastLevel || isAbandoned}
							type="submit"
						>
							Abandonar
						</button>
					</Motion>
				</form>
				</div>
			</div>
		</div>
	</Motion>
{:else}
	<progress class="progress is-small is-primary" max="100"></progress>
{/if}


<style>

	.is-tags{
		border-style: solid ;
		border-width: 1px;
		border-color: rgba(255, 255, 255, 0.1);

	}
	.card-wrapper {
		position: relative;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.clicker-btn {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: calc(100% - 40px);
		background: transparent;
		border: none;
		cursor: pointer;
		z-index: 10;
	}

	.divider {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.label-field {
		color: hsl(155, 81%, 41%);
		font-weight: bold;
	}

	.buttons button,
	button[type='submit'] {
		position: relative;
		z-index: 20;
	}
</style>
