import fs from 'fs';
import path from 'path';

// 1. Capturamos el nombre del componente desde la terminal
const nombreComponente = process.argv[2];

if (!nombreComponente) {
    console.error("❌ Error: Debes indicar el nombre del componente. Ej: node generar-componente.js Boton");
    process.exit(1);
}

// Aseguramos que la primera letra sea mayúscula (estándar para componentes Svelte)
const nombreFormateado = nombreComponente.charAt(0).toUpperCase() + nombreComponente.slice(1);

// 2. Definimos la ruta absoluta hacia src/lib/components
const carpetaComponents = path.join('src', 'lib', 'components');
const archivoCompleto = path.join(carpetaComponents, `${nombreFormateado}.svelte`);

// 3. Plantilla base para el componente usando las Runes de Svelte 5
const plantillaComponente = `
<script lang="ts">
  // Definimos las propiedades del componente con la sintaxis de Svelte 5
  let { children, ...props } = $props();
</script>

<div class="componente-${nombreFormateado.toLowerCase()}">
  <!-- Aquí va la estructura de tu componente -->
  {@render children?.()}
</div>

<style>
  /* Estilos locales encapsulados */
  .componente-${nombreFormateado.toLowerCase()} {
    display: block;
  }
</style>
`.trim();

try {
    // 4. Verificar si la carpeta 'src/lib/components' existe; si no, crearla
    if (!fs.existsSync(carpetaComponents)) {
        fs.mkdirSync(carpetaComponents, { recursive: true });
        console.log(`📂 Carpeta creada: ${carpetaComponents}`);
    }

    // 5. Verificar si el archivo ya existe antes de escribir
    if (!fs.existsSync(archivoCompleto)) {
        fs.writeFileSync(archivoCompleto, plantillaComponente);
        console.log(`✅ ¡Éxito! Componente creado en: ${archivoCompleto}`);
    } else {
        console.warn(`\n⚠️  El componente "${nombreFormateado}.svelte" ya existe en esta ubicación.`);
    }
} catch (err) {
    console.error(`\n❌ Error al generar el componente: ${err.message}`);
}
