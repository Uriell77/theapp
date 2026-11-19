<script lang="ts">
	import { enhance } from '$app/forms';
	import { Motion } from 'svelte-motion';
	import { isKidsTheme, capitalizeWords } from '$lib/chapterUtils';
	import { clearTaskTtsCache } from '$lib/ttsCache';
	import { getSkinByValue } from '$lib/skins';
	import { playClick, playOpen, playLevelUp, playComplete } from '$lib/audio';
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
		isFadingOut?: boolean;
		onSelect?: (chapterIndex: number) => void;
		/** Abre el SlidingPanel directamente en el Salón de la Victoria */
		onVictory?: () => void;
	}

	let { task = $bindable(), hasViewed = false, isFadingOut = false, onSelect, onVictory }: Props = $props();

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

	let unlockCountdown = $derived.by(() => {
		if (!isTimeLocked || !currentMilestone) return '';
		const diffMs = Math.max(0, currentMilestone - currentTime);
		const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
		const days = Math.floor(totalHours / 24);
		const hours = totalHours % 24;
		const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
		if (days > 0) {
			return `${days}d ${hours}h`;
		}
		return `0d ${hours}h ${minutes}m`;
	});

	let taskSkin = $derived(getSkinByValue(task?.tema));
	let themeSymbolId = $derived(isKids ? 'infantil' : taskSkin.id);

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
		playClick();
		if (onSelect) {
			onSelect(idx);
		}
	}

	function handleAdvanceClick(e: MouseEvent) {
		playClick();
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
		whileHover={isFadingOut ? undefined : { y: -2 }}
		transition={{ duration: 0.25 }}
		let:motion
	>
		<div
			use:motion
			class="glass-panel project-card"
			class:is-kids-theme={isKids}
			class:is-archived-card={isArchived}
			class:is-fading-out={isFadingOut}
			id={`task-${task.id}`}
		>
			<!-- Header del Card: Título + Badge de categoría + Botón de eliminar -->
			<div class="card-header-line">
				<h3 class="card-title has-text-weight-bold has-text-white {isKids ? 'font-kids' : 'font-modern-chapter'}">
					{displayTitle}
				</h3>

				<div class="card-header-actions is-justify-content-flex-end is-flex">
					<span
						class="badge-theme-symbol"
						role="img"
						title={isKids ? 'Infantil' : tematicaEtiqueta}
						aria-label={isKids ? 'Tema: Infantil' : `Tema: ${tematicaEtiqueta}`}
						style="--badge-c1: {isKids ? '#ffd166' : taskSkin.primary}; --badge-c2: {isKids ? '#f97316' : taskSkin.secondary}; --badge-bg: {isKids ? 'linear-gradient(135deg, rgba(255, 209, 102, 0.24), rgba(249, 115, 22, 0.2))' : taskSkin.badgeBg}; --badge-border: {isKids ? 'rgba(255, 209, 102, 0.6)' : taskSkin.badgeBorder};"
					>
						<svg class="theme-symbol-svg" viewBox="0 0 64 64" width="18" height="18" fill="none" aria-hidden="true">
							{#if themeSymbolId === 'infantil'}
								<ellipse cx="32" cy="24" rx="14" ry="17" fill="var(--badge-c1)" fill-opacity="0.32" stroke="var(--badge-c1)" stroke-width="3.5" />
								<path d="M27 16c2-3 5-4 8-3" stroke="var(--badge-c2)" stroke-width="3" stroke-linecap="round" />
								<path d="M32 41l-3 5h6l-3-5z" fill="var(--badge-c2)" />
								<path d="M32 46c-3 5 4 8 0 13" stroke="var(--badge-c2)" stroke-width="3" stroke-linecap="round" />
							{:else if themeSymbolId === 'fantasia'}
								<polygon points="32,6 45,24 38,54 26,54 19,24" fill="var(--badge-c1)" fill-opacity="0.28" stroke="var(--badge-c1)" stroke-width="3.5" stroke-linejoin="round" />
								<path d="M32 6v48M19 24h26" stroke="var(--badge-c2)" stroke-width="2.5" />
								<path d="M10 14l4 4M54 14l-4 4" stroke="var(--badge-c2)" stroke-width="3" stroke-linecap="round" />
							{:else if themeSymbolId === 'medieval'}
								<path d="M14 50L50 14M42 12l10 2-2 10M12 42l10 10" stroke="var(--badge-c2)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
								<path d="M50 50L14 14M22 12l-10 2 2 10M52 42L42 52" stroke="var(--badge-c1)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
							{:else if themeSymbolId === 'olimpo'}
								<path d="M14 46a10 10 0 0 1-2-19.8A13 13 0 0 1 39 22a11 11 0 0 1 11 19H14z" fill="var(--badge-c2)" fill-opacity="0.26" stroke="var(--badge-c2)" stroke-width="3.2" stroke-linejoin="round" />
								<path d="M36 9l-8 15h9l-7 15" stroke="var(--badge-c1)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
							{:else if themeSymbolId === 'samurai'}
								<circle cx="32" cy="22" r="11" fill="var(--badge-c1)" fill-opacity="0.85" />
								<path d="M11 22h42M15 31h34M22 22v30M42 22v30" stroke="#f5efe6" stroke-width="3.2" stroke-linecap="round" />
								<path d="M54 10v44M54 22l6-4M54 36l6-4" stroke="var(--badge-c2)" stroke-width="3.2" stroke-linecap="round" />
							{:else if themeSymbolId === 'alquimia'}
								<path d="M25 10h14M28 10v14L13 48a4 4 0 0 0 3.5 6h31a4 4 0 0 0 3.5-6L36 24V10" stroke="var(--badge-c1)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" />
								<path d="M17 42h30" stroke="var(--badge-c2)" stroke-width="3.5" stroke-linecap="round" />
								<circle cx="30" cy="34" r="3" fill="var(--badge-c2)" />
							{:else if themeSymbolId === 'ciberespacio'}
								<rect x="19" y="19" width="26" height="26" rx="4" stroke="var(--badge-c1)" stroke-width="3.5" />
								<rect x="27" y="27" width="10" height="10" rx="1.5" fill="var(--badge-c2)" />
								<path d="M26 9v10M38 9v10M26 45v10M38 45v10M9 26h10M9 38h10M45 26h10M45 38h10" stroke="var(--badge-c1)" stroke-width="3.2" stroke-linecap="round" />
							{:else if themeSymbolId === 'steampunk'}
								<circle cx="32" cy="32" r="13" stroke="var(--badge-c1)" stroke-width="3.5" />
								<circle cx="32" cy="32" r="5.5" fill="var(--badge-c2)" fill-opacity="0.4" stroke="var(--badge-c2)" stroke-width="2.5" />
								<path d="M32 9v7M32 48v7M9 32h7M48 32h7M15 15l5 5M44 44l5 5M49 15l-5 5M20 44l-5 5" stroke="var(--badge-c1)" stroke-width="4.2" stroke-linecap="round" />
							{:else if themeSymbolId === 'espacio'}
								<circle cx="32" cy="32" r="14" fill="var(--badge-c1)" fill-opacity="0.32" stroke="var(--badge-c1)" stroke-width="3.5" />
								<ellipse cx="32" cy="32" rx="28" ry="9" transform="rotate(-22 32 32)" stroke="var(--badge-c2)" stroke-width="3.2" />
								<circle cx="13" cy="14" r="2.5" fill="var(--badge-c1)" />
								<circle cx="51" cy="50" r="2.5" fill="var(--badge-c2)" />
							{:else if themeSymbolId === 'mechas'}
								<polygon points="32,7 55,20 55,44 32,57 9,44 9,20" stroke="var(--badge-c1)" stroke-width="3.5" stroke-linejoin="round" />
								<path d="M17 28h30l-6 10H23z" fill="var(--badge-c2)" fill-opacity="0.5" stroke="var(--badge-c2)" stroke-width="3" stroke-linejoin="round" />
								<path d="M32 7v11M9 20l10 6M55 20l-10 6" stroke="var(--badge-c1)" stroke-width="2.8" />
							{:else if themeSymbolId === 'superheroes'}
								<polygon points="36,6 13,36 30,36 25,58 51,26 34,26" fill="var(--badge-c1)" stroke="var(--badge-c2)" stroke-width="3.2" stroke-linejoin="round" />
							{:else if themeSymbolId === 'postapocaliptico'}
								<circle cx="32" cy="32" r="22" stroke="var(--badge-c1)" stroke-width="3.5" />
								<circle cx="32" cy="32" r="5" fill="var(--badge-c2)" />
								<path d="M32 25L21 12M32 25L43 12M25 36l-13 5M39 36l13 5M32 39v15" stroke="var(--badge-c2)" stroke-width="4.2" stroke-linecap="round" />
							{:else if themeSymbolId === 'zombie'}
								<circle cx="32" cy="21" r="11" stroke="var(--badge-c1)" stroke-width="3.2" />
								<circle cx="21" cy="40" r="11" stroke="var(--badge-c1)" stroke-width="3.2" />
								<circle cx="43" cy="40" r="11" stroke="var(--badge-c1)" stroke-width="3.2" />
								<circle cx="32" cy="34" r="5.5" fill="var(--badge-c2)" />
							{:else if themeSymbolId === 'espionaje'}
								<circle cx="32" cy="32" r="22" stroke="var(--badge-c1)" stroke-width="3.2" />
								<circle cx="32" cy="32" r="12" stroke="var(--badge-c2)" stroke-width="3" />
								<path d="M32 6v12M32 46v12M6 32h12M46 32h12" stroke="var(--badge-c1)" stroke-width="3.2" stroke-linecap="round" />
								<circle cx="32" cy="32" r="3.5" fill="var(--badge-c1)" />
							{:else if themeSymbolId === 'golpe_maestro'}
								<polygon points="18,14 46,14 56,28 32,54 8,28" fill="var(--badge-c1)" fill-opacity="0.22" stroke="var(--badge-c1)" stroke-width="3.5" stroke-linejoin="round" />
								<path d="M8 28h48M18 14l8 14 6 26 6-26 8-14" stroke="var(--badge-c2)" stroke-width="2.6" stroke-linejoin="round" />
							{:else if themeSymbolId === 'noir'}
								<path d="M11 33c11 4 31 4 42 0M17 33l4-16c5-3 17-3 22 0l4 16" fill="var(--badge-c1)" fill-opacity="0.24" stroke="var(--badge-c1)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
								<circle cx="39" cy="45" r="7.5" stroke="#e4e4e7" stroke-width="3" />
								<path d="M45 51l7 7" stroke="var(--badge-c2)" stroke-width="4" stroke-linecap="round" />
							{:else if themeSymbolId === 'salvaje_oeste'}
								<polygon points="32,8 38,22 54,22 41,32 46,47 32,38 18,47 23,32 10,22 26,22" fill="var(--badge-c1)" fill-opacity="0.28" stroke="var(--badge-c1)" stroke-width="3.2" stroke-linejoin="round" />
								<circle cx="32" cy="29" r="5" fill="var(--badge-c2)" fill-opacity="0.55" stroke="var(--badge-c2)" stroke-width="2.5" />
							{:else if themeSymbolId === 'terror_cosmico'}
								<path d="M8 32c6-12 16-18 24-18s18 6 24 18c-6 12-16 18-24 18S14 44 8 32z" fill="var(--badge-c1)" fill-opacity="0.18" stroke="var(--badge-c1)" stroke-width="3.2" />
								<circle cx="32" cy="32" r="8" stroke="var(--badge-c1)" stroke-width="2.8" />
								<ellipse cx="32" cy="32" rx="3" ry="6.5" fill="var(--badge-c2)" />
							{:else if themeSymbolId === 'guerra'}
								<path d="M14 21l18-10 18 10M14 47l18-10 18 10" stroke="var(--badge-c1)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
								<path d="M14 34l18-10 18 10" stroke="var(--badge-c2)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
							{:else if themeSymbolId === 'desastre_natural'}
								<rect x="16" y="18" width="32" height="36" rx="6" fill="var(--badge-c2)" fill-opacity="0.16" stroke="var(--badge-c2)" stroke-width="3.2" />
								<path d="M24 18v-4a8 8 0 0 1 16 0v4M16 32h32" stroke="var(--badge-c2)" stroke-width="3" />
								<rect x="27" y="28" width="10" height="8" rx="2" fill="var(--badge-c1)" />
							{:else if themeSymbolId === 'comedia_romantica'}
								<path d="M32 52S10 38 10 22a11 11 0 0 1 22-3 11 11 0 0 1 22 3c0 16-22 30-22 30z" fill="var(--badge-c1)" fill-opacity="0.85" stroke="var(--badge-c2)" stroke-width="2.5" />
								<path d="M47 11v6M44 14h6" stroke="var(--badge-c2)" stroke-width="2.8" stroke-linecap="round" />
							{:else if themeSymbolId === 'caos_comedia'}
								<polygon points="32,6 38,20 54,14 45,28 58,36 43,40 48,54 34,46 22,56 23,41 8,40 19,30 12,16 26,21" fill="var(--badge-c1)" stroke="var(--badge-c2)" stroke-width="3" stroke-linejoin="round" />
							{:else}
								<circle cx="32" cy="32" r="23" stroke="var(--badge-c1)" stroke-width="3.2" />
								<polygon points="32,12 38,32 32,52 26,32" fill="var(--badge-c1)" />
								<circle cx="32" cy="32" r="4" fill="var(--badge-c2)" />
							{/if}
						</svg>
					</span>

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
									playClick();
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
								<button
									use:motion
									class="btn-primary btn-archive w-100"
									type="button"
									onclick={() => {
										playClick();
										onVictory?.();
									}}
								>
									<span class="btn-text">🏆 Ver Victoria</span>
								</button>
							</Motion>
						</div>
					{/if}
					<form method="POST" action="?/unarchiveTask" use:enhance={() => { return async ({ update }) => { await update(); }; }} class="action-form">
						<input type="hidden" name="taskId" value={task.id} />
						<Motion whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} let:motion>
							<button use:motion class="btn-primary w-100" type="submit" onclick={playClick}>
								<span class="btn-text">Restaurar al Dashboard</span>
								<span class="btn-icon">↩</span>
							</button>
						</Motion>
					</form>
				{:else if isCompleted}
					{#if !hasViewed}
						<div class="action-form">
							<Motion whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} let:motion>
								<button use:motion class="btn-primary w-100" type="button" onclick={handleAdvanceClick}>
									<span class="btn-text">Visualizar capítulo final</span>
									<span class="btn-icon">👁️</span>
								</button>
							</Motion>
						</div>
					{:else}
						<div class="action-form">
							<Motion whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} let:motion>
								<button
									use:motion
									class="btn-primary btn-archive w-100"
									type="button"
									onclick={() => {
										playClick();
										onVictory?.();
									}}
								>
									<span class="btn-text">🏆 Ver Victoria</span>
								</button>
							</Motion>
						</div>
					{/if}
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
									<button use:motion class="btn-primary w-100" type="submit" onclick={playClick}>
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
									<button
										use:motion
										class="button is-warning is-light is-small btn-unlock w-100"
										type="button"
										onclick={() => {
											playClick();
											playOpen();
											isModalOpen = true;
										}}
										title={unlockCountdown ? `Se desbloquea automáticamente en ${unlockCountdown}` : 'Desbloquear capítulo'}
									>
										<span class="btn-text">🔓 Desbloquear</span>
										{#if unlockCountdown}
											<span class="unlock-countdown">⏳ {unlockCountdown}</span>
										{/if}
									</button>
								</Motion>
							</div>
						{:else}
							<!-- Estado 3: Desbloqueado luego de bitácora (Formulario de avance de servidor) -->
							<form
								method="POST"
								action="?/advanceLevel"
								use:enhance={() => {
									const nextStatus = statusNum + 1;
									const willComplete = nextStatus >= task.cantidad_de_niveles - 1;
									return async ({ result, update }) => {
										if (result.type === 'success') {
											if (willComplete) {
												playComplete();
											} else {
												playLevelUp();
											}
										}
										await update();
									};
								}}
								class="action-form"
							>
								<input type="hidden" name="taskId" value={task.id} />
								<Motion whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} let:motion>
									<button use:motion class="btn-primary w-100" type="submit" onclick={playClick}>
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
								<button use:motion class="btn-outline w-100" type="submit" onclick={playClick}>
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
	:global(.glass-panel.project-card) {
		position: relative;
		overflow: hidden;
		box-sizing: border-box;
		width: 100%;
		max-width: 100%;
		margin-bottom: 1rem;
		padding: clamp(14px, 3.5vw, 22px);
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--skin-primary, #26b08d) 12%, rgba(255, 255, 255, 0.05)) 0%,
			color-mix(in srgb, var(--skin-primary, #26b08d) 4%, rgba(255, 255, 255, 0.015)) 24%,
			var(--skin-glass-bg, rgba(30, 45, 54, 0.65)) 56%,
			color-mix(in srgb, var(--skin-bg-base, #10181c) 88%, transparent) 100%
		) !important;
		border: 1px solid var(--skin-glass-border, rgba(255, 255, 255, 0.12));
		border-radius: 18px !important;
		box-shadow:
			0 12px 36px rgba(0, 0, 0, 0.38),
			0 0 22px color-mix(in srgb, var(--skin-primary, #26b08d) 7%, transparent),
			inset 0 1px 1px color-mix(in srgb, var(--skin-primary, #26b08d) 28%, rgba(255, 255, 255, 0.16)),
			inset 0 -1px 1px color-mix(in srgb, var(--skin-secondary, #178267) 16%, rgba(255, 255, 255, 0.03)) !important;
	}

	:global(.glass-panel.project-card.is-fading-out) {
		pointer-events: none;
		overflow: hidden;
		animation: card-vanish-2s 2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
	}

	@keyframes card-vanish-2s {
		0% {
			opacity: 1;
			transform: translateY(0) scale(1);
			filter: blur(0px);
			max-height: 460px;
			margin-bottom: 1rem;
			padding-top: clamp(14px, 3.5vw, 22px);
			padding-bottom: clamp(14px, 3.5vw, 22px);
			border-width: 1px;
		}
		60% {
			opacity: 0.25;
			transform: translateY(-10px) scale(0.96);
			filter: blur(3px);
			max-height: 460px;
			margin-bottom: 1rem;
			padding-top: clamp(14px, 3.5vw, 22px);
			padding-bottom: clamp(14px, 3.5vw, 22px);
			border-width: 1px;
		}
		100% {
			opacity: 0;
			transform: translateY(-16px) scale(0.93);
			filter: blur(6px);
			max-height: 0;
			margin-bottom: 0;
			padding-top: 0;
			padding-bottom: 0;
			border-width: 0;
		}
	}

	:global(.project-card::before) {
		background: linear-gradient(
			115deg,
			transparent 0%,
			color-mix(in srgb, var(--skin-primary, #26b08d) 4%, transparent) 26%,
			color-mix(in srgb, var(--skin-primary, #26b08d) 11%, rgba(255, 255, 255, 0.04)) 36%,
			color-mix(in srgb, var(--skin-secondary, #178267) 5%, transparent) 46%,
			transparent 58%
		) !important;
	}

	:global(.project-card::after) {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		width: 65%;
		height: 55%;
		background: radial-gradient(
			ellipse at top right,
			color-mix(in srgb, var(--skin-primary, #26b08d) 9%, transparent) 0%,
			color-mix(in srgb, var(--skin-secondary, #178267) 3%, transparent) 45%,
			transparent 75%
		);
		pointer-events: none;
		z-index: 1;
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

	.badge-theme-symbol {
		width: 30px;
		height: 30px;
		border-radius: 10px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		background: var(--badge-bg, rgba(20, 28, 36, 0.78));
		border: 1px solid var(--badge-border, color-mix(in srgb, var(--badge-c1, var(--accent-primary)) 55%, var(--badge-c2, var(--accent-primary))));
		box-shadow:
			0 2px 10px color-mix(in srgb, var(--badge-c1, var(--accent-primary)) 22%, transparent),
			inset 0 1px 0 rgba(255, 255, 255, 0.14);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.badge-theme-symbol:hover {
		transform: scale(1.06);
		box-shadow: 0 3px 12px color-mix(in srgb, var(--badge-c1, var(--accent-primary)) 34%, transparent);
	}

	.theme-symbol-svg {
		display: block;
		flex-shrink: 0;
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
			0 0 0 2px color-mix(in srgb, var(--skin-primary, var(--accent-primary)) 28%, transparent),
			0 5px 14px color-mix(in srgb, var(--skin-primary, var(--accent-primary)) 42%, transparent),
			inset 0 1px 1px rgba(255, 255, 255, 0.45);
	}

	:global(.project-card .timeline-step.active:hover) {
		transform: translateY(-2px) scale(1.1);
		box-shadow:
			0 6px 16px color-mix(in srgb, var(--skin-primary, var(--accent-primary)) 52%, transparent),
			inset 0 1px 2px rgba(255, 255, 255, 0.55);
		filter: brightness(1.06);
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
		filter: brightness(1.06);
		box-shadow:
			0 8px 20px color-mix(in srgb, var(--skin-primary, var(--accent-primary)) 32%, transparent),
			inset 0 1px 1px rgba(255, 255, 255, 0.45) !important;
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

	.unlock-countdown {
		font-size: 0.72rem;
		font-weight: 700;
		padding: 2px 7px;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.28);
		border: 1px solid rgba(255, 209, 102, 0.35);
		color: #fff6d6;
		letter-spacing: 0.02em;
		flex-shrink: 0;
		line-height: 1.2;
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
