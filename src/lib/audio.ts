/**
 * Elegant and subtle procedural sound effects using Web Audio API.
 * Zero external asset dependencies, ultra-low latency, and finely tuned acoustics.
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

// Initialize preference from localStorage if in browser
if (typeof window !== 'undefined') {
	const saved = localStorage.getItem('sound_effects_enabled');
	if (saved !== null) {
		soundEnabled = saved === 'true';
	}
}

function getAudioContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (!audioCtx) {
		const AudioContextClass =
			window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		if (AudioContextClass) {
			audioCtx = new AudioContextClass();
		}
	}
	if (audioCtx && audioCtx.state === 'suspended') {
		audioCtx.resume().catch(() => {});
	}
	return audioCtx;
}

export function isSoundEnabled(): boolean {
	return soundEnabled;
}

export function toggleSound(): boolean {
	soundEnabled = !soundEnabled;
	if (typeof window !== 'undefined') {
		localStorage.setItem('sound_effects_enabled', String(soundEnabled));
	}
	if (soundEnabled) {
		playPop();
	}
	return soundEnabled;
}

/**
 * Subtle button click / tap sound (soft refined mechanical micro-click)
 */
export function playClick(): void {
	if (!soundEnabled) return;
	const ctx = getAudioContext();
	if (!ctx) return;

	try {
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(600, now);
		osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);

		gain.gain.setValueAtTime(0.05, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start(now);
		osc.stop(now + 0.045);
	} catch {}
}

/**
 * Soft pop sound for selections / modal open / switch
 */
export function playPop(): void {
	if (!soundEnabled) return;
	const ctx = getAudioContext();
	if (!ctx) return;

	try {
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(440, now);
		osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);

		gain.gain.setValueAtTime(0.06, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start(now);
		osc.stop(now + 0.055);
	} catch {}
}

/**
 * Gentle sliding panel open sound (soft ascending whoosh)
 */
export function playOpen(): void {
	if (!soundEnabled) return;
	const ctx = getAudioContext();
	if (!ctx) return;

	try {
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		const filter = ctx.createBiquadFilter();

		filter.type = 'lowpass';
		filter.frequency.setValueAtTime(400, now);
		filter.frequency.linearRampToValueAtTime(1100, now + 0.14);

		osc.type = 'sine';
		osc.frequency.setValueAtTime(220, now);
		osc.frequency.exponentialRampToValueAtTime(440, now + 0.14);

		gain.gain.setValueAtTime(0.001, now);
		gain.gain.linearRampToValueAtTime(0.045, now + 0.04);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

		osc.connect(filter);
		filter.connect(gain);
		gain.connect(ctx.destination);

		osc.start(now);
		osc.stop(now + 0.17);
	} catch {}
}

/**
 * Gentle sliding panel close sound (soft descending whoosh)
 */
export function playClose(): void {
	if (!soundEnabled) return;
	const ctx = getAudioContext();
	if (!ctx) return;

	try {
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(360, now);
		osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);

		gain.gain.setValueAtTime(0.035, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start(now);
		osc.stop(now + 0.13);
	} catch {}
}

/**
 * Harmonious level-up chime (ascending sequence)
 */
export function playLevelUp(): void {
	if (!soundEnabled) return;
	const ctx = getAudioContext();
	if (!ctx) return;

	try {
		const now = ctx.currentTime;
		const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Major chord arpeggio)

		freqs.forEach((freq, i) => {
			const noteTime = now + i * 0.07;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = 'sine';
			osc.frequency.setValueAtTime(freq, noteTime);

			gain.gain.setValueAtTime(0.055, noteTime);
			gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(noteTime);
			osc.stop(noteTime + 0.3);
		});
	} catch {}
}

/**
 * Rewarding completion chord / fanfare
 */
export function playComplete(): void {
	if (!soundEnabled) return;
	const ctx = getAudioContext();
	if (!ctx) return;

	try {
		const now = ctx.currentTime;
		// Harmonic triumphant progression
		const notes = [
			{ freq: 523.25, time: 0 },
			{ freq: 659.25, time: 0.06 },
			{ freq: 783.99, time: 0.12 },
			{ freq: 1046.5, time: 0.18 },
			{ freq: 1318.51, time: 0.24 } // E6 finale
		];

		notes.forEach(({ freq, time }) => {
			const noteTime = now + time;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = 'triangle'; // Warm harmonic tone
			osc.frequency.setValueAtTime(freq, noteTime);

			gain.gain.setValueAtTime(0.06, noteTime);
			gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(noteTime);
			osc.stop(noteTime + 0.5);
		});
	} catch {}
}

/**
 * Uplifting subtle chime on new task created / success
 */
export function playSuccess(): void {
	if (!soundEnabled) return;
	const ctx = getAudioContext();
	if (!ctx) return;

	try {
		const now = ctx.currentTime;
		const notes = [587.33, 880]; // D5 -> A5 sparkling fifth

		notes.forEach((freq, i) => {
			const noteTime = now + i * 0.09;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = 'sine';
			osc.frequency.setValueAtTime(freq, noteTime);

			gain.gain.setValueAtTime(0.05, noteTime);
			gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(noteTime);
			osc.stop(noteTime + 0.32);
		});
	} catch {}
}
