/* =========================================================================
 * Skin.js —— 科技风主题配色与字体规范
 * 见 GDD 10.1 / 10.4。
 * ========================================================================= */

const Skin = {
  colors: CONFIG.COLORS,

  rarity(r) {
    return (CONFIG.COLORS.rarity && CONFIG.COLORS.rarity[r]) || CONFIG.COLORS.cian || '#00f5ff';
  },

  rarityName(r) {
    return { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' }[r] || '普通';
  },

  /** 深空背景渐变 */
  drawBackground(ctx, R) {
    const g = ctx.createLinearGradient(0, 0, 0, R.H);
    g.addColorStop(0, CONFIG.COLORS.bg0);
    g.addColorStop(0.5, CONFIG.COLORS.bg1);
    g.addColorStop(1, CONFIG.COLORS.bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, R.W, R.H);
  },

  /** 通用霓虹按钮；返回命中矩形 */
  button(ctx, R, b, label, sub) {
    const hover = b.hover;
    ctx.save();
    R.panel(b.x, b.y, b.w, b.h, 12, {
      fill: hover ? 'rgba(0,245,255,0.18)' : 'rgba(6,18,36,0.72)',
      stroke: hover ? CONFIG.COLORS.cyan : 'rgba(0,245,255,0.5)',
      glow: hover ? CONFIG.COLORS.cyan : null
    });
    R.text(label, b.x + b.w / 2, b.y + b.h / 2 + (sub ? -6 : 6), {
      size: b.fontSize || 26, color: hover ? '#ffffff' : CONFIG.COLORS.cyan,
      align: 'center', baseline: 'middle', glow: CONFIG.COLORS.cyan, glowSize: 12
    });
    if (sub) {
      R.text(sub, b.x + b.w / 2, b.y + b.h / 2 + 20, {
        size: 14, color: 'rgba(200,240,255,0.7)', align: 'center', baseline: 'middle'
      });
    }
    ctx.restore();
    return b;
  },

  /** 环形进度（技能 CD） */
  ringProgress(ctx, R, x, y, r, ratio, color, label, keyLabel) {
    ctx.save();
    // 底环
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    // 进度
    if (ratio > 0) {
      ctx.strokeStyle = color;
      ctx.shadowColor = color; ctx.shadowBlur = 12;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      ctx.stroke();
    }
    ctx.restore();
    const ready = ratio >= 1;
    R.text(label, x, y + 1, {
      size: 18, color: ready ? '#fff' : 'rgba(255,255,255,0.6)',
      align: 'center', baseline: 'middle', glow: ready ? color : null, glowSize: 10
    });
    if (keyLabel) {
      R.text(keyLabel, x, y + r + 14, {
        size: 12, color: 'rgba(180,230,255,0.8)', align: 'center', baseline: 'middle'
      });
    }
  },

  /** 扫描线叠加（屏幕反馈，可选后处理） */
  drawScanlines(ctx, R) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#00f5ff';
    for (let y = 0; y < R.H; y += 4) ctx.fillRect(0, y, R.W, 1);
    ctx.restore();
  }
};

/* =========================================================================
 * ParallaxBG —— 多层视差背景（GDD 10.2）
 * Layer0 深空渐变 / Layer1 星点 / Layer2 能量网格 / Layer3 荧光光带
 * ========================================================================= */
class ParallaxBG {
  constructor() {
    const W = CONFIG.CANVAS.W, H = CONFIG.CANVAS.H;
    this.W = W; this.H = H;
    this.t = 0;
    this.stars = [];
    for (let i = 0; i < 170; i++) {
      this.stars.push({ x: rand(0, W), y: rand(0, H), z: rand(0.3, 1), s: rand(0.6, 2.4) });
    }
    this.gridY = 0;
    this.streaks = [];
    for (let i = 0; i < 12; i++) {
      this.streaks.push({ x: rand(0, W), y: rand(0, H), len: rand(60, 200), sp: rand(400, 900), w: rand(1, 2.5) });
    }
  }

  update(dt, speed) {
    speed = speed === undefined ? 1 : speed;
    this.t += dt;
    const H = this.H;
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.y += (60 + s.z * 280) * speed * dt;
      if (s.y > H) { s.y = -6; s.x = rand(0, this.W); }
    }
    this.gridY = (this.gridY + 130 * speed * dt) % 130;
    for (let i = 0; i < this.streaks.length; i++) {
      const st = this.streaks[i];
      st.y += st.sp * speed * dt;
      if (st.y - st.len > H) { st.y = -st.len; st.x = rand(0, this.W); st.sp = rand(400, 900); }
    }
  }

  draw(ctx, R, tint) {
    Skin.drawBackground(ctx, R);
    const W = this.W, H = this.H;

    // Layer0 星云
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.16;
    let g = ctx.createRadialGradient(W * 0.3, H * 0.25, 0, W * 0.3, H * 0.25, 420);
    g.addColorStop(0, '#3a1a6b'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(W * 0.75, H * 0.7, 0, W * 0.75, H * 0.7, 380);
    g.addColorStop(0, '#0b3a55'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Layer2 能量网格
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.strokeStyle = CONFIG.COLORS.cyan;
    ctx.lineWidth = 1;
    for (let y = this.gridY - 130; y < H; y += 130) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let x = 0; x <= W; x += 130) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    ctx.restore();

    // Layer1 星点
    ctx.save();
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      ctx.globalAlpha = 0.35 + s.z * 0.55;
      ctx.fillStyle = s.z > 0.8 ? '#cfefff' : '#9fc4ff';
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.restore();

    // Layer3 荧光光带
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.streaks.length; i++) {
      const st = this.streaks[i];
      const g2 = ctx.createLinearGradient(st.x, st.y - st.len, st.x, st.y);
      g2.addColorStop(0, 'rgba(0,245,255,0)');
      g2.addColorStop(1, 'rgba(0,245,255,0.35)');
      ctx.fillStyle = g2;
      ctx.fillRect(st.x, st.y - st.len, st.w, st.len);
    }
    ctx.restore();

    if (tint) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }
}