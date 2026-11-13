/**
 * Caché en memoria del navegador (RAM Map + CacheStorage API) para almacenar
 * los audios TTS generados por Gemini API por tarea y capítulo, evitando
 * llamadas repetidas y consumo innecesario de tokens.
 */

const CACHE_NAME = 'gemini-tts-audio-cache-v1';

// Caché en memoria RAM para acceso instantáneo durante la sesión
const memoryCache = new Map<string, Blob>();

/**
 * Construye una clave única y determinista asociada a la tarea y capítulo/texto.
 */
function buildCacheKey(
	taskId: number | string | undefined,
	chapterKey: number | string | undefined,
	text: string
): string {
	const safeTask = taskId !== undefined && taskId !== null ? String(taskId) : 'global';
	const safeChapter =
		chapterKey !== undefined && chapterKey !== null ? String(chapterKey) : hashText(text);
	return `task-${safeTask}__chapter-${safeChapter}`;
}

function hashText(str: string): string {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = (hash * 33) ^ str.charCodeAt(i);
	}
	return (hash >>> 0).toString(36);
}

/**
 * Obtiene el audio Blob guardado en memoria del navegador si ya fue generado previamente.
 */
export async function getCachedTtsAudio(
	taskId: number | string | undefined,
	chapterKey: number | string | undefined,
	text: string
): Promise<Blob | null> {
	if (typeof window === 'undefined') return null;

	const key = buildCacheKey(taskId, chapterKey, text);

	// 1. Verificar primero en memoria RAM
	const inMemory = memoryCache.get(key);
	if (inMemory) {
		return inMemory;
	}

	// 2. Verificar en CacheStorage del navegador
	if ('caches' in window) {
		try {
			const cache = await window.caches.open(CACHE_NAME);
			const response = await cache.match(`https://tts-cache.local/${encodeURIComponent(key)}`);
			if (response) {
				const blob = await response.blob();
				if (blob && blob.size > 0) {
					memoryCache.set(key, blob);
					return blob;
				}
			}
		} catch (err) {
			console.warn('[ttsCache] No se pudo leer de CacheStorage:', err);
		}
	}

	return null;
}

/**
 * Guarda el audio Blob generado por Gemini TTS en la memoria del navegador.
 */
export async function saveCachedTtsAudio(
	taskId: number | string | undefined,
	chapterKey: number | string | undefined,
	text: string,
	blob: Blob
): Promise<void> {
	if (typeof window === 'undefined' || !blob || blob.size === 0) return;

	const key = buildCacheKey(taskId, chapterKey, text);

	// 1. Guardar en memoria RAM
	memoryCache.set(key, blob);

	// 2. Guardar en CacheStorage del navegador para persistir entre recargas
	if ('caches' in window) {
		try {
			const cache = await window.caches.open(CACHE_NAME);
			const response = new Response(blob, {
				headers: {
					'Content-Type': blob.type || 'audio/wav',
					'X-Task-Id': String(taskId ?? 'global')
				}
			});
			await cache.put(`https://tts-cache.local/${encodeURIComponent(key)}`, response);
		} catch (err) {
			console.warn('[ttsCache] No se pudo guardar en CacheStorage:', err);
		}
	}
}

/**
 * Elimina de la memoria del navegador todos los audios generados para una tarea específica
 * (por ejemplo, cuando la tarea es eliminada en la sección de archivados).
 */
export async function clearTaskTtsCache(taskId: number | string): Promise<void> {
	if (typeof window === 'undefined' || taskId === undefined || taskId === null) return;

	const prefix = `task-${String(taskId)}__`;

	// 1. Limpiar todas las entradas de la tarea en el Map en memoria RAM
	for (const key of Array.from(memoryCache.keys())) {
		if (key.startsWith(prefix)) {
			memoryCache.delete(key);
		}
	}

	// 2. Limpiar todas las entradas de la tarea en CacheStorage del navegador
	if ('caches' in window) {
		try {
			const cache = await window.caches.open(CACHE_NAME);
			const requests = await cache.keys();
			const encodedPrefix = encodeURIComponent(prefix);
			await Promise.all(
				requests
					.filter((req) => req.url.includes(encodedPrefix))
					.map((req) => cache.delete(req))
			);
		} catch (err) {
			console.warn('[ttsCache] Error limpiando CacheStorage para la tarea:', err);
		}
	}
}
