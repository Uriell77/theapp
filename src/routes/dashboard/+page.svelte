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
</script>

<svelte:head>
	<title>Dashboard | Proyectos Narrativos</title>
</svelte:head>

<main class="section pt-4 px-0 pb-6">
	<Motion
		whileHover={{ scale: 1.12, rotate: 90 }}
		whileTap={{ scale: 0.92 }}
		transition={{ type: 'spring', stiffness: 400, damping: 15 }}
		let:motion
	>
		<button
			use:motion
			class="button is-primary is-rounded floating-button"
			onclick={openCreateForm}
			title="Nueva Tarea"
			aria-label="Nueva Tarea">+</button
		>
	</Motion>

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

				<div class="field">
					<label class="label has-text-white" for="taskTitle">Título del proyecto</label>
					<div class="control">
						<input
							class="input"
							type="text"
							name="title"
							id="taskTitle"
							bind:value={newTaskTitle}
							placeholder="Ej: Odisea en Alfa Centauri"
							required
							disabled={isSubmitting}
						/>
					</div>
				</div>

				<div class="field">
					<label class="label has-text-white" for="taskTema">Temática Narrativa</label>
					<div class="control select is-fullwidth">
						<select name="tema" id="taskTema" bind:value={newTaskTema} disabled={isSubmitting}>
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

				<div class="field">
					<label class="label has-text-white" for="taskNiveles"
						>Cantidad de Capítulos / Niveles</label
					>
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
						class="button is-primary is-fullwidth mt-4"
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
		<Motion
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			let:motion
		>
			<div use:motion class="user-badge is-flex is-align-items-center">
				<p class="mr-2 is-size-7">
					Hola, <strong class="has-text-primary">{data.user.nombre_de_usuario}</strong>
				</p>
				<figure class="image is-32x32">
					<img class="is-rounded" src="/emptyavatar.avif" alt="Avatar" />
				</figure>
			</div>
		</Motion>

		<Estadistic datas={data} {tasks} />

		<div class="columns is-centered">
			<div class="column is-half-desktop is-full-mobile">
				<Motion
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.35, delay: 0.1 }}
					let:motion
				>
					<div use:motion class="box is-cristal p-3 mx-0">
						<div class="is-flex is-justify-content-space-between is-align-items-center mb-3">
							<h2 class="title is-5 has-text-white mb-0">Mis Proyectos</h2>
							<span class="tag is-info">{tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}</span>
						</div>
						<hr class="mt-1 mb-3" />

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
							<div class="has-text-centered py-6">
								<p class="has-text-grey-light mb-3">Aún no tienes tareas activas.</p>
								<Motion whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} let:motion>
									<button
										use:motion
										class="button is-primary is-small is-outlined"
										onclick={openCreateForm}
									>
										Crear tu primera tarea
									</button>
								</Motion>
							</div>
						{/if}
					</div>
				</Motion>
			</div>
		</div>
	{:else}
		<div class="box has-text-centered">
			<p>No se encontraron datos de usuario.</p>
		</div>
	{/if}
</main>

<style>
	.is-cristal {
		background: rgba(255, 255, 255, 0.05) !important;
		backdrop-filter: blur(12px) !important;
		border: 1px solid rgba(255, 255, 255, 0.1) !important;
		border-radius: 12px !important;
	}

	.user-badge {
		position: absolute;
		top: 1rem;
		right: 2rem;
		z-index: 5;
		background: rgba(0, 0, 0, 0.4);
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.floating-button {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		z-index: 100;
		width: 3.5rem;
		height: 3.5rem;
		font-size: 1.75rem;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
	}
</style>
