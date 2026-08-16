import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// 1. Capturamos el nombre de la ruta desde la terminal
const nombreRuta = process.argv[2];

if (!nombreRuta) {
	console.error(
		'❌ Error: Debes indicar el nombre de la ruta. Ej: node generar-ruta.js facturas'
	);
	process.exit(1);
}

// 2. Definimos la ruta absoluta hacia src/routes
const rutaCompleta = path.join('src', 'routes', nombreRuta);

// 3. Contenido base para el archivo +page.svelte (Svelte 5)
const plantillaSvelte = `
<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>${nombreRuta.toUpperCase()}</title>
</svelte:head>

<main>
  <h1>Sección: ${nombreRuta}</h1>
  <p>Generado automáticamente por el script de Luis</p>
</main>

<style>
  main { padding: 2rem; }
</style>
`.trim();

// 4. Lógica de creación
try {
	if (!fs.existsSync(rutaCompleta)) {
		// Crea la carpeta (recursive: true permite crear subcarpetas si es necesario)
		fs.mkdirSync(rutaCompleta, { recursive: true });

		// Crea el archivo +page.svelte dentro de esa carpeta
		fs.writeFileSync(path.join(rutaCompleta, '+page.svelte'), plantillaSvelte);

		// Actualizar el menú de navegación para incluir el nuevo módulo
		console.log(`  [UI] 🔄 Actualizando menú de navegación...`);
		execSync('node NF-Sca/actualizar-menu.js', { stdio: 'inherit' });

		console.log(`\n✅ ¡Éxito!`);
		console.log(`📂 Carpeta creada: ${rutaCompleta}`);
		console.log(`📄 Archivo creado: +page.svelte`);
	} else {
		console.warn(`\n⚠️  La ruta "/${nombreRuta}" ya existe. No se hicieron cambios.`);
	}
} catch (err) {
	console.error(`\n❌ Error al crear la ruta: ${err.message}`);
}
