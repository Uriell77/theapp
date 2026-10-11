<script lang="ts">
	import '../Styles/theme.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.4/css/bulma.min.css" />
	<link rel="manifest" href="/manifest.json" />
	<meta name="theme-color" content="#23D7A4" />
	<link rel="apple-touch-icon" href="/favicon_io/logo-192x192.png" />
</svelte:head>

<div class="principal p-0 m-0">
	<Navbar />
	{@render children()}
</div>

<style>
</style>
