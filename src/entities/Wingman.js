/* =========================================================================
 * Wingman.js —— 僚机（跟随玩家并自动射击）
 * 字段与 GDD 第 5.2 / 6.8 节。
 * ========================================================================= */

class Wingman {
  constructor() {
    this.active = true;
    this.offsetX = 0;
    this.offsetY = 30;
    this.x = 0; this.y = 0;
    this.radius = 12;
    this.fireTimer = 0;
    this.fireInterval = 0.30;
    this.damage = 8;
    this.t = 0;
  }

  init(offsetX, offsetY) {
    this.active = true;
    this.offsetX = offsetX;
    this.offsetY = offsetY === undefined ? 30 : offsetY;
    this.fireTimer = Math.random() * this.fireInterval;
    this.t = Math.random() * 6;
    return this;
  }

  update(dt, scene, player) {
    this.t += dt;
    const tx = player.x + this.offsetX;
    const ty = player.y + this.offsetY + Math.sin(this.t * 3) * 4;
    // 平滑跟随
    const k = 1 - Math.pow(0.001, dt);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;

    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = this.fireInterval / (player.fireRateMul || 1);
      scene.spawnPlayerBullet(this.x, this.y - 10, 0, -900, {
        damage: this.damage * player.damageMul,
        color: '#00f5ff', size: 4, radius: 5
      });
      scene.audio.play('shoot');
    }
  }

  draw(ctx) {
    const c = ctx;
    c.save();
    c.shadowColor = '#00f5ff'; c.shadowBlur = 10;
    c.translate(this.x, this.y);
    c.fillStyle = '#00d5e6';
    c.beginPath();
    c.moveTo(0, -12);
    c.lineTo(9, 10);
    c.lineTo(0, 5);
    c.lineTo(-9, 10);
    c.closePath();
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(0, -2, 2.6, 0, Math.PI * 2); c.fill();
    c.restore();
  }
}