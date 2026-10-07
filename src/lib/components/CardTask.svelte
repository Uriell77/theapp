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
		whileHover={{ y: -2 }}
		transition={{ duration: 0.25 }}
		let:motion
	>
		<div use:motion class="glass-panel project-card mb-4" id={`task-${task.id}`} style="position: relative;">
			<button
				type="button"
				class="clicker-btn"
				onclick={onSelect}
				aria-label={`Ver detalles de ${task.title}`}
			></button>

			<h3 class="has-text-weight-bold has-text-white" style="font-size: 1.25rem; margin-bottom: 6px;">
				{task.title}
			</h3>

			<div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 4px;">
				Temática: <span style="color: white;">{task.tema}</span>
			</div>
			<div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 10px;">
				Capítulo: <span style="color: white;">Nivel {statusNum === -1 ? 1 : statusNum + 1} • {chapterTitle}</span>
			</div>

			<!-- Progress Timeline -->
			<div class="progress-timeline">
				<div
					class="tooltip-progress"
					style="left: calc({task.cantidad_de_niveles > 1 ? Math.min(100, Math.max(0, (Math.max(0, statusNum) / (task.cantidad_de_niveles - 1)) * 100)) : 0}% - 14px);"
				>
					{statusNum === -1 ? `1 de ${task.cantidad_de_niveles} (0.0%)` : `${statusNum + 1} de ${task.cantidad_de_niveles} (${progressPercent}%)`}
				</div>

				{#each Array(task.cantidad_de_niveles) as _, idx}
					<div class="timeline-step {statusNum !== -1 && idx <= statusNum ? 'active' : ''}">
						{idx + 1}
					</div>
				{/each}
			</div>

			<!-- Action Buttons -->
			<div style="display: flex; gap: 12px; margin-top: 20px;">
				<form
					method="POST"
					action="?/advanceLevel"
					use:enhance={() => {
						return async ({ update, result }) => {
							if (result.type === 'success') {
								// Reactividad con update
							}
							await update();
						};
					}}
					style="flex: 1;"
				>
					<input type="hidden" name="taskId" value={task.id} />
					<Motion
						whileHover={!isLastLevel || isAbandoned ? { scale: 1.02 } : {}}
						whileTap={!isLastLevel || isAbandoned ? { scale: 0.98 } : {}}
						let:motion
					>
						<button
							use:motion
							class="btn-primary"
							style="width: 100%;"
							disabled={isLastLevel && !isAbandoned}
							type={isAbandoned || hasViewed ? 'submit' : 'button'}
							onclick={handleAdvanceClick}
						>
							<span>{isAbandoned ? 'Reiniciar' : isLastLevel ? '¡Completada!' : hasViewed ? 'Avanzar' : 'Abrir para avanzar'}</span>
							<span style="font-size: 1.1rem; line-height: 1;">→</span>
						</button>
					</Motion>
				</form>

				<form
					method="POST"
					action="?/abandonTask"
					use:enhance={() => {
						return async ({ update, result }) => {
							if (result.type === 'success') {
								// Reactividad con update
							}
							await update();
						};
					}}
					style="flex: 1;"
					class={isAbandoned ? 'is-hidden' : ''}
				>
					<input type="hidden" name="taskId" value={task.id} />
					<input type="hidden" name="status" value="-1" />
					<Motion
						whileHover={hasViewed && !isLastLevel && !isAbandoned ? { scale: 1.02 } : {}}
						whileTap={hasViewed && !isLastLevel && !isAbandoned ? { scale: 0.98 } : {}}
						let:motion
					>
						<button
							use:motion
							class="btn-outline"
							style="width: 100%;"
							disabled={!hasViewed || isLastLevel || isAbandoned}
							type="submit"
						>
							Abandonar
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
	.clicker-btn {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: calc(100% - 60px);
		background: transparent;
		border: none;
		cursor: pointer;
		z-index: 10;
	}
</style>
