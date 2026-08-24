<script lang="ts">
  import type { Snippet } from 'svelte';
  let { isOpen = $bindable(), mode = 'form', taskData, children }: { isOpen: boolean, mode: 'form' | 'details', taskData?: any, children?: Snippet } = $props();
</script>

<div class="panel-overlay {isOpen ? 'is-active' : ''}">
  <div class="panel-background" onclick={() => isOpen = false} role="button" aria-label="Close" aria-hidden="true"></div>
  <div class="panel-content">
    <button class="delete" onclick={() => isOpen = false} aria-label="Close"></button>

    <section class="section p-0">
      <div class="container">
        {#if mode === 'form'}
          <h2 class="title has-text-white">Nueva Tarea</h2>
          {@render children?.()}
        {:else if mode === 'details' && taskData}
          <h2 class="title has-text-white">{taskData.title}</h2>
          <div class="box pb-4 mb-4 is-transparent">
            <p><strong>Temática:</strong> {taskData.tema}</p>
            <p><strong>Niveles:</strong> {taskData.cantidad_de_niveles}</p>
            <p><strong>Status:</strong> {taskData.status}</p>
            
            <p class="mt-4"><strong>Narrativa:</strong></p>
            {#if taskData.levels && taskData.levels.length > 0}
              {#each taskData.levels as level (level.id)}
                <div class="narrative-container">
                  <!-- Imagen Cinemática si existe para el estado actual -->
                  {#if level.cinematica && level.cinematica[taskData.status]}
                    <div class="mb-3 mt-2">
                      <figure class="image is-16by9" style="max-width: 320px; margin: 0 auto;">
                        <img src={level.cinematica[taskData.status]} alt="Cinemática" style="border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15);" />
                      </figure>
                    </div>
                  {/if}

                  <!-- Narrativa Actual -->
                  {#if level.content && level.content[taskData.status] !== undefined}
                    <div class="notification is-light p-3 mb-3" style="border-left: 4px solid hsl(155, 81%, 41%); background-color: #f0fdf4;">
                      <p class="is-italic" style="color: #15803d;">"{level.content[taskData.status]}"</p>
                    </div>
                  {:else if level.content && level.content[0] !== undefined}
                    <div class="notification is-light p-3 mb-3" style="border-left: 4px solid #ccc; background-color: #f9fafb;">
                      <p class="is-italic" style="color: #4b5563;">"{level.content[0]}"</p>
                    </div>
                  {/if}

                </div>
              {/each}
            {:else}
              <p class="has-text-grey-light">No hay narrativa asociada a esta tarea.</p>
            {/if}
            <!-- Añadir más detalles aquí -->
          </div>
        {/if}
      </div>
    </section>
  </div>
</div>


<style>
  .panel-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 98%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    visibility: hidden;
    z-index: 1000;
  }

  .panel-overlay.is-active {
    visibility: visible;
  }

  .panel-background {
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .panel-overlay.is-active .panel-background {
    opacity: 1;
  }

  .panel-content {
    background: rgba(255, 255, 255, 0.1); /* Ajuste del cristal */
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    width: 100vw;
    height: 60vh;
    border-radius: 1rem 1rem 0 0;
    box-shadow: 0 -10px 25px rgba(0,0,0,0.3);
    transform: translateY(100%);
    transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    padding: 2rem;
    position: relative;
    z-index: 1;
    color: white;
  }

  .panel-overlay.is-active .panel-content {
    transform: translateY(0);
  }

  .delete {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 50%;
    cursor: pointer;
    position: absolute;
    top: 1rem;
    right: 1rem;
  }

  .box{
    background-color: transparent;
  }

</style>
