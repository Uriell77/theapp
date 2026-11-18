/**
 * Utilidades para el parseo, formato y tipografía de capítulos y temáticas
 */
import { getSkinByValue } from '$lib/skins';

export interface ParsedChapter {
	title: string;
	body: string;
	fullFormatted: string;
}

export interface GenreTypographyConfig {
	genreClass: string;
	titleFont: string;
	bodyFont: string;
	dropCapFont: string;
	accentColor: string;
	accentGlow: string;
	dropCapBg: string;
	dropCapBorder: string;
	bodyColor: string;
	ornament: string;
}

/**
 * Devuelve la configuración tipográfica y cromática evocadora según el género/temática de la historia
 * para dar la sensación de lectura de libro en el SlidingPanel.
 */
export function getGenreTypography(tema?: string | null): GenreTypographyConfig {
	const t = (tema || '').toLowerCase();

	let base: GenreTypographyConfig;

	// 1. Infantil / Cuento de Hadas
	if (isKidsTheme(tema)) {
		base = {
			genreClass: 'genre-kids',
			titleFont: "var(--font-genre-kids, 'Fredoka', cursive)",
			bodyFont: "var(--font-book-warm, 'Lora', Georgia, serif)",
			dropCapFont: "var(--font-genre-kids, 'Fredoka', cursive)",
			accentColor: '#ffd166',
			accentGlow: 'rgba(255, 209, 102, 0.5)',
			dropCapBg: 'linear-gradient(135deg, rgba(255, 209, 102, 0.25), rgba(255, 159, 67, 0.12))',
			dropCapBorder: 'rgba(255, 209, 102, 0.6)',
			bodyColor: '#fff9eb',
			ornament: '✦ 🎈 ✦'
		};
	} else if (
		// 2. Fantasía, Mitología, Medieval, Samurái, Alquimia (Épico / Clásico)
		t.includes('fantasía') ||
		t.includes('fantasia') ||
		t.includes('medieval') ||
		t.includes('mitología') ||
		t.includes('mitologia') ||
		t.includes('olimpo') ||
		t.includes('samurái') ||
		t.includes('samurai') ||
		t.includes('alquimia') ||
		t.includes('arcana')
	) {
		base = {
			genreClass: 'genre-fantasy',
			titleFont: "var(--font-genre-fantasy, 'Cinzel Decorative', 'Cinzel', serif)",
			bodyFont: "var(--font-book-classic, 'Cormorant Garamond', 'Lora', Georgia, serif)",
			dropCapFont: "var(--font-genre-fantasy, 'Cinzel Decorative', 'Cinzel', serif)",
			accentColor: '#ffd670',
			accentGlow: 'rgba(255, 214, 112, 0.55)',
			dropCapBg: 'linear-gradient(135deg, rgba(255, 214, 112, 0.24), rgba(180, 120, 30, 0.14))',
			dropCapBorder: 'rgba(255, 214, 112, 0.65)',
			bodyColor: '#f8f3e6',
			ornament: '─── ❖ ───'
		};
	} else if (t.includes('steampunk')) {
		// 3. Steampunk (Victoriano Industrial)
		base = {
			genreClass: 'genre-steampunk',
			titleFont: "var(--font-genre-mystery, 'Playfair Display', 'Cinzel', serif)",
			bodyFont: "var(--font-book-classic, 'Cormorant Garamond', 'Lora', Georgia, serif)",
			dropCapFont: "var(--font-genre-mystery, 'Playfair Display', serif)",
			accentColor: '#ffb74d',
			accentGlow: 'rgba(255, 183, 77, 0.5)',
			dropCapBg: 'linear-gradient(135deg, rgba(255, 183, 77, 0.24), rgba(160, 90, 20, 0.14))',
			dropCapBorder: 'rgba(255, 183, 77, 0.6)',
			bodyColor: '#f7f0e4',
			ornament: '─── ⚙ ───'
		};
	} else if (
		// 4. Ciencia Ficción, Cyberpunk, Espacio, Mechas, Superhéroes
		t.includes('cyberpunk') ||
		t.includes('neón') ||
		t.includes('neon') ||
		t.includes('espacial') ||
		t.includes('espacio') ||
		t.includes('mechas') ||
		t.includes('superhéroes') ||
		t.includes('superheroes')
	) {
		base = {
			genreClass: 'genre-scifi',
			titleFont: "var(--font-genre-scifi, 'Orbitron', 'Space Grotesk', sans-serif)",
			bodyFont: "var(--font-book-editorial, 'Lora', Georgia, serif)",
			dropCapFont: "var(--font-genre-scifi, 'Orbitron', sans-serif)",
			accentColor: '#38f2ff',
			accentGlow: 'rgba(56, 242, 255, 0.55)',
			dropCapBg: 'linear-gradient(135deg, rgba(56, 242, 255, 0.22), rgba(25, 212, 168, 0.12))',
			dropCapBorder: 'rgba(56, 242, 255, 0.62)',
			bodyColor: '#eef8fc',
			ornament: '─── ◈ ───'
		};
	} else if (
		// 5. Terror Cósmico, Zombie, Post-Apocalíptico, Noir, Guerra, Salvaje Oeste, Espionaje, Desastre
		t.includes('terror') ||
		t.includes('zombie') ||
		t.includes('apocal') ||
		t.includes('noir') ||
		t.includes('detective') ||
		t.includes('guerra') ||
		t.includes('oeste') ||
		t.includes('espionaje') ||
		t.includes('atraco') ||
		t.includes('desastre')
	) {
		base = {
			genreClass: 'genre-thriller',
			titleFont: "var(--font-genre-mystery, 'Playfair Display', 'Cinzel', serif)",
			bodyFont: "var(--font-book-editorial, 'Lora', Georgia, serif)",
			dropCapFont: "var(--font-genre-mystery, 'Playfair Display', serif)",
			accentColor: '#ff8563',
			accentGlow: 'rgba(255, 133, 99, 0.52)',
			dropCapBg: 'linear-gradient(135deg, rgba(255, 133, 99, 0.24), rgba(180, 50, 40, 0.14))',
			dropCapBorder: 'rgba(255, 133, 99, 0.62)',
			bodyColor: '#f6f1ea',
			ornament: '─── ✦ ───'
		};
	} else {
		// 6. Comedia, Romance, Aprendizaje y General
		base = {
			genreClass: 'genre-editorial',
			titleFont: "var(--font-genre-mystery, 'Playfair Display', serif)",
			bodyFont: "var(--font-book-editorial, 'Lora', Georgia, serif)",
			dropCapFont: "var(--font-genre-mystery, 'Playfair Display', serif)",
			accentColor: '#28f0c2',
			accentGlow: 'rgba(40, 240, 194, 0.5)',
			dropCapBg: 'linear-gradient(135deg, rgba(40, 240, 194, 0.22), rgba(17, 153, 142, 0.12))',
			dropCapBorder: 'rgba(40, 240, 194, 0.6)',
			bodyColor: '#f6f5f0',
			ornament: '─── ❦ ───'
		};
	}

	const skin = getSkinByValue(tema);
	if (skin.id !== 'estandar') {
		return {
			...base,
			accentColor: skin.primary,
			accentGlow: skin.glow.match(/rgba?\([^)]+\)/)?.[0] ?? skin.glassBorder,
			dropCapBg: `linear-gradient(135deg, ${skin.glassBorder}, rgba(0, 0, 0, 0.25))`,
			dropCapBorder: skin.primary,
			bodyColor: skin.textMain
		};
	}

	return base;
}

/**
 * Separa la primera letra (incluyendo signos de apertura como ¡ ¿ " «) del resto del texto
 * para renderizar una letra capitular (Drop Cap) estilo libro clásico.
 */
export function splitDropCap(text?: string | null): { initial: string; rest: string } {
	const clean = (text || '').trim();
	if (!clean) return { initial: '', rest: '' };

	const match = clean.match(/^([¡¿"«'—\s]*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9])([\s\S]*)$/);
	if (match) {
		return {
			initial: match[1].trim(),
			rest: match[2]
		};
	}

	return {
		initial: clean.charAt(0),
		rest: clean.slice(1)
	};
}

/**
 * Determina si la temática corresponde a aprendizaje infantil
 */
export function isKidsTheme(tema?: string | null): boolean {
	if (!tema) return false;
	const lower = tema.toLowerCase();
	return lower.includes('infantil') || lower.includes('niño') || lower.includes('cuento');
}

/**
 * Determina si la temática corresponde a aprendizaje (adolescente, habilidades, conocimiento universal)
 */
export function isLearningTheme(tema?: string | null): boolean {
	if (!tema) return false;
	if (isKidsTheme(tema)) return false;
	const lower = tema.toLowerCase();
	return (
		lower.includes('adolescente') ||
		lower.includes('habilidades') ||
		lower.includes('habilidad') ||
		lower.includes('conocimiento universal') ||
		lower.includes('conocimiento') ||
		lower.includes('aprendizaje')
	);
}

export type ProjectCategoryKey = 'general' | 'kids' | 'learning';

/**
 * Categoriza el proyecto en: 'general', 'kids' (infantil) o 'learning' (aprendizaje)
 */
export function getProjectCategory(tema?: string | null): ProjectCategoryKey {
	if (isKidsTheme(tema)) return 'kids';
	if (isLearningTheme(tema)) return 'learning';
	return 'general';
}

/**
 * Capitaliza cada palabra de un texto (Title Case) para que todas las palabras inicien con mayúscula
 * Ej: "terminar metaphorgoal" -> "Terminar Metaphorgoal"
 */
export function capitalizeWords(text?: string | null): string {
	if (!text) return '';
	return text.replace(/(^|[\s,.\-:(])([a-z\u00C0-\u017F])/g, (match, sep, char) => sep + char.toUpperCase());
}

/**
 * Parsea un capítulo de historia para separar limpiamente el título del cuerpo.
 * Asegura que "Capítulo 1, Nombre del capítulo." mantenga el nombre del capítulo
 * y no se divida en el número del capítulo.
 */
export function parseChapter(rawText?: string | null): ParsedChapter {
	const raw = (rawText || '').trim();
	if (!raw) {
		return { title: '', body: '', fullFormatted: '' };
	}

	// 1. Si empieza con Capítulo/Lección/Nivel X con punto, dos puntos o guión:
	// Lo normalizamos a "Capítulo X, " para que no se divida en el número del capítulo
	let normalized = raw.replace(
		/^(Cap[ií]tulo\s+[0-9IVXLCDM]+|Lecci[oó]n\s+[0-9IVXLCDM]+|Nivel\s+[0-9IVXLCDM]+|Parte\s+[0-9IVXLCDM]+)\s*[:.\-]\s*/i,
		'$1, '
	);

	// 2. Si tiene un punto, el primer punto delimita exactamente el fin del título descriptivo
	const dotIndex = normalized.indexOf('.');
	if (dotIndex !== -1) {
		const title = normalized.slice(0, dotIndex).trim();
		const body = normalized.slice(dotIndex + 1).trim();
		return {
			title,
			body,
			fullFormatted: `${title}.\n\n${body}`
		};
	}

	// 3. Si no tiene punto pero tenía coma tras el título descriptivo
	// Ej: "Capítulo 1, El despertar de las vocales, Había una vez en el bosque..."
	const legacyCommaMatch = normalized.match(
		/^(Cap[ií]tulo\s+[0-9IVXLCDM]+|Lecci[oó]n\s+[0-9IVXLCDM]+|Nivel\s+[0-9IVXLCDM]+|Parte\s+[0-9IVXLCDM]+),\s*([^,]+),\s*(.+)$/i
	);
	if (legacyCommaMatch) {
		const title = `${legacyCommaMatch[1]}, ${legacyCommaMatch[2].trim()}`;
		const body = legacyCommaMatch[3].trim();
		return {
			title,
			body,
			fullFormatted: `${title}.\n\n${body}`
		};
	}

	// 4. Si usa dos puntos como separador
	const colonIndex = normalized.indexOf(':');
	if (colonIndex !== -1) {
		const title = normalized.slice(0, colonIndex).trim();
		const body = normalized.slice(colonIndex + 1).trim();
		return {
			title,
			body,
			fullFormatted: `${title}.\n\n${body}`
		};
	}

	return {
		title: normalized,
		body: '',
		fullFormatted: normalized
	};
}

/**
 * Normaliza y formatea el texto generado por la IA antes de guardarlo en la base de datos.
 * Garantiza que el título descriptivo quede antes del punto y el cuerpo continúe después del punto.
 */
export function formatChapterForStorage(cap: string): string {
	let text = (cap || '').trim();

	// 1. Si empieza con Capítulo/Lección/Nivel X seguido de punto, dos puntos o guión:
	// Lo convertimos a "Capítulo X, " para que no corte prematuramente en el número
	text = text.replace(
		/^(Cap[ií]tulo\s+[0-9IVXLCDM]+|Lecci[oó]n\s+[0-9IVXLCDM]+|Nivel\s+[0-9IVXLCDM]+|Parte\s+[0-9IVXLCDM]+)\s*[:.\-]\s*/i,
		'$1, '
	);

	// 2. Si no tiene punto pero usó ":" o " - " después del título, convertir ese separador en punto
	if (!text.includes('.') && /[:\-]/.test(text)) {
		text = text.replace(/^([^:\-]+)(:|-)\s*/, '$1. ');
	}

	// 3. Si no tiene punto pero venía como "Capítulo X, Nombre del capítulo, Cuerpo..."
	if (!text.includes('.')) {
		const m = text.match(
			/^(Cap[ií]tulo\s+[0-9IVXLCDM]+|Lecci[oó]n\s+[0-9IVXLCDM]+|Nivel\s+[0-9IVXLCDM]+|Parte\s+[0-9IVXLCDM]+),\s*([^,]+),\s*(.+)$/i
		);
		if (m) {
			text = `${m[1]}, ${m[2].trim()}. ${m[3].trim()}`;
		}
	}

	// 4. Separar por el primer punto para garantizar que el título termina en "." y el cuerpo no contiene puntos adicionales
	const firstDotIndex = text.indexOf('.');
	if (firstDotIndex !== -1) {
		const title = text.slice(0, firstDotIndex).trim();
		let body = text.slice(firstDotIndex + 1).trim();
		body = body.replace(/\./g, ',').replace(/\s*,\s*/g, ', ');
		return `${title}. ${body}`;
	}

	return text;
}
