/* =========================================================================
 * BuffScene.js —— 三选一增益弹层（叠加于 GameScene，冻结战斗）
 * 见 GDD 7.3 / 12。
 * ========================================================================= */

class BuffScene {
  constructor() {
    this.cards = [];
    this.t = 0;
    this.anim = 0;
    this.scene = null;
    this.active = false;
    this.rects = [];
    this.W = CONFIG.CANVAS.W;
    this.H = CONFIG.CANVAS.H;
  }

  open(offers, scene) {
    this.cards = offers;
    this.scene = scene;
    this.t = 0;
    this.anim = 0;
    this.active = true;
    this._layout();
  }

  _layout() {
    const n = this.cards.length;
    const cw = 196, ch = 400, gap = 20;
    const total = n * cw + (n - 1) * gap;
    const startX = (this.W - total) / 2;
    const y = 400;
    this.rects = [];
    for (let i = 0; i < n; i++) {
      this.rects.push({ x: startX + i * (cw + gap), y: y, w: cw, h: ch });
    }
  }

  update(dt, scene) {
    this.t += dt;
    this.anim = Math.min(1, this.t / 0.28);
    const input = scene.game.input;

    // 键盘 1/2/3
    for (let i = 0; i < this.cards.length; i++) {
      if (input.take('Digit' + (i + 1)) || input.take('Numpad' + (i + 1))) { this._pick(i, scene); return; }
    }
    // 点击
    const clk = input.consumeClick();
    if (clk) {
      for (let i = 0; i < this.rects.length; i++) {
        const r = this.rects[i];
        if (clk.x >= r.x && clk.x <= r.x + r.w && clk.y >= r.y && clk.y <= r.y + r.h) { this._pick(i, scene); return; }
      }
    }
  }

  _pick(i, scene) {
    const def = this.cards[i];
    if (!def) return;
    scene.audio.play('pickup');
    scene.buffSystem.apply(scene, def);
    this.active = false;
    scene.closeBuff();
  }

  draw(ctx, R, scene) {
    const W = this.W, H = this.H;
    // 遮罩
    ctx.save();
    ctx.fillStyle = 'rgba(2,6,16,0.78)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    R.text('选择强化', W / 2, 250, {
      size: 40, color: '#fff', align: 'center', baseline: 'middle', glow: CONFIG.COLORS.cyan, glowSize: 22, weight: '900'
    });
    R.text('按 1 / 2 / 3 或点击卡片', W / 2, 300, {
      size: 16, color: 'rgba(180,230,255,0.8)', align: 'center', baseline: 'middle'
    });

    const input = scene.game.input;
    for (let i = 0; i < this.cards.length; i++) {
      const def = this.cards[i];
      const r = this.rects[i];
      const rc = Skin.rarity(def.rarity);
      const hover = input.pointerX >= r.x && input.pointerX <= r.x + r.w && input.pointerY >= r.y && input.pointerY <= r.y + r.h;

      const ease = 1 - Math.pow(1 - this.anim, 3);
      const oy = (1 - ease) * 60;

      ctx.save();
      ctx.globalAlpha = ease;
      ctx.translate(0, oy);

      R.panel(r.x, r.y, r.w, r.h, 16, {
        fill: hover ? 'rgba(12,28,52,0.95)' : 'rgba(8,18,36,0.92)',
        stroke: rc, lineWidth: 3, glow: hover ? rc : null
      });

      // 稀有度标签
      R.text(Skin.rarityName(def.rarity), r.x + r.w / 2, r.y + 34, {
        size: 15, color: rc, align: 'center', baseline: 'middle', glow: rc, glowSize: 10
      });
      // 图标
      const cy = r.y + 120;
      ctx.save();
      ctx.shadowColor = rc; ctx.shadowBlur = 20;
      ctx.strokeStyle = rc; ctx.lineWidth = 3;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * Math.PI * 2 - Math.PI / 2;
        const px = r.x + r.w / 2 + Math.cos(a) * 46;
        const py = cy + Math.sin(a) * 46;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
      ctx.restore();
      R.text('' + (i + 1), r.x + r.w / 2, cy, {
        size: 38, color: '#fff', align: 'center', baseline: 'middle', glow: rc, glowSize: 14, weight: '900'
      });

      // 名称
      R.text(def.name, r.x + r.w / 2, r.y + 210, {
        size: 22, color: '#fff', align: 'center', baseline: 'middle', weight: '900'
      });
      // 描述（自动折行）
      this._wrap(ctx, R, def.desc, r.x + r.w / 2, r.y + 252, r.w - 32, 22, rc);

      // 叠层数
      const stack = scene.player.buffs[def.id] || 0;
      R.text(stack > 0 ? ('已叠加 ' + stack + '/' + def.maxStack) : ('最多 ' + def.maxStack + ' 层'),
        r.x + r.w / 2, r.y + r.h - 30,
        { size: 14, color: 'rgba(180,230,255,0.75)', align: 'center', baseline: 'middle' });

      ctx.restore();
    }
  }

  _wrap(ctx, R, text, cx, y, maxW, lh, color) {
    ctx.save();
    ctx.font = '600 16px ' + CONFIG.FONT.family;
    const chars = text.split('');
    let line = '';
    let yy = y;
    for (let i = 0; i < chars.length; i++) {
      const test = line + chars[i];
      if (ctx.measureText(test).width > maxW && line) {
        R.text(line, cx, yy, { size: 16, color: color, align: 'center', baseline: 'middle' });
        line = chars[i]; yy += lh;
      } else line = test;
    }
    if (line) R.text(line, cx, yy, { size: 16, color: color, align: 'center', baseline: 'middle' });
    ctx.restore();
  }
}