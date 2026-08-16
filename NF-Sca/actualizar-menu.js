import fs from 'fs';
import path from 'path';

const rutasDir = path.join('src', 'routes');
const archivoDestino = path.join('src', 'lib', 'components', 'MenuNavegacion.svelte');

// 1. Escanear carpetas que son módulos (ignoramos api, admin, etc)
const modulos = fs.readdirSync(rutasDir).filter(file => 
    fs.statSync(path.join(rutasDir, file)).isDirectory() && 
    !file.startsWith('_') && 
    !['admin', 'api'].includes(file) // Excluir carpetas internas
);

// 2. Generar el contenido del componente
const contenido = `
<script>
  const rutas = ${JSON.stringify(modulos.map(m => ({ nombre: m.toUpperCase(), url: '/' + m })), null, 2)};
</script>

<nav class="menu-auto">
  <ul>
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
`.trim();

// 3. Crear el componente
if (!fs.existsSync(path.dirname(archivoDestino))) {
    fs.mkdirSync(path.dirname(archivoDestino), { recursive: true });
}
fs.writeFileSync(archivoDestino, contenido);
console.log("✅ Componente MenuNavegacion.svelte actualizado con:", modulos);
