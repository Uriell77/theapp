import {
	AVATAR_GRID_CELLS,
	AVATAR_GRID_COLS,
	AVATAR_GRID_ROWS,
	DEFAULT_SKIN,
	SKIN_PALETTES,
	THEME_SKINS,
	getAvatarGridPosition,
	type AvatarGridCellConfig,
	type SkinPaletteKey,
	type SkinTokens
} from '$lib/config/themeSkins';

export {
	AVATAR_GRID_CELLS,
	AVATAR_GRID_COLS,
	AVATAR_GRID_ROWS,
	SKIN_PALETTES,
	getAvatarGridPosition,
	type AvatarGridCellConfig,
	type SkinPaletteKey,
	type SkinTokens
};

export type SkinMode = 'auto' | 'manual';

export const SKIN_STORAGE_KEY = 'user_skin'; // valor del skin manual ('default' o tema)
export const SKIN_MODE_KEY = 'user_skin_mode'; // 'auto' | 'manual'
export const SKIN_AUTO_CACHE_KEY = 'user_skin_auto'; // último skin automático calculado

export const ALL_SKINS: SkinTokens[] = [DEFAULT_SKIN, ...Object.values(THEME_SKINS)];

const LEGACY_SKIN_ALIASES: Record<string, SkinPaletteKey> = {
	default: 'estandar',
	estandar: 'estandar',
	cyberpunk: 'ciberespacio',
	atraco: 'golpe_maestro',
	oeste: 'salvaje_oeste',
	lovecraft: 'terror_cosmico',
	desastre: 'desastre_natural',
	romantica: 'comedia_romantica',
	caos: 'caos_comedia'
};

const norm = (s: string) =>
	s
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();

export function getSkinByValue(valor?: string | null): SkinTokens {
	if (!valor) return DEFAULT_SKIN;
	if (THEME_SKINS[valor]) return THEME_SKINS[valor];

	const n = norm(valor);
	const aliasId = LEGACY_SKIN_ALIASES[n] ?? n;
	if (aliasId === 'estandar') return DEFAULT_SKIN;

	const exactMatch = Object.values(THEME_SKINS).find(
		(s) => s.id === aliasId || norm(s.valor) === n || norm(s.etiqueta) === n
	);
	if (exactMatch) return exactMatch;

	const prefixMatch = Object.values(THEME_SKINS).find(
		(s) =>
			norm(s.valor).startsWith(n) ||
			n.startsWith(norm(s.valor)) ||
			norm(s.etiqueta).startsWith(n) ||
			n.startsWith(norm(s.etiqueta))
	);
	return prefixMatch ?? DEFAULT_SKIN;
}

/** Tema más frecuente entre los proyectos (solo si supera 4; empate: el más reciente, tasks vienen id desc). */
export function computeAutoSkin(tasks: { tema?: string | null }[] = []): SkinTokens {
	const counts = new Map<string, number>();
	for (const t of tasks) {
		const skin = getSkinByValue(t.tema);
		if (skin.id === 'estandar') continue;
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
	return bestN > 4 ? getSkinByValue(best) : DEFAULT_SKIN;
}

export function getSkinMode(): SkinMode {
	return localStorage.getItem(SKIN_MODE_KEY) === 'manual' ? 'manual' : 'auto';
}

/** Skin guardado (sin conocer proyectos): manual, o el último automático cacheado. */
export function getStoredSkin(): SkinTokens {
	if (getSkinMode() === 'manual') return getSkinByValue(localStorage.getItem(SKIN_STORAGE_KEY));
	return getSkinByValue(localStorage.getItem(SKIN_AUTO_CACHE_KEY));
}

export function applySkin(skinOrKey: SkinTokens | string) {
	if (typeof document === 'undefined') return;
	const skin = typeof skinOrKey === 'string' ? getSkinByValue(skinOrKey) : skinOrKey;
	const root = document.documentElement;
	const glowColor = skin.glow.match(/rgba?\([^)]+\)/)?.[0] ?? skin.glow;
	const skinBoxGlow = skin.glow.includes('px') ? skin.glow : `0 0 16px ${glowColor}`;

	const vars: Record<string, string> = {
		'--bg-main': skin.bgMain,
		'--bg-card': skin.bgCard,
		'--accent-primary': skin.accent,
		'--accent-glow': glowColor,
		'--font-heading': skin.fontHeading,
		'--font-body': skin.fontBody,
		// Tokens completos del tema y compatibilidad
		'--skin-bg-base': skin.bgBase,
		'--skin-bg-gradient': skin.bgGradient,
		'--skin-glass-bg': skin.glassBg,
		'--skin-glass-border': skin.glassBorder,
		'--skin-primary': skin.primary,
		'--skin-secondary': skin.secondary,
		'--skin-accent': skin.accent,
		'--skin-text-main': skin.textMain,
		'--skin-text-muted': skin.textMuted,
		'--skin-glow': skinBoxGlow,
		'--bg-color': skin.bgMain,
		'--bg-gradient': skin.bgGradient,
		'--card-bg': skin.bgCard,
		'--card-border': skin.glassBorder,
		'--text-main': skin.textMain,
		'--text-muted': skin.textMuted,
		'--font-hierarchy-display': skin.fontHeading,
		'--font-hierarchy-heading': skin.fontHeading,
		'--font-hierarchy-body': skin.fontBody,
		'--font-hierarchy-ui': skin.fontHeading
	};

	for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
	root.setAttribute('data-theme', skin.id);
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('mg-skin-change', { detail: skin }));
	}
}

/** Recalcula y aplica el skin según preferencia (auto → por proyectos). */
export function syncSkin(tasks: { tema?: string | null }[]) {
	if (getSkinMode() === 'manual') return applySkin(getStoredSkin());
	const auto = computeAutoSkin(tasks);
	localStorage.setItem(SKIN_AUTO_CACHE_KEY, auto.valor);
	applySkin(auto);
}
