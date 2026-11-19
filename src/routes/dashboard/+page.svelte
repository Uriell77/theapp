<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { Motion } from 'svelte-motion';
	import CardTask from '$lib/components/CardTask.svelte';
	import SlidingPanel from '$lib/components/SlidingPanel.svelte';
	import { supabase } from '$lib/supabaseClient';
	import Estadistic from '$lib/components/Estadistic.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import SeccionAjustes from '$lib/components/SeccionAjustes.svelte';
	import SoundEngine from '$lib/components/SoundEngine.svelte';
	import { page } from '$app/state';
	import { playClick, playClose, playOpen, playSlide, playSuccess, playVanish } from '$lib/audio';
	import { syncSkin } from '$lib/skins';

	const tematicasAgrupadas = [
    {
        grupo: 'Fantasía y Mitología',
        opciones: [
            { valor: 'Alta Fantasía y Magia', etiqueta: 'Fantasía' },
            { valor: 'Cruzada Medieval', etiqueta: 'Medieval' },
            { valor: 'Mitología Griega y el Olimpo', etiqueta: 'Olimpo' },
            { valor: 'Dinastía Samurái', etiqueta: 'Samurái' },
            { valor: 'Alquimia y Magia Arcana', etiqueta: 'Alquimia' }
        ]
    },
    {
        grupo: 'Ciencia Ficción',
        opciones: [
            { valor: 'Cyberpunk y Neón', etiqueta: 'Ciberespacio' }, 
            { valor: 'Steampunk', etiqueta: 'Steampunk' }, 
            { valor: 'Guerra Espacial de Naves', etiqueta: 'Espacio' },         
            { valor: 'Combate de Mechas Gigantes', etiqueta: 'Mechas' },
            { valor: 'Superhéroes y Cómics', etiqueta: 'Superhéroes' },
            { valor: 'Supervivencia Post-Apocalíptica', etiqueta: 'Mundo Post-Apocaliptico' }
        ]
    },
    {
        grupo: 'Supervivencia y Acción',
        opciones: [
            { valor: 'Apocalipsis Zombie', etiqueta: 'Zombie' }, // UI limpia, pero Gemini recibe "Zombie"
            { valor: 'Espionaje Táctico Moderno', etiqueta: 'Espionaje' },
		{ valor: 'Atraco de Guante Blanco y Estafa Maestra', etiqueta: 'Golpe Maestro' },
		{ valor: 'Detective Noir', etiqueta: 'Noir' },
            { valor: 'El Salvaje Oeste', etiqueta: 'Salvaje Oeste' },
            { valor: 'Terror Cosmico', etiqueta: 'Terror Cosmico' }, 
            { valor: 'Guerra Mundia', etiqueta: 'Guerra' }, 
            { valor: 'Desastre Natural', etiqueta: 'Desastre Matural' }, 
        ]
    },
    {
    grupo: 'Humor y Vida Cotidiana',
    opciones: [
        { valor: 'Comedia Romántica y Torpeza Adorable', etiqueta: 'Comedia Romántica' },
        { valor: 'Comedia Absurda y Caos Cotidiano', etiqueta: 'Caos y Comedia' }
    ]
}
];

	let { data } = $props();

	// Estado reactivo para las tareas — ordenadas por ID desc (nuevas primero)
	let allTasks = $state<any[]>([]);

	$effect(() => {
		const rawTasks = data.user?.tasks || [];
		allTasks = [...rawTasks].sort((a: any, b: any) => Number(b.id) - Number(a.id));
	});

	const VIEWED_STORAGE_KEY = 'mg_viewed_tasks';
	const DISMISSED_STORAGE_KEY = 'mg_dismissed_tasks';

	const isTaskCompleted = (t: any) =>
		parseInt(t.status, 10) !== -1 && parseInt(t.status, 10) >= t.cantidad_de_niveles - 1;

	let isPanelOpen = $state(false);
	let panelMode = $state<'form' | 'details'>('form');
	let selectedTaskId = $state<number | null>(null);
	let selectedChapter = $state<number | null>(null);
	let startInVictory = $state(false);
	let viewedTasks = $state<Record<string, string>>({});
	let dismissedTasks = $state<Record<string, string>>({});
	let fadingTasks = $state<Record<string, boolean>>({});
	let justViewedFinalTaskId = $state<number | null>(null);

	function isTaskDismissedFromDashboard(t: any): boolean {
		if (t.isArchived) return true;
		const statusNum = parseInt(String(t.status), 10);
		const isFinalState = isTaskCompleted(t) || statusNum === -1;
		if (!isFinalState) return false;
		return dismissedTasks[String(t.id)] === String(t.status);
	}

	// Separar activas / archivadas / culminadas / retiradas
	let tasks = $derived(
		allTasks.filter(
			(t: any) => !isTaskDismissedFromDashboard(t) || Boolean(fadingTasks[String(t.id)])
		)
	);
	let archivedTasks = $derived(allTasks.filter((t: any) => t.isArchived));
	// Victoria: completadas al 100%  ·  Archivo (Retiradas Tácticas): abandonadas
	let victoryTasks = $derived(allTasks.filter((t: any) => isTaskCompleted(t)));
	let retreatTasks = $derived(allTasks.filter((t: any) => parseInt(t.status, 10) === -1));

	let selectedTask = $derived(allTasks.find((t: any) => t.id === selectedTaskId) || null);

	// Skin automático: tema dominante de los proyectos (si el modo es 'auto')
	$effect(() => {
		syncSkin(allTasks);
	});

	// Vista activa: 'dashboard' | 'victoria' | 'bitacora' | 'archivo' | 'ajustes'
	type ViewId = 'dashboard' | 'victoria' | 'bitacora' | 'archivo' | 'ajustes';
	const VIEWS: ViewId[] = ['dashboard', 'victoria', 'bitacora', 'archivo', 'ajustes'];
	const tabParam = page.url.searchParams.get('tab') as ViewId | null;
	let activeTab = $state<ViewId>(tabParam && VIEWS.includes(tabParam) ? tabParam : 'dashboard');

	// Bitácora de Desbloqueo (project_logs agrupados por tarea)
	let globalLogs = $state<any[]>([]);
	let logsLoading = $state(false);
	let logsError = $state<string | null>(null);
	let expandedImage = $state<string | null>(null);
	let selectedBitacoraTaskId = $state<number | null>(null);
	let bitacoraSlideIdx = $state(0);
	let bitacoraPaused = $state(false);
	let bitacoraWheelCooldown = 0;
	let bitacoraTouchStartY = 0;

	let bitacoraTaskGroups = $derived.by(() => {
		const grouped = new Map<number, { id: number; title: string; tema: string; logs: any[] }>();

		for (const log of globalLogs) {
			const resolvedId = Number(log.task_id ?? log.project_id);
			if (isNaN(resolvedId)) continue;
			const matchedTask = allTasks.find((t: any) => Number(t.id) === resolvedId);
			const title = log.tasks?.title ?? matchedTask?.title ?? `Proyecto #${resolvedId}`;
			const tema = log.tasks?.tema ?? matchedTask?.tema ?? '';

			if (!grouped.has(resolvedId)) {
				grouped.set(resolvedId, { id: resolvedId, title, tema, logs: [] });
			}
			grouped.get(resolvedId)!.logs.push(log);
		}

		for (const group of grouped.values()) {
			group.logs.sort((a, b) => Number(a.level) - Number(b.level));
		}

		return Array.from(grouped.values());
	});

	let activeBitacoraGroup = $derived(
		bitacoraTaskGroups.find((g) => g.id === selectedBitacoraTaskId) ?? bitacoraTaskGroups[0] ?? null
	);
	let currentBitacoraLogs = $derived(activeBitacoraGroup?.logs ?? []);
	let activeBitacoraSlide = $derived(
		currentBitacoraLogs.length > 0
			? currentBitacoraLogs[Math.min(bitacoraSlideIdx, currentBitacoraLogs.length - 1)]
			: null
	);

	async function loadGlobalLogs() {
		const ids = allTasks.map((t: any) => t.id);
		if (ids.length === 0) {
			globalLogs = [];
			return;
		}
		logsLoading = true;
		logsError = null;
		try {
			const idList = ids.join(',');
			const { data: rows, error } = await supabase
				.from('project_logs')
				.select('*')
				.or(`task_id.in.(${idList}),project_id.in.(${idList})`)
				.order('level', { ascending: true })
				.order('created_at', { ascending: true });

			let fetchedRows: any[] = [];
			if (!error && Array.isArray(rows) && rows.length > 0) {
				fetchedRows = rows;
			} else {
				const res = await fetch('/api/project-logs');
				if (!res.ok) {
					throw new Error(`HTTP ${res.status}`);
				}
				const payload = await res.json();
				fetchedRows = Array.isArray(payload?.logs) ? payload.logs : [];
			}

			const taskMap = new Map(allTasks.map((t: any) => [Number(t.id), t]));
			globalLogs = fetchedRows.map((row: any) => {
				const resolvedId = Number(row.task_id ?? row.project_id);
				const t = taskMap.get(resolvedId);
				return {
					...row,
					task_id: isNaN(resolvedId) ? row.task_id : resolvedId,
					tasks: row.tasks ?? (t ? { title: t.title, tema: t.tema } : null)
				};
			});
		} catch (err) {
			console.error('Error al cargar la bitácora global:', err);
			logsError = 'No se pudo cargar la bitácora de desbloqueo.';
			globalLogs = [];
		} finally {
			logsLoading = false;
		}
	}

	function selectBitacoraTask(taskId: number) {
		playClick();
		if (selectedBitacoraTaskId !== taskId) {
			playSlide();
			selectedBitacoraTaskId = taskId;
			bitacoraSlideIdx = 0;
		}
	}

	function shiftBitacoraSlide(delta: number, withAudio = false) {
		if (currentBitacoraLogs.length < 2) return;
		if (withAudio) {
			playClick();
			playSlide();
		}
		bitacoraSlideIdx = (bitacoraSlideIdx + delta + currentBitacoraLogs.length) % currentBitacoraLogs.length;
	}

	function selectBitacoraSlide(index: number) {
		playClick();
		if (bitacoraSlideIdx !== index) {
			playSlide();
			bitacoraSlideIdx = index;
		}
	}

	function handleBitacoraWheel(e: WheelEvent) {
		if (currentBitacoraLogs.length < 2 || Math.abs(e.deltaY) < 12) return;
		const now = Date.now();
		if (now - bitacoraWheelCooldown < 380) return;
		e.preventDefault();
		bitacoraWheelCooldown = now;
		shiftBitacoraSlide(e.deltaY > 0 ? 1 : -1, true);
	}

	function handleBitacoraTouchStart(e: TouchEvent) {
		bitacoraTouchStartY = e.touches[0]?.clientY ?? 0;
	}

	function handleBitacoraTouchEnd(e: TouchEvent) {
		if (currentBitacoraLogs.length < 2) return;
		const endY = e.changedTouches[0]?.clientY ?? bitacoraTouchStartY;
		const deltaY = endY - bitacoraTouchStartY;
		if (Math.abs(deltaY) > 36) {
			shiftBitacoraSlide(deltaY < 0 ? 1 : -1, true);
		}
	}

	$effect(() => {
		if (activeTab === 'bitacora') {
			void allTasks.length;
			untrack(() => loadGlobalLogs());
		}
	});

	$effect(() => {
		if (
			activeTab !== 'bitacora' ||
			currentBitacoraLogs.length < 2 ||
			bitacoraPaused ||
			expandedImage !== null
		) {
			return;
		}
		void bitacoraSlideIdx;
		void activeBitacoraGroup?.id;
		const timer = setInterval(() => shiftBitacoraSlide(1), 7000);
		return () => clearInterval(timer);
	});

	function formatLogDate(value: string) {
		const d = new Date(value);
		return isNaN(d.getTime())
			? ''
			: d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
	}

	// Estados formulario
	let newTaskTitle = $state('');
	let newTaskTema = $state('Guerra Espacial');
	let newTaskNiveles = $state(3);
	let endDate = $state('');
	let milestones = $state<string[]>([]);

	function formatToDateTimeLocal(date: Date): string {
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	$effect(() => {
		if (!endDate) {
			milestones = [];
			return;
		}

		const start = Date.now();
		const end = new Date(endDate).getTime();

		if (isNaN(end) || end <= start || newTaskNiveles <= 1) {
			milestones = [];
			return;
		}

		const totalSteps = newTaskNiveles;
		const stepInterval = (end - start) / totalSteps;
		const calculated: string[] = [];

		for (let i = 1; i <= totalSteps; i++) {
			if (i === totalSteps) {
				calculated.push(endDate);
			} else {
				const stepTime = new Date(start + stepInterval * i);
				calculated.push(formatToDateTimeLocal(stepTime));
			}
		}

		milestones = calculated;
	});

	// Estados de carga y error
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	function loadStorageMap(key: string): Record<string, string> {
		try {
			const raw = localStorage.getItem(key);
			if (!raw) return {};
			const parsed = JSON.parse(raw);
			return parsed && typeof parsed === 'object' ? parsed : {};
		} catch {
			return {};
		}
	}

	function persistStorageMap(key: string, map: Record<string, string>) {
		try {
			localStorage.setItem(key, JSON.stringify(map));
		} catch {}
	}

	function markTaskViewed(taskId: number, statusStr: string) {
		const idKey = String(taskId);
		if (viewedTasks[idKey] !== statusStr) {
			viewedTasks = { ...viewedTasks, [idKey]: statusStr };
			persistStorageMap(VIEWED_STORAGE_KEY, viewedTasks);
		}
	}

	function markTaskDismissed(taskId: number, statusStr: string) {
		const idKey = String(taskId);
		if (dismissedTasks[idKey] !== statusStr) {
			dismissedTasks = { ...dismissedTasks, [idKey]: statusStr };
			persistStorageMap(DISMISSED_STORAGE_KEY, dismissedTasks);
		}
	}

	const vanishTimers = new Map<string, ReturnType<typeof setTimeout>>();
	let wasPanelOpen = false;

	$effect(() => {
		const open = isPanelOpen;
		if (wasPanelOpen && !open) {
			const targetId = untrack(() => justViewedFinalTaskId);
			justViewedFinalTaskId = null;
			if (targetId !== null) {
				const key = String(targetId);
				const task = untrack(() => allTasks.find((t: any) => t.id === targetId));
				if (task) {
					const statusStr = String(task.status);
					const isFinalState = isTaskCompleted(task) || parseInt(statusStr, 10) === -1;
					const alreadyDismissed = untrack(() => dismissedTasks[key] === statusStr);
					if (isFinalState && !task.isArchived && !alreadyDismissed) {
						const inDashboard = untrack(() => activeTab === 'dashboard');
						if (inDashboard) {
							fadingTasks = { ...untrack(() => fadingTasks), [key]: true };
							playVanish();
							const prevTimer = vanishTimers.get(key);
							if (prevTimer) clearTimeout(prevTimer);
							const timer = setTimeout(() => {
								vanishTimers.delete(key);
								markTaskDismissed(targetId, statusStr);
								const nextFading = { ...fadingTasks };
								delete nextFading[key];
								fadingTasks = nextFading;
							}, 2000);
							vanishTimers.set(key, timer);
						} else {
							markTaskDismissed(targetId, statusStr);
						}
					}
				}
			}
		}
		wasPanelOpen = open;
	});

	onMount(() => {
		viewedTasks = loadStorageMap(VIEWED_STORAGE_KEY);
		dismissedTasks = loadStorageMap(DISMISSED_STORAGE_KEY);

		const channel = supabase
			.channel('tasks_channel')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
				invalidateAll();
			})
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
			for (const timer of vanishTimers.values()) clearTimeout(timer);
			vanishTimers.clear();
		};
	});

	function switchTab(nextTab: ViewId) {
		playClick();
		if (activeTab !== nextTab) {
			playSlide();
			activeTab = nextTab;
		}
	}

	function openCreateForm() {
		playClick();
		playOpen();
		panelMode = 'form';
		selectedTaskId = null;
		selectedChapter = null;
		startInVictory = false;
		isPanelOpen = true;
	}

	function openVictory(taskId: number) {
		const task = allTasks.find((t: any) => t.id === taskId);
		if (!task) return;
		playClick();
		playOpen();
		const statusStr = String(task.status);
		markTaskViewed(taskId, statusStr);
		if (!task.isArchived && dismissedTasks[String(taskId)] !== statusStr) {
			justViewedFinalTaskId = taskId;
		}
		panelMode = 'details';
		selectedTaskId = taskId;
		selectedChapter = Math.max(0, task.cantidad_de_niveles - 1);
		startInVictory = true;
		isPanelOpen = true;
	}

	function openTaskDetails(taskId: number, chapterIndex?: number) {
		playClick();
		playOpen();
		panelMode = 'details';
		selectedTaskId = taskId;
		startInVictory = false;
		const task = allTasks.find((t: any) => t.id === taskId);
		if (task) {
			const statusNum = parseInt(String(task.status), 10);
			const targetChapter = chapterIndex !== undefined ? chapterIndex : statusNum;
			selectedChapter = targetChapter;
			const statusStr = String(task.status);
			const isViewingCurrentChapter = String(targetChapter) === statusStr;
			const isViewingFinalChapter =
				isTaskCompleted(task) && targetChapter >= Math.max(0, Number(task.cantidad_de_niveles) - 1);
			const isViewingAbandonedEnding = statusNum === -1;

			if (isViewingCurrentChapter || isViewingFinalChapter || isViewingAbandonedEnding) {
				markTaskViewed(taskId, statusStr);
			}
			if (
				(isViewingFinalChapter || isViewingAbandonedEnding) &&
				!task.isArchived &&
				dismissedTasks[String(taskId)] !== statusStr
			) {
				justViewedFinalTaskId = taskId;
			}
		}
		isPanelOpen = true;
	}

	let activeTasksCount = $derived(
		tasks.filter(
			(t: any) => parseInt(t.status, 10) !== -1 && parseInt(t.status, 10) < t.cantidad_de_niveles - 1
		).length
	);

	function decrementarNiveles() {
		playClick();
		if (newTaskNiveles > 1) newTaskNiveles--;
	}

	function incrementarNiveles() {
		playClick();
		if (newTaskNiveles < 12) newTaskNiveles++;
	}
</script>

<svelte:head>
	<title>Dashboard | Proyectos Narrativos</title>
</svelte:head>

<main class="app-container pt-0 pb-6">


	<Navbar activeView={activeTab} onViewChange={(v) => switchTab(v)} />



	<SlidingPanel bind:isOpen={isPanelOpen} mode={panelMode} taskData={selectedTask} {selectedChapter} {startInVictory}>
		{#if panelMode === 'form'}
			<form
                class="is-scroll"
				method="POST"
				action="?/createTask"
				use:enhance={() => {
					isSubmitting = true;
					errorMessage = null;
					return async ({ update, result }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							playSuccess();
							isPanelOpen = false;
							newTaskTitle = '';
							newTaskTema = 'Espacio';
							newTaskNiveles = 3;
							endDate = '';
							milestones = [];
						} else if (result.type === 'failure') {
							errorMessage = (result.data?.message as string) || 'Error al crear la tarea';
						}
						await update();
					};
				}}
			>
				{#if errorMessage}
					<div class="notification is-danger is-light mb-3">
						{errorMessage}
					</div>
				{/if}

				<div class="field mb-3-mobile mb-3-desktop">
					<label
						class="label"
						for="taskTitle"
						style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;"
						>Título del proyecto</label
					>
					<div class="control">
						<input
							class="input"
							type="text"
							name="title"
							id="taskTitle"
							bind:value={newTaskTitle}
							placeholder="Ej: Levantar 70Kg en el gimnasio"
							required
							disabled={isSubmitting}
							style="background: rgba(0, 0, 0, 0.25); border: 1px solid var(--card-border); color: white; border-radius: 14px; padding: 12px 16px; font-family: inherit;"
						/>
					</div>
				</div>

				<div class="field mb-3-mobile mb-3-desktop">
					<label
						class="label"
						for="taskTema"
						style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;"
						>Temática Narrativa</label
					>
					<div class="control select is-fullwidth" style="width: 100%;">
						<select
							name="tema"
							id="taskTema"
							bind:value={newTaskTema}
							disabled={isSubmitting}
							style="background: #142127; border: 1px solid var(--card-border); color: white; border-radius: 14px; padding: 2px 16px; width: 100%; font-family: inherit;"
						>
							<option value="" disabled selected>Selecciona una temática...</option>
							{#each tematicasAgrupadas as categoria}
								<optgroup label={categoria.grupo}>
									{#each categoria.opciones as opcion}
										<option value={opcion.valor}>{opcion.etiqueta}</option>
									{/each}
								</optgroup>
							{/each}
						</select>
					</div>
				</div>

				<div class="field mb-3-mobile mb-3-desktop">
					<label
						class="label mb-0 pb-0"
						for="taskNiveles"
						style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;"
						>Número de Capítulos / Niveles</label
					>
					<small style="color: var(--text-muted); font-size: 0.75rem; display: block; margin-bottom: 6px;"
						>Fragmentos en los que se divide tu proyecto</small
					>
					<div class="control flex justify-center">
						<div class="number-spinner-pill" class:is-submitting={isSubmitting}>
							<button
								type="button"
								class="spinner-btn"
								onclick={decrementarNiveles}
								disabled={newTaskNiveles <= 1 || isSubmitting}
								aria-label="Disminuir niveles"
							>
								<svg
									width="22"
									height="22"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="3"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<polyline points="15 18 9 12 15 6"></polyline>
								</svg>
							</button>

							<input
								class="spinner-input is-small"
								type="number"
								name="cantidad_de_niveles"
								id="taskNiveles"
								bind:value={newTaskNiveles}
								min="1"
								max="12"
								required
								readonly
							/>

							<button
								type="button"
								class="spinner-btn"
								onclick={incrementarNiveles}
								disabled={newTaskNiveles >= 12 || isSubmitting}
								aria-label="Aumentar niveles"
							>
								<svg
									width="22"
									height="22"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="3"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<polyline points="9 18 15 12 9 6"></polyline>
								</svg>
							</button>
						</div>
					</div>
				</div>

				<div class="field mb-3-mobile mb-3-desktop">
					<label
						class="label"
						for="projectEndDate"
						style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;"
					>
						Fecha y Hora Objetivo (Final)
					</label>
					<div class="control">
						<input
							class="input"
							type="datetime-local"
							id="projectEndDate"
							name="endDate"
							bind:value={endDate}
							disabled={isSubmitting}
							style="background: rgba(0, 0, 0, 0.25); border: 1px solid var(--card-border); color: white; border-radius: 14px; padding: 12px 16px; font-family: inherit;"
						/>
					</div>
				</div>

				{#if milestones.length > 0}
					<div
						class="container mb-3 p-4"
						style="background: rgba(14, 23, 29, 0.7); border: 1px solid var(--card-border); border-radius: 14px;"
					>
						<p class="is-size-7 has-text-weight-bold has-text-primary mb-3" style="text-transform: uppercase; letter-spacing: 0.05em;">
							⏱️ Línea de Tiempo de Capítulos
						</p>
						<div class="is-flex is-flex-direction-column" style="gap: 0.85rem;">
							<!-- Nodo Inicial Fijo -->
							<div class="is-flex is-align-items-center is-inline">
								<span class="tag is-success mr-2" style="font-size: 0.75rem;">Inicio</span>
								<span class="is-size-7 has-text-grey-light">Creación (Ahora)</span>
							</div>

							<!-- Nodos Intermedios Editables -->
							{#each milestones as _, i}
								{#if i < milestones.length - 1}
									<div class="field is-flex is-align-items-center mb-0" style="gap: 0.5rem;">
										<div class="field-label is-small" style="text-align: left; flex-grow: 1;">
											<span class="tag is-info is-light is-inline" style="font-size: 0.72rem;">Capítulo {i + 1}</span>
										</div>
										<div class="field-body is-inline" style="flex-grow: 3;">
											<div class="control" style="width: 80%;">
												<input
													class="input is-small"
													type="datetime-local"
													bind:value={milestones[i]}
													disabled={isSubmitting}
													style="background: rgba(0, 0, 0, 0.35); border: 1px solid var(--card-border); color: white; border-radius: 8px; font-family: inherit;"
												/>
											</div>
										</div>
									</div>
								{/if}
							{/each}

							<!-- Nodo Final Fijo -->
							<div class="is-flex is-align-items-center">
								<span class="tag is-danger mr-2" style="font-size: 0.75rem;">Final</span>
								<span class="is-size-7 has-text-white">{endDate.replace('T', ' ')}</span>
							</div>
						</div>
					</div>

					<input type="hidden" name="milestones" value={JSON.stringify(milestones)} />
				{/if}
				<input class="is-hidden" type="text" value="{data?.user?.nombre_de_usuario}" name="nombredeusuario" />

				<Motion
					whileHover={!isSubmitting ? { scale: 1.02 } : {}}
					whileTap={!isSubmitting ? { scale: 0.98 } : {}}
					let:motion
				>
					<section class="section is-flex is-justify-content-center is-align-items-center mt-0 pt-0 pb-2 mb-6">
						<button
							use:motion
							class="button btn-primary mb-6-is-desktom is-small"
							style="width: 70%; margin-top: 1.5rem;"
							type="submit"
							disabled={isSubmitting}
							onclick={playClick}
						>
							{isSubmitting ? 'Generando Historia...' : 'Guardar y Generar'}
						</button>
					</section>
				</Motion>
			</form>
		{/if}
	</SlidingPanel>

	{#if data.user}
		{#if activeTab !== 'bitacora'}
			<Estadistic datas={data} tasks={allTasks} />
		{/if}

		{#if activeTab === 'dashboard'}
			<div class="tab-view-stage" in:fly={{ y: 18, duration: 320, easing: cubicOut }}>
				<!-- ===== SECCIÓN PROYECTOS ACTIVOS ===== -->
				<div class="is-flex is-justify-content-space-between is-align-items-center mb-3 section-head">
					<h2 class="has-text-weight-bold has-text-white" style="font-size: 1.15rem; margin: 0;">
						Mis Proyectos
					</h2>
					<span class="badge-pill">{activeTasksCount} {activeTasksCount === 1 ? 'activa' : 'activas'}</span>
				</div>

				{#if tasks.length > 0}
					<div>
						{#each tasks as Task (Task.id)}
							<CardTask
								task={Task}
								hasViewed={viewedTasks[String(Task.id)] !== undefined &&
									String(viewedTasks[String(Task.id)]) === String(Task.status)}
								isFadingOut={Boolean(fadingTasks[String(Task.id)])}
								onSelect={(chapterIdx) => openTaskDetails(Task.id, chapterIdx)}
								onVictory={() => openVictory(Task.id)}
							/>
						{/each}
					</div>
				{:else}
					<div class="glass-panel has-text-centered py-6 px-4 mb-4">
						<p class="has-text-grey-light mb-3">Aún no tienes proyectos activos.</p>
						<Motion whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} let:motion>
							<button
								use:motion
								class="btn-primary"
								style="margin: 0 auto;"
								onclick={openCreateForm}
							>
								Crear tu primer proyecto
							</button>
						</Motion>
					</div>
				{/if}
			</div>

		{:else if activeTab === 'victoria'}
			<div class="tab-view-stage" in:fly={{ y: 18, duration: 320, easing: cubicOut }}>
				<!-- ===== SALÓN DE LA VICTORIA ===== -->
				<div class="is-flex is-justify-content-space-between is-align-items-center mb-3 section-head">
					<h2 class="has-text-weight-bold has-text-white" style="font-size: 1.35rem; margin: 0;">
						🏆 Salón de la Victoria
					</h2>
					<span class="badge-pill">{victoryTasks.length} {victoryTasks.length === 1 ? 'victoria' : 'victorias'}</span>
				</div>

				{#if victoryTasks.length > 0}
					<p style="color: var(--text-muted); font-size: 0.82rem; margin-bottom: 16px;">
						Misiones completadas al 100%. Revive la bitácora de tu viaje o relee la crónica completa.
					</p>
					<div>
						{#each victoryTasks as Task (Task.id)}
							<CardTask
								task={Task}
								hasViewed={true}
								onSelect={() => openVictory(Task.id)}
								onVictory={() => openVictory(Task.id)}
							/>
						{/each}
					</div>
				{:else}
					<div class="glass-panel has-text-centered py-6 px-4 mb-4">
						<div style="font-size: 2.5rem; margin-bottom: 12px;">🏆</div>
						<p class="has-text-grey-light mb-2" style="font-weight: 600;">El Salón de la Victoria está vacío</p>
						<p class="has-text-grey-light" style="font-size: 0.85rem;">
							Completa un proyecto al 100% para verlo aquí.
						</p>
					</div>
				{/if}
			</div>

		{:else if activeTab === 'bitacora'}
			<div class="tab-view-stage" in:fly={{ y: 18, duration: 320, easing: cubicOut }}>
				<!-- ===== BITÁCORA DE DESBLOQUEO ===== -->
				<div class="is-flex is-justify-content-space-between is-align-items-center mb-3 section-head">
					<h2 class="has-text-weight-bold has-text-white" style="font-size: 1.28rem; margin: 0;">
						📸 Bitácora de Desbloqueo
					</h2>
					<span class="badge-pill">{globalLogs.length} {globalLogs.length === 1 ? 'registro' : 'registros'}</span>
				</div>

				<SoundEngine effect="victory-gold" mood="victory" active={activeTab === 'bitacora'}>
					{#snippet controls()}
						<span class="bitacora-audio-tag">🏆 Música de Victoria</span>
					{/snippet}

					{#if logsLoading}
						<div class="glass-panel has-text-centered py-6 px-4 mb-4">
							<p class="has-text-grey-light">Cargando tu bitácora de desbloqueo…</p>
						</div>
					{:else if logsError}
						<div class="glass-panel has-text-centered py-6 px-4 mb-4">
							<p class="has-text-danger">{logsError}</p>
						</div>
					{:else if bitacoraTaskGroups.length === 0}
						<div class="glass-panel has-text-centered py-6 px-4 mb-4">
							<div style="font-size: 2.5rem; margin-bottom: 12px;">📓</div>
							<p class="has-text-grey-light mb-2" style="font-weight: 600;">Tu bitácora de desbloqueo está en blanco</p>
							<p class="has-text-grey-light" style="font-size: 0.85rem;">
								Cada foto y mensaje que dejes al desbloquear un capítulo aparecerá aquí.
							</p>
						</div>
					{:else}
						{#if bitacoraTaskGroups.length > 1}
							<div class="bitacora-task-pills mb-3" role="tablist" aria-label="Filtrar bitácora por proyecto">
								{#each bitacoraTaskGroups as group (group.id)}
									<button
										type="button"
										role="tab"
										aria-selected={activeBitacoraGroup?.id === group.id}
										class="bitacora-task-pill"
										class:active={activeBitacoraGroup?.id === group.id}
										onclick={() => selectBitacoraTask(group.id)}
									>
										<span>{group.title}</span>
										<small>{group.logs.length}</small>
									</button>
								{/each}
							</div>
						{/if}

						{#if activeBitacoraGroup && activeBitacoraSlide}
							<div
								class="glass-panel log-feed-card bitacora-slider-card mb-4"
								role="region"
								aria-label="Slider vertical de Bitácora de Desbloqueo"
								onmouseenter={() => (bitacoraPaused = true)}
								onmouseleave={() => (bitacoraPaused = false)}
								onwheel={handleBitacoraWheel}
								ontouchstart={handleBitacoraTouchStart}
								ontouchend={handleBitacoraTouchEnd}
							>
								<div class="is-flex is-justify-content-space-between is-align-items-flex-start mb-3">
									<div>
										<h3 class="has-text-weight-bold has-text-white is-capitalized" style="font-size: 1.08rem; margin: 0;">
											{activeBitacoraGroup.title}
										</h3>
										{#if activeBitacoraGroup.tema}
											<span style="color: var(--text-muted); font-size: 0.78rem;">{activeBitacoraGroup.tema}</span>
										{/if}
									</div>
									<span class="tag is-warning is-light">
										{bitacoraSlideIdx + 1} / {currentBitacoraLogs.length}
									</span>
								</div>

								<div class="bitacora-vertical-shell">
									<div class="bitacora-vertical-viewport">
										{#key `${activeBitacoraGroup.id}-${activeBitacoraSlide.id ?? bitacoraSlideIdx}`}
											<article class="bitacora-vertical-slide" in:fade={{ duration: 600 }}>
												{#if activeBitacoraSlide.media_url}
													<button
														type="button"
														class="log-feed-img-btn mb-3"
														aria-label="Expandir imagen"
														onclick={() => {
															playClick();
															playOpen();
															expandedImage = activeBitacoraSlide.media_url;
														}}
													>
														<img
															class="bitacora-ken-burns"
															src={activeBitacoraSlide.media_url}
															alt="Evidencia del capítulo {Number(activeBitacoraSlide.level) + 1}"
															loading="lazy"
														/>
														<span class="log-feed-expand">⤢ Expandir</span>
													</button>
												{:else}
													<div class="bitacora-media-fallback mb-3" aria-hidden="true">🏆</div>
												{/if}

												<div class="is-flex is-justify-content-space-between is-align-items-center mb-2">
													<span class="tag is-warning is-light">
														🔓 Capítulo {Number(activeBitacoraSlide.level) + 1} desbloqueado
													</span>
													<time style="color: var(--accent-primary); font-size: 0.75rem; font-weight: 600;">
														{formatLogDate(activeBitacoraSlide.created_at)}
													</time>
												</div>

												<p class="log-feed-text mt-2">{activeBitacoraSlide.log_text}</p>
											</article>
										{/key}
									</div>

									{#if currentBitacoraLogs.length > 1}
										<div class="bitacora-vertical-rail">
											<button
												type="button"
												class="bitacora-rail-btn"
												aria-label="Capítulo anterior"
												onclick={() => shiftBitacoraSlide(-1, true)}
											>
												▲
											</button>
											<div class="bitacora-vertical-dots">
												{#each currentBitacoraLogs as logItem, i}
													<button
														type="button"
														class="bitacora-vertical-dot"
														class:active={i === bitacoraSlideIdx}
														title="Capítulo {Number(logItem.level) + 1}"
														aria-label="Ir al capítulo {Number(logItem.level) + 1}"
														onclick={() => selectBitacoraSlide(i)}
													></button>
												{/each}
											</div>
											<button
												type="button"
												class="bitacora-rail-btn"
												aria-label="Capítulo siguiente"
												onclick={() => shiftBitacoraSlide(1, true)}
											>
												▼
											</button>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					{/if}
				</SoundEngine>

				{#if expandedImage}
					<div class="modal is-active" style="z-index: 2000;">
						<div
							class="modal-background"
							role="presentation"
							transition:fade={{ duration: 200 }}
							onclick={() => {
								playClose();
								expandedImage = null;
							}}
						></div>
						<div class="modal-content" transition:fly={{ y: 24, duration: 280, easing: cubicOut }}>
							<img src={expandedImage} alt="Evidencia ampliada" style="border-radius: 16px; width: 100%;" />
						</div>
						<button
							class="modal-close is-large"
							aria-label="Cerrar"
							onclick={() => {
								playClose();
								expandedImage = null;
							}}
						></button>
					</div>
				{/if}
			</div>

		{:else if activeTab === 'archivo'}
			<div class="tab-view-stage" in:fly={{ y: 18, duration: 320, easing: cubicOut }}>
				<!-- ===== ARCHIVO: RETIRADAS TÁCTICAS ===== -->
				<div class="is-flex is-justify-content-space-between is-align-items-center mb-3 section-head">
					<h2 class="has-text-weight-bold has-text-white" style="font-size: 1.35rem; margin: 0;">
						⛺ Retiradas Tácticas
					</h2>
					<span class="badge-pill" style="background: rgba(154,166,173,0.35); color: #ccc;">
						{retreatTasks.length} {retreatTasks.length === 1 ? 'misión' : 'misiones'}
					</span>
				</div>

				{#if retreatTasks.length > 0}
					<p style="color: var(--text-muted); font-size: 0.82rem; margin-bottom: 16px;">
						Misiones abandonadas. Lee su capítulo de retirada, reinícialas o elimínalas.
					</p>
					<div>
						{#each retreatTasks as Task (Task.id)}
							<CardTask
								task={Task}
								hasViewed={true}
								onSelect={(chapterIdx) => openTaskDetails(Task.id, chapterIdx)}
							/>
						{/each}
					</div>
				{:else}
					<div class="glass-panel has-text-centered py-6 px-4 mb-4">
						<div style="font-size: 2.5rem; margin-bottom: 12px;">⛺</div>
						<p class="has-text-grey-light mb-2" style="font-weight: 600;">No hay retiradas tácticas</p>
						<p class="has-text-grey-light" style="font-size: 0.85rem;">
							Las misiones abandonadas aparecerán aquí.
						</p>
					</div>
				{/if}
			</div>

		{:else if activeTab === 'ajustes'}
			<div class="tab-view-stage" in:fly={{ y: 18, duration: 320, easing: cubicOut }}>
				<!-- ===== SECCIÓN AJUSTES ===== -->
				<div class="is-flex is-justify-content-space-between is-align-items-center mb-3 section-head">
					<h2 class="has-text-weight-bold has-text-white" style="font-size: 1.35rem; margin: 0;">
						⚙️ Ajustes
					</h2>
					<span class="badge-pill" style="background: rgba(25, 212, 168, 0.15); color: var(--accent-primary); border: 1px solid rgba(25, 212, 168, 0.3);">
						Perfil y Cuenta
					</span>
				</div>

				<p style="color: var(--text-muted); font-size: 0.82rem; margin-bottom: 16px;">
					Administra tu avatar, información de cuenta y compañero aliado para las historias narrativas.
				</p>

				<SeccionAjustes user={data.user} />
			</div>
		{/if}

		<!-- ===== BOTTOM NAV ===== -->
		<nav class="bottom-nav">
			<!-- Dashboard -->
			<button
				class="nav-item {activeTab === 'dashboard' ? 'active' : ''}"
				onclick={() => switchTab('dashboard')}
				aria-label="Dashboard"
			>
				<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
					<path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
				</svg>
				<span>Dashboard</span>
			</button>

			<!-- Victoria -->
			<button
				class="nav-item {activeTab === 'victoria' ? 'active' : ''}"
				onclick={() => switchTab('victoria')}
				aria-label="Victoria"
				style="position: relative;"
			>
				<svg
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
					<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
					<path d="M4 22h16"></path>
					<path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
					<path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
					<path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
				</svg>
				<span>Victoria</span>
				{#if victoryTasks.length > 0}
					<span class="nav-badge">{victoryTasks.length}</span>
				{/if}
			</button>

			<!-- FAB crear -->
			<button class="fab" onclick={openCreateForm} aria-label="Nueva Tarea">+</button>

			<!-- Archivo (reemplaza Calendario) -->
			<button
				class="nav-item {activeTab === 'archivo' ? 'active' : ''}"
				onclick={() => switchTab('archivo')}
				aria-label="Archivo (Retiradas)"
				style="position: relative;"
			>
				<svg
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polyline points="21 8 21 21 3 21 3 8"></polyline>
					<rect x="1" y="3" width="22" height="5"></rect>
					<line x1="10" y1="12" x2="14" y2="12"></line>
				</svg>
				<span>Retiradas</span>
				{#if retreatTasks.length > 0}
					<span class="nav-badge">{retreatTasks.length}</span>
				{/if}
			</button>

			<!-- Ajustes -->
			<button
				class="nav-item {activeTab === 'ajustes' ? 'active' : ''}"
				onclick={() => switchTab('ajustes')}
				aria-label="Ajustes"
			>
				<svg
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="3"></circle>
					<path
						d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
					></path>
				</svg>
				<span>Ajustes</span>
			</button>
		</nav>
	{:else}
		<div class="glass-panel has-text-centered p-5">
			<p>No se encontraron datos de usuario.</p>
		</div>
	{/if}
</main>

<style>

.is-scroll{
   overflow-y: auto; /* Muestra la barra de scroll vertical solo si hace falta */
   max-height: 600px; /* Debes definir un límite de altura. Ajusta este valor a lo que necesites */
   padding-bottom: 1px;
   margin-bottom: 1px;
}

input[type='text'] {
	background: rgba(0, 0, 0, 0.25);
	border: 1px solid var(--card-border);
	color: white;
	border-radius: 14px;
	padding: 12px 16px;
	font-family: inherit;
	width: 100%;
}

input[type='text']:focus {
	outline: none;
	border-color: #00e5ff;
	box-shadow: 0 0 5px rgba(0, 229, 255, 0.5);
}

input[type='text']::placeholder {
	color: #b0b0b0;
	font-style: italic;
}

select {
	background: #142127;
	border: 1px solid var(--card-border);
	color: white;
	border-radius: 14px;
	padding: 2px 16px;
	width: 100%;
	font-family: inherit;
}

select:focus {
	outline: none;
	border-color: #00e5ff;
	box-shadow: 0 0 5px rgba(0, 229, 255, 0.5);
}

select option {
	background: #142127;
	color: white;
}

select optgroup {
	font-weight: bold;
	color: #00e5ff;
}

select optgroup option {
	font-weight: normal;
	color: white;
	font-style: normal;
	font-size: 0.9rem;
}

select:disabled {
	background: #0d1317;
	color: #555;
	cursor: not-allowed;
}

/* Spinner de niveles */
.number-spinner-pill {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background-color: #0d1317;
	border: 1px solid #ffffff;
	border-radius: 9999px;
	padding: 1px 1px;
	width: 300px;
	margin: 0 auto;
	box-shadow: 0 15px 25px rgba(0, 0, 0, 0.4);
	transition: opacity 0.3s ease;
}

.number-spinner-pill.is-submitting {
	opacity: 0.5;
	pointer-events: none;
}

.spinner-btn {
	background: transparent;
	border: none;
	color: #ffffff;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 10px;
	transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), color 0.2s;
}

.spinner-btn:not(:disabled):hover {
	transform: scale(1.2);
	color: #00e5ff;
}

.spinner-btn:not(:disabled):active {
	transform: scale(0.9);
}

.spinner-btn:disabled {
	opacity: 0.2;
	cursor: not-allowed;
}

.spinner-input {
	background: transparent;
	border: none;
	outline: none;
	color: #00e5ff;
	font-family: inherit;
	font-size: 1rem;
	font-weight: 800;
	text-align: center;
	width: 90px;
	pointer-events: none;
	height: 1%;
}

.spinner-input::-webkit-outer-spin-button,
.spinner-input::-webkit-inner-spin-button {
	-webkit-appearance: none;
	margin: 0;
}

.spinner-input[type='number'] {
	-moz-appearance: textfield;
	appearance: textfield;
}

/* Badge contador en nav item Archivo */
.nav-badge {
	position: absolute;
	top: 2px;
	right: 8px;
	background: var(--accent-primary);
	color: #062b22;
	border-radius: 999px;
	font-size: 0.62rem;
	font-weight: 800;
	min-width: 16px;
	height: 16px;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 4px;
}

/* Botones del nav como botones reales */
:global(.bottom-nav button.nav-item) {
	background: transparent;
	border: none;
	cursor: pointer;
	color: var(--text-muted);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0;
	font-size: 0.68rem;
	text-decoration: none;
	padding: 0;
	position: relative;
}

:global(.bottom-nav button.nav-item.active) {
	color: var(--accent-primary);
}



@media (min-width: 768px) {

	.bottom-nav {

		display: flex;
		justify-content: space-around;
		align-items: center;
		position: fixed;
		bottom: 0;
		left: 25%;
		width: 50%;
		background-color: rgba(20, 33, 39, 0.95);
		backdrop-filter: blur(10px);
		padding: 8px 0;
		border-top: 1px solid var(--card-border);
		z-index: 1000;
	}

}




	.bitacora-audio-tag {
		font-size: 0.76rem;
		font-weight: 700;
		color: #ffd670;
		background: rgba(255, 214, 112, 0.12);
		border: 1px solid rgba(255, 214, 112, 0.35);
		padding: 4px 10px;
		border-radius: 999px;
	}

	.bitacora-task-pills {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		padding-bottom: 4px;
		scrollbar-width: none;
	}

	.bitacora-task-pills::-webkit-scrollbar {
		display: none;
	}

	.bitacora-task-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.28);
		border: 1px solid var(--card-border);
		color: var(--text-muted);
		font-size: 0.78rem;
		font-weight: 600;
		white-space: nowrap;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.bitacora-task-pill.active {
		background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
		border-color: var(--accent-primary);
		color: #fff;
		box-shadow: 0 0 12px var(--accent-glow);
	}

	.bitacora-task-pill small {
		background: rgba(255, 255, 255, 0.14);
		border-radius: 999px;
		padding: 1px 6px;
		font-size: 0.68rem;
	}

	.bitacora-slider-card {
		padding: 16px;
	}

	.bitacora-vertical-shell {
		display: flex;
		align-items: stretch;
		gap: 10px;
	}

	.bitacora-vertical-viewport {
		flex: 1;
		min-width: 0;
	}

	.bitacora-vertical-slide {
		animation: bitacora-vertical-fade 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes bitacora-vertical-fade {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.bitacora-ken-burns {
		animation: bitacora-ken-burns 9s ease-in-out infinite alternate;
		transform-origin: center;
	}

	@keyframes bitacora-ken-burns {
		from {
			transform: scale(1) translate(0, 0);
		}
		to {
			transform: scale(1.12) translate(-1.5%, -1.5%);
		}
	}

	.bitacora-media-fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		border-radius: 16px;
		border: 1px solid rgba(255, 214, 112, 0.32);
		font-size: 3.5rem;
		background: radial-gradient(circle at 50% 40%, rgba(255, 214, 112, 0.25), rgba(15, 23, 26, 0.9));
	}

	.bitacora-vertical-rail {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.bitacora-rail-btn {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1px solid rgba(255, 214, 112, 0.4);
		background: rgba(255, 255, 255, 0.08);
		color: #ffd670;
		font-size: 0.68rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.bitacora-vertical-dots {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}

	.bitacora-vertical-dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		border: none;
		padding: 0;
		background: rgba(255, 255, 255, 0.28);
		cursor: pointer;
		transition: all 0.25s ease;
	}

	.bitacora-vertical-dot.active {
		height: 20px;
		background: #ffd670;
		box-shadow: 0 0 8px rgba(255, 214, 112, 0.8);
	}

	:global(.log-feed-card) {
		padding: 16px;
	}
	.log-feed-text {
		color: var(--text-main);
		font-size: 0.92rem;
		line-height: 1.6;
		white-space: pre-wrap;
	}
	.log-feed-img-btn {
		position: relative;
		display: block;
		width: 100%;
		padding: 0;
		border: 1px solid var(--card-border);
		border-radius: 16px;
		overflow: hidden;
		background: none;
		cursor: zoom-in;
	}
	.log-feed-img-btn img {
		display: block;
		width: 100%;
		max-height: 280px;
		object-fit: cover;
	}
	.log-feed-expand {
		position: absolute;
		right: 10px;
		bottom: 10px;
		padding: 3px 10px;
		border-radius: 999px;
		font-size: 0.72rem;
		color: #fff;
		background: rgba(0, 0, 0, 0.6);
	}
</style>
