<script lang="ts">
  // Definimos las propiedades del componente con la sintaxis de Svelte 5
  let { children, ...props } = $props();
</script>

<div class="componente-visualizer box">
  <!-- Aquí va la estructura de tu componente -->

  aqui esta el componente
  {@render children?.()}





</div>

<style>
  /* Estilos locales encapsulados */
  .componente-visualizer {
    display: block;
    background-color: green;
  }
</style>