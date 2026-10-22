<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { updated } from '$app/state';
	import { invalidateAll, beforeNavigate } from '$app/navigation';
	import '../Styles/theme.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	onMount(() => {
		if (!browser) return;

		let isRefreshing = false;
		let hadController = !!navigator.serviceWorker?.controller;

		// 1. Si el nuevo Service Worker toma el control (skipWaiting + clients.claim),
		// recargar la aplicación para activar inmediatamente la nueva versión desplegada.
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				// Evitar recarga en la primera instalación cuando no había controlador previo
				if (!hadController) {
					hadController = true;
					return;
				}
				if (!isRefreshing) {
					isRefreshing = true;
					window.location.reload();
				}
			});
		}

		// 2. Función para verificar si hay una nueva versión o cambios
		const checkForUpdates = async () => {
			try {
				if (!navigator.onLine) return;

				// A) Forzar al Service Worker a buscar actualizaciones en el servidor
				if ('serviceWorker' in navigator) {
					const registration = await navigator.serviceWorker.getRegistration();
					if (registration) {
						if (registration.waiting) {
							registration.waiting.postMessage({ type: 'SKIP_WAITING' });
						}
						await registration.update();
					}
				}

				// B) Verificar versión de SvelteKit con el servidor
				const hasNewVersion = await updated.check();
				if (hasNewVersion && !isRefreshing) {
					isRefreshing = true;
					window.location.reload();
					return;
				}

				// C) Si no hubo cambio de versión de código, refrescar los datos de la página
				await invalidateAll();
			} catch (err) {
				console.debug('[App] Error verificando actualización:', err);
			}
		};

		// 3. Detectar cuando el usuario reabre la app en el móvil (vuelve del segundo plano)
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				checkForUpdates();
			}
		};

		const handlePageShow = (event: PageTransitionEvent) => {
			// Si la página se recupera de la memoria suspendida del móvil (bfcache)
			if (event.persisted) {
				checkForUpdates();
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		window.addEventListener('pageshow', handlePageShow);
		window.addEventListener('focus', checkForUpdates);

		// Ejecutar chequeo al abrir la app inicialmente
		checkForUpdates();

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.removeEventListener('pageshow', handlePageShow);
			window.removeEventListener('focus', checkForUpdates);
		};
	});

	// Forzar recarga si se detectó una nueva versión durante una navegación interna
	beforeNavigate(({ willUnload, to }) => {
		if (updated.current && !willUnload && to?.url) {
			location.href = to.url.href;
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Bubblegum+Sans&family=Fredoka:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.4/css/bulma.min.css" />
	<link rel="manifest" href="/manifest.json" />

	<!-- PWA / iOS meta tags -->
	<meta name="theme-color" content="#12191d" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="apple-mobile-web-app-title" content="MetaphorGoals" />
	<meta name="application-name" content="MetaphorGoals" />
	<meta name="msapplication-TileColor" content="#12191d" />

	<!-- Apple Touch Icons -->
	<link rel="apple-touch-icon" sizes="180x180" href="/favicon_io/apple-touch-icon.png" />
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon_io/favicon-32x32.png" />
	<link rel="icon" type="image/png" sizes="16x16" href="/favicon_io/favicon-16x16.png" />
</svelte:head>

<div class="principal p-0 m-0">
	{@render children()}
</div>

<style>
</style>
