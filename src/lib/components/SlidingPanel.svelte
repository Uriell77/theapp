<script lang="ts">
  let { children, isOpen = $bindable() } = $props();
</script>

<div class="panel-overlay {isOpen ? 'is-active' : ''}">
  <div class="panel-background" onclick={() => isOpen = false} role="button" aria-label="Close" aria-hidden="true"></div>
  <div class="panel-content">
    <button class="delete" onclick={() => isOpen = false} aria-label="Close"></button>
    
    <h2>Visualización Detallada</h2>
    <p>Aquí puedes ver los detalles del elemento seleccionado.</p>
    
    <div class="info-box">
      <p><strong>Estado:</strong> Activo</p>
      <p><strong>Fecha:</strong> 19 de agosto, 2026</p>
    </div>

    <div class="btn-group">
      <button class="button-action" onclick={() => alert('Acción 1')}>Acción 1</button>
      <button class="button-action" style="background: #f14668;" onclick={() => alert('Acción 2')}>Acción 2</button>
    </div>

    {@render children?.()}
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

  .btn-group {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }

  .button-action {
    background: #3273dc;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
  }
</style>
