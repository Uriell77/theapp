<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Motion } from 'svelte-motion';
	import { page } from '$app/state';
	import { playClick } from '$lib/audio';

	let {
		children,
		activeView = '',
		onViewChange
	}: {
		children?: Snippet;
		activeView?: string;
		onViewChange?: (view: 'dashboard' | 'bitacora') => void;
	} = $props();

	let pathname = $derived(page.url.pathname);
	let isDashboard = $derived(pathname.startsWith('/dashboard'));
	let isAuth = $derived(pathname.startsWith('/auth'));
	let isHome = $derived(pathname === '/');
	let user = $derived(page.data?.user);
</script>

<header class="app-container pt-3 pb-0">
	<!-- Top Profile Bar -->
	<div class="profile-bar">
		<div class="is-flex is-align-items-center gap-3">
			<figure class="image is-44x44 mr-3" style="width: 44px; height: 44px; margin: 0;">
				<img 
					class="is-rounded" 
					src={user?.avatarUrl || '/emptyavatar.avif'} 
					alt="Avatar" 
					onerror={(e) => {
						const target = e.currentTarget as HTMLImageElement;
						if (target.src !== '/emptyavatar.avif') {
							target.src = '/emptyavatar.avif';
						}
					}}
					style="border: 2px solid rgba(255, 255, 255, 0.15); border-radius: 50%; width: 44px; height: 44px; object-fit: cover; background: #1a2a30;"
				/>
			</figure>
			<div>
				<div class="has-text-weight-bold has-text-white" style="font-size: 1.05rem; line-height: 1.2;">
					{user?.nombre_de_usuario || 'Usuario'}
				</div>
				<div style="color: var(--text-muted); font-size: 0.8rem;">
					{user?.email || 'Sin correo'}
				</div>
			</div>
		</div>

		<div>
			{#if user || isDashboard}
				<form method="POST" action="/auth?/logout">
					<Motion whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} let:motion>
						<button
							use:motion
							onclick={playClick}
							type="submit"
							class="profile-btn"
							title="Cerrar sesión"
						>
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
								<polyline points="16 17 21 12 16 7"></polyline>
								<line x1="21" y1="12" x2="9" y2="12"></line>
							</svg>
							<span>Salir</span>
						</button>
					</Motion>
				</form>
			{:else if !isAuth}
				<Motion whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} let:motion>
					<a
						use:motion
						onclick={playClick}
						href="/auth"
						class="profile-btn"
					>
						<span>Acceder</span>
					</a>
				</Motion>
			{/if}
		</div>
	</div>

	<!-- Search Bar -->
	<div class="search-bar is-hidden">
		<input type="text" placeholder="Buscador" />
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);">
			<circle cx="11" cy="11" r="8"></circle>
			<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
		</svg>
	</div>

	<!-- Nav Pills -->
	<div class="nav-pills">
		<a href="/" class="nav-pill {isHome ? 'active' : ''}" onclick={playClick}>Inicio</a>
		<a
			href="/dashboard"
			class="nav-pill {isDashboard && activeView !== 'bitacora' ? 'active' : ''}"
			onclick={(e) => {
				playClick();
				if (onViewChange) {
					e.preventDefault();
					onViewChange('dashboard');
				}
			}}>Dashboard</a
		>
		<a
			href="/dashboard?tab=bitacora"
			class="nav-pill {activeView === 'bitacora' ? 'active' : ''}"
			onclick={(e) => {
				playClick();
				if (onViewChange) {
					e.preventDefault();
					onViewChange('bitacora');
				}
			}}>Bitácora</a
		>
	</div>

	{@render children?.()}
</header>


<style>

</style>