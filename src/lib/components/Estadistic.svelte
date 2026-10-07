<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Motion } from 'svelte-motion';

	interface Props {
		children?: Snippet;
		datas?: any;
		tasks?: any[];
		[key: string]: any;
	}

	let { children, tasks = [] }: Props = $props();

	let completedTasks = $derived(
		tasks.filter((t) => {
			const statusNum = parseInt(t.status, 10) || 0;
			return statusNum >= t.cantidad_de_niveles - 1;
		}).length
	);

	let activeTasks = $derived(tasks.filter((t) => parseInt(t.status, 10) !== -1 && parseInt(t.status, 10) < t.cantidad_de_niveles - 1).length);
</script>

<div class="bento-grid">
	<!-- Card 1: Total proyectos -->
	<Motion
		initial={{ opacity: 0, y: 10 }}
		animate={{ opacity: 1, y: 0 }}
		whileHover={{ y: -2 }}
		transition={{ duration: 0.2 }}
		let:motion
	>
		<div use:motion class="glass-panel bento-card">
			<div class="is-flex is-justify-content-space-between is-align-items-center">
				<span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 500;">Total proyectos</span>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent-primary)">
					<path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
				</svg>
			</div>
			<div style="font-size: 2.2rem; font-weight: bold; color: var(--accent-primary); line-height: 1; margin: 4px 0;">
				{tasks.length}
			</div>
			<div class="ring-chart"></div>
		</div>
	</Motion>

	<!-- Card 2: Tareas en progreso -->
	<Motion
		initial={{ opacity: 0, y: 10 }}
		animate={{ opacity: 1, y: 0 }}
		whileHover={{ y: -2 }}
		transition={{ duration: 0.2, delay: 0.05 }}
		let:motion
	>
		<div use:motion class="glass-panel bento-card">
			<div class="is-flex is-justify-content-space-between is-align-items-center">
				<span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 500;">Tareas en progreso</span>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent-primary)">
					<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
				</svg>
			</div>
			<div style="font-size: 2.2rem; font-weight: bold; color: var(--accent-primary); line-height: 1; margin: 4px 0;">
				{activeTasks}
			</div>
			<div style="font-size: 0.78rem; display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
				<div class="is-flex is-justify-content-space-between is-align-items-center">
					<span class="is-flex is-align-items-center">
						<span style="width: 7px; height: 7px; border-radius: 50%; background: var(--accent-primary); display: inline-block; margin-right: 6px;"></span>
						<span style="color: var(--text-muted);">En curso</span>
					</span>
					<span style="color: white; font-weight: bold;">{activeTasks}</span>
				</div>
				<div class="is-flex is-justify-content-space-between is-align-items-center">
					<span class="is-flex is-align-items-center">
						<span style="width: 7px; height: 7px; border-radius: 50%; background: var(--text-muted); display: inline-block; margin-right: 6px;"></span>
						<span style="color: var(--text-muted);">Completadas</span>
					</span>
					<span style="color: white; font-weight: bold;">{completedTasks}</span>
				</div>
			</div>
		</div>
	</Motion>
</div>

{@render children?.()}
