# 《霓虹战机 · NEON STRIKE》— 飞机大战网页游戏技术设计文档

> 版本：v0.1（评审稿）
> 目标读者：Solo Builder（独自完成全部代码的开发者 / AI 代码生成器）
> 本文档目标：让 builder 无需额外澄清即可理解「做什么、怎么做、做成什么样」，并按里程碑顺序完成可运行的成品。

---

## 0. 如何使用本文档

1. **先读第 1、2 章** 建立整体认知与技术边界，不要跳读。
2. **第 4 章（架构）与第 5 章（数据结构）是全篇地基**，所有系统实现都必须严格遵守这两章定义的接口与字段，禁止自行改名。
3. **第 6、7、8 章是逐模块规格**，每节 = 一个可独立实现的模块（含输入/输出/边界条件）。
4. **第 14 章是施工顺序**，请严格按里程碑 M1→M6 递进，每个里程碑结束都有可运行产物。
5. 所有魔法数字必须集中在 `config.js`（见第 15 章），**禁止在业务代码中硬编码数值**。

标注约定：
- `【必须】` = MVP 必须实现，缺失则验收不通过。
- `【可选】` = 增强项，时间允许再做，不阻塞验收。
- `TODO(builder)` = 需要 builder 补全实现的函数。

---

## 1. 产品概述

### 1.1 一句话定位
一款**科技/赛博霓虹风的竖版飞行射击（STG）网页游戏**，融合「经典打飞机 + 弹幕躲避 + 武器养成 + 多阶段 Boss 战 + Roguelite 道具构筑」，浏览器打开即玩，无需安装。

### 1.2 核心体验关键词
爽感 / 高亮特效 / 弹幕 / 成长 / 挑战 / 视觉轰炸 / 即点即玩

### 1.3 目标平台与硬性约束
| 项 | 规格 |
|---|---|
| 运行环境 | 现代桌面 + 移动端浏览器（Chrome / Edge / Safari） |
| 设备 | 桌面（键盘）优先，移动端（触屏拖拽）必须可用 |
| 分辨率 | 逻辑画布基准 **720 × 1280**（9:16 竖屏），按容器等比缩放 |
| 性能目标 | 桌面稳定 60 FPS，移动端 ≥ 45 FPS；同屏子弹峰値 ≤ 600 |
| 加载 | 单次加载后无二次请求；启动 ≤ 2s |
| 离线 | 本地存档，断网可玩 |

### 1.4 参考竞品与吸收的爆火玩法
| 参考玩法来源 | 吸收的核心机制 |
|---|---|
| 经典《雷电 / 1942》 | 竖版卷轴、编队敌机、道具掉落 |
| 《雷霆战机》 | 武器升级路线、僚机、战力数值成长 |
| 东方 Project / 弹幕 STG | 弹幕形态、擦弹（Graze）、Boss 弹幕阶段 |
| 《Archero》《弹壳特攻队》 | Roguelite 三选一增益、单局构筑 |
| 《吸血鬼幸存者》 | 自动射击、清屏快感、连杀反馈 |
| 现代街机（如《Sky Force》） | 救援人质、连击倍率、关卡星级 |

> **设计原则**：以「经典打飞机」为底盘（易上手），叠加「弹幕 + 构筑」为深度（耐玩），用「霓虹特效 + 屏幕反馈」做视觉冲击。

---

## 2. 技术栈与工程约束

### 2.1 技术选型（推荐，A 方案）
| 层 | 选型 | 理由 |
|---|---|---|
| 渲染 | **HTML5 Canvas 2D** | 弹幕场景 2D 足够，兼容性最好，无 WebGL 心智负担 |
| 语言 | 原生 **JavaScript（ES Modules）** | 无编译步骤，builder 出错率最低；可直接 `type="module"` 引入 |
| 工程 | **零依赖 / 无构建**，本地 `index.html` 直接打开 | 降低失败面 |
| 状态 | 纯内存对象 + `localStorage` 存档 | 无后端 |
| 音频 | **Web Audio API**（程序化音效）或 `HTMLAudioElement` | 见 11 章 |
| 图形资源 | **程序化绘制为主**（Canvas Path / 渐变 / 发光），可选精灵图 | 免美术资源，科技风用几何图形即可 |

**B 方案（可选，若 builder 更擅长）**：`Vite + TypeScript`。若采用，第 5 章数据结构直接按 TS `interface` 落地，其余规格不变。

> ⚠️ 无论 A/B，**不得引入物理引擎、游戏框架（Phaser 等）**，避免 API 差异导致实现漂移。

### 2.2 硬性工程约束
- **【必须】** 所有可变数值集中在 `src/config.js`，业务代码通过 import 引用。
- **【必须】** 使用对象池（Object Pool）管理子弹 / 敌机 / 粒子 / 飘字，**运行时禁止频繁 `new` 与数组 `splice`**。
- **【必须】** 主循环用 `requestAnimationFrame` + **固定时间步长**（见 4.3），逻辑与渲染解耦。
- **【必须】** 移动端触屏为「相对拖拽」操控（手指不遮挡机体），非「手指即飞机」。
- **【必须】** 支持暂停（失焦 / 按 ESC / 切后台自动暂停）。
- **【可选】** 屏幕震动、扫描线、色差（Chromatic Aberration）后处理，用 Canvas 叠加实现。

---

## 3. 目录结构

```
飞机大战/
├─ index.html                 # 唯一入口，含 canvas + 挂载点
├─ assets/
│  └─ audio/                  # 可选音频文件（若用文件音频）
└─ src/
   ├─ main.js                 # 启动引导：初始化引擎、状态机、绑定输入
   ├─ config.js               # 【核心】全部可调参数（数值、颜色、尺寸）
   ├─ core/
   │  ├─ Game.js              # 游戏主控（状态机 + 主循环调度）
   │  ├─ Loop.js              # 固定步长循环器
   │  ├─ Input.js             # 键盘 / 触屏统一输入
   │  ├─ Renderer.js          # 画布缩放、绘制工具（发光/描边/文字）
   │  ├─ Pool.js              # 通用对象池
   │  ├─ Collision.js         # 碰撞检测（圆 / AABB）
   │  ├─ Audio.js             # 音效与 BGM 管理
   │  └─ Storage.js           # localStorage 存档封装
   ├─ entities/
   │  ├─ Entity.js            # 实体基类
   │  ├─ Player.js            # 玩家
   │  ├─ Bullet.js            # 子弹（玩家/敌人共用，靠 faction 区分）
   │  ├─ Enemy.js             # 普通敌机（多种类型）
   │  ├─ Boss.js              # Boss（多阶段）
   │  ├─ PowerUp.js           # 道具
   │  ├─ Wingman.js           # 僚机
   │  └─ Particle.js          # 粒子 / 爆炸 / 飘字
   ├─ systems/
   │  ├─ Spawner.js           # 波次 / 关卡导演（Director）
   │  ├─ WeaponSystem.js      # 武器与升级
   │  ├─ SkillSystem.js       # 技能 / 大招 / CD
   │  ├─ BuffSystem.js        # Roguelite 增益（三选一）
   │  ├─ ComboSystem.js       # 连击 / 倍率
   │  └─ ScoreSystem.js       # 计分 / 结算 / 排行榜
   ├─ scenes/
   │  ├─ BootScene.js         # 加载 / 初始化
   │  ├─ MenuScene.js         # 主菜单
   │  ├─ GameScene.js         # 战斗主场景
   │  ├─ BuffScene.js         # 三选一增益弹层（叠加于 GameScene）
   │  └─ ResultScene.js       # 结算
   └─ ui/
      ├─ HUD.js               # 血条 / 分数 / 连击 / 技能CD
      └─ Skin.js              # 科技风主题配色与字体规范
```

---

## 4. 全局架构

### 4.1 分层图
```
┌─────────────────────────────────────────────┐
│  Scenes（场景/状态机）                        │
│  Boot → Menu → Game ⇄ Buff/Result            │
├─────────────────────────────────────────────┤
│  Systems（系统：无渲染，仅更新逻辑）           │
│  Spawner / Weapon / Skill / Buff / Combo /Score│
├─────────────────────────────────────────────┤
│  Entities（实体：有 update 与 draw）           │
│  Player / Enemy / Boss / Bullet / PowerUp …  │
├─────────────────────────────────────────────┤
│  Core（引擎底座）                             │
│  Game / Loop / Input / Renderer / Pool /     │
│  Collision / Audio / Storage                 │
└─────────────────────────────────────────────┘
```

### 4.2 场景状态机（Scene FSM）
状态：`BOOT → MENU → PLAYING ⇄ PAUSED`，`PLAYING → BUFF_PICK → PLAYING`，`PLAYING → GAME_OVER → MENU`。
- **【必须】** 任意时刻只有一个「活动场景」；Buff 弹层为叠加态，冻结战斗但保留画面。
- 场景接口统一为：`enter()` / `update(dt)` / `draw(ctx)` / `exit()`。

### 4.3 主循环（固定步长）
```
FIXED_DT = 1/60 秒
loop(now):
  frameTime = clamp(now - lastTime, 0, 250ms)   // 防止切后台后大跳
  accumulator += frameTime
  while accumulator >= FIXED_DT:
      update(FIXED_DT)                          // 逻辑：固定步长，保证物理确定性
      accumulator -= FIXED_DT
  render(interpolation)                          // 渲染：可插值，视觉平滑
```
- **【必须】** 逻辑更新使用固定 dt；渲染帧率可高于逻辑帧。
- **【必须】** 用 accumulator 上限防止「死亡螺旋」（单帧最多补 5 次逻辑）。

### 4.4 更新与渲染顺序（每帧）
`Input → Player.update → Spawner.update → 所有实体 update → 碰撞检测 → 清理死亡 → 粒子/飘字 → 摄像机震动 → HUD 更新 → render`

---

## 5. 核心数据结构（全篇基石，字段名不可改）

> 使用普通对象 + 工厂函数创建（A 方案）或 `interface`（B 方案）。**对象池复用的实体需带 `active` 标志**。

### 5.1 通用
```js
// 二维向量：统一用 {x, y}，速度用 {vx, vy}
const Vec = { x: 0, y: 0 };

// 实体基类字段
const Entity = {
  id: 0,            // 自增唯一 id
  active: false,    // 池化生死标志
  x: 0, y: 0,       // 世界坐标（画布像素，原点左上）
  vx: 0, vy: 0,
  radius: 0,        // 圆形碰撞半径
  hp: 0, maxHp: 0,
  team: 'neutral',  // 'player' | 'enemy' | 'neutral'
  type: 'generic',  // 子类型标识
  scoreValue: 0,
};
```

### 5.2 玩家 Player
```js
const Player = {
  // ...Entity 字段
  speed: 420,            // px/s（键盘）
  shield: 0,             // 护盾值
  maxShield: 0,
  lives: 3,              // 剩余生命（撞毁重生消耗）
  invincible: 0,         // 无敌剩余时间(s)，受击/重生后触发
  weaponLevel: 1,        // 武器等级 1..8
  weaponType: 'vulcan',  // 'vulcan' | 'laser' | 'missile' | 'lightning'
  fireCooldown: 0,       // 剩余射击冷却(s)
  skillCooldown: 0,      // 大招 CD 剩余(s)
  bombs: 2,              // 清屏炸弹数量
  graze: 0,              // 本局擦弹次数（用于计分）
  wingmen: [],           // 僚机数组（最多 2）
  buffs: {},             // 已获得增益 { buffId: stacks }
};
```

### 5.3 子弹 Bullet
```js
const Bullet = {
  // ...Entity 字段
  team: 'player',        // 归属阵营
  damage: 10,
  bulletSpeed: 800,      // 用 vy 更好，但保留字段以支持曲线弹
  pattern: 'straight',   // 'straight' | 'homing' | 'sine' | 'spiral'
  color: '#0ff',
  size: 4,
  life: 3,               // 存活秒数（超出自动回收）
  pierce: 0,             // 穿透次数
  homingTarget: null,    // 追踪弹目标引用
  t: 0,                  // 弹型曲线时间参数
};
```

### 5.4 敌机 Enemy
```js
const Enemy = {
  // ...Entity 字段
  kind: 'scout',         // 'scout'|'fighter'|'bomber'|'turret'|'kamikaze'|'carrier'
  movePattern: 'dive',   // 'dive'|'sin'|'hover'|'charge'|'formation'
  fireInterval: 1.2,     // 射击间隔(s)，0=不射击
  fireTimer: 0,
  bulletPattern: 'aimed',// 'aimed'|'ring'|'spread'|'none'
  dropRate: 0.1,         // 掉落道具概率
  dropTable: ['power'],  // 可能掉落物
  formation: null,       // 所属编队引用（编队同步移动用）
  phase: 0,              // 档案/波次
  hitFlash: 0,           // 受击闪白剩余时间
};
```

### 5.5 Boss
```js
const Boss = {
  // ...Entity 字段
  name: 'OVERLORD MK-I',
  maxHp: 6000, hp: 6000,
  phase: 1,
  phaseThresholds: [0.7, 0.35], // 血量百分比阈值触发阶段切换
  attackTimer: 0,
  currentPattern: 'fan',
  patterns: ['fan', 'ring', 'laserSweep', 'summon', 'spiral'],
  weakPoints: [],        // 弱点部位 [{ offsetX, offsetY, radius, damageMul }]
  enrage: false,         // 低血量狂暴
  parts: [],             // 可破坏部件（炮台）
  entryTimer: 0,         // 入场演出计时
  deadTimer: 0,          // 死亡演出计时
};
```

### 5.6 道具 PowerUp / 粒子 Particle / 飘字
```js
const PowerUp = { /* ...Entity */ kind: 'power', /* 'power'|'shield'|'bomb'|'heal'|'coin' */
  magnet: false, speed: 120, ttl: 8 };

const Particle = { /* 不复用 Entity 也可 */ x:0,y:0,vx:0,vy:0,life:0,maxLife:0,
  color:'#fff', size:2, kind:'spark'|'smoke'|'ring'|'debris' };

const FloatText = { x:0,y:0,vy:-40,life:0.8,text:'+100',color:'#ff0',size:16 };
```

### 5.7 增益 Buff（Roguelite 三选一）
```js
const BuffDef = {
  id: 'rapid_fire',
  name: '超频射击',
  desc: '射速 +25%',
  rarity: 'common',        // 'common'|'rare'|'epic'|'legendary'
  maxStack: 5,
  apply: (player) => { /* 修改 player 属性 */ },
};
```

---

## 6. 系统详细设计

### 6.1 输入系统 Input
- **键盘**：`WASD` / `↑↓←→` 移动；`Space`/`J` 射击（默认自动开火，见下）；`K`/`Shift` 大招；`B` 炸弹；`P`/`Esc` 暂停。
- **触屏**：屏幕任意处按下 → 记录锚点，拖动 = 相对位移操控飞机（手指与飞机 1:1 相对移动，且飞机做偏置补偿避免被手遮住）。
- **【必须】** 支持「自动开火」开关（默认开），降低移动端操作负担。
- **输出接口**：`input.axis`（-1..1 向量）、`input.fire`（bool）、`input.skillTriggered`（边沿触发）、`input.bombTriggered`。边沿触发的按键使用「消费即清零」。

### 6.2 渲染器 Renderer
- **【必须】** 逻辑画布固定 720×1280；外层用 CSS 等比 `scale` 适配容器（`letterbox` 留黑边）。
- **【必须】** 处理 `devicePixelRatio`，避免高清屏糊。
- 提供绘制工具：`glowCircle(x,y,r,color)`（用 `shadowBlur`）、`neonLine`、`textOutlined`、`gradientBg`、`screenShake(intensity, duration)`。
- **摄像机震动**：全局偏移 `shakeOffset`，渲染前 `ctx.translate`，受击/爆炸/大招时触发。

### 6.3 对象池 Pool
- **【必须】** 泛型池：`acquire()` 取（无则新建或激活死角对象）、`release(e)` 归还、`forEachActive(cb)` 遍历。
- 池化对象生命周期：`active=false` 时不被 update/draw；`release` 时重置所有字段。
- 覆盖类型：Bullet、Enemy、Particle、FloatText、PowerUp。

### 6.4 碰撞检测 Collision
- **【必须】** 采用**圆形碰撞**（性能好、手感宽容）：`dist² < (r1+r2)²`。
- 分层检测（不得全量两两比较）：
  - 玩家子弹(team=player) × 敌机/Boss 部件
  - 敌方子弹(team=enemy) × 玩家
  - 玩家 × 敌机本体 / 敌方子弹 / 道具
- **【必须】** 使用「分组 + 宽相位」：先按 y 排序或分格（Spatial Hash），再做窄相位。子弹 ≥ 300 时启用分格加速。
- **擦弹（Graze）**：敌方子弹进入玩家「判定中心外圈但未命中」环带时，`graze++`、加分、播放音效、进入慢动作帧（可选）。

### 6.5 武器系统 WeaponSystem
武器形态与升级（**【必须】至少实现 3 种武器 + 8 级成长**）：

| 武器 | 特性 | 升级表现 |
|---|---|---|
| `vulcan` 机炮 | 高射速、直线、稳定 | Lv↑ 弹道数 1→3→5→7，散射角收窄 |
| `laser` 激光 | 穿透、持续伤害 | Lv↑ 光柱加粗、伤害提升、附加灼烧 |
| `missile` 导弹 | 追踪、高伤、低频 | Lv↑ 发射数、追踪转率、爆炸范围 |
| `lightning` 闪电【可选】 | 链式跳跃攻击 | Lv↑ 跳跃目标数 |

- **升级来源**：拾取 `power` 道具（达阈值升 1 级），或满级后转化为分数。
- **实现**：`WeaponSystem.fire(player, dt)` 依据 `weaponType + weaponLevel` 从 `config.WEAPON_TABLE` 查表生成弹幕。

### 6.6 技能 / 大招 SkillSystem
- **【必须】** 至少 2 个大招：
  1. **「时空停滞」**：全屏敌方子弹减速 70%、玩家无敌，持续 3s，CD 25s。
  2. **「轨道炮」**：向正上方发射贯穿全屏的巨型光柱，造成高额伤害 + 清屏，CD 30s。
- CD 期间 HUD 显示环形进度；就绪时图标脉冲发光。
- **【可选】** 主动技能槽可扩展为 3 个，由 Buff 解锁。

### 6.7 炸弹 / 清屏
- 炸弹 `B`：瞬间清除屏幕内所有敌方子弹并造成全屏中等伤害，伴随强闪白 + 震动。
- 数量有限（初始 2），部分敌机/道具补充。

### 6.8 僚机 Wingman
- **【必须】** 玩家可携带最多 2 架僚机，跟随并自动射击（低配版武器）。
- 来源：Boss 前掉落 / Buff 解锁 / 救援人质。

### 6.9 波次 / 关卡导演 Spawner（Director）
- **【必须】** 关卡用**数据驱动**的波次脚本描述：
```js
const WAVE_SCRIPT = [
  { t: 0.5, spawn: 'scout', count: 5, pattern: 'lineV',   from: 'top' },
  { t: 3.0, spawn: 'fighter', count: 3, pattern: 'vee',   from: 'top' },
  { t: 8.0, spawn: 'turret', count: 2, pattern: 'sides',  from: 'side' },
  { t: 15.0, boss: 'OVERLORD_MK1' },                 // 到点出 Boss
];
```
- Director 维护关卡时间轴 `levelTime`，到点触发；同时根据**玩家强度动态微调**（DDA，可选）：玩家血量低时减少同屏敌弹密度。
- 编队（Formation）通过共享 `formation` 引用实现同步移动。

### 6.10 粒子和特效 Particle
- 类型：火花（命中）、爆炸环（死亡）、碎片（Boss 部件）、烟雾（引擎尾焰）、能量文字。
- **【必须】** 命中/爆炸必须有视觉反馈（闪白 + 粒子 + 震动三者至少两项）。

### 6.11 连击 / 倍率 ComboSystem
- 击杀 +1 连击，X 秒（默认 2.5s）无击杀则衰减。
- 连击达到档位（10/25/50/100）提升得分倍率（1x→1.5x→2x→3x）。
- HUD 显示连击数与倒计时环。

### 6.12 计分 / 存档 / 排行榜
- 得分 = Σ(敌机基础分 × 连击倍率) + 擦弹分 + 时间奖励。
- **【必须】** `localStorage` 保存：最高分、最佳关卡、已解锁武器、设置（音量/自动开火/画质）。
- **【可选】** 本地排行榜 Top10（存 JSON 数组）。

### 6.13 暂停 / 失焦
- `Esc` / `P` 暂停；`visibilitychange` 隐藏时自动暂停；恢复时显示 3-2-1 倒计时防偷袭（可选）。

---

## 7. 玩法系统设计（多样性的来源）

> 一局游戏 = **关卡模式**（Stage 1..N + Boss）或 **无尽模式**。以下是必须覆盖的玩法要素。

### 7.1 敌机类型表【必须，至少 6 种】
| kind | 定位 | 血量 | 速度 | 行为 | 弹幕 | 分值 |
|---|---|---|---|---|---|---|
| `scout` 侦察机 | 杂兵 | 10 | 200 | 直线俯冲 | 无 | 100 |
| `fighter` 战斗机 | 基础威胁 | 30 | 160 | 正弦横移 | aimed 单发 | 200 |
| `bomber` 轰炸机 | 高血厚甲 | 120 | 90 | 缓慢下压 | spread 散弹 | 500 |
| `turret` 炮台 | 定点火力 | 200 | 0 | 侧翼悬停 | ring 环形 | 600 |
| `kamikaze` 自爆机 | 压迫走位 | 20 | 320 | 追踪玩家冲撞 | 无 | 300 |
| `carrier` 母舰 | 小 Boss | 800 | 60 | 悬停放僚机 | 复合 | 2000 |

### 7.2 弹幕形态库【必须，至少 6 种】
`aimed`（瞄准玩家）/ `spread`（扇形）/ `ring`（环形）/ `spiral`（螺旋）/ `laserSweep`（扫射激光）/ `wall`（弹墙留缝）。
- **【必须】** 所有弹幕必须**留出可穿越缝隙**，禁止出现无解全屏封杀（金句：弹幕可以密，但必须能躲）。
- **【可选】** 弹幕子弹数量较高时切换为「对象池 + 简化绘制」保性能。

### 7.3 Roguelite 三选一增益【必须】
- 触发时机：每通过一个波次段 / 击杀 Boss 阶段 / 每 N 秒。
- 弹层：纵向卡片 3 选 1，稀有度用边框颜色区分（common 青 / rare 蓝 / epic 紫 / legendary 金）。
- **【必须】** 增益库至少 12 条，示例：
  1. 超频射击：射速 +25%（可叠 5）
  2. 强化弹头：伤害 +20%（可叠 5）
  3. 护盾充能：最大护盾 +25
  4. 僚机编队：+1 僚机
  5. 磁力吸附：道具自动吸附
  6. 擦弹大师：擦弹回能（大招 CD 加快）
  7. 分身弹：额外 2 枚侧向弹
  8. 吸血：击杀回 1 血（低概率）
  9. 暴击：15% 概率双倍伤害
  10. 闪避：10% 概率完全免伤
  11. 弹药加速：子弹速度 +30%
  12. 时间编织：敌方子弹速度 -10%

### 7.4 难度曲线
- Stage 1-2：教学，敌机稀疏，无弹幕封路。
- Stage 3-4：编队 + 弹幕混合。
- Stage 5+：多弹幕叠加、Boss 狂暴。
- 无尽模式：每 60s 提升一档 difficulty，敌机数量/血量/弹速按 `diffMul` 递增。

### 7.5 关卡结构【推荐】
```
Stage = 3 个常规波次段 → 精英战（mini-boss）→ Boss 战 → 结算（星级）
```

---

## 8. Boss 战设计（重头戏）

### 8.1 Boss 通用规格
- **【必须】** 每个 Boss **至少 2 个阶段**（推荐 3 阶段），以血量百分比切换（`phaseThresholds`）。
- **【必须】** 有入场演出（从画布外飞入 + 警报红光 + 边框警示条 + 镜头推近感）。
- **【必须】** 有死亡演出（连锁爆炸 + 白光 + 慢动作 0.6s + 大量碎片粒子 + 分数爆喷）。
- **【必须】** Boss 血条置顶，显示分段色块与阶段标记。
- **【可选】** 可破坏部件（炮台/护盾发生器），破坏后改变弹幕形态。

### 8.2 至少 3 个 Boss（每关一个，含最终 Boss）
| Boss | 关 | 阶段 1 | 阶段 2 | 阶段 3（狂暴） | 特性 |
|---|---|---|---|---|---|
| **OVERLORD MK-I** 铁翼领主 | Stage 1 | 扇形弹 fan | 环形弹 ring | — | 教学 Boss，弱点多、慢 |
| **TEMPEST CORE** 风暴核心 | Stage 2 | 螺旋弹 spiral | 扫射激光 laserSweep | — | 移动频繁、弹速快 |
| **OMEGA SERAPH** 终焉炽天使 | Final | 召唤僚机 summon | 复合弹幕 | 全屏狂暴 + 弱点暴露 | 最终 Boss，6 阶段招式循环 |

### 8.3 Boss 攻击循环（伪代码）
```
Boss.update(dt):
  若 deathTimer > 0: 播死亡演出; return
  根据 hp/maxHp 检查并切换 phase（触发一次演出 + 清屏旧弹）
  降低 attackTimer；若 <=0：
    选择/轮换 currentPattern
     按 phase 提高弹密度 & 速度
     attackTimer = 该 pattern 的间隔
  执行 pattern 发射（调用 Bullet 工厂）
```

### 8.4 最终 Boss 特殊机制【必须】
- 全屏背景色随阶段变化，营造压迫感。
- 阶段切换时短暂无敌并放射一圈冲击波（可躲）。
- 血量 < 20% 时进入狂暴：弹速 +30%、间隔 -30%、屏幕持续震动。

---

## 9. 数值与平衡表（初始基准，均在 config.js）

### 9.1 玩家
| 参数 | 值 |
|---|---|
| 基础移速 | 420 px/s |
| 判定半径 | 6 px（核心），擦弹环 26 px |
| 基础生命 | 3（撞毁 -1，血条可另设护盾） |
| 初始护盾 | 0（可 Buff 提升） |
| 初始炸弹 | 2 |
| 初始武器 | vulcan Lv1 |
| 无敌时长 | 受击 1.5s / 重生 2.5s |

### 9.2 武器伤害表（示例，Lv1..8）
| Lv | vulcan 单发伤 | 弹数 | laser DPS | missile 伤 |
|---|---|---|---|---|
| 1 | 10 | 1 | 40 | 60 |
| 4 | 14 | 3 | 90 | 90 |
| 8 | 22 | 7 | 200 | 150 |

### 9.3 掉落表
| 敌机 | 掉落概率 | 掉落内容 |
|---|---|---|
| scout | 5% | coin |
| fighter | 12% | power / coin |
| bomber | 40% | power / shield |
| turret | 50% | power / bomb |
| Boss | 100% | 多个 power + shield + bomb |

### 9.4 计分
| 事件 | 分值 |
|---|---|
| 击杀敌机 | 见 7.1 scoreValue × 连击倍率 |
| 擦弹 | +5 / 次 |
| 拾取 coin | +50 |
| 通关 | +5000 × 剩余生命 |
| 无伤通关 | ×1.5 系数 |

> **调参原则**：先让「Lv1 武器能在 8 秒内击杀 fighter」，让玩家感到成长但不至于无脑。所有数值以 config 为准，方便后续 tune。

---

## 10. 视觉风格规范（科技 / 霓虹赛博）

### 10.1 色彩体系（写入 `ui/Skin.js`）
```
背景渐变   #05010f → #0a0420 → #001018   （深空紫蓝）
主霓虹青   #00f5ff     （玩家、HUD 主色）
霓虹品红   #ff2bd6     （敌方弹幕、危险警示）
能量黄     #ffe600     （得分、连击、拾取）
危险红     #ff2e4d     （Boss 警报、低血）
成功绿     #39ff88     （回血、护盾）
稀有度色   青 / 蓝#3da9ff / 紫#b14bff / 金#ffcf3d
```
- **【必须】** 统一发光语言：发光色 = 主体色的高亮版，`shadowBlur` 12~24。
- **【必须】** 玩家与敌方可辨识：玩家/我方弹幕以**青色**为主，敌方弹幕以**品红/橙**为主，降低误判。

### 10.2 背景层次（视差滚动）
- Layer0：深空渐变 + 静态星云（微慢速）。
- Layer1：星点闪烁（中速、带视差）。
- Layer2：远景几何建筑/能量网格（快）。
- Layer3：近景荧光光带（最快，半透明）。

### 10.3 屏幕反馈（科技感来源，【必须】至少实现 3 项）
- 屏幕震动（受击 / 爆炸 / 大招）
- 命中闪白（`hitFlash`）
- 大招全屏白闪 + 径向冲击波
- 低血时画面边缘红色暗角脉冲
- 扫描线 / 噪点叠加【可选】
- 慢动作（Boss 死亡 / 擦弹密集瞬间）【可选】

### 10.4 字体与 UI
- 数字/得分用等宽科技字体（`Orbitron` / `Rajdhani`，无法加载则回退 `monospace`）。
- 所有按钮带描边 + 外发光 hover 态；HUD 面板用半透明玻璃拟态（`rgba + border`）。

---

## 11. 音效（Audio）
- **【必须】** 事件音效：射击、命中、爆炸、拾取、受击、大招、Boss 警报、Boss 死亡。
- 实现优先级：程序化 Web Audio（振荡器合成，零资源） > 内置 base64 短音 > 外部文件。
- **【必须】** BGM：主菜单循环曲 + 战斗曲 + Boss 战独立曲（可程序化生成节奏）。
- **【必须】** 音量可调、可静音，设置持久化到 localStorage。
- **【必须】** 移动端首次用户交互后再启动 AudioContext（浏览器策略）。

---

## 12. UI / HUD 布局（720×1280 基准）

```
┌───────────────────────────────┐  y=0
│ [生命♥♥♥]  [分数 12,340]   [⏸] │  ← 顶栏 高120
│ ▓▓▓▓▓▓▓▓░░░░  连击 x25 (环)    │
│ ───── Boss 血条（仅 Boss 战）── │  ← y=120~160
├───────────────────────────────┤
│                               │
│         【游戏区】             │
│                               │
│                               │
├───────────────────────────────┤
│ [大招◐CD] [炸弹×2] [武器Lv3]   │  ← 底栏 高120
└───────────────────────────────┘  y=1280
```
- **【必须】** 顶栏/底栏为半透明，不遮挡游戏区核心判定带。
- 技能 CD 用环形进度；低血时血量条脉冲闪烁。
- 三选一增益弹层：3 张竖卡居中，卡片入场有弹跳动画，点击/按键 1/2/3 选择。

---

## 13. 性能优化清单（builder 必做）
1. **【必须】** 对象池化所有高频实体（子弹/粒子/敌机），运行期零 GC 抖动。
2. **【必须】** 碰撞用圆形 + 空间分格；避免 O(n²) 全量比较。
3. **【必须】** 批量绘制：同类粒子合并、减少 `ctx.shadowBlur` 使用次数（发光开销大，可用预渲染发光贴图替代）。
4. **【必须】** 视口外的实体直接跳过 update/draw。
5. **【必须】** 渲染阶段不做对象分配（不在 draw 里 `new` / 创建临时数组）。
6. 预渲染：常驻发光图形（子弹、星点）画到离屏 canvas 复用。
7. `imageSmoothingEnabled` / DPR 按需设置，画质档位可调（低/中/高）。

---

## 14. 开发里程碑（严格按序，每个 M 都有可运行产物）

### M1 — 引擎底座（可运行空壳）【必须】
产出：能跑的循环 + 场景切换 + 渲染缩放 + 输入 + 暂停。
验收：打开页面看到深空背景和居中标题，`WASD` 有调试输出，`Esc` 可暂停，切后台自动暂停。

### M2 — 核心战斗（能打飞机）【必须】
产出：玩家移动/射击、scout 敌机、碰撞、击杀、计分、粒子、HUD 基础版。
验收：能用键盘移动并击落俯冲敌机，得分增长，爆炸有粒子与震动。

### M3 — 敌机与波次（有节奏的关卡）【必须】
产出：6 种敌机、波次导演、编队、弹幕形态库、道具掉落、武器升级。
验收：完整一波敌人按脚本刷出，敌方弹幕可躲，拾取 power 能升级武器。

### M4 — Boss 战【必须】
产出：Boss 基类 + 3 个 Boss + 多阶段 + 入场/死亡演出 + Boss 血条。
验收：打完常规波次后 Boss 登场，阶段可切换，击杀有演出并进入结算。

### M5 — 构筑与成长（耐玩深度）【必须】
产出：Roguelite 三选一增益、大招系统、炸弹、僚机、连击倍率、护盾。
验收：通过波次段能三选一，武器/僚机/大招联动生效，连击倍率正确结算。

### M6 — 打磨与发布（成品）【必须】
产出：主菜单/结算/暂停界面、音效 BGM、存档排行榜、移动端触屏、设置项、整体视觉打磨。
验收：移动端触屏可玩，刷新后最高分保留，菜单→游戏→结算完整闭环，无控制台报错。

> **【可选】增强里程碑**：无尽模式、每日挑战、皮肤系统、成就、排行榜分享图。

---

## 15. 可调参数集中表（config.js 大纲）
```js
export const CONFIG = {
  CANVAS: { W: 720, H: 1280, MAX_DT: 1/60 },
  PLAYER: { speed: 420, radius: 6, grazeRadius: 26, lives: 3, invincible: 1.5 },
  WEAPON_TABLE: { /* 按武器 × 等级查表：{damage, count, spread, speed, cd} */ },
  ENEMY_TABLE:  { /* 按 kind 查表：见 7.1 */ },
  BOSS_TABLE:   { /* 按 id 查表：见 8.2 */ },
  DROP_TABLE:   { /* 见 9.3 */ },
  BUFF_POOL:    { /* 见 7.3 */ },
  COMBO: { window: 2.5, tiers: [10, 25, 50, 100], mults: [1, 1.5, 2, 3] },
  COLORS: { /* 见 10.1 */ },
  AUDIO: { sfxVol: 0.7, bgmVol: 0.5 },
  DEBUG: { showHitbox: false, invincible: false, fps: false },
};
```

---

## 16. 验收标准总表（对照勾选）
- [ ] 浏览器打开即玩，无控制台报错，60/45 FPS 达标。
- [ ] 玩家移动、自动射击、受击无敌、生命扣减正确。
- [ ] 6 种敌机 + 6 种弹幕形态均可见并正确运作。
- [ ] 至少 3 种武器，8 级成长可感知。
- [ ] 有波次节奏，道具掉落与武器升级闭环。
- [ ] 至少 3 个 Boss，多阶段、有入场与死亡演出。
- [ ] Roguelite 三选一 + 大招 + 炸弹 + 僚机 + 连击倍率全部生效。
- [ ] 顶栏/底栏 HUD 完整，Boss 血条正确。
- [ ] 霓虹科技视觉：视差背景 + 至少 3 项屏幕反馈。
- [ ] 音效与 BGM 可调可静音，设置持久化。
- [ ] 移动端触屏可玩（相对拖拽，手指不遮挡）。
- [ ] 主菜单 / 暂停 / 结算完整闭环，最高分本地保存。

---

## 17. 附录

### 17.1 术语表
| 术语 | 含义 |
|---|---|
| STG | Shoot 'em up，飞行射击游戏 |
| 弹幕 | 大量子弹形成的可躲避图案 |
| 擦弹 Graze | 子弹贴近但未命中玩家，奖励机制 |
| DDA | 动态难度调整（Dynamic Difficulty Adjustment） |
| 对象池 | 复用对象避免频繁创建销毁 |
| Roguelite | 单局内随机获取增益、局外成长 |

### 17.2 给 builder 的最终提醒
1. 严格遵循第 5 章字段命名，不要自创字段导致系统不联动。
2. 数值一律走 config，方便调参。
3. 先跑通 M1→M2 再展开，**不要一次性写所有系统**。
4. 每个里程碑结束自测第 16 章对应条目。
5. 优先保证「能玩、流畅、反馈强」，再追求内容量。
```