import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const nombreModulo = process.argv[2];
const camposRaw = process.argv.slice(3);

if (!nombreModulo || camposRaw.length === 0) {
    console.error("❌ Error: Uso correcto: node generar-modulo-completo.js nombrePlural campo1:tipo campo2:tipo");
    console.error("💡 Ejemplo: node generar-modulo-completo.js productos nombre:texto precio:numero stock:numero");
    process.exit(1);
}

// Formateadores de texto lógicos
const tablaPlural = nombreModulo.toLowerCase();
const modeloSingular = tablaPlural.endsWith('es') ? tablaPlural.slice(0, -2) : (tablaPlural.endsWith('s') ? tablaPlural.slice(0, -1) : tablaPlural);
const modeloCapitalizado = modeloSingular.charAt(0).toUpperCase() + modeloSingular.slice(1);

const carpetaRuta = path.join('src', 'routes', tablaPlural);
const archivoSchema = path.join('src', 'lib', 'server', 'schema.ts');

// Diccionario de tipos para SQLite (Drizzle) y UI
const configTipos = {
    texto: { drizzle: "text('${nombre}')", tipoInput: "text", placeholder: "Escribe aquí..." },
    numero: { drizzle: "real('${nombre}')", tipoInput: "number", placeholder: "0.00" },
    email: { drizzle: "text('${nombre}')", tipoInput: "email", placeholder: "correo@ejemplo.com" },
    tel: { drizzle: "text('${nombre}')", tipoInput: "tel", placeholder: "04121234567" }
};

// Procesar los argumentos de la terminal
const campos = camposRaw.map(item => {
    const [nombre, tipo] = item.split(':');
    const config = configTipos[tipo] || configTipos['texto'];
    return { nombre, tipoOriginal: tipo, ...config };
});

console.log(`\n⚙️  Iniciando scaffolding completo para el módulo: "${tablaPlural}"...`);

// ==========================================
// PASO 1: AGREGAR LA TABLA AL SCHEMA.TS (DB)
// ==========================================
try {
    if (fs.existsSync(archivoSchema)) {
        let contenidoSchema = fs.readFileSync(archivoSchema, 'utf8');

        if (!contenidoSchema.includes("from 'drizzle-orm/sqlite-core'")) {
            const imports = "import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core';\n";
            fs.writeFileSync(archivoSchema, imports + contenidoSchema);
        }
        
        if (!contenidoSchema.includes(`export const ${tablaPlural} =`)) {
            let definicionTabla = `\n\n// Tabla ${tablaPlural} generada automáticamente\n`;
            definicionTabla += `export const ${tablaPlural} = sqliteTable('${tablaPlural}', {\n`;
            definicionTabla += `  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),\n`;
            
            campos.forEach(c => {
                const filaDrizzle = c.drizzle.replace('${nombre}', c.nombre);
                definicionTabla += `  ${c.nombre}: ${filaDrizzle},\n`;
            });
            
            definicionTabla += `  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull()\n`;
            definicionTabla += `});`;

            fs.appendFileSync(archivoSchema, definicionTabla);
            console.log(`  [DB] ✅ Tabla '${tablaPlural}' añadida a schema.ts`);
        } else {
            console.log(`  [DB] ⚠️  La tabla '${tablaPlural}' ya existía en el esquema. Saltando...`);
        }
    } else {
        console.error(`  [DB] ❌ Error: No se encontró el archivo ${archivoSchema}. Configúralo primero.`);
        process.exit(1);
    }
} catch (err) {
    console.error(`  [DB] ❌ Error al modificar el esquema: ${err.message}`);
    process.exit(1);
}

// ==========================================
// PASO 1.5: NUEVO GENERADOR DE ESQUEMA ZOD
// ==========================================
const camposZod = campos.map(c => {
    if (c.tipoInput === 'number') {
        return `  ${c.nombre}: z.coerce.number({ invalid_type_error: "Debe ser un número válido" })`;
    } else if (c.tipoOriginal === 'email') {
        return `  ${c.nombre}: z.string().email("Debe ser un correo electrónico válido")`;
    } else if (c.tipoOriginal === 'tel') {
        return `  ${c.nombre}: z.string().regex(/^04(12|14|16|24|26)\\d{7}$/, "Teléfono inválido (11 dígitos, ej: 0412...)")`;
    }
    return `  ${c.nombre}: z.string().min(1, "El campo ${c.nombre} es obligatorio")`;
}).join(',\n');

const validacionesCode = `import { z } from 'zod';\n\nexport const esquemaFormulario = z.object({\n${camposZod}\n});\n`;

// ==========================================
// PASO 2: CREAR EL BACKEND INTERNO (+page.server.ts)
// ==========================================
// Lógica para construir el buscador dinámico basado en campos de texto, email y tel
const searchableCampos = campos.filter(c => ['text', 'email', 'tel'].includes(c.tipoInput) || ['texto', 'email', 'tel'].includes(c.tipoOriginal));
let searchLogic = '';
if (searchableCampos.length > 0) {
    if (searchableCampos.length === 1) {
        searchLogic = `const condicion = search ? like(${tablaPlural}.${searchableCampos[0].nombre}, \`%\${search}%\`) : undefined;`;
    } else {
        const orConditions = searchableCampos.map(c => `like(${tablaPlural}.${c.nombre}, \`%\${search}%\`)`).join(', ');
        searchLogic = `const condicion = search ? or(${orConditions}) : undefined;`;
    }
} else {
    searchLogic = `const condicion = undefined;`;
}

const plantillaServer = `
import { db } from '$lib/server/db';
import { ${tablaPlural} } from '$lib/server/schema';
import { eq, like, or, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { esquemaFormulario } from './validaciones';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url }) => {
    const search = url.searchParams.get('q') || '';
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = 5; // Cantidad de registros por página
    const offset = (page - 1) * limit;

    ${searchLogic}

    try {
        const registros = await db.select()
            .from(${tablaPlural})
            .where(condicion)
            .limit(limit)
            .offset(offset);

        // Contar el total de registros para la paginación
        const conteo = await db.select({ count: sql<number>\`count(*)\` })
            .from(${tablaPlural})
            .where(condicion);
        
        const total = Number(conteo[0].count);
        const totalPages = Math.ceil(total / limit) || 1;

        return { 
            ${tablaPlural}: registros, 
            totalPages, 
            currentPage: page, 
            search 
        };
    } catch (e) {
        return { ${tablaPlural}: [], totalPages: 0, currentPage: 1, search: '' };
    }
};

export const actions: Actions = {
    crear: async ({ request }) => {
        const formData = await request.formData();
        const dataRaw = Object.fromEntries(formData.entries());
        
        // Validación con Zod
        const validacion = esquemaFormulario.safeParse(dataRaw);
        
        if (!validacion.success) {
            return fail(400, { error: validacion.error.errors[0].message });
        }

        try {
            await db.insert(${tablaPlural}).values(validacion.data);
            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Error al guardar en la base de datos local' });
        }
    },
    actualizar: async ({ request }) => {
        const formData = await request.formData();
        const id = formData.get('id') as string;
        const dataRaw = Object.fromEntries(formData.entries());
        
        if (!id) return fail(400, { error: 'ID inválido' });
        const validacion = esquemaFormulario.safeParse(dataRaw);
        
        if (!validacion.success) {
            return fail(400, { error: validacion.error.errors[0].message });
        }
        try {
            await db.update(${tablaPlural}).set(validacion.data).where(eq(${tablaPlural}.id, id));
            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Error al actualizar en la base de datos local' });
        }
    },
    eliminar: async ({ request }) => {
        const formData = await request.formData();
        const id = formData.get('id') as string;
        if (!id) return fail(400, { error: 'ID inválido' });
        try {
            await db.delete(${tablaPlural}).where(eq(${tablaPlural}.id, id));
            return { success: true };
        } catch (err) {
            return fail(500, { error: 'No se pudo eliminar el registro' });
        }
    }
};
`.trim();

// ==========================================
// PASO 3: CREAR EL FRONTEND INTERACTIVO (+page.svelte)
// ==========================================
const estadoInicialForm = campos.map(c => `    ${c.nombre}: ''`).join(',\n');

const htmlFormInputs = campos.map(c => `
    <div class="field-group">
      <label for="${c.nombre}">${c.nombre.toUpperCase()}</label>
      <input type="${c.tipoInput}" id="${c.nombre}" name="${c.nombre}" placeholder="${c.placeholder}" bind:value={valores.${c.nombre}} />
      {#if errores.${c.nombre}}
        <span class="err">{errores.${c.nombre}[0]}</span>
      {/if}
    </div>
`).join('\n');

const tablaCabeceras = campos.map(c => `<th>${c.nombre.toUpperCase()}</th>`).join('\n          ');
const tablaCeldaDatos = campos.map(c => `<td>{item.${c.nombre}}</td>`).join('\n            ');

// Calculamos que el botón se bloquee si hay errores, o si los campos están vacíos
const primerCampo = campos[0].nombre;

const plantillaSvelte = `
<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { esquemaFormulario } from './validaciones';
  let { data, form } = $props();

  let valores = $state({
${estadoInicialForm}
  });

  let editandoId = $state<string | null>(null);

  const editar = (item: any) => {
    editandoId = item.id;
    ${campos.map(c => `valores.${c.nombre} = item.${c.nombre};`).join('\n    ')}
  };

  const resetForm = () => {
    editandoId = null;
    for (let key in valores) { valores[key as keyof typeof valores] = ''; }
  };

  // Validación reactiva con Zod
  let errores = $derived.by(() => {
      const validacion = esquemaFormulario.safeParse(valores);
      if (validacion.success) return {};
      return validacion.error.flatten().fieldErrors;
  });

  let bloqueado = $derived(Object.keys(errores).length > 0 || !valores.${primerCampo});
</script>

<main class="panel-modulo">
  <h1>Administrador de ${modeloCapitalizado}s</h1>
  
  {#if form?.error}<p class="msg-error">⚠️ {form.error}</p>{/if}
  {#if form?.success}<p class="msg-success">✅ Registro completado</p>{/if}

  <form method="POST" action={editandoId ? "?/actualizar" : "?/crear"} use:enhance={() => {
    return async ({ result }) => {
      if (result.type === 'success') {
        resetForm();
        await invalidateAll();
      }
    };
  }} class="form-scaffold">
    {#if editandoId}
      <input type="hidden" name="id" value={editandoId} />
    {/if}
    ${htmlFormInputs}
    <div class="form-botones">
      <button type="submit" disabled={bloqueado}>{editandoId ? 'Actualizar' : 'Registrar'} ${modeloSingular}</button>
      {#if editandoId}
        <button type="button" class="btn-cancel" onclick={resetForm}>Cancelar</button>
      {/if}
    </div>
  </form>

  <div class="header-tabla">
    <h2>Registros en SQLite Local</h2>
    
    <form method="GET" class="buscador">
      <input type="search" name="q" placeholder="Buscar..." value={data.search} />
      <button type="submit">Buscar</button>
      {#if data.search}
        <a href="?" class="btn-clear">X</a>
      {/if}
    </form>
  </div>

  <div class="tabla-contenedor">
    <table>
      <thead>
        <tr>
          ${tablaCabeceras}
          <th>ACCIONES</th>
        </tr>
      </thead>
      <tbody>
        {#each data.${tablaPlural} as item}
          <tr>
            ${tablaCeldaDatos}
            <td>
              <div class="acciones-celda">
                <button class="btn-edit" onclick={() => editar(item)}>Editar</button>
                <form method="POST" action="?/eliminar" use:enhance={() => {
                  return async ({ result }) => {
                    if (result.type === 'success') {
                      await invalidateAll();
                    }
                  };
                }}>
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" class="btn-del">Eliminar</button>
                </form>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="${campos.length + 1}" style="text-align: center; color: #666; padding: 2rem;">
              No se encontraron registros.
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if data.totalPages > 1}
    <div class="paginacion">
      <a href="?q={encodeURIComponent(data.search)}&page={Math.max(1, data.currentPage - 1)}" class="btn-page" class:disabled={data.currentPage === 1}>⬅️ Anterior</a>
      <span>Página {data.currentPage} de {data.totalPages}</span>
      <a href="?q={encodeURIComponent(data.search)}&page={Math.min(data.totalPages, data.currentPage + 1)}" class="btn-page" class:disabled={data.currentPage === data.totalPages}>Siguiente ➡️</a>
    </div>
  {/if}
</main>

<style>
  .panel-modulo { max-width: 900px; margin: 2rem auto; font-family: sans-serif; padding: 10px; }
  .form-scaffold { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; background: #f4f4f5; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; }
  .field-group { display: flex; flex-direction: column; gap: .3rem; }
  input { padding: .5rem; border: 1px solid #ccc; border-radius: 4px; }
  .err { color: #ef4444; font-size: .8rem; }
  .msg-error { color: #ef4444; font-weight: bold; background: #fee2e2; padding: 0.5rem; border-radius: 4px;}
  .header-tabla { display: flex; justify-content: space-between; align-items: end; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem; }
  .buscador { display: flex; gap: 0.5rem; }
  .buscador input { padding: 0.4rem; border: 1px solid #ccc; border-radius: 4px; }
  .btn-clear { text-decoration: none; color: #ef4444; padding: 0.4rem; font-weight: bold; display: flex; align-items: center; justify-content: center; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
  th, td { text-align: left; padding: .75rem; border-bottom: 1px solid #e4e4e7; }
  th { background: #f4f4f5; }
  button { padding: .6rem 1rem; background: #0f172a; color: white; border: none; border-radius: 4px; cursor: pointer; }
  button:disabled { background: #cbd5e1; cursor: not-allowed; }
  .msg-success { color: #10b981; font-weight: bold; text-align: center; }
  .btn-del { background: #dc2626; padding: .4rem .8rem; font-size: .8rem; }
  .btn-edit { background: #f59e0b; padding: .4rem .8rem; font-size: .8rem; }
  .btn-cancel { background: #64748b; margin-left: 0.5rem; }
  .acciones-celda { display: flex; gap: 0.5rem; }
  .form-botones { grid-column: 1 / -1; display: flex; align-items: flex-end; }
  .paginacion { display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; padding: 1rem; background: #f8fafc; border-radius: 8px; }
  .btn-page { padding: 0.5rem 1rem; background: #e2e8f0; border-radius: 4px; text-decoration: none; color: #0f172a; font-weight: 500; }
  .btn-page.disabled { pointer-events: none; opacity: 0.4; }
</style>
`.trim();

// Escrbir los archivos del módulo frontend/backend
try {
    let archivosCreados = false;
    if (!fs.existsSync(carpetaRuta)) {
        fs.mkdirSync(carpetaRuta, { recursive: true });
        
        // ¡NUEVO! Escribimos el archivo de validaciones.ts
        fs.writeFileSync(path.join(carpetaRuta, 'validaciones.ts'), validacionesCode);
        fs.writeFileSync(path.join(carpetaRuta, '+page.server.ts'), plantillaServer);
        fs.writeFileSync(path.join(carpetaRuta, '+page.svelte'), plantillaSvelte);
        console.log(`  [App] ✅ Archivos de interfaz, API y Validaciones Zod creados en ${carpetaRuta}`);
        archivosCreados = true;
    } else {
        console.warn(`  [App] ⚠️  La ruta /${tablaPlural} ya existe. Saltando creación de archivos...`);
    }

    // ==========================================
    // PASO 4: MIGRACIÓN EN CALIENTE DE LA DB
    // ==========================================
    console.log(`  [DB] 🔨 Sincronizando base de datos local...`);
    execSync('npx drizzle-kit push', { stdio: 'inherit' });
    
    // Actualizar el menú de navegación para incluir el nuevo módulo
    console.log(`  [UI] 🔄 Actualizando menú de navegación...`);
    execSync('node actualizar-menu.js', { stdio: 'inherit' });

    console.log(`\n🎉 Proceso finalizado para el módulo "${tablaPlural}".`);

} catch (err) {
    console.error(`\n❌ Error general en la creación del módulo: ${err.message}`);
}