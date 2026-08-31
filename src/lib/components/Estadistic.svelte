<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
		datas: any;
		tasks: any[];
		[key: string]: any;
	}

	let { children, datas, tasks = [] }: Props = $props();

	let completedTasks = $derived(
		tasks.filter((t) => {
			const statusNum = parseInt(t.status, 10) || 0;
			return statusNum >= t.cantidad_de_niveles - 1;
		}).length
	);

	let activeTasks = $derived(tasks.length - completedTasks);
</script>

<div class="columns is-centered is-mobile mb-4">
	<div class="column is-half-desktop is-full-mobile">
		<div class="grid has-col-min-12">
			<div class="cell">
				<div class="box is-shadowless has-background-dark has-text-white stat-box">
					<p class="is-size-7 is-uppercase has-text-grey-light">Usuario</p>
					<p class="is-size-6 has-text-weight-bold has-text-primary">
						{datas?.user?.nombre_de_usuario || 'Anónimo'}
					</p>
					<p class="is-size-7 has-text-grey-lighter is-truncated">{datas?.user?.email || ''}</p>
				</div>
			</div>

			<div class="cell">
				<div class="box is-shadowless has-background-dark has-text-white stat-box">
					<p class="is-size-7 is-uppercase has-text-grey-light">Total Proyectos</p>
					<p class="is-size-4 has-text-weight-bold has-text-info">{tasks.length}</p>
				</div>
			</div>

			<div class="cell">
				<div class="box is-shadowless has-background-dark has-text-white stat-box">
					<p class="is-size-7 is-uppercase has-text-grey-light">En Progreso</p>
					<p class="is-size-4 has-text-weight-bold has-text-warning">{activeTasks}</p>
				</div>
			</div>

			<div class="cell">
				<div class="box is-shadowless has-background-dark has-text-white stat-box">
					<p class="is-size-7 is-uppercase has-text-grey-light">Completadas</p>
					<p class="is-size-4 has-text-weight-bold has-text-success">{completedTasks}</p>
				</div>
			</div>
		</div>
		{@render children?.()}
	</div>
</div>

<style>
	.stat-box {
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		height: 100%;
	}

	.is-truncated {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
