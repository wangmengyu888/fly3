/* =========================================================================
 * BootScene.js —— 启动闪屏
 * ========================================================================= */

class BootScene {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.done = false;
  }

  enter() { this.t = 0; this.done = false; }

  update(dt) {
    this.t += dt;
    if (this.game.input.consumeClick()) this.done = true;
    if (this.t > 1.4) this.done = true;
    if (this.done) this.game.setScene('modeSelect');
  }

  draw(ctx, R) {
    Skin.drawBackground(ctx, R);
    const W = R.W, H = R.H;
    const a = Math.min(1, this.t * 2);

    ctx.save();
    ctx.globalAlpha = a;
    R.text('NEON STRIKE', W / 2, H / 2 - 30, {
      size: 64, color: '#ffffff', align: 'center', baseline: 'middle',
      glow: CONFIG.COLORS.cyan, glowSize: 30, weight: '900'
    });
    R.text('霓 虹 战 机', W / 2, H / 2 + 40, {
      size: 26, color: CONFIG.COLORS.cyan, align: 'center', baseline: 'middle', glow: CONFIG.COLORS.cyan, glowSize: 16
    });
    ctx.restore();

    // 加载条
    const p = Math.min(1, this.t / 1.4);
    R.bar(W / 2 - 140, H / 2 + 130, 280, 6, p, CONFIG.COLORS.cyan);
    R.text('SYSTEM ONLINE', W / 2, H / 2 + 165, {
      size: 14, color: 'rgba(180,230,255,0.8)', align: 'center', baseline: 'middle'
    });
  }

  exit() { }
}