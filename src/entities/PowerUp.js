/* =========================================================================
 * PowerUp.js —— 掉落道具
 * 字段与 GDD 第 5.6 节一致。
 * ========================================================================= */

class PowerUp extends Entity {
  constructor() {
    super();
    this.kind = 'power';
    this.magnet = false;
    this.speed = CONFIG.POWERUP.speed;
    this.ttl = CONFIG.POWERUP.ttl;
    this.radius = CONFIG.POWERUP.radius;
    this.t = 0;
    this.color = '#00f5ff';
    this.label = 'P';
  }

  reset() {
    this.active = true;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.kind = 'power';
    this.magnet = false;
    this.speed = CONFIG.POWERUP.speed;
    this.ttl = CONFIG.POWERUP.ttl;
    this.radius = CONFIG.POWERUP.radius;
    this.t = 0;
    this.color = '#00f5ff';
    this.label = 'P';
  }

  init(kind, x, y, vx, vy) {
    const def = CONFIG.DROP_TABLE[kind] || CONFIG.DROP_TABLE.power;
    this.kind = kind;
    this.x = x; this.y = y;
    this.vx = vx || 0; this.vy = vy || this.speed;
    this.color = def.color;
    this.label = def.label;
    return this;
  }

  update(dt, scene) {
    this.t += dt;
    this.ttl -= dt;
    if (this.ttl <= 0) return true;

    const p = scene.player;
    if (p && (p.magnet || this.magnet)) {
      const dx = p.x - this.x, dy = p.y - this.y;
      const d = Math.hypot(dx, dy);
      if (p.magnet || d < CONFIG.POWERUP.magnetRange) {
        const k = CONFIG.POWERUP.magnetSpeed;
        this.vx = dx / (d || 1) * k;
        this.vy = dy / (d || 1) * k;
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.isOffscreenH(scene.H, 60)) return true;
    return false;
  }

  draw(ctx) {
    const c = ctx;
    const blink = this.ttl < 2 ? (0.4 + 0.6 * Math.abs(Math.sin(this.t * 12))) : 1;
    c.save();
    c.globalAlpha = blink;
    c.translate(this.x, this.y);
    c.rotate(this.t * 1.6);
    c.shadowColor = this.color; c.shadowBlur = 18;
    c.strokeStyle = this.color; c.lineWidth = 3;
    c.beginPath();
    const r = this.radius;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fill(); c.stroke();
    c.restore();

    c.save();
    c.fillStyle = this.color;
    c.shadowColor = this.color; c.shadowBlur = 14;
    c.font = '800 20px ' + CONFIG.FONT.family;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(this.label, this.x, this.y + 1);
    c.restore();
  }
}