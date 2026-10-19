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

	onMount(() => {
		if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
			const updateVoices = () => {
				voices = window.speechSynthesis.getVoices();
				const esVoiceIndex = voices.findIndex(v => v.lang.startsWith('es'));
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
		}
	}

	function speakText() {
		if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
		if (!text) return;

		stopSpeech();

		const utterance = new SpeechSynthesisUtterance(text);
		if (voices[selectedVoiceIndex]) {
			utterance.voice = voices[selectedVoiceIndex];
		}
		utterance.rate = 1.0;
		utterance.pitch = 1.0;

		utterance.onstart = () => {
			isSpeaking = true;
			isPaused = false;
		};

		utterance.onend = () => {
			isSpeaking = false;
			isPaused = false;
		};

		utterance.onerror = () => {
			isSpeaking = false;
			isPaused = false;
		};

		window.speechSynthesis.speak(utterance);
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
			}, 300);
			return () => clearTimeout(timer);
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
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
						<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
						<path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
					</svg>
					<span class="pulsing-dot"></span>
				{:else if isPaused}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
						<path d="M15 9l5 3-5 3V9z"></path>
					</svg>
				{:else}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
						<path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
						<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
					</svg>
				{/if}
				<span class="narrator-label">{isSpeaking ? (isPaused ? 'Continuar' : 'Narrando...') : 'Escuchar'}</span>
			</button>
		</Motion>
	</div>
{/if}

<style>
	.narrator-widget {
		display: inline-flex;
		align-items: center;
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.narrator-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: rgba(25, 212, 168, 0.12);
		border: 1px solid rgba(25, 212, 168, 0.3);
		color: #19d4a8;
		padding: 6px 12px;
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.narrator-btn:hover {
		background: rgba(25, 212, 168, 0.25);
		border-color: rgba(25, 212, 168, 0.5);
	}

	.narrator-btn.is-speaking {
		background: rgba(25, 212, 168, 0.3);
		border-color: #19d4a8;
		animation: pulse-glow 1.5s infinite;
	}

	.pulsing-dot {
		width: 6px;
		height: 6px;
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
