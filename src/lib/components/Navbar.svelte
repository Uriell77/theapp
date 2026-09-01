<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Motion } from 'svelte-motion';
	import { page } from '$app/state';
	import { playClick, toggleSound, isSoundEnabled } from '$lib/audio';

	let { children }: { children?: Snippet } = $props();

	let pathname = $derived(page.url.pathname);
	let isDashboard = $derived(pathname.startsWith('/dashboard'));
	let isAuth = $derived(pathname.startsWith('/auth'));
	let isHome = $derived(pathname === '/');

	let soundOn = $state(true);

	$effect(() => {
		soundOn = isSoundEnabled();
	});

	function handleToggleSound() {
		soundOn = toggleSound();
	}
</script>

<header class="navbar-wrapper px-4 pt-3 pb-1">
	<div
		class="componente-navbar is-cristal box py-2 px-4 is-flex is-justify-content-space-between is-align-items-center"
	>
		<nav class="breadcrumb is-small py-0 mb-0" aria-label="breadcrumbs">
			<ul class="mb-0">
				<li class={isHome ? 'is-active' : ''}>
					<Motion whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} let:motion>
						<a
							use:motion
							onclick={playClick}
							class="button is-small is-rounded {isHome ? 'is-primary' : 'is-dark'}"
							href="/"
						>
							Inicio
						</a>
					</Motion>
				</li>
				<li class={isDashboard ? 'is-active ml-2' : 'ml-2'}>
					<Motion whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} let:motion>
						<a
							use:motion
							onclick={playClick}
							class="button is-small is-rounded {isDashboard ? 'is-primary' : 'is-dark'}"
							href="/dashboard"
						>
							Dashboard
						</a>
					</Motion>
				</li>
			</ul>
		</nav>

		<div class="buttons are-small mb-0 is-flex is-align-items-center">
			<!-- Botón sutil de efectos de sonido -->

			{#if isDashboard}
				<form method="POST" action="/auth?/logout">
					<Motion whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} let:motion>
						<button
							use:motion
							onclick={playClick}
							type="submit"
							class="button is-small is-danger is-outlined is-rounded"
						>
							Cerrar Sesión
						</button>
					</Motion>
				</form>
			{:else if !isAuth}
				<Motion whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} let:motion>
					<a
						use:motion
						onclick={playClick}
						href="/auth"
						class="button is-small is-primary is-rounded"
					>
						Acceder
					</a>
				</Motion>
			{/if}
		</div>

		{@render children?.()}
	</div>
</header>

<style>
	.navbar-wrapper {
		position: sticky;
		top: 0;
		z-index: 50;
	}

	.is-cristal {
		background: rgba(30, 30, 30, 0.75) !important;
		backdrop-filter: blur(12px) !important;
		border: 1px solid rgba(255, 255, 255, 0.15) !important;
		border-radius: 12px !important;
	}
</style>
