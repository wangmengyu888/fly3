/* =========================================================================
 * Entity.js —— 实体基类
 * 字段与 GDD 第 5.1 节一致，禁止改名。
 * ========================================================================= */

let __entityId = 0;

class Entity {
  constructor() {
    this.id = 0;
    this.active = false;
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.radius = 0;
    this.hp = 0; this.maxHp = 0;
    this.team = 'neutral';
    this.type = 'generic';
    this.scoreValue = 0;
  }

  /** 复用时重置公共字段 */
  resetBase() {
    this.id = ++__entityId;
    this.active = true;
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.radius = 0;
    this.hp = 0; this.maxHp = 0;
    this.team = 'neutral';
    this.type = 'generic';
    this.scoreValue = 0;
  }

  update(dt, scene) { }
  draw(ctx) { }

  /** 是否已离开游戏判定区（可回收） */
  isOffscreenH(H, pad) {
    pad = pad || 80;
    return this.y < -pad || this.y > H + pad || this.x < -pad || this.x > CONFIG.CANVAS.W + pad;
  }
}

/* ---------------------------------------------------- 全局数学工具 */
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
/** 归一化到 (-PI, PI] */
function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }