<script lang="ts">
import { onMount } from 'svelte';
import CardTask from "$lib/components/CardTask.svelte";
import SlidingPanel from "$lib/components/SlidingPanel.svelte";
import { supabase } from "$lib/supabaseClient";

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

  function openPanel(e: MouseEvent) {
    const target = e.currentTarget as HTMLElement;
    if (target.id === 'botonmas') {
      panelMode = 'form';
      selectedTask = null;
    } else {
      panelMode = 'details';
      selectedTask = tasks.find((t: any) => t.title === target.id);
    }
    isPanelOpen = true;
  }

  async function handleCreateTask() {
    if (!data.user) return;
    
    const { error } = await supabase
      .from('tasks')
      .insert([
        { 
          title: newTaskTitle, 
          tema: newTaskTema,
          cantidad_de_niveles: newTaskNiveles,
          user_id: data.user.id
        }
      ]);
      
    if (error) {
      console.error("Error al crear tarea:", error);
      alert("Error al crear la tarea");
    } else {
      alert("Tarea creada con éxito");
      isPanelOpen = false;
      // Limpiar formulario
      newTaskTitle = "";
      newTaskTema = "";
      newTaskNiveles = 1;
    }
  }
</script>

<svelte:head>
  <title>DASHBOARD</title>
</svelte:head>

<main class="section pt-1 px-0 pb-0 is-align-items-center is-justify-content-space-between">

  <button class="button is-primary is-rounded floating-button" id="botonmas" onclick={openPanel}>+</button>

  <SlidingPanel bind:isOpen={isPanelOpen} mode={panelMode} taskData={selectedTask}>
    {#if panelMode === 'form'}
      <form onsubmit={(e) => { e.preventDefault(); handleCreateTask(); }}>
        <div class="field">
          <label class="label has-text-white" for="taskTitle">Título de la tarea</label>
          <div class="control">
            <input class="input" type="text" id="taskTitle" bind:value={newTaskTitle} placeholder="Ej: Aprender Svelte" required />
          </div>
        </div>
        <div class="field">
          <label class="label has-text-white" for="taskTema">Temática</label>
          <div class="control">
            <input class="input" type="text" id="taskTema" bind:value={newTaskTema} placeholder="Ej: Programación" required />
          </div>
        </div>
        <div class="field">
          <label class="label has-text-white" for="taskNiveles">Número de niveles</label>
          <div class="control">
            <input class="input" type="number" id="taskNiveles" bind:value={newTaskNiveles} min="1" required />
          </div>
        </div>
        <button class="button is-primary mt-4" type="submit">Guardar</button>
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

    <div class="columns is-centered is-vcentered is-multiline is-mobile pt-0">
      <div class="column is-half-desktop is-full-mobile pt-0 px-0 mx-1">
    <div class=" is-transparente box is-rounded has-background-dark p-2 is-cristal is-shadowless">
    <p class="subtitle is-weight-bold is-size-6-mobile has-text-white p-0 ">Tienes {tasks.length} tareas activas</p>
    <hr>
    <p class="is-hidden">Lista de tareas:</p>
    <ul>
      {#each tasks as Task (Task.id)}        
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <CardTask task={Task} flag={openPanel}/>  
      {/each}
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