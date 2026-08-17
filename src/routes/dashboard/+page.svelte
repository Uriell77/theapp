<script lang="ts">
import CardTask from "$lib/components/CardTask.svelte";
  let { data } = $props();
</script>

<svelte:head>
  <title>DASHBOARD</title>
</svelte:head>

<main class="section pt-1 px-2 pb-0 is-align-items-center is-justify-content-space-between">


  {#if data.user}
    <p>Bienvenido, <strong>{data.user.nombre_de_usuario || data.user.email}</strong></p>
    <hr class="is-hidden">


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
    <div class="box is-rounded has-background-dark p-2 is-cristal">
    <p class="subtitle is-weight-bold is-size-6-mobile has-text-white p-0">Tienes {data.user.tasks.length} tareas activas</p>
    <hr>
    <p class="is-hidden">Lista de tareas:</p>
    <ul>
      {#each data.user.tasks as Task, index}        
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
    background: rgba(255, 255, 255, 0.1) !important;
    backdrop-filter: blur(10px) !important;
    border-radius: 8px !important;
    padding: 1rem !important;
    color: #fff !important;
  }
</style>