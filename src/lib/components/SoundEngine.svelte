<script module lang="ts">
	import { supabase } from '$lib/supabaseClient';

	export const DEFAULT_BUCKET = 'MGSounds';

	/**
	 * Mapeo inteligente de atmósferas sonoras según los campos 'effect' y 'mood' de la tabla levels.
	 * Agrupa efectos y moods con coherencia acústica para que distintas cinemáticas
	 * compartan la misma pista de fondo cuando corresponda.
	 */
	export const ATMOSPHERE_TRACK_MAP: Record<string, string> = {
      // --- Prioridad por Moods narrativos ---
      'mood:defeat': 'The_Weight_of_the_Bow.mp3',      //[cite: 1]
      'mood:victory': 'The_Sovereign_s_Return.mp3',    //[cite: 1]
      'mood:boss-fight': 'Under_the_Iron_Stride.mp3',    //[cite: 1]

      // --- Atmósferas Espaciales / Sci-Fi ---
      'effect:space-cockpit': 'Before_the_Final_Breach.mp3', //[cite: 1]
      'effect:hyper-warp': 'Before_the_Final_Breach.mp3',     //[cite: 1]
      'effect:nebula-dust': 'Before_the_Final_Breach.mp3',    //[cite: 1]

      // --- Atmósfera Ciberpunk / Matrix ---
      'effect:data-matrix': 'Glass_and_Iron.mp3',       //[cite: 1]

      // --- Atmósferas Ígneas / Volcánicas ---
      'effect:fire-battle': 'The_Iron_Girders_Rest.mp3', //[cite: 1]
      'effect:volcano-embers': 'The_Iron_Girders_Rest.mp3', //[cite: 1]

      // --- Atmósferas Climáticas y Tormentas ---
      'effect:electric-storm': 'The_Unforgiving_Gale.mp3', //[cite: 1]
      'effect:toxic-rain': 'The_Unforgiving_Gale.mp3',     //[cite: 1]
      'effect:ash-storm': 'The_Unforgiving_Gale.mp3',      //[cite: 1]

      // --- Atmósfera Fría / Ventisca ---
      'effect:snow-blizzard': 'Beyond_the_Frozen_Rim.mp3', //[cite: 1]

      // --- Atmósferas Arcanas / Místicas ---
      'effect:magic-runes': 'Glass_Pendulum.mp3',       //[cite: 1]
      'effect:mind-waves': 'Glass_Pendulum.mp3',        //[cite: 1]

      // --- Atmósferas de Paz / Refugio / Epílogo ---
      'effect:peaceful-epilogue': 'Midnight_in_the_High_Sanctuary.mp3', //[cite: 1]
      'effect:safe-haven': 'Midnight_in_the_High_Sanctuary.mp3',        //[cite: 1]
      'effect:falling-leaves': 'Midnight_in_the_High_Sanctuary.mp3',    //[cite: 1]
      'effect:radiant-glow': 'Midnight_in_the_High_Sanctuary.mp3',      //[cite: 1]
      'effect:clear-sky': 'Midnight_in_the_High_Sanctuary.mp3',         //[cite: 1]

      // --- Atmósfera de Bosque Alienígena ---
      'effect:alien-forest': 'The_Iron_Labyrinth.mp3',    //[cite: 1]

      // --- Atmósfera de Sigilo / Infiltración ---
      'effect:stealth-infiltration': 'Midnight_Horizon.mp3', //[cite: 1]

      // --- Atmósferas de Horror / Subterráneas ---
      'effect:dark-cave': 'Hull_Breach_at_Sector_Nine.mp3', //[cite: 1]
      'effect:blood-drip': 'Hull_Breach_at_Sector_Nine.mp3', //[cite: 1]

      // --- Atmósfera Industrial / Alarmas ---
      'effect:industrial-alarm': 'The_Anvil_Chamber.mp3', //[cite: 1]

      // --- Energía Caótica ---
      'effect:chaos-energy': 'Sovereignty_in_Stone.mp3',   //[cite: 1]

      // --- Fallback estándar ---
      'default': 'Before_the_Final_Breach.mp3'          //[cite: 1]
};

	/**
	 * Determina la pista de audio a partir de effect y mood.
	 */
	export function resolveAtmosphereTrack(
		effect?: string,
		mood?: string,
		customMap?: Record<string, string>
	): string {
		const map = { ...ATMOSPHERE_TRACK_MAP, ...(customMap || {}) };
		const cleanEffect = (effect || '').trim().toLowerCase();
		const cleanMood = (mood || '').trim().toLowerCase();

		// 1. Regla directa combinada (ej: 'fire-battle:boss-fight')
		if (cleanEffect && cleanMood && map[`${cleanEffect}:${cleanMood}`]) {
			return map[`${cleanEffect}:${cleanMood}`];
		}

		// 2. Si es mood crítico (derrota o victoria), priorizar la emoción narrativa
		if (cleanMood === 'defeat' && map['mood:defeat']) return map['mood:defeat'];
		if (cleanMood === 'victory' && map['mood:victory']) return map['mood:victory'];
		if (cleanMood === 'boss-fight' && map['mood:boss-fight']) return map['mood:boss-fight'];

		// 3. Regla por efecto visual / atmósfera
		if (cleanEffect && map[`effect:${cleanEffect}`]) {
			return map[`effect:${cleanEffect}`];
		}

		// 4. Regla por mood genérico
		if (cleanMood && map[`mood:${cleanMood}`]) {
			return map[`mood:${cleanMood}`];
		}

		return map['default'] || 'ambient_default.mp3';
	}

	/**
	 * Obtiene la URL pública del archivo de audio alojado en el bucket de Supabase.
	 */
	export function getSupabaseAudioUrl(fileName: string, bucket = DEFAULT_BUCKET): string {
		try {
			const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
			return data?.publicUrl || '';
		} catch (err) {
			console.error(`[SoundEngine] Error obteniendo URL pública para "${fileName}" en "${bucket}":`, err);
			return '';
		}
	}
</script>

<script lang="ts">
	import { onMount, onDestroy, type Snippet } from 'svelte';

	interface Props {
		/** Campo 'effect' proveniente de la dinámica preprogramada de la tabla levels */
		effect?: string;
		/** Campo 'mood' proveniente de la dinámica preprogramada de la tabla levels */
		mood?: string;
		/** String completo de configuración visual (ej: "effect:space-cockpit;...;mood:intro") */
		effectConfig?: string;
		/** Objeto o JSON string de cinemática obtenido de level.cinematica[...] */
		cinematica?: string | { effect?: string; mood?: string; [key: string]: any } | null;
		/** Si el sound engine está activo (reproduce cuando está abierto, se detiene al cerrarse) */
		active?: boolean;
		/** Volumen deseado (0.0 a 1.0) */
		volume?: number;
		/** Nombre del bucket en Supabase Storage (por defecto 'MGSounds') */
		bucket?: string;
		/** Mapeo personalizado adicional de pistas */
		customTrackMap?: Record<string, string>;
		/** Si debe reproducir en bucle la atmósfera */
		loop?: boolean;
		/** Componente hijo a envolver (típicamente Visualizer) */
		children?: Snippet;
	}

	let {
		effect: effectProp = '',
		mood = '',
		effectConfig = '',
		cinematica = null,
		active = true,
		volume = $bindable(0.2),
		bucket = DEFAULT_BUCKET,
		customTrackMap,
		loop = true,
		showHud = true,
		inline = false,
		children
	}: Props = $props();

	// Extraer los campos effect y mood desde cualquier fuente proporcionada de la BD levels
	let parsedEffect = $derived.by(() => {
		if (effectProp) return effectProp;
		if (cinematica) {
			try {
				const obj = typeof cinematica === 'string' ? JSON.parse(cinematica) : cinematica;
				if (obj?.effect) return obj.effect;
			} catch {}
		}
		if (effectConfig) {
			const match = effectConfig.match(/effect:([^;]+)/);
			if (match?.[1]) return match[1].trim();
		}
		return 'space-cockpit';
	});

	let parsedMood = $derived.by(() => {
		if (mood) return mood;
		if (cinematica) {
			try {
				const obj = typeof cinematica === 'string' ? JSON.parse(cinematica) : cinematica;
				if (obj?.mood) return obj.mood;
			} catch {}
		}
		if (effectConfig) {
			const match = effectConfig.match(/mood:([^;]+)/);
			if (match?.[1]) return match[1].trim();
		}
		return 'intro';
	});

	// Determinar el nombre de archivo correspondiente a la atmósfera
	let currentTrackFileName = $derived(
		resolveAtmosphereTrack(parsedEffect, parsedMood, customTrackMap)
	);

	// Determinar la URL pública desde el bucket Supabase
	let currentAudioUrl = $derived(getSupabaseAudioUrl(currentTrackFileName, bucket));

	// Estado interno del reproductor de audio
	let audioElement: HTMLAudioElement | null = null;
	let isPlaying = $state(false);
	let isMuted = $state(false);
	let showVolume = $state(false);
	let hasError = $state(false);
	let fadeInterval: ReturnType<typeof setInterval> | null = null;
	let activePlayingFileName: string | null = null;

	// Iniciar preferencia de silencio guardada
	onMount(() => {
		if (typeof window !== 'undefined') {
			const savedMute = localStorage.getItem('mgsounds_ambient_muted');
			if (savedMute !== null) {
				isMuted = savedMute === 'true';
			}
			const savedVol = localStorage.getItem('mgsounds_ambient_volume');
			if (savedVol !== null) {
				volume = parseFloat(savedVol);
			}
		}
	});

	function clearFade() {
		if (fadeInterval) {
			clearInterval(fadeInterval);
			fadeInterval = null;
		}
	}

	function fadeIn(audio: HTMLAudioElement, targetVol: number, duration = 600) {
		clearFade();
		if (isMuted) {
			audio.volume = 0;
			return;
		}
		const steps = 15;
		const stepTime = duration / steps;
		const increment = targetVol / steps;
		audio.volume = 0;

		fadeInterval = setInterval(() => {
			if (!audio) {
				clearFade();
				return;
			}
			if (audio.volume + increment < targetVol) {
				audio.volume += increment;
			} else {
				audio.volume = targetVol;
				clearFade();
			}
		}, stepTime);
	}

	function fadeOut(audio: HTMLAudioElement, duration = 400, onComplete?: () => void) {
		clearFade();
		const steps = 10;
		const stepTime = duration / steps;
		const decrement = audio.volume / steps;

		fadeInterval = setInterval(() => {
			if (!audio) {
				clearFade();
				if (onComplete) onComplete();
				return;
			}
			if (audio.volume - decrement > 0.05) {
				audio.volume -= decrement;
			} else {
				audio.volume = 0;
				clearFade();
				try {
					audio.pause();
				} catch {}
				if (onComplete) onComplete();
			}
		}, stepTime);
	}

	function stopCurrentAudio(immediate = false) {
		clearFade();
		if (!audioElement) return;

		const audio = audioElement;
		if (immediate) {
			try {
				audio.pause();
				audio.currentTime = 0;
			} catch {}
			isPlaying = false;
			activePlayingFileName = null;
		} else {
			fadeOut(audio, 350, () => {
				isPlaying = false;
				activePlayingFileName = null;
			});
		}
	}

	function startTrack(url: string, fileName: string) {
		if (!url || typeof window === 'undefined') return;

		// Si ya está sonando la misma pista atmosférica (pistas repetidas entre cinemáticas), no reiniciar
		if (activePlayingFileName === fileName && audioElement && !audioElement.paused) {
			return;
		}

		clearFade();

		// Si había otra pista reproduciéndose, detenerla antes de cambiar
		if (audioElement) {
			try {
				audioElement.pause();
				audioElement.src = '';
			} catch {}
		}

		hasError = false;
		const audio = new Audio(url);
		audio.loop = loop;
		audio.preload = 'auto';
		audioElement = audio;
		activePlayingFileName = fileName;

		audio.onerror = () => {
			console.warn(`[SoundEngine] No se pudo cargar la pista "${fileName}" desde el bucket "${bucket}". Verifica que exista en Supabase Storage.`);
			hasError = true;
			isPlaying = false;
		};

		if (isMuted) {
			audio.volume = 0;
		}

		audio
			.play()
			.then(() => {
				isPlaying = true;
				fadeIn(audio, Math.max(0, Math.min(1, volume)), 700);
			})
			.catch((err) => {
				// Autoplay bloqueado por políticas del navegador hasta interacción del usuario
				console.info('[SoundEngine] Reproducción en espera de interacción:', err.message);
				isPlaying = false;
			});
	}

	// Efecto reactivo para controlar la reproducción según el estado 'active' y los campos de la cinemática
	$effect(() => {
		const shouldPlay = active;
		const trackUrl = currentAudioUrl;
		const trackFileName = currentTrackFileName;

		if (shouldPlay && trackUrl) {
			startTrack(trackUrl, trackFileName);
		} else {
			stopCurrentAudio();
		}
	});

	// Actualizar volumen si la prop de volumen cambia dinámicamente
	$effect(() => {
		if (audioElement && isPlaying && !isMuted) {
			audioElement.volume = Math.max(0, Math.min(1, volume));
		}
		if (typeof window !== 'undefined') {
			localStorage.setItem('mgsounds_ambient_volume', String(volume));
		}
	});

	function toggleMute() {
		isMuted = !isMuted;
		if (typeof window !== 'undefined') {
			localStorage.setItem('mgsounds_ambient_muted', String(isMuted));
		}
		if (audioElement) {
			if (isMuted) {
				audioElement.volume = 0;
			} else {
				fadeIn(audioElement, volume, 300);
				if (audioElement.paused && active) {
					audioElement.play().then(() => (isPlaying = true)).catch(() => {});
				}
			}
		}
	}

	onDestroy(() => {
		clearFade();
		if (audioElement) {
			try {
				audioElement.pause();
				audioElement.src = '';
			} catch {}
			audioElement = null;
		}
		isPlaying = false;
		activePlayingFileName = null;
	});
</script>

<div class="sound-engine-wrapper">
	<!-- Contenido envuelto (Visualizer) -->
	{@render children?.()}

	<!-- Control HUD sutil de atmósfera sonora -->
	{#if showHud}
		<div class="sound-engine-hud" class:inline-hud={inline} class:is-hidden-error={hasError} onmouseenter={() => showVolume = true} onmouseleave={() => showVolume = false} role="region" aria-label="Controles de audio">
			<div class="sound-controls-group" class:expanded={showVolume}>
				{#if showVolume}
					<div class="volume-slider-container">
						<input 
							type="range" 
							min="0" 
							max="1" 
							step="0.01" 
							bind:value={volume} 
							class="volume-slider"
							aria-label="Volumen"
						/>
					</div>
				{/if}
				<button
					type="button"
					class="sound-hud-badge"
					class:muted={isMuted}
					class:playing={isPlaying && !isMuted}
					onclick={toggleMute}
					title={isMuted ? 'Activar atmósfera sonora' : 'Silenciar atmósfera sonora'}
					aria-label={isMuted ? 'Activar atmósfera sonora' : 'Silenciar atmósfera sonora'}
				>
					{#if isMuted}
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<line x1="1" y1="1" x2="23" y2="23"></line>
							<path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
							<path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
							<line x1="12" y1="19" x2="12" y2="23"></line>
							<line x1="8" y1="23" x2="16" y2="23"></line>
						</svg>
					{:else}
						<div class="sound-waves">
							<span class="bar bar-1"></span>
							<span class="bar bar-2"></span>
							<span class="bar bar-3"></span>
						</div>
					{/if}
					<span class="hud-label">
						{isMuted ? 'MUTE' : (showVolume ? Math.round(volume * 100) + '%' : 'AUDIO')}
					</span>
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.sound-engine-wrapper {
		position: relative;
		width: 100%;
		display: block;
	}

	.sound-engine-hud {
		position: absolute;
		top: 18px;
		right: 14px;
		z-index: 20;
		pointer-events: auto;
		user-select: none;
	}

	.sound-engine-hud.inline-hud {
		position: static;
		top: auto;
		right: auto;
	}

	.sound-engine-hud.is-hidden-error {
		opacity: 0.3;
	}

	.sound-controls-group {
		display: flex;
		align-items: center;
		gap: 8px;
		background: rgba(10, 18, 25, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		padding: 4px;
		border-radius: 9999px;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.sound-controls-group.expanded {
		padding-left: 12px;
		background: rgba(10, 18, 25, 0.85);
		border-color: rgba(25, 212, 168, 0.3);
	}

	.volume-slider-container {
		width: 80px;
		display: flex;
		align-items: center;
		animation: slide-in 0.2s ease-out;
	}

	@keyframes slide-in {
		from { width: 0; opacity: 0; }
		to { width: 80px; opacity: 1; }
	}

	.volume-slider {
		-webkit-appearance: none;
		width: 100%;
		height: 4px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 2px;
		outline: none;
		cursor: pointer;
	}

	.volume-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 10px;
		height: 10px;
		background: var(--accent-primary, #19d4a8);
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 0 0 10px rgba(25, 212, 168, 0.5);
	}

	.sound-hud-badge {
		background: transparent;
		border: none;
		color: #e0f2fe;
		padding: 2px 8px;
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: inherit;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		cursor: pointer;
		transition: all 0.25s ease;
	}

	.sound-hud-badge:hover {
		color: var(--accent-primary, #19d4a8);
	}

	.sound-hud-badge.muted {
		color: #94a3b8;
	}

	.hud-label {
		text-transform: uppercase;
		font-size: 0.62rem;
		opacity: 0.85;
		min-width: 35px;
		text-align: left;
	}

	/* Animación de barras de audio estilo ecualizador futurista */
	.sound-waves {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		height: 12px;
		width: 10px;
	}

	.bar {
		display: block;
		width: 2px;
		background: var(--accent-primary, #19d4a8);
		border-radius: 1px;
	}

	.sound-hud-badge.playing .bar-1 {
		animation: pulse-wave 0.8s infinite ease-in-out alternate;
	}

	.sound-hud-badge.playing .bar-2 {
		animation: pulse-wave 0.6s infinite ease-in-out alternate 0.2s;
	}

	.sound-hud-badge.playing .bar-3 {
		animation: pulse-wave 1s infinite ease-in-out alternate 0.4s;
	}

	.sound-hud-badge:not(.playing) .bar {
		height: 3px;
		opacity: 0.4;
	}

	@keyframes pulse-wave {
		0% {
			height: 3px;
		}
		100% {
			height: 12px;
		}
	}
</style>
