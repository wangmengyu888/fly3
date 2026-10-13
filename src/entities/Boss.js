/* =========================================================================
 * Boss.js —— 多阶段 Boss
 * 字段与 GDD 第 5.5 节一致；弹幕形态见 7.2 / 8.3。
 * ========================================================================= */

class Boss extends Entity {
  constructor() {
    super();
    this.reset();
  }

  reset() {
    this.active = true;
    this.x = CONFIG.CANVAS.W / 2;
    this.y = -160;
    this.vx = 0; this.vy = 0;
    this.radius = 96;
    this.team = 'enemy';
    this.type = 'boss';
    this.maxHp = 6000; this.hp = 6000;
    this.scoreValue = 8000;

    this.key = '';
    this.name = 'BOSS';
    this.subtitle = '';
    this.color = '#ff4d6d';
    this.accent = '#ffe600';

    this.phase = 1;
    this.phaseThresholds = [0.7, 0.35];
    this.phases = [{ patterns: ['fan'], interval: 1.5 }];
    this.attackTimer = 1.5;
    this.patternIndex = 0;
    this.currentPattern = 'fan';
    this.weakPoints = [];
    this.enrage = false;
    this.parts = [];
    this.entryTimer = 0;
    this.deadTimer = 0;

    this.state = 'entry';       // entry | fight | dying
    this.invuln = 1.0;
    this.hitFlash = 0;
    this.t = 0;
    this.spiralAngle = 0;
    this.sweepAngle = Math.PI / 2;
    this.deathExplodeTimer = 0;
  }

  spawn(key, scene) {
    const cfg = CONFIG.BOSS_TABLE[key];
    this.reset();
    this.key = key;
    this.name = cfg.name;
    this.subtitle = cfg.subtitle;
    this.color = cfg.color;
    this.accent = cfg.accent;
    this.radius = cfg.radius;
    this.maxHp = this.hp = cfg.hp;
    this.scoreValue = cfg.scoreValue;
    this.phaseThresholds = cfg.thresholds.slice();
    this.phases = cfg.phases.slice();
    this.attackTimer = 2.0;
    this.entryTimer = 2.2;
    this.x = scene.W / 2;
    this.y = -160;

    // 可破坏侧翼炮台
    this.parts = [
      { offsetX: -78, offsetY: 34, radius: 30, hp: Math.round(cfg.hp * 0.12), maxHp: Math.round(cfg.hp * 0.12), destroyed: false, fireTimer: 2.5, x: 0, y: 0 },
      { offsetX: 78, offsetY: 34, radius: 30, hp: Math.round(cfg.hp * 0.12), maxHp: Math.round(cfg.hp * 0.12), destroyed: false, fireTimer: 3.2, x: 0, y: 0 }
    ];
    scene.audio.play('alarm');
    return this;
  }

  /* ---------------------------------------------------- 主更新 */
  update(dt, scene) {
    this.t += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.invuln > 0) this.invuln -= dt;

    if (this.state === 'entry') { this._updateEntry(dt, scene); }
    else if (this.state === 'dying') { this._updateDying(dt, scene); }
    else { this._updateFight(dt, scene); }
  }

  _updateEntry(dt, scene) {
    this.y += (250 - this.y) * Math.min(1, dt * 2.4);
    this.entryTimer -= dt;
    if (this.entryTimer <= 0) {
      this.state = 'fight';
      this.invuln = 0.4;
      scene.shake(10, 0.4);
      scene.audio.play('alarm');
    }
  }

  _updateDying(dt, scene) {
    this.deadTimer -= dt;
    this.deathExplodeTimer -= dt;
    this.y += 10 * dt;
    if (this.deathExplodeTimer <= 0) {
      this.deathExplodeTimer = 0.12;
      const ex = this.x + rand(-this.radius, this.radius);
      const ey = this.y + rand(-this.radius * 0.7, this.radius * 0.7);
      scene.particles.explode(ex, ey, Math.random() < 0.5 ? this.color : '#ffffff', 12, 1.2);
      scene.shake(9, 0.25);
      scene.audio.play('explode');
    }
    if (this.deadTimer <= 0) {
      this.active = false;
      scene.onBossDefeated(this);
    }
  }

  _updateFight(dt, scene) {
    const ratio = this.hp / this.maxHp;

    // 阶段切换
    let np = 1;
    for (let i = 0; i < this.phaseThresholds.length; i++) if (ratio <= this.phaseThresholds[i]) np = i + 2;
    if (np > this.phase) this._enterPhase(np, scene);

    // 狂暴
    if (ratio < 0.2 && !this.enrage) {
      this.enrage = true;
      scene.shake(12, 0.5);
      scene.particles.floatText('狂暴', this.x, this.y + this.radius + 30, '#ff2e4d', 26);
    }

    // 移动
    const speedMul = this.enrage ? 1.3 : 1;
    this.x = scene.W / 2 + Math.sin(this.t * 0.5 * speedMul) * 170;
    this.y = 250 + Math.sin(this.t * 0.9 * speedMul) * 22;

    // 侧翼炮台
    for (let i = 0; i < this.parts.length; i++) {
      const pt = this.parts[i];
      pt.x = this.x + pt.offsetX;
      pt.y = this.y + pt.offsetY;
      if (pt.destroyed) continue;
      pt.fireTimer -= dt;
      if (pt.fireTimer <= 0 && this.invuln <= 0) {
        pt.fireTimer = (2.6 - this.phase * 0.35) / speedMul;
        const p = scene.player;
        if (p && p.active) {
          const bs = CONFIG.ENEMY_BULLET.speed * (p.enemyBulletSlow || 1) * (this.enrage ? 1.3 : 1);
          const a = Math.atan2(p.y - pt.y, p.x - pt.x);
          scene.spawnEnemyBullet(pt.x, pt.y, Math.cos(a) * bs, Math.sin(a) * bs, { color: this.accent });
        }
      }
    }

    // 主攻击循环
    if (this.invuln <= 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        const ph = this.phases[Math.min(this.phase - 1, this.phases.length - 1)];
        const pats = ph.patterns;
        this.currentPattern = pats[this.patternIndex % pats.length];
        this.patternIndex++;
        this.attackTimer = (ph.interval / (this.enrage ? 1.3 : 1)) * (scene.ddaFactor || 1);
        this._fire(this.currentPattern, scene);
      }
    }
  }

  _enterPhase(np, scene) {
    this.phase = np;
    this.invuln = 1.2;
    scene.clearEnemyBullets();
    scene.shake(16, 0.6);
    scene.particles.explode(this.x, this.y, this.accent, 26, 1.6);
    scene.particles.floatText('PHASE ' + np, this.x, this.y - this.radius - 20, this.accent, 28);
    scene.audio.play('alarm');
    // 阶段冲击波（可躲，留缝隙）
    const bs = CONFIG.ENEMY_BULLET.speed * 0.8;
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      scene.spawnEnemyBullet(this.x, this.y, Math.cos(a) * bs, Math.sin(a) * bs, { color: this.accent });
    }
  }

  /* ---------------------------------------------------- 弹幕形态 */
  _fire(pattern, scene) {
    const p = scene.player;
    const weakMul = this.enrage ? 1.3 : 1;
    const bs = CONFIG.ENEMY_BULLET.speed * (p ? p.enemyBulletSlow || 1 : 1) * weakMul;
    const cx = this.x, cy = this.y + this.radius * 0.5;
    const base = (p && p.active) ? Math.atan2(p.y - cy, p.x - cx) : Math.PI / 2;

    switch (pattern) {
      case 'fan': {
        const n = 5 + this.phase;
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.16;
          scene.spawnEnemyBullet(cx, cy, Math.cos(a) * bs, Math.sin(a) * bs, { color: this.color });
        }
        break;
      }
      case 'spread': {
        const n = 7;
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.24;
          scene.spawnEnemyBullet(cx, cy, Math.cos(a) * bs, Math.sin(a) * bs, { color: this.color });
        }
        break;
      }
      case 'ring': {
        const n = 16 + this.phase * 2;
        const off = Math.random() * Math.PI * 2;
        for (let i = 0; i < n; i++) {
          const a = off + i / n * Math.PI * 2;
          scene.spawnEnemyBullet(cx, cy, Math.cos(a) * bs * 0.8, Math.sin(a) * bs * 0.8, { color: this.accent });
        }
        break;
      }
      case 'spiral': {
        for (let k = 0; k < 3; k++) {
          const a = this.spiralAngle + k * (Math.PI * 2 / 3);
          scene.spawnEnemyBullet(cx, cy, Math.cos(a) * bs, Math.sin(a) * bs, { color: this.color });
        }
        this.spiralAngle += 0.42;
        break;
      }
      case 'laserSweep': {
        // 沿一条射线连发，形成扫射光束，玩家可侧移躲开
        this.sweepAngle += 0.5;
        const a = Math.PI / 2 + Math.sin(this.sweepAngle) * 0.9;
        for (let i = 0; i < 7; i++) {
          const d = 40 + i * 55;
          scene.spawnEnemyBullet(cx + Math.cos(a) * d, cy + Math.sin(a) * d, Math.cos(a) * bs * 1.2, Math.sin(a) * bs * 1.2, { color: this.accent, size: 8 });
        }
        break;
      }
      case 'wall': {
        // 横排弹墙，随机留 2 个缝隙
        const cols = 12;
        const gap = randInt(3, cols - 4);
        const gap2 = gap + 2;
        for (let i = 0; i < cols; i++) {
          if (i === gap || i === gap2) continue;
          const x = 40 + i * ((scene.W - 80) / (cols - 1));
          scene.spawnEnemyBullet(x, this.y + this.radius * 0.4, 0, bs * 0.9, { color: this.color });
        }
        break;
      }
      case 'summon': {
        scene.spawnEnemyByKind('scout', this.x - 90, this.y, { targetY: 260 });
        scene.spawnEnemyByKind('scout', this.x + 90, this.y, { targetY: 260 });
        break;
      }
    }
    scene.audio.play('hit');
  }

  /* ---------------------------------------------------- 受击 */
  takeDamage(dmg, scene) {
    if (this.state !== 'fight' || this.invuln > 0) return false;
    this.hp -= dmg;
    this.hitFlash = 0.06;
    scene.particles.hitSpark(this.x + rand(-30, 30), this.y + rand(-20, 20), this.accent);
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dying';
      this.deadTimer = 1.4;
      this.deathExplodeTimer = 0;
      scene.audio.play('bossdie');
      scene.shake(24, 1.0);
    }
    return true;
  }

  damagePart(idx, dmg, scene) {
    const pt = this.parts[idx];
    if (!pt || pt.destroyed || this.state !== 'fight') return;
    pt.hp -= dmg;
    scene.particles.hitSpark(pt.x, pt.y, this.accent);
    if (pt.hp <= 0) {
      pt.destroyed = true;
      scene.particles.explode(pt.x, pt.y, this.accent, 20, 1.1);
      scene.shake(8, 0.3);
      scene.audio.play('explode');
      scene.addScore(1500);
    }
  }

  /* ---------------------------------------------------- 绘制 */
  draw(ctx) {
    const c = ctx;
    c.save();
    // 入场警示
    if (this.state === 'entry') {
      c.save();
      c.globalAlpha = 0.35 + 0.25 * Math.sin(this.t * 12);
      c.fillStyle = '#ff2e4d';
      c.fillRect(0, 0, CONFIG.CANVAS.W, CONFIG.CANVAS.H);
      c.restore();
    }

    const flick = this.invuln > 0 && Math.floor(this.t * 18) % 2 === 0;
    c.translate(this.x, this.y);
    if (flick) c.globalAlpha = 0.55;

    // 外壳
    c.shadowColor = this.color; c.shadowBlur = 30;
    c.fillStyle = this.hitFlash > 0 ? '#ffffff' : 'rgba(20,6,20,0.95)';
    const r = this.radius;
    c.beginPath();
    c.moveTo(0, -r * 0.9);
    c.lineTo(r * 0.9, -r * 0.2);
    c.lineTo(r * 0.6, r * 0.85);
    c.lineTo(-r * 0.6, r * 0.85);
    c.lineTo(-r * 0.9, -r * 0.2);
    c.closePath();
    c.fill();
    c.lineWidth = 4; c.strokeStyle = this.color; c.stroke();

    // 能量纹路
    c.strokeStyle = this.accent; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-r * 0.5, -r * 0.1); c.lineTo(r * 0.5, -r * 0.1); c.stroke();
    c.beginPath(); c.moveTo(-r * 0.35, r * 0.3); c.lineTo(r * 0.35, r * 0.3); c.stroke();

    // 核心（脉动）
    const pulse = 0.7 + 0.3 * Math.sin(this.t * 5);
    c.shadowBlur = 26; c.shadowColor = this.accent;
    c.fillStyle = this.accent;
    c.globalAlpha *= pulse;
    c.beginPath(); c.arc(0, -r * 0.05, r * 0.24, 0, Math.PI * 2); c.fill();
    c.globalAlpha /= pulse;
    c.shadowBlur = 0;

    // 侧翼炮台
    for (let i = 0; i < this.parts.length; i++) {
      const pt = this.parts[i];
      if (pt.destroyed) {
        c.fillStyle = 'rgba(80,40,50,0.6)';
        c.beginPath(); c.arc(pt.offsetX, pt.offsetY, pt.radius * 0.7, 0, Math.PI * 2); c.fill();
        continue;
      }
      c.shadowColor = this.accent; c.shadowBlur = 16;
      c.fillStyle = this.color;
      c.beginPath(); c.arc(pt.offsetX, pt.offsetY, pt.radius, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(pt.offsetX, pt.offsetY, pt.radius * 0.4, 0, Math.PI * 2); c.fill();
      c.shadowBlur = 0;
    }
    c.restore();
  }
}