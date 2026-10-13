/* =========================================================================
 * Collision.js —— 圆形碰撞检测 + 擦弹判定
 * 手感冒宽容：一律用圆-圆判定，不做像素级检测。
 * ========================================================================= */

const Collision = {

  /** 圆-圆相交 */
  hit(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const r = a.radius + b.radius;
    return dx * dx + dy * dy <= r * r;
  },

  /** 圆-圆相交，自带半径加成（用于弱点/护盾等） */
  hitWith(a, b, padA, padB) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const r = a.radius + (padA || 0) + b.radius + (padB || 0);
    return dx * dx + dy * dy <= r * r;
  },

  /** 点-圆 */
  pointCircle(px, py, cx, cy, r) {
    const dx = px - cx, dy = py - cy;
    return dx * dx + dy * dy <= r * r;
  },

  /**
   * 擦弹判定：子弹在玩家「判定核心」之外、但进入了擦弹环带
   * @returns {Boolean}
   */
  isGraze(player, bullet, grazeRadius) {
    const dx = player.x - bullet.x;
    const dy = player.y - bullet.y;
    const d2 = dx * dx + dy * dy;
    const inner = player.radius + bullet.radius;
    const outer = grazeRadius + bullet.radius;
    return d2 > inner * inner && d2 <= outer * outer;
  }
};