/* =========================================================================
 * BuffSystem.js —— Roguelite 三选一增益
 * 见 GDD 5.7 / 7.3。增益库 ≥12 条，位于 config.BUFF_POOL。
 * ========================================================================= */

class BuffSystem {
  constructor() {
    this.offers = [];
    this.killCounter = 0;
    this.timeCounter = 0;
  }

  update(dt, scene) {
    this.timeCounter += dt;
  }

  onKill(scene) {
    this.killCounter++;
    if (this.killCounter >= CONFIG.BUFF_TRIGGER_KILLS) {
      this.killCounter = 0;
      this.timeCounter = 0;
      this.offer(scene);
    }
  }

  checkTime(scene) {
    if (this.timeCounter >= CONFIG.BUFF_TRIGGER_TIME) {
      this.timeCounter = 0;
      this.offer(scene);
    }
  }

  /** 加权随机抽取 n 个（去重、遵守 maxStack） */
  offer(scene) {
    const p = scene.player;
    const pool = CONFIG.BUFF_POOL.filter((b) => (p.buffs[b.id] || 0) < b.maxStack);
    if (pool.length === 0) return;
    const n = Math.min(3, pool.length);
    const chosen = [];
    const work = pool.slice();
    for (let k = 0; k < n; k++) {
      // 加权
      let total = 0;
      for (let i = 0; i < work.length; i++) total += CONFIG.BUFF_RARITY_WEIGHT[work[i].rarity] || 10;
      let r = Math.random() * total;
      let idx = 0;
      for (let i = 0; i < work.length; i++) {
        r -= CONFIG.BUFF_RARITY_WEIGHT[work[i].rarity] || 10;
        if (r <= 0) { idx = i; break; }
      }
      chosen.push(work[idx]);
      work.splice(idx, 1);
    }
    this.offers = chosen;
    scene.openBuff(chosen);
  }

  /** 应用所选增益 */
  apply(scene, def) {
    const p = scene.player;
    p.buffs[def.id] = (p.buffs[def.id] || 0) + 1;
    def.apply(p);
    p.syncWingmen(scene);
    scene.audio.play('levelup');
    scene.particles.floatText(def.name, p.x, p.y - 60, CONFIG.COLORS.yellow, 22);
  }
}