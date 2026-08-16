<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>DASHBOARD</title>
</svelte:head>

<main>

  {#if data.user}
  <div class="box">
    <p>Bienvenido, <strong>{data.user.nombre_de_usuario || data.user.email}</strong></p>
    <p>ID: {data.user.id}</p>
    <p>Email: {data.user.email}</p>
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
</style>