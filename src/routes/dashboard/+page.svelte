<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Motion } from 'svelte-motion';
	import CardTask from '$lib/components/CardTask.svelte';
	import SlidingPanel from '$lib/components/SlidingPanel.svelte';
	import { supabase } from '$lib/supabaseClient';
	import Estadistic from '$lib/components/Estadistic.svelte';

	let { data } = $props();

	// Estado reactivo para las tareas
	let tasks = $state<any[]>([]);

	// Sincronizar estado cuando se actualiza data del servidor
	$effect(() => {
		tasks = data.user?.tasks || [];
	});

	let isPanelOpen = $state(false);
	let panelMode = $state<'form' | 'details'>('form');
	let selectedTaskId = $state<number | null>(null);
	let selectedTask = $derived(tasks.find((t: any) => t.id === selectedTaskId) || null);
	let viewedTasks = $state<Record<string, string>>({});

	// Estados para el formulario
	let newTaskTitle = $state('');
	let newTaskTema = $state('Guerra Espacial');
	let newTaskNiveles = $state(3);

	// Estados de carga y error
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	onMount(() => {
		// Suscripción a cambios en tiempo real
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
		const task = tasks.find((t: any) => t.id === taskId);
		if (task) {
			// Usamos el ID como string para la llave y el status como string para el valor
			viewedTasks[String(taskId)] = String(task.status);
		}
		isPanelOpen = true;
	}

	let activeTasksCount = $derived(
		tasks.filter((t: any) => parseInt(t.status, 10) !== -1 && parseInt(t.status, 10) < t.cantidad_de_niveles - 1).length
	);
</script>

<svelte:head>
	<title>Dashboard | Proyectos Narrativos</title>
</svelte:head>

<main class="app-container pt-0 pb-6">
	<SlidingPanel bind:isOpen={isPanelOpen} mode={panelMode} taskData={selectedTask}>
		{#if panelMode === 'form'}
			<form
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

				<div class="field mb-4">
					<label class="label" for="taskTitle" style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Título del proyecto</label>
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

				<div class="field mb-4">
					<label class="label" for="taskTema" style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Temática Narrativa</label>
					<div class="control select is-fullwidth" style="width: 100%;">
						<select name="tema" id="taskTema" bind:value={newTaskTema} disabled={isSubmitting} style="background: #142127; border: 1px solid var(--card-border); color: white; border-radius: 14px; padding: 2px 16px; width: 100%; font-family: inherit;">
							<option value="Guerra Espacial">Guerra Espacial</option>
							<option value="Cruzada Medieval">Cruzada Medieval</option>
							<option value="Apocalipsis Zombi">Apocalipsis Zombi</option>
							<option value="Superheroes">Superhéroes</option>
							<option value="Agente Secreto">Agente Secreto</option>
							<option value="Magia y Fantasía">Magia y Fantasía</option>
							<option value="Guerra Mundial">Guerra Mundial</option>
							<option value="Catastrofe Natural">Catástrofe Natural</option>
							<option value="Vaqueros y Western">Vaqueros y Western</option>
							<option value="Terror Lovecraftiano">Terror Lovecraftiano</option>
						</select>
					</div>
				</div>

				<div class="field mb-4">
					<label class="label mb-0 pb-0" for="taskNiveles" style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;"
						>Número de Capítulos / Niveles</label
					>
					<small style="color: var(--text-muted); font-size: 0.75rem; display: block; margin-bottom: 6px;">Fragmentos en los que se divide tu proyecto</small>
					<div class="control">
						<input
							class="input"
							type="number"
							name="cantidad_de_niveles"
							id="taskNiveles"
							bind:value={newTaskNiveles}
							min="1"
							max="20"
							required
							disabled={isSubmitting}
							style="background: rgba(0, 0, 0, 0.25); border: 1px solid var(--card-border); color: white; border-radius: 14px; padding: 12px 16px; font-family: inherit;"
						/>
					</div>
				</div>
				<input class="is-hidden" type="text" value="{data?.user?.nombre_de_usuario}" name="nombredeusuario"/>

				<Motion
					whileHover={!isSubmitting ? { scale: 1.02 } : {}}
					whileTap={!isSubmitting ? { scale: 0.98 } : {}}
					let:motion
				>
					<button
						use:motion
						class="btn-primary"
						style="width: 100%; margin-top: 1.5rem;"
						type="submit"
						disabled={isSubmitting}
					>
						{isSubmitting ? 'Generando historia con IA...' : 'Guardar y Generar'}
					</button>
				</Motion>
			</form>
		{/if}
	</SlidingPanel>

	{#if data.user}
		<Estadistic datas={data} {tasks} />

		<!-- Section Mis Proyectos -->
		<div class="is-flex is-justify-content-space-between is-align-items-center mb-3 mt-4">
			<h2 class="has-text-weight-bold has-text-white" style="font-size: 1.35rem; margin: 0;">Mis Proyectos</h2>
			<span class="badge-pill">{activeTasksCount} {activeTasksCount === 1 ? 'activa' : 'activas'}</span>
		</div>

		{#if tasks.length > 0}
			<div>
				{#each tasks as Task (Task.id)}
					<CardTask
						task={Task}
						hasViewed={viewedTasks[String(Task.id)] !== undefined && String(viewedTasks[String(Task.id)]) === String(Task.status)}
						onSelect={() => openTaskDetails(Task.id)}
					/>
				{/each}
			</div>
		{:else}
			<div class="glass-panel has-text-centered py-6 px-4 mb-4">
				<p class="has-text-grey-light mb-3">Aún no tienes tareas activas.</p>
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

		<!-- Bottom Nav Bar -->
		<nav class="bottom-nav">
			<a href="/dashboard" class="nav-item active">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
					<path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
				</svg>
				<span>Dashboard</span>
			</a>
			<a href="/dashboard" class="nav-item">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="9 11 12 14 22 4"></polyline>
					<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
				</svg>
				<span>Tareas</span>
			</a>
			<button class="fab" onclick={openCreateForm} aria-label="Nueva Tarea">
				+
			</button>
			<a href="/dashboard" class="nav-item">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
					<line x1="16" y1="2" x2="16" y2="6"></line>
					<line x1="8" y1="2" x2="8" y2="6"></line>
					<line x1="3" y1="10" x2="21" y2="10"></line>
				</svg>
				<span>Calendario</span>
			</a>
			<a href="/dashboard" class="nav-item">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="3"></circle>
					<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
				</svg>
				<span>Ajustes</span>
			</a>
		</nav>
	{:else}
		<div class="glass-panel has-text-centered p-5">
			<p>No se encontraron datos de usuario.</p>
		</div>
	{/if}
</main>
