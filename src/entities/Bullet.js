/* =========================================================================
 * Bullet.js —— 子弹（玩家/敌人共用，靠 team 区分）
 * 字段与 GDD 第 5.3 节一致。
 * ========================================================================= */

function makeBullet() { return new Bullet(); }

class Bullet extends Entity {
  constructor() {
    super();
    this.team = 'player';
    this.damage = 10;
    this.bulletSpeed = 800;
    this.pattern = 'straight';   // straight | homing | sine | spiral
    this.color = '#0ff';
    this.size = 4;
    this.life = 3;
    this.pierce = 0;
    this.homingTarget = null;
    this.t = 0;
    this.turnRate = 5;           // homing 转率 rad/s
    this.omega = 3;              // spiral 角速度
    this.sineAmp = 70;
    this.sineFreq = 8;
    this.maxHp = 1;
    this.hp = 1;
  }

  reset() {
    this.active = true;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.radius = 4;
    this.team = 'player';
    this.damage = 10;
    this.bulletSpeed = 800;
    this.pattern = 'straight';
    this.color = '#0ff';
    this.size = 4;
    this.life = 3;
    this.pierce = 0;
    this.homingTarget = null;
    this.t = 0;
    this.turnRate = 5;
    this.omega = 3;
    this.sineAmp = 70;
    this.sineFreq = 8;
  }

  update(dt, scene) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) return true;

    switch (this.pattern) {
      case 'homing': {
        const tg = this.homingTarget;
        if (tg && tg.active) {
          const want = Math.atan2(tg.y - this.y, tg.x - this.x);
          let cur = Math.atan2(this.vy, this.vx);
          let diff = want - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const turn = this.turnRate * dt;
          cur += Math.abs(diff) < turn ? diff : Math.sign(diff) * turn;
          const sp = Math.hypot(this.vx, this.vy);
          this.vx = Math.cos(cur) * sp;
          this.vy = Math.sin(cur) * sp;
        }
        this.x += this.vx * dt; this.y += this.vy * dt;
        break;
      }
      case 'sine': {
        this.x += this.vx * dt + Math.sin(this.t * this.sineFreq) * this.sineAmp * dt;
        this.y += this.vy * dt;
        break;
      }
      case 'spiral': {
        const a = this.omega * dt;
        const cs = Math.cos(a), sn = Math.sin(a);
        const nvx = this.vx * cs - this.vy * sn;
        const nvy = this.vx * sn + this.vy * cs;
        this.vx = nvx; this.vy = nvy;
        this.x += this.vx * dt; this.y += this.vy * dt;
        break;
      }
      default:
        this.x += this.vx * dt; this.y += this.vy * dt;
    }

    if (this.isOffscreenH(scene.H, 70)) return true;
    return false;
  }

  draw(ctx) {
    const c = ctx;
    const player = this.team === 'player';
    c.save();
    c.shadowColor = this.color;
    c.shadowBlur = player ? 12 : 10;

    if (this.pattern === 'homing') {
      // 导弹：菱形 + 尾迹
      c.translate(this.x, this.y);
      c.rotate(Math.atan2(this.vy, this.vx) + Math.PI / 2);
      c.fillStyle = this.color;
      c.beginPath();
      c.moveTo(0, -this.size * 1.4);
      c.lineTo(this.size * 0.8, this.size * 0.9);
      c.lineTo(0, this.size * 0.4);
      c.lineTo(-this.size * 0.8, this.size * 0.9);
      c.closePath();
      c.fill();
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(0, 0, this.size * 0.32, 0, Math.PI * 2); c.fill();
    } else if (player && this.pierce > 0) {
      // 激光：细长光柱
      c.fillStyle = this.color;
      c.fillRect(this.x - this.size * 0.35, this.y - this.size * 4, this.size * 0.7, this.size * 8);
      c.fillStyle = '#fff';
      c.fillRect(this.x - this.size * 0.15, this.y - this.size * 3.4, this.size * 0.3, this.size * 6.8);
    } else if (player) {
      // 常规机炮弹：胶囊
      c.fillStyle = this.color;
      c.beginPath();
      c.ellipse(this.x, this.y, this.size * 0.55, this.size * 1.5, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(this.x, this.y, this.size * 0.35, 0, Math.PI * 2); c.fill();
    } else {
      // 敌弹：实心圆 + 高光
      c.fillStyle = this.color;
      c.beginPath(); c.arc(this.x, this.y, this.size, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.beginPath(); c.arc(this.x - this.size * 0.28, this.y - this.size * 0.28, this.size * 0.42, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }
}