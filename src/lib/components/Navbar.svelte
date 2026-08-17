<script lang="ts">
  // Definimos las propiedades del componente con la sintaxis de Svelte 5
  let { children, data, ...props } = $props();
  let activo= $derived("inicio");
  console.log(data)


  function view(e){
    console.log(e.target.id)
    activo = e.target.id
    console.log(activo)
  }

  
</script>

<section class="section pt-1 px-2 py-0 is-align-items-center is-justify-content-space-between">


<div class="componente-navbar is-cristal py-0">
  <!-- Aquí va la estructura de tu componente -->

  <nav class="breadcrumb is-small py-0" aria-label="breadcrumbs">
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
  .is-cristal {
    background: rgba(255, 255, 255, 0.1) !important;
    backdrop-filter: blur(10px) !important;
    border-radius: 8px !important;
    padding: 1rem !important;
    color: #fff !important;
  }
</style>