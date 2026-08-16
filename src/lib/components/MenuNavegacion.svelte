<script>
  const rutas = [
  {
    "nombre": "AUTH",
    "url": "/auth"
  },
  {
    "nombre": "DASHBOARD",
    "url": "/dashboard"
  }
];
</script>

<nav class="menu-auto">
  <ul>
    <li><a href="/">Inicio</a></li>
    {#each rutas as ruta}
      <li><a href={ruta.url}>{ruta.nombre}</a></li>
    {/each}
  </ul>
</nav>

<style>
  .menu-auto { background: #f4f4f5; padding: 1rem; border-radius: 8px; }
  ul { list-style: none; display: flex; gap: 1rem; }
  a { text-decoration: none; color: #333; font-weight: bold; }
</style>