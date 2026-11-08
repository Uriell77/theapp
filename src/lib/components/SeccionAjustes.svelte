<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Motion } from 'svelte-motion';
	import { playClick } from '$lib/audio';

	let { user }: { user: any } = $props();

	let nombreDeUsuario = $state('');
	let email = $state('');
	let aliado = $state('');
	let password = $state('');
	let showPassword = $state(false);

	let previewAvatarUrl = $state<string | null>(null);
	let avatarFileInput = $state<HTMLInputElement | null>(null);
	let isUploadingAvatar = $state(false);
	let isSavingProfile = $state(false);
	let isCopiedId = $state(false);

	let successMessage = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);

	$effect(() => {
		if (user) {
			nombreDeUsuario = user.nombre_de_usuario || '';
			email = user.email || '';
			aliado = user.aliados || '';
		}
	});

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			const file = target.files[0];
			if (previewAvatarUrl && previewAvatarUrl.startsWith('blob:')) {
				URL.revokeObjectURL(previewAvatarUrl);
			}
			previewAvatarUrl = URL.createObjectURL(file);
		}
	}

	function triggerFileInput() {
		playClick();
		avatarFileInput?.click();
	}

	async function copyUserId() {
		playClick();
		if (user?.id) {
			try {
				await navigator.clipboard.writeText(user.id);
				isCopiedId = true;
				setTimeout(() => {
					isCopiedId = false;
				}, 2000);
			} catch (err) {
				console.error('No se pudo copiar el ID:', err);
			}
		}
	}

	function formatDate(rawDate?: string | Date | null) {
		if (!rawDate) return 'Sin fecha';
		try {
			const date = new Date(rawDate);
			return new Intl.DateTimeFormat('es-ES', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			}).format(date);
		} catch {
			return String(rawDate);
		}
	}
</script>

<div class="ajustes-container">
	<!-- Mensajes de Estado -->
	{#if successMessage}
		<Motion initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} let:motion>
			<div use:motion class="notification-badge is-success mb-4">
				<div class="is-flex is-align-items-center gap-2">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
						<polyline points="22 4 12 14.01 9 11.01"></polyline>
					</svg>
					<span>{successMessage}</span>
				</div>
				<button type="button" class="close-badge-btn" onclick={() => (successMessage = null)}>×</button>
			</div>
		</Motion>
	{/if}

	{#if errorMessage}
		<Motion initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} let:motion>
			<div use:motion class="notification-badge is-error mb-4">
				<div class="is-flex is-align-items-center gap-2">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="12" y1="8" x2="12" y2="12"></line>
						<line x1="12" y1="16" x2="12.01" y2="16"></line>
					</svg>
					<span>{errorMessage}</span>
				</div>
				<button type="button" class="close-badge-btn" onclick={() => (errorMessage = null)}>×</button>
			</div>
		</Motion>
	{/if}

	<!-- Tarjeta de Perfil y Ajustes -->
	<div class="glass-panel p-4 mb-5">
		<!-- Subsección Avatar -->
		<div class="avatar-header-row mb-4">
			<div class="avatar-preview-box">
				<figure class="image is-60x60">
					<img
						src={previewAvatarUrl || user?.avatarUrl || '/emptyavatar.avif'}
						alt="Avatar del usuario"
						class="avatar-circle-img"
						onerror={(e) => {
							const target = e.currentTarget as HTMLImageElement;
							if (target.src !== '/emptyavatar.avif') {
								target.src = '/emptyavatar.avif';
							}
						}}
					/>
				</figure>
				<button
					type="button"
					class="avatar-pencil-btn"
					onclick={triggerFileInput}
					title="Cambiar foto de perfil"
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
						<circle cx="12" cy="13" r="4"></circle>
					</svg>
				</button>
			</div>

			<div class="avatar-details">
				<h3 class="has-text-white has-text-weight-bold" style="font-size: 1.15rem; margin: 0;">
					{user?.nombre_de_usuario || 'Usuario'}
				</h3>
				<p class="is-hidden"style="color: var(--text-muted); font-size: 0.82rem; margin: 2px 0 10px 0;">
					Avatar guardado en <strong style="color: var(--accent-primary);">MGAvatars</strong>
				</p>

				<div class="is-flex is-align-items-center gap-2 flex-wrap">
					<!-- Formulario de subida de avatar -->
					<form
						method="POST"
						action="?/uploadAvatar"
						enctype="multipart/form-data"
						use:enhance={() => {
							isUploadingAvatar = true;
							errorMessage = null;
							return async ({ update, result }) => {
								isUploadingAvatar = false;
								if (result.type === 'success') {
									successMessage = (result.data as any)?.message || '¡Avatar actualizado!';
									await invalidateAll();
								} else if (result.type === 'failure') {
									errorMessage = (result.data as any)?.message || 'Error al subir imagen';
								}
								await update();
							};
						}}
					>
						<input
							bind:this={avatarFileInput}
							type="file"
							name="avatar"
							accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
							class="is-hidden"
							onchange={(e) => {
								handleFileSelect(e);
								const formEl = (e.target as HTMLInputElement).form;
								if (formEl) formEl.requestSubmit();
							}}
						/>
						<Motion whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} let:motion>
							<button
								use:motion
								type="button"
								onclick={triggerFileInput}
								disabled={isUploadingAvatar}
								class="btn-avatar-action"
							>
								{#if isUploadingAvatar}
									Subiendo a MGAvatars...
								{:else}
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
										<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
										<polyline points="17 8 12 3 7 8"></polyline>
										<line x1="12" y1="3" x2="12" y2="15"></line>
									</svg>
									Subir imagen
								{/if}
							</button>
						</Motion>
					</form>

					{#if user?.avatarUrl}
						<form
							method="POST"
							action="?/deleteAvatar"
							use:enhance={() => {
								return async ({ update, result }) => {
									if (result.type === 'success') {
										previewAvatarUrl = null;
										successMessage = 'Avatar eliminado correctamente';
										await invalidateAll();
									}
									await update();
								};
							}}
						>
							<button type="submit" class="btn-avatar-delete" title="Eliminar avatar">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<polyline points="3 6 5 6 21 6"></polyline>
									<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
								</svg>
							</button>
						</form>
					{/if}
				</div>
			</div>
		</div>

		<hr class="mt-6" style="border: 0; border-top: 1px solid var(--card-border); margin: 18px 0;" />

		<!-- Formulario de Datos de Usuario -->
		<form
			method="POST"
			action="?/updateProfile"
			use:enhance={() => {
				isSavingProfile = true;
				errorMessage = null;
				successMessage = null;
				return async ({ update, result }) => {
					isSavingProfile = false;
					if (result.type === 'success') {
						successMessage = (result.data as any)?.message || '¡Cambios guardados con éxito!';
						password = '';
						await invalidateAll();
					} else if (result.type === 'failure') {
						errorMessage = (result.data as any)?.message || 'Ocurrió un error al guardar';
					}
					await update();
				};
			}}
		>
			<!-- ID de Usuario -->
			<div class="field mb-4 is-hidden">
				<div class="is-flex is-justify-content-space-between is-align-items-center mb-1">
					<label for="uid" class="custom-label">ID de Usuario</label>
					<button type="button" class="btn-copy-link" onclick={copyUserId}>
						{#if isCopiedId}
							<span style="color: var(--accent-primary);">✓ Copiado</span>
						{:else}
							<span>Copiar ID</span>
						{/if}
					</button>
				</div>
				<input
					id="uid"
					type="text"
					value={user?.id || ''}
					readonly
					class="custom-input readonly"
				/>
			</div>

			<!-- Nombre de Usuario -->
			<div class="field mb-4">
				<label for="username" class="custom-label">Nombre</label>
				<input
					id="username"
					type="text"
					name="nombre_de_usuario"
					bind:value={nombreDeUsuario}
					placeholder="Tu nombre o apodo"
					required
					class="custom-input"
				/>
			</div>

			<!-- Correo Electrónico -->
			<div class="field mb-4">
				<label for="userEmail" class="custom-label">Correo Electrónico</label>
				<input
					id="userEmail"
					type="email"
					name="email"
					bind:value={email}
					placeholder="ejemplo@correo.com"
					required
					class="custom-input"
				/>
			</div>

			<!-- Aliado en las Historias -->
			<div class="field mb-4 ally-card-field">
				<div class="is-flex is-justify-content-space-between is-align-items-center mb-1">
					<label for="allyName" class="custom-label ally-title">
						🛡️ Compañero Aliado
					</label>
					<span class="badge-tag">Narrativa IA</span>
				</div>
				<input
					id="allyName"
					type="text"
					name="aliado"
					bind:value={aliado}
					placeholder="Ej: Diana, Aragorn, Sam, Copiloto Alex..."
					class="custom-input ally-input"
				/>
				<p class="helper-text mt-2">
					Este nombre se almacenará en la columna <code style="color: var(--accent-primary);">aliados</code> de la base de datos y la IA lo incluirá en cada capítulo de tus tareas narrativas como tu aliado principal de soporte.
				</p>
			</div>

			<!-- Fecha de Registro -->
			<div class="field mb-4">
				<label for="regDate" class="custom-label">Fecha de Registro</label>
				<input
					id="regDate"
					type="text"
					value={formatDate(user?.createdAt)}
					readonly
					class="custom-input readonly"
				/>
			</div>

			<!-- Contraseña Nueva Opcional -->
			<div class="field mb-4">
				<div class="is-flex is-justify-content-space-between is-align-items-center mb-1">
					<label for="pwd" class="custom-label">Nueva Contraseña (Opcional)</label>
					<button
						type="button"
						class="btn-copy-link"
						onclick={() => (showPassword = !showPassword)}
					>
						{showPassword ? 'Ocultar' : 'Mostrar'}
					</button>
				</div>
				{#if showPassword}
					<input
						id="pwd"
						type="text"
						name="password"
						bind:value={password}
						placeholder="Dejar en blanco para conservar actual"
						class="custom-input"
					/>
				{:else}
					<input
						id="pwd"
						type="password"
						name="password"
						bind:value={password}
						placeholder="Dejar en blanco para conservar actual"
						class="custom-input"
					/>
				{/if}
			</div>

			<!-- Botón Guardar -->
			<div class="mt-5">
				<Motion whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} let:motion>
					<button
						use:motion
						type="submit"
						onclick={playClick}
						disabled={isSavingProfile}
						class="btn-primary w-100"
						style="width: 100%; padding: 12px; font-weight: 700;"
					>
						{#if isSavingProfile}
							Guardando ajustes...
						{:else}
							Guardar Cambios de Perfil
						{/if}
					</button>
				</Motion>
			</div>
		</form>
	</div>
</div>

<style>
	.ajustes-container {
		width: 100%;
		max-width: 680px;
		margin: 0 auto;
	}

	.notification-badge {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		border-radius: 12px;
		font-size: 0.85rem;
		font-weight: 600;
	}
	.notification-badge.is-success {
		background: rgba(25, 212, 168, 0.15);
		border: 1px solid rgba(25, 212, 168, 0.35);
		color: #19d4a8;
	}
	.notification-badge.is-error {
		background: rgba(255, 75, 75, 0.15);
		border: 1px solid rgba(255, 75, 75, 0.35);
		color: #ff6b6b;
	}
	.close-badge-btn {
		background: transparent;
		border: none;
		color: inherit;
		cursor: pointer;
		font-size: 1.2rem;
		line-height: 1;
		padding: 0 4px;
	}

	.avatar-header-row {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.avatar-preview-box {
		position: relative;
		width: 68px;
		height: 68px;
		flex-shrink: 0;
	}

	.avatar-img-wrap {
		width: 68px;
		height: 68px;
		border-radius: 50%;
		overflow: hidden;
		margin: 0;
		border: 2px solid rgba(255, 255, 255, 0.15);
		background: #142127;
	}

	.avatar-circle-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-pencil-btn {
		position: absolute;
		bottom: -35px;
		right: -2px;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: var(--accent-primary);
		color: #062b22;
		border: 2px solid #0d171b;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: transform 0.2s;
	}
	.avatar-pencil-btn:hover {
		transform: scale(1.1);
	}

	.avatar-details {
		flex: 1;
		min-width: 0;
	}

	.btn-avatar-action {
		background: rgba(25, 212, 168, 0.12);
		border: 1px solid rgba(25, 212, 168, 0.3);
		color: var(--accent-primary);
		padding: 6px 12px;
		border-radius: 10px;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
	}
	.btn-avatar-action:hover {
		background: rgba(25, 212, 168, 0.22);
	}

	.btn-avatar-delete {
		background: rgba(255, 75, 75, 0.12);
		border: 1px solid rgba(255, 75, 75, 0.25);
		color: #ff6b6b;
		padding: 6px 10px;
		border-radius: 10px;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
	}
	.btn-avatar-delete:hover {
		background: rgba(255, 75, 75, 0.22);
	}

	.custom-label {
		display: block;
		color: var(--text-muted);
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.custom-input {
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid var(--card-border);
		color: white;
		border-radius: 14px;
		padding: 11px 15px;
		font-family: inherit;
		font-size: 0.92rem;
		width: 100%;
		box-sizing: border-box;
		transition: border-color 0.2s;
	}
	.custom-input:focus {
		outline: none;
		border-color: var(--accent-primary);
		box-shadow: 0 0 6px rgba(25, 212, 168, 0.35);
	}
	.custom-input.readonly {
		background: rgba(0, 0, 0, 0.15);
		color: #8fa0a8;
		cursor: default;
	}

	.btn-copy-link {
		background: transparent;
		border: none;
		color: var(--accent-primary);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		padding: 0;
	}

	.ally-card-field {
		background: rgba(25, 212, 168, 0.04);
		border: 1px dashed rgba(25, 212, 168, 0.25);
		border-radius: 14px;
		padding: 12px;
	}

	.ally-title {
		color: var(--accent-primary);
		font-weight: 700;
	}

	.badge-tag {
		background: rgba(25, 212, 168, 0.15);
		color: var(--accent-primary);
		font-size: 0.68rem;
		font-weight: 700;
		padding: 2px 8px;
		border-radius: 8px;
		text-transform: uppercase;
	}

	.helper-text {
		color: var(--text-muted);
		font-size: 0.76rem;
		line-height: 1.35;
		margin: 0;
	}
</style>
