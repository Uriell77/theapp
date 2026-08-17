<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/bulma@1.0.4/css/bulma.min.css"
>
</svelte:head>

<div class="principal">
<Navbar />
{@render children()}
</div>

<style>
  .principal {
	background: linear-gradient(to bottom, #1e1e1e, #3b8196);
	min-height: 100vh;
	color: white;
  }

</style>