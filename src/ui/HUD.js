/* =========================================================================
 * HUD.js —— 血条 / 分数 / 连击 / 技能CD / Boss 血条
 * 布局见 GDD 第 12 章。
 * ========================================================================= */

class HUD {
  constructor() {
    const W = CONFIG.CANVAS.W, H = CONFIG.CANVAS.H;
    // 两套布局：pc 与原版一致；mobile 放大按钮，置于拇指易触区
    this.layouts = {
      pc: {
        pause:   { x: W - 66,  y: 24,     w: 46, h: 46 },
        skill:   { x: 44,      y: H - 96, w: 66, h: 66 },
        railgun: { x: 132,     y: H - 96, w: 66, h: 66 },
        bomb:    { x: W - 110, y: H - 96, w: 66, h: 66 }
      },
      mobile: {
        pause:   { x: W - 92,  y: 18,     w: 68, h: 68 },
        skill:   { x: 40,      y: H - 116, w: 88, h: 88 },
        railgun: { x: 144,     y: H - 116, w: 88, h: 88 },
        bomb:    { x: W - 128, y: H - 116, w: 88, h: 88 }
      }
    };
    this.mobile = false;
    this.buttons = this.layouts.pc;
  }

  /** 由场景在进入时切换布局 */
  setMobile(on) {
    this.mobile = !!on;
    this.buttons = this.mobile ? this.layouts.mobile : this.layouts.pc;
  }

  /** 命中测试：返回按钮名或 null */
  hitTest(x, y) {
    const bs = this.buttons;
    for (const k in bs) {
      const b = bs[k];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return k;
    }
    return null;
  }

  draw(ctx, scene, R) {
    const c = ctx;
    const W = CONFIG.CANVAS.W, H = CONFIG.CANVAS.H;
    const p = scene.player;
    const combo = scene.combo;

    /* ---------------- 顶栏 ---------------- */
    c.save();
    c.fillStyle = 'rgba(4,10,24,0.55)';
    c.fillRect(0, 0, W, 120);
    c.strokeStyle = 'rgba(0,245,255,0.25)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, 120); c.lineTo(W, 120); c.stroke();
    c.restore();

    // 生命（心形以圆形表示）
    for (let i = 0; i < Math.min(p.lives, 8); i++) {
      const hx = 30 + i * 22, hy = 34;
      R.glowCircle(hx, hy, 6, i < p.lives ? CONFIG.COLORS.red : 'rgba(255,46,77,0.25)', 12);
      // 小三角点缀
      c.save();
      c.fillStyle = i < p.lives ? '#ff9db0' : 'rgba(255,255,255,0.15)';
      c.beginPath(); c.arc(hx, hy, 2.4, 0, Math.PI * 2); c.fill();
      c.restore();
    }

    // 护盾条
    if (p.maxShield > 0) {
      const sr = p.shield / p.maxShield;
      R.bar(28, 52, 150, 8, sr, CONFIG.COLORS.green);
      R.text('SHIELD', 184, 60, { size: 11, color: 'rgba(57,255,136,0.9)' });
    }

    // 分数
    R.text('SCORE', W - 200, 44, { size: 13, color: 'rgba(180,230,255,0.75)', align: 'right' });
    R.text(scene.score.score.toLocaleString(), W - 120, 44, {
      size: 26, color: CONFIG.COLORS.yellow, align: 'right', glow: CONFIG.COLORS.yellow, glowSize: 14
    });

    // 暂停按钮
    const pb = this.buttons.pause;
    R.panel(pb.x, pb.y, pb.w, pb.h, 10, { fill: 'rgba(6,18,36,0.7)', stroke: 'rgba(0,245,255,0.45)' });
    c.save();
    c.fillStyle = CONFIG.COLORS.cyan;
    const pbw = 6, pbh = 24, pgap = 4;
    const pix = pb.x + (pb.w - (pbw * 2 + pgap)) / 2;
    const piy = pb.y + (pb.h - pbh) / 2;
    c.fillRect(pix, piy, pbw, pbh);
    c.fillRect(pix + pbw + pgap, piy, pbw, pbh);
    c.restore();

    // 连击
    if (combo.combo > 1) {
      const cx = W / 2, cy = 78;
      R.text('x' + combo.mult.toFixed(combo.mult % 1 ? 1 : 0), cx - 34, cy, {
        size: 24, color: CONFIG.COLORS.cyan, align: 'right', baseline: 'middle', glow: CONFIG.COLORS.cyan, glowSize: 12
      });
      R.text(combo.combo + ' COMBO', cx + 4, cy, {
        size: 18, color: '#fff', align: 'left', baseline: 'middle'
      });
      // 连击倒计时环
      c.save();
      c.strokeStyle = CONFIG.COLORS.cyan;
      c.lineWidth = 3;
      c.shadowColor = CONFIG.COLORS.cyan; c.shadowBlur = 10;
      c.beginPath();
      c.arc(cx - 74, cy, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * combo.ratio());
      c.stroke();
      c.restore();
    }

    /* ---------------- Boss 血条 ---------------- */
    const b = scene.boss;
    if (b && b.active && b.state !== 'entry') {
      const bx = 60, by = 132, bw = W - 120, bh = 14;
      c.save();
      c.fillStyle = 'rgba(0,0,0,0.55)';
      R.roundRect(bx - 2, by - 2, bw + 4, bh + 4, 8); c.fill();
      // 血量
      const ratio = Math.max(0, b.hp / b.maxHp);
      c.save();
      R.roundRect(bx, by, bw, bh, 5); c.clip();
      const g = c.createLinearGradient(bx, 0, bx + bw, 0);
      g.addColorStop(0, b.color); g.addColorStop(1, b.accent);
      c.fillStyle = g;
      c.fillRect(bx, by, bw * ratio, bh);
      c.restore();
      // 阶段分段标记
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1;
      for (let i = 0; i < b.phaseThresholds.length; i++) {
        const mx = bx + bw * b.phaseThresholds[i];
        c.beginPath(); c.moveTo(mx, by - 2); c.lineTo(mx, by + bh + 2); c.stroke();
      }
      c.restore();
      R.text(b.name + ' · ' + b.subtitle, bx, by - 10, {
        size: 15, color: '#fff', glow: b.color, glowSize: 10
      });
      R.text('PHASE ' + b.phase, bx + bw, by - 10, { size: 14, color: b.accent, align: 'right' });
    }

    /* ---------------- 底栏 ---------------- */
    c.save();
    c.fillStyle = 'rgba(4,10,24,0.55)';
    c.fillRect(0, H - 120, W, 120);
    c.strokeStyle = 'rgba(0,245,255,0.25)';
    c.beginPath(); c.moveTo(0, H - 120); c.lineTo(W, H - 120); c.stroke();
    c.restore();

    // 技能 CD
    const sk = CONFIG.SKILLS.timeStop;
    const rk = CONFIG.SKILLS.railgun;
    const sb = this.buttons.skill, rb = this.buttons.railgun, bb = this.buttons.bomb;

    Skin.ringProgress(ctx, R, sb.x + sb.w / 2, sb.y + sb.h / 2, sb.w / 2 - 4,
      1 - Math.min(1, p.skillCooldown / SkillCd(sk)), sk.color, '时停', this.mobile ? null : 'K');
    Skin.ringProgress(ctx, R, rb.x + rb.w / 2, rb.y + rb.h / 2, rb.w / 2 - 4,
      1 - Math.min(1, p.railgunCooldown / SkillCd(rk)), rk.color, '轨道', this.mobile ? null : 'L');

    // 炸弹
    R.panel(bb.x, bb.y, bb.w, bb.h, 10, { fill: 'rgba(6,18,36,0.7)', stroke: 'rgba(255,230,0,0.5)' });
    R.text('B', bb.x + bb.w / 2, bb.y + bb.h / 2 - 6, { size: 22, color: CONFIG.COLORS.yellow, align: 'center', baseline: 'middle', glow: CONFIG.COLORS.yellow, glowSize: 10 });
    R.text('×' + p.bombs, bb.x + bb.w / 2, bb.y + bb.h / 2 + 20, { size: 16, color: '#fff', align: 'center', baseline: 'middle' });

    // 武器 / 关卡信息
    R.text('LV.' + p.weaponLevel + '  ' + p.weaponType.toUpperCase(), W / 2, H - 60, {
      size: 18, color: CONFIG.COLORS.cyan, align: 'center', baseline: 'middle'
    });
    const stageLabel = scene.mode === 'endless'
      ? 'ENDLESS  D' + (scene.spawner.diff + 1)
      : CONFIG.STAGE_NAMES[scene.stageIndex];
    R.text(stageLabel, W / 2, H - 88, {
      size: 14, color: 'rgba(180,230,255,0.8)', align: 'center', baseline: 'middle'
    });

    /* ---------------- 低血暗角 ---------------- */
    if (p.lives <= 1 && p.active) {
      const pulse = 0.35 + 0.25 * Math.sin(performance.now() / 160);
      c.save();
      const g = c.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.72);
      g.addColorStop(0, 'rgba(255,46,77,0)');
      g.addColorStop(1, 'rgba(255,46,77,' + pulse.toFixed(3) + ')');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      c.restore();
    }

    /* ---------------- 手机模式：开局拖拽提示 ---------------- */
    if (this.mobile && scene.time !== undefined && scene.time < 3.5) {
      const a = Math.max(0, Math.min(1, 3.5 - scene.time)) * 0.9;
      ctx.save();
      ctx.globalAlpha = a;
      R.text('按住屏幕拖动 · 移动战机', W / 2, H - 152, {
        size: 16, color: 'rgba(210,240,255,0.95)', align: 'center', baseline: 'middle',
        glow: CONFIG.COLORS.cyan, glowSize: 10
      });
      ctx.restore();
    }
  }
}

/* 技能 CD 安全读取（避免除零） */
function SkillCd(sk) { return sk.cd > 0 ? sk.cd : 1; }