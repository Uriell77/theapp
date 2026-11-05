<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Motion } from 'svelte-motion';

	interface Props {
		text?: string;
		active?: boolean;
		autoPlay?: boolean;
	}

	let { text = '', active = false, autoPlay = true }: Props = $props();

	// Estados
	let isLoading = $state(false);
	let isSpeaking = $state(false);
	let isPaused = $state(false);
	let hasError = $state(false);
	/** true cuando Gemini falló por quota y se está usando el motor del navegador */
	let usingFallback = $state(false);

	// ─── Audio (Gemini) ────────────────────────────────────────────────────────
	let audioEl: HTMLAudioElement | null = null;
	let currentObjectUrl: string | null = null;

	function revokeUrl() {
		if (currentObjectUrl) {
			URL.revokeObjectURL(currentObjectUrl);
			currentObjectUrl = null;
		}
	}

	function stopGeminiAudio() {
		if (audioEl) {
			audioEl.pause();
			audioEl.src = '';
			audioEl = null;
		}
		revokeUrl();
	}

	// ─── Fallback: Web Speech API del navegador ────────────────────────────────
	let voices = $state<SpeechSynthesisVoice[]>([]);
	let browserUtterance: SpeechSynthesisUtterance | null = null;

	function loadVoices() {
		if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
		voices = window.speechSynthesis.getVoices();
		window.speechSynthesis.onvoiceschanged = () => {
			voices = window.speechSynthesis.getVoices();
		};
	}

	function stopBrowserTTS() {
		if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
			window.speechSynthesis.cancel();
		}
		browserUtterance = null;
	}

	function speakWithBrowser(rawText: string) {
		if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
			hasError = true;
			isLoading = false;
			return;
		}

		stopBrowserTTS();

		const cleanText = rawText.replace(/[*_#`~]/g, '').trim();
		if (!cleanText) return;

		browserUtterance = new SpeechSynthesisUtterance(cleanText);
		browserUtterance.lang = 'es-ES';
		browserUtterance.rate = 0.75;
		browserUtterance.pitch = 1.0;

		// Preferir voz en español si existe
		const esVoice = voices.find((v) => v.lang.toLowerCase().startsWith('es'));
		if (esVoice) browserUtterance.voice = esVoice;

		browserUtterance.onstart = () => {
			isSpeaking = true;
			isPaused = false;
			isLoading = false;
		};
		browserUtterance.onend = () => {
			isSpeaking = false;
			isPaused = false;
			browserUtterance = null;
		};
		browserUtterance.onerror = () => {
			isSpeaking = false;
			isPaused = false;
			hasError = true;
			browserUtterance = null;
		};

		window.speechSynthesis.cancel();
		window.speechSynthesis.speak(browserUtterance);
	}

	// ─── Control principal ─────────────────────────────────────────────────────
	function stopSpeech() {
		stopGeminiAudio();
		stopBrowserTTS();
		isSpeaking = false;
		isPaused = false;
		isLoading = false;
	}

	async function speakText() {
		if (!text) return;

		stopSpeech();
		hasError = false;
		isLoading = true;

		try {
			const res = await fetch('/api/tts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text })
			});

			// Quota / rate-limit agotada → fallback al navegador
			if (res.status === 429) {
				console.warn('[Narrador] Quota de Gemini agotada. Usando TTS del navegador.');
				usingFallback = true;
				isLoading = false;
				speakWithBrowser(text);
				return;
			}

			if (!res.ok) {
				throw new Error(`Error ${res.status}: ${await res.text()}`);
			}

			usingFallback = false;
			const blob = await res.blob();
			currentObjectUrl = URL.createObjectURL(blob);
			audioEl = new Audio(currentObjectUrl);

			audioEl.onplay = () => {
				isSpeaking = true;
				isPaused = false;
				isLoading = false;
			};
			audioEl.onpause = () => {
				isPaused = true;
			};
			audioEl.onended = () => {
				isSpeaking = false;
				isPaused = false;
				revokeUrl();
				audioEl = null;
			};
			audioEl.onerror = () => {
				console.error('[Narrador] Error reproduciendo el audio de Gemini.');
				hasError = true;
				stopSpeech();
			};

			await audioEl.play();
		} catch (err) {
			console.error('[Narrador] Error al obtener TTS de Gemini:', err);
			hasError = true;
			isLoading = false;
		}
	}

	function toggleSpeech() {
		if (isLoading) return;

		if (isSpeaking) {
			if (usingFallback) {
				// Fallback: pausa/reanuda con Web Speech API
				if (isPaused) {
					window.speechSynthesis.resume();
					isPaused = false;
				} else {
					window.speechSynthesis.pause();
					isPaused = true;
				}
			} else {
				// Gemini: pausa/reanuda con HTMLAudioElement
				if (isPaused) {
					audioEl?.play();
					isPaused = false;
				} else {
					audioEl?.pause();
					isPaused = true;
				}
			}
		} else {
			speakText();
		}
	}

	onMount(() => loadVoices());

	// Auto-play cuando el panel se abre o el texto cambia
	$effect(() => {
		if (active && autoPlay && text) {
			const timer = setTimeout(() => {
				speakText();
			}, 400);
			return () => {
				clearTimeout(timer);
				stopSpeech();
			};
		} else if (!active) {
			stopSpeech();
		}
	});

	onDestroy(() => {
		stopSpeech();
		stopBrowserTTS();
	});

	// Etiqueta del botón
	let label = $derived(
		isLoading
			? 'Generando...'
			: isSpeaking
				? isPaused
					? 'Continuar'
					: usingFallback
						? 'Narrando...'
						: 'Narrando...'
				: hasError
					? 'Reintentar'
					: 'VOZ'
	);

	let title = $derived(
		isLoading
			? 'Generando audio con Gemini…'
			: isSpeaking
				? isPaused
					? 'Reanudar narración'
					: usingFallback
						? 'Pausar narración (motor del navegador)'
						: 'Pausar narración'
				: usingFallback
					? 'Narrar con motor del navegador (quota de Gemini agotada)'
					: 'Narrar texto con IA'
	);
</script>

{#if text}
	<div class="narrator-widget">
		<Motion whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} let:motion>
			<button
				use:motion
				class="narrator-btn {isSpeaking && !isPaused ? 'is-speaking' : ''} {isLoading
					? 'is-loading'
					: ''} {hasError ? 'has-error' : ''} {usingFallback ? 'is-fallback' : ''}"
				onclick={toggleSpeech}
				disabled={isLoading}
				{title}
				aria-label="Narrador de voz IA"
			>
				{#if isLoading}
					<!-- Spinner -->
					<svg
						class="spin"
						width="13"
						height="13"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
					>
						<path d="M21 12a9 9 0 1 1-6.219-8.56" />
					</svg>
				{:else if isSpeaking && !isPaused}
					<!-- Icono parlante + dot pulsante -->
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
						<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
						<path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
					</svg>
					<span class="pulsing-dot"></span>
				{:else if isPaused}
					<!-- Icono pausa / reanudar -->
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
						<path d="M15 9l5 3-5 3V9z"></path>
					</svg>
				{:else if hasError}
					<!-- Icono de error / reintentar -->
					<svg
						width="13"
						height="13"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="12" y1="8" x2="12" y2="12"></line>
						<line x1="12" y1="16" x2="12.01" y2="16"></line>
					</svg>
				{:else}
					<!-- Icono normal (voz off) -->
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
						<path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
						<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
					</svg>
					<!-- Insignia IA o BROWSER segun el motor activo -->
					<span class="ai-badge {usingFallback ? 'ai-badge--browser' : ''}"
						>{usingFallback ? 'BRW' : 'AI'}</span
					>
				{/if}

				<span class="narrator-label">{label}</span>
			</button>
		</Motion>
	</div>
{/if}

<style>
	.narrator-widget {
		display: inline-flex;
		align-items: center;
	}

	.narrator-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: rgba(10, 18, 25, 0.75);
		border: 1px solid rgba(25, 212, 168, 0.35);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		color: #19d4a8;
		padding: 4px 12px;
		border-radius: 9999px;
		font-family: inherit;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		cursor: pointer;
		transition: all 0.25s ease;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.narrator-btn:disabled {
		cursor: not-allowed;
		opacity: 0.8;
	}

	.narrator-btn:hover:not(:disabled) {
		background: rgba(10, 18, 25, 0.9);
		border-color: rgba(25, 212, 168, 0.6);
		color: #2ee6b8;
	}

	.narrator-btn.is-speaking {
		background: rgba(25, 212, 168, 0.2);
		border-color: #19d4a8;
		animation: pulse-glow 1.5s infinite;
	}

	.narrator-btn.is-loading {
		border-color: rgba(25, 212, 168, 0.5);
		background: rgba(25, 212, 168, 0.08);
	}

	.narrator-btn.has-error {
		border-color: rgba(255, 90, 90, 0.5);
		color: #ff7070;
		background: rgba(255, 60, 60, 0.08);
	}

	/* Dot pulsante durante narración */
	.pulsing-dot {
		width: 5px;
		height: 5px;
		background-color: #19d4a8;
		border-radius: 50%;
		box-shadow: 0 0 6px #19d4a8;
		animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
	}

	/* Insignia IA pequeña */
	.ai-badge {
		font-size: 0.55rem;
		font-weight: 900;
		letter-spacing: 0.03em;
		background: rgba(25, 212, 168, 0.18);
		border: 1px solid rgba(25, 212, 168, 0.4);
		border-radius: 4px;
		padding: 0px 3px;
		line-height: 1.4;
	}

	/* Variante fallback: color naranja/ámbar para indicar que usa el motor del navegador */
	.ai-badge--browser {
		background: rgba(255, 180, 50, 0.18);
		border-color: rgba(255, 180, 50, 0.45);
		color: #ffb432;
	}

	/* Spinner rotation */
	.spin {
		animation: rotate 0.9s linear infinite;
	}

	@keyframes rotate {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes pulse-glow {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(25, 212, 168, 0.4);
		}
		50% {
			box-shadow: 0 0 0 6px rgba(25, 212, 168, 0);
		}
	}

	@keyframes ping {
		75%,
		100% {
			transform: scale(2);
			opacity: 0;
		}
	}
</style>
