import { DEFAULT_SKIN, THEME_SKINS, type SkinTokens } from '$lib/config/themeSkins';

export type SkinMode = 'auto' | 'manual';

export const SKIN_STORAGE_KEY = 'user_skin'; // valor del skin manual ('default' o tema)
export const SKIN_MODE_KEY = 'user_skin_mode'; // 'auto' | 'manual'
export const SKIN_AUTO_CACHE_KEY = 'user_skin_auto'; // último skin automático calculado

export const ALL_SKINS: SkinTokens[] = [DEFAULT_SKIN, ...Object.values(THEME_SKINS)];

const norm = (s: string) =>
	s
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();

export function getSkinByValue(valor?: string | null): SkinTokens {
	if (!valor || valor === 'default') return DEFAULT_SKIN;
	if (THEME_SKINS[valor]) return THEME_SKINS[valor];
	const n = norm(valor);
	const match = Object.values(THEME_SKINS).find(
		(s) => norm(s.valor) === n || norm(s.valor).startsWith(n) || n.startsWith(norm(s.valor))
	);
	return match ?? DEFAULT_SKIN;
}

/** Tema más frecuente entre los proyectos (empate: el más reciente, tasks vienen id desc). */
export function computeAutoSkin(tasks: { tema?: string | null }[] = []): SkinTokens {
	const counts = new Map<string, number>();
	for (const t of tasks) {
		const skin = getSkinByValue(t.tema);
		if (skin.id === 'default') continue;
		counts.set(skin.valor, (counts.get(skin.valor) ?? 0) + 1);
	}
	let best: string | null = null;
	let bestN = 0;
	for (const [valor, n] of counts) {
		if (n > bestN) {
			best = valor;
			bestN = n;
		}
	}
	return getSkinByValue(best);
}

export function getSkinMode(): SkinMode {
	return localStorage.getItem(SKIN_MODE_KEY) === 'manual' ? 'manual' : 'auto';
}

/** Skin guardado (sin conocer proyectos): manual, o el último automático cacheado. */
export function getStoredSkin(): SkinTokens {
	if (getSkinMode() === 'manual') return getSkinByValue(localStorage.getItem(SKIN_STORAGE_KEY));
	return getSkinByValue(localStorage.getItem(SKIN_AUTO_CACHE_KEY));
}

export function applySkin(skin: SkinTokens) {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	const glowColor = skin.glow.match(/rgba?\([^)]+\)/)?.[0] ?? skin.primary;
	const vars: Record<string, string> = {
		'--skin-bg-base': skin.bgBase,
		'--skin-bg-gradient': skin.bgGradient,
		'--skin-glass-bg': skin.glassBg,
		'--skin-glass-border': skin.glassBorder,
		'--skin-primary': skin.primary,
		'--skin-secondary': skin.secondary,
		'--skin-accent': skin.accent,
		'--skin-text-main': skin.textMain,
		'--skin-text-muted': skin.textMuted,
		'--skin-glow': skin.glow,
		// Variables globales existentes de la app
		'--bg-main': skin.bgBase,
		'--bg-gradient': skin.bgGradient,
		'--bg-card': skin.glassBg,
		'--card-border': skin.glassBorder,
		'--accent-primary': skin.primary,
		'--accent-glow': glowColor,
		'--text-main': skin.textMain,
		'--text-muted': skin.textMuted
	};
	for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
	root.setAttribute('data-theme', skin.id);
}

/** Recalcula y aplica el skin según preferencia (auto → por proyectos). */
export function syncSkin(tasks: { tema?: string | null }[]) {
	if (getSkinMode() === 'manual') return applySkin(getStoredSkin());
	const auto = computeAutoSkin(tasks);
	localStorage.setItem(SKIN_AUTO_CACHE_KEY, auto.valor);
	applySkin(auto);
}
