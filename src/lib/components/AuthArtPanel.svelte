<script lang="ts">
	import AnimatedBackground from './AnimatedBackground.svelte';
</script>

<aside class="auth-art glass-panel" aria-hidden="true">
	<AnimatedBackground variant="auth" />

	<div class="auth-art-content">
		<img src="/MG_Logo.png" alt="" class="auth-logo" />
		<h2 class="auth-brand">MetaphorGoals</h2>
		<p class="auth-tagline">Convierte tus proyectos en aventuras narrativas</p>

		<svg viewBox="0 0 320 240" class="portal-svg">
			<defs>
				<radialGradient id="portalGlow" cx="0.5" cy="0.5" r="0.5">
					<stop offset="0" stop-color="#19d4a8" stop-opacity="0.55" />
					<stop offset="0.6" stop-color="#19d4a8" stop-opacity="0.16" />
					<stop offset="1" stop-color="#19d4a8" stop-opacity="0" />
				</radialGradient>
			</defs>

			<circle cx="160" cy="120" r="105" fill="url(#portalGlow)" class="portal-pulse" />
			<circle
				cx="160"
				cy="120"
				r="62"
				fill="none"
				stroke="#19d4a8"
				stroke-width="1.6"
				stroke-dasharray="6 10"
				class="portal-ring"
			/>
			<circle
				cx="160"
				cy="120"
				r="82"
				fill="none"
				stroke="#19d4a8"
				stroke-width="1"
				stroke-dasharray="3 14"
				opacity="0.5"
				class="portal-ring reverse"
			/>

			<!-- cerradura / keyhole -->
			<g fill="#0b1317" stroke="#19d4a8" stroke-width="1.4">
				<circle cx="160" cy="108" r="16" />
				<path d="M152 118 l-5 26 h26 l-5 -26 z" />
			</g>

			<!-- esquirlas de vidrio flotantes -->
			<g fill="rgba(255,255,255,0.09)" stroke="rgba(255,255,255,0.22)" stroke-width="0.7">
				<path d="M40 60 l16 -8 6 18 -18 6 z" class="shard" />
				<path d="M262 90 l18 -6 4 20 -19 4 z" class="shard d2" />
				<path d="M70 190 l14 -10 9 16 -16 8 z" class="shard d1" />
				<path d="M250 190 l16 -4 7 17 -17 6 z" class="shard d3" />
			</g>

			<!-- constelaciones -->
			<g fill="#dff5ee">
				<circle cx="52" cy="34" r="1.5" class="star" />
				<circle cx="88" cy="26" r="1.1" class="star d2" />
				<circle cx="236" cy="40" r="1.4" class="star d1" />
				<circle cx="286" cy="64" r="1.1" class="star d3" />
				<circle cx="30" cy="132" r="1.2" class="star d2" />
				<circle cx="292" cy="150" r="1.4" class="star" />
			</g>
			<path
				d="M52 34 L88 26 M236 40 L286 64"
				stroke="rgba(223,245,238,0.18)"
				stroke-width="0.8"
				fill="none"
			/>
		</svg>
	</div>
</aside>

<style>
	.auth-art {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0;
		min-height: 100%;
	}

	.auth-art-content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 2rem;
		max-width: 420px;
	}

	.auth-logo {
		width: 96px;
		height: 96px;
		object-fit: contain;
		filter: drop-shadow(0 0 18px rgba(25, 212, 168, 0.35));
		animation: logo-float 6s ease-in-out infinite;
	}

	.auth-brand {
		font-family: var(--font-modern-title);
		font-weight: 800;
		font-size: 2rem;
		color: var(--text-main);
		margin: 0.75rem 0 0.25rem;
		letter-spacing: 0.5px;
	}

	.auth-tagline {
		color: var(--text-muted);
		font-size: 1rem;
		margin: 0 0 1.5rem;
	}

	.portal-svg {
		width: min(320px, 90%);
		height: auto;
	}

	.portal-pulse {
		transform-origin: 160px 120px;
		animation: portal-pulse 4.5s ease-in-out infinite;
	}

	.portal-ring {
		transform-origin: 160px 120px;
		animation: spin 26s linear infinite;
	}

	.portal-ring.reverse {
		animation-duration: 34s;
		animation-direction: reverse;
	}

	.shard {
		animation: shard-float 8s ease-in-out infinite;
	}
	.d1 {
		animation-delay: -2s;
	}
	.d2 {
		animation-delay: -4s;
	}
	.d3 {
		animation-delay: -6s;
	}

	.star {
		animation: star-twinkle 3.2s ease-in-out infinite;
	}

	@keyframes logo-float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-8px);
		}
	}

	@keyframes portal-pulse {
		0%,
		100% {
			opacity: 0.7;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.07);
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes shard-float {
		0%,
		100% {
			transform: translateY(0) rotate(0deg);
		}
		50% {
			transform: translateY(-12px) rotate(6deg);
		}
	}

	@keyframes star-twinkle {
		0%,
		100% {
			opacity: 0.2;
		}
		50% {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.auth-logo,
		.portal-pulse,
		.portal-ring,
		.shard,
		.star {
			animation: none;
		}
	}
</style>
