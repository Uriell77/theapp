<script lang="ts">
	import { enhance } from '$app/forms';
	import { Motion } from 'svelte-motion';
	import { parseChapter, isKidsTheme, capitalizeWords } from '$lib/chapterUtils';
	import BitacoraModal from './BitacoraModal.svelte';

	interface Props {
		task: any;
		hasViewed?: boolean;
		onSelect?: () => void;
	}

	let { task = $bindable(), hasViewed = false, onSelect }: Props = $props();

	let isModalOpen = $state(false);
	let currentTime = $state(Date.now());
	let localMilestones = $state<any[] | null>(null);

	$effect(() => {
		const timer = setInterval(() => {
			currentTime = Date.now();
		}, 1000);
		return () => clearInterval(timer);
	});

	$effect(() => {
		localMilestones = task?.milestones || null;
	});

	let statusNum = $derived(parseInt(task?.status, 10) || 0);
	let progreso = $derived(
		task?.progreso !== undefined ? Number(task.progreso) : statusNum
	);
	let isAbandoned = $derived(statusNum === -1);
	let isKids = $derived(isKidsTheme(task?.tema));
	let isArchived = $derived(Boolean(task?.isArchived));

	let currentMilestone = $derived.by(() => {
		const list = localMilestones ?? task?.milestones;
		if (!list) return null;

		let arr = list;
		if (typeof arr === 'string') {
			try {
				arr = JSON.parse(arr);
			} catch {
				return null;
			}
		}

		if (!Array.isArray(arr) || arr.length === 0) return null;

		const target = arr[progreso] !== undefined ? arr[progreso] : arr[arr.length - 1];
		if (!target) return null;

		const time = target instanceof Date ? target.getTime() : new Date(target).getTime();
		return isNaN(time) ? null : time;
	});

	let isTimeLocked = $derived.by(() => {
		if (isAbandoned) return false;
		if (isLastLevel) return false;
		if (!currentMilestone) return false;
		return currentTime < currentMilestone;
	});

	const tematicas: { valor: string; etiqueta: string } [] = [
            { valor: 'Alta Fantasía y Magia', etiqueta: 'Fantasía' },
            { valor: 'Cruzada Medieval', etiqueta: 'Medieval' },
            { valor: 'Mitología Griega y el Olimpo', etiqueta: 'Olimpo' },
            { valor: 'Dinastía Samurái', etiqueta: 'Samurái' },
            { valor: 'Alquimia y Magia Arcana', etiqueta: 'Alquimia' },	
            { valor: 'Cyberpunk y Neón', etiqueta: 'Ciberespacio' }, 
            { valor: 'Steampunk', etiqueta: 'Steampunk' }, 
            { valor: 'Guerra Espacial de Naves', etiqueta: 'Espacio' },         
            { valor: 'Combate de Mechas Gigantes', etiqueta: 'Mechas' },
            { valor: 'Superhéroes y Cómics', etiqueta: 'Superhéroes' },
            { valor: 'Supervivencia Post-Apocalíptica', etiqueta: 'Mundo Post-Apocaliptico' },
            { valor: 'Apocalipsis Zombie', etiqueta: 'Zombie' }, // UI limpia, pero Gemini recibe "Zombie"
            { valor: 'Espionaje Táctico Moderno', etiqueta: 'Espionaje' },
		{ valor: 'Atraco de Guante Blanco y Estafa Maestra', etiqueta: 'Golpe Maestro' },
		{ valor: 'Detective Noir', etiqueta: 'Noir' },
            { valor: 'El Salvaje Oeste', etiqueta: 'Salvaje Oeste' },
            { valor: 'Terror Cosmico', etiqueta: 'Terror Cosmico' }, 
            { valor: 'Guerra Mundia', etiqueta: 'Guerra' }, 
            { valor: 'Desastre Natural', etiqueta: 'Desastre Matural' }, 
		{ valor: 'Comedia Romántica y Torpeza Adorable', etiqueta: 'Comedia Romántica' },
		{ valor: 'Comedia Absurda y Caos Cotidiano', etiqueta: 'Caos y Comedia' }
	]



	function handleAdvanceClick(e: MouseEvent) {
		if (isAbandoned) {
			return;
		}
		if (!hasViewed) {
			e.preventDefault();
			if (onSelect) onSelect();
			return;
		}
		if (isTimeLocked) {
			e.preventDefault();
			isModalOpen = true;
			return;
		}
	}

	function handleClickerClick(e: MouseEvent) {
		if (isAbandoned || isLastLevel) {
			return;
		}
		if (!hasViewed) {
			if (onSelect) onSelect();
			return;
		}
		if (isTimeLocked) {
			e.preventDefault();
			isModalOpen = true;
			return;
		}
		if (onSelect) {
			onSelect();
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
			<!-- Botón transparente para abrir panel de detalles con Time-Gating -->
			<button
				type="button"
				class="clicker-btn"
				class:is-locked={hasViewed && isTimeLocked}
				disabled={isLastLevel && !isAbandoned}
				onclick={handleClickerClick}
				aria-label={hasViewed && isTimeLocked ? `Nivel bloqueado por tiempo` : `Ver detalles de ${task.title}`}
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
						<span class="badge-general is-size-7 font-modern-chapter">{tematicas.find((t) => t.valor === task.tema)?.etiqueta || 'Tema no especificado'} ⚔️</span>
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
						{idx}
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
							whileHover={!isLastLevel && !isAbandoned && !(hasViewed && isTimeLocked) ? { scale: 1.02 } : {}}
							whileTap={!isLastLevel && !isAbandoned && !(hasViewed && isTimeLocked) ? { scale: 0.98 } : {}}
							let:motion
						>
							<button
								use:motion
								class="btn-primary"
								class:is-time-locked={hasViewed && isTimeLocked}
								style="width: 100%;"
								disabled={(isLastLevel && !isAbandoned) || (hasViewed && isTimeLocked)}
								type={isAbandoned ? 'submit' : hasViewed && !isTimeLocked ? 'submit' : 'button'}
								onclick={handleAdvanceClick}
							>
								<span>
									{#if isAbandoned}
										Reiniciar
									{:else if !hasViewed}
										{progreso === 0 ? 'Visualizar para avanzar' : 'Abrir para avanzar'}
									{:else if isTimeLocked}
										Avanzar (Bloqueado)
									{:else}
										Avanzar
									{/if}
								</span>
								{#if hasViewed && isTimeLocked}
									<span style="font-size: 1rem; line-height: 1;">🔒</span>
								{:else}
									<span style="font-size: 1.1rem; line-height: 1;">→</span>
								{/if}
							</button>
						</Motion>
					</form>

					<!-- Botón Desbloquear (Fricción Positiva) -->
					{#if hasViewed && isTimeLocked}
						<Motion whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} let:motion>
							<button
								use:motion
								class="button is-warning is-light is-small"
								style="border-radius: 12px; font-weight: 700; padding: 0 14px; height: 100%; min-height: 38px; white-space: nowrap; box-shadow: 0 0 10px rgba(255, 209, 102, 0.25);"
								type="button"
								onclick={() => (isModalOpen = true)}
							>
								🔓 Desbloquear
							</button>
						</Motion>
					{/if}

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

	<BitacoraModal
		bind:isOpen={isModalOpen}
		project={task}
		level={progreso}
		onUnlocked={(newMilestones) => {
			task.milestones = newMilestones;
			localMilestones = [...newMilestones];
			currentTime = Date.now();
		}}
	/>
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

	.clicker-btn:disabled,
	.clicker-btn.is-locked {
		cursor: not-allowed;
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

	:global(.project-card .btn-primary:disabled),
	:global(.project-card .btn-primary.is-time-locked) {
		opacity: 0.45 !important;
		cursor: not-allowed !important;
		filter: grayscale(0.85) !important;
		box-shadow: none !important;
		border: 1px solid rgba(255, 255, 255, 0.1) !important;
		background: #203138 !important;
		color: #8fa3ad !important;
		pointer-events: none !important;
	}

	:global(.project-card .btn-outline:disabled) {
		opacity: 0.4 !important;
		cursor: not-allowed !important;
		filter: grayscale(0.85) !important;
		pointer-events: none !important;
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
		border: 1px solid rgba(25, 212, 168, 0.35);
		color: #19d4a8;
		padding: 3px 8px;
		border-radius: 12px;
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
