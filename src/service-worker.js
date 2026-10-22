import { build, files, version } from '$service-worker';

const CACHE_NAME = `metaphorgoals-v${version}`;

// Activos del build y archivos estáticos
const ASSETS = [...build, ...files];

// Recursos críticos de íconos y splashscreen para cachear con prioridad
const ICON_ASSETS = [
	'/favicon_io/android-chrome-192x192.png',
	'/favicon_io/android-chrome-512x512.png',
	'/favicon_io/apple-touch-icon.png',
	'/favicon_io/favicon-32x32.png',
	'/favicon_io/favicon-16x16.png',
	'/manifest.json',
	'/favicon.svg'
];

// ── Instalación ──────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			// Cachear íconos y manifest con prioridad para que el splashscreen y launcher funcionen offline
			await cache.addAll(ICON_ASSETS).catch(() => {
				// Si algún ícono falla, no bloqueamos la instalación
			});
			// Luego cachear el resto de activos del build
			await cache.addAll(ASSETS).catch(() => {});
			// Activar inmediatamente sin esperar cierre de pestañas
			await self.skipWaiting();
		})()
	);
});

// ── Activación y limpieza de cachés viejos ────────────────────────────────────
self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(
				keys
					.filter((key) => key !== CACHE_NAME)
					.map((key) => caches.delete(key))
			);
			// Tomar control de todos los clientes inmediatamente
			await self.clients.claim();
		})()
	);
});

// ── Mensajes desde el cliente ─────────────────────────────────────────────────
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});

// ── Estrategia de fetch ───────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);

	// Excluir peticiones de API, autenticación, supabase y verificación de versión del caché
	if (
		url.pathname.startsWith('/api/') ||
		url.pathname.startsWith('/auth/') ||
		url.pathname.includes('/_app/version.json') ||
		url.hostname.includes('supabase') ||
		url.hostname.includes('googleapis') ||
		url.hostname.includes('gstatic')
	) {
		return;
	}

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE_NAME);

			// Activos inmutables del build y archivos estáticos: Cache First
			const isCacheFirstAsset =
				ASSETS.includes(url.pathname) ||
				url.pathname.startsWith('/_app/immutable/') ||
				ICON_ASSETS.includes(url.pathname) ||
				url.pathname.startsWith('/favicon_io/') ||
				url.pathname.endsWith('.png') ||
				url.pathname.endsWith('.svg') ||
				url.pathname.endsWith('.ico') ||
				url.pathname.endsWith('.webp') ||
				url.pathname === '/manifest.json';

			if (isCacheFirstAsset) {
				const cached = await cache.match(event.request);
				if (cached) return cached;
			}

			// Para el resto (HTML, datos, navegación): Network First con fallback a caché
			try {
				const response = await fetch(event.request);
				if (response.status === 200) {
					cache.put(event.request, response.clone());
				}
				return response;
			} catch {
				const cached = await cache.match(event.request);
				if (cached) return cached;

				// Fallback final: página principal cacheada
				const fallback = await cache.match('/');
				return fallback ?? new Response('Sin conexión', { status: 503 });
			}
		})()
	);
});
