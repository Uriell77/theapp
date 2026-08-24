<script lang="ts">

  // Definimos las propiedades del componente con la sintaxis de Svelte 5
  let { children, datas, tasks, ...props } = $props();
</script>


<div class="columns is-centered is-mobile">
<div class="column is-half-desktop is-full-mobile">


<div class="componente-estadistic section mb-0 pb-0">
  <!-- Aquí va la estructura de tu componente -->
   <div class="columns is-centered is-vcentered is-mobile">
    <div class="column half-desktop is-6-mobile">
      <div class="box is-shadowless has-background-dark ">
        <div class="content">
          <p class="is-size-7-mobile">Usuario: <strong>{datas.user.nombre_de_usuario}</strong></p> 
          <p class="is-size-7-mobile">Email: <strong>{datas.user.email}</strong></p> 
        </div>
      </div>
    </div>
    <div class="column half">
      <div class="box is-shadowless has-background-dark"> 
        <div class="content">
          {tasks.id}
        </div>
      </div>
    </div>
    </div>
    <div class="columns is-centered is-vcentered is-mobile">
    <div class="column half">
      <div class="box is-shadowless has-background-dark">
        <div class="content">
            <p class="is-size-7-mobile">Tareas activas: <strong>{tasks.length}</strong></p>
        </div>
      </div>
    </div>
    <div class="column half">
      <div class="box is-shadowless has-background-dark">
        <div class="content">
          <p class="is-size-7-mobile"><strong>""</strong></p>
        </div>
      </div>

    </div>
   </div>
  {@render children?.()}
</div>

</div>
</div>


<style>
  /* Estilos locales encapsulados */
  .componente-estadistic {
    background-color: transparent;
  }

  .content{
    height: 10vh;
    width: 20vw;
  }

  .box{
    margin: -7px;

  }

</style>