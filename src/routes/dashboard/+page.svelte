<script lang="ts">
	import { onMount } from 'svelte';
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

	// Separar activas / archivadas
	let tasks = $derived(allTasks.filter((t: any) => !t.isArchived));
	let archivedTasks = $derived(allTasks.filter((t: any) => t.isArchived));

	// Pestaña activa del nav: 'dashboard' | 'archivo' | 'ajustes'
	let activeTab = $state<'dashboard' | 'archivo' | 'ajustes'>(
		page.url.searchParams.get('tab') === 'ajustes'
			? 'ajustes'
			: page.url.searchParams.get('tab') === 'archivo'
				? 'archivo'
				: 'dashboard'
	);

	let isPanelOpen = $state(false);
	let panelMode = $state<'form' | 'details'>('form');
	let selectedTaskId = $state<number | null>(null);
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
		isPanelOpen = true;
	}

	function openTaskDetails(taskId: number) {
		panelMode = 'details';
		selectedTaskId = taskId;
		const task = allTasks.find((t: any) => t.id === taskId);
		if (task) {
			viewedTasks[String(taskId)] = String(task.status);
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


	<Navbar />



	<SlidingPanel class="" bind:isOpen={isPanelOpen} mode={panelMode} taskData={selectedTask}>
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
							newTaskTema = 'Guerra Espacial';
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
		<Estadistic datas={data} tasks={allTasks} />

		{#if activeTab === 'dashboard'}
			<!-- ===== SECCIÓN PROYECTOS ACTIVOS ===== -->
			<div class="is-flex is-justify-content-space-between is-align-items-center mb-3 mt-4">
				<h2 class="has-text-weight-bold has-text-white" style="font-size: 1.35rem; margin: 0;">
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
							onSelect={() => openTaskDetails(Task.id)}
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
							style="margin: 0 auto; padding: 10px 20px;"
							onclick={openCreateForm}
						>
							Crear tu primer proyecto
						</button>
					</Motion>
				</div>
			{/if}

		{:else if activeTab === 'archivo'}
			<!-- ===== SECCIÓN ARCHIVO ===== -->
			<div class="is-flex is-justify-content-space-between is-align-items-center mb-3 mt-4">
				<h2 class="has-text-weight-bold has-text-white" style="font-size: 1.35rem; margin: 0;">
					📦 Archivo
				</h2>
				<span class="badge-pill" style="background: rgba(154,166,173,0.35); color: #ccc;">
					{archivedTasks.length} {archivedTasks.length === 1 ? 'proyecto' : 'proyectos'}
				</span>
			</div>

			{#if archivedTasks.length > 0}
				<p style="color: var(--text-muted); font-size: 0.82rem; margin-bottom: 16px;">
					Tus proyectos completados están guardados aquí. Puedes restaurarlos al dashboard o eliminarlos definitivamente.
				</p>
				<div>
					{#each archivedTasks as Task (Task.id)}
						<CardTask
							task={Task}
							hasViewed={true}
							onSelect={() => openTaskDetails(Task.id)}
						/>
					{/each}
				</div>
			{:else}
				<div class="glass-panel has-text-centered py-6 px-4 mb-4">
					<div style="font-size: 2.5rem; margin-bottom: 12px;">📭</div>
					<p class="has-text-grey-light mb-2" style="font-weight: 600;">El archivo está vacío</p>
					<p class="has-text-grey-light" style="font-size: 0.85rem;">
						Cuando completes un proyecto y lo archives, aparecerá aquí.
					</p>
				</div>
			{/if}

		{:else if activeTab === 'ajustes'}
			<!-- ===== SECCIÓN AJUSTES ===== -->
			<div class="is-flex is-justify-content-space-between is-align-items-center mb-3 mt-4">
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

			<!-- Tareas -->
			<button
				class="nav-item"
				onclick={() => {
					playClick();
					activeTab = 'dashboard';
				}}
				aria-label="Tareas"
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
					<polyline points="9 11 12 14 22 4"></polyline>
					<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
				</svg>
				<span>Tareas</span>
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
				aria-label="Archivo"
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
				<span>Archivo</span>
				{#if archivedTasks.length > 0}
					<span class="nav-badge">{archivedTasks.length}</span>
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
   max-height: 100%; /* Debes definir un límite de altura. Ajusta este valor a lo que necesites */
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
	gap: 6px;
	font-size: 0.7rem;
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



</style>
