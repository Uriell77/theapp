<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Motion } from 'svelte-motion';
	import CardTask from '$lib/components/CardTask.svelte';
	import SlidingPanel from '$lib/components/SlidingPanel.svelte';
	import { supabase } from '$lib/supabaseClient';
	import Estadistic from '$lib/components/Estadistic.svelte';


// Define esto dentro de tu <script lang="ts"> o en un archivo de utilidades separado
const tematicasAgrupadas = [
    {
        grupo: "Fantasía y Mitología",
        opciones: [
            { valor: "Magia y Fantasía", etiqueta: "Magia y Fantasía" },
            { valor: "Cruzada Medieval", etiqueta: "Cruzada Medieval" },
            { valor: "Odisea Mitológica Griega", etiqueta: "Odisea Mitológica Griega" },
            { valor: "Dinastía Samurái", etiqueta: "Dinastía Samurái" },
            { valor: "Alquimia y Magia Arcana", etiqueta: "Alquimia y Magia Arcana" }
        ]
    },
    {
        grupo: "Ciencia Ficción",
        opciones: [
            { valor: "Guerra Espacial", etiqueta: "Guerra Espacial" },
            { valor: "Rebelión Cyberpunk", etiqueta: "Rebelión Cyberpunk" },
            { valor: "Supervivencia Post-Apocalíptica", etiqueta: "Supervivencia Post-Apocalíptica" },
            { valor: "Mundo Steampunk", etiqueta: "Mundo Steampunk" }
        ]
    },
    {
        grupo: "Terror y Supervivencia",
        opciones: [
            { valor: "Apocalipsis Zombi", etiqueta: "Apocalipsis Zombi" },
            { valor: "Terror Lovecraftiano", etiqueta: "Terror Lovecraftiano" },
            { valor: "Catastrofe Natural", etiqueta: "Catástrofe Natural" }
        ]
    },
    {
        grupo: "Acción y Aventura",
        opciones: [
            { valor: "Superheroes", etiqueta: "Superhéroes" },
            { valor: "Guerra Mundial", etiqueta: "Guerra Mundial" },
            { valor: "Vaqueros y Western", etiqueta: "Vaqueros y Western" }
        ]
    },
    {
        grupo: "Misterio, Thriller y Drama",
        opciones: [
            { valor: "Agente Secreto", etiqueta: "Agente Secreto" },
            { valor: "Espionaje Internacional", etiqueta: "Espionaje Internacional" },
            { valor: "Detective Noir", etiqueta: "Detective Noir (Años 20)" },
            { valor: "El Gran Atraco", etiqueta: "El Gran Atraco (Heist)" },
            { valor: "Romance Diurno", etiqueta: "Romance Diurno" }
        ]
    },
    {
	  grupo: "Aprendizaje y Exploración",
	  opciones: [
		{ valor: "Aprendizaje Infantil", etiqueta: "Aprendizaje Infantil" },
		{ valor: "Aprendizaje Adolescente", etiqueta: "Aprendizaje Adolescente" },
		{ valor: "Aprendizaje de Habilidades", etiqueta: "Aprendizaje de Habilidades" },
		{ valor: "Conocimiento Universal", etiqueta: "Conocimiento Universal" },
	  ]
    }
];


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

	// Funciones para el Spinner de Niveles
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
<!-- Reemplaza tu <select> anterior por este bloque -->
			<select 
			name="tema" 
			id="taskTema" 
			bind:value={newTaskTema} 
			disabled={isSubmitting} 
			style="background: #142127; border: 1px solid var(--card-border); color: white; border-radius: 14px; padding: 2px 16px; width: 100%; font-family: inherit;"
			>
			<!-- Opción por defecto (Opcional, pero recomendada) -->
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

				<div class="field mb-4">
					<label class="label mb-0 pb-0" for="taskNiveles" style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;"
						>Número de Capítulos / Niveles</label
					>
					<small style="color: var(--text-muted); font-size: 0.75rem; display: block; margin-bottom: 6px;">Fragmentos en los que se divide tu proyecto</small>
					<div class="control flex justify-center">
    <!-- Contenedor principal estilo píldora -->
    <div class="number-spinner-pill" class:is-submitting={isSubmitting}>
        
        <!-- Botón Restar -->
        <button 
            type="button" 
            class="spinner-btn" 
            onclick={decrementarNiveles} 
            disabled={newTaskNiveles <= 1 || isSubmitting}
            aria-label="Disminuir niveles"
        >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
        </button>

        <!-- Input oculto/estilizado para guardar el valor en el formulario -->
        <input
            class="spinner-input"
            type="number"
            name="cantidad_de_niveles"
            id="taskNiveles"
            bind:value={newTaskNiveles}
            min="1"
            max="12"
            required
            readonly 
        />

        <!-- Botón Sumar -->
        <button 
            type="button" 
            class="spinner-btn" 
            onclick={incrementarNiveles} 
            disabled={newTaskNiveles >= 12 || isSubmitting}
            aria-label="Aumentar niveles"
        >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        </button>
    </div>
</div>
				</div>
				<input class="is-hidden" type="text" value="{data?.user?.nombre_de_usuario}" name="nombredeusuario"/>

				<Motion
					whileHover={!isSubmitting ? { scale: 1.02 } : {}}
					whileTap={!isSubmitting ? { scale: 0.98 } : {}}
					let:motion
				>
				<section class="section is-flex is-justify-content-center is-align-items-center mt-0 pt-0 pb-2 mb-4" >
					<button
						use:motion
						class="btn-primary"
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



<style>

input[type="text"] {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--card-border);
    color: white;
    border-radius: 14px;
    padding: 12px 16px;
    font-family: inherit;
    width: 100%;
}

input[type="text"]:focus {
    outline: none;
    border-color: #00e5ff; /* Color de borde al enfocar */
    box-shadow: 0 0 5px rgba(0, 229, 255, 0.5); /* Sombra suave al enfocar */
}

input[type="text"]::placeholder {
    color: #b0b0b0; /* Color del placeholder */
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
    border-color: #00e5ff; /* Color de borde al enfocar */
    box-shadow: 0 0 5px rgba(0, 229, 255, 0.5); /* Sombra suave al enfocar */
}

select option {
    background: #142127; /* Fondo de las opciones */
    color: white; /* Color del texto de las opciones */
}

select optgroup {
    font-weight: bold; /* Negrita para los grupos */
    color: #00e5ff; /* Color celeste para los grupos */
}

select optgroup option {
    font-weight: normal; /* Normal para las opciones */
    color: white; /* Color del texto de las opciones */
    font-style: normal; /* Estilo normal para las opciones */
    font-size: 0.9rem; /* Tamaño de fuente más pequeño para las opciones */
}

select optgroup option:hover {
    background: #1e2a33; /* Fondo al pasar el ratón por las opciones */
    color: #00e5ff; /* Color del texto al pasar el ratón por las opciones */
}

select optgroup option:focus {
    background: #1e2a33; /* Fondo al enfocar la opción */
    color: #00e5ff; /* Color del texto al enfocar la opción */
}

select optgroup option:active {
    background: #1e2a33; /* Fondo al hacer clic en la opción */
    color: #00e5ff; /* Color del texto al hacer clic en la opción */
}



select:disabled {
    background: #0d1317; /* Fondo más oscuro para el select deshabilitado */
    color: #555; /* Color de texto más apagado para el select deshabilitado */
    cursor: not-allowed; /* Cambia el cursor para indicar que está deshabilitado */
}

/* Contenedor estilo píldora */
.number-spinner-pill {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #0d1317; /* Fondo oscuro inspirado en la imagen */
    border: 1px solid #ffffff; /* Borde blanco grueso */
    border-radius: 9999px; /* Forma de píldora perfecta */
    padding: 3px 2px;
    width: 300px; /* Ancho ajustado para dar espacio */
    margin: 0 auto;
    box-shadow: 0 15px 25px rgba(0, 0, 0, 0.4); /* Sombra para darle profundidad */
    transition: opacity 0.3s ease;
}

/* Estado deshabilitado si se está enviando el formulario */
.number-spinner-pill.is-submitting {
    opacity: 0.5;
    pointer-events: none;
}

/* Botones de flechas */
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

/* Efecto al presionar o pasar el ratón */
.spinner-btn:not(:disabled):hover {
    transform: scale(1.2);
    color: #00e5ff; /* Se iluminan un poco al tocarlas */
}

.spinner-btn:not(:disabled):active {
    transform: scale(0.9);
}

/* Estilo para los botones cuando llegan al límite (ej: no puede bajar de 1) */
.spinner-btn:disabled {
    opacity: 0.2;
    cursor: not-allowed;
}

/* El número central */
.spinner-input {
    background: transparent;
    border: none;
    outline: none;
    color: #00e5ff; /* Color celeste neón brillante de la imagen */
    font-family: inherit;
    font-size: 2.5rem; /* Tamaño masivo para que destaque */
    font-weight: 800;
    text-align: center;
    width: 90px;
    pointer-events: none; /* Hace que no sea seleccionable directamente */
}

/* Ocultar las flechitas nativas feas de los inputs tipo number en todos los navegadores */
.spinner-input::-webkit-outer-spin-button,
.spinner-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}
.spinner-input[type=number] {
    -moz-appearance: textfield;
    appearance: textfield;
}
</style>	