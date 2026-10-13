/* =========================================================================
 * Enemy.js —— 普通敌机（6 种类型）
 * 字段与 GDD 第 5.4 节一致。
 * ========================================================================= */

class Enemy extends Entity {
  constructor() {
    super();
    this.kind = 'scout';
    this.movePattern = 'dive';
    this.fireInterval = 0;
    this.fireTimer = 0;
    this.bulletPattern = 'none';
    this.dropRate = 0;
    this.dropTable = [];
    this.formation = null;
    this.phase = 0;
    this.hitFlash = 0;

    this.speed = 120;
    this.size = 26;
    this.color = '#fff';
    this.t = 0;
    this.baseX = 0;
    this.targetY = 0;
    this.hovering = false;
    this.hoverTimer = 0;
    this.hpScale = 1;
    this.speedScale = 1;
    this.scoreMul = 1;
  }

  reset() {
    this.active = true;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.radius = 18;
    this.hp = 10; this.maxHp = 10;
    this.team = 'enemy';
    this.type = 'enemy';
    this.scoreValue = 100;
    this.kind = 'scout';
    this.movePattern = 'dive';
    this.fireInterval = 0;
    this.fireTimer = 0;
    this.bulletPattern = 'none';
    this.dropRate = 0;
    this.dropTable = [];
    this.formation = null;
    this.phase = 0;
    this.hitFlash = 0;
    this.speed = 120;
    this.size = 26;
    this.color = '#fff';
    this.t = 0;
    this.baseX = 0;
    this.targetY = 0;
    this.hovering = false;
    this.hoverTimer = 0;
    this.hpScale = 1;
    this.speedScale = 1;
    this.scoreMul = 1;
  }

  /** 按类型生成 */
  spawn(kind, x, y, opts) {
    opts = opts || {};
    const cfg = CONFIG.ENEMY_TABLE[kind] || CONFIG.ENEMY_TABLE.scout;
    this.kind = kind;
    this.x = x; this.y = y;
    this.baseX = x;
    this.radius = cfg.radius;
    this.speed = cfg.speed * (opts.speedScale || 1);
    this.movePattern = cfg.movePattern;
    this.fireInterval = cfg.fireInterval;
    this.fireTimer = 0.6 + Math.random() * 0.6;
    this.bulletPattern = cfg.bulletPattern;
    this.dropRate = cfg.dropRate;
    this.dropTable = cfg.dropTable.slice();
    this.scoreValue = cfg.scoreValue;
    this.color = cfg.color;
    this.size = cfg.size;
    this.hpScale = opts.hpScale || 1;
    this.speedScale = opts.speedScale || 1;
    this.scoreMul = opts.scoreMul || 1;
    this.hp = this.maxHp = Math.round(cfg.hp * this.hpScale);
    this.targetY = opts.targetY || (160 + Math.random() * 220);
    // 侧翼炮台从两侧进入
    if (opts.from === 'side') {
      this.targetY = 200 + Math.random() * 120;
    }
    return this;
  }

  update(dt, scene) {
    this.t += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    const H = scene.H;
    const speed = this.speed;

    switch (this.movePattern) {
      case 'sin':
        this.y += speed * dt;
        this.x = this.baseX + Math.sin(this.t * 2.2) * 70;
        break;
      case 'charge': {
        const p = scene.player;
        if (p && p.active) {
          const a = Math.atan2(p.y - this.y, p.x - this.x);
          this.vx = Math.cos(a) * speed;
          this.vy = Math.sin(a) * speed;
        }
        this.x += this.vx * dt; this.y += this.vy * dt;
        break;
      }
      case 'hover':
        if (!this.hovering) {
          this.y += speed * dt;
          if (this.y >= this.targetY) { this.hovering = true; this.hoverTimer = 0; }
        } else {
          this.hoverTimer += dt;
          // 悬浮左右横移
          this.x = this.baseX + Math.sin(this.t * 1.4) * 40;
          // 轰炸机/母舰缓慢下压
          if (this.kind === 'bomber') this.y += 18 * dt;
          if (this.kind === 'carrier') this.y += 8 * dt;
        }
        break;
      default: // dive
        this.y += speed * dt;
    }

    // 射击
    if (this.fireInterval > 0 && this.bulletPattern !== 'none') {
      if (this.y > 20 && this.y < H * 0.8) {
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
          this.fireTimer = this.fireInterval;
          this.shoot(scene);
        }
      }
    }

    if (this.isOffscreenH(H, 90)) return true;
    return false;
  }

  shoot(scene) {
    const p = scene.player;
    const bs = CONFIG.ENEMY_BULLET.speed * (p ? p.enemyBulletSlow : 1) * this.speedScale;
    const col = CONFIG.ENEMY_BULLET.color;
    const colAlt = CONFIG.ENEMY_BULLET.colorAlt;

    switch (this.bulletPattern) {
      case 'aimed': {
        if (!p || !p.active) return;
        const a = Math.atan2(p.y - this.y, p.x - this.x);
        scene.spawnEnemyBullet(this.x, this.y + 8, Math.cos(a) * bs, Math.sin(a) * bs, { color: col });
        break;
      }
      case 'spread': {
        const base = p && p.active ? Math.atan2(p.y - this.y, p.x - this.x) : Math.PI / 2;
        const n = this.kind === 'carrier' ? 5 : 3;
        const step = 0.2;
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * step;
          scene.spawnEnemyBullet(this.x, this.y + 10, Math.cos(a) * bs, Math.sin(a) * bs, { color: colAlt });
        }
        break;
      }
      case 'ring': {
        const n = 12;
        const off = Math.random() * Math.PI * 2;
        for (let i = 0; i < n; i++) {
          const a = off + i / n * Math.PI * 2;
          scene.spawnEnemyBullet(this.x, this.y, Math.cos(a) * bs * 0.75, Math.sin(a) * bs * 0.75, { color: col });
        }
        break;
      }
    }
    scene.audio.play('hit');
  }

  takeDamage(dmg, scene) {
    this.hp -= dmg;
    this.hitFlash = 0.08;
    if (this.hp <= 0) {
      this.die(scene);
      return true;
    }
    return false;
  }

  die(scene) {
    this.active = false;
    scene.onEnemyKilled(this);
  }

  draw(ctx) {
    const c = ctx;
    c.save();
    c.translate(this.x, this.y);
    c.shadowColor = this.color;
    c.shadowBlur = 14;
    c.fillStyle = this.hitFlash > 0 ? '#ffffff' : this.color;
    const s = this.size;

    switch (this.kind) {
      case 'scout':
        c.beginPath(); c.moveTo(0, s * 0.7); c.lineTo(s * 0.7, -s * 0.6); c.lineTo(0, -s * 0.25); c.lineTo(-s * 0.7, -s * 0.6); c.closePath(); c.fill();
        break;
      case 'fighter':
        c.beginPath(); c.moveTo(0, s * 0.8); c.lineTo(s * 0.55, 0); c.lineTo(s * 0.9, s * 0.5); c.lineTo(0, s * 0.2); c.lineTo(-s * 0.9, s * 0.5); c.lineTo(-s * 0.55, 0); c.closePath(); c.fill();
        break;
      case 'bomber':
        c.beginPath(); c.moveTo(-s * 0.9, -s * 0.5); c.lineTo(s * 0.9, -s * 0.5); c.lineTo(s * 0.6, s * 0.6); c.lineTo(-s * 0.6, s * 0.6); c.closePath(); c.fill();
        c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 0, s * 0.18, 0, Math.PI * 2); c.fill();
        break;
      case 'turret':
        c.rotate(this.t * 0.8);
        c.beginPath(); c.moveTo(0, -s * 0.7); c.lineTo(s * 0.7, 0); c.lineTo(0, s * 0.7); c.lineTo(-s * 0.7, 0); c.closePath(); c.fill();
        c.restore(); c.save(); c.translate(this.x, this.y);
        c.strokeStyle = this.color; c.lineWidth = 3; c.shadowBlur = 12;
        c.beginPath(); c.arc(0, 0, s * 0.85, 0, Math.PI * 2); c.stroke();
        break;
      case 'kamikaze':
        c.beginPath();
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const r = i % 2 ? s * 0.4 : s * 0.9; const px = Math.cos(a) * r, py = Math.sin(a) * r; if (i === 0) c.moveTo(px, py); else c.lineTo(px, py); }
        c.closePath(); c.fill();
        break;
      case 'carrier':
        c.beginPath(); c.moveTo(-s * 0.9, -s * 0.35); c.lineTo(s * 0.9, -s * 0.35); c.lineTo(s * 0.7, s * 0.5); c.lineTo(-s * 0.7, s * 0.5); c.closePath(); c.fill();
        c.fillStyle = '#ffcf3d';
        c.fillRect(-s * 0.5, -s * 0.15, s, s * 0.18);
        c.beginPath(); c.arc(0, s * 0.22, s * 0.16, 0, Math.PI * 2); c.fill();
        break;
      default:
        c.beginPath(); c.arc(0, 0, s * 0.6, 0, Math.PI * 2); c.fill();
    }
    c.restore();

    // 血条（仅高血量单位）
    if (this.maxHp > 60 && this.hp < this.maxHp) {
      const w = this.size * 1.6, x = this.x - w / 2, y = this.y - this.size - 12;
      c.save();
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(x, y, w, 4);
      c.fillStyle = '#ff2e4d'; c.fillRect(x, y, w * (this.hp / this.maxHp), 4);
      c.restore();
    }
  }
}