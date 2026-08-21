<script lang="ts">
  import type { Snippet } from 'svelte';

  // Definimos las propiedades del componente con la sintaxis de Svelte 5
  let { children, ...props }: { children?: Snippet } = $props();
  let activo = $state("inicio");


  function view(e: Event){
    const target = e.target as HTMLElement;
    activo = target.id;
  }

  
</script>

<section class="section pt-1 px-2 py-0 is-align-items-center is-justify-content-space-between">


<div class="componente-navbar is-cristal py-0 box">
  <!-- Aquí va la estructura de tu componente -->

  <nav class=" is-small py-0" aria-label="breadcrumbs">
    <ul>
      <li class="{activo=="inicio"? "is-active": ""} button is-small is-rounded " ><a onclick="{view}" id="inicio" href="/" >Inicio</a></li>
      <li class="{activo=="dashboard"? "is-active": ""} button is-small is-rounded ml-1 "><a onclick="{view}" id="dashboard" href="dashboard" >Dashboard</a></li>

    </ul>
  </nav>


  {@render children?.()}
</div>

</section>



<style>
  /* Estilos locales encapsulados */
  .componente-navbar {
    display: block;
  }

  .is-cristal {
    background: rgba(255, 255, 255, 0) !important;
    backdrop-filter: blur(10px) !important;
    border-radius: 8px !important;
    padding: 1rem !important;
    color: #fff !important;
  }
  .box { background: #f4f4f5; border-radius: 8px; color: #333; margin-top: 0rem; }
</style>