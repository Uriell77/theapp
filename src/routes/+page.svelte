<script lang="ts">
	import { Motion } from 'svelte-motion';

	let { data } = $props();
</script>

<svelte:head>
	<title>App Narrativa | Inicio</title>
</svelte:head>

<section class="hero is-medium">
	<div class="hero-body has-text-centered">
		<div class="container">
			<Motion
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				let:motion
			>
				<h1 use:motion class="title is-1 has-text-white mb-4">
					Generador de <span class="has-text-primary">Historias y Tareas</span>
				</h1>
			</Motion>

			<Motion
				initial={{ opacity: 0, y: 15 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.15 }}
				let:motion
			>
				<p use:motion class="subtitle is-4 has-text-grey-light mb-6">
					Transforma tus proyectos y tareas en aventuras narrativas interactivas impulsadas por
					Inteligencia Artificial.
				</p>
			</Motion>

			<Motion
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.4, delay: 0.3 }}
				let:motion
			>
				<div use:motion class="buttons is-centered">
					<Motion whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} let:motion>
						<a
							use:motion
							href="/dashboard"
							class="button is-primary is-medium is-rounded has-text-weight-bold"
						>
							Ir al Dashboard
						</a>
					</Motion>
					<Motion whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} let:motion>
						<a
							use:motion
							href="/auth"
							class="button is-light is-outlined is-medium is-rounded"
						>
							Iniciar Sesión / Registro
						</a>
					</Motion>
				</div>
			</Motion>
		</div>
	</div>
</section>

<div class="container pb-6 px-4">
	<div class="columns is-centered is-multiline">
		<div class="column is-4">
			<Motion
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				whileHover={{ y: -6, transition: { duration: 0.2 } }}
				transition={{ duration: 0.4, delay: 0.2 }}
				let:motion
			>
				<div use:motion class="box has-background-dark has-text-white feature-box p-5">
					<h3 class="title is-5 has-text-primary mb-2">🚀 Aventuras Gamificadas</h3>
					<p class="is-size-6 has-text-grey-lighter">
						Cada proyecto se convierte en una campaña dividida en capítulos secuenciales según la
						cantidad de niveles que elijas.
					</p>
				</div>
			</Motion>
		</div>
		<div class="column is-4">
			<Motion
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				whileHover={{ y: -6, transition: { duration: 0.2 } }}
				transition={{ duration: 0.4, delay: 0.3 }}
				let:motion
			>
				<div use:motion class="box has-background-dark has-text-white feature-box p-5">
					<h3 class="title is-5 has-text-info mb-2">🤖 Impulsado por Gemini</h3>
					<p class="is-size-6 has-text-grey-lighter">
						Generación contextual de narrativa para temáticas espaciales, medievales, zombis, agentes
						secretos y más.
					</p>
				</div>
			</Motion>
		</div>
		<div class="column is-4">
			<Motion
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				whileHover={{ y: -6, transition: { duration: 0.2 } }}
				transition={{ duration: 0.4, delay: 0.4 }}
				let:motion
			>
				<div use:motion class="box has-background-dark has-text-white feature-box p-5">
					<h3 class="title is-5 has-text-warning mb-2">⚡ Tiempo Real</h3>
					<p class="is-size-6 has-text-grey-lighter">
						Sincronización instantánea de proyectos y avances de nivel con Supabase y PostgreSQL.
					</p>
				</div>
			</Motion>
		</div>
	</div>

	{#if data?.users && data.users.length > 0}
		<div class="box has-background-dark has-text-white mt-5 p-4 community-box">
			<h4 class="is-size-6 has-text-weight-bold has-text-grey-light mb-2">
				Comunidad activa ({data.users.length} miembros):
			</h4>
			<div class="tags">
				{#each data.users as user}
					<span class="tag is-dark is-rounded">{user.nombre_de_usuario}</span>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.feature-box {
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		height: 100%;
	}
	.community-box {
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
	}
</style>
