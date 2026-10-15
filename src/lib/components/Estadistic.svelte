<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Motion } from 'svelte-motion';
	import { getProjectCategory, type ProjectCategoryKey } from '$lib/chapterUtils';

	interface Props {
		children?: Snippet;
		datas?: any;
		tasks?: any[];
		[key: string]: any;
	}

	let { children, tasks = [] }: Props = $props();

	// Proyectos válidos (no abandonados)
	let validProjects = $derived(
		tasks.filter((t) => {
			const statusNum = parseInt(t.status, 10);
			return isNaN(statusNum) || statusNum !== -1;
		})
	);

	let totalProjectsCount = $derived(validProjects.length);

	// Categorías de Proyectos:
	// 1. Proyectos generales
	// 2. Infantil
	// 3. Aprendizaje (adolescente, habilidades, conocimiento universal)
	let projectCategories = $derived.by(() => {
		const counts: Record<ProjectCategoryKey, { count: number; color: string; label: string; tooltip: string }> = {
			general: {
				count: 0,
				color: '#19d4a8',
				label: 'Proyectos Generales',
				tooltip: 'Fantasía, ciencia ficción, aventura, terror, misterio, etc.'
			},
			kids: {
				count: 0,
				color: '#ffd166',
				label: 'Infantil',
				tooltip: 'Aprendizaje infantil'
			},
			learning: {
				count: 0,
				color: '#818cf8',
				label: 'Aprendizaje',
				tooltip: 'Aprendizaje adolescente, de habilidades y conocimiento universal'
			}
		};

		validProjects.forEach((t) => {
			const cat = getProjectCategory(t?.tema);
			counts[cat].count += 1;
		});

		return [
			{ key: 'general' as const, ...counts.general },
			{ key: 'kids' as const, ...counts.kids },
			{ key: 'learning' as const, ...counts.learning }
		];
	});

	// Conic-gradient para el ring chart de categorías de proyectos
	let projectRingGradient = $derived.by(() => {
		const total = totalProjectsCount;
		if (total === 0) return 'conic-gradient(#2a3b45 0deg 360deg)';

		let accumulated = 0;
		const stops: string[] = [];

		projectCategories.forEach((cat) => {
			if (cat.count > 0) {
				const percentage = (cat.count / total) * 100;
				const startAngle = (accumulated / 100) * 360;
				accumulated += percentage;
				const endAngle = (accumulated / 100) * 360;
				stops.push(`${cat.color} ${startAngle.toFixed(1)}deg ${endAngle.toFixed(1)}deg`);
			}
		});

		if (stops.length === 0) return 'conic-gradient(#2a3b45 0deg 360deg)';

		return `conic-gradient(${stops.join(', ')})`;
	});

	// Tareas Activas: en progreso en el dashboard (no archivadas, no completadas, no abandonadas)
	let activeTasksCount = $derived(
		tasks.filter((t) => {
			const statusNum = parseInt(t.status, 10);
			const maxLevels = Number(t.cantidad_de_niveles) || 1;
			return !t.isArchived && statusNum !== -1 && statusNum < maxLevels - 1;
		}).length
	);

	// Tareas Completadas: han completado todos los niveles en el dashboard (no archivadas, no abandonadas)
	let completedTasksCount = $derived(
		tasks.filter((t) => {
			const statusNum = parseInt(t.status, 10);
			const maxLevels = Number(t.cantidad_de_niveles) || 1;
			return !t.isArchived && statusNum !== -1 && statusNum >= maxLevels - 1;
		}).length
	);

	// Tareas Archivadas: marcadas como archivadas
	let archivedTasksCount = $derived(
		tasks.filter((t) => Boolean(t.isArchived)).length
	);

	// Tareas Abandonadas: con estado -1 y no archivadas
	let abandonedTasksCount = $derived(
		tasks.filter((t) => {
			const statusNum = parseInt(t.status, 10);
			return !t.isArchived && statusNum === -1;
		}).length
	);

	let totalTasksStatusCount = $derived(
		activeTasksCount + completedTasksCount + archivedTasksCount + abandonedTasksCount
	);

	// 4 Categorías de Estado de Tareas:
	// 1. Activas
	// 2. Completadas
	// 3. Archivadas (color azul cielo: #60a5fa)
	// 4. Abandonados (color coral: #e76666)
	let statusBreakdown = $derived([
		{ key: 'active', label: 'Activas', count: activeTasksCount, color: 'var(--accent-primary, #19d4a8)' },
		{ key: 'completed', label: 'Completadas', count: completedTasksCount, color: '#ffd166' },
		{ key: 'archived', label: 'Archivadas', count: archivedTasksCount, color: '#60a5fa' },
		{ key: 'abandoned', label: 'Abandonados', count: abandonedTasksCount, color: '#e76666' }
	]);

	// Conic-gradient para el ring chart de estado de tareas
	let statusRingGradient = $derived.by(() => {
		const total = totalTasksStatusCount;
		if (total === 0) return 'conic-gradient(#2a3b45 0deg 360deg)';

		let accumulated = 0;
		const stops: string[] = [];

		statusBreakdown.forEach((stat) => {
			if (stat.count > 0) {
				const percentage = (stat.count / total) * 100;
				const startAngle = (accumulated / 100) * 360;
				accumulated += percentage;
				const endAngle = (accumulated / 100) * 360;
				stops.push(`${stat.color} ${startAngle.toFixed(1)}deg ${endAngle.toFixed(1)}deg`);
			}
		});

		if (stops.length === 0) return 'conic-gradient(#2a3b45 0deg 360deg)';

		return `conic-gradient(${stops.join(', ')})`;
	});
</script>

<div class="bento-grid">
	<!-- Card 1: Total proyectos + Ring Chart por Categorías (Generales, Infantil, Aprendizaje) -->
	<Motion
		initial={{ opacity: 0, y: 10 }}
		animate={{ opacity: 1, y: 0 }}
		whileHover={{ y: -2 }}
		transition={{ duration: 0.2 }}
		let:motion
	>
		<div use:motion class="glass-panel bento-card">
			<div class="card-header-bar">
				<div class="card-title-group">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="var(--accent-primary)" style="flex-shrink: 0;">
						<path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
					</svg>
					<span class="card-title-text">Proyectos</span>
				</div>
			</div>

			<div class="card-content-layout">
				<div class="ring-wrapper">
					<div 
						class="ring-chart-dynamic" 
						style="background: {projectRingGradient};"
						title="Distribución de proyectos ({totalProjectsCount} en total)"
					>
						<div class="ring-chart-inner">
							<span class="ring-chart-number">{totalProjectsCount}</span>
						</div>
					</div>
				</div>

				<!-- Separación por las 3 Categorías de Proyectos -->
				<div class="stats-list">
					{#each projectCategories as cat}
						<div 
							class="stat-row"
							title={cat.tooltip}
						>
							<span class="is-flex is-align-items-center" style="min-width: 0; overflow: hidden;">
								<span class="stat-indicator" style="background: {cat.color};"></span>
								<span class="stat-label">{cat.label}</span>
							</span>
							<span class="stat-count">{cat.count}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</Motion>

	<!-- Card 2: Estado de Tareas (Activas, Completadas, Archivadas, Abandonados) -->
	<Motion
		initial={{ opacity: 0, y: 10 }}
		animate={{ opacity: 1, y: 0 }}
		whileHover={{ y: -2 }}
		transition={{ duration: 0.2, delay: 0.05 }}
		let:motion
	>
		<div use:motion class="glass-panel bento-card">
			<div class="card-header-bar">
				<div class="card-title-group">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="var(--accent-primary)" style="flex-shrink: 0;">
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
					</svg>
					<span class="card-title-text">Estado de Tareas</span>
				</div>
			</div>

			<div class="card-content-layout">
				<div class="ring-wrapper">
					<div 
						class="ring-chart-dynamic" 
						style="background: {statusRingGradient};"
						title="Distribución por estado ({totalTasksStatusCount} en total)"
					>
						<div class="ring-chart-inner">
							<span class="ring-chart-number">{totalTasksStatusCount}</span>
						</div>
					</div>
				</div>

				<!-- Separación por los 4 Estados de Tareas -->
				<div class="stats-list">
					{#each statusBreakdown as stat}
						<div class="stat-row">
							<span class="is-flex is-align-items-center" style="min-width: 0; overflow: hidden;">
								<span class="stat-indicator" style="background: {stat.color};"></span>
								<span class="stat-label">{stat.label}</span>
							</span>
							<span class="stat-count">{stat.count}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</Motion>
</div>

<style>
	.bento-grid {
		display: grid;
		grid-template-columns: 1fr 1fr !important;
		gap: 12px;
		margin-bottom: 24px;
	}

	@media (max-width: 480px) {
		.bento-grid {
			gap: 8px;
		}
	}

	.card-header-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 6px;
	}

	.card-title-group {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	.card-title-text {
		color: var(--text-muted);
		font-size: 0.76rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (max-width: 400px) {
		.card-title-text {
			font-size: 0.7rem;
		}
	}

	.card-content-layout {
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
		justify-content: space-between;
	}

	@media (min-width: 850px) {
		.card-content-layout {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
		}

		.ring-wrapper {
			order: 2;
			margin: 0 !important;
		}

		.stats-list {
			order: 1;
			flex: 1;
			min-width: 0;
		}
	}

	.ring-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
		margin: 2px auto 4px auto;
		flex-shrink: 0;
	}

	.ring-chart-dynamic {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
		position: relative;
		flex-shrink: 0;
	}

	.ring-chart-inner {
		width: 28px;
		height: 28px;
		background: #151f24;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.ring-chart-number {
		font-size: 0.7rem;
		font-weight: 700;
		color: white;
		line-height: 1;
	}

	.stats-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: 100%;
	}

	.stat-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		line-height: 1.25;
	}

	.stat-indicator {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		display: inline-block;
		margin-right: 5px;
		flex-shrink: 0;
	}

	.stat-label {
		color: var(--text-muted);
		font-size: 0.69rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (max-width: 400px) {
		.stat-label {
			font-size: 0.65rem;
		}
	}

	.stat-count {
		color: white;
		font-size: 0.72rem;
		font-weight: 700;
		margin-left: 6px;
		flex-shrink: 0;
	}

	:global(.bento-card) {
		padding: 14px 12px !important;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		height: 100%;
		border-radius: 18px !important;
	}

	@media (max-width: 480px) {
		:global(.bento-card) {
			padding: 12px 9px !important;
			border-radius: 16px !important;
		}
	}
</style>

{@render children?.()}
