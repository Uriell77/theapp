<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    interface Props {
        effectConfig?: string;
        children?: import('svelte').Snippet;
    }

    let { 
        effectConfig = "effect:space-cockpit;color:deep-space-blue;speed:normal;lighting:none;mood:intro",
        children 
    }: Props = $props();

    let canvas: HTMLCanvasElement;
    let animationFrameId: number;

    let parsedConfig = $derived.by(() => {
        const raw = effectConfig || '';
        const parts = raw.split(';');
        const getVal = (prefix: string, fallback: string) => {
            const found = parts.find(p => p.trim().startsWith(prefix));
            if (!found) return fallback;
            const val = found.split(':')[1]?.trim();
            return val || fallback;
        };

        return {
            effect: getVal('effect:', 'space-cockpit'),
            color: getVal('color:', 'deep-space-blue'),
            speed: getVal('speed:', 'normal'),
            lighting: getVal('lighting:', 'none'),
            mood: getVal('mood:', 'intro')
        };
    });

    onMount(() => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
        let height = (canvas.height = canvas.parentElement?.clientHeight || 400);

        let currentEffect = '';
        let particles: any[] = [];
        let time = 0;

        // Estado del sistema de relámpagos
        let lightning = {
            active: false,
            flashAlpha: 0,
            timer: 0,
            nextStrike: 120 + Math.random() * 180,
            branches: [] as Array<{ x1: number; y1: number; x2: number; y2: number; width: number; alpha: number }>
        };

        const runeSymbols = ['᚛', '᚜', 'ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛟ', '✦', '✧', '⟡'];
        const matrixChars = '0123456789ABCDEF01アイウエオカキクケコサシスセソタチツテト';

        function generateLightningBolt(startX: number, startY: number, endY: number) {
            const branches: Array<{ x1: number; y1: number; x2: number; y2: number; width: number; alpha: number }> = [];
            let currX = startX;
            let currY = startY;

            while (currY < endY) {
                const nextY = currY + Math.random() * 25 + 10;
                const nextX = currX + (Math.random() - 0.5) * 45;
                branches.push({
                    x1: currX,
                    y1: currY,
                    x2: nextX,
                    y2: Math.min(nextY, endY),
                    width: 2.2,
                    alpha: 1.0
                });

                // Posibilidad de rama secundaria
                if (Math.random() < 0.35) {
                    let subX = currX;
                    let subY = currY;
                    for (let s = 0; s < 3; s++) {
                        const subNextX = subX + (Math.random() - 0.5) * 35;
                        const subNextY = subY + Math.random() * 20 + 8;
                        branches.push({
                            x1: subX,
                            y1: subY,
                            x2: subNextX,
                            y2: subNextY,
                            width: 1.2,
                            alpha: 0.8
                        });
                        subX = subNextX;
                        subY = subNextY;
                    }
                }

                currX = nextX;
                currY = nextY;
            }
            return branches;
        }

        function initParticlesForEffect(effect: string) {
            particles = [];
            currentEffect = effect;

            if (effect === 'fire-battle' || effect === 'volcano-embers') {
                const count = effect === 'volcano-embers' ? 95 : 120;
                for (let i = 0; i < count; i++) {
                    particles.push({
                        x: Math.random() * width,
                        y: Math.random() * height,
                        radius: Math.random() * 3 + 1,
                        speedY: Math.random() * 2.5 + 1.2,
                        speedX: (Math.random() - 0.5) * 1.5,
                        alpha: Math.random() * 0.9 + 0.1,
                        maxAlpha: Math.random() * 0.8 + 0.2,
                        seed: Math.random() * 100,
                        heat: Math.random(),
                        sizeFactor: Math.random() * 1.5 + 0.5
                    });
                }
            } else if (effect === 'electric-storm') {
                // Gotas de lluvia densas y rápidas
                for (let i = 0; i < 140; i++) {
                    particles.push({
                        x: Math.random() * width,
                        y: Math.random() * height,
                        length: Math.random() * 25 + 15,
                        speedY: Math.random() * 14 + 16,
                        speedX: -(Math.random() * 3 + 2),
                        alpha: Math.random() * 0.5 + 0.25,
                        thickness: Math.random() * 1.2 + 0.8
                    });
                }
            } else if (effect === 'snow-blizzard') {
                for (let i = 0; i < 110; i++) {
                    particles.push({
                        x: Math.random() * width,
                        y: Math.random() * height,
                        radius: Math.random() * 3.2 + 0.8,
                        speedY: Math.random() * 1.8 + 0.8,
                        speedX: -(Math.random() * 2 + 1),
                        swaySpeed: Math.random() * 0.04 + 0.015,
                        swayDist: Math.random() * 30 + 10,
                        phase: Math.random() * Math.PI * 2,
                        alpha: Math.random() * 0.7 + 0.3
                    });
                }
            } else if (effect === 'underwater-bubbles') {
                for (let i = 0; i < 65; i++) {
                    particles.push({
                        x: Math.random() * width,
                        y: Math.random() * height,
                        radius: Math.random() * 5 + 1.5,
                        speedY: Math.random() * 1.2 + 0.5,
                        wobbleSpeed: Math.random() * 0.05 + 0.02,
                        wobbleDist: Math.random() * 15 + 5,
                        phase: Math.random() * Math.PI * 2,
                        alpha: Math.random() * 0.6 + 0.2
                    });
                }
            } else if (effect === 'toxic-rain' || effect === 'alien-forest') {
                for (let i = 0; i < 80; i++) {
                    particles.push({
                        x: Math.random() * width,
                        y: Math.random() * height,
                        radius: Math.random() * 3.5 + 1,
                        speedY: (Math.random() - 0.5) * 1.2,
                        speedX: (Math.random() - 0.5) * 1.2,
                        pulseSpeed: Math.random() * 0.05 + 0.02,
                        phase: Math.random() * Math.PI * 2,
                        alpha: Math.random() * 0.8 + 0.2
                    });
                }
            } else if (effect === 'data-matrix') {
                const colWidth = 18;
                const cols = Math.floor(width / colWidth);
                for (let i = 0; i < cols; i++) {
                    particles.push({
                        x: i * colWidth + 5,
                        y: Math.random() * -height,
                        speed: Math.random() * 4 + 3,
                        chars: Array.from({ length: Math.floor(Math.random() * 12 + 6) }, () => 
                            matrixChars[Math.floor(Math.random() * matrixChars.length)]
                        ),
                        changeTimer: 0
                    });
                }
            } else if (effect === 'magic-runes') {
                for (let i = 0; i < 28; i++) {
                    particles.push({
                        x: Math.random() * width,
                        y: Math.random() * height,
                        symbol: runeSymbols[Math.floor(Math.random() * runeSymbols.length)],
                        size: Math.random() * 16 + 12,
                        speedY: (Math.random() - 0.5) * 0.8,
                        speedX: (Math.random() - 0.5) * 0.8,
                        rot: Math.random() * Math.PI * 2,
                        rotSpeed: (Math.random() - 0.5) * 0.02,
                        alpha: Math.random() * 0.7 + 0.2,
                        glowPulse: Math.random() * 0.05 + 0.02,
                        phase: Math.random() * Math.PI * 2
                    });
                }
            } else if (effect === 'hyper-warp') {
                for (let i = 0; i < 150; i++) {
                    particles.push({
                        x: (Math.random() - 0.5) * width * 2,
                        y: (Math.random() - 0.5) * height * 2,
                        z: Math.random() * width,
                        pz: Math.random() * width
                    });
                }
            } else if (effect === 'blood-drip') {
                for (let i = 0; i < 60; i++) {
                    particles.push({
                        x: Math.random() * width,
                        y: Math.random() * height,
                        length: Math.random() * 18 + 8,
                        radius: Math.random() * 2.5 + 1.2,
                        speedY: Math.random() * 3 + 1.5,
                        alpha: Math.random() * 0.7 + 0.3
                    });
                }
            } else if (effect === 'ash-storm') {
                for (let i = 0; i < 90; i++) {
                    particles.push({
                        x: Math.random() * width,
                        y: Math.random() * height,
                        radius: Math.random() * 2.8 + 0.8,
                        speedY: Math.random() * 1.5 + 0.5,
                        speedX: -(Math.random() * 2.5 + 0.8),
                        rot: Math.random() * Math.PI * 2,
                        rotSpeed: (Math.random() - 0.5) * 0.04,
                        alpha: Math.random() * 0.6 + 0.2
                    });
                }
            } else {
                // space-cockpit / nebula-dust / default
                for (let i = 0; i < 80; i++) {
                    particles.push({
                        x: Math.random() * width,
                        y: Math.random() * height,
                        radius: Math.random() * 2.2 + 0.6,
                        speedY: (Math.random() - 0.5) * 0.6,
                        speedX: (Math.random() - 0.5) * 0.6,
                        twinkleSpeed: Math.random() * 0.06 + 0.02,
                        phase: Math.random() * Math.PI * 2,
                        alpha: Math.random() * 0.8 + 0.2
                    });
                }
            }
        }

        function getColorValues(colorName: string) {
            switch (colorName) {
                case 'infernal-orange':
                    return { r: 255, g: 110, b: 20, glow: '#ff6600' };
                case 'blood-red':
                    return { r: 240, g: 30, b: 40, glow: '#ff1a25' };
                case 'deep-space-blue':
                    return { r: 60, g: 150, b: 255, glow: '#2b8aff' };
                case 'ice-cyan':
                    return { r: 90, g: 230, b: 255, glow: '#52e8ff' };
                case 'toxic-green':
                    return { r: 40, g: 255, b: 110, glow: '#26ff73' };
                case 'cyberpunk-neon':
                    return { r: 255, g: 50, b: 200, glow: '#ff33cc' };
                case 'fantasy-gold':
                    return { r: 255, g: 215, b: 40, glow: '#ffd700' };
                case 'void-purple':
                    return { r: 180, g: 70, b: 255, glow: '#b446ff' };
                case 'apocalyptic-rust':
                    return { r: 220, g: 100, b: 45, glow: '#dc642d' };
                case 'military-khaki':
                    return { r: 180, g: 170, b: 110, glow: '#b4aa6e' };
                default:
                    return { r: 120, g: 180, b: 255, glow: '#78b4ff' };
            }
        }

        const render = () => {
            time += 0.016;
            const current = parsedConfig;

            if (current.effect !== currentEffect) {
                initParticlesForEffect(current.effect);
            }

            let speedMult = 1;
            if (current.speed === 'slow') speedMult = 0.5;
            if (current.speed === 'fast') speedMult = 1.9;
            if (current.speed === 'chaotic') speedMult = 3.0;
            if (current.speed === 'static') speedMult = 0.08;

            const col = getColorValues(current.color);

            // 1. Fondos atmosféricos adaptados por entorno
            ctx.clearRect(0, 0, width, height);

            if (current.effect === 'fire-battle' || current.effect === 'volcano-embers') {
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, '#0f0302');
                grad.addColorStop(0.6, '#1a0502');
                grad.addColorStop(1, '#330a03');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);

                // Resplandor ardiente inferior
                const fireGlow = ctx.createRadialGradient(width * 0.5, height, 10, width * 0.5, height, width * 0.7);
                const firePulse = Math.sin(time * 5) * 0.08 + 0.22;
                fireGlow.addColorStop(0, `rgba(255, 90, 0, ${firePulse})`);
                fireGlow.addColorStop(0.6, `rgba(180, 20, 0, ${firePulse * 0.5})`);
                fireGlow.addColorStop(1, 'transparent');
                ctx.fillStyle = fireGlow;
                ctx.fillRect(0, 0, width, height);
            } else if (current.effect === 'electric-storm') {
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, '#03050d');
                grad.addColorStop(0.5, '#070c1a');
                grad.addColorStop(1, '#02040a');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
            } else if (current.effect === 'snow-blizzard') {
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, '#040912');
                grad.addColorStop(0.6, '#081324');
                grad.addColorStop(1, '#03070f');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
            } else if (current.effect === 'underwater-bubbles') {
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, '#021020');
                grad.addColorStop(0.5, '#010915');
                grad.addColorStop(1, '#00040a');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);

                // Rayos de luz submarinos superiores
                const lightRay = ctx.createLinearGradient(0, 0, width, height * 0.6);
                const rayAlpha = Math.sin(time * 1.5) * 0.04 + 0.07;
                lightRay.addColorStop(0, `rgba(100, 220, 255, ${rayAlpha})`);
                lightRay.addColorStop(0.4, `rgba(40, 150, 220, ${rayAlpha * 0.5})`);
                lightRay.addColorStop(1, 'transparent');
                ctx.fillStyle = lightRay;
                ctx.fillRect(0, 0, width, height);
            } else if (current.effect === 'toxic-rain' || current.effect === 'alien-forest') {
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, '#020d05');
                grad.addColorStop(0.7, '#05180c');
                grad.addColorStop(1, '#010803');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
            } else if (current.effect === 'magic-runes') {
                const grad = ctx.createRadialGradient(width * 0.5, height * 0.5, 20, width * 0.5, height * 0.5, width * 0.8);
                grad.addColorStop(0, '#19082c');
                grad.addColorStop(0.7, '#0b0314');
                grad.addColorStop(1, '#040108');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
            } else if (current.effect === 'blood-drip') {
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, '#180205');
                grad.addColorStop(0.8, '#0d0103');
                grad.addColorStop(1, '#050001');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
            } else if (current.effect === 'ash-storm') {
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, '#120f0d');
                grad.addColorStop(0.6, '#1b1411');
                grad.addColorStop(1, '#090706');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
            } else {
                ctx.fillStyle = '#05060b';
                ctx.fillRect(0, 0, width, height);
            }

            // 2. Renderizado dinámico de partículas según el ambiente
            if (current.effect === 'fire-battle' || current.effect === 'volcano-embers') {
                particles.forEach(p => {
                    p.y -= p.speedY * speedMult;
                    p.x += Math.sin(time * 3 + p.seed) * 1.4 * speedMult + p.speedX;

                    if (p.y < -10) {
                        p.y = height + 10;
                        p.x = Math.random() * width;
                    }

                    // Altura determina color del fuego (amarillo incandescente abajo -> naranja -> rojo/humo arriba)
                    const heightFactor = Math.max(0, Math.min(1, p.y / height));
                    const currentAlpha = p.alpha * heightFactor;

                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius * (0.6 + 0.4 * heightFactor), 0, Math.PI * 2);

                    if (heightFactor > 0.6) {
                        ctx.fillStyle = `rgba(255, 235, 120, ${currentAlpha})`;
                    } else if (heightFactor > 0.3) {
                        ctx.fillStyle = `rgba(255, 120, 20, ${currentAlpha})`;
                    } else {
                        ctx.fillStyle = `rgba(210, 40, 20, ${currentAlpha * 0.7})`;
                    }
                    ctx.fill();
                });
            } else if (current.effect === 'electric-storm') {
                // 2.1 Gotas de lluvia
                ctx.lineWidth = 1.2;
                particles.forEach(p => {
                    p.y += p.speedY * speedMult;
                    p.x += p.speedX * speedMult;

                    if (p.y > height) {
                        p.y = -p.length;
                        p.x = Math.random() * (width + 100);
                    }

                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x + p.speedX * 0.6, p.y + p.length);
                    ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${p.alpha})`;
                    ctx.stroke();
                });

                // 2.2 Sistema de Rayos y Relámpagos
                lightning.timer++;
                if (lightning.timer > lightning.nextStrike) {
                    lightning.active = true;
                    lightning.flashAlpha = 0.55;
                    lightning.branches = generateLightningBolt(Math.random() * (width * 0.8) + width * 0.1, 0, height * 0.85);
                    lightning.timer = 0;
                    lightning.nextStrike = (120 + Math.random() * 200) / speedMult;
                }

                if (lightning.active && lightning.branches.length > 0) {
                    // Trazado de relámpago
                    ctx.save();
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = '#bde4ff';
                    lightning.branches.forEach(b => {
                        ctx.beginPath();
                        ctx.moveTo(b.x1, b.y1);
                        ctx.lineTo(b.x2, b.y2);
                        ctx.lineWidth = b.width;
                        ctx.strokeStyle = `rgba(230, 245, 255, ${b.alpha * (lightning.flashAlpha * 1.8)})`;
                        ctx.stroke();
                    });
                    ctx.restore();

                    // Flash global de iluminación
                    ctx.fillStyle = `rgba(180, 220, 255, ${lightning.flashAlpha * 0.4})`;
                    ctx.fillRect(0, 0, width, height);

                    lightning.flashAlpha *= 0.86;
                    if (lightning.flashAlpha < 0.02) {
                        lightning.active = false;
                    }
                }
            } else if (current.effect === 'snow-blizzard') {
                const windGust = Math.sin(time * 1.8) * 1.5;
                particles.forEach(p => {
                    p.phase += p.swaySpeed;
                    p.y += p.speedY * speedMult;
                    p.x += (Math.sin(p.phase) * 1.2 + p.speedX + windGust) * speedMult;

                    if (p.y > height + 10) {
                        p.y = -10;
                        p.x = Math.random() * (width + 60);
                    }
                    if (p.x < -20) p.x = width + 20;

                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${p.alpha})`;
                    ctx.fill();
                });
            } else if (current.effect === 'underwater-bubbles') {
                particles.forEach(p => {
                    p.phase += p.wobbleSpeed;
                    p.y -= p.speedY * speedMult;
                    p.x += Math.sin(p.phase) * 0.8;

                    if (p.y < -15) {
                        p.y = height + 15;
                        p.x = Math.random() * width;
                    }

                    // Burbuja con borde y reflejo
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(120, 210, 255, ${p.alpha})`;
                    ctx.lineWidth = 1.2;
                    ctx.stroke();

                    // Brillo en esquina superior de la burbuja
                    ctx.beginPath();
                    ctx.arc(p.x - p.radius * 0.35, p.y - p.radius * 0.35, Math.max(0.6, p.radius * 0.25), 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.9})`;
                    ctx.fill();
                });
            } else if (current.effect === 'toxic-rain' || current.effect === 'alien-forest') {
                particles.forEach(p => {
                    p.phase += p.pulseSpeed;
                    p.y += (Math.sin(p.phase) * 0.7 + p.speedY) * speedMult;
                    p.x += (Math.cos(p.phase) * 0.7 + p.speedX) * speedMult;

                    if (p.y < 0) p.y = height;
                    if (p.y > height) p.y = 0;
                    if (p.x < 0) p.x = width;
                    if (p.x > width) p.x = 0;

                    const pulseAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.phase));
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(40, 255, 120, ${pulseAlpha})`;
                    ctx.fill();

                    // Resplandor tóxico
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(30, 220, 90, ${pulseAlpha * 0.25})`;
                    ctx.fill();
                });
            } else if (current.effect === 'data-matrix') {
                ctx.font = '13px monospace';
                particles.forEach(p => {
                    p.y += p.speed * speedMult;
                    p.changeTimer++;

                    if (p.changeTimer > 8) {
                        p.chars[Math.floor(Math.random() * p.chars.length)] = matrixChars[Math.floor(Math.random() * matrixChars.length)];
                        p.changeTimer = 0;
                    }

                    if (p.y - p.chars.length * 15 > height) {
                        p.y = 0;
                    }

                    p.chars.forEach((char: string, index: number) => {
                        const charY = p.y - index * 15;
                        if (charY > 0 && charY < height) {
                            if (index === 0) {
                                ctx.fillStyle = '#ffffff'; // Carácter guía brillante
                            } else {
                                const alpha = Math.max(0.1, 1 - index / p.chars.length);
                                ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${alpha})`;
                            }
                            ctx.fillText(char, p.x, charY);
                        }
                    });
                });
            } else if (current.effect === 'magic-runes') {
                particles.forEach(p => {
                    p.phase += p.glowPulse;
                    p.rot += p.rotSpeed * speedMult;
                    p.y += p.speedY * speedMult;
                    p.x += p.speedX * speedMult;

                    if (p.y < 0) p.y = height;
                    if (p.y > height) p.y = 0;
                    if (p.x < 0) p.x = width;
                    if (p.x > width) p.x = 0;

                    const runeAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.phase));

                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rot);
                    ctx.font = `${p.size}px serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${runeAlpha})`;
                    ctx.fillText(p.symbol, 0, 0);
                    ctx.restore();
                });
            } else if (current.effect === 'hyper-warp') {
                const cx = width / 2;
                const cy = height / 2;
                particles.forEach(p => {
                    p.z -= 18 * speedMult;
                    if (p.z <= 0) {
                        p.z = width;
                        p.pz = width;
                        p.x = (Math.random() - 0.5) * width * 2;
                        p.y = (Math.random() - 0.5) * height * 2;
                    }

                    const k = 220 / p.z;
                    const px = p.x * k + cx;
                    const py = p.y * k + cy;

                    const pk = 220 / p.pz;
                    const prevX = p.x * pk + cx;
                    const prevY = p.y * pk + cy;

                    p.pz = p.z;

                    if (px >= 0 && px <= width && py >= 0 && py <= height) {
                        const alpha = Math.min(1, (1 - p.z / width) * 1.5);
                        ctx.beginPath();
                        ctx.moveTo(prevX, prevY);
                        ctx.lineTo(px, py);
                        ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${alpha})`;
                        ctx.lineWidth = Math.max(0.8, (1 - p.z / width) * 2.8);
                        ctx.stroke();
                    }
                });
            } else if (current.effect === 'blood-drip') {
                particles.forEach(p => {
                    p.y += p.speedY * speedMult;
                    if (p.y > height + 20) {
                        p.y = -20;
                        p.x = Math.random() * width;
                    }

                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(220, 20, 30, ${p.alpha})`;
                    ctx.fill();

                    // Rastro viscoso
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x, p.y - p.length);
                    ctx.strokeStyle = `rgba(160, 10, 20, ${p.alpha * 0.4})`;
                    ctx.lineWidth = p.radius * 0.8;
                    ctx.stroke();
                });
            } else if (current.effect === 'ash-storm') {
                particles.forEach(p => {
                    p.rot += p.rotSpeed * speedMult;
                    p.y += p.speedY * speedMult;
                    p.x += p.speedX * speedMult;

                    if (p.y > height + 10) {
                        p.y = -10;
                        p.x = Math.random() * (width + 50);
                    }
                    if (p.x < -20) p.x = width + 20;

                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rot);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, p.radius * 1.5, p.radius * 0.8, 0, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${p.alpha})`;
                    ctx.fill();
                    ctx.restore();
                });
            } else {
                // space-cockpit / nebula / polvo estelar
                particles.forEach(p => {
                    p.phase += p.twinkleSpeed;
                    p.x += p.speedX * speedMult;
                    p.y += p.speedY * speedMult;

                    if (p.x < 0) p.x = width;
                    if (p.x > width) p.x = 0;
                    if (p.y < 0) p.y = height;
                    if (p.y > height) p.y = 0;

                    const alpha = p.alpha * (0.6 + 0.4 * Math.sin(p.phase));
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${alpha})`;
                    ctx.fill();
                });
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        const handleResize = () => {
            if (!canvas || !canvas.parentElement) return;
            width = canvas.width = canvas.parentElement.clientWidth;
            height = canvas.height = canvas.parentElement.clientHeight;
            if (currentEffect) {
                initParticlesForEffect(currentEffect);
            }
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
    
    <div class="lighting-layer {parsedConfig.lighting}"></div>

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
        min-height: 40vh;
        border-radius: 16px;
        overflow: hidden;
    }
    canvas {
        display: block;
        width: 100%;
        height: 100%;
    }
    
    /* Efectos de iluminación cinematográfica sobre el canvas */
    .lighting-layer {
        position: absolute;
        inset: 0;
        pointer-events: none;
        transition: opacity 0.5s ease;
    }
    .vignette-dark {
        box-shadow: inset 0 0 90px rgba(0, 0, 0, 0.9);
    }
    .strobe-alarm {
        background: radial-gradient(circle, rgba(255, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.65) 90%);
        animation: pulse-strobe 1.2s infinite alternate ease-in-out;
    }
    .candle-flicker {
        background: radial-gradient(ellipse at 50% 90%, rgba(255, 120, 0, 0.2) 0%, rgba(255, 50, 0, 0.08) 50%, transparent 85%);
        animation: flicker 0.75s infinite alternate ease-in-out;
    }
    .lightning-flash {
        background: radial-gradient(circle, rgba(160, 220, 255, 0.15) 0%, transparent 80%);
    }
    .lens-flare {
        background: linear-gradient(90deg, transparent 20%, rgba(100, 200, 255, 0.12) 50%, transparent 80%),
                    radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.2) 0%, rgba(100, 180, 255, 0.06) 40%, transparent 70%);
    }
    .eclipse-ring {
        background: radial-gradient(circle at 50% 40%, transparent 20%, rgba(180, 100, 255, 0.18) 30%, rgba(0, 0, 0, 0.6) 75%);
    }

    @keyframes pulse-strobe {
        0% { opacity: 0.2; }
        100% { opacity: 0.85; }
    }
    @keyframes flicker {
        0% { opacity: 0.35; }
        50% { opacity: 0.8; }
        100% { opacity: 0.5; }
    }

    .hud-overlay {
        position: absolute;
        inset: 0;
        pointer-events: auto;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 1.5rem;
        background: linear-gradient(to top, rgba(3, 3, 6, 0.95) 0%, rgba(3, 3, 6, 0.45) 55%, transparent 100%);
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
    }
</style>