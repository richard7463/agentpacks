# Agent Packs · 12 电路卡英雄——完整生图提示词文档

> 用途：交给任意 AI 生图工具（Midjourney / 即梦 / DALL·E / SD）生成 12 张卡面角色。
> 输出：竖版人物立绘，命名 `t0.jpg ~ t11.jpg`，发回后统一裁 400×560 部署，前端零改动自动替换。
> 通用要求：**严格统一风格**——同一工具、同一模型、同一风格参数，最好垫同一张参考图。

---

## 0 · 风格圣经（Style Bible）——每条提示词共用

### 世界观
一套名为 **Agent Packs** 的科幻收藏卡游戏。角色是**"电路之灵"**——把链上支出规则拟人化的战士。他们的装备上有发光电路纹路，背景是深墨紫的电路板空间。

### 色板（严格执行）
| 用途 | 色值 |
|---|---|
| 背景 | 深墨紫 `#0F0C24` → 深部 `#18143B`，带低透明度电路板走线纹 |
| 主角轮廓光/描金 | 金 `#F2C14E` |
| 高光白 | 冷纸白 `#F2EFFF` |
| **交易家族点缀** | 青 `#6CF2D6`（t0/t1/t3/t4/t5）|
| **风控家族点缀** | 红 `#FF5C7A`（t7/t8）|
| **安全家族点缀** | 金 `#F2C14E`（t2/t6）|
| **协作家族点缀** | 紫 `#B79BFF`（t9/t10/t11）|

### 构图与光影
- 全身立绘、人物居中、竖版 5:7（或 2:3）；脚部位于画面下 1/3，头顶留白
- 顶后方强轮廓光（rim light），正面主光柔和，人物边缘带金/家族色 glow
- 背景干净：只有暗色渐变 + 若隐若现的电路走线 + 微弱光晕，**绝无**杂物、场景、文字

### 画风
- 高品质 CCG 商业卡牌插画（炉石/Marvel Snap 级完成度），厚涂+光效
- 单人（仅 t9 是双子）；半写实比例、不要 Q 版

### 通用负面提示词（Negative / 排除项）
```
text, watermark, signature, logo, letters, numbers, UI, frame, border, multiple panels,
busy background, landscape, scenery, chibi, lowres, blurry, extra fingers, deformed hands
```

### 通用风格后缀（英文，每条提示词末尾拼接）
```
full-body character portrait for a premium sci-fi trading card game, single centered figure,
dark ink-purple background #0F0C24 with faint circuit-board traces, dramatic golden rim light
from behind, subtle holographic foil shimmer, family accent color glow, painterly CCG
illustration, vertical composition, feet at lower third, no text, no watermark
```

---

## 1 · 十二个角色（完整版提示词）

### t0 · 止损 · 守账武士（交易/青）
**语义**：每日支出上限——纪律与克制。
```
A disciplined samurai-treasurer spirit guarding a daily budget. A stern warrior in dark
indigo lacquered armor with faint glowing teal circuit lines etched across the plates.
Left hand rests on a sheathed katana; right hand holds open a floating golden ledger book
with rows of glowing tally marks, one row sealing itself with a small teal energy bar.
A thin teal barrier of light arcs around him like a protective daily allowance ring.
Expression: calm, vigilant, absolutely restrained. Pose: standing guard, weight settled,
no aggression. Accent color: teal #6CF2D6 on ledger glow and circuit etchings.
```
+ 通用风格后缀 + 负面提示词

### t1 · 梭哈 · 巨剑狂战士（交易/青）
**语义**：单笔上限——孤注一掷的一击。
```
A fierce berserker spirit of the single all-in strike. A tall muscular warrior mid-swing,
rotating torso, dragging ONE massive oversized greatsword forged from condensed golden
light, blade edge crackling with teal energy fractures. Ground beneath the strike shatters
into floating circuit fragments. Simple battle-scarred armor, no shield — everything bet
on one strike. Expression: ecstatic fury, teeth bared. Accent: teal #6CF2D6 energy
fractures along the golden blade.
```
+ 通用风格后缀 + 负面提示词

### t2 · 白名单 · 验证圣骑（安全/金）
**语义**：只付给持有 Agent ID 的地址——身份核验。
```
A verification paladin spirit who scans identities before allowing passage. A knight in
slim white-and-gold armor, face half-covered by a sleek visor. Left arm carries a round
shield bearing a large glowing scanning-eye sigil; from the eye sweeps a horizontal teal
verification laser across the frame. Right hand raised, palm out, casting a golden seal of
approval shaped like a checkmark of light. Registered souls shine as small golden motes
around her. Expression: serene, incorruptible. Accent: gold #F2C14E armor trim, teal laser.
```
+ 通用风格后缀 + 负面提示词

### t3 · 加仓 · 复利剑士（交易/青）
**语义**：额度随成功笔数增长——复利成长。
```
An elegant duelist spirit of compounding growth. A lithe swordswoman in flowing dark
garments with gold circuit embroidery, holding two slim sabers crossed low. Above her
free hand, three concentric golden rings stack upward, each ring larger than the one
below, glowing brighter with altitude — a rising compounding halo. Small teal sparks
multiply as they drift upward. Expression: confident smile, rising momentum. Pose: forward
lunge about to begin a winning streak. Accent: teal #6CF2D6 multiplying sparks, gold rings.
```
+ 通用风格后缀 + 负面提示词

### t4 · 清仓 · 居合剑客（交易/青）
**语义**：每日笔数上限——极简、精准、有限次的斩击。
```
An iaijutsu master spirit of limited strikes. A lean samurai in minimal dark robes, hand
hovering over the katana hilt, mid-precision-draw: a single clean slash of teal light
trails diagonally across the frame — the only strike of the day. Three small glowing
counters (like bullet tallies) float beside his shoulder, two dim, one bright. A tiny
hourglass hangs at his belt, sand nearly settled. Expression: absolute focus, eyes
narrowed. Accent: teal #6CF2D6 slash trail and tally counters.
```
+ 通用风格后缀 + 负面提示词

### t5 · 抄底 · 影刺客（交易/青）
**语义**：小额免人工确认——快速、无摩擦的小额出击。
```
A nimble shadow-assassin spirit of frictionless micro-payments. A small-framed rogue in
dark fitted gear with teal circuit seams, mid-dash, semi-transparent afterimage behind.
Right hand flicks a cluster of tiny coin-shaped throwing blades, each coin stamped with a
circuit glyph; the coins leave short teal light trails. Motion is low and economical —
small quick strikes, not heavy blows. Expression: playful smirk under a half-mask.
Accent: teal #6CF2D6 coin trails.
```
+ 通用风格后缀 + 负面提示词

### t6 · 杠杆 · 天平魔导师（安全/金）
**语义**：高额 + 人工闸门——超过一半额度必须有人点头。
```
A judgment mage spirit of high-stakes limits. A tall sorcerer in layered gold-and-ink
robes, holding aloft a tall golden balance beam: one pan stacked with glowing coins, the
other pan holding a tiny standing human figure made of light — the human approval that
outweighs gold. The beam is tipped slightly toward the human side. Around her waist, a
red warning filament glows at the half-way mark of her sash. Expression: impartial,
weighing. Accent: gold #F2C14E beam, subtle red half-limit filament.
```
+ 通用风格后缀 + 负面提示词

### t7 · 钻石手 · 晶拳僧（风控/红）
**语义**：两笔支付冷却——等待与耐心。
```
A stoic monk spirit of the waiting discipline. A broad bare-armed martial monk, both
fists transformed into crystalline diamond with circuit veins glowing faint red inside.
He stands in patient meditation stance, one fist drawn back but NOT striking — the
cooldown between blows. Behind his head, a slow halo of interlocking clock gears, one
gear mid-rotation, glowing at the tick. Sand-still calm. Expression: closed eyes or
serene downward gaze. Accent: red #FF5C7A pulsing in diamond fists and gear halo.
```
+ 通用风格后缀 + 负面提示词

### t8 · 封控 · 落闸骑士（风控/红）
**语义**：当日一旦被骗，全线封锁——止血的堡垒。
```
A fortress knight spirit of emergency lockdown. A colossal heavy-armored guardian
slamming a tower shield down like a portcullis gate closing: the shield's face is a
lattice of iron bars with red circuit energy sealing between them. His helmet visor is
itself a tiny portcullis grid, red warning lamps lit across the armor seams. Behind the
gate, faint chaos; before it, absolute stillness. Expression: none visible — only duty.
Accent: red #FF5C7A warning glow, gold gate frame.
```
+ 通用风格后缀 + 负面提示词

### t9 · 双签 · 双子武士（协作/紫）
**语义**：超半额需两人批准——一张卡，两个人。
```
Twin warrior spirits of the dual signature — the ONLY two-figure card. Two identical
sibling warriors standing back-to-back in perfect mirrored stances, blades crossed
downward in rest. Between their shoulders floats a single large violet pact seal: a
two-part wax-and-circuit emblem, half lit, waiting for the second press to complete.
Their sashes are linked by a glowing violet thread. Expressions: identical calm trust.
Accent: violet #B79BFF pact seal and connecting thread.
```
+ 通用风格后缀 + 负面提示词（`single centered figure` 一词在这条要去掉）

### t10 · 会签 · 圆桌议长（协作/紫）
**语义**：超额需 M 人批准——议事与多数决。
```
A council speaker spirit of majority quorum. A dignified elder diplomat in layered
violet-and-ink court robes, one hand raising a glowing gavel mid-air (not yet struck),
the other presenting an open palm upward. Orbiting above: five floating voting sigils
arranged in a ring — three alight in violet, two dark; a thin beam of decision light
connects the three lit sigils to the gavel head, quorum achieved. Expression: measured,
awaiting the final nod. Accent: violet #B79BFF sigils and decision beam.
```
+ 通用风格后缀 + 负面提示词

### t11 · 委托 · 信使官（协作/紫）
**语义**：限时窗口内、只付给指定对象——带着时限的授权。
```
A herald courier spirit of time-limited delegation. A swift envoy in travel-worn
violet-and-ink uniform, sprinting lightly along a path of glowing delivery light that
stretches behind and ahead. Left arm cradles a sealed scroll bound with a circuit-glyph
wax seal; right hand carries a large hourglass whose upper bulb is nearly empty — the
grant is expiring. The light path is visible only for a fixed distance ahead, then fades
into darkness. Expression: courteous urgency. Accent: violet #B79BFF scroll seal and path.
```
+ 通用风格后缀 + 负面提示词

---

## 2 · 参数速查

| 工具 | 建议 |
|---|---|
| Midjourney | `--ar 5:7 --style raw --niji 6`（写实用 `--v 7`）；12 张共用同一 seed 附近微调 |
| 即梦/中文工具 | 直接用中文段落 + 上面的通用风格后缀中文版；开"参考图"垫第 1 张满意的 |
| SD/ComfyUI | 512×768 或 832×1216；同一 checkpoint（如动漫系:AnythingV5/卡通系:扁平厚涂系）；固定 seed 差 1 递增 |

**中文通用风格后缀**（中文工具用这条替代英文后缀）：
```
全身角色立绘，高级科幻收藏卡风格，人物居中，深墨紫背景 #0F0C24 带淡电路板走线，
顶后方金色轮廓光，轻微全息镭射质感，家族点缀色发光，厚涂商业卡牌插画，竖构图，
脚位于画面下三分之一，无文字无水印
```

---

## 3 · 交付与验收清单

- [ ] 12 张全部竖版、全身、单人（t9 双人）
- [ ] 家族色正确：t0/t1/t3/t4/t5 青；t7/t8 红；t2/t6 金；t9/t10/t11 紫
- [ ] 无文字、无水印、背景干净
- [ ] 标志性道具在位：账本 / 巨剑 / 扫描之眼 / 复利环 / 沙漏 / 双子印 / 五签环 …
- [ ] 按 t0~t11 命名（或发图时标注对应关系）

发回 12 张图 → 我裁 400×560 顶部锚定 → scp 到雅加达 `heroes/` → 线上自动升级，前端零改动。
