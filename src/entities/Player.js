/* =========================================================================
 * Player.js —— 玩家
 * 字段与 GDD 第 5.2 节一致；额外挂载 Buff 派生属性。
 * ========================================================================= */

class Player extends Entity {
  constructor() {
    super();
    this.reset();
  }

  reset() {
    const P = CONFIG.PLAYER;
    this.active = true;
    this.id = ++__entityId;
    this.x = CONFIG.CANVAS.W / 2;
    this.y = P.respawnY;
    this.vx = 0; this.vy = 0;
    this.radius = P.radius;
    this.team = 'player';
    this.type = 'player';
    this.maxHp = P.lives; this.hp = P.lives;

    this.speed = P.speed;
    this.shield = 0;
    this.maxShield = 0;
    this.lives = P.lives;
    this.invincible = P.invincibleRespawn;
    this.weaponLevel = P.startLevel;
    this.weaponType = P.startWeapon;
    this.fireCooldown = 0;
    this.skillCooldown = 0;
    this.railgunCooldown = 0;
    this.bombs = P.startBombs;
    this.graze = 0;
    this.wingmen = [];
    this.buffs = {};
    this.pendingWing = 0;

    /* Buff 派生属性 */
    this.fireRateMul = 1;
    this.damageMul = 1;
    this.bulletSpeedMul = 1;
    this.critChance = 0;
    this.dodgeChance = 0;
    this.lifesteal = 0;
    this.magnet = false;
    this.extraBullets = 0;
    this.grazeEnergy = 0;
    this.enemyBulletSlow = 1;
    this.bulletPierceBonus = 0;

    this.t = 0;
  }

  /** 应用待加入的僚机（Buff 触发） */
  syncWingmen(scene) {
    while (this.pendingWing > 0 && this.wingmen.length < 2) {
      this.pendingWing--;
      const idx = this.wingmen.length;
      const offX = idx === 0 ? -52 : 52;
      this.wingmen.push(new Wingman().init(offX, 30));
    }
    this.pendingWing = 0;
  }

  update(dt, scene) {
    this.t += dt;
    this.invincible = Math.max(0, this.invincible - dt);
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.skillCooldown = Math.max(0, this.skillCooldown - dt);
    this.railgunCooldown = Math.max(0, this.railgunCooldown - dt);

    const input = scene.game.input;
    const B = CONFIG.BOUNDS;

    // 键盘移动
    let mx = input.axis.x * this.speed * dt;
    let my = input.axis.y * this.speed * dt;

    // 触屏相对拖拽（1:1 跟随手指）
    const mv = input.consumeMove();
    mx += mv.x; my += mv.y;

    this.x = clamp(this.x + mx, B.left, B.right);
    this.y = clamp(this.y + my, B.top, B.bottom);

    // 引擎尾焰粒子
    if (scene.particles && Math.random() < 0.9) {
      scene.particles.emit({
        x: this.x + (Math.random() * 2 - 1) * 5, y: this.y + 16,
        vx: (Math.random() * 2 - 1) * 24, vy: 200 + Math.random() * 120,
        life: 0.22, color: '#00f5ff', size: 3, kind: 'spark', drag: 0.92
      });
    }

    for (let i = 0; i < this.wingmen.length; i++) this.wingmen[i].update(dt, scene, this);
  }

  /** 受击判定：返回 'dodged' | 'shield' | 'hit' | 'none' */
  takeDamage(amount, scene) {
    if (this.invincible > 0 || !this.active) return 'none';
    if (this.dodgeChance > 0 && Math.random() < this.dodgeChance) {
      scene.particles.floatText('闪避', this.x, this.y - 30, '#b14bff', 18);
      return 'dodged';
    }
    if (this.shield > 0) {
      this.shield = Math.max(0, this.shield - (amount || 1) * 10);
      this.invincible = 0.8;
      scene.shake(6, 0.2);
      scene.audio.play('hurt');
      return 'shield';
    }
    this.lives -= 1;
    this.invincible = CONFIG.PLAYER.invincibleHit;
    scene.shake(14, 0.4);
    scene.audio.play('hurt');
    scene.particles.explode(this.x, this.y, '#00f5ff', 18, 1.1);
    if (this.lives <= 0) {
      this.active = false;
    } else {
      this.invincible = CONFIG.PLAYER.invincibleRespawn;
    }
    return 'hit';
  }

  draw(ctx) {
    const c = ctx;
    if (!this.active) return;
    const flick = this.invincible > 0 && Math.floor(this.t * 20) % 2 === 0;

    c.save();
    if (flick) c.globalAlpha = 0.4;

    // 护盾环
    if (this.shield > 0) {
      const sr = this.radius + 22;
      c.save();
      c.globalAlpha = 0.5 + 0.3 * Math.sin(this.t * 6);
      c.strokeStyle = '#39ff88'; c.shadowColor = '#39ff88'; c.shadowBlur = 18;
      c.lineWidth = 2.5;
      c.beginPath(); c.arc(this.x, this.y, sr, 0, Math.PI * 2); c.stroke();
      c.restore();
    }

    // 机体
    c.translate(this.x, this.y);
    c.shadowColor = '#00f5ff'; c.shadowBlur = 20;
    c.fillStyle = '#0bb7c9';
    c.beginPath();
    c.moveTo(0, -24);
    c.lineTo(11, 4);
    c.lineTo(6, 16);
    c.lineTo(0, 10);
    c.lineTo(-6, 16);
    c.lineTo(-11, 4);
    c.closePath();
    c.fill();
    // 机翼高光
    c.fillStyle = '#00f5ff';
    c.beginPath();
    c.moveTo(0, -20); c.lineTo(6, 2); c.lineTo(-6, 2);
    c.closePath(); c.fill();
    // 座舱
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(0, -4, 4, 0, Math.PI * 2); c.fill();

    // 判定核心
    if (CONFIG.DEBUG.showHitbox) {
      c.fillStyle = '#ff0000';
      c.beginPath(); c.arc(0, 0, this.radius, 0, Math.PI * 2); c.fill();
    }
    c.restore();

    for (let i = 0; i < this.wingmen.length; i++) this.wingmen[i].draw(ctx);
  }
}