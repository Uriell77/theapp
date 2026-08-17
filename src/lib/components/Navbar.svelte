<script lang="ts">
  // Definimos las propiedades del componente con la sintaxis de Svelte 5
  let { children, ...props } = $props();
  let activo= $derived("inicio");

  function view(e){
    console.log(e.target.id)
    activo = e.target.id
    console.log(activo)
  }

  
</script>

<section class="section pt-2 px-2 pb-0 is-flex is-align-items-center is-justify-content-space-between">

<div class="componente-navbar">
  <!-- Aquí va la estructura de tu componente -->

  <nav class="breadcrumb is-small" aria-label="breadcrumbs">
    <ul>
      <li class="{activo=="inicio"? "is-active ter": ""}" ><a onclick="{view}" id="inicio" href="/" >Inicio</a></li>
      <li class="{activo=="dashboard"? "is-active ter": ""}"><a onclick="{view}" id="dashboard" href="/dashboard" >Dashboard</a></li>
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

  .ter{
    color:red !important;
    font-size: 13px;
  }
</style>