<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Motion } from 'svelte-motion';

	interface Props {
		text?: string;
		active?: boolean;
		autoPlay?: boolean;
	}

	let { text = '', active = false, autoPlay = true }: Props = $props();

	let isSpeaking = $state(false);
	let isPaused = $state(false);
	let voices = $state<SpeechSynthesisVoice[]>([]);
	let selectedVoiceIndex = $state(0);
	
	let currentUtterance: SpeechSynthesisUtterance | null = null;

	onMount(() => {
		if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
			const updateVoices = () => {
				voices = window.speechSynthesis.getVoices();
				const esVoiceIndex = voices.findIndex(v => v.lang.toLowerCase().includes('es'));
				if (esVoiceIndex !== -1) {
					selectedVoiceIndex = esVoiceIndex;
				}
			};
			updateVoices();
			window.speechSynthesis.onvoiceschanged = updateVoices;
		}
	});

	function stopSpeech() {
		if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
			window.speechSynthesis.cancel();
			isSpeaking = false;
			isPaused = false;
			currentUtterance = null;
		}
	}

	function speakText() {
		if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
		if (!text) return;

		stopSpeech();

		const cleanText = text.replace(/[*_#`]/g, '').trim();
		if (!cleanText) return;

		currentUtterance = new SpeechSynthesisUtterance(cleanText);
		currentUtterance.lang = 'es-ES';
		
		if (voices[selectedVoiceIndex]) {
			currentUtterance.voice = voices[selectedVoiceIndex];
		}
		currentUtterance.rate = 0.7;
		currentUtterance.pitch = 0.9;

		currentUtterance.onstart = () => {
			isSpeaking = true;
			isPaused = false;
		};

		currentUtterance.onend = () => {
			isSpeaking = false;
			isPaused = false;
			currentUtterance = null;
		};

		currentUtterance.onerror = (event) => {
			console.error('Error en síntesis de voz (TTS):', event);
			isSpeaking = false;
			isPaused = false;
			currentUtterance = null;
		};

		window.speechSynthesis.cancel();
		window.speechSynthesis.speak(currentUtterance);
	}

	function toggleSpeech() {
		if (!('speechSynthesis' in window)) return;
		if (isSpeaking) {
			if (isPaused) {
				window.speechSynthesis.resume();
				isPaused = false;
			} else {
				window.speechSynthesis.pause();
				isPaused = true;
			}
		} else {
			speakText();
		}
	}

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
	});
</script>

{#if text && typeof window !== 'undefined' && 'speechSynthesis' in window}
	<div class="narrator-widget">
		<Motion whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} let:motion>
			<button
				use:motion
				class="narrator-btn {isSpeaking && !isPaused ? 'is-speaking' : ''}"
				onclick={toggleSpeech}
				title={isSpeaking ? (isPaused ? 'Reanudar narración' : 'Pausar narración') : 'Narrar texto'}
				aria-label="Narrador de voz"
			>
				{#if isSpeaking && !isPaused}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
						<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
						<path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
					</svg>
					<span class="pulsing-dot"></span>
				{:else if isPaused}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
						<path d="M15 9l5 3-5 3V9z"></path>
					</svg>
				{:else}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
						<path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
						<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
					</svg>
				{/if}
				<span class="narrator-label">{isSpeaking ? (isPaused ? 'Continuar' : 'Narrando...') : 'VOZ'}</span>
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

	.narrator-btn:hover {
		background: rgba(10, 18, 25, 0.9);
		border-color: rgba(25, 212, 168, 0.6);
		color: #2ee6b8;
	}

	.narrator-btn.is-speaking {
		background: rgba(25, 212, 168, 0.2);
		border-color: #19d4a8;
		animation: pulse-glow 1.5s infinite;
	}

	.pulsing-dot {
		width: 5px;
		height: 5px;
		background-color: #19d4a8;
		border-radius: 50%;
		box-shadow: 0 0 6px #19d4a8;
		animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
	}

	@keyframes pulse-glow {
		0%, 100% { box-shadow: 0 0 0 0 rgba(25, 212, 168, 0.4); }
		50% { box-shadow: 0 0 0 6px rgba(25, 212, 168, 0); }
	}

	@keyframes ping {
		75%, 100% { transform: scale(2); opacity: 0; }
	}
</style>
