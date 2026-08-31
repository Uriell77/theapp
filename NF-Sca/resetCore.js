// reset-sistema.js
import fs from 'fs';
import path from 'path';

const carpetasAMantener = ['api', 'auth']; // Añade aquí rutas que NO quieres borrar
const rutasBase = 'src/routes';

const plantillaSvelte = `<script>
</script>

<div>Basic</div>

<style>
</style>`;

console.log('🧹 Iniciando limpieza profunda del sistema...');

// 1. Borrar base de datos
if (fs.existsSync('local_database.db')) {
	fs.unlinkSync('local_database.db');
	console.log('✅ Base de datos borrada.');
}

// 2. Limpiar rutas (manteniendo las esenciales)
fs.readdirSync(rutasBase).forEach((file) => {
	if (!carpetasAMantener.includes(file) && file !== '+layout.svelte') {
		fs.rmSync(path.join(rutasBase, file), { recursive: true, force: true });
		console.log(`✅ Ruta borrada: ${file}`);
	}
});

//3. Crear de nuevo el +page.svelte en routes
try {
	fs.writeFileSync(path.join(rutasBase, '+page.svelte'), plantillaSvelte);
} catch (err) {
	console.error(`\n❌ Error general en la creación del módulo: ${err.message}`);
}
console.log(`✅ |FrontEnd Creado de nuevo en: ${rutasBase}`);

console.log('🚀 Sistema reseteado a cero. ¡Listo para empezar!');
