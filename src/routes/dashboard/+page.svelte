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
	import Narrador from '$lib/components/Narrador.svelte';
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

	// Bitácora (Créditos de Película con resumen total de actividad + discurso Gemini)
	let globalLogs = $state<any[]>([]);
	let logsLoading = $state(false);
	let logsError = $state<string | null>(null);
	let expandedImage = $state<string | null>(null);

	interface CreditsProjectItem {
		order: number;
		id: number;
		title: string;
		tema: string;
		cantidad_de_niveles: number;
		status: string;
		isArchived: boolean;
		createdAt: string | null;
		outcome: 'victory' | 'retreat' | 'active';
		statusLabel: string;
		levelsCount: number;
		logs: any[];
	}

	interface CreditsPayload {
		userProfile: {
			nombre_de_usuario: string;
			aliados: string | null;
			createdAt: string | null;
		};
		creditsProjects: CreditsProjectItem[];
		stats: {
			totalProjects: number;
			victories: number;
			retreats: number;
			active: number;
			totalLogs: number;
			totalPhotos: number;
		};
		motivationalSpeech: string;
	}

	let creditsData = $state<CreditsPayload | null>(null);
	let creditsPaused = $state(false);
	let creditsHoverPaused = $state(false);
	let creditsRollKey = $state(0);
	let creditsSpeechKey = $state('credits-0');
	let creditsViewportEl = $state<HTMLDivElement | null>(null);
	let creditsFloatScroll = 0;

	function hashSpeech(str: string): string {
		let hash = 5381;
		for (let i = 0; i < str.length; i++) {
			hash = (hash * 33) ^ str.charCodeAt(i);
		}
		return `credits-${(hash >>> 0).toString(36)}`;
	}

	async function loadBitacoraCredits(forceRegenerate = false) {
		logsLoading = true;
		logsError = null;
		try {
			const query = forceRegenerate
				? `/api/project-logs?mode=credits&t=${Date.now()}`
				: '/api/project-logs?mode=credits';
			const res = await fetch(query);
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}
			const payload = await res.json();
			const speech = String(payload?.motivationalSpeech || '');

			creditsData = {
				userProfile: payload?.userProfile ?? {
					nombre_de_usuario: data?.user?.nombre_de_usuario || 'Héroe',
					aliados: data?.user?.aliados || null,
					createdAt: null
				},
				creditsProjects: Array.isArray(payload?.creditsProjects) ? payload.creditsProjects : [],
				stats: payload?.stats ?? {
					totalProjects: 0,
					victories: 0,
					retreats: 0,
					active: 0,
					totalLogs: 0,
					totalPhotos: 0
				},
				motivationalSpeech: speech
			};
			globalLogs = Array.isArray(payload?.logs) ? payload.logs : [];
			creditsSpeechKey = hashSpeech(speech);
			creditsPaused = false;
			creditsRollKey++;
			creditsFloatScroll = 0;
			if (creditsViewportEl) {
				creditsViewportEl.scrollTop = 0;
			}
		} catch (err) {
			console.error('Error al cargar la bitácora de créditos:', err);
			logsError = 'No se pudo generar la bitácora cinematográfica de tu actividad.';
			creditsData = null;
			globalLogs = [];
		} finally {
			logsLoading = false;
		}
	}

	function toggleCreditsPause() {
		playClick();
		creditsPaused = !creditsPaused;
	}

	function restartCreditsRoll() {
		playClick();
		playSlide();
		creditsPaused = false;
		creditsFloatScroll = 0;
		if (creditsViewportEl) {
			creditsViewportEl.scrollTop = 0;
		}
		creditsRollKey++;
	}

	function handleCreditsScroll() {
		if (!creditsViewportEl) return;
		if (Math.abs(creditsViewportEl.scrollTop - creditsFloatScroll) > 4) {
			creditsFloatScroll = creditsViewportEl.scrollTop;
		}
	}

	$effect(() => {
		if (activeTab === 'bitacora') {
			void allTasks.length;
			untrack(() => loadBitacoraCredits());
		}
	});

	// Desplazamiento continuo estilo créditos de película
	$effect(() => {
		if (
			activeTab !== 'bitacora' ||
			!creditsData ||
			creditsPaused ||
			creditsHoverPaused ||
			expandedImage !== null ||
			!creditsViewportEl
		) {
			return;
		}

		void creditsRollKey;
		const el = creditsViewportEl;
		creditsFloatScroll = el.scrollTop;
		let rafId = 0;
		let lastTime = performance.now();

		const tick = (now: number) => {
			const dt = Math.min(0.1, (now - lastTime) / 1000);
			lastTime = now;

			const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
			if (maxScroll > 0) {
				if (el.scrollTop < maxScroll - 1) {
					creditsFloatScroll = Math.min(maxScroll, creditsFloatScroll + dt * 34);
					el.scrollTop = creditsFloatScroll;
				}
			}
			rafId = requestAnimationFrame(tick);
		};

		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
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
				<!-- ===== BITÁCORA CINEMATOGRÁFICA: CRÉDITOS DE ACTIVIDAD ===== -->
				<div class="is-flex is-justify-content-space-between is-align-items-center mb-3 section-head">
					<h2 class="has-text-weight-bold has-text-white" style="font-size: 1.28rem; margin: 0;">
						🎬 Bitácora · Créditos de Tu Viaje
					</h2>
					<span class="badge-pill">
						{creditsData?.stats.totalProjects ?? allTasks.length} {(creditsData?.stats.totalProjects ?? allTasks.length) === 1 ? 'proyecto' : 'proyectos'}
					</span>
				</div>

				<SoundEngine effect="victory-gold" mood="victory" active={activeTab === 'bitacora'}>
					{#snippet controls()}
						<div class="credits-audio-controls">
							{#if creditsData?.motivationalSpeech}
								{#key creditsSpeechKey}
									<Narrador
										text={creditsData.motivationalSpeech}
										active={activeTab === 'bitacora' && Boolean(creditsData?.motivationalSpeech)}
										autoPlay={true}
										taskId="bitacora-credits"
										chapterKey={creditsSpeechKey}
									/>
								{/key}
							{/if}
							<span class="credits-music-pill">🏆 Música de Victoria</span>
						</div>
					{/snippet}

					{#if logsLoading}
						<div class="glass-panel movie-credits-loading has-text-centered py-6 px-4 mb-4">
							<div class="credits-reel-badge mb-3">🎞️</div>
							<p class="has-text-white mb-1" style="font-weight: 700;">
								Preparando los créditos de tu historia…
							</p>
							<p class="has-text-grey-light" style="font-size: 0.84rem;">
								Importando tus misiones, bitácoras y componiendo el discurso del narrador con IA.
							</p>
						</div>
					{:else if logsError}
						<div class="glass-panel has-text-centered py-6 px-4 mb-4">
							<p class="has-text-danger mb-3">{logsError}</p>
							<button
								type="button"
								class="btn-primary"
								style="margin: 0 auto;"
								onclick={() => {
									playClick();
									loadBitacoraCredits(true);
								}}
							>
								Reintentar
							</button>
						</div>
					{:else if creditsData}
						<div class="credits-toolbar mb-3">
							<button
								type="button"
								class="credits-ctrl-btn"
								onclick={toggleCreditsPause}
							>
								{creditsPaused ? '▶ Reanudar créditos' : '⏸ Pausar créditos'}
							</button>
							<button
								type="button"
								class="credits-ctrl-btn"
								onclick={restartCreditsRoll}
							>
								↺ Reiniciar rollo
							</button>
							<button
								type="button"
								class="credits-ctrl-btn is-gold"
								onclick={() => {
									playClick();
									loadBitacoraCredits(true);
								}}
							>
								✨ Nuevo discurso IA
							</button>
						</div>

						<div
							class="movie-credits-screen mb-4"
							role="region"
							aria-label="Créditos cinematográficos de actividad del usuario"
							onmouseenter={() => (creditsHoverPaused = true)}
							onmouseleave={() => (creditsHoverPaused = false)}
						>
							<div class="movie-credits-stars" aria-hidden="true"></div>
							{#key creditsRollKey}
								<div
									class="movie-credits-viewport"
									bind:this={creditsViewportEl}
									onscroll={handleCreditsScroll}
								>
									<div class="movie-credits-reel">
										<!-- 1. APERTURA CINEMATOGRÁFICA -->
										<header class="credits-opening">
											<span class="credits-eyebrow">UNA PRODUCCIÓN DE RESILIENCIA Y CORAJE</span>
											<h3 class="credits-hero-name">{creditsData.userProfile.nombre_de_usuario}</h3>
											{#if creditsData.userProfile.aliados}
												<p class="credits-ally-line">
													EN COMPAÑÍA DE <strong>{creditsData.userProfile.aliados}</strong>
												</p>
											{/if}
											<div class="credits-divider" aria-hidden="true">─── ✦ ───</div>

											<blockquote class="credits-speech-card">
												<span class="credits-speech-label">🎙️ PALABRAS DEL NARRADOR</span>
												<p class="credits-speech-text">{creditsData.motivationalSpeech}</p>
											</blockquote>
										</header>

										<!-- 2. BALANCE DE ACTIVIDAD -->
										<section class="credits-cast-summary">
											<span class="credits-section-kicker">REPARTO DE ESFUERZO Y LOGROS</span>
											<div class="credits-stats-grid">
												<div class="credits-stat-item">
													<span class="credits-stat-num">{creditsData.stats.totalProjects}</span>
													<span class="credits-stat-lbl">Proyectos</span>
												</div>
												<div class="credits-stat-item is-victory">
													<span class="credits-stat-num">{creditsData.stats.victories}</span>
													<span class="credits-stat-lbl">Victorias 🏆</span>
												</div>
												<div class="credits-stat-item">
													<span class="credits-stat-num">{creditsData.stats.active}</span>
													<span class="credits-stat-lbl">En Curso ⚔️</span>
												</div>
												<div class="credits-stat-item is-retreat">
													<span class="credits-stat-num">{creditsData.stats.retreats}</span>
													<span class="credits-stat-lbl">Retiradas ⛺</span>
												</div>
												<div class="credits-stat-item">
													<span class="credits-stat-num">{creditsData.stats.totalLogs}</span>
													<span class="credits-stat-lbl">Desbloqueos 🔓</span>
												</div>
												<div class="credits-stat-item">
													<span class="credits-stat-num">{creditsData.stats.totalPhotos}</span>
													<span class="credits-stat-lbl">Memorias 📸</span>
												</div>
											</div>
										</section>

										<div class="credits-divider" aria-hidden="true">─── ❖ ───</div>

										<!-- 3. CRÓNICA COMPLETA DEL PRIMER PROYECTO AL ÚLTIMO -->
										<section class="credits-chronicle">
											<span class="credits-section-kicker">
												HISTORIAL COMPLETO · DEL PRIMER PASO AL ÚLTIMO
											</span>

											{#if creditsData.creditsProjects.length === 0}
												<div class="credits-empty-block">
													<p>Aún no has iniciado proyectos, pero cada gran película espera su primera escena.</p>
												</div>
											{:else}
												{#each creditsData.creditsProjects as proj (proj.id)}
													<article class="credits-project-block outcome-{proj.outcome}">
														<div class="credits-project-meta">
															<span class="credits-episode">EPISODIO {proj.order}</span>
															<span class="credits-theme-tag">{proj.tema}</span>
														</div>

														<h4 class="credits-project-title">{proj.title}</h4>

														<div class="credits-outcome-badge outcome-{proj.outcome}">
															{#if proj.outcome === 'victory'}
																🏆 {proj.statusLabel}
															{:else if proj.outcome === 'retreat'}
																⛺ {proj.statusLabel} · Valor al Intentar
															{:else}
																⚔️ {proj.statusLabel}
															{/if}
														</div>

														{#if proj.logs.length > 0}
															<div class="credits-logs-sequence">
																{#each proj.logs as logItem (logItem.id)}
																	<div class="credits-log-entry">
																		{#if logItem.media_url}
																			<button
																				type="button"
																				class="log-feed-img-btn credits-photo-btn"
																				aria-label="Ampliar fotografía del capítulo {Number(logItem.level) + 1}"
																				onclick={() => {
																					playClick();
																					playOpen();
																					expandedImage = logItem.media_url;
																				}}
																			>
																				<img
																					src={logItem.media_url}
																					alt="Evidencia de {proj.title} capítulo {Number(logItem.level) + 1}"
																					loading="lazy"
																				/>
																				<span class="log-feed-expand">⤢ Ver foto</span>
																			</button>
																		{/if}

																		<div class="credits-log-caption">
																			<span class="credits-chapter-pill">
																				🔓 Capítulo {Number(logItem.level) + 1}
																			</span>
																			{#if logItem.created_at}
																				<time class="credits-log-date">
																					{formatLogDate(logItem.created_at)}
																				</time>
																			{/if}
																		</div>

																		<p class="credits-log-message">“{logItem.log_text}”</p>
																	</div>
																{/each}
															</div>
														{:else}
															<p class="credits-no-logs-note">
																{proj.outcome === 'retreat'
																	? 'Retirada táctica registrada: detenerse también exige sabiduría y coraje.'
																	: 'Capítulo en marcha dentro de tu historia personal.'}
															</p>
														{/if}
													</article>
												{/each}
											{/if}
										</section>

										<!-- 4. CIERRE EMOTIVO DE CRÉDITOS -->
										<footer class="credits-finale">
											<div class="credits-divider" aria-hidden="true">─── ★ ───</div>
											<span class="credits-eyebrow">CRÉDITOS FINALES</span>
											<h4 class="credits-finale-title">
												TU ESFUERZO SIEMPRE SERÁ RECOMPENSADO
											</h4>
											<p class="credits-finale-copy">
												Gracias por no rendirte ante la dificultad, por levantarte tras cada retirada
												y por celebrar cada logro. Todo lo que construyes con perseverancia deja huella.
											</p>
											<span class="credits-fin-mark">FIN · METAPHORGOALS</span>
										</footer>
									</div>
								</div>
							{/key}
						</div>
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




	/* === BITÁCORA CINEMATOGRÁFICA: CRÉDITOS DE PELÍCULA === */
	.credits-audio-controls {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.credits-music-pill {
		font-size: 0.74rem;
		font-weight: 700;
		color: #ffd670;
		background: rgba(255, 214, 112, 0.12);
		border: 1px solid rgba(255, 214, 112, 0.35);
		padding: 4px 10px;
		border-radius: 999px;
	}

	.credits-reel-badge {
		font-size: 2.3rem;
	}

	.credits-toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: center;
	}

	.credits-ctrl-btn {
		background: rgba(0, 0, 0, 0.34);
		border: 1px solid var(--card-border);
		color: var(--text-main);
		border-radius: 999px;
		padding: 6px 12px;
		font-size: 0.76rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.credits-ctrl-btn:hover {
		border-color: var(--accent-primary);
		color: #fff;
	}

	.credits-ctrl-btn.is-gold {
		border-color: rgba(255, 214, 112, 0.48);
		color: #ffd670;
		background: rgba(255, 214, 112, 0.1);
	}

	.movie-credits-screen {
		position: relative;
		overflow: hidden;
		border-radius: 22px;
		border: 1px solid rgba(255, 214, 112, 0.28);
		background:
			radial-gradient(circle at 50% 20%, rgba(255, 214, 112, 0.08) 0%, transparent 55%),
			linear-gradient(180deg, rgba(6, 9, 15, 0.96) 0%, rgba(10, 14, 22, 0.98) 100%);
		box-shadow:
			0 18px 42px rgba(0, 0, 0, 0.58),
			inset 0 0 36px rgba(0, 0, 0, 0.75);
	}

	.movie-credits-stars {
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0.35;
		background-image:
			radial-gradient(1px 1px at 14% 22%, #fff 100%, transparent),
			radial-gradient(1.5px 1.5px at 78% 16%, #ffd670 100%, transparent),
			radial-gradient(1px 1px at 36% 64%, #fff 100%, transparent),
			radial-gradient(1.5px 1.5px at 86% 72%, #ffd670 100%, transparent),
			radial-gradient(1px 1px at 22% 88%, #fff 100%, transparent);
	}

	.movie-credits-viewport {
		position: relative;
		z-index: 2;
		height: clamp(440px, 64vh, 640px);
		overflow-y: auto;
		padding: 0 18px;
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 214, 112, 0.35) transparent;
		mask-image: linear-gradient(to bottom, transparent 0%, black 9%, black 91%, transparent 100%);
		-webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 9%, black 91%, transparent 100%);
	}

	.movie-credits-reel {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 2.2rem;
		padding: 64px 4px 180px;
	}

	.credits-opening {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.55rem;
		max-width: 100%;
	}

	.credits-eyebrow,
	.credits-section-kicker {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: rgba(255, 214, 112, 0.85);
	}

	.credits-hero-name {
		font-family: var(--font-heading, 'Inter', sans-serif);
		font-size: clamp(1.65rem, 5vw, 2.25rem);
		font-weight: 800;
		color: #ffffff;
		margin: 0.15rem 0 0;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		text-shadow: 0 0 22px rgba(255, 214, 112, 0.35);
	}

	.credits-ally-line {
		font-size: 0.78rem;
		letter-spacing: 0.14em;
		color: var(--text-muted);
		text-transform: uppercase;
		margin: 0;
	}

	.credits-ally-line strong {
		color: #ffd670;
	}

	.credits-divider {
		color: rgba(255, 214, 112, 0.65);
		font-size: 0.8rem;
		letter-spacing: 0.25em;
		margin: 0.4rem 0;
		user-select: none;
	}

	.credits-speech-card {
		margin: 0.5rem 0 0;
		padding: 1rem 1.1rem;
		border-radius: 16px;
		background: rgba(255, 214, 112, 0.06);
		border: 1px solid rgba(255, 214, 112, 0.28);
		text-align: center;
		width: 100%;
	}

	.credits-speech-label {
		display: block;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		color: #ffd670;
		margin-bottom: 0.55rem;
	}

	.credits-speech-text {
		color: #f8f3e6;
		font-size: 0.94rem;
		line-height: 1.72;
		margin: 0;
		white-space: pre-wrap;
	}

	.credits-cast-summary {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.credits-stats-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}

	.credits-stat-item {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 10px 6px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.credits-stat-item.is-victory {
		border-color: rgba(255, 214, 112, 0.4);
		background: rgba(255, 214, 112, 0.08);
	}

	.credits-stat-item.is-retreat {
		border-color: rgba(251, 146, 60, 0.35);
		background: rgba(251, 146, 60, 0.07);
	}

	.credits-stat-num {
		font-family: var(--font-heading, 'Inter', sans-serif);
		font-size: 1.2rem;
		font-weight: 800;
		color: #ffffff;
	}

	.credits-stat-lbl {
		font-size: 0.68rem;
		color: var(--text-muted);
	}

	.credits-chronicle {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.credits-empty-block {
		padding: 1.25rem;
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	.credits-project-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.65rem;
		padding: 1.25rem 0.9rem;
		border-radius: 18px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.credits-project-block.outcome-victory {
		border-color: rgba(255, 214, 112, 0.35);
		background: linear-gradient(180deg, rgba(255, 214, 112, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%);
	}

	.credits-project-block.outcome-retreat {
		border-color: rgba(251, 146, 60, 0.3);
		background: linear-gradient(180deg, rgba(251, 146, 60, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
	}

	.credits-project-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.credits-episode {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		color: #ffd670;
	}

	.credits-theme-tag {
		font-size: 0.7rem;
		color: var(--text-muted);
		padding: 2px 8px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.07);
	}

	.credits-project-title {
		font-family: var(--font-heading, 'Inter', sans-serif);
		font-size: 1.22rem;
		font-weight: 800;
		color: #ffffff;
		margin: 0;
		text-transform: capitalize;
	}

	.credits-outcome-badge {
		font-size: 0.74rem;
		font-weight: 700;
		padding: 3px 12px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		color: var(--accent-primary);
	}

	.credits-outcome-badge.outcome-victory {
		background: rgba(255, 214, 112, 0.16);
		color: #ffd670;
	}

	.credits-outcome-badge.outcome-retreat {
		background: rgba(251, 146, 60, 0.16);
		color: #fdba74;
	}

	.credits-logs-sequence {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 0.45rem;
	}

	.credits-log-entry {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.85rem;
		border-radius: 14px;
		background: rgba(0, 0, 0, 0.34);
		border: 1px solid rgba(255, 255, 255, 0.08);
		text-align: left;
	}

	.credits-photo-btn img {
		max-height: 220px;
	}

	.credits-log-caption {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.credits-chapter-pill {
		font-size: 0.72rem;
		font-weight: 700;
		color: #ffd670;
	}

	.credits-log-date {
		font-size: 0.72rem;
		color: var(--accent-primary);
		font-weight: 600;
	}

	.credits-log-message {
		margin: 0;
		color: #f1f5f9;
		font-size: 0.88rem;
		line-height: 1.55;
		font-style: italic;
		white-space: pre-wrap;
	}

	.credits-no-logs-note {
		margin: 0.25rem 0 0;
		font-size: 0.82rem;
		color: var(--text-muted);
		font-style: italic;
	}

	.credits-finale {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		padding: 1rem 0.5rem 2rem;
	}

	.credits-finale-title {
		font-family: var(--font-heading, 'Inter', sans-serif);
		font-size: 1.15rem;
		font-weight: 800;
		color: #ffd670;
		letter-spacing: 0.08em;
		margin: 0;
	}

	.credits-finale-copy {
		color: #e2e8f0;
		font-size: 0.9rem;
		line-height: 1.65;
		max-width: 38ch;
		margin: 0;
	}

	.credits-fin-mark {
		margin-top: 0.6rem;
		font-size: 0.7rem;
		letter-spacing: 0.28em;
		color: rgba(255, 255, 255, 0.55);
		font-weight: 700;
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
