export type SkinId = 'default' | 'cyberpunk' | 'olimpo' | 'tactico';

export interface Skin {
	id: SkinId;
	name: string;
	icon: string;
	desc: string;
	/** Grupo temático cuya victoria desbloquea el skin (null = siempre disponible) */
	group: string | null;
	swatch: [string, string];
}

export const SKIN_STORAGE_KEY = 'user_skin';

export const TEMA_GROUPS: Record<string, string[]> = {
	'Fantasía y Mitología': [
		'Alta Fantasía y Magia',
		'Cruzada Medieval',
		'Mitología Griega y el Olimpo',
		'Dinastía Samurái',
		'Alquimia y Magia Arcana'
	],
	'Ciencia Ficción': [
		'Cyberpunk y Neón',
		'Steampunk',
		'Guerra Espacial de Naves',
		'Combate de Mechas Gigantes',
		'Superhéroes y Cómics',
		'Supervivencia Post-Apocalíptica'
	],
	'Supervivencia y Acción': [
		'Apocalipsis Zombie',
		'Espionaje Táctico Moderno',
		'Atraco de Guante Blanco y Estafa Maestra',
		'Detective Noir',
		'El Salvaje Oeste',
		'Terror Cosmico',
		'Guerra Mundia',
		'Desastre Natural'
	],
	'Humor y Vida Cotidiana': [
		'Comedia Romántica y Torpeza Adorable',
		'Comedia Absurda y Caos Cotidiano'
	]
};

const norm = (s: string) =>
	s
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();

export function getTemaGroup(tema?: string | null): string | null {
	if (!tema) return null;
	const t = norm(tema);
	for (const [group, temas] of Object.entries(TEMA_GROUPS)) {
		if (temas.some((x) => norm(x) === t || t.startsWith(norm(x)) || norm(x).startsWith(t))) {
			return group;
		}
	}
	return null;
}

export const SKINS: Skin[] = [
	{ id: 'default', name: 'Default', icon: '🌊', desc: 'Teal oscuro original', group: null, swatch: ['#19d4a8', '#12191d'] },
	{ id: 'cyberpunk', name: 'Cyberpunk', icon: '🌆', desc: 'Neón magenta y cian · 1 victoria de Ciencia Ficción', group: 'Ciencia Ficción', swatch: ['#ff2bd6', '#00f0ff'] },
	{ id: 'olimpo', name: 'Olimpo / Dorado', icon: '🏛️', desc: 'Oro y mármol oscuro · 1 victoria de Fantasía/Mitología', group: 'Fantasía y Mitología', swatch: ['#e8b923', '#2a2417'] },
	{ id: 'tactico', name: 'Carmesí Táctico', icon: '🎖️', desc: 'Rojo y acero · 1 victoria de Supervivencia/Acción', group: 'Supervivencia y Acción', swatch: ['#e0323c', '#2b3138'] }
];

export function applySkin(id: string) {
	if (typeof document === 'undefined') return;
	document.documentElement.setAttribute('data-theme', id);
}
