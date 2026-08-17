<script lang="ts">
  // Definimos las propiedades del componente con la sintaxis de Svelte 5
  let { children, task, ...props } = $props();
</script>

<div class="componente-cardtask">
  <!-- Aquí va la estructura de tu componente -->


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


  {@render children?.()}
</div>

<style>
  /* Estilos locales encapsulados */
  .componente-cardtask {
    display: block;
  }
</style>