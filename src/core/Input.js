/* =========================================================================
 * Input.js —— 键盘 / 触屏统一输入
 * 触屏：相对拖拽（手指与飞机 1:1，飞机不被手指遮挡）
 * 边沿触发按键通过 take(code) 消费即清零。
 * ========================================================================= */

class InputManager {
  constructor(canvas, renderer) {
    this.canvas = canvas;
    this.renderer = renderer;

    this.keys = {};              // 持续按住
    this.pressed = {};           // 本帧边沿按下，由 take() 消费
    this.axis = { x: 0, y: 0 };

    this.pointerActive = false;
    this.pointerX = 0;
    this.pointerY = 0;
    this.moveX = 0;              // 本帧累积的相对位移（逻辑像素）
    this.moveY = 0;
    this._px = 0; this._py = 0;

    this._downX = 0; this._downY = 0; this._downT = 0;
    this._click = null;          // {x,y} 待消费的点击

    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; this.pointerActive = false; });

    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      const p = this._toLogical(e.clientX, e.clientY);
      this.pointerActive = true;
      this.pointerX = p.x; this.pointerY = p.y;
      this._px = p.x; this._py = p.y;
      this._downX = p.x; this._downY = p.y; this._downT = performance.now();
      if (c.setPointerCapture) { try { c.setPointerCapture(e.pointerId); } catch (err) { } }
      e.preventDefault();
    });
    c.addEventListener('pointermove', (e) => {
      const p = this._toLogical(e.clientX, e.clientY);
      this.pointerX = p.x; this.pointerY = p.y;
      if (this.pointerActive) {
        this.moveX += p.x - this._px;
        this.moveY += p.y - this._py;
      }
      this._px = p.x; this._py = p.y;
      e.preventDefault();
    });
    const up = (e) => {
      const p = this._toLogical(e.clientX, e.clientY);
      if (this.pointerActive) {
        const moved = Math.abs(p.x - this._downX) + Math.abs(p.y - this._downY);
        const dt = performance.now() - this._downT;
        if (moved < 14 && dt < 400) this._click = { x: p.x, y: p.y };
      }
      this.pointerActive = false;
      e.preventDefault();
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', () => { this.pointerActive = false; });
  }

  _toLogical(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left) / r.width * this.renderer.W,
      y: (clientY - r.top) / r.height * this.renderer.H
    };
  }

  /** 每逻辑帧开头调用：根据按键计算轴向量 */
  update() {
    let x = 0, y = 0;
    const k = this.keys;
    if (k['KeyA'] || k['ArrowLeft']) x -= 1;
    if (k['KeyD'] || k['ArrowRight']) x += 1;
    if (k['KeyW'] || k['ArrowUp']) y -= 1;
    if (k['KeyS'] || k['ArrowDown']) y += 1;
    if (x !== 0 && y !== 0) { const inv = 0.7071; x *= inv; y *= inv; }
    this.axis.x = x; this.axis.y = y;
  }

  /** 消费一次边沿按键 */
  take(code) {
    if (this.pressed[code]) { this.pressed[code] = false; return true; }
    return false;
  }

  /** 消费本帧累积的相对拖拽位移 */
  consumeMove() {
    const r = { x: this.moveX, y: this.moveY };
    this.moveX = 0; this.moveY = 0;
    return r;
  }

  /** 消费一次点击 */
  consumeClick() {
    const c = this._click;
    this._click = null;
    return c;
  }

  /** 每逻辑帧末尾清理残留边沿 */
  endFrame() {
    this.pressed = {};
    this._click = null;
  }
}