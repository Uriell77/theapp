import fs from 'fs';
import path from 'path';

const nombreForm = process.argv[2];
const camposRaw = process.argv.slice(3); // Captura todos los argumentos después del nombre

if (!nombreForm || camposRaw.length === 0) {
    console.error("❌ Error: Uso correcto: node generar-formulario.js NombreForm campo1:tipo campo2:tipo");
    console.error("💡 Ejemplo: node generar-formulario.js Registro email:email telefono:tel contraseña:password");
    process.exit(1);
}

const nombreFormateado = nombreForm.charAt(0).toUpperCase() + nombreForm.slice(1) + "Form";
const carpetaComponents = path.join('src', 'lib', 'components');
const archivoCompleto = path.join(carpetaComponents, `${nombreFormateado}.svelte`);

// Diccionario inteligente para placeholders, iconos y validaciones de formato
const configuracionCampos = {
    email: { icono: 'Mail', placeholder: 'ejemplo@correo.com', regex: '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/', error: 'Email inválido' },
    tel: { icono: 'Phone', placeholder: '0412-1234567', regex: '/^04[124626]\\d{7}$/', error: 'Formato de teléfono inválido (11 dígitos)' },
    password: { icono: 'Lock', placeholder: '••••••••', regex: '/^.{6,}$/', error: 'Mínimo 6 caracteres' },
    texto: { icono: 'User', placeholder: 'Escribe aquí...', regex: '/^.+$/', error: 'Este campo es requerido' },
    numero: { icono: 'Hash', placeholder: '0.00', regex: '/^\\d+(\\.\\d+)?$/', error: 'Debe ser un número válido' }
};

// Procesar los campos enviados por la terminal
const campos = camposRaw.map(item => {
    const [nombre, tipo] = item.split(':');
    const config = configuracionCampos[tipo] || configuracionCampos['texto'];
    return { nombre, tipo: tipo === 'texto' ? 'text' : tipo === 'numero' ? 'number' : tipo, ...config };
});

// Generar el estado inicial para Svelte 5
const estadoInicial = campos.map(c => `    ${c.nombre}: ''`).join(',\n');

// Generar las validaciones reactivas con $derived
const logicaValidacion = campos.map(c => {
    return `  let error${c.nombre.charAt(0).toUpperCase() + c.nombre.slice(1)} = $derived(\n    valores.${c.nombre} && !${c.regex}.test(valores.${c.nombre}) ? '${c.error}' : ''\n  );`;
}).join('\n');

// Condición para habilitar el botón de envío
const condicionBoton = campos.map(c => `!valores.${c.nombre} || error${c.nombre.charAt(0).toUpperCase() + c.nombre.slice(1)}`).join(' || ');

// Generar el HTML de los inputs del formulario
const htmlInputs = campos.map(c => `
  <div class="form-group">
    <label for="${c.nombre}">${c.nombre.toUpperCase()}</label>
    <div class="input-container">
      <span class="icon"><!-- Icono Lucide: ${c.icono} --></span>
      <input 
        type="${c.tipo}" 
        id="${c.nombre}" 
        placeholder="${c.placeholder}" 
        bind:value={valores.${c.nombre}}
        class={error${c.nombre.charAt(0).toUpperCase() + c.nombre.slice(1)} ? 'input-error' : ''}
      />
    </div>
    {#if error${c.nombre.charAt(0).toUpperCase() + c.nombre.slice(1)}}
      <span class="error-text">{error${c.nombre.charAt(0).toUpperCase() + c.nombre.slice(1)}}</span>
    {/if}
  </div>
`).join('\n');

// Plantilla final del componente Svelte 5
const plantillaFormulario = `
<script lang="ts">
  // Componente generado automáticamente para Luis
  let { onEnviar } = $props();

  // 1. Estado reactivo del formulario con Svelte 5 Runes
  let valores = $state({
${estadoInicial}
  });

  // 2. Validaciones en tiempo real usando $derived
${logicaValidacion}

  // 3. Estado general del formulario (Habilitar/Deshabilitar botón)
  let formularioInvalido = $derived(${condicionBoton});

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!formularioInvalido) {
      onEnviar(valores);
    }
  }
</script>

<form onsubmit={handleSubmit} class="custom-form">
  <h2>Formulario de ${nombreForm}</h2>

  ${htmlInputs}

  <button type="submit" disabled={formularioInvalido}>
    Enviar Datos
  </button>
</form>

<style>
  .custom-form { max-width: 400px; margin: 0 auto; padding: 1.5rem; background: #f9f9f9; border-radius: 8px; }
  .form-group { margin-bottom: 1.2rem; display: flex; flex-direction: column; }
  .input-container { position: relative; display: flex; align-items: center; }
  input { width: 100%; padding: 0.5rem 0.5rem 0.5rem 2rem; border: 1px solid #ccc; border-radius: 4px; }
  .input-error { border-color: #ff4444; }
  .error-text { color: #ff4444; font-size: 0.8rem; margin-top: 0.2rem; }
  button { width: 100%; padding: 0.7rem; background: #0070f3; color: white; border: none; border-radius: 4px; cursor: pointer; }
  button:disabled { background: #ccc; cursor: not-allowed; }
</style>
`.trim();

// Crear carpeta si no existe y escribir archivo
try {
    if (!fs.existsSync(carpetaComponents)) {
        fs.mkdirSync(carpetaComponents, { recursive: true });
    }
    if (!fs.existsSync(archivoCompleto)) {
        fs.writeFileSync(archivoCompleto, plantillaFormulario);
        console.log(`\n🔥 ¡Formulario inteligente creado con éxito en: ${archivoCompleto}`);
    } else {
        console.warn(`\n⚠️ El archivo ${nombreFormateado}.svelte ya existe.`);
    }
} catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
}
