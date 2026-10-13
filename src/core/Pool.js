/* =========================================================================
 * Pool.js —— 通用对象池
 * 运行期零 new / 零 splice：死亡的实体只标记 active=false，等待复用。
 * ========================================================================= */

class Pool {
  /**
   * @param {Function} factory 创建新对象的工厂
   * @param {Function} reset   复用前重置对象状态的函数 (obj) => void
   * @param {Number}   prealloc 预分配数量
   * @param {Number}   max     池容量上限（超出后 acquire 会复用最老的活跃对象）
   */
  constructor(factory, reset, prealloc, max) {
    this.factory = factory;
    this.reset = reset;
    this.items = [];
    this.max = max || 4096;
    this.cursor = 0; // 轮询游标，避免每次都从 0 扫描
    for (let i = 0; i < (prealloc || 0); i++) {
      const o = this.factory();
      o.active = false;
      this.items.push(o);
    }
  }

  /** 取出一个可用对象（active=true） */
  acquire() {
    const n = this.items.length;
    for (let i = 0; i < n; i++) {
      const idx = (this.cursor + i) % n;
      const o = this.items[idx];
      if (!o.active) {
        this.cursor = (idx + 1) % n;
        this.reset(o);
        o.active = true;
        return o;
      }
    }
    // 无空闲
    if (this.items.length < this.max) {
      const o = this.factory();
      this.reset(o);
      o.active = true;
      this.items.push(o);
      return o;
    }
    // 池满：抢占轮询位置的对象
    const o = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;
    this.reset(o);
    o.active = true;
    return o;
  }

  /** 归还 */
  release(o) { o.active = false; }

  /** 遍历所有活跃对象；cb 返回 true 表示请求释放该对象 */
  each(cb) {
    const arr = this.items;
    for (let i = 0; i < arr.length; i++) {
      const o = arr[i];
      if (o.active) {
        if (cb(o) === true) o.active = false;
      }
    }
  }

  /** 统计活跃数量 */
  countActive() {
    let c = 0;
    for (let i = 0; i < this.items.length; i++) if (this.items[i].active) c++;
    return c;
  }

  /** 清空（全部置为非活跃） */
  clear() {
    for (let i = 0; i < this.items.length; i++) this.items[i].active = false;
  }
}