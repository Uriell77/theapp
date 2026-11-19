<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { Motion } from 'svelte-motion';
	import { page } from '$app/state';
	import { playClick } from '$lib/audio';
	import {
		getAvatarGridPosition,
		getStoredSkin,
		type SkinPaletteKey,
		type SkinTokens
	} from '$lib/skins';

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

	let activeSkinId = $state<SkinPaletteKey>('estandar');
	let navGridPos = $derived(getAvatarGridPosition(activeSkinId));
	let navActiveGridUrl = $derived(
		user?.avatarGridUrl || (user?.isAvatarGrid ? user?.avatarUrl : null)
	);
	let navAvatarLoadFailed = $state(false);
	let navShowGridCell = $derived(!navAvatarLoadFailed && Boolean(navActiveGridUrl));
	let navAvatarSrc = $derived(
		(navAvatarLoadFailed ? user?.avatarUrl : navActiveGridUrl) ||
			user?.avatarUrl ||
			'/emptyavatar.avif'
	);

	$effect(() => {
		void navActiveGridUrl;
		void user?.avatarUrl;
		navAvatarLoadFailed = false;
	});

	onMount(() => {
		activeSkinId = getStoredSkin().id;
		const handleSkinChange = (e: Event) => {
			const detail = (e as CustomEvent<SkinTokens>).detail;
			if (detail?.id) {
				activeSkinId = detail.id;
			}
		};
		window.addEventListener('mg-skin-change', handleSkinChange);
		return () => {
			window.removeEventListener('mg-skin-change', handleSkinChange);
		};
	});
</script>

<header class="app-container pt-3 pb-0">
	<!-- Top Profile Bar -->
	<div class="profile-bar">
		<div class="is-flex is-align-items-center gap-3">
			<figure class="navbar-avatar-wrap mr-3" class:is-grid-avatar={navShowGridCell}>
				<img
					class:is-grid-sprite={navShowGridCell}
					src={navAvatarSrc}
					alt="Avatar"
					onerror={(e) => {
						navAvatarLoadFailed = true;
						const target = e.currentTarget as HTMLImageElement;
						if (!target.src.endsWith('/emptyavatar.avif')) {
							target.src = '/emptyavatar.avif';
						}
					}}
					style={navShowGridCell
						? `width: ${navGridPos.cols * 100}%; height: ${navGridPos.rows * 100}%; max-width: none !important; max-height: none !important; position: absolute; left: -${navGridPos.col * 100}%; top: -${navGridPos.row * 100}%; object-fit: cover;`
						: 'width: 100%; height: 100%; object-fit: cover; display: block;'}
				/>
			</figure>
			<div>
				<div class="has-text-weight-bold has-text-white" style="font-size: 1rem; line-height: 1.2;">
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
	.navbar-avatar-wrap {
		position: relative;
		width: 42px;
		height: 42px;
		margin: 0;
		border-radius: 50%;
		overflow: hidden;
		flex-shrink: 0;
		border: 2px solid rgba(255, 255, 255, 0.15);
		background: #1a2a30;
		transition: border-color 0.25s ease, box-shadow 0.25s ease;
	}

	.navbar-avatar-wrap.is-grid-avatar {
		border-color: var(--accent-primary);
		box-shadow: 0 0 10px var(--accent-glow);
	}

	.navbar-avatar-wrap img.is-grid-sprite {
		transition:
			left 0.35s cubic-bezier(0.22, 1, 0.36, 1),
			top 0.35s cubic-bezier(0.22, 1, 0.36, 1);
	}
</style>