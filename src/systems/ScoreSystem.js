/* =========================================================================
 * ScoreSystem.js —— 计分 / 结算
 * 见 GDD 6.12 / 9.4。得分 = Σ(敌机基础分 × 连击倍率) + 擦弹分 + 时间奖励。
 * ========================================================================= */

class ScoreSystem {
  constructor() {
    this.score = 0;
    this.grazeScore = 0;
    this.timeScore = 0;
    this.kills = 0;
  }

  reset() {
    this.score = 0;
    this.grazeScore = 0;
    this.timeScore = 0;
    this.kills = 0;
  }

  add(amount) { this.score += amount; }

  /** 击杀结算（含连击倍率） */
  addKill(enemy, combo) {
    this.kills++;
    const v = Math.round((enemy.scoreValue || 100) * (enemy.scoreMul || 1) * (combo ? combo.mult : 1));
    this.score += v;
    return v;
  }

  addGraze(n) {
    this.grazeScore += 5 * n;
    this.score += 5 * n;
  }

  /** 通关奖励 */
  addClearBonus(lives, noHit) {
    let bonus = 5000 * Math.max(1, lives);
    if (noHit) bonus = Math.round(bonus * 1.5);
    this.score += bonus;
    return bonus;
  }

  submit(save, entry) { save.submitScore(entry); }
}