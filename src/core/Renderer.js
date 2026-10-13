/* =========================================================================
 * Renderer.js —— 画布缩放 / DPR / 绘制工具 / 屏幕震动
 * 逻辑画布固定 720×1280，外层 CSS 等比缩放（letterbox）。
 * ========================================================================= */

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = CONFIG.CANVAS.W;
    this.H = CONFIG.CANVAS.H;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.scale = 1;

    canvas.width = this.W * this.dpr;
    canvas.height = this.H * this.dpr;

    // 震动状态
    this.shakeT = 0;
    this.shakeDur = 1;
    this.shakeMag = 0;
    this.shakeX = 0;
    this.shakeY = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const availW = window.innerWidth;
    const availH = window.innerHeight;
    const s = Math.min(availW / this.W, availH / this.H);
    this.scale = s;
    this.canvas.style.width = (this.W * s) + 'px';
    this.canvas.style.height = (this.H * s) + 'px';
  }

  /** 每帧开始：设置变换与震动偏移 */
  begin() {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.translate(this.shakeX, this.shakeY);
  }

  /** 屏幕震动 */
  shakeScreen(mag, dur) {
    if (mag >= this.shakeMag || this.shakeT <= 0) {
      this.shakeMag = mag;
      this.shakeDur = dur;
      this.shakeT = dur;
    }
  }

  updateShake(dt) {
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const k = Math.max(0, this.shakeT / this.shakeDur);
      const m = this.shakeMag * k;
      this.shakeX = (Math.random() * 2 - 1) * m;
      this.shakeY = (Math.random() * 2 - 1) * m;
      if (this.shakeT <= 0) { this.shakeMag = 0; this.shakeX = 0; this.shakeY = 0; }
    }
  }

  clear() {
    const c = this.ctx;
    c.save();
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.W, this.H);
    c.restore();
  }

  /* ---------------------------------------------------- 绘制工具 */
  glowCircle(x, y, r, color, blur) {
    const c = this.ctx;
    c.save();
    c.shadowColor = color;
    c.shadowBlur = blur === undefined ? 16 : blur;
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  ring(x, y, r, color, lineWidth, blur) {
    const c = this.ctx;
    c.save();
    c.shadowColor = color;
    c.shadowBlur = blur === undefined ? 12 : blur;
    c.strokeStyle = color;
    c.lineWidth = lineWidth || 2;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  line(x1, y1, x2, y2, color, width, blur) {
    const c = this.ctx;
    c.save();
    c.shadowColor = color;
    c.shadowBlur = blur || 0;
    c.strokeStyle = color;
    c.lineWidth = width || 2;
    c.beginPath();
    c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.stroke();
    c.restore();
  }

  roundRect(x, y, w, h, r) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  text(str, x, y, opt) {
    opt = opt || {};
    const c = this.ctx;
    c.save();
    const size = opt.size || 20;
    c.font = (opt.weight || '700') + ' ' + size + 'px ' + CONFIG.FONT.family;
    c.textAlign = opt.align || 'left';
    c.textBaseline = opt.baseline || 'alphabetic';
    if (opt.glow) { c.shadowColor = opt.glow; c.shadowBlur = opt.glowSize || 16; }
    c.fillStyle = opt.color || '#fff';
    if (opt.stroke) {
      c.lineWidth = opt.strokeWidth || 4;
      c.strokeStyle = opt.stroke;
      c.strokeText(str, x, y);
    }
    if (opt.alpha !== undefined) c.globalAlpha = opt.alpha;
    c.fillText(str, x, y);
    c.restore();
  }

  /** 玻璃拟态面板 */
  panel(x, y, w, h, r, opt) {
    opt = opt || {};
    const c = this.ctx;
    c.save();
    this.roundRect(x, y, w, h, r === undefined ? 14 : r);
    c.fillStyle = opt.fill || 'rgba(10, 20, 40, 0.72)';
    c.fill();
    c.lineWidth = opt.lineWidth || 2;
    if (opt.glow) { c.shadowColor = opt.glow; c.shadowBlur = 18; }
    c.strokeStyle = opt.stroke || 'rgba(0, 245, 255, 0.55)';
    c.stroke();
    c.restore();
  }

  /** 进度条 */
  bar(x, y, w, h, ratio, color, bg) {
    const c = this.ctx;
    ratio = Math.max(0, Math.min(1, ratio));
    c.save();
    this.roundRect(x, y, w, h, h / 2);
    c.fillStyle = bg || 'rgba(255,255,255,0.12)';
    c.fill();
    if (ratio > 0) {
      c.save();
      this.roundRect(x, y, w, h, h / 2);
      c.clip();
      c.shadowColor = color; c.shadowBlur = 14;
      c.fillStyle = color;
      c.fillRect(x, y, w * ratio, h);
      c.restore();
    }
    c.restore();
  }
}