<script lang="ts">
	let { variant = 'hero' }: { variant?: 'hero' | 'auth' } = $props();

	const orbs =
		variant === 'hero'
			? [
					{ size: 420, x: '8%', y: '12%', color: 'rgba(25, 212, 168, 0.14)', dur: 14, delay: 0 },
					{ size: 300, x: '78%', y: '8%', color: 'rgba(138, 180, 255, 0.10)', dur: 18, delay: 3 },
					{ size: 360, x: '65%', y: '68%', color: 'rgba(25, 212, 168, 0.10)', dur: 16, delay: 6 }
				]
			: [
					{ size: 380, x: '18%', y: '20%', color: 'rgba(25, 212, 168, 0.16)', dur: 15, delay: 0 },
					{ size: 260, x: '70%', y: '58%', color: 'rgba(25, 212, 168, 0.10)', dur: 19, delay: 4 }
				];

	const particles = Array.from({ length: variant === 'hero' ? 18 : 12 }, (_, i) => ({
		left: (i * 53) % 100,
		top: (i * 37) % 100,
		size: 2 + (i % 3),
		dur: 8 + (i % 5) * 2,
		delay: (i % 7) * 1.3
	}));
</script>

<div class="bg-layer {variant}" aria-hidden="true">
	{#each orbs as orb}
		<span
			class="orb"
			style="width: {orb.size}px; height: {orb.size}px; left: {orb.x}; top: {orb.y};
				background: radial-gradient(circle, {orb.color} 0%, transparent 70%);
				animation-duration: {orb.dur}s; animation-delay: -{orb.delay}s;"
		></span>
	{/each}
	{#each particles as p}
		<span
			class="particle"
			style="left: {p.left}%; top: {p.top}%; width: {p.size}px; height: {p.size}px;
				animation-duration: {p.dur}s; animation-delay: -{p.delay}s;"
		></span>
	{/each}
</div>

<style>
	.bg-layer {
		position: fixed;
		inset: 0;
		z-index: -1;
		pointer-events: none;
		overflow: hidden;
	}

	.orb {
		position: absolute;
		border-radius: 50%;
		filter: blur(8px);
		will-change: transform;
		animation-name: orb-drift;
		animation-timing-function: ease-in-out;
		animation-iteration-count: infinite;
	}

	.particle {
		position: absolute;
		border-radius: 50%;
		background: rgba(25, 212, 168, 0.55);
		box-shadow: 0 0 6px rgba(25, 212, 168, 0.5);
		will-change: transform, opacity;
		animation-name: particle-float;
		animation-timing-function: ease-in-out;
		animation-iteration-count: infinite;
	}

	@keyframes orb-drift {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(40px, -30px) scale(1.08);
		}
		66% {
			transform: translate(-30px, 25px) scale(0.95);
		}
	}

	@keyframes particle-float {
		0%,
		100% {
			transform: translateY(0);
			opacity: 0.25;
		}
		50% {
			transform: translateY(-28px);
			opacity: 0.9;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.orb,
		.particle {
			animation: none;
		}
	}
</style>
