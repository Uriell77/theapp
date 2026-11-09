<script lang="ts">
	import { supabase } from '$lib/supabaseClient';

	interface Props {
		isOpen: boolean;
		project: any;
		level: number;
		onUnlocked: (newMilestones: string[]) => void;
	}

	let { isOpen = $bindable(false), project, level, onUnlocked }: Props = $props();

	let logText = $state('');
	let selectedFile = $state<File | null>(null);
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	let canSubmit = $derived(logText.trim().length >= 50 && !isSubmitting);

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			selectedFile = target.files[0];
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSubmit) return;

		isSubmitting = true;
		errorMessage = null;

		try {
			let mediaUrl: string | null = null;

			// Subida de imagen a Supabase Storage (si se proporciona)
			if (selectedFile) {
				const fileExt = selectedFile.name.split('.').pop();
				const fileName = `${project.id}_lvl${level}_${Date.now()}.${fileExt}`;
				const { data: uploadData, error: uploadError } = await supabase.storage
					.from('MGAvatars')
					.upload(`bitacora/${fileName}`, selectedFile);

				if (!uploadError && uploadData) {
					const { data: publicUrlData } = supabase.storage
						.from('MGAvatars')
						.getPublicUrl(`bitacora/${fileName}`);
					mediaUrl = publicUrlData.publicUrl;
				}
			}

			// Inserción en la tabla project_logs y actualización del proyecto vía API interna
			const response = await fetch('/api/project-logs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					taskId: project.id,
					projectId: String(project.id),
					level,
					logText: logText.trim(),
					mediaUrl
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Error al guardar la bitácora');
			}

			const result = await response.json();

			// Actualizar localmente la fecha del nivel bloqueado
			const updatedMilestones: string[] = result.milestones || [...(project.milestones || [])];
			if (level < updatedMilestones.length) {
				updatedMilestones[level] = new Date().toISOString();
			} else {
				updatedMilestones.push(new Date().toISOString());
			}

			// Actualización reactiva y cierre del modal
			onUnlocked(updatedMilestones);
			logText = '';
			selectedFile = null;
			isOpen = false;
		} catch (err: any) {
			console.error('Error al desbloquear nivel:', err);
			errorMessage = err.message || 'Error inesperado al desbloquear el nivel';
		} finally {
			isSubmitting = false;
		}
	}
</script>

{#if isOpen}
<div class="columns is-centered is-mobile">
<div class="column is-full-mobile">
	<div class="modal is-active" style="position: fixed; inset: 0; z-index: 9999;">
		<div
			class="modal-background"
			role="button"
			tabindex="0"
			onclick={() => !isSubmitting && (isOpen = false)}
			onkeydown={(e) => {
				if ((e.key === 'Enter' || e.key === ' ') && !isSubmitting) isOpen = false;
			}}
		></div>
		<div
			class=" section modal-card has-background-dark"
			style="width: 100vw; height: 100vh; max-height: 100vh; margin: 0; border-radius: 0; display: flex; flex-direction: column;"
		>
			<header
				class="modal-card-head has-background-black-bis"
				style="border-radius: 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);"
			>
				<p class="modal-card-title has-text-white has-text-weight-bold">
					Bitácora de Desbloqueo - Capítulo {level + 1}
				</p>
				<button
					class="delete"
					type="button"
					aria-label="close"
					disabled={isSubmitting}
					onclick={() => (isOpen = false)}
				></button>
			</header>

			<section
				class="modal-card-body has-background-dark has-text-white"
				style="flex: 1; overflow-y: auto; padding: 1.5rem;"
			>
				{#if errorMessage}
					<div class="notification is-danger is-light mb-4">
						{errorMessage}
					</div>
				{/if}

				<div class="notification is-info is-light mb-4">
					<p class="is-size-7">
						🔒 <strong>Time-Gating Activo:</strong> Este nivel está programado para una fecha posterior.
						Registra tu bitácora de progreso con un mínimo de <strong>50 caracteres</strong> y foto para
						desbloquear el capítulo inmediatamente.
					</p>
				</div>

				<form id="bitacoraForm" onsubmit={handleSubmit}>
					<div class="field mb-5">
						<label class="label has-text-light" for="logTextArea">
							Reflexión o Evidencia del Nivel
							<span class="has-text-grey-light is-size-7">
								({logText.trim().length} / 50 caracteres requeridos)
							</span>
						</label>
						<div class="control">
							<textarea
								id="logTextArea"
								class="textarea has-background-black-ter has-text-white"
								rows="8"
								placeholder="Describe detalladamente qué acciones tomaste, qué aprendiste o los retos superados para completar este nivel..."
								bind:value={logText}
								disabled={isSubmitting}
								required
								style="border: 1px solid rgba(255, 255, 255, 0.2); font-family: inherit;"
							></textarea>
						</div>
					</div>

					<div class="field mb-5">
						<label class="label has-text-light" for="logMediaFile">
							Evidencia Visual (Cámara / Foto)
						</label>
						<div class="file has-name is-fullwidth">
							<label class="file-label" style="width: 100%;">
								<input
									id="logMediaFile"
									class="file-input"
									type="file"
									capture="environment"
									accept="image/*"
									onchange={handleFileChange}
									disabled={isSubmitting}
								/>
								<span class="file-cta has-background-black-ter has-text-light">
									<span class="file-icon">📷</span>
									<span class="file-label">Tomar foto o subir...</span>
								</span>
								<span class="file-name has-background-dark has-text-grey-light" style="flex: 1;">
									{selectedFile ? selectedFile.name : 'Ningún archivo seleccionado'}
								</span>
							</label>
						</div>
					</div>
				</form>
			</section>

			<footer
				class="modal-card-foot has-background-black-bis is-justify-content-flex-end"
				style="border-radius: 0; border-top: 1px solid rgba(255, 255, 255, 0.1);"
			>
				<button
					class="button is-ghost has-text-grey-light mr-3"
					type="button"
					disabled={isSubmitting}
					onclick={() => (isOpen = false)}
				>
					Cancelar
				</button>
				<button
					class="button is-primary"
					type="submit"
					form="bitacoraForm"
					disabled={!canSubmit}
					class:is-loading={isSubmitting}
				>
					Registrar y Desbloquear
				</button>
			</footer>
		</div>
	</div>
</div>
</div>
{/if}
