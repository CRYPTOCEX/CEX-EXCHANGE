"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

interface ParticleBackgroundProps {
  particleCount?: number;
  particleSize?: [number, number];
  particleColors?: string[];
  speed?: number;
  opacity?: number;
  connectParticles?: boolean;
  className?: string;
}

export default function ParticleBackground({
  particleCount = 100,
  particleSize = [1, 3],
  particleColors = ["#4F46E5", "#3B82F6", "#1E40AF", "#8B5CF6", "#6366F1"],
  speed = 0.5,
  opacity = 0.8,
  connectParticles = true,
  className = "",
}: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    // Adjust default colors based on theme
    if (!isDark) {
      particleColors = ["#4F46E5", "#3B82F6", "#6366F1", "#8B5CF6", "#6366F1"];
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    // Set canvas size
    const resizeCanvas = () => {
      if (canvas && canvas.parentElement) {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
        initParticles(); // Reinitialize particles when canvas is resized
      }
    };

    // Particle class
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;

        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * speed;
        this.vx = Math.cos(angle) * velocity;
        this.vy = Math.sin(angle) * velocity;

        this.size =
          particleSize[0] + Math.random() * (particleSize[1] - particleSize[0]);
        this.color =
          particleColors[Math.floor(Math.random() * particleColors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (!canvas) return;
        if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
        if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Initialize particles
    const initParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    // Connect particles with lines
    const connectParticlesFunc = () => {
      if (!ctx) return;
      const maxDistance = canvas.width * 0.08; // Maximum distance to connect particles

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            const opacity = 1 - distance / maxDistance;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${isDark ? "255, 255, 255" : "0, 0, 0"}, ${opacity * 0.2})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    };

    // Animation loop
    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw all particles
      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      // Connect particles with lines if enabled
      if (connectParticles) {
        connectParticlesFunc();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    // Initialize everything
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    initParticles();
    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    particleCount,
    particleSize,
    particleColors,
    speed,
    opacity,
    connectParticles,
    isDark,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
    />
  );
}
