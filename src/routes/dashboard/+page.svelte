<script lang="ts">
import CardTask from "$lib/components/CardTask.svelte";
  let { data } = $props();
</script>

<svelte:head>
  <title>DASHBOARD</title>
</svelte:head>

<main>


  {#if data.user}
    <p>Bienvenido, <strong>{data.user.nombre_de_usuario || data.user.email}</strong></p>
    <hr>


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

    <div class="columns is-centered is-vcentered is-multiline is-mobile">
      <div class="column is-half-desktop is-full-mobile">
    <div class="box is-rounded">
    <p class="subtitle is-weight-bold has-text-black">Tienes {data.user.tasks.length} tareas activas</p>
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
<hr>

</main>

<style>
  main { padding: 2rem; }
  .box { background: #f4f4f5; padding: 1rem; border-radius: 8px; color: #333; margin-top: 1rem; }
  strong { color: black || white; }
</style>