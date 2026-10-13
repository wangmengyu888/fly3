/* =========================================================================
 * MenuScene.js —— 主菜单
 * ========================================================================= */

class MenuScene {
  constructor(game) {
    this.game = game;
    this.bg = new ParallaxBG();
    this.t = 0;
    this.mobile = false;
    this.W = CONFIG.CANVAS.W;
    this.H = CONFIG.CANVAS.H;
    this._layout();
  }

  /** 按操作模式生成按钮布局：手机模式隐藏自动开火，音效按钮占满一行 */
  _layout() {
    const W = this.W;
    const bs = {
      campaign: { x: W / 2 - 180, y: 520, w: 360, h: 76, fontSize: 28 },
      endless:  { x: W / 2 - 180, y: 620, w: 360, h: 76, fontSize: 28 },
      sound:    { x: W / 2 - 180, y: 740, w: this.mobile ? 360 : 172, h: 60, fontSize: 20 }
    };
    if (!this.mobile) {
      bs.autofire = { x: W / 2 + 8, y: 740, w: 172, h: 60, fontSize: 20 };
    }
    this.buttons = bs;
  }

  enter() {
    this.t = 0;
    this.mobile = this.game.isMobile();
    this._layout();
    this.game.audio.startBgm('menu');
  }

  update(dt) {
    this.t += dt;
    this.bg.update(dt, 0.5);

    const input = this.game.input;
    const save = this.game.save;
    const hover = this._hover(input);

    const clk = input.consumeClick();
    if (clk) {
      const name = this._hit(clk.x, clk.y);
      if (name) {
        this.game.audio.play('ui');
        if (name === 'campaign') {
          this.game.audio.play('start');
          this.game.setScene('game', { mode: 'campaign', stageIndex: 0 });
        } else if (name === 'endless') {
          this.game.audio.play('start');
          this.game.setScene('game', { mode: 'endless', stageIndex: 0 });
        } else if (name === 'sound') {
          const m = !save.getSetting('muted');
          save.setSetting('muted', m);
          this.game.audio.setMuted(m);
        } else if (name === 'autofire') {
          save.setSetting('autoFire', !save.getSetting('autoFire'));
        }
      }
    }
    // 键盘快捷
    if (input.take('Enter') || input.take('Space')) {
      this.game.setScene('game', { mode: 'campaign', stageIndex: 0 });
    }
    this._hoverName = hover;
  }

  _hover(input) {
    const n = this._hit(input.pointerX, input.pointerY);
    const bs = this.buttons;
    for (const k in bs) bs[k].hover = (k === n);
    return n;
  }

  _hit(x, y) {
    const bs = this.buttons;
    for (const k in bs) {
      const b = bs[k];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return k;
    }
    return null;
  }

  draw(ctx, R) {
    const W = R.W, H = R.H;
    this.bg.draw(ctx, R);

    // 标题
    const pulse = 0.85 + 0.15 * Math.sin(this.t * 2);
    ctx.save();
    ctx.globalAlpha = pulse;
    R.text('NEON STRIKE', W / 2, 250, {
      size: 70, color: '#ffffff', align: 'center', baseline: 'middle',
      glow: CONFIG.COLORS.cyan, glowSize: 34, weight: '900'
    });
    ctx.restore();
    R.text('霓 虹 战 机', W / 2, 320, {
      size: 30, color: CONFIG.COLORS.cyan, align: 'center', baseline: 'middle', glow: CONFIG.COLORS.cyan, glowSize: 18
    });
    R.text('— 弹幕 · 构筑 · 多阶段 BOSS —', W / 2, 372, {
      size: 16, color: 'rgba(180,230,255,0.75)', align: 'center', baseline: 'middle'
    });

    // 最高分
    const hs = this.game.save.get('highScore') || 0;
    R.text('HIGH SCORE', W / 2, 440, { size: 14, color: 'rgba(180,230,255,0.7)', align: 'center', baseline: 'middle' });
    R.text(hs.toLocaleString(), W / 2, 472, {
      size: 30, color: CONFIG.COLORS.yellow, align: 'center', baseline: 'middle', glow: CONFIG.COLORS.yellow, glowSize: 16
    });

    const save = this.game.save;
    Skin.button(ctx, R, this.buttons.campaign, '战役模式', 'STAGE 1 → FINAL BOSS');
    Skin.button(ctx, R, this.buttons.endless, '无尽模式', 'ENDLESS SURVIVAL');
    Skin.button(ctx, R, this.buttons.sound, save.getSetting('muted') ? '音效 关' : '音效 开');
    if (this.buttons.autofire) {
      Skin.button(ctx, R, this.buttons.autofire, save.getSetting('autoFire') ? '自动开火 开' : '自动开火 关');
    }

    // 操作说明面板（随操作模式切换）
    const rows = this.mobile ? [
      ['拖动屏幕', '按住任意处拖动，战机 1:1 跟随'],
      ['自动开火', '手机模式默认开启'],
      ['触屏按钮', '时停 / 轨道炮 / 炸弹'],
      ['暂停', '点按右上角按钮']
    ] : [
      ['WASD', '移动（方向键同效）'],
      ['空格/J', '射击（默认自动开火）'],
      ['K', '大招 · 时空停滞'],
      ['L', '大招 · 轨道炮'],
      ['B', '炸弹 · 清屏'],
      ['P/ESC', '暂停 / 继续'],
      ['触屏', '按住屏幕任意处拖动']
    ];
    const px = 64, py = 812, pw = 592, ph = 348;
    R.panel(px, py, pw, ph, 16, { fill: 'rgba(6,16,34,0.72)', stroke: 'rgba(0,245,255,0.35)' });
    R.text('操作说明 · ' + (this.mobile ? '手机模式' : '电脑模式'), W / 2, py + 34, {
      size: 22, color: CONFIG.COLORS.cyan, align: 'center', baseline: 'middle',
      glow: CONFIG.COLORS.cyan, glowSize: 14, weight: '900'
    });
    ctx.save();
    ctx.strokeStyle = 'rgba(0,245,255,0.22)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 40, py + 62); ctx.lineTo(px + pw - 40, py + 62); ctx.stroke();
    ctx.restore();

    const rowY = py + 90, step = 38, bh = 30, bw = 92, bx = px + 30, dx = bx + bw + 22;
    for (let i = 0; i < rows.length; i++) {
      const y = rowY + i * step;
      R.panel(bx, y - bh / 2, bw, bh, 7, { fill: 'rgba(0,245,255,0.10)', stroke: 'rgba(0,245,255,0.5)' });
      R.text(rows[i][0], bx + bw / 2, y, {
        size: 14, color: '#ffffff', align: 'center', baseline: 'middle', weight: '800'
      });
      R.text(rows[i][1], dx, y, {
        size: 15, color: 'rgba(200,235,255,0.9)', align: 'left', baseline: 'middle'
      });
    }
  }

  exit() { }
}