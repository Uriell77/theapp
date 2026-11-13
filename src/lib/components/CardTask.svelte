<script lang="ts">
	import { enhance } from '$app/forms';
	import { Motion } from 'svelte-motion';
	import { isKidsTheme, capitalizeWords } from '$lib/chapterUtils';
	import { clearTaskTtsCache } from '$lib/ttsCache';
	import BitacoraModal from './BitacoraModal.svelte';

	interface TaskData {
		id: number | string;
		title?: string;
		tema?: string;
		status: string | number;
		cantidad_de_niveles: number;
		progreso?: number | string;
		milestones?: (string | Date)[] | string | null;
		isArchived?: boolean;
		[key: string]: any;
	}

	interface Props {
		task: TaskData;
		hasViewed?: boolean;
		onSelect?: (chapterIndex: number) => void;
		/** Abre el SlidingPanel directamente en el Salón de la Victoria */
		onVictory?: () => void;
	}

	let { task = $bindable(), hasViewed = false, onSelect, onVictory }: Props = $props();

	let isModalOpen = $state(false);
	let currentTime = $state(Date.now());
	let localMilestones = $state<any[] | string | null>(null);

	$effect(() => {
		const timer = setInterval(() => {
			currentTime = Date.now();
		}, 1000);
		return () => clearInterval(timer);
	});

	$effect(() => {
		localMilestones = task?.milestones || null;
	});

	let statusNum = $derived(parseInt(String(task?.status), 10) || 0);
	let progreso = $derived(task?.progreso !== undefined ? Number(task.progreso) : statusNum);
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

	let isLastLevel = $derived(task ? statusNum >= task.cantidad_de_niveles - 1 : false);
	// Completada al 100%: último nivel alcanzado y no abandonada
	let isCompleted = $derived(isLastLevel && !isAbandoned);

	let isTimeLocked = $derived.by(() => {
		if (isAbandoned) return false;
		if (isLastLevel) return false;
		if (!currentMilestone) return false;
		return currentTime < currentMilestone;
	});

	let isLocked = $derived(isTimeLocked);

	const tematicasMap: Record<string, string> = {
		'Alta Fantasía y Magia': 'Fantasía',
		'Cruzada Medieval': 'Medieval',
		'Mitología Griega y el Olimpo': 'Olimpo',
		'Dinastía Samurái': 'Samurái',
		'Alquimia y Magia Arcana': 'Alquimia',
		'Cyberpunk y Neón': 'Ciberespacio',
		'Steampunk': 'Steampunk',
		'Guerra Espacial de Naves': 'Espacio',
		'Combate de Mechas Gigantes': 'Mechas',
		'Superhéroes y Cómics': 'Superhéroes',
		'Supervivencia Post-Apocalíptica': 'Mundo Post-Apocalíptico',
		'Apocalipsis Zombie': 'Zombie',
		'Espionaje Táctico Moderno': 'Espionaje',
		'Atraco de Guante Blanco y Estafa Maestra': 'Golpe Maestro',
		'Detective Noir': 'Noir',
		'El Salvaje Oeste': 'Salvaje Oeste',
		'Terror Cosmico': 'Terror Cósmico',
		'Guerra Mundia': 'Guerra',
		'Desastre Natural': 'Desastre Natural',
		'Comedia Romántica y Torpeza Adorable': 'Comedia Romántica',
		'Comedia Absurda y Caos Cotidiano': 'Caos y Comedia'
	};

	let tematicaEtiqueta = $derived(
		task?.tema ? tematicasMap[task.tema] || capitalizeWords(task.tema) : 'Tema no especificado'
	);

	function isChapterUnlocked(idx: number): boolean {
		if (isAbandoned) return false;
		if (isArchived) return true;
		return idx <= statusNum;
	}

	function handleChapterClick(idx: number) {
		if (!isChapterUnlocked(idx)) return;
		if (onSelect) {
			onSelect(idx);
		}
	}

	function handleAdvanceClick(e: MouseEvent) {
		if (isAbandoned || !hasViewed) {
			e.preventDefault();
			if (onSelect) onSelect(statusNum);
			return;
		}
	}

	let progressPercent = $derived(
		task && task.cantidad_de_niveles > 1
			? Math.min(100, (statusNum / (task.cantidad_de_niveles - 1)) * 100).toFixed(1)
			: statusNum > 0
				? '100'
				: '0'
	);

	let displayTitle = $derived(capitalizeWords(task?.title || 'Proyecto sin título'));

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
		>
			<!-- Header del Card: Título + Badge de categoría + Botón de eliminar -->
			<div class="card-header-line">
				<h3 class="card-title has-text-weight-bold has-text-white {isKids ? 'font-kids' : 'font-modern-chapter'}">
					{displayTitle}
				</h3>

				<div class="card-header-actions is-justify-content-flex-end is-flex">
					{#if isKids}
						<span class="badge-kids font-kids">Infantil 🎈</span>
					{:else}
						<span class="badge-general font-modern-chapter">
							{tematicaEtiqueta} ⚔️
						</span>
					{/if}

					<!-- Botón de eliminación rápida (Solo archivadas) -->
					{#if isArchived}
						<form
							method="POST"
							action="?/deleteTask"
							use:enhance={() => {
								const idToRemove = task.id;
								return async ({ result, update }) => {
									if (result.type === 'success') {
										await clearTaskTtsCache(idToRemove);
									}
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
									} else {
										clearTaskTtsCache(task.id);
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
						<button type="button" class="btn-icon-delete is-hidden" title="Eliminar tarea" aria-label="Eliminar tarea" disabled style="opacity: 0.5; cursor: not-allowed;">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
						</button>
					{/if}
				</div>
			</div>

			<!-- Progress Timeline -->
			<div class="progress-timeline" style="--total-steps: {task.cantidad_de_niveles};">
				<div
					class="tooltip-progress has-text-weight-bold"
					style="left: calc(14px + (100% - 28px) * {stepRatio}); transform: translateX(-{stepPercent}%); --arrow-left: {Math.max(14, Math.min(86, Number(stepPercent)))}%;"
				>
					{statusNum === -1 ? `(0.0%)` : ` (${progressPercent}%)`}
				</div>

				{#each Array(task.cantidad_de_niveles) as _, idx}
					{@const unlocked = isChapterUnlocked(idx)}
					{@const isCurrent = !isAbandoned && idx === statusNum}
					<button
						type="button"
						class="timeline-step"
						class:active={unlocked}
						class:is-current={isCurrent}
						disabled={!unlocked}
						onclick={() => handleChapterClick(idx)}
						title={unlocked ? `Ver historia del capítulo ${idx}` : `Capítulo ${idx} bloqueado`}
						aria-label={unlocked ? `Ver historia del capítulo ${idx}` : `Capítulo ${idx} bloqueado`}
					>
						{idx + 1}
					</button>
				{/each}
			</div>

			<!-- Action Buttons -->
			<div class="card-actions">
				{#if isArchived}
					{#if isCompleted}
						<div class="action-form">
							<Motion whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} let:motion>
								<button use:motion class="btn-primary btn-archive w-100" type="button" onclick={() => onVictory?.()}>
									<span class="btn-text">🏆 Ver Victoria</span>
								</button>
							</Motion>
						</div>
					{/if}
					<form method="POST" action="?/unarchiveTask" use:enhance={() => { return async ({ update }) => { await update(); }; }} class="action-form">
						<input type="hidden" name="taskId" value={task.id} />
						<Motion whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} let:motion>
							<button use:motion class="btn-primary w-100" type="submit">
								<span class="btn-text">Restaurar al Dashboard</span>
								<span class="btn-icon">↩</span>
							</button>
						</Motion>
					</form>
				{:else if isCompleted}
					<div class="action-form">
						<Motion whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} let:motion>
							<button use:motion class="btn-primary btn-archive w-100" type="button" onclick={() => onVictory?.()}>
								<span class="btn-text">🏆 Ver Victoria</span>
							</button>
						</Motion>
					</div>
				{:else}
					
					<!-- Manejo estricto de Estados según requerimientos -->
					{#if isAbandoned}
						<!-- Estado Abandono: Botón 1 para ver historia alternativa (El Botón 3 oculto porque ya está abandonado) -->
						<div class="action-form">
							<Motion whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} let:motion>
								<button use:motion class="btn-primary w-100" type="button" onclick={handleAdvanceClick}>
									<span class="btn-text">Visualizar historia alternativa</span>
									<span class="btn-icon">👁️</span>
								</button>
							</Motion>
						</div>
                          <!-- Estado 3: Desbloqueado luego de bitácora (Formulario de avance de servidor) -->
							<form method="POST" action="?/advanceLevel" use:enhance={() => { return async ({ update }) => { await update(); }; }} class="action-form">
								<input type="hidden" name="taskId" value={task.id} />
								<Motion whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} let:motion>
									<button use:motion class="btn-primary w-100" type="submit">
										<span class="btn-text">Reiniciar</span>
										<span class="btn-icon">→</span>
									</button>
								</Motion>
							</form>
					{:else}
						
						<!-- Estados Activos Normales -->
						{#if !hasViewed}
							<!-- Estado 1: Botón 0 (arriba) y Botón 1 en "Visualizar" -->
							<div class="action-form">
								<Motion whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} let:motion>
									<button use:motion class="btn-primary w-100" type="button" onclick={handleAdvanceClick}>
										<span class="btn-text">Visualizar para avanzar</span>
										<span class="btn-icon">👁️</span>
									</button>
								</Motion>
							</div>
						{:else if isLocked}
							<!-- Estado 2: Botón 0 y 1 Ocultos. Botón 2 Activo -->
							<div class="action-form">
								<Motion whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} let:motion>
									<button use:motion class="button is-warning is-light is-small btn-unlock w-100" type="button" onclick={() => (isModalOpen = true)}>
										<span class="btn-text">🔓 Desbloquear</span>
									</button>
								</Motion>
							</div>
						{:else}
							<!-- Estado 3: Desbloqueado luego de bitácora (Formulario de avance de servidor) -->
							<form method="POST" action="?/advanceLevel" use:enhance={() => { return async ({ update }) => { await update(); }; }} class="action-form">
								<input type="hidden" name="taskId" value={task.id} />
								<Motion whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} let:motion>
									<button use:motion class="btn-primary w-100" type="submit">
										<span class="btn-text">Avanzar de Nivel</span>
										<span class="btn-icon">→</span>
									</button>
								</Motion>
							</form>
						{/if}

						<!-- BOTÓN 3: Abandonar (Siempre activo mientras no esté en abandono) -->
						<form method="POST" action="?/abandonTask" use:enhance={() => { return async ({ update }) => { await update(); }; }} class="action-form">
							<input type="hidden" name="taskId" value={task.id} />
							<input type="hidden" name="status" value="-1" />
							<Motion whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} let:motion>
								<button use:motion class="btn-outline w-100" type="submit">
									<span class="btn-text">Abandonar</span>
								</button>
							</Motion>
						</form>
					{/if}

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
	:global(.project-card) {
		position: relative;
		overflow: hidden;
		box-sizing: border-box;
		width: 100%;
		max-width: 100%;
		padding: clamp(14px, 3.5vw, 22px) !important;
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.07) 0%,
			rgba(255, 255, 255, 0.02) 22%,
			var(--skin-glass-bg, rgba(30, 45, 54, 0.65)) 55%,
			color-mix(in srgb, var(--skin-bg-base, #10181c) 85%, transparent) 100%
		) !important;
		border: 1px solid var(--skin-glass-border, rgba(255, 255, 255, 0.12)) !important;
		border-radius: 18px !important;
		box-shadow: 
			0 12px 36px rgba(0, 0, 0, 0.35),
			inset 0 1px 1px rgba(255, 255, 255, 0.22),
			inset 0 -1px 0 rgba(255, 255, 255, 0.04) !important;
	}

	.card-header-line {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		flex-wrap: nowrap;
		position: relative;
		z-index: 12;
		width: 100%;
	}

	.card-title {
		font-family: var(--font-hierarchy-heading);
		font-size: clamp(1rem, 3.2vw, 1.22rem);
		line-height: 1.3;
		margin: 0;
		text-transform: capitalize;
		flex: 1 1 auto;
		min-width: 0;
		overflow-wrap: break-word;
		word-break: break-word;
	}

	.card-header-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
		flex-shrink: 0;
		margin-left: auto;
		position: relative;
		z-index: 20;
	}

	.badge-kids,
	.badge-general {
		padding: 4px 10px;
		border-radius: 999px;
		font-size: clamp(0.66rem, 1.9vw, 0.74rem);
		white-space: nowrap;
		max-width: 100%;
		display: inline-flex;
		align-items: center;
		line-height: 1.2;
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
	}

	.badge-kids {
		background: linear-gradient(135deg, rgba(255, 209, 102, 0.2), rgba(255, 209, 102, 0.08));
		border: 1px solid rgba(255, 209, 102, 0.42);
		color: #ffd166;
		font-weight: 700;
		box-shadow: 0 2px 10px rgba(255, 209, 102, 0.12);
	}

	.badge-general {
		font-family: var(--font-hierarchy-ui);
		background: color-mix(in srgb, var(--accent-primary) 14%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent-primary) 40%, transparent);
		color: var(--accent-primary);
		font-weight: 600;
		letter-spacing: 0.02em;
		box-shadow: 0 2px 10px var(--accent-glow);
	}

	.btn-icon-delete {
		background: rgba(231, 102, 102, 0.12);
		border: 1px solid rgba(231, 102, 102, 0.28);
		color: #e76666;
		border-radius: 9px;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.btn-icon-delete:hover {
		background: rgba(231, 102, 102, 0.28);
		color: #ffffff;
		transform: scale(1.08);
		box-shadow: 0 4px 12px rgba(231, 102, 102, 0.25);
	}

	.progress-timeline {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: clamp(2px, 0.7vw, 6px);
		position: relative;
		z-index: 20;
		margin: 34px 0 22px 0;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
	}

	:global(.project-card .timeline-step) {
		flex: 0 1
			clamp(
				18px,
				calc((100% - (var(--total-steps, 12) - 1) * 4px) / var(--total-steps, 12)),
				30px
			);
		width: clamp(
			18px,
			calc((100% - (var(--total-steps, 12) - 1) * 4px) / var(--total-steps, 12)),
			30px
		);
		height: clamp(
			18px,
			calc((100% - (var(--total-steps, 12) - 1) * 4px) / var(--total-steps, 12)),
			30px
		);
		aspect-ratio: 1 / 1;
		min-width: 0;
		min-height: 0;
		border-radius: 9px;
		font-size: clamp(0.56rem, 1.65vw, 0.78rem);
		font-weight: 700;
		padding: 0;
		font-family: var(--font-hierarchy-ui);
		line-height: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		background: linear-gradient(145deg, rgba(42, 59, 69, 0.9), rgba(22, 34, 41, 0.95));
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(154, 166, 173, 0.6);
		box-shadow:
			0 2px 6px rgba(0, 0, 0, 0.28),
			inset 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	:global(.project-card .timeline-step.active) {
		cursor: pointer;
		background: linear-gradient(135deg, var(--skin-primary, var(--accent-primary)) 0%, var(--skin-secondary, #10ac84) 100%);
		color: #04241c;
		font-weight: 800;
		border: 1px solid rgba(255, 255, 255, 0.45);
		box-shadow:
			var(--skin-glow),
			inset 0 1px 1px rgba(255, 255, 255, 0.55);
		transition:
			transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
			box-shadow 0.2s ease,
			filter 0.2s ease;
	}

	:global(.project-card .timeline-step.active.is-current) {
		box-shadow:
			0 0 0 2px rgba(25, 212, 168, 0.28),
			0 5px 14px rgba(25, 212, 168, 0.5),
			inset 0 1px 1px rgba(255, 255, 255, 0.65);
	}

	:global(.project-card .timeline-step.active:hover) {
		transform: translateY(-2px) scale(1.1);
		box-shadow:
			0 6px 16px rgba(25, 212, 168, 0.65),
			inset 0 1px 2px rgba(255, 255, 255, 0.75);
		filter: brightness(1.08);
	}

	:global(.project-card .timeline-step.active:active) {
		transform: translateY(0) scale(0.95);
	}

	:global(.project-card .timeline-step:disabled) {
		cursor: not-allowed;
		opacity: 0.65;
	}

	:global(.project-card .tooltip-progress) {
		max-width: calc(100% - 10px);
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: clamp(0.65rem, 2vw, 0.72rem);
		top:-1.5rem;

	}

	.tooltip-progress{
		font-size: clamp(0.50rem, 1vw, 0.32rem);

	}

	.card-actions {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 135px), 1fr));
		gap: 10px;
		margin-top: 18px;
		position: relative;
		z-index: 20;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
	}

	.action-form {
		min-width: 0;
		width: 100%;
		max-width: 100%;
	}

	.w-100 {
		width: 100% !important;
	}

	:global(.project-card .btn-primary),
	:global(.project-card .btn-outline),
	:global(.project-card .btn-unlock) {
		font-family: var(--font-hierarchy-ui);
		font-size: 0.85rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		padding: 0.45rem 1.1rem;
		min-height: 0;
		height: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		box-sizing: border-box;
		border-radius: 12px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease,
			background 0.2s ease,
			border-color 0.2s ease,
			color 0.2s ease,
			filter 0.2s ease;
	}

	:global(.project-card .btn-primary) {
		background: linear-gradient(135deg, var(--skin-primary, var(--accent-primary)) 0%, var(--skin-secondary, #10ac84) 100%) !important;
		color: #04241c !important;
		border: 1px solid color-mix(in srgb, var(--accent-primary) 25%, transparent) !important;
		box-shadow: 0 3px 10px var(--accent-glow) !important;
	}

	:global(.project-card .btn-primary:hover:not(:disabled)) {
		filter: brightness(1.07);
		box-shadow:
			0 8px 22px rgba(25, 212, 168, 0.42),
			inset 0 1px 1px rgba(255, 255, 255, 0.65) !important;
	}

	:global(.project-card .btn-outline) {
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.055) 0%,
			rgba(255, 255, 255, 0.018) 100%
		) !important;
		border: 1px solid rgba(255, 255, 255, 0.16) !important;
		color: #b8c7ce !important;
		box-shadow:
			0 4px 12px rgba(0, 0, 0, 0.22),
			inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
	}

	:global(.project-card .btn-outline:hover:not(:disabled)) {
		background: linear-gradient(
			135deg,
			rgba(231, 102, 102, 0.16) 0%,
			rgba(231, 102, 102, 0.06) 100%
		) !important;
		border-color: rgba(231, 102, 102, 0.45) !important;
		color: #ff9e9e !important;
		box-shadow:
			0 6px 16px rgba(231, 102, 102, 0.18),
			inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
	}

	.btn-archive {
		background: linear-gradient(135deg, var(--skin-primary, var(--accent-primary)) 0%, var(--skin-secondary, #10ac84) 100%) !important;
	}

	:global(.project-card .btn-unlock) {
		background: linear-gradient(
			135deg,
			rgba(255, 209, 102, 0.22) 0%,
			rgba(245, 158, 11, 0.12) 100%
		) !important;
		border: 1px solid rgba(255, 209, 102, 0.48) !important;
		color: #ffd166 !important;
		border-radius: 12px !important;
		font-weight: 700 !important;
		box-shadow:
			0 6px 18px rgba(255, 209, 102, 0.16),
			inset 0 1px 1px rgba(255, 255, 255, 0.22) !important;
	}

	:global(.project-card .btn-unlock:hover:not(:disabled)) {
		background: linear-gradient(
			135deg,
			rgba(255, 209, 102, 0.32) 0%,
			rgba(245, 158, 11, 0.22) 100%
		) !important;
		border-color: rgba(255, 209, 102, 0.7) !important;
		color: #fff2c2 !important;
		box-shadow:
			0 8px 22px rgba(255, 209, 102, 0.28),
			inset 0 1px 1px rgba(255, 255, 255, 0.35) !important;
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
		opacity: 0.38 !important;
		cursor: not-allowed !important;
		filter: grayscale(0.85) !important;
		pointer-events: none !important;
	}

	.btn-text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.btn-icon {
		font-size: 1rem;
		line-height: 1;
		flex-shrink: 0;
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
