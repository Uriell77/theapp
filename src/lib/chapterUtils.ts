/**
 * Utilidades para el parseo, formato y tipografía de capítulos y temáticas
 */

export interface ParsedChapter {
	title: string;
	body: string;
	fullFormatted: string;
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
