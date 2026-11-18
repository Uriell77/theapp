<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Motion } from 'svelte-motion';
	import CardTask from '$lib/components/CardTask.svelte';
	import SlidingPanel from '$lib/components/SlidingPanel.svelte';
	import { supabase } from '$lib/supabaseClient';
	import Estadistic from '$lib/components/Estadistic.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import SeccionAjustes from '$lib/components/SeccionAjustes.svelte';
	import { page } from '$app/state';
	import { playClick } from '$lib/audio';
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

	const isTaskCompleted = (t: any) =>
		parseInt(t.status, 10) !== -1 && parseInt(t.status, 10) >= t.cantidad_de_niveles - 1;

	// Separar activas / archivadas
	let tasks = $derived(allTasks.filter((t: any) => !t.isArchived));
	let archivedTasks = $derived(allTasks.filter((t: any) => t.isArchived));
	// Victoria: completadas al 100%  ·  Archivo (Retiradas Tácticas): abandonadas
	let victoryTasks = $derived(allTasks.filter((t: any) => isTaskCompleted(t)));
	let retreatTasks = $derived(allTasks.filter((t: any) => parseInt(t.status, 10) === -1));

	// Skin automático: tema dominante de los proyectos (si el modo es 'auto')
	$effect(() => {
		syncSkin(allTasks);
	});

	// Vista activa: 'dashboard' | 'victoria' | 'bitacora' | 'archivo' | 'ajustes'
	type ViewId = 'dashboard' | 'victoria' | 'bitacora' | 'archivo' | 'ajustes';
	const VIEWS: ViewId[] = ['dashboard', 'victoria', 'bitacora', 'archivo', 'ajustes'];
	const tabParam = page.url.searchParams.get('tab') as ViewId | null;
	let activeTab = $state<ViewId>(tabParam && VIEWS.includes(tabParam) ? tabParam : 'dashboard');

	// Bitácora global (project_logs + join con tasks)
	let globalLogs = $state<any[]>([]);
	let logsLoading = $state(false);
	let logsError = $state<string | null>(null);
	let expandedImage = $state<string | null>(null);

	async function loadGlobalLogs() {
		const ids = allTasks.map((t: any) => t.id);
		if (ids.length === 0) {
			globalLogs = [];
			return;
		}
		logsLoading = true;
		logsError = null;
		const { data: rows, error } = await supabase
			.from('project_logs')
			.select('*, tasks(title, tema)')
			.in('task_id', ids)
			.order('created_at', { ascending: false });
		if (error) {
			console.error('Error al cargar la bitácora global:', error);
			logsError = 'No se pudo cargar la bitácora.';
			globalLogs = [];
		} else {
			globalLogs = rows ?? [];
		}
		logsLoading = false;
	}

	$effect(() => {
		if (activeTab === 'bitacora') {
			void allTasks.length;
			untrack(() => loadGlobalLogs());
		}
	});

	function formatLogDate(value: string) {
		const d = new Date(value);
		return isNaN(d.getTime())
			? ''
			: d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
	}

	let isPanelOpen = $state(false);
	let panelMode = $state<'form' | 'details'>('form');
	let selectedTaskId = $state<number | null>(null);
	let selectedChapter = $state<number | null>(null);
	let startInVictory = $state(false);
	let selectedTask = $derived(allTasks.find((t: any) => t.id === selectedTaskId) || null);
	let viewedTasks = $state<Record<string, string>>({});

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

	onMount(() => {
		const channel = supabase
			.channel('tasks_channel')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
				invalidateAll();
			})
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	});

	function openCreateForm() {
		panelMode = 'form';
		selectedTaskId = null;
		selectedChapter = null;
		startInVictory = false;
		isPanelOpen = true;
	}

	function openVictory(taskId: number) {
		const task = allTasks.find((t: any) => t.id === taskId);
		if (!task) return;
		panelMode = 'details';
		selectedTaskId = taskId;
		selectedChapter = Math.max(0, task.cantidad_de_niveles - 1);
		viewedTasks[String(taskId)] = String(task.status);
		startInVictory = true;
		isPanelOpen = true;
	}

	function openTaskDetails(taskId: number, chapterIndex?: number) {
		panelMode = 'details';
		selectedTaskId = taskId;
		startInVictory = false;
		const task = allTasks.find((t: any) => t.id === taskId);
		if (task) {
			const targetChapter = chapterIndex !== undefined ? chapterIndex : Number(task.status);
			selectedChapter = targetChapter;
			if (String(targetChapter) === String(task.status)) {
				viewedTasks[String(taskId)] = String(task.status);
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
		if (newTaskNiveles > 1) newTaskNiveles--;
	}

	function incrementarNiveles() {
		if (newTaskNiveles < 12) newTaskNiveles++;
	}
</script>

<svelte:head>
	<title>Dashboard | Proyectos Narrativos</title>
</svelte:head>

<main class="app-container pt-0 pb-6">


	<Navbar activeView={activeTab} onViewChange={(v) => (activeTab = v)} />



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

		{:else if activeTab === 'victoria'}
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

		{:else if activeTab === 'bitacora'}
			<!-- ===== BITÁCORA GLOBAL ===== -->
			<div class="is-flex is-justify-content-space-between is-align-items-center mb-3 section-head">
				<h2 class="has-text-weight-bold has-text-white" style="font-size: 1.35rem; margin: 0;">
					📸 Bitácora
				</h2>
				<span class="badge-pill">{globalLogs.length} {globalLogs.length === 1 ? 'registro' : 'registros'}</span>
			</div>

			{#if logsLoading}
				<div class="glass-panel has-text-centered py-6 px-4 mb-4">
					<p class="has-text-grey-light">Cargando tu bitácora…</p>
				</div>
			{:else if logsError}
				<div class="glass-panel has-text-centered py-6 px-4 mb-4">
					<p class="has-text-danger">{logsError}</p>
				</div>
			{:else if globalLogs.length === 0}
				<div class="glass-panel has-text-centered py-6 px-4 mb-4">
					<div style="font-size: 2.5rem; margin-bottom: 12px;">📓</div>
					<p class="has-text-grey-light mb-2" style="font-weight: 600;">Tu bitácora está en blanco</p>
					<p class="has-text-grey-light" style="font-size: 0.85rem;">
						Cada vez que desbloquees un nivel registrando tu esfuerzo, aparecerá aquí.
					</p>
				</div>
			{:else}
				<div class="log-feed">
					{#each globalLogs as log (log.id)}
						<article class="glass-panel log-feed-card mb-4">
							<div class="is-flex is-justify-content-space-between is-align-items-flex-start mb-2">
								<div>
									<h3 class="has-text-weight-bold has-text-white is-capitalized" style="font-size: 1.05rem;">
										{log.tasks?.title ?? 'Proyecto'}
									</h3>
									<span style="color: var(--text-muted); font-size: 0.78rem;">{log.tasks?.tema ?? ''}</span>
								</div>
								<span class="tag is-warning is-light">🔓 Nivel {log.level}</span>
							</div>
							<time style="color: var(--accent-primary); font-size: 0.75rem; font-weight: 600;">
								{formatLogDate(log.created_at)}
							</time>
							<p class="log-feed-text mt-2">{log.log_text}</p>
							{#if log.media_url}
								<button type="button" class="log-feed-img-btn mt-3" aria-label="Expandir imagen" onclick={() => (expandedImage = log.media_url)}>
									<img src={log.media_url} alt="Evidencia del nivel {log.level}" loading="lazy" />
									<span class="log-feed-expand">⤢ Expandir</span>
								</button>
							{/if}
						</article>
					{/each}
				</div>
			{/if}

			{#if expandedImage}
				<div class="modal is-active" style="z-index: 2000;">
					<div class="modal-background" role="presentation" onclick={() => (expandedImage = null)}></div>
					<div class="modal-content">
						<img src={expandedImage} alt="Evidencia ampliada" style="border-radius: 16px; width: 100%;" />
					</div>
					<button class="modal-close is-large" aria-label="Cerrar" onclick={() => (expandedImage = null)}></button>
				</div>
			{/if}

		{:else if activeTab === 'archivo'}
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

		{:else if activeTab === 'ajustes'}
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
		{/if}

		<!-- ===== BOTTOM NAV ===== -->
		<nav class="bottom-nav">
			<!-- Dashboard -->
			<button
				class="nav-item {activeTab === 'dashboard' ? 'active' : ''}"
				onclick={() => {
					playClick();
					activeTab = 'dashboard';
				}}
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
				onclick={() => {
					playClick();
					activeTab = 'victoria';
				}}
				aria-label="Victoria"
			>
				<span style="font-size: 19px; line-height: 20px; height: 20px; margin-top: 0;">🏆</span>
				<span>Victoria</span>
			</button>

			<!-- FAB crear -->
			<button class="fab" onclick={openCreateForm} aria-label="Nueva Tarea">+</button>

			<!-- Archivo (reemplaza Calendario) -->
			<button
				class="nav-item {activeTab === 'archivo' ? 'active' : ''}"
				onclick={() => {
					playClick();
					activeTab = 'archivo';
				}}
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
				onclick={() => {
					playClick();
					activeTab = 'ajustes';
				}}
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
