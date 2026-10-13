/* =========================================================================
 * Storage.js —— localStorage 存档封装
 * 保存：最高分 / 最佳关卡 / 无尽最高 / 设置 / 本地排行榜
 * ========================================================================= */

class SaveManager {
  constructor(key) {
    this.key = key || 'neon_strike_save_v1';
    this.data = this.load();
  }

  defaults() {
    return {
      highScore: 0,
      bestStage: 0,
      endlessBest: 0,
      settings: {
        sfx: CONFIG.AUDIO.sfx,
        bgm: CONFIG.AUDIO.bgm,
        muted: false,
        autoFire: true,
        quality: 'high'
      },
      leaderboard: [] // [{score, mode, stage, date}]
    };
  }

  load() {
    const def = this.defaults();
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return def;
      const d = JSON.parse(raw);
      const merged = Object.assign(def, d);
      merged.settings = Object.assign(def.settings, d.settings || {});
      return merged;
    } catch (e) {
      return def;
    }
  }

  save() {
    try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* 隐私模式忽略 */ }
  }

  get(k) { return this.data[k]; }
  set(k, v) { this.data[k] = v; this.save(); }

  getSetting(k) { return this.data.settings[k]; }
  setSetting(k, v) { this.data.settings[k] = v; this.save(); }

  /** 提交成绩并维护排行榜 */
  submitScore(entry) {
    const lb = this.data.leaderboard;
    lb.push(entry);
    lb.sort((a, b) => b.score - a.score);
    if (lb.length > 10) lb.length = 10;
    this.save();
  }
}