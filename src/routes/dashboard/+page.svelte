<script lang="ts">
  let { data } = $props();
  console.log(data);
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
      {#each data.user.tasks as task, index}        
        <li class="box is-rounded mb-2 has-background-dark p-2">
          <div><strong class="has-text-weight-bold subtitle has-text-centered "><div>{task.title}</div></strong></div>
          <hr>
          <div class="is-flex pl-4"><strong>Tematica: </strong> <p class="has-text-white pl-4">{task.tema}</p></div>
          <div class="is-flex pl-4"><strong>Numero de Niveles: </strong> <p class="has-text-white pl-4">{task.cantidad_de_niveles}</p></div>
          <div class="is-flex pl-4"><strong>Status:</strong> <p class="has-text-white pl-4">{task.status}</p></div>
          <ul>
            {#each task.levels as level}
              <div class="is-flex pl-4"><strong>Nivel: </strong> <p class="has-text-white pl-4">{level.content[task.status]}</p></div>
              <div class="is-flex pl-4 "><strong>Cinematica: </strong> <p class="has-text-white pl-4">{level.cinematica[task.status]}</p></div>
              <progress class="progress is-primary" value={task.status/100 } max={task.cantidad_de_niveles/100}></progress>
            {/each}
    <hr>
          </ul>
        </li>
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