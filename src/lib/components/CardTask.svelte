<script lang="ts">
  import { onMount, type Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
    task: any;
    flag?: (e: any) => void;
    [key: string]: any;
  }

  // Definimos las propiedades del componente con la sintaxis de Svelte 5
  let { children, task, flag, ...props }: Props = $props();


</script>


{#if task}
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="componente-cardtask " id="{task.title}" onclick="{flag}">
  <!-- Aquí va la estructura de tu componente -->


        <div class="box is-rounded mb-2 has-background-dark p-4 px-6 " id="card" style="position: relative;">
            <div class="clicker" id="{task.title}" onclick="{flag}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 100; cursor: pointer;"></div>
          <div><strong class="has-text-weight-bold has-text-centered py-0"><p class="is-size-6-mobile py-0">{task.title}</p></strong></div>
          <hr class="py-0 my-0 mb-2">
          <div class="columns is-centered is-vcentered is-multiline is-mobile py-0 my-0">
            <div class="column is-half">
          <div class="is-flex is-size-7-mobile is-justify-content-space-between"><strong>Tematica: </strong> <p class="has-text-white pl-4">{task.tema}</p></div>
          <div class="is-flex is-size-7-mobile is-justify-content-space-between"><strong>Numero de Niveles: </strong> <p class="has-text-white pl-4">{task.cantidad_de_niveles}</p></div>
          <div class="is-flex is-size-7-mobile is-justify-content-space-between"><strong>Status:</strong> <p class="has-text-white pl-4">{task.status}</p></div>
            {#each task.levels as level}
              <div class="is-flex is-size-7-mobile is-justify-content-space-between"><strong>Nivel: </strong> <p class="has-text-white pl-4">{level.content[task.status]}</p></div>
            {/each}
            </div>
            <div class="column is-half is-flex is-justify-content-center is-align-items-center py-0 my-0">
            {#each task.levels as level} 
              <!-- <div class="is-hidden is-flex is-size-7-mobile is-justify-content-space-between py-0 my-0"><strong class="py-0 my-0">Cinematica: </strong> </div> -->
              <figure class="image is-9by3 py-0 my-0 is-flex"><img class="py-0 my-0" src="{level.cinematica[task.status]}" alt="cinematica" /></figure>
            {/each}
            </div>
              <div class="container progresscontainer mt-2 step-progress-bar" style="--steps: 5; --current-step: 2;">
              <progress class="is-hidden progress is-primary is-rounded is-small py-0 my-0" value={task.status/100 } max={task.cantidad_de_niveles/100}></progress>

              {#each task.levels as lev}
              {#each lev.content as le,index}
              <div class="tag {index <= task.status ? "is-primary" : ""} px-4 py-0">
              {index}
              </div>                
              {/each} 
               <div class="tag {task.status == lev.content.length-1 ? "is-primary" :"is-danger"} has-text-weight-bold ml-4 is-pulled-right">{(task.status/(lev.content.length-1)*100).toFixed(2)} % </div>
              {/each}
               
            </div>
            </div>
        </div>

</div>

{:else}

<progress class="progress is-small is-primary" max="100"></progress>

{/if}




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
  strong{
    color: hsl(155, 81%, 41%);
  }





</style>