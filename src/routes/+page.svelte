<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>App Narrativa | Inicio</title>
</svelte:head>

<section class="hero is-medium">
	<div class="hero-body has-text-centered">
		<div class="container">
			<h1 class="title is-1 has-text-white mb-4">
				Generador de <span class="has-text-primary">Historias y Tareas</span>
			</h1>
			<p class="subtitle is-4 has-text-grey-light mb-6">
				Transforma tus proyectos y tareas en aventuras narrativas interactivas impulsadas por
				Inteligencia Artificial.
			</p>
			<div class="buttons is-centered">
				<a href="/dashboard" class="button is-primary is-medium is-rounded has-text-weight-bold">
					Ir al Dashboard
				</a>
				<a href="/auth" class="button is-light is-outlined is-medium is-rounded">
					Iniciar Sesión / Registro
				</a>
			</div>
		</div>
	</div>
</section>

<div class="container pb-6 px-4">
	<div class="columns is-centered is-multiline">
		<div class="column is-4">
			<div class="box has-background-dark has-text-white feature-box p-5">
				<h3 class="title is-5 has-text-primary mb-2">🚀 Aventuras Gamificadas</h3>
				<p class="is-size-6 has-text-grey-lighter">
					Cada proyecto se convierte en una campaña dividida en capítulos secuenciales según la
					cantidad de niveles que elijas.
				</p>
			</div>
		</div>
		<div class="column is-4">
			<div class="box has-background-dark has-text-white feature-box p-5">
				<h3 class="title is-5 has-text-info mb-2">🤖 Impulsado por Gemini</h3>
				<p class="is-size-6 has-text-grey-lighter">
					Generación contextual de narrativa para temáticas espaciales, medievales, zombis, agentes
					secretos y más.
				</p>
			</div>
		</div>
		<div class="column is-4">
			<div class="box has-background-dark has-text-white feature-box p-5">
				<h3 class="title is-5 has-text-warning mb-2">⚡ Tiempo Real</h3>
				<p class="is-size-6 has-text-grey-lighter">
					Sincronización instantánea de proyectos y avances de nivel con Supabase y PostgreSQL.
				</p>
			</div>
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
