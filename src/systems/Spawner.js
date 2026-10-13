/* =========================================================================
 * Spawner.js —— 波次 / 关卡导演（Director）
 * 见 GDD 6.9。关卡模式数据驱动，无尽模式程序化生成。
 * ========================================================================= */

class Spawner {
  constructor(mode, stageIndex) {
    this.mode = mode;             // 'campaign' | 'endless'
    this.stageIndex = stageIndex || 0;
    this.time = 0;
    this.events = [];
    this.index = 0;
    this.bossActive = false;
    this.finished = false;

    // 无尽模式
    this.diff = 0;
    this.diffTimer = 0;
    this.spawnTimer = 2.0;
    this.bossTimer = 80;
  }

  start(scene) {
    if (this.mode === 'campaign') {
      const key = CONFIG.STAGE_LIST[this.stageIndex];
      this.events = CONFIG.WAVES[key].slice().sort((a, b) => a.t - b.t);
      this.index = 0;
    } else {
      this.spawnTimer = 1.5;
      this.bossTimer = 75;
    }
  }

  update(dt, scene) {
    this.time += dt;

    if (this.mode === 'campaign') {
      this._campaign(dt, scene);
    } else {
      this._endless(dt, scene);
    }
  }

  /* ---------------------------------------------------- 关卡模式 */
  _campaign(dt, scene) {
    if (this.bossActive) return;
    while (this.index < this.events.length && this.time >= this.events[this.index].t) {
      const ev = this.events[this.index++];
      if (ev.boss) {
        scene.spawnBoss(ev.boss, scene.stageIndex);
        this.bossActive = true;
      } else {
        this._spawnGroup(scene, ev.spawn, ev.count, ev.pattern);
      }
    }
    if (this.index >= this.events.length && !this.bossActive && !scene.boss) {
      this.finished = true;
    }
  }

  /* ---------------------------------------------------- 无尽模式 */
  _endless(dt, scene) {
    this.diffTimer += dt;
    if (this.diffTimer >= CONFIG.ENDLESS.diffInterval) {
      this.diffTimer -= CONFIG.ENDLESS.diffInterval;
      this.diff++;
      scene.particles.floatText('难度 ' + (this.diff + 1), scene.W / 2, 400, CONFIG.COLORS.red, 26);
      scene.audio.play('alarm');
    }

    if (this.bossActive) return;

    const kinds = ['scout', 'fighter', 'bomber', 'kamikaze', 'turret'];
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const interval = Math.max(CONFIG.ENDLESS.minInterval, CONFIG.ENDLESS.baseInterval - this.diff * 0.06);
      this.spawnTimer = interval;
      const kind = kinds[randInt(0, kinds.length - 1)];
      this._spawnGroup(scene, kind, randInt(2, 4), pick(['vee', 'lineV', 'lineH', 'sides']), 1);
    }

    this.bossTimer -= dt;
    if (this.bossTimer <= 0) {
      this.bossTimer = 90;
      const keys = Object.keys(CONFIG.BOSS_TABLE);
      scene.spawnBoss(pick(keys), 0);
      this.bossActive = true;
    }
  }

  onBossDefeated() { this.bossActive = false; }

  /* ---------------------------------------------------- 编队布局 */
  _spawnGroup(scene, kind, count, layout, diffOverride) {
    const W = scene.W;
    const hpScale = 1 + (this.mode === 'endless' ? this.diff * CONFIG.ENDLESS.hpScale : 0) + (diffOverride ? 0 : 0) + scene.stageIndex * 0.15;
    const speedScale = 1 + (this.mode === 'endless' ? this.diff * CONFIG.ENDLESS.speedScale : 0);
    const opts = { hpScale: hpScale, speedScale: speedScale };

    switch (layout) {
      case 'lineV': {
        const gap = W / (count + 1);
        for (let i = 0; i < count; i++) {
          scene.spawnEnemyByKind(kind, gap * (i + 1), -60 - i * 44, opts);
        }
        break;
      }
      case 'lineH': {
        const gap = (W - 140) / (count - 1 || 1);
        for (let i = 0; i < count; i++) {
          scene.spawnEnemyByKind(kind, 70 + gap * i, -60, opts);
        }
        break;
      }
      case 'sides': {
        const n = Math.max(1, Math.floor(count / 2));
        for (let i = 0; i < n; i++) {
          const o1 = Object.assign({}, opts, { from: 'side' });
          const o2 = Object.assign({}, opts, { from: 'side' });
          scene.spawnEnemyByKind(kind, 110, -60 - i * 50, o1);
          if (i * 2 + 1 < count) scene.spawnEnemyByKind(kind, W - 110, -60 - i * 50, o2);
        }
        break;
      }
      case 'vee':
      default: {
        const mid = (count - 1) / 2;
        for (let i = 0; i < count; i++) {
          const dx = (i - mid) * 62;
          const dy = -Math.abs(i - mid) * 42;
          scene.spawnEnemyByKind(kind, W / 2 + dx, -60 + dy, opts);
        }
        break;
      }
    }
  }
}