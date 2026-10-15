<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Motion } from 'svelte-motion';
	import { isKidsTheme, capitalizeWords } from '$lib/chapterUtils';

	interface Props {
		children?: Snippet;
		datas?: any;
		tasks?: any[];
		[key: string]: any;
	}

	let { children, tasks = [] }: Props = $props();

	// Tareas activas (no abandonadas ni completadas por completo si se desea, o todas las activas del dashboard)
	let activeTasksList = $derived(
		tasks.filter((t) => {
			const statusNum = parseInt(t.status, 10) || 0;
			return statusNum !== -1;
		})
	);

	let completedTasks = $derived(
		tasks.filter((t) => {
			const statusNum = parseInt(t.status, 10) || 0;
			return statusNum >= t.cantidad_de_niveles - 1;
		}).length
	);

	let activeTasksCount = $derived(activeTasksList.length);

	// Agrupar proyectos activos por categoría / tema
	let categoryBreakdown = $derived.by(() => {
		const counts: Record<string, { count: number; color: string; label: string }> = {
			kids: { count: 0, color: '#ffd166', label: 'Infantil 🎈' },
			general: { count: 0, color: '#19d4a8', label: 'General ⚔️' }
		};

		activeTasksList.forEach((t) => {
			if (isKidsTheme(t?.tema)) {
				counts.kids.count += 1;
			} else {
				counts.general.count += 1;
			}
		});

		// Retornar solo las que tengan al menos 1 o todas para la leyenda
		return [
			{ key: 'general', ...counts.general },
			{ key: 'kids', ...counts.kids }
		].filter((item) => item.count > 0);
	});

	// Calcular conic-gradient para el ring chart
	let ringGradient = $derived.by(() => {
		const total = activeTasksList.length;
		if (total === 0) return 'conic-gradient(#2a3b45 0deg 360deg)';

		let accumulated = 0;
		const stops: string[] = [];

		categoryBreakdown.forEach((cat) => {
			const percentage = (cat.count / total) * 100;
			const startAngle = (accumulated / 100) * 360;
			accumulated += percentage;
			const endAngle = (accumulated / 100) * 360;
			stops.push(`${cat.color} ${startAngle}deg ${endAngle}deg`);
		});

		return `conic-gradient(${stops.join(', ')})`;
	});
</script>

<div class="bento-grid">
	<!-- Card 1: Total proyectos + Ring Chart por Categorías -->
	<Motion
		initial={{ opacity: 0, y: 10 }}
		animate={{ opacity: 1, y: 0 }}
		whileHover={{ y: -2 }}
		transition={{ duration: 0.2 }}
		let:motion
	>
		<div use:motion class="glass-panel bento-card" style="display: flex; flex-direction: column; justify-content: space-between;">
			<div class="is-flex is-justify-content-space-between is-align-items-center">
				<span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 500;">Proyectos Activos</span>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent-primary)">
					<path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
				</svg>
			</div>

			<div class="is-flex is-align-items-center is-justify-content-space-between my-2">
				<div>
					<div class="is-size-3-desktop is-size-4-tablet is-size-5-mobile" style="font-weight: bold; color: var(--accent-primary); line-height: 1;">
						{activeTasksCount}
					</div>
					<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
						{activeTasksCount === 1 ? 'proyecto activo' : 'proyectos activos'}
					</div>
				</div>

				<!-- Ring Chart Dinámico -->
				<div 
					class="ring-chart-dynamic" 
					style="background: {ringGradient};"
					title="Distribución por categorías"
				>
					<div class="ring-chart-inner">
						<span style="font-size: 0.7rem; font-weight: bold; color: white;">{activeTasksCount}</span>
					</div>
				</div>
			</div>

			<!-- Leyenda de Categorías -->
			{#if categoryBreakdown.length > 0}
				<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px;">
					{#each categoryBreakdown as cat}
						<div class="is-flex is-align-items-center" style="font-size: 0.72rem; gap: 4px;">
							<span style="width: 8px; height: 8px; border-radius: 50%; background: {cat.color}; display: inline-block;"></span>
							<span style="color: var(--text-muted);">{cat.label}: <strong style="color: white;">{cat.count}</strong></span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</Motion>

	<!-- Card 2: Tareas en progreso y completadas -->
	<Motion
		initial={{ opacity: 0, y: 10 }}
		animate={{ opacity: 1, y: 0 }}
		whileHover={{ y: -2 }}
		transition={{ duration: 0.2, delay: 0.05 }}
		let:motion
	>
		<div use:motion class="glass-panel bento-card">
			<div class="is-flex is-justify-content-space-between is-align-items-center">
				<span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 500;">Estado de Tareas</span>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent-primary)">
					<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
				</svg>
			</div>
			<div class="is-size-3-desktop is-size-4-tablet is-size-5-mobile" style="font-weight: bold; color: var(--accent-primary); line-height: 1; margin: 4px 0;">
				{tasks.length}
			</div>
			<div style="font-size: 0.78rem; display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
				<div class="is-flex is-justify-content-space-between is-align-items-center">
					<span class="is-flex is-align-items-center">
						<span style="width: 7px; height: 7px; border-radius: 50%; background: var(--accent-primary); display: inline-block; margin-right: 6px;"></span>
						<span style="color: var(--text-muted);">En curso / Activas</span>
					</span>
					<span style="color: white; font-weight: bold;">{activeTasksCount - completedTasks}</span>
				</div>
				<div class="is-flex is-justify-content-space-between is-align-items-center">
					<span class="is-flex is-align-items-center">
						<span style="width: 7px; height: 7px; border-radius: 50%; background: #ffd166; display: inline-block; margin-right: 6px;"></span>
						<span style="color: var(--text-muted);">Completadas (Archivo)</span>
					</span>
					<span style="color: white; font-weight: bold;">{completedTasks}</span>
				</div>
			</div>
		</div>
	</Motion>
</div>

<style>
	.ring-chart-dynamic {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		position: relative;
	}

	.ring-chart-inner {
		width: 38px;
		height: 38px;
		background: #151f24;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>

{@render children?.()}
