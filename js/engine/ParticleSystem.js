/**
 * ParticleSystem - High-performance canvas particle manager for visual feedback
 */
export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  /**
   * Spawn a burst of particles at (x, y)
   * @param {number} x
   * @param {number} y
   * @param {string} color
   * @param {number} count
   */
  emitBurst(x, y, color = '#00f0ff', count = 20) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 2.5 + 1.5,
        color,
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.015
      });
    }
  }

  /**
   * Spawn a stream packet between two points
   */
  emitPacket(x1, y1, x2, y2, color = '#00ff88') {
    this.particles.push({
      x: x1,
      y: y1,
      targetX: x2,
      targetY: y2,
      progress: 0,
      speed: 0.03,
      isPacket: true,
      color,
      radius: 3,
      alpha: 1
    });
  }

  update(dt = 1) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.isPacket) {
        p.progress += p.speed * dt;
        p.x = p.x + (p.targetX - p.x) * (p.speed * dt * 2);
        p.y = p.y + (p.targetY - p.y) * (p.speed * dt * 2);
        if (p.progress >= 1) {
          this.particles.splice(i, 1);
        }
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= p.decay * dt;
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}
