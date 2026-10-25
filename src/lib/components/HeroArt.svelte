<script lang="ts">
	// Arte decorativo del hero: héroe en una encrucijada con 4 caminos hacia mundos de aventura.
</script>

<div class="hero-art-frame glass-panel">
	<svg viewBox="0 0 480 560" role="img" aria-labelledby="heroArtTitle" class="hero-art">
		<title id="heroArtTitle">
			Ilustración: un héroe frente a cuatro caminos luminosos que llevan al espacio, un castillo
			medieval, un bosque encantado y una ciudad de espías.
		</title>
		<defs>
			<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stop-color="#0d1418" />
				<stop offset="0.6" stop-color="#141f25" />
				<stop offset="1" stop-color="#1a2a30" />
			</linearGradient>
			<radialGradient id="glow" cx="0.5" cy="0.72" r="0.55">
				<stop offset="0" stop-color="#19d4a8" stop-opacity="0.35" />
				<stop offset="1" stop-color="#19d4a8" stop-opacity="0" />
			</radialGradient>
			<linearGradient id="pathGrad" x1="0" y1="1" x2="0" y2="0">
				<stop offset="0" stop-color="#19d4a8" stop-opacity="0.9" />
				<stop offset="1" stop-color="#19d4a8" stop-opacity="0.15" />
			</linearGradient>
		</defs>

		<rect width="480" height="560" fill="url(#sky)" />
		<rect width="480" height="560" fill="url(#glow)" />

		<!-- estrellas -->
		<g fill="#dff5ee">
			<circle cx="60" cy="60" r="1.4" opacity="0.8" class="twinkle" />
			<circle cx="150" cy="40" r="1" opacity="0.5" class="twinkle d1" />
			<circle cx="300" cy="70" r="1.6" opacity="0.7" class="twinkle d2" />
			<circle cx="410" cy="45" r="1.1" opacity="0.6" class="twinkle" />
			<circle cx="230" cy="110" r="1" opacity="0.4" class="twinkle d3" />
			<circle cx="440" cy="150" r="1.3" opacity="0.6" class="twinkle d1" />
			<circle cx="40" cy="180" r="1" opacity="0.5" class="twinkle d2" />
		</g>

		<!-- mundo espacial: nave sobre nebulosa -->
		<g class="world">
			<ellipse cx="95" cy="115" rx="55" ry="26" fill="#1e3a44" opacity="0.55" />
			<circle cx="70" cy="100" r="14" fill="#223f4a" />
			<ellipse
				cx="95"
				cy="115"
				rx="34"
				ry="8"
				fill="none"
				stroke="#19d4a8"
				stroke-width="1.6"
				opacity="0.7"
			/>
			<path d="M118 128 l26 -10 -6 14 z" fill="#2a4a55" stroke="#19d4a8" stroke-width="1" />
		</g>

		<!-- mundo medieval: castillo en acantilado -->
		<g class="world">
			<path d="M330 150 h90 v40 q-45 18 -90 0 z" fill="#16242b" />
			<g fill="#22353e" stroke="#19d4a8" stroke-width="0.8" stroke-opacity="0.6">
				<rect x="345" y="108" width="14" height="46" />
				<rect x="368" y="96" width="16" height="58" />
				<rect x="393" y="108" width="14" height="46" />
			</g>
			<path
				d="M345 108 l7 -12 7 12 M368 96 l8 -14 8 14 M393 108 l7 -12 7 12"
				fill="none"
				stroke="#19d4a8"
				stroke-width="1.4"
			/>
			<rect x="371" y="122" width="10" height="16" rx="5" fill="#0e1a1f" />
			<rect
				x="373"
				y="127"
				width="6"
				height="11"
				fill="#19d4a8"
				opacity="0.85"
				class="window-flicker"
			/>
		</g>

		<!-- mundo zombi: bosque brumoso -->
		<g class="world">
			<g stroke="#1d333c" stroke-width="4" fill="none" stroke-linecap="round">
				<path d="M40 330 v-52 m0 14 l-14 -14 m14 4 l14 -16" />
				<path d="M75 336 v-62 m0 16 l-15 -14 m15 5 l15 -17" />
				<path d="M110 330 v-48 m0 12 l-12 -12 m12 3 l12 -14" />
			</g>
			<ellipse cx="75" cy="336" rx="72" ry="14" fill="#19d4a8" opacity="0.08" />
			<ellipse cx="60" cy="318" rx="60" ry="10" fill="#27454f" opacity="0.35" />
		</g>

		<!-- mundo espía: skyline de ciudad -->
		<g class="world">
			<g fill="#1b2c34">
				<rect x="360" y="290" width="24" height="60" />
				<rect x="390" y="262" width="20" height="88" />
				<rect x="416" y="300" width="26" height="50" />
			</g>
			<g fill="#19d4a8" opacity="0.75">
				<rect x="365" y="298" width="4" height="4" class="window-flicker" />
				<rect x="375" y="312" width="4" height="4" />
				<rect x="395" y="272" width="4" height="4" class="window-flicker d2" />
				<rect x="401" y="296" width="4" height="4" />
				<rect x="423" y="310" width="4" height="4" class="window-flicker d1" />
			</g>
			<line x1="400" y1="262" x2="400" y2="240" stroke="#19d4a8" stroke-width="1.2" />
			<circle cx="400" cy="238" r="2.4" fill="#19d4a8" class="twinkle" />
		</g>

		<!-- caminos luminosos desde la encrucijada -->
		<g fill="none" stroke="url(#pathGrad)" stroke-linecap="round">
			<path d="M240 470 C 180 400, 130 300, 100 150" stroke-width="3" class="path-flow" />
			<path d="M240 470 C 300 400, 360 300, 385 175" stroke-width="3" class="path-flow d1" />
			<path d="M240 470 C 200 440, 130 400, 80 342" stroke-width="2.4" class="path-flow d2" />
			<path d="M240 470 C 290 450, 370 410, 405 356" stroke-width="2.4" class="path-flow d3" />
		</g>

		<!-- colina y héroe -->
		<ellipse cx="240" cy="482" rx="120" ry="18" fill="#19d4a8" opacity="0.10" />
		<path d="M150 500 q90 -34 180 0 v60 h-180 z" fill="#101a1e" />
		<g fill="#060d10">
			<circle cx="240" cy="428" r="9" />
			<path d="M232 436 h16 l4 30 h-9 l-3 -12 -3 12 h-9 z" />
		</g>
		<line x1="256" y1="424" x2="256" y2="470" stroke="#19d4a8" stroke-width="2.4" />
		<circle cx="256" cy="421" r="3.4" fill="#19d4a8" class="twinkle" />
	</svg>
</div>

<style>
	.hero-art-frame {
		padding: 0;
		border-radius: 24px;
		max-width: 440px;
		margin: 0 auto;
		animation: hero-float 6s ease-in-out infinite;
	}

	.hero-art {
		display: block;
		width: 100%;
		height: auto;
		border-radius: inherit;
	}

	.twinkle {
		animation: twinkle 3s ease-in-out infinite;
	}
	.d1 {
		animation-delay: -0.8s;
	}
	.d2 {
		animation-delay: -1.6s;
	}
	.d3 {
		animation-delay: -2.3s;
	}

	.path-flow {
		stroke-dasharray: 10 14;
		animation: path-flow 2.6s linear infinite;
	}

	.window-flicker {
		animation: flicker 4s steps(2, jump-none) infinite;
	}

	.world {
		animation: world-bob 7s ease-in-out infinite;
	}

	@keyframes twinkle {
		0%,
		100% {
			opacity: 0.25;
		}
		50% {
			opacity: 1;
		}
	}

	@keyframes path-flow {
		to {
			stroke-dashoffset: -48;
		}
	}

	@keyframes flicker {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 0.95;
		}
	}

	@keyframes world-bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-5px);
		}
	}

	@keyframes hero-float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-9px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-art-frame,
		.twinkle,
		.path-flow,
		.window-flicker,
		.world {
			animation: none;
		}
	}
</style>
