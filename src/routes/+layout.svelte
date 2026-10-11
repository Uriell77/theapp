<script lang="ts">
	import '../Styles/theme.css';
	import favicon from '$lib/assets/favicon.svg';
	import appleTouchIcon from '$lib/assets/apple-touch-icon.png';
	import favicon32 from '$lib/assets/favicon-32x32.png';
	import favicon16 from '$lib/assets/favicon-16x16.png';
	import siteWebmanifest from '$lib/assets/site.webmanifest';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.4/css/bulma.min.css" />
	<link rel="apple-touch-icon" sizes="180x180" href="{appleTouchIcon}">
	<link rel="icon" type="image/png" sizes="32x32" href="{favicon32}">
	<link rel="icon" type="image/png" sizes="16x16" href="{favicon16}">
	<link rel="manifest" href="{siteWebmanifest}">
</svelte:head>

<div class="principal p-0 m-0">
	<Navbar />
	{@render children()}
</div>

<style>
</style>
