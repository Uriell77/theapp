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
			<div class="box is-rounded mb-2 has-background-dark p-4 px-5 card-wrapper">
				<button
					type="button"
					class="clicker-btn"
					onclick={onSelect}
					aria-label={`Ver detalles de ${task.title}`}
				></button>

				<div>
					<strong class="has-text-weight-bold has-text-centered py-0">
						<p class="is-size-6-mobile py-0 has-text-white">{task.title}</p>
					</strong>
				</div>
				<hr class="py-0 my-2 divider" />

				<div class="columns is-centered is-vcentered is-multiline is-mobile py-0 my-0">
					<div class="column is-half">
						<div class="is-flex is-size-7-mobile is-justify-content-space-between">
							<span class="label-field">Temática:</span>
							<p class="has-text-white pl-2">{task.tema}</p>
						</div>
						<div class="is-flex is-size-7-mobile is-justify-content-space-between">
							<span class="label-field">Niveles:</span>
							<p class="has-text-white pl-2">{task.cantidad_de_niveles}</p>
						</div>
						<div class="is-flex is-size-7-mobile is-justify-content-space-between">
							<span class="label-field">Nivel actual:</span>
							<p class="has-text-white pl-2">{statusNum + 1} / {task.cantidad_de_niveles}</p>
						</div>
						<div class="is-flex is-size-7-mobile is-justify-content-space-between">
							<span class="label-field">Capítulo:</span>
							<p class="has-text-white pl-2 is-italic is-truncated">{currentLevelContent}</p>
						</div>
					</div>

					<div
						class="column is-half is-flex is-justify-content-center is-align-items-center py-0 my-0"
					>
						{#if currentCinematica}
							<figure class="image is-9by3 py-0 my-0 is-flex">
								<img class="py-0 my-0" src={currentCinematica} alt="cinemática" loading="lazy" />
							</figure>
						{/if}
					</div>

					<div class="column is-full pt-2">
						<div class="is-flex is-align-items-center is-justify-content-space-between">
							<div class="tags are-small mb-0">
								{#each Array(task.cantidad_de_niveles) as _, idx}
									<span class="tag {idx <= statusNum ? 'is-primary' : 'is-dark'} mb-0">
										{idx + 1}
									</span>
								{/each}
							</div>
							<span class="tag {isLastLevel ? 'is-success' : 'is-info'} has-text-weight-bold ml-2">
								{progressPercent}%
							</span>
						</div>
					</div>
				</div>

				<form method="POST" action="?/advanceLevel" use:enhance class="mt-3">
					<input type="hidden" name="taskId" value={task.id} />
					<Motion
						whileHover={hasViewed && !isLastLevel ? { scale: 1.04 } : {}}
						whileTap={hasViewed && !isLastLevel ? { scale: 0.95 } : {}}
						let:motion
					>
						<button
							use:motion
							class="button is-small is-primary"
							disabled={!hasViewed || isLastLevel}
							type="submit"
						>
							{isLastLevel
								? '¡Completada!'
								: hasViewed
									? 'Avanzar Nivel'
									: 'Abre los detalles para avanzar'}
						</button>
					</Motion>
				</form>
			</div>
		</div>
	</Motion>
{:else}
	<progress class="progress is-small is-primary" max="100"></progress>
{/if}

<style>
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

	.is-truncated {
		max-width: 160px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	img {
		border-radius: 8px;
	}

	button[type='submit'] {
		position: relative;
		z-index: 20;
	}
</style>
