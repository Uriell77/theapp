<script lang="ts">
	import { Motion } from 'svelte-motion';
	import AnimatedBackground from '$lib/components/AnimatedBackground.svelte';
	import HeroArt from '$lib/components/HeroArt.svelte';

	let { data } = $props();

	const features = [
		{
			icon: '🚀',
			accent: '#19d4a8',
			title: 'Aventuras Gamificadas',
			text: 'Cada proyecto se convierte en una campaña dividida en capítulos secuenciales según la cantidad de niveles que elijas.'
		},
		{
			icon: '🤖',
			accent: '#8ab4ff',
			title: 'Impulsado por Gemini',
			text: 'Generación contextual de narrativa para temáticas espaciales, medievales, zombis, agentes secretos y más.'
		},
		{
			icon: '⚡',
			accent: '#ffd166',
			title: 'Tiempo Real',
			text: 'Sincronización instantánea de proyectos y avances de nivel con Supabase y PostgreSQL.'
		}
	];
</script>

<svelte:head>
	<title>MetaphorGoals | Convierte tus tareas en aventuras</title>
</svelte:head>

<AnimatedBackground variant="hero" />

<div class="landing">
	<!-- HERO -->
	<section class="hero-section">
		<div class="hero-grid">
			<div class="hero-copy">
				<Motion
					initial={{ opacity: 0, y: -16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					let:motion
				>
					<span use:motion class="badge">✦ Generador de historias con IA</span>
				</Motion>

				<Motion
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.55, delay: 0.1 }}
					let:motion
				>
					<h1 use:motion class="hero-title">
						Generador de <span class="hero-accent">Historias y Tareas</span>
					</h1>
				</Motion>

				<Motion
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.22 }}
					let:motion
				>
					<p use:motion class="hero-subtitle">
						Transforma tus proyectos y tareas en aventuras narrativas interactivas impulsadas por
						Inteligencia Artificial.
					</p>
				</Motion>

				<Motion
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.4, delay: 0.34 }}
					let:motion
				>
					<div use:motion class="hero-actions">
						<Motion whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} let:motion>
							<a use:motion href="/dashboard" class="btn-primary"> Ir al Dashboard </a>
						</Motion>
						<Motion whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} let:motion>
							<a use:motion href="/auth" class="btn-outline"> Iniciar Sesión / Registro </a>
						</Motion>
					</div>
				</Motion>
			</div>

			<Motion
				initial={{ opacity: 0, x: 30, scale: 0.97 }}
				animate={{ opacity: 1, x: 0, scale: 1 }}
				transition={{ duration: 0.6, delay: 0.25 }}
				let:motion
			>
				<div use:motion class="hero-art-wrap">
					<HeroArt />
				</div>
			</Motion>
		</div>
	</section>

	<!-- FEATURES -->
	<section class="features-section">
		<h2 class="section-title">¿Por qué <span class="hero-accent">MetaphorGoals</span>?</h2>
		<div class="features-grid">
			{#each features as f, i (f.title)}
				<Motion
					initial={{ opacity: 0, y: 24 }}
					animate={{ opacity: 1, y: 0 }}
					whileHover={{ y: -6, transition: { duration: 0.2 } }}
					transition={{ duration: 0.45, delay: 0.15 + i * 0.12 }}
					let:motion
				>
					<article use:motion class="glass-panel feature-card" style="--card-accent: {f.accent}">
						<span class="feature-icon" aria-hidden="true">{f.icon}</span>
						<h3 class="feature-title">{f.title}</h3>
						<p class="feature-text">{f.text}</p>
					</article>
				</Motion>
			{/each}
		</div>
	</section>

	<!-- COMUNIDAD -->
	{#if data?.users && data.users.length > 0}
		<section class="community-section">
			<Motion
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.5 }}
				let:motion
			>
				<div use:motion class="glass-panel community-panel">
					<h4 class="community-title">
						<span class="pulse-dot" aria-hidden="true"></span>
						Comunidad activa ({data.users.length} miembros):
					</h4>
					<div class="community-tags">
						{#each data.users as user (user.id)}
							<span class="community-tag">{user.nombre_de_usuario}</span>
						{/each}
					</div>
				</div>
			</Motion>
		</section>
	{/if}

	<!-- CTA FINAL -->
	<section class="cta-section">
		<Motion
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay: 0.55 }}
			let:motion
		>
			<div use:motion class="glass-panel cta-banner">
				<h2 class="cta-title">¿Listo para comenzar tu aventura?</h2>
				<p class="cta-text">Crea tu cuenta y convierte tu primera tarea en una misión épica.</p>
				<Motion whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} let:motion>
					<a use:motion href="/auth" class="btn-primary btn-glow">Comenzar ahora</a>
				</Motion>
			</div>
		</Motion>
		<footer class="landing-footer">© {new Date().getFullYear()} MetaphorGoals</footer>
	</section>
</div>

<style>
	.landing {
		position: relative;
		overflow: hidden;
	}

	/* ---------- Hero ---------- */
	.hero-section {
		padding: 4.5rem 1.5rem 3rem;
		max-width: 1140px;
		margin: 0 auto;
	}

	.hero-grid {
		display: grid;
		grid-template-columns: 1.15fr 0.85fr;
		gap: 3rem;
		align-items: center;
	}

	.badge {
		display: inline-block;
		background: rgba(25, 212, 168, 0.12);
		border: 1px solid rgba(25, 212, 168, 0.35);
		color: var(--accent-primary);
		font-family: var(--font-modern-title);
		font-weight: 600;
		font-size: 0.85rem;
		padding: 0.35rem 0.9rem;
		border-radius: 999px;
		margin-bottom: 1.25rem;
	}

	.hero-title {
		font-family: var(--font-modern-title);
		font-size: clamp(2.2rem, 5vw, 3.4rem);
		font-weight: 800;
		line-height: 1.1;
		color: var(--text-main);
		margin: 0 0 1.1rem;
	}

	.hero-accent {
		color: var(--accent-primary);
		text-shadow: 0 0 26px rgba(25, 212, 168, 0.45);
	}

	.hero-subtitle {
		font-size: 1.15rem;
		line-height: 1.6;
		color: var(--text-muted);
		margin: 0 0 2rem;
		max-width: 34rem;
	}

	.hero-actions {
		display: flex;
		gap: 0.9rem;
		flex-wrap: wrap;
	}

	.btn-primary {
		display: inline-block;
		background: var(--accent-primary);
		color: #062b22;
		font-family: var(--font-modern-title);
		font-weight: 700;
		font-size: 1rem;
		padding: 0.85rem 1.9rem;
		border-radius: 999px;
		box-shadow: 0 8px 26px rgba(25, 212, 168, 0.35);
	}

	.btn-primary:hover {
		color: #062b22;
	}

	.btn-outline {
		display: inline-block;
		background: transparent;
		color: var(--text-main);
		font-family: var(--font-modern-title);
		font-weight: 600;
		font-size: 1rem;
		padding: 0.85rem 1.9rem;
		border-radius: 999px;
		border: 1px solid var(--card-border);
		transition:
			border-color 0.2s ease,
			background 0.2s ease;
	}

	.btn-outline:hover {
		border-color: rgba(25, 212, 168, 0.5);
		background: rgba(25, 212, 168, 0.08);
		color: var(--text-main);
	}

	.hero-art-wrap {
		perspective: 800px;
	}

	/* ---------- Features ---------- */
	.features-section {
		max-width: 1140px;
		margin: 0 auto;
		padding: 2rem 1.5rem 3.5rem;
	}

	.section-title {
		font-family: var(--font-modern-title);
		font-size: 1.9rem;
		font-weight: 700;
		text-align: center;
		color: var(--text-main);
		margin: 0 0 2rem;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.4rem;
	}

	.feature-card {
		padding: 1.9rem 1.6rem;
		min-height: 230px;
		border-radius: 20px;
		transition: border-color 0.25s ease;
	}

	.feature-card:hover {
		border-color: color-mix(in srgb, var(--card-accent) 45%, transparent);
	}

	.feature-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 52px;
		height: 52px;
		font-size: 1.5rem;
		border-radius: 14px;
		margin-bottom: 1rem;
		background: color-mix(in srgb, var(--card-accent) 16%, transparent);
		border: 1px solid color-mix(in srgb, var(--card-accent) 32%, transparent);
		box-shadow: 0 0 20px color-mix(in srgb, var(--card-accent) 22%, transparent);
	}

	.feature-title {
		font-family: var(--font-modern-title);
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--card-accent);
		margin: 0 0 0.5rem;
	}

	.feature-text {
		color: var(--text-muted);
		font-size: 0.95rem;
		line-height: 1.55;
		margin: 0;
	}

	/* ---------- Comunidad ---------- */
	.community-section {
		max-width: 900px;
		margin: 0 auto;
		padding: 0 1.5rem 1rem;
	}

	.community-panel {
		padding: 1.4rem 1.6rem;
		border-radius: 20px;
	}

	.community-title {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-family: var(--font-modern-title);
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-muted);
		margin: 0 0 0.9rem;
	}

	.pulse-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--accent-primary);
		box-shadow: 0 0 0 0 rgba(25, 212, 168, 0.6);
		animation: pulse-dot 2s ease-out infinite;
	}

	@keyframes pulse-dot {
		0% {
			box-shadow: 0 0 0 0 rgba(25, 212, 168, 0.55);
		}
		70% {
			box-shadow: 0 0 0 12px rgba(25, 212, 168, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(25, 212, 168, 0);
		}
	}

	.community-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.community-tag {
		background: rgba(25, 212, 168, 0.12);
		border: 1px solid rgba(25, 212, 168, 0.28);
		color: var(--accent-primary);
		font-size: 0.85rem;
		font-weight: 600;
		padding: 0.3rem 0.9rem;
		border-radius: 999px;
	}

	/* ---------- CTA final ---------- */
	.cta-section {
		max-width: 900px;
		margin: 0 auto;
		padding: 2.5rem 1.5rem 2rem;
		text-align: center;
	}

	.cta-banner {
		padding: 2.6rem 2rem;
		border-radius: 24px;
	}

	.cta-title {
		font-family: var(--font-modern-title);
		font-size: 1.8rem;
		font-weight: 800;
		color: var(--text-main);
		margin: 0 0 0.5rem;
	}

	.cta-text {
		color: var(--text-muted);
		margin: 0 0 1.6rem;
	}

	.landing-footer {
		margin-top: 2.5rem;
		color: var(--text-muted);
		font-size: 0.8rem;
	}

	/* ---------- Responsive ---------- */
	@media (max-width: 900px) {
		.hero-grid {
			grid-template-columns: 1fr;
			gap: 2.2rem;
		}

		.hero-copy {
			text-align: center;
		}

		.hero-subtitle {
			margin-inline: auto;
		}

		.hero-actions {
			justify-content: center;
		}

		.hero-art-wrap :global(.hero-art-frame) {
			max-width: 340px;
		}

		.features-grid {
			grid-template-columns: 1fr;
			max-width: 480px;
			margin: 0 auto;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pulse-dot {
			animation: none;
		}
	}
</style>
