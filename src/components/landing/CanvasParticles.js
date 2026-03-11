import React, { useEffect, useRef } from 'react';

export default function CanvasParticles() {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: -9999, y: -9999 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let W = window.innerWidth;
        let H = window.innerHeight;

        const resize = () => {
            W = canvas.width = window.innerWidth;
            H = canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const onMove = (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('mousemove', onMove);

        // Create particles
        const COUNT = 90;
        const particles = Array.from({ length: COUNT }, () => ({
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            r: Math.random() * 1.8 + 0.6,
            alpha: Math.random() * 0.5 + 0.1,
            // color variation: indigo or purple
            hue: Math.random() > 0.5 ? 240 : 270,
        }));

        const CONNECT_DIST = 130;
        const MOUSE_REPEL = 100;

        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;

            // Update
            for (const p of particles) {
                // Mouse repulsion
                const dx = p.x - mx;
                const dy = p.y - my;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MOUSE_REPEL) {
                    const force = (MOUSE_REPEL - dist) / MOUSE_REPEL;
                    p.vx += (dx / dist) * force * 0.4;
                    p.vy += (dy / dist) * force * 0.4;
                }

                // Damping
                p.vx *= 0.97;
                p.vy *= 0.97;
                // Clamp speed
                const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                if (speed > 1.5) { p.vx = (p.vx / speed) * 1.5; p.vy = (p.vy / speed) * 1.5; }

                p.x += p.vx;
                p.y += p.vy;
                // Wrap
                if (p.x < 0) p.x = W;
                if (p.x > W) p.x = 0;
                if (p.y < 0) p.y = H;
                if (p.y > H) p.y = 0;
            }

            // Draw connections
            for (let i = 0; i < COUNT; i++) {
                for (let j = i + 1; j < COUNT; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < CONNECT_DIST) {
                        const alpha = (1 - d / CONNECT_DIST) * 0.18;
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(99,102,241,${alpha})`;
                        ctx.lineWidth = 0.6;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            // Draw particles
            for (const p of particles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue},70%,65%,${p.alpha})`;
                ctx.fill();
            }

            animId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMove);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed', inset: 0, zIndex: 0,
                pointerEvents: 'none', opacity: 0.9,
            }}
        />
    );
}
