import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const carpetaAuth = path.join('src', 'routes', 'auth');
const archivoSchema = path.join('src', 'lib', 'server', 'db', 'schema.ts');

if (!fs.existsSync(carpetaAuth)) fs.mkdirSync(carpetaAuth, { recursive: true });

// 1. Asegurar tabla en schema.ts
function asegurarTablaUsuarios() {
    let contenido = fs.readFileSync(archivoSchema, 'utf8');

    // Add Drizzle imports if not present
    if (!contenido.includes("from 'drizzle-orm/sqlite-core'")) {
        const imports = "import { sqliteTable, text } from 'drizzle-orm/sqlite-core';\n";
        contenido = imports + contenido;
    }

    if (!contenido.includes('export const usuarios =')) {
        const nuevaTabla = `
// Tabla de usuarios generada por generador-auth
export const usuarios = sqliteTable('usuarios', {
    id: text('id').primaryKey(),
    nombre_de_usuario: text('nombre_de_usuario'),
    email: text('email').unique().notNull(),
    password: text('password').notNull(),
    createdAt: text('created_at').$defaultFn(() => new Date().toISOString())
});
`;
        contenido += nuevaTabla; // Append to content
        fs.writeFileSync(archivoSchema, contenido); // Write updated content
        console.log("  [DB] ✅ Tabla 'usuarios' añadida al esquema.");
    } else {
        console.log("  [DB] ⚠️  La tabla 'usuarios' ya existía en el esquema. Saltando...");
    }
}

// 2. Generar archivo de validaciones con Zod
const validacionesCode = `
import { z } from 'zod';

export const esquemaRegistro = z.object({
    nombre_de_usuario: z.string().min(3, "El nombre de usuario es obligatorio y debe tener al menos 3 caracteres."),
    email: z.string().email("El email no es válido."),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
    confirmar_password: z.string().min(6, "La confirmación de contraseña debe tener al menos 6 caracteres.")
}).refine((data) => data.password === data.confirmar_password, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmar_password"],
});

export const esquemaLogin = z.object({
    email: z.string().email("El email no es válido."),
    password: z.string().min(1, "La contraseña es obligatoria.")
});
`;

// 2. Generar Backend
const serverCode = `
import { db } from '$lib/server/db';
import { usuarios } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import type { Actions } from './$types';
import { esquemaRegistro, esquemaLogin } from './validaciones'; // Import Zod schemas

export const actions: Actions = {
    registrar: async ({ request }) => {
        const formData = await request.formData();
        const dataRaw = Object.fromEntries(formData.entries());
        
        const validacion = esquemaRegistro.safeParse(dataRaw);
        if (!validacion.success) {
            const errors = validacion.error.flatten().fieldErrors;
            return fail(400, { 
                error: 'Error de validación', 
                errors: errors,
                data: dataRaw // Return data to pre-fill form
            });
        }

        const { email, password, nombre_de_usuario } = validacion.data;
        const passwordHash = await bcrypt.hash(password, 10);
        
        try {
            await db.insert(usuarios).values({ 
                id: crypto.randomUUID(), 
                email, 
                password: passwordHash,
                nombre_de_usuario
            });
        } catch (e) {
            return fail(400, { error: 'Error: El usuario ya existe o datos inválidos.' });
        }
        throw redirect(303, '/auth?login=true');
    },
    login: async ({ request, cookies }) => {
        const formData = await request.formData();
        const email = formData.get('email')?.toString() || '';
        const password = formData.get('password')?.toString() || '';
        const user = await db.select().from(usuarios).where(eq(usuarios.email, email)).get();
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return fail(400, { error: 'Credenciales incorrectas.' });
        }
        cookies.set('session', user.id, { path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 });
        throw redirect(303, '/dashboard');
    }
};
`;

// 3. Generar Frontend
const svelteCode = `
<script>
    import { page } from '$app/state';
    import { enhance } from '$app/forms';
    import { esquemaRegistro, esquemaLogin } from './validaciones';
    import type { ActionData } from './$types';

    let { form }: { form: ActionData } = $props();
    let esLogin = $state(page.url.searchParams.get('login') === 'true');

    let valores = $state({
        nombre_de_usuario: form?.data?.nombre_de_usuario || '',
        email: form?.data?.email || '',
        password: form?.data?.password || '',
        confirmar_password: form?.data?.confirmar_password || ''
    });

    // Reactive validation for registration form
    let erroresRegistro = $derived.by(() => {
        const validacion = esquemaRegistro.safeParse(valores);
        if (validacion.success) return {};
        return validacion.error.flatten().fieldErrors;
    });

    // Reactive validation for login form
    let erroresLogin = $derived.by(() => {
        const validacion = esquemaLogin.safeParse({ email: valores.email, password: valores.password });
        if (validacion.success) return {};
        return validacion.error.flatten().fieldErrors;
    });

    let bloqueadoRegistro = $derived(Object.keys(erroresRegistro).length > 0 || !valores.nombre_de_usuario || !valores.email || !valores.password);
    let bloqueadoLogin = $derived(Object.keys(erroresLogin).length > 0 || !valores.email || !valores.password);

    function resetForm() {
        valores = { nombre_de_usuario: '', email: '', password: '', confirmar_password: '' };
    }

    // Handle form submission success
    const handleEnhance = () => {
        return async ({ result, update }) => {
            if (result.type === 'success') {
                resetForm();
            }
            await update();
        };
    };
</script>

<div class="auth-container">
    <h1>{esLogin ? 'Iniciar Sesión' : 'Registro'}</h1>
    
    {#if form?.error}
        <p class="error">⚠️ {form.error}</p>
    {/if}

    {#if esLogin}
        <form method="POST" action="?/login" use:enhance={handleEnhance}>
            <div class="field-group">
                <label for="login-email">Correo</label>
                <input type="email" id="login-email" name="email" placeholder="correo@ejemplo.com" bind:value={valores.email} />
                {#if erroresLogin.email}
                    <span class="err">{erroresLogin.email[0]}</span>
                {/if}
            </div>
            <div class="field-group">
                <label for="login-password">Contraseña</label>
                <input type="password" id="login-password" name="password" placeholder="••••••••" bind:value={valores.password} />
                {#if erroresLogin.password}
                    <span class="err">{erroresLogin.password[0]}</span>
                {/if}
            </div>
            <button type="submit" disabled={bloqueadoLogin}>Entrar</button>
        </form>
    {:else}
        <form method="POST" action="?/registrar" use:enhance={handleEnhance}>
            <div class="field-group">
                <label for="registro-nombre_de_usuario">Nombre de usuario</label>
                <input type="text" id="registro-nombre_de_usuario" name="nombre_de_usuario" placeholder="Tu nombre de usuario" bind:value={valores.nombre_de_usuario} />
                {#if erroresRegistro.nombre_de_usuario}
                    <span class="err">{erroresRegistro.nombre_de_usuario[0]}</span>
                {/if}
            </div>
            <div class="field-group">
                <label for="registro-email">Correo</label>
                <input type="email" id="registro-email" name="email" placeholder="correo@ejemplo.com" bind:value={valores.email} />
                {#if erroresRegistro.email}
                    <span class="err">{erroresRegistro.email[0]}</span>
                {/if}
            </div>
            <div class="field-group">
                <label for="registro-password">Contraseña</label>
                <input type="password" id="registro-password" name="password" placeholder="••••••••" bind:value={valores.password} />
                {#if erroresRegistro.password}
                    <span class="err">{erroresRegistro.password[0]}</span>
                {/if}
            </div>
            <div class="field-group">
                <label for="registro-confirmar_password">Confirmar Contraseña</label>
                <input type="password" id="registro-confirmar_password" name="confirmar_password" placeholder="Repite tu contraseña" bind:value={valores.confirmar_password} />
                {#if erroresRegistro.confirmar_password}
                    <span class="err">{erroresRegistro.confirmar_password[0]}</span>
                {/if}
            </div>
            <button type="submit" disabled={bloqueadoRegistro}>Registrarme</button>
        </form>
    {/if}

    <button class="toggle" onclick={() => { esLogin = !esLogin; resetForm(); }}>
        {esLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
    </button>
</div>

<style>
    .auth-container {
        max-width: 400px;
        margin: 50px auto;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        text-align: center;
    }
    h1 {
        margin-bottom: 20px;
        color: #333;
    }
    .field-group {
        margin-bottom: 15px;
        text-align: left;
    }
    label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
        color: #555;
    }
    input[type="email"],
    input[type="password"],
    input[type="text"] {
        width: calc(100% - 22px); /* Adjust for padding and border */
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-sizing: border-box;
    }
    .err {
        color: #e74c3c;
        font-size: 0.85em;
        margin-top: 5px;
        display: block;
    }
    .error {
        color: #e74c3c;
        background-color: #fdd;
        border: 1px solid #fcc;
        padding: 10px;
        border-radius: 4px;
        margin-bottom: 15px;
    }
    button[type="submit"] {
        background-color: #007bff;
        color: white;
        padding: 10px 15px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1em;
        width: 100%;
        margin-top: 10px;
    }
    button[type="submit"]:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
    .toggle {
        background: none;
        border: none;
        color: #007bff;
        cursor: pointer;
        margin-top: 15px;
        font-size: 0.9em;
        text-decoration: underline;
    }
    .toggle:hover {
        color: #0056b3;
    }
</style>
`;

// Ejecución
try {
    asegurarTablaUsuarios();
    fs.writeFileSync(path.join(carpetaAuth, 'validaciones.ts'), validacionesCode); // Create validaciones.ts
    fs.writeFileSync(path.join(carpetaAuth, '+page.server.ts'), serverCode);
    fs.writeFileSync(path.join(carpetaAuth, '+page.svelte'), svelteCode);
    
    console.log("  [App] 🔨 Sincronizando base de datos...");
    execSync('npx drizzle-kit push', { stdio: 'inherit' });
    
    console.log("\n🎉 Módulo de Auth creado exitosamente en /auth");
} catch (err) {
    console.error("❌ Error en la generación:", err.message);
}
