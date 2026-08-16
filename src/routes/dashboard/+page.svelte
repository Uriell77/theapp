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

    <div class="card mt-3">
    <div class="card-header">
      <p class="card-header-title">Información del Usuario</p>
    </div>
    <div class="card-content">
      <p>Nombre: {data.user.nombre_de_usuario}</p> 
      <p>ID: {data.user.id}</p>
      <p>Email: {data.user.email}</p>
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
  .card { border: 1px solid #ccc; border-radius: 8px; padding: 1rem}
  .card-header {color: #333; background: #f4f4f5; padding: 0.5rem; border-bottom: 1px solid #ccc; }
  .card-header-title { font-weight: bold; color: #333; }
  .card-content { padding: 1rem; }
  .box { background: #f4f4f5; padding: 1rem; border-radius: 8px; }
</style>