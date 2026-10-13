/* =========================================================================
 * ModeSelectScene.js —— 操作模式选择页（位于开始菜单之前）
 * 电脑模式：与原版完全一致（键盘操作）
 * 手机模式：操作方式针对手机端适配（触屏拖拽 + 放大虚拟按钮 + 自动开火）
 * ========================================================================= */

class ModeSelectScene {
  constructor(game) {
    this.game = game;
    this.bg = new ParallaxBG();
    this.t = 0;
    const W = CONFIG.CANVAS.W;
    this.buttons = {
      pc:     { x: W / 2 - 230, y: 580, w: 460, h: 112, fontSize: 32, hover: false },
      mobile: { x: W / 2 - 230, y: 740, w: 460, h: 112, fontSize: 32, hover: false }
    };
  }

  enter() {
    this.t = 0;
    this.game.audio.startBgm('menu');
  }

  update(dt) {
    this.t += dt;
    this.bg.update(dt, 0.5);

    const input = this.game.input;

    for (const k in this.buttons) {
      const b = this.buttons[k];
      b.hover = input.pointerX >= b.x && input.pointerX <= b.x + b.w &&
                input.pointerY >= b.y && input.pointerY <= b.y + b.h;
    }

    const clk = input.consumeClick();
    if (clk) {
      const name = this._hit(clk.x, clk.y);
      if (name) { this._choose(name); return; }
    }
    // 键盘快捷：回车默认电脑模式
    if (input.take('Enter')) this._choose('pc');
  }

  _hit(x, y) {
    for (const k in this.buttons) {
      const b = this.buttons[k];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return k;
    }
    return null;
  }

  _choose(mode) {
    this.game.audio.play('ui');
    this.game.audio.play('start');
    this.game.setControlMode(mode);
    this.game.setScene('menu');
  }

  draw(ctx, R) {
    const W = R.W;
    this.bg.draw(ctx, R);

    // 标题（与开始菜单同风格）
    const pulse = 0.85 + 0.15 * Math.sin(this.t * 2);
    ctx.save();
    ctx.globalAlpha = pulse;
    R.text('NEON STRIKE', W / 2, 262, {
      size: 58, color: '#ffffff', align: 'center', baseline: 'middle',
      glow: CONFIG.COLORS.cyan, glowSize: 30, weight: '900'
    });
    ctx.restore();
    R.text('霓 虹 战 机', W / 2, 318, {
      size: 26, color: CONFIG.COLORS.cyan, align: 'center', baseline: 'middle',
      glow: CONFIG.COLORS.cyan, glowSize: 16
    });

    // 分隔线
    ctx.save();
    ctx.strokeStyle = 'rgba(0,245,255,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W / 2 - 200, 372); ctx.lineTo(W / 2 + 200, 372); ctx.stroke();
    ctx.restore();

    // 标题提示
    R.text('选择操作模式', W / 2, 432, {
      size: 30, color: '#ffffff', align: 'center', baseline: 'middle',
      glow: CONFIG.COLORS.cyan, glowSize: 16, weight: '900'
    });
    R.text('SELECT CONTROL MODE', W / 2, 474, {
      size: 14, color: 'rgba(180,230,255,0.75)', align: 'center', baseline: 'middle'
    });

    // 两个模式按钮
    Skin.button(ctx, R, this.buttons.pc, '电脑模式', 'PC MODE · 键盘操作');
    Skin.button(ctx, R, this.buttons.mobile, '手机模式', 'MOBILE MODE · 触屏操作');

    // 差异说明
    R.text('电脑模式：WASD / 方向键移动 · 空格 / J 射击 · 键盘技能（与原版一致）', W / 2, 930, {
      size: 15, color: 'rgba(200,235,255,0.85)', align: 'center', baseline: 'middle'
    });
    R.text('手机模式：按住屏幕拖动移动 · 放大触屏按钮 · 自动开火', W / 2, 968, {
      size: 15, color: 'rgba(200,235,255,0.85)', align: 'center', baseline: 'middle'
    });
  }

  exit() { }
}