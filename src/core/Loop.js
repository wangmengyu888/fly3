/* =========================================================================
 * Loop.js —— 固定步长主循环
 * 逻辑固定 1/60 步进（物理确定性），渲染跟随 rAF；单帧最多补 5 次逻辑。
 * ========================================================================= */

class Loop {
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.fixed = 1 / 60;
    this.acc = 0;
    this.last = 0;
    this.running = false;
    this.maxSteps = 5;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.acc = 0;
    requestAnimationFrame(this._tick);
  }

  stop() { this.running = false; }

  _tick(now) {
    if (!this.running) return;
    let ft = (now - this.last) / 1000;
    this.last = now;
    if (ft > 0.25) ft = 0.25;   // 防切后台大跳
    this.acc += ft;

    let steps = 0;
    while (this.acc >= this.fixed && steps < this.maxSteps) {
      this.update(this.fixed);
      this.acc -= this.fixed;
      steps++;
    }
    if (steps >= this.maxSteps) this.acc = 0; // 死亡螺旋保护

    this.render(ft);
    requestAnimationFrame(this._tick);
  }
}