/* =========================================================================
 * Particle.js —— 粒子系统 / 飘字
 * 全部走对象池，运行期零分配。
 * ========================================================================= */

/* 单个粒子（普通对象，由池管理） */
function makeParticle() {
  return {
    active: false,
    x: 0, y: 0, vx: 0, vy: 0,
    life: 0, maxLife: 1,
    color: '#fff', size: 2,
    kind: 'spark',       // spark | smoke | ring | debris
    drag: 0.9, gravity: 0,
    rot: 0, vr: 0,
    ringR: 0, ringMax: 0
  };
}
function resetParticle(p) {
  p.x = 0; p.y = 0; p.vx = 0; p.vy = 0;
  p.life = 0; p.maxLife = 1;
  p.color = '#fff'; p.size = 2; p.kind = 'spark';
  p.drag = 0.9; p.gravity = 0; p.rot = 0; p.vr = 0;
  p.ringR = 0; p.ringMax = 0;
}

function makeFloatText() {
  return { active: false, x: 0, y: 0, vy: -46, life: 0, maxLife: 0.9, text: '', color: '#fff', size: 18 };
}
function resetFloatText(t) {
  t.x = 0; t.y = 0; t.vy = -46; t.life = 0; t.maxLife = 0.9;
  t.text = ''; t.color = '#fff'; t.size = 18;
}

class ParticleSystem {
  constructor() {
    this.particles = new Pool(makeParticle, resetParticle, 400, 1400);
    this.texts = new Pool(makeFloatText, resetFloatText, 40, 200);
  }

  /* ---------------------------------------------------- 发射器 */
  emit(p) {
    const o = this.particles.acquire();
    o.x = p.x; o.y = p.y;
    o.vx = p.vx || 0; o.vy = p.vy || 0;
    o.maxLife = o.life = p.life || 0.5;
    o.color = p.color || '#fff';
    o.size = p.size || 2;
    o.kind = p.kind || 'spark';
    o.drag = p.drag === undefined ? 0.92 : p.drag;
    o.gravity = p.gravity || 0;
    o.rot = p.rot || 0; o.vr = p.vr || 0;
    o.ringR = 0; o.ringMax = p.ringMax || 0;
    return o;
  }

  hitSpark(x, y, color) {
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 160;
      this.emit({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.22, color: color, size: 2.2, kind: 'spark' });
    }
  }

  explode(x, y, color, count, scale) {
    count = count || 14; scale = scale || 1;
    // 冲击环
    this.emit({ x: x, y: y, life: 0.34, color: color, size: 3, kind: 'ring', ringMax: 46 * scale, drag: 1 });
    // 火花
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (90 + Math.random() * 300) * scale;
      this.emit({
        x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.3 + Math.random() * 0.4, color: (Math.random() < 0.5 ? color : '#ffffff'),
        size: (2 + Math.random() * 3) * scale, kind: 'spark', drag: 0.9
      });
    }
    // 碎片
    for (let i = 0; i < Math.round(count * 0.5); i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (60 + Math.random() * 220) * scale;
      this.emit({
        x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.5 + Math.random() * 0.5, color: color, size: (3 + Math.random() * 4) * scale,
        kind: 'debris', drag: 0.96, gravity: 260, rot: Math.random() * 6.28, vr: (Math.random() * 2 - 1) * 8
      });
    }
    // 烟雾
    for (let i = 0; i < 5; i++) {
      this.emit({
        x: x + (Math.random() * 2 - 1) * 14, y: y + (Math.random() * 2 - 1) * 14,
        vx: (Math.random() * 2 - 1) * 40, vy: (Math.random() * 2 - 1) * 40 - 20,
        life: 0.5 + Math.random() * 0.4, color: 'rgba(120,140,180,0.5)',
        size: (10 + Math.random() * 12) * scale, kind: 'smoke', drag: 0.9
      });
    }
  }

  trail(x, y, color, size) {
    this.emit({
      x: x + (Math.random() * 2 - 1) * 3, y: y,
      vx: (Math.random() * 2 - 1) * 20, vy: 60 + Math.random() * 60,
      life: 0.3, color: color, size: size || 3, kind: 'spark', drag: 0.94
    });
  }

  floatText(text, x, y, color, size) {
    const t = this.texts.acquire();
    t.x = x; t.y = y; t.text = text; t.color = color || '#fff'; t.size = size || 18;
    t.maxLife = t.life = 0.9; t.vy = -46;
  }

  /* ---------------------------------------------------- 更新 / 绘制 */
  update(dt) {
    this.particles.each((p) => {
      p.life -= dt;
      if (p.life <= 0) return true;
      if (p.kind === 'ring') {
        const t = 1 - p.life / p.maxLife;
        p.ringR = p.ringMax * t;
        return false;
      }
      p.vy += p.gravity * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.kind === 'smoke') p.size += 26 * dt;
      return false;
    });
    this.texts.each((t) => {
      t.life -= dt;
      t.vy += -30 * dt;
      t.y += t.vy * dt;
      if (t.life <= 0) return true;
      return false;
    });
  }

  draw(ctx) {
    const c = ctx;
    c.save();
    this.particles.each((p) => {
      const a = Math.max(0, p.life / p.maxLife);
      if (p.kind === 'ring') {
        c.globalAlpha = a * 0.9;
        c.strokeStyle = p.color;
        c.lineWidth = 3 + 3 * a;
        c.beginPath(); c.arc(p.x, p.y, p.ringR, 0, Math.PI * 2); c.stroke();
      } else if (p.kind === 'smoke') {
        c.globalAlpha = a * 0.5;
        c.fillStyle = p.color;
        c.beginPath(); c.arc(p.x, p.y, p.size, 0, Math.PI * 2); c.fill();
      } else if (p.kind === 'debris') {
        c.globalAlpha = a;
        c.save();
        c.translate(p.x, p.y); c.rotate(p.rot);
        c.fillStyle = p.color;
        c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        c.restore();
      } else {
        c.globalAlpha = a;
        c.fillStyle = p.color;
        c.beginPath(); c.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, Math.PI * 2); c.fill();
      }
      return false;
    });
    c.globalAlpha = 1;
    this.texts.each((t) => {
      const a = Math.max(0, Math.min(1, t.life / t.maxLife * 1.6));
      c.globalAlpha = a;
      c.font = '800 ' + t.size + 'px ' + CONFIG.FONT.family;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = t.color; c.shadowBlur = 12;
      c.fillStyle = t.color;
      c.fillText(t.text, t.x, t.y);
      return false;
    });
    c.globalAlpha = 1;
    c.restore();
  }

  clear() { this.particles.clear(); this.texts.clear(); }
  count() { return this.particles.countActive() + this.texts.countActive(); }
}