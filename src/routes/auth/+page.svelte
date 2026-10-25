<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { Motion } from 'svelte-motion';
	import { esquemaRegistro, esquemaLogin } from './validaciones';
	import AuthArtPanel from '$lib/components/AuthArtPanel.svelte';
	import AnimatedBackground from '$lib/components/AnimatedBackground.svelte';
	import type { ActionData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { fade } from 'svelte/transition';

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

	let bloqueadoRegistro = $derived(
		Object.keys(erroresRegistro).length > 0 ||
			!valores.nombre_de_usuario ||
			!valores.email ||
			!valores.password
	);
	let bloqueadoLogin = $derived(
		Object.keys(erroresLogin).length > 0 || !valores.email || !valores.password
	);

	let touched = $state(new Set<string>());

	function resetForm() {
		valores = { nombre_de_usuario: '', email: '', password: '', confirmar_password: '' };
		touched.clear();
		touched = touched;
	}

	function marcarTocado(campo: string) {
		touched.add(campo);
		touched = touched;
	}

	function errorDe(campo: string, errores: Record<string, string[] | undefined>): string | null {
		return touched.has(campo) ? (errores[campo]?.[0] ?? null) : null;
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

<AnimatedBackground variant="auth" />

<div class="auth-split">
	<AuthArtPanel />

	<main class="auth-right">
		<Motion
			initial={{ opacity: 0, y: 24 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.45 }}
			let:motion
		>
			<div use:motion class="glass-panel auth-card">
				<h1 class="auth-title">{esLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</h1>
				<p class="auth-subtitle">
					{esLogin
						? 'Retoma tus aventuras donde las dejaste'
						: 'Empieza a convertir tus tareas en historias'}
				</p>

				{#if form?.error}
					<p class="form-alert" role="alert" aria-live="polite">⚠️ {form.error}</p>
				{/if}

				{#key esLogin}
					<div class="form-body" transition:fade={{ duration: 200 }}>
						{#if esLogin}
							<form method="POST" action="?/login" use:enhance={handleEnhance}>
								<div class="field-group">
									<label for="login-email">Correo</label>
									<input
										type="email"
										id="login-email"
										name="email"
										placeholder="correo@ejemplo.com"
										bind:value={valores.email}
										onblur={() => marcarTocado('email')}
									/>
									{#if errorDe('email', erroresLogin)}
										<span class="err">{errorDe('email', erroresLogin)}</span>
									{/if}
								</div>
								<div class="field-group">
									<label for="login-password">Contraseña</label>
									<input
										type="password"
										id="login-password"
										name="password"
										placeholder="••••••••"
										bind:value={valores.password}
										onblur={() => marcarTocado('password')}
									/>
									{#if errorDe('password', erroresLogin)}
										<span class="err">{errorDe('password', erroresLogin)}</span>
									{/if}
								</div>
								<Motion
									whileHover={!bloqueadoLogin ? { scale: 1.02 } : {}}
									whileTap={!bloqueadoLogin ? { scale: 0.98 } : {}}
									let:motion
								>
									<button use:motion type="submit" disabled={bloqueadoLogin}>Entrar</button>
								</Motion>
							</form>
						{:else}
							<form method="POST" action="?/registrar" use:enhance={handleEnhance}>
								<div class="field-group">
									<label for="registro-nombre_de_usuario">Nombre de usuario</label>
									<input
										type="text"
										id="registro-nombre_de_usuario"
										name="nombre_de_usuario"
										placeholder="Tu nombre de usuario"
										bind:value={valores.nombre_de_usuario}
									/>
									{#if erroresRegistro.nombre_de_usuario}
										<span class="err">{erroresRegistro.nombre_de_usuario[0]}</span>
									{/if}
								</div>
								<div class="field-group">
									<label for="registro-email">Correo</label>
									<input
										type="email"
										id="registro-email"
										name="email"
										placeholder="correo@ejemplo.com"
										bind:value={valores.email}
									/>
									{#if erroresRegistro.email}
										<span class="err">{erroresRegistro.email[0]}</span>
									{/if}
								</div>
								<div class="field-group">
									<label for="registro-password">Contraseña</label>
									<input
										type="password"
										id="registro-password"
										name="password"
										placeholder="••••••••"
										bind:value={valores.password}
									/>
									{#if erroresRegistro.password}
										<span class="err">{erroresRegistro.password[0]}</span>
									{/if}
								</div>
								<div class="field-group">
									<label for="registro-confirmar_password">Confirmar Contraseña</label>
									<input
										type="password"
										id="registro-confirmar_password"
										name="confirmar_password"
										placeholder="Repite tu contraseña"
										bind:value={valores.confirmar_password}
									/>
									{#if erroresRegistro.confirmar_password}
										<span class="err">{erroresRegistro.confirmar_password[0]}</span>
									{/if}
								</div>
								<Motion
									whileHover={!bloqueadoRegistro ? { scale: 1.02 } : {}}
									whileTap={!bloqueadoRegistro ? { scale: 0.98 } : {}}
									let:motion
								>
									<button use:motion type="submit" disabled={bloqueadoRegistro}>
										Registrarme
									</button>
								</Motion>
							</form>
						{/if}

						<button
							class="toggle"
							onclick={() => {
								esLogin = !esLogin;
								resetForm();
							}}
						>
							{esLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
						</button>
					</div>
				{/key}
			</div>
		</Motion>
	</main>
</div>

<style>
	.auth-split {
		display: grid;
		grid-template-columns: 1fr 1fr;
		min-height: 100vh;
		gap: 2rem;
		padding: 1rem;
		align-items: center;
	}

	.auth-right {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
	}

	.auth-card {
		width: 100%;
		max-width: 420px;
		padding: 2.25rem 2rem;
		margin: 0 auto;
	}

	.auth-title {
		font-family: var(--font-modern-title);
		font-size: 1.7rem;
		font-weight: 700;
		color: var(--text-main);
		text-align: center;
		margin: 0;
	}

	.auth-subtitle {
		color: var(--text-muted);
		text-align: center;
		margin: 0.35rem 0 1.5rem;
		font-size: 0.95rem;
	}

	.form-alert {
		background: rgba(231, 102, 102, 0.12);
		border: 1px solid rgba(231, 102, 102, 0.35);
		color: #f2a0a0;
		padding: 0.7rem 0.9rem;
		border-radius: 12px;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}

	.field-group {
		margin-bottom: 1rem;
		text-align: left;
	}

	label {
		display: block;
		margin-bottom: 0.35rem;
		font-weight: 600;
		font-size: 0.85rem;
		color: var(--text-muted);
		font-family: var(--font-modern-title);
	}

	input[type='email'],
	input[type='password'],
	input[type='text'] {
		width: 100%;
		padding: 0.75rem 0.95rem;
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid var(--card-border);
		border-radius: 12px;
		box-sizing: border-box;
		color: var(--text-main);
		font-size: 0.95rem;
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;
	}

	input::placeholder {
		color: rgba(154, 166, 173, 0.6);
	}

	input:focus {
		outline: none;
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 3px rgba(25, 212, 168, 0.15);
	}

	.err {
		color: #f2a0a0;
		font-size: 0.8rem;
		margin-top: 0.3rem;
		display: block;
	}

	button[type='submit'] {
		background: var(--accent-primary);
		color: #062b22;
		padding: 0.8rem 1.2rem;
		border: none;
		border-radius: 14px;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 700;
		font-family: var(--font-modern-title);
		width: 100%;
		margin-top: 0.5rem;
		box-shadow: 0 6px 20px rgba(25, 212, 168, 0.3);
	}

	button[type='submit']:disabled {
		background: #2a3b45;
		color: var(--text-muted);
		box-shadow: none;
		opacity: 0.55;
		cursor: not-allowed;
	}

	.toggle {
		background: none;
		border: none;
		color: var(--accent-primary);
		cursor: pointer;
		margin-top: 1.25rem;
		font-size: 0.9rem;
		display: block;
		width: 100%;
		text-align: center;
	}

	.toggle:hover {
		text-decoration: underline;
	}

	.toggle:focus-visible,
	button[type='submit']:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 3px;
	}

	@media (max-width: 768px) {
		.auth-split {
			grid-template-columns: 1fr;
			gap: 0;
			padding: 0;
			min-height: 100dvh;
			align-items: stretch;
		}

		.auth-split :global(.auth-art) {
			min-height: 190px;
			padding: 1rem;
			border-radius: 0 0 24px 24px;
		}

		.auth-split :global(.auth-art) :global(.portal-svg) {
			display: none;
		}

		.auth-split :global(.auth-art) :global(.auth-logo) {
			width: 64px;
			height: 64px;
		}

		.auth-split :global(.auth-art) :global(.auth-brand) {
			font-size: 1.3rem;
		}

		.auth-split :global(.auth-art) :global(.auth-tagline) {
			margin-bottom: 0;
			font-size: 0.85rem;
		}

		.auth-right {
			padding: 1.25rem 1rem 2rem;
		}
	}
</style>
