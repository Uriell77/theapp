<script lang="ts">
	import { enhance } from '$app/forms';
	import { Motion } from 'svelte-motion';
	import { parseChapter, isKidsTheme, capitalizeWords } from '$lib/chapterUtils';

	interface Props {
		task: any;
		hasViewed?: boolean;
		onSelect?: () => void;
	}

	let { task, hasViewed = false, onSelect }: Props = $props();

	let statusNum = $derived(parseInt(task?.status, 10) || 0);
	let isAbandoned = $derived(statusNum === -1);
	let isKids = $derived(isKidsTheme(task?.tema));
	let isArchived = $derived(Boolean(task?.isArchived));

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
		return task.levels[0].content[statusNum] || `Nivel ${statusNum + 1}`;
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

	let rawChapterTitle = $derived.by(() => {
		if (statusNum === -1) {
			if (Array.isArray(defeatChapter) && typeof defeatChapter[0] === 'string') {
				return parseChapter(defeatChapter[0]).title || 'Final Alternativo';
			}
			return 'Final Alternativo';
		}
		if (!currentLevelContent) return `Nivel ${statusNum + 1}`;
		return parseChapter(currentLevelContent).title || `Nivel ${statusNum + 1}`;
	});

	// Capitalización para que todas las palabras inicien con mayúscula
	let displayTitle = $derived(capitalizeWords(task?.title));
	let displayTema = $derived(capitalizeWords(task?.tema));
	let displayChapterTitle = $derived.by(() => {
		const raw = rawChapterTitle.endsWith('.') ? rawChapterTitle : `${rawChapterTitle}.`;
		return capitalizeWords(raw);
	});

	let stepRatio = $derived.by(() => {
		if (!task) return 0;
		const clampedStatus = statusNum === -1 ? 0 : Math.max(0, statusNum);
		const maxSteps = Math.max(1, task.cantidad_de_niveles - 1);
		return Math.min(1, Math.max(0, clampedStatus / maxSteps));
	});

	let stepPercent = $derived((stepRatio * 100).toFixed(1));
</script>

{#if task}
	<Motion
		initial={{ opacity: 0, y: 12 }}
		animate={{ opacity: 1, y: 0 }}
		whileHover={{ y: -2 }}
		transition={{ duration: 0.25 }}
		let:motion
	>
		<div
			use:motion
			class="glass-panel project-card mb-4"
			class:is-kids-theme={isKids}
			class:is-archived-card={isArchived}
			id={`task-${task.id}`}
			style="position: relative;"
		>
			<!-- Botón transparente para abrir panel de detalles -->
			<button
				type="button"
				class="clicker-btn"
				onclick={onSelect}
				aria-label={`Ver detalles de ${task.title}`}
			></button>

			<!-- Header del Card: Título + Badge de categoría + Botón de eliminar -->
			<div class="card-header-line" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
				<h3 class="has-text-weight-bold has-text-white {isKids ? 'font-kids' : 'font-modern-chapter'}" style="font-size: 1.25rem; margin-bottom: 6px; text-transform: capitalize; flex: 1;">
					{displayTitle}
				</h3>

				<div style="display: flex; align-items: center; gap: 6px; position: relative; z-index: 15;">
					{#if isKids}
						<span class="badge-kids font-kids">Infantil 🎈</span>
					{:else}
						<span class="badge-general font-modern-chapter">General ⚔️</span>
					{/if}

					<!-- Botón de eliminación rápida -->
					{#if isArchived}
					<form
						method="POST"
						action="?/deleteTask"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
							};
						}}
					>
						<input type="hidden" name="taskId" value={task.id} />
						<button
							type="submit"
							class="btn-icon-delete"
							title="Eliminar tarea"
							aria-label="Eliminar tarea"
							onclick={(e) => {
								if (!confirm(`¿Eliminar definitivamente el proyecto "${displayTitle}"?`)) {
									e.preventDefault();
								}
							}}
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="3 6 5 6 21 6"></polyline>
								<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
							</svg>
						</button>
					</form>
					{:else}
						<!-- Botón de eliminar deshabilitado para tareas activas -->
						<button
							type="button"
							class="btn-icon-delete is-hidden"
							title="Eliminar tarea (solo disponible para archivadas)"
							aria-label="Eliminar tarea (solo disponible para archivadas)"
							disabled
							style="opacity: 0.5; cursor: not-allowed;"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="3 6 5 6 21 6"></polyline>
								<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
							</svg>
						</button>
					{/if}
				</div>
			</div>


			<!-- SECCION DE DETALLES DE TAREA (DESACTIVADA) -->
<!-- 			<div style="color: var(--text-muted); font-size: 0.82rem; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
				<span>Temática:</span>
				<span class="{isKids ? 'font-kids' : ''}" style="color: {isKids ? '#ffd166' : 'white'}; font-weight: 500; text-transform: capitalize;">
					{displayTema}
				</span>
			</div>

			<div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 12px; display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap;">
				<span style="color: var(--text-muted); font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
					{isKids ? 'Cuento:' : 'Capítulo:'}
				</span>
				<span
					class="{isKids ? 'font-kids chapter-kids-title' : 'font-modern-chapter chapter-modern-title'}"
					style="color: {isKids ? '#ffeaa7' : '#ffffff'}; font-size: 0.95rem; font-weight: {isKids ? '600' : '700'}; text-transform: capitalize;"
				>
					{displayChapterTitle}
				</span>
			</div> -->

			<!-- Progress Timeline -->
			<div class="progress-timeline">
				<div
					class="tooltip-progress"
					style="left: calc(14px + (100% - 28px) * {stepRatio}); transform: translateX(-{stepPercent}%); --arrow-left: {Math.max(14, Math.min(86, Number(stepPercent)))}%;"
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
			<div style="display: flex; gap: 10px; margin-top: 20px; position: relative; z-index: 15;">
				{#if isArchived}
					<!-- Opciones para tareas archivadas: Desarchivar y Eliminar -->
					<form
						method="POST"
						action="?/unarchiveTask"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
							};
						}}
						style="flex: 1;"
					>
						<input type="hidden" name="taskId" value={task.id} />
						<Motion whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} let:motion>
							<button use:motion class="btn-primary" style="width: 100%;" type="submit">
								<span>Restaurar al Dashboard</span>
								<span style="font-size: 1.1rem; line-height: 1;">↩</span>
							</button>
						</Motion>
					</form>
				{:else if isLastLevel && !isAbandoned}
					<!-- Tarea completada: Opción de archivarla -->
					<form
						method="POST"
						action="?/archiveTask"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
							};
						}}
						style="flex: 1;"
					>
						<input type="hidden" name="taskId" value={task.id} />
						<Motion whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} let:motion>
							<button
								use:motion
								class="btn-primary"
								style="width: 100%; background: linear-gradient(135deg, #19d4a8 0%, #11998e 100%);"
								type="submit"
							>
								<span>Archivar Proyecto 📦</span>
							</button>
						</Motion>
					</form>
				{:else}
					<!-- Tarea activa: Avanzar / Abrir -->
					<form
						method="POST"
						action="?/advanceLevel"
						use:enhance={() => {
							return async ({ update }) => {
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
								<span>{isAbandoned ? 'Reiniciar' : hasViewed ? 'Avanzar' : 'Abrir para avanzar'}</span>
								<span style="font-size: 1.1rem; line-height: 1;">→</span>
							</button>
						</Motion>
					</form>

					<!-- Botón Abandonar -->
					<form
						method="POST"
						action="?/abandonTask"
						use:enhance={() => {
							return async ({ update }) => {
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
				{/if}
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
		height: calc(100% - 65px);
		background: transparent;
		border: none;
		cursor: pointer;
		z-index: 10;
	}

	/* Reflejo sutil de glassmorfismo */
	.glass-reflection {
		position: absolute;
		top: -45%;
		left: -20%;
		width: 140%;
		height: 90%;
		background: linear-gradient(
			115deg,
			transparent 0%,
			rgba(255, 255, 255, 0.02) 28%,
			rgba(255, 255, 255, 0.08) 36%,
			rgba(255, 255, 255, 0.02) 44%,
			transparent 55%
		);
		transform: rotate(-14deg);
		pointer-events: none;
		z-index: 2;
	}

	:global(.project-card) {
		position: relative;
		overflow: hidden;
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.07) 0%,
			rgba(255, 255, 255, 0.02) 22%,
			rgba(30, 45, 54, 0.65) 50%,
			rgba(16, 24, 28, 0.78) 100%
		) !important;
		border: 1px solid rgba(255, 255, 255, 0.12) !important;
		box-shadow: 
			0 12px 36px rgba(0, 0, 0, 0.35),
			inset 0 1px 1px rgba(255, 255, 255, 0.22),
			inset 0 -1px 0 rgba(255, 255, 255, 0.04) !important;
	}

	/* Reducir tamaño de letra en botones de las cards */
	:global(.project-card .btn-primary),
	:global(.project-card .btn-outline) {
		font-size: 0.72rem;
		padding: 8px 10px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	:global(.project-card .btn-primary span:first-child),
	:global(.project-card .btn-outline span:first-child) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chapter-modern-title {
		font-family: var(--font-modern-title);
		font-weight: 700;
		color: #ffffff;
		letter-spacing: 0.02em;
	}

	.chapter-kids-title {
		font-family: var(--font-kids);
		font-weight: 600;
		color: #ffeaa7;
		letter-spacing: 0.015em;
	}

	.badge-kids {
		background: rgba(255, 209, 102, 0.15);
		border: 1px solid rgba(255, 209, 102, 0.35);
		color: #ffd166;
		padding: 3px 8px;
		border-radius: 12px;
		font-size: 0.72rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.badge-general {
		background: rgba(25, 212, 168, 0.14);
		border: 1px solid rgba(25, 212, 168, 0.35);
		color: #19d4a8;
		padding: 3px 8px;
		border-radius: 12px;
		font-size: 0.72rem;
		font-weight: 700;
		white-space: nowrap;
		letter-spacing: 0.02em;
	}

	.btn-icon-delete {
		background: rgba(231, 102, 102, 0.12);
		border: 1px solid rgba(231, 102, 102, 0.25);
		color: #e76666;
		border-radius: 8px;
		width: 26px;
		height: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-icon-delete:hover {
		background: rgba(231, 102, 102, 0.28);
		color: #ffffff;
		transform: scale(1.08);
	}

	:global(.project-card.is-kids-theme) {
		border-color: rgba(255, 209, 102, 0.25) !important;
		box-shadow: 0 8px 32px rgba(255, 209, 102, 0.06);
	}

	:global(.project-card.is-archived-card) {
		opacity: 0.92;
		border-color: rgba(154, 166, 173, 0.25) !important;
	}
</style>
