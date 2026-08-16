
<script lang="ts">
    import { page } from '$app/state';
    import { enhance } from '$app/forms';
    import { esquemaRegistro, esquemaLogin } from './validaciones';
    import type { ActionData } from './$types';
    import type { SubmitFunction } from '@sveltejs/kit';

    let { form }: { form: ActionData } = $props();
    let esLogin = $state(page.url.searchParams.get('login') === 'true');

    let valores = $state({
        nombre_de_usuario: '',
        email: '',
        password: '',
        confirmar_password: ''
    });

    // Synchronize form errors/data with state. 
    // This effect is intentional for form pre-filling based on server responses.
    $effect(() => {
        const formData = (form as any)?.data;
        if (formData) {
            valores.nombre_de_usuario = formData.nombre_de_usuario || '';
            valores.email = formData.email || '';
            valores.password = formData.password || '';
            valores.confirmar_password = formData.confirmar_password || '';
        }
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
    const handleEnhance: SubmitFunction = () => {
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
