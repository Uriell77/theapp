<script lang="ts">
  // Definimos las propiedades del componente con la sintaxis de Svelte 5
  let { children, task, ...props } = $props();
</script>

<div class="componente-cardtask">
  <!-- Aquí va la estructura de tu componente -->


        <div class="box is-rounded mb-2 has-background-dark p-4 px-6">
          <div><strong class="has-text-weight-bold has-text-centered py-0"><p class="is-size-6-mobile py-0">{task.title}</p></strong></div>
          <hr class="py-0 my-0">
          <div class="is-flex is-size-7-mobile is-justify-content-space-between"><strong>Tematica: </strong> <p class="has-text-white pl-4">{task.tema}</p></div>
          <div class="is-flex is-size-7-mobile is-justify-content-space-between"><strong>Numero de Niveles: </strong> <p class="has-text-white pl-4">{task.cantidad_de_niveles}</p></div>
          <div class="is-flex is-size-7-mobile is-justify-content-space-between"><strong>Status:</strong> <p class="has-text-white pl-4">{task.status}</p></div>
          <div>
            {#each task.levels as level}
              <div class="is-flex is-size-7-mobile is-justify-content-space-between"><strong>Nivel: </strong> <p class="has-text-white pl-4">{level.content[task.status]}</p></div>
              <div class="is-flex is-size-7-mobile is-justify-content-space-between py-0 my-0"><strong class="py-0 my-0">Cinematica: </strong>
              <figure class="image is-96x96 py-0 my-0 is-flex"><img class="py-0 my-0 has-ratio" src="{level.cinematica[task.status]}" alt="cinematica" /></figure>
              </div>
              <div class="container progresscontainer">
              <progress class="progress is-primary is-rounded is-small py-0 my-0" value={task.status/100 } max={task.cantidad_de_niveles/100}></progress>
              </div>
            {/each}
          </div>
        </div>


  {@render children?.()}
</div>

<style>
  /* Estilos locales encapsulados */
  .componente-cardtask {
    display: block;
  }

  img{
    border-radius: 10px;
  }
  .image{
    padding: 0px !important;
    margin: 0px !important;
  }
</style>