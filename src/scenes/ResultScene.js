/* =========================================================================
 * ResultScene.js —— 结算界面
 * ========================================================================= */

class ResultScene {
  constructor(game) {
    this.game = game;
    this.bg = new ParallaxBG();
    this.data = null;
    this.t = 0;
    const W = CONFIG.CANVAS.W;
    this.buttons = {
      retry: { x: W / 2 - 190, y: 880, w: 180, h: 70, fontSize: 24 },
      menu:  { x: W / 2 + 10,  y: 880, w: 180, h: 70, fontSize: 24 }
    };
  }

  enter(params) {
    this.data = params || {};
    this.t = 0;
    this.newRecord = false;
    const save = this.game.save;
    const score = this.data.score || 0;
    if (score > (save.get('highScore') || 0)) {
      save.set('highScore', score);
      this.newRecord = true;
    }
    if (this.data.mode === 'endless') {
      if (score > (save.get('endlessBest') || 0)) save.set('endlessBest', score);
    } else if (this.data.cleared) {
      const bs = save.get('bestStage') || 0;
      if ((this.data.stageIndex + 1) > bs) save.set('bestStage', this.data.stageIndex + 1);
    }
    save.submitScore({ score: score, mode: this.data.mode, stage: this.data.stageIndex || 0, date: Date.now() });
    this.game.audio.stopBgm();
  }

  update(dt) {
    this.t += dt;
    this.bg.update(dt, 0.4);
    const input = this.game.input;
    for (const k in this.buttons) {
      const b = this.buttons[k];
      b.hover = input.pointerX >= b.x && input.pointerX <= b.x + b.w && input.pointerY >= b.y && input.pointerY <= b.y + b.h;
    }
    const clk = input.consumeClick();
    if (clk) {
      for (const k in this.buttons) {
        const b = this.buttons[k];
        if (clk.x >= b.x && clk.x <= b.x + b.w && clk.y >= b.y && clk.y <= b.y + b.h) {
          this.game.audio.play('ui');
          if (k === 'retry') this.game.setScene('game', { mode: this.data.mode, stageIndex: this.data.nextStageIndex !== undefined ? this.data.nextStageIndex : (this.data.stageIndex || 0) });
          else this.game.setScene('menu');
          return;
        }
      }
    }
  }

  draw(ctx, R) {
    const W = R.W, H = R.H;
    this.bg.draw(ctx, R);

    const cleared = this.data.cleared;
    ctx.save();
    const scale = Math.min(1, 0.5 + this.t * 1.5);
    ctx.translate(W / 2, 300);
    ctx.scale(scale, scale);
    R.text(cleared ? 'MISSION COMPLETE' : 'GAME OVER', 0, 0, {
      size: 48, color: cleared ? CONFIG.COLORS.cyan : CONFIG.COLORS.red,
      align: 'center', baseline: 'middle', glow: cleared ? CONFIG.COLORS.cyan : CONFIG.COLORS.red, glowSize: 26, weight: '900'
    });
    ctx.restore();

    R.text(cleared ? '任务完成' : '任务失败', W / 2, 360, {
      size: 20, color: 'rgba(200,240,255,0.85)', align: 'center', baseline: 'middle'
    });

    // 分数面板
    R.panel(W / 2 - 240, 440, 480, 360, 16, {});
    const d = this.data;
    const rows = [
      ['最终得分', (d.score || 0).toLocaleString(), CONFIG.COLORS.yellow],
      ['击杀数', '' + (d.kills || 0), CONFIG.COLORS.cyan],
      ['擦弹次数', '' + (d.graze || 0), CONFIG.COLORS.cyan],
      ['到达关卡', d.mode === 'endless' ? ('无尽 D' + ((d.diff || 0) + 1)) : (CONFIG.STAGE_NAMES[d.stageIndex] || '—'), '#fff'],
      ['最高连击', 'x' + (d.maxCombo || 0), CONFIG.COLORS.magenta]
    ];
    for (let i = 0; i < rows.length; i++) {
      const y = 500 + i * 56;
      R.text(rows[i][0], W / 2 - 210, y, { size: 18, color: 'rgba(180,230,255,0.8)', baseline: 'middle' });
      R.text(rows[i][1], W / 2 + 210, y, { size: 22, color: rows[i][2], align: 'right', baseline: 'middle', glow: rows[i][2], glowSize: 10 });
    }

    if (this.newRecord) {
      const p = 0.7 + 0.3 * Math.sin(this.t * 6);
      ctx.save(); ctx.globalAlpha = p;
      R.text('★ NEW RECORD ★', W / 2, 830, {
        size: 24, color: CONFIG.COLORS.yellow, align: 'center', baseline: 'middle', glow: CONFIG.COLORS.yellow, glowSize: 18, weight: '900'
      });
      ctx.restore();
    }

    const retryLabel = (this.data.cleared && this.data.nextStageIndex !== undefined) ? '下一关' : '再来一次';
    Skin.button(ctx, R, this.buttons.retry, retryLabel);
    Skin.button(ctx, R, this.buttons.menu, '返回菜单');
  }

  exit() { }
}