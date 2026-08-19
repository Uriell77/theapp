<script lang="ts">
import CardTask from "$lib/components/CardTask.svelte";
import SlidingPanel from "$lib/components/SlidingPanel.svelte";
  let { data } = $props();
  let isPanelOpen = $state(false);
</script>

<svelte:head>
  <title>DASHBOARD</title>
</svelte:head>

<main class="section pt-1 px-2 pb-0 is-align-items-center is-justify-content-space-between">

  <button class="button is-primary is-rounded floating-button" onclick={() => isPanelOpen = true}>+</button>

  <SlidingPanel bind:isOpen={isPanelOpen}>
    <h2>Nueva Visualización</h2>
    <p>Contenido para la nueva visualización.</p>
  </SlidingPanel>

  {#if data.user}
  <div class="nombre is-flex ">
    <p class="mt-2">Bienvenido, <strong >{data.user.nombre_de_usuario || data.user.email}</strong></p>
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
      <div class="column is-half-desktop is-full-mobile pt-0">
    <div class=" is-transparente box is-rounded has-background-dark p-2 is-cristal">
    <p class="subtitle is-weight-bold is-size-6-mobile has-text-white p-0">Tienes {data.user.tasks.length} tareas activas</p>
    <hr>
    <p class="is-hidden">Lista de tareas:</p>
    <ul>
      {#each data.user.tasks as Task (Task.id)}        
      <CardTask task={Task}/>  
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
  strong { color: black || white; }
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
    right: 1rem;
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
</style>