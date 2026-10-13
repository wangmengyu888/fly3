/* =========================================================================
 * GameScene.js —— 战斗主场景（编排所有实体与系统）
 * 更新顺序见 GDD 4.4。
 * ========================================================================= */

class GameScene {
  constructor(game) {
    this.game = game;
    this.W = CONFIG.CANVAS.W;
    this.H = CONFIG.CANVAS.H;

    this.bg = new ParallaxBG();
    this.hud = new HUD();
    this.buffScene = new BuffScene();

    // 对象池（GDD 13.1）
    this.playerBullets = new Pool(() => new Bullet(), (b) => b.reset(), 300, 1000);
    this.enemyBullets = new Pool(() => new Bullet(), (b) => b.reset(), 300, 1000);
    this.enemies = new Pool(() => new Enemy(), (e) => e.reset(), 60, 240);
    this.powerups = new Pool(() => new PowerUp(), (p) => p.reset(), 40, 140);

    this.particles = new ParticleSystem();

    // 系统
    this.weapon = new WeaponSystem();
    this.skill = new SkillSystem();
    this.buffSystem = new BuffSystem();
    this.combo = new ComboSystem();
    this.score = new ScoreSystem();

    this.player = new Player();
    this.spawner = null;
    this.boss = null;

    this.beams = [];
    this.flashA = 0;
    this.flashColor = '#fff';
    this.slowTimer = 0;
    this.slowFactor = 1;
    this.ddaFactor = 1;

    this.state = 'playing';       // playing | paused | buff | gameover
    this.mode = 'campaign';
    this.stageIndex = 0;
    this.autoFire = true;
    this.maxCombo = 0;
    this.noHit = true;
    this.resultTimer = 0;
    this.cleared = false;
    this.nextStageIndex = undefined;
    this.time = 0;

    const W = this.W, H = this.H;
    this.pauseButtons = {
      resume: { x: W / 2 - 160, y: 560, w: 320, h: 70, fontSize: 24 },
      menu:   { x: W / 2 - 160, y: 650, w: 320, h: 70, fontSize: 24 }
    };
  }

  /* ==================================================== 生命周期 */
  enter(params) {
    params = params || {};
    this.mode = params.mode || 'campaign';
    this.stageIndex = params.stageIndex || 0;

    this.player.reset();
    this.playerBullets.clear();
    this.enemyBullets.clear();
    this.enemies.clear();
    this.powerups.clear();
    this.particles.clear();
    this.beams.length = 0;
    this.boss = null;

    this.combo.reset();
    this.score.reset();
    this.buffSystem = new BuffSystem();
    this.bg = new ParallaxBG();

    this.state = 'playing';
    this.slowTimer = 0;
    this.slowFactor = 1;
    this.flashA = 0;
    this.maxCombo = 0;
    this.noHit = true;
    this.time = 0;
    this.resultTimer = 0;
    this.cleared = false;
    this.nextStageIndex = undefined;

    // 操作模式：手机模式强制自动开火，并切到触屏按钮布局
    this.mobile = this.game.isMobile();
    this.hud.setMobile(this.mobile);
    if (this.mobile) {
      this.autoFire = CONFIG.CONTROL.mobile.forceAutoFire;
    } else {
      this.autoFire = this.game.save.getSetting('autoFire');
      if (this.autoFire === undefined) this.autoFire = true;
    }

    this.spawner = new Spawner(this.mode, this.stageIndex);
    this.spawner.start(this);

    this.game.input.consumeMove();   // 清掉进入前的拖拽累积，防止玩家瞬移
    this.game.audio.startBgm('battle');
  }

  exit() { }

  /* ==================================================== 更新 */
  update(dt) {
    this.bg.update(dt, this.state === 'playing' ? 1 : 0.3);

    // 暂停切换
    if (this.state === 'playing' && (this.game.input.take('KeyP') || this.game.input.take('Escape'))) {
      this.state = 'paused';
      this.game.input.consumeMove();
    }

    if (this.state === 'paused') { this._updatePaused(); return; }
    if (this.state === 'buff') { this._updateBuff(dt); return; }
    if (this.state === 'gameover') { this._updateGameover(dt); return; }

    this.time += dt;
    this.ddaFactor = this.player.lives <= 1 ? 1.25 : 1;

    // 输入
    this.game.input.update();

    // 技能 / 炸弹
    this.skill.update(dt, this);
    if (this.game.input.take('KeyB')) this.useBomb();

    // HUD 点击
    const clk = this.game.input.consumeClick();
    if (clk) {
      const name = this.hud.hitTest(clk.x, clk.y);
      if (name === 'pause') { this.state = 'paused'; this.game.input.consumeMove(); }
      else if (name === 'skill') this.skill.activate('timeStop', this);
      else if (name === 'railgun') this.skill.activate('railgun', this);
      else if (name === 'bomb') this.useBomb();
    }

    // 玩家 / 武器
    this.player.update(dt, this);
    this.player.syncWingmen(this);
    this.weapon.update(dt, this);

    // 波次导演
    if (this.spawner) this.spawner.update(dt, this);

    // 时间减速
    const edt = this.slowTimer > 0 ? dt * this.slowFactor : dt;

    // 实体更新
    this.enemies.each((e) => e.update(edt, this));
    if (this.boss && this.boss.active) this.boss.update(edt, this);
    this.enemyBullets.each((b) => b.update(edt, this));
    this.playerBullets.each((b) => b.update(dt, this));
    this.powerups.each((p) => p.update(edt, this));

    // 碰撞
    this._collisions();

    // 系统
    this.combo.update(dt);
    this.buffSystem.update(dt, this);
    this.buffSystem.checkTime(this);
    if (this.combo.combo > this.maxCombo) this.maxCombo = this.combo.combo;

    // 特效
    this.particles.update(dt);
    this._updateEffects(dt);

    // 结束判定
    if (!this.player.active && this.state === 'playing') {
      this._finish(false);
    }
  }

  _updatePaused() {
    this.game.input.consumeMove();
    const input = this.game.input;
    for (const k in this.pauseButtons) {
      const b = this.pauseButtons[k];
      b.hover = input.pointerX >= b.x && input.pointerX <= b.x + b.w && input.pointerY >= b.y && input.pointerY <= b.y + b.h;
    }
    const clk = input.consumeClick();
    if (clk) {
      for (const k in this.pauseButtons) {
        const b = this.pauseButtons[k];
        if (clk.x >= b.x && clk.x <= b.x + b.w && clk.y >= b.y && clk.y <= b.y + b.h) {
          this.game.audio.play('ui');
          if (k === 'resume') { this.state = 'playing'; }
          else { this.game.audio.stopBgm(); this.game.setScene('menu'); }
          return;
        }
      }
    }
  }

  _updateBuff(dt) {
    this.buffScene.update(dt, this);
    this.particles.update(dt);
  }

  _updateGameover(dt) {
    this.particles.update(dt);
    this._updateEffects(dt);
    this.enemies.each((e) => e.update(dt * 0.4, this));
    if (this.boss && this.boss.active) this.boss.update(dt * 0.4, this);
    this.resultTimer -= dt;
    if (this.resultTimer <= 0) {
      this.game.setScene('result', {
        mode: this.mode,
        stageIndex: this.stageIndex,
        nextStageIndex: this.nextStageIndex,
        cleared: this.cleared,
        score: this.score.score,
        kills: this.score.kills,
        graze: this.player.graze,
        maxCombo: this.maxCombo,
        diff: this.spawner ? this.spawner.diff : 0
      });
    }
  }

  _updateEffects(dt) {
    if (this.flashA > 0) this.flashA = Math.max(0, this.flashA - dt * 2.2);
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) { this.slowTimer = 0; this.slowFactor = 1; }
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const bm = this.beams[i];
      bm.t += dt;
      this.game.renderer.shakeScreen(3, 0.1);
      if (bm.t >= bm.dur) this.beams.splice(i, 1);
    }
    this.game.renderer.updateShake(dt);
  }

  /* ==================================================== 碰撞 */
  _collisions() {
    const p = this.player;

    // 玩家子弹 × 敌机 / Boss
    this.playerBullets.each((b) => {
      let consumed = false;
      this.enemies.each((e) => {
        if (consumed) return false;
        if (Collision.hit(b, e)) {
          e.takeDamage(b.damage, this);
          this.particles.hitSpark(b.x, b.y, b.color);
          if (b.pierce > 0) b.pierce--; else consumed = true;
        }
        return false;
      });
      const bo = this.boss;
      if (!consumed && bo && bo.active) {
        if (Collision.hit(b, bo)) {
          bo.takeDamage(b.damage, this);
          this.particles.hitSpark(b.x, b.y, b.color);
          if (b.pierce > 0) b.pierce--; else consumed = true;
        } else if (bo.state === 'fight') {
          for (let i = 0; i < bo.parts.length; i++) {
            const pt = bo.parts[i];
            if (!pt.destroyed && Collision.pointCircle(b.x, b.y, pt.x, pt.y, pt.radius)) {
              bo.damagePart(i, b.damage, this);
              this.particles.hitSpark(b.x, b.y, b.color);
              if (b.pierce > 0) b.pierce--; else consumed = true;
              break;
            }
          }
        }
      }
      return consumed;
    });

    // 敌方子弹 × 玩家（含擦弹）
    const grazeR = CONFIG.PLAYER.grazeRadius;
    this.enemyBullets.each((b) => {
      if (!p.active) return false;
      if (Collision.hit(b, p)) {
        const r = p.takeDamage(1, this);
        if (r === 'hit') this.noHit = false;
        if (r !== 'none') return true;
      } else if (Collision.isGraze(p, b, grazeR)) {
        if (!b._grazed) {
          b._grazed = true;
          p.graze++;
          const gain = this.combo.mult;
          this.score.addGraze(1);
          this.particles.floatText('+5', b.x, b.y, CONFIG.COLORS.cyan, 12);
          this.game.audio.play('graze');
        }
      }
      return false;
    });

    // 敌机本体 × 玩家
    this.enemies.each((e) => {
      if (p.active && Collision.hit(e, p)) {
        const r = p.takeDamage(1, this);
        if (r === 'hit') this.noHit = false;
        e.takeDamage(e.hp + 9999, this);
      }
      return false;
    });

    // 道具 × 玩家
    this.powerups.each((pw) => {
      if (p.active && Collision.hit(pw, p)) { this._collect(pw); return true; }
      return false;
    });
  }

  _collect(pw) {
    const p = this.player;
    switch (pw.kind) {
      case 'power':
        if (p.weaponLevel < 8) {
          p.weaponLevel++;
          this.particles.floatText('LV.' + p.weaponLevel, p.x, p.y - 40, CONFIG.COLORS.cyan, 22);
          this.game.audio.play('levelup');
        } else { this.score.add(500); this.particles.floatText('+500', p.x, p.y - 40, CONFIG.COLORS.yellow, 20); }
        break;
      case 'shield':
        p.maxShield = Math.max(p.maxShield, 40);
        p.shield = Math.min(p.maxShield, p.shield + 40);
        this.particles.floatText('护盾', p.x, p.y - 40, CONFIG.COLORS.green, 20);
        this.game.audio.play('pickup');
        break;
      case 'bomb':
        p.bombs++;
        this.particles.floatText('炸弹 +1', p.x, p.y - 40, CONFIG.COLORS.yellow, 20);
        this.game.audio.play('pickup');
        break;
      case 'heal':
        p.lives = Math.min(6, p.lives + 1);
        this.particles.floatText('生命 +1', p.x, p.y - 40, CONFIG.COLORS.green, 20);
        this.game.audio.play('pickup');
        break;
      case 'coin':
        this.score.add(50);
        this.particles.floatText('+50', p.x, p.y - 40, CONFIG.COLORS.yellow, 18);
        this.game.audio.play('coin');
        break;
    }
    this.particles.hitSpark(pw.x, pw.y, pw.color);
  }

  /* ==================================================== 实体工厂（供实体回调） */
  spawnPlayerBullet(x, y, vx, vy, opts) {
    opts = opts || {};
    const b = this.playerBullets.acquire();
    b.x = x; b.y = y; b.vx = vx; b.vy = vy;
    b.team = 'player';
    b.radius = opts.radius || 5;
    b.damage = opts.damage || 10;
    b.color = opts.color || '#00f5ff';
    b.size = opts.size || 5;
    b.pattern = opts.pattern || 'straight';
    b.pierce = opts.pierce || 0;
    b.life = 2.6;
    b.homingTarget = opts.homingTarget || null;
    b.turnRate = opts.turnRate || 5;
    return b;
  }

  spawnEnemyBullet(x, y, vx, vy, opts) {
    opts = opts || {};
    const b = this.enemyBullets.acquire();
    b.x = x; b.y = y; b.vx = vx; b.vy = vy;
    b.team = 'enemy';
    b.radius = opts.radius || 7;
    b.damage = 1;
    b.color = opts.color || CONFIG.ENEMY_BULLET.color;
    b.size = opts.size || 7;
    b.pattern = 'straight';
    b.pierce = 0;
    b.life = 8;
    b.homingTarget = null;
    b._grazed = false;
    return b;
  }

  spawnEnemyByKind(kind, x, y, opts) {
    const e = this.enemies.acquire();
    e.spawn(kind, x, y, opts);
    return e;
  }

  spawnBoss(key) {
    const b = new Boss();
    b.spawn(key, this);
    this.boss = b;
    this.game.audio.startBgm('boss');
    this.flash(0.4, CONFIG.COLORS.red);
  }

  clearEnemyBullets() {
    this.enemyBullets.clear();
  }

  getNearestEnemy(x, y) {
    let best = null, bestD = Infinity;
    const arr = this.enemies.items;
    for (let i = 0; i < arr.length; i++) {
      const e = arr[i];
      if (!e.active) continue;
      const d = dist2(x, y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    const bo = this.boss;
    if (bo && bo.active && bo.state === 'fight') {
      const d = dist2(x, y, bo.x, bo.y);
      if (d < bestD) { bestD = d; best = bo; }
    }
    return best;
  }

  /* ==================================================== 事件回调 */
  onEnemyKilled(e) {
    this.combo.onKill();
    const gained = this.score.addKill(e, this.combo);
    this.buffSystem.onKill(this);
    this.particles.explode(e.x, e.y, e.color, 12, e.kind === 'carrier' ? 1.6 : 1);
    this.particles.floatText('+' + gained, e.x, e.y, CONFIG.COLORS.yellow, 16);
    this.game.renderer.shakeScreen(e.kind === 'carrier' ? 10 : 4, 0.18);
    this.game.audio.play(e.kind === 'carrier' ? 'bigboom' : 'explode');
    // 吸血
    if (this.player.lifesteal > 0 && Math.random() < this.player.lifesteal) {
      this.player.maxShield = Math.max(this.player.maxShield, 10);
      this.player.shield = Math.min(this.player.maxShield, this.player.shield + 10);
      this.particles.floatText('汲取', this.player.x, this.player.y - 30, CONFIG.COLORS.green, 16);
    }
    // 掉落
    if (Math.random() < e.dropRate && e.dropTable.length > 0) {
      const kind = pick(e.dropTable);
      const pw = this.powerups.acquire();
      pw.init(kind, e.x, e.y, rand(-40, 40), CONFIG.POWERUP.speed);
    }
  }

  onBossDefeated(b) {
    this.score.add(Math.round(b.scoreValue));
    this.particles.explode(b.x, b.y, b.color, 60, 2.4);
    this.particles.explode(b.x, b.y, CONFIG.COLORS.white, 40, 2.0);
    this.game.renderer.shakeScreen(26, 1.2);
    this.flash(1.0, '#ffffff');
    this.game.audio.play('bigboom');
    this.particles.floatText('+' + b.scoreValue, b.x, b.y, CONFIG.COLORS.yellow, 30);
    // 掉落奖励
    const drops = ['power', 'power', 'shield', 'bomb'];
    for (let i = 0; i < drops.length; i++) {
      const pw = this.powerups.acquire();
      pw.init(drops[i], b.x + rand(-80, 80), b.y, rand(-60, 60), CONFIG.POWERUP.speed);
    }
    this.boss = null;
    if (this.spawner) this.spawner.onBossDefeated();

    if (this.mode === 'campaign') {
      this.nextStageIndex = (this.stageIndex + 1 < CONFIG.STAGE_LIST.length) ? this.stageIndex + 1 : undefined;
      this._finish(true);
    } else {
      this.game.audio.startBgm('battle');
      this.buffSystem.offer(this);   // 击杀 Boss 后三选一
    }
  }

  openBuff(cards) {
    this.state = 'buff';
    this.buffScene.open(cards, this);
  }

  closeBuff() {
    this.state = 'playing';
    this.game.input.consumeMove();
  }

  useBomb() {
    const p = this.player;
    if (!p.active || p.bombs <= 0) return;
    p.bombs--;
    this.clearEnemyBullets();
    this.flash(0.9, '#ffffff');
    this.game.renderer.shakeScreen(20, 0.6);
    this.game.audio.play('bigboom');
    const dmg = 300;
    this.enemies.each((e) => { e.takeDamage(dmg, this); return false; });
    if (this.boss && this.boss.active) this.boss.takeDamage(dmg, this);
    this.particles.floatText('BOMB!', p.x, p.y - 50, CONFIG.COLORS.yellow, 28);
  }

  flash(a, color) {
    this.flashA = Math.max(this.flashA, a);
    this.flashColor = color || '#fff';
  }

  shake(mag, dur) { this.game.renderer.shakeScreen(mag, dur); }

  get audio() { return this.game.audio; }
  addScore(n) { this.score.add(n); }

  _finish(cleared) {
    if (this.state === 'gameover') return;
    this.state = 'gameover';
    this.cleared = cleared;
    if (cleared) this.score.addClearBonus(this.player.lives, this.noHit);
    this.resultTimer = cleared ? 1.8 : 1.3;
    if (cleared) {
      this.flash(0.7, '#ffffff');
      this.particles.floatText('MISSION COMPLETE', this.W / 2, 500, CONFIG.COLORS.cyan, 34);
      this.game.audio.play('levelup');
    } else {
      this.particles.explode(this.player.x, this.player.y, CONFIG.COLORS.cyan, 30, 1.8);
      this.game.renderer.shakeScreen(22, 0.8);
    }
  }

  /* ==================================================== 绘制 */
  draw(ctx, R) {
    const W = this.W, H = this.H;

    // 最终 Boss 阶段背景染色
    let tint = null;
    if (this.boss && this.boss.active && this.boss.enrage) tint = 'rgba(255,46,77,0.10)';
    this.bg.draw(ctx, R, tint);

    this.powerups.each((o) => { o.draw(ctx); return false; });
    this.enemies.each((o) => { o.draw(ctx); return false; });
    if (this.boss && this.boss.active) this.boss.draw(ctx);
    this.player.draw(ctx);

    this.playerBullets.each((o) => { o.draw(ctx); return false; });
    this.enemyBullets.each((o) => { o.draw(ctx); return false; });

    this.particles.draw(ctx);

    this._drawBeams(ctx);

    // 全屏闪光
    if (this.flashA > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.85, this.flashA);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // HUD
    this.hud.draw(ctx, this, R);

    // 增益弹层
    if (this.state === 'buff') this.buffScene.draw(ctx, R, this);

    // 暂停层
    if (this.state === 'paused') this._drawPause(ctx, R);

    Skin.drawScanlines(ctx, R);
  }

  _drawBeams(ctx) {
    for (let i = 0; i < this.beams.length; i++) {
      const bm = this.beams[i];
      const k = 1 - bm.t / bm.dur;
      const w = bm.width * (0.6 + 0.4 * k);
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.5 * k;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(bm.x - w / 2, 0, bm.x + w / 2, 0);
      g.addColorStop(0, 'rgba(255,230,0,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.95)');
      g.addColorStop(1, 'rgba(255,230,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(bm.x - w / 2, 0, w, this.H);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(bm.x - w * 0.08, 0, w * 0.16, this.H);
      ctx.restore();
    }
  }

  _drawPause(ctx, R) {
    const W = this.W, H = this.H;
    ctx.save();
    ctx.fillStyle = 'rgba(2,6,16,0.72)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    R.text('PAUSED', W / 2, 420, {
      size: 48, color: '#fff', align: 'center', baseline: 'middle', glow: CONFIG.COLORS.cyan, glowSize: 24, weight: '900'
    });
    R.text('暂停', W / 2, 470, { size: 20, color: 'rgba(180,230,255,0.8)', align: 'center', baseline: 'middle' });
    Skin.button(ctx, R, this.pauseButtons.resume, '继续');
    Skin.button(ctx, R, this.pauseButtons.menu, '返回菜单');
  }
}