<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    // Definición de las propiedades (Props) usando la nueva runa $props() en Svelte 5
    interface Props {
        effectConfig?: string;
        children?: import('svelte').Snippet; // Soporte moderno para slots con Snippets
    }

    let { 
        effectConfig = "effect:space-cockpit;color:blue;speed:normal;lighting:none;mood:intro",
        children 
    }: Props = $props();

    let canvas: HTMLCanvasElement;
    let animationFrameId: number;

    // Runa de derivación ($derived) para procesar la cadena de configuración automáticamente
    let parsedConfig = $derived(() => {
        const parts = effectConfig.split(';');
        const getVal = (prefix: string, fallback: string) => 
            parts.find(p => p.startsWith(prefix))?.replace(prefix, '') || fallback;

        return {
            effect: getVal('effect:', 'space-cockpit'),
            color: getVal('color:', 'blue'),
            speed: getVal('speed:', 'normal'),
            lighting: getVal('lighting:', 'none'),
            mood: getVal('mood:', 'intro')
        };
    });

    onMount(() => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = (canvas.width = canvas.parentElement?.clientWidth || 300);
        let height = (canvas.height = canvas.parentElement?.clientHeight || 400);

        let particles: any[] = [];
        const particleCount = 70;

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 2.5 + 0.8,
                speedY: (Math.random() * 2 - 1),
                speedX: (Math.random() * 2 - 1),
                alpha: Math.random()
            });
        }

        const render = () => {
            ctx.clearRect(0, 0, width, height);
            const current = parsedConfig();

            // 1. Renderizado de Fondo según el efecto o mood
            if (current.effect === 'space-cockpit' || current.effect === 'hyper-warp') {
                ctx.fillStyle = '#030309';
            } else if (current.effect === 'alien-forest' || current.effect === 'toxic-rain') {
                ctx.fillStyle = '#021207';
            } else if (current.effect === 'fire-battle' || current.effect === 'volcano-embers') {
                ctx.fillStyle = '#140402';
            } else if (current.effect === 'blood-drip') {
                ctx.fillStyle = '#110202';
            } else {
                ctx.fillStyle = '#0A0A0F';
            }
            ctx.fillRect(0, 0, width, height);

            // 2. Factor multiplicador de velocidad basado en la runa speed
            let speedMultiplier = 1;
            if (current.speed === 'slow') speedMultiplier = 0.4;
            if (current.speed === 'fast') speedMultiplier = 2.2;
            if (current.speed === 'chaotic') speedMultiplier = 3.5;
            if (current.speed === 'static') speedMultiplier = 0.05;

            // 3. Renderizado y Física de Partículas
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

                // Mapeo cromático avanzado según la etiqueta de color
                if (current.color === 'blue' || current.color === 'ice-cyan') {
                    ctx.fillStyle = `rgba(120, 210, 255, ${p.alpha})`;
                } else if (current.color === 'toxic-green') {
                    ctx.fillStyle = `rgba(40, 255, 140, ${p.alpha})`;
                } else if (current.color === 'infernal-orange' || current.color === 'apocalyptic-rust') {
                    ctx.fillStyle = `rgba(255, 130, 40, ${p.alpha})`;
                } else if (current.color === 'blood-red') {
                    ctx.fillStyle = `rgba(240, 40, 40, ${p.alpha})`;
                } else if (current.color === 'cyberpunk-neon') {
                    ctx.fillStyle = `rgba(255, 50, 200, ${p.alpha})`;
                } else if (current.color === 'fantasy-gold') {
                    ctx.fillStyle = `rgba(255, 215, 0, ${p.alpha})`;
                } else {
                    ctx.fillStyle = `rgba(200, 200, 200, ${p.alpha})`;
                }

                ctx.fill();

                // Comportamientos físicos específicos por tipo de efecto
                if (current.effect === 'fire-battle' || current.effect === 'volcano-embers' || current.effect === 'ash-storm') {
                    p.y -= (Math.random() * 2 + 0.5) * speedMultiplier;
                    p.x += (Math.random() - 0.5) * 1.5 * speedMultiplier;
                    if (p.y < 0) { p.y = height; p.x = Math.random() * width; }
                } else if (current.effect === 'hyper-warp') {
                    p.x += (p.speedX * 5) * speedMultiplier;
                    if (p.x > width) p.x = 0;
                } else {
                    p.y += p.speedY * speedMultiplier;
                    p.x += p.speedX * speedMultiplier;
                    if (p.x < 0) p.x = width;
                    if (p.x > width) p.x = 0;
                    if (p.y < 0) p.y = height;
                    if (p.y > height) p.y = 0;
                }
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        const handleResize = () => {
            if (!canvas || !canvas.parentElement) return;
            width = canvas.width = canvas.parentElement.clientWidth;
            height = canvas.height = canvas.parentElement.clientHeight;
        };

        window.addEventListener('resize', handleResize);

        onDestroy(() => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        });
    });
</script>

<div class="canvas-container">
    <canvas bind:this={canvas}></canvas>
    
    <div class="lighting-layer {parsedConfig().lighting}"></div>

    <div class="hud-overlay box">
        {#if children}
            {@render children()}
        {/if}
    </div>
</div>

<style>
    .canvas-container {
        position: relative;
        width: 100%;
        height: 40vh;
        border-radius: 16px;
        overflow:hidden;
    }
    canvas {
        display: block;
        width: 100%;
        height: 100%;
    }
    
    /* Efectos dinámicos de iluminación CSS sobre el canvas */
    .lighting-layer {
        position: absolute;
        inset: 0;
        pointer-events: none;
        mix-blend-mode: overlay;
        transition: background 0.5s ease;
    }
    .vignette-dark {
        box-shadow: inset 0 0 80px rgba(0, 0, 0, 0.85);
    }
    .strobe-alarm {
        background: radial-gradient(circle, rgba(255,0,0,0.15) 0%, rgba(0,0,0,0.6) 90%);
        animation: pulse-strobe 1.5s infinite alternate;
    }
    .candle-flicker {
        background: radial-gradient(circle, rgba(255,140,0,0.1) 0%, rgba(0,0,0,0.5) 80%);
        animation: flicker 0.8s infinite alternate;
    }

    @keyframes pulse-strobe {
        0% { opacity: 0.3; }
        100% { opacity: 0.8; }
    }
    @keyframes flicker {
        0% { opacity: 0.4; }
        100% { opacity: 0.7; }
    }

    .hud-overlay {
        position: absolute;
        inset: 0;
        pointer-events: auto; /* Permitir interacción con el contenido */
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 1.5rem;
        background: linear-gradient(to top, rgba(3,3,6,0.95) 0%, rgba(3,3,6,0.4) 50%, transparent 100%);
        overflow-y: auto; /* Permitir scroll vertical */
        scrollbar-width: thin; /* Scrollbar estético */
        scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
    }
</style>