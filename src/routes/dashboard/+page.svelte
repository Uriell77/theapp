<script lang="ts">
import { onMount } from 'svelte';
import { enhance } from '$app/forms';
import CardTask from "$lib/components/CardTask.svelte";
import SlidingPanel from "$lib/components/SlidingPanel.svelte";
import { supabase } from "$lib/supabaseClient";
import Estadistic from '$lib/components/Estadistic.svelte';

  let { data } = $props();
  // Hacemos que la lista de tareas sea reactiva y derivada de data
  let tasks = $derived.by(() => data.user?.tasks || []);
  let isPanelOpen = $state(false);
  let panelMode = $state<'form' | 'details'>('form');
  let selectedTask = $state<any>(null);

  // Estados para el formulario
  let newTaskTitle = $state("");
  let newTaskTema = $state("");
  let newTaskNiveles = $state(1);

  // Estados de carga y error
  let isSubmitting = $state(false);
  let errorMessage = $state<string | null>(null);

  onMount(() => {
    // Suscripción a cambios en tiempo real
    const channel = supabase
      .channel('tasks_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
        // Solo añadimos si la tarea pertenece al usuario actual
        if (payload.new.user_id === data.user?.id) {
            tasks = [...tasks, payload.new];
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  });

  let cardRefs: Record<number, any> = {};

  function openPanel(e: MouseEvent, taskId?: number) {
    const target = e.currentTarget as HTMLElement;
    if (target.id === 'botonmas') {
      panelMode = 'form';
      selectedTask = null;
    } else if (taskId) {
      panelMode = 'details';
      selectedTask = tasks.find((t: any) => t.id === taskId);
      
      // Marcar como visto
      if (cardRefs[taskId]) {
          cardRefs[taskId].setViewed();
      }
    }
    isPanelOpen = true;
  }
</script>

<svelte:head>
  <title>DASHBOARD</title>
</svelte:head>

<main class="section pt-1 px-0 pb-0 is-align-items-center is-justify-content-space-between">

  <button class="button is-primary is-rounded floating-button" id="botonmas" onclick={(e) => openPanel(e)}>+</button>

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
                    newTaskTitle = "";
                    newTaskTema = "";
                    newTaskNiveles = 1;
                } else if (result.type === 'failure') {
                    errorMessage = (result.data?.message as string) || 'Error al crear la tarea';
                }
                await update();
            };
        }}
      >
        {#if errorMessage}
            <div class="notification is-danger is-light">
                {errorMessage}
            </div>
        {/if}

        <div class="field">
          <label class="label has-text-white" for="taskTitle">Título de la tarea</label>
          <div class="control">
            <input class="input" type="text" name="title" id="taskTitle" bind:value={newTaskTitle} placeholder="Ej: Aprender Svelte" required disabled={isSubmitting} />
          </div>
        </div>
        <div class="field">
          <label class="label has-text-white" for="taskTema">Temática</label>
          <div class="control select is-fullwidth">
          <select name="tema" id="tema" bind:value={newTaskTema} disabled={isSubmitting}>
            <option value="Guerra Espacial">Guerra Espacial</option>
            <option value="Cruzada Medieval">Cruzada Medieval</option>
            <option value="Apocalipsis Zombi">Apocalipsis Zombi</option>
            <option value="Superheroes">Superheroes</option>
            <option value="Agente Secreto">Agente Secreto</option>
            <option value="Magia">Magia</option>
            <option value="Guerra Mundial">Guerra Mundial</option>
            <option value="Catastrofe Natural">Catastrofe Natural</option>
            <option value="Vaqueros">Vaqueros</option>
            <option value="Lovecraft">Lovecraft</option>
          </select>
          </div>
        </div>
        <div class="field">
          <label class="label has-text-white" for="taskNiveles">Número de niveles</label>
          <div class="control">
            <input class="input" type="number" name="cantidad_de_niveles" id="taskNiveles" bind:value={newTaskNiveles} min="1" required disabled={isSubmitting} />
          </div>
        </div>

        <button class="button is-primary mt-4" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Generando historia...' : 'Guardar'}
        </button>
      </form>
    {/if}

  </SlidingPanel>

  {#if data.user}
  <div class="nombre is-flex ">
    <p class="mt-2 mr-2">Bienvenido, <strong class=" has-text-weight-bold">{data.user.nombre_de_usuario || data.user.email}</strong></p>
    <figure class="image is-32x32 ml-4">
      <img class="is-rounded" src="/emptyavatar.avif" alt="Avatar del usuario" />
    </figure>
  </div>


    <div class=" is-hiddem card mt-3">
    <div class="card-header">
      <p class=" is-hidden card-header-title">Información del Usuario</p>
    </div>
    <div class=" is-hidden card-content">
      <p>Nombre: {data.user.nombre_de_usuario}</p> 
      <p>ID: {data.user.id}</p>
      <p>Email: {data.user.email}</p>
      <p>Password: {data.user.password}</p>
    </div>
    </div>

    <Estadistic datas={data} tasks={tasks}/>

    <div class="columns is-centered is-vcentered is-multiline is-mobile pt-0">
      <div class="column is-half-desktop is-full-mobile pt-0 px-0 mx-1 mt-0">
    <div class=" is-transparente box is-rounded has-background-dark p-2 is-cristal is-shadowless pt-0 mt-0">
    <p class="is-hidden p-0 m-0 subtitle is-weight-bold is-size-6-mobile has-text-white p-0 ">Tienes {tasks.length} tareas activas</p>
    <hr>
    <p class="is-hidden">Lista de tareas:</p>
    <ul>
    {#if tasks.length > 0} 
      {#each tasks as Task (Task.id)}        
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <CardTask 
        task={Task} 
        flag={(e) => openPanel(e, Task.id)}
        bind:this={cardRefs[Task.id]}
      />
      {/each}
      {:else}
      <div class="section">
      <div class="columns is-centered is-mobile is-vcentered">
        <div class="column is-half">
        <div class="box has-text-centered is-cristal has-text-weight-bold">
        Aun no hay Tareas
        </div>
        </div>
      </div>
      </div>
    {/if}
    </ul>
    </div>
      </div>
    </div>

  {:else}
  <div class="box">
    <p>No se encontraron datos del usuario.</p>
  </div>
  {/if}

</main>

<style>
  main { padding: 0rem;
    
  }
  .box { background: #f4f4f5; padding: 1rem; border-radius: 8px; color: #333; margin-top: 1rem; }
  strong { color: black; }
  .is-cristal {
    background: rgba(255, 255, 255, 0) !important;
    backdrop-filter: blur(10px) !important;
    border-radius: 8px !important;
    padding: 1rem !important;
    color: #fff !important;
  }
  .nombre {
    font-size: 0.8rem;
    font-weight: bold;
    margin-bottom: 1rem;
    position: absolute;
    top: 1rem;
    right: 2rem;
  }

  .floating-button {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    z-index: 100;
    width: 3rem;
    height: 3rem;
    font-size: 1.5rem;
  }
  strong{
    color: hsl(155, 81%, 41%);
  }
</style>