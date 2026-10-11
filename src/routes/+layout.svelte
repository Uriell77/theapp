<script lang="ts">
	import '../Styles/theme.css';
	import favicon from '$lib/assets/MG_Logo.webp';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.4/css/bulma.min.css" />
</svelte:head>

<div class="principal p-0 m-0">
	<Navbar />
	{@render children()}
</div>

<style>
</style>
