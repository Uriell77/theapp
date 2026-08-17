<script>
	let { data } = $props();
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<hr>
<ul>
	{#each data.users as user}
		<li>{user.nombre_de_usuario}</li>
	{/each}
</ul>


<style>
</style>