/* 卡灵战争 · 游戏内英文切换
   做法：只替换「完全匹配」的文本节点 / 占位符，不动任何游戏逻辑。
   中文是默认；用户点 中/EN 后把选择存 localStorage。 */
(function () {
  const D = {
    '跳到内容': 'Skip to content',
    '卡灵战争': 'Kaling War',
    'Agent Packs · 第 0 战季': 'Agent Packs · Season 0',
    '世界观': 'Story', '开包': 'Open', '收藏': 'Collection', '实验室': 'Lab',
    '补给': 'Supply', '任务': 'Quests', '卡池': 'Pool',
    '卡包': 'Packs', '已满': 'Full', '积分': 'Points', '身份': 'ID', '游客': 'Guest',
    '第 0 战季开放中：每个卡灵就是一条链上规则 · Binance Agent ID 做身份，TapeOut 电路做魂':
      'Season 0 is live: every Kaling is an on-chain rule · Binance Agent ID as identity, TapeOut circuits as soul',
    '开包开出的': 'A pack does not hold', '不是图片，': 'an image — it holds',
    '是一个有名字的 AI': 'an AI with a name',
    '每包必出 1 张': 'Every pack has 1 ', '名人卡': 'celebrity card',
    '免费开一包': 'Open a free pack', '查我在不在卡池': 'Am I in the pool?',
    '世界观 →': 'Read the story →',
    '现在有': 'Now available: ', '个免费包，不用注册，不用钱包。': ' free packs — no sign-up, no wallet.',
    '点一下，或者沿顶部虚线划开': 'Tap it, or swipe along the dotted line',
    '每 1000 张卡里，各稀有度有几张': 'How many of each rarity per 1,000 cards',
    '概率写死在合约常量里，没有任何函数能改它。色带按真实 ‰ 等比绘制——最细那 1‰ 就是 1 个像素宽。':
      'Odds are hardcoded in the contract with no setter. The bar is drawn to scale — the sliver is the 1‰ card.',
    '规则证书': 'Rule certificate',
    '每张卡都是一张可以复算的规则证书': 'Every card is a verifiable rule certificate',
    '止损电路': 'Stop-loss circuit',
    '每天最多花 $20，超出要人工放行。稀有度和星级越高，额度越大。':
      'Spend at most $20 a day; over that needs a human. Rarity and stars raise the cap.',
    '风控电路': 'Risk circuit',
    '收款方必须也持有官方 Agent ID，否则拒绝。': 'Payee must hold an official Agent ID or payment is refused.',
    '身份卡': 'Identity card',
    '抽到某个 .ai 的身份卡，就能把收款方锁死在这个人身上，适合订阅。':
      'Pull a .ai identity card and lock payments to that person — built for subscriptions.',
    'GPU 推理账单': 'GPU inference invoice', '通过': 'PASS',
    '数据集订阅，今天已花 $20': 'Dataset subscription, $20 spent today',
    '超上限，要人工确认': 'Over cap, needs a human',
    '「紧急退款」陌生地址': '"Urgent refund" from a stranger', '拦截': 'BLOCKED',
    '一张卡怎么变成一条规则': 'How a card becomes a rule',
    '免费包会自己回满。新手第一包保底 SSR，连续 10 张没出 SR 就强制给一张。':
      'Free packs regenerate. Your first pack guarantees SSR; 10 cards without SR force one.',
    '翻面就是规则': 'Flip it, read the rule',
    '卡背印着一条支出规则。稀有度和星级越高，额度越大，参数在链上任何人都读得到。':
      'The back prints a spending rule. Higher rarity and stars mean higher caps; anyone can read the params on-chain.',
    '穿上就生效': 'Equip it and it guards',
    '卡灵战争 · 第 0 战季': 'Kaling War · Season 0',
    '30/30 测试通过 · BNB Chain': '58+ tests passing · BNB Chain',
    '免费包每 20 秒回 1 个，最多存 12 个。': 'A free pack every 20 seconds, 20 per day cap.',
    '可以开的包': 'Packs ready', '开 1 包': 'Open 1', '连开 5 包': 'Open 5',
    '主网上对应每天一次的': 'On mainnet this is the daily ',
    '，开包结果由合约的提交-揭示流程决定。': ', decided by on-chain commit-reveal.',
    '待开的包': 'Pending packs', '0 包': '0 packs',
    '概率与保底': 'Odds & pity', '链上常量': 'On-chain constants',
    '新手第一包的第 5 张，保底 SSR 或更高。': 'Card 5 of your first pack is SSR or better.',
    '连续 10 张没出 SR，下一张强制 SR 或更高。': '10 cards without SR forces SR or better.',
    '演示档和': 'Demo mode and ', '用同一套规则，可以在 BscScan 核对。': ' use the same rules — verify on BscScan.',
    '点一张卡，可以穿上、升星或卖掉。': 'Tap a card to equip, star up or sell it.',
    '按稀有度': 'By rarity', '按获得时间': 'By date', '按攻击力': 'By ATK',
    '全部': 'All', '交易': 'Trade', '风控': 'Lockdown', '安全': 'Security', '协作': 'Trust',
    '用积分换一张 SR': 'Redeem points for an SR',
    '500 分换 1 张保底 SR。积分只能在站内用，不能提现。':
      '500 points for a guaranteed SR. Points are in-game only, never cashable.',
    '花 500 分兑换': 'Redeem 500 points',
    '三步走：① 拨开关看懂电路怎么判 ② 亲自守 10 笔付款 ③ 连真钱包上链验证。':
      'Three steps: ① flip switches to see the circuit judge ② guard 10 payments ③ connect a wallet to verify on-chain.',
    '真电路 · 链上 · 谁也改不了': 'Real circuit · on-chain · unchangeable',
    '① 你的卡会思考：拨一拨，亲眼看它判': '① Your card thinks: flip the switches',
    '10 秒看懂': 'Understand in 10 seconds', '规则就一句话：': 'The rule in one line:',
    '钱没超、或有人点头 → 放行；超了但收款人认识 → 先问下人；其他 → 直接拒签。':
      'Within cap or human approved → pass; over cap but known payee → ask; otherwise → deny.',
    '这不是写在纸上的条款，是': 'This is not a clause on paper — it is a ',
    '焊死在链上的一颗真电路': 'real circuit soldered on-chain',
    '——部署之后，连我们都改不了它。': ' — once deployed, even we cannot change it.',
    '拨动输入后运行': 'Flip inputs, then run', '看它怎么判': 'Watch the verdict',
    '随机一笔付款': 'Random payment', '假装断网试试': 'Pretend the network is down',
    '左边四个开关就是一笔付款的全部信息。按一下，看信号在电路里跑完全程——':
      'The four switches on the left are everything about one payment. Watch the signal travel through the circuit —',
    '这就是你的 AI 每笔付款前，真真切切发生的事': 'this really happens before every AI payment',
    '任何人免费复算 ·': 'Anyone can recompute for free ·',
    '② 亲自守一次门：10 笔付款冲过来，骗子混在里面': '② Guard the gate: 10 payments, scammers mixed in',
    '评级 S 奖 3 包': 'S rank: 3 packs',
    '把①里那套规则叠成你的': 'Stack the rules from ① into your ',
    '规则栈': 'rule stack', '（最多 3 张卡），去接 10 笔付款——': ' (up to 3 cards) and face 10 payments —',
    '仿冒的 .ai、重复扣款、天价"紧急退款"就混在里面': 'impostor .ai, double charges, absurd "urgent refunds" are mixed in',
    '。规则先判，你 6 秒内可推翻。': '. The rule judges first; you have 6 seconds to override.',
    '怎么玩': 'How to play',
    '从收藏里挑最多 3 张电路卡，叠成你 Agent 的规则栈。所有规则都通过，才算规则放行。':
      'Pick up to 3 circuit cards to stack. All rules must pass for the stack to approve.',
    '每笔请求有 6 秒。不动手，就按规则的判定自动处理；按': 'Each request gives 6 seconds. Do nothing and the rule decides; press ',
    '拦截、': 'block, ', '放行（方向键 ← → 也行），就是人工推翻。': 'release (or arrow ← →) to override.',
    '请求里混着骗局：仿冒的 .ai、重复扣款、天价「紧急退款」。拦下骗局，放行真账单。':
      'Scams are mixed in: fake .ai, duplicate charges, huge "urgent refunds". Block scams, release real bills.',
    '开始守门': 'Start guarding', '/ 10 笔': '/ 10',
    '今天已付': 'Paid today', '拦下骗局': 'Scams blocked', '被骗走': 'Lost to scams',
    '误杀真账单': 'Real bills blocked', '放行': 'Release', '不动手就按规则处理。': 'No action = follow the rule.',
    '③ 上链验证：真钱包 · 真合约 · BscScan': '③ Verify on-chain: real wallet · real contract · BscScan',
    'BNB 主网 56': 'BNB Mainnet 56',
    '这一页的操作全部由': 'Every action here runs on ',
    '执行，并在合约里核验你的 Agent ID。合约部署后，把地址粘到下面即可启用。':
      ' and checks your Agent ID on-chain. Paste the address below once deployed.',
    '合约地址': 'Contract address', '保存地址': 'Save address', '切换网络': 'Switch network',
    '连接钱包': 'Connect wallet', '领包 + 承诺': 'Claim + commit', '揭示': 'Reveal',
    '买单包 0.002 BNB': 'Buy 1 pack · 0.002 BNB', '入池 claimIntoPool': 'Join pool',
    '退池 leavePool': 'Leave pool', '卡号 #': 'Card #', '穿卡 equip': 'Equip',
    '查积分 packPoints': 'Check points', '等待连接': 'Waiting for connection',
    '复算一笔支付': 'Recompute a payment', '连接钱包后会依次调用 equippedRule(agent) 和 checkPayment(agent, amount, payee, spent, …)。':
      'Connect a wallet to call equippedRule(agent) then checkPayment(...).',
    '④ 用卡付款：卡灵的闸门（GuardVault）': '④ Pay with a card: the Kaling gate (GuardVault)',
    '真拦截': 'Real enforcement',
    '把 BNB 存进金库，付款必须先过卡：规则不通过就 revert。AI 热钱包只能发起，超额要你本人点头。卡从"建议"变成"法律"。':
      'Deposit BNB; every payment must pass the card first — revert if the rule says no. An AI hot wallet can only initiate; over cap needs your approval. The card becomes law.',
    'GuardVault 地址': 'GuardVault address', '保存金库': 'Save vault', '设费率': 'Set rate',
    '存入 BNB': 'Deposit BNB', '存入': 'Deposit', '付款 BNB': 'Pay BNB', '收款方 0x…': 'Payee 0x…',
    '用卡付款': 'Pay with card',
    '先保存金库地址。费率口径：1 美分 = 0.0001 BNB（演示用，可随时由你重设）。':
      'Save the vault address first. Demo rate: 1 cent = 0.0001 BNB.',
    '从 2017 打到 2025': 'From 2017 to 2025',
    '带 3 张卡穿越五轮周期，全自动战斗。': 'Three cards, five market cycles, auto battle.',
    '上场阵容': 'Lineup', '战绩': 'Record',
    '任务': 'Quests', '每日': 'Daily', '成就': 'Achievements', '领取': 'Claim', '已领取': 'Claimed',
    '你的 .ai 每被抽到一次，你得 10 分。卡面只印名字，不包含任何钱包信息。退出后，已经发出的卡成为绝版，不再新发。':
      'Each time your .ai is pulled you earn 10 points. The card prints only the name — no wallet data. Leave the pool and issued cards become collector\'s editions.',
    '你的 .ai 名字': 'Your .ai name', '认领入池': 'Claim into pool', '退出卡池': 'Leave pool',
    '重置演示档': 'Reset demo', '重置中…': 'Resetting…',
    '撕开卡包': 'Tear the pack', '全部翻开': 'Reveal all', '收进收藏': 'Add to collection',
    '晒到 X': 'Share on X', '点卡包撕开': 'Tap the pack to tear', '开包中': 'Opening',
    '开包结果': 'Pack result', '新卡': 'New cards', '规则': 'Rule', '稀有度': 'Rarity',
    '概率': 'Odds', '保底': 'Pity', '规则说明': 'Rule details', '返回': 'Back',
    '连接中…': 'Connecting…', '请稍候': 'One moment',
    '手机钱包连接': 'Connect mobile wallet',
    '用 X / 邮箱连接（Privy）': 'Connect with X / Email (Privy)',
    '连接中…': 'Connecting…',
    '登录后自动生成嵌入钱包 · BNB Chain · 无需下载 App。': 'An embedded wallet is created on login · BNB Chain · no app needed.',
    '● 未检测到注入钱包 —— 可用下方 X / 邮箱 登录（Privy 嵌入钱包），或用 Binance Wallet 内置浏览器打开。': 'No injected wallet found — log in with X / Email below (Privy embedded wallet), or use the Binance Wallet browser.',
    '查询': 'Query', '取消': 'Cancel', '确认': 'Confirm', '关闭': 'Close',
    '没有钱包': 'No wallet found', '请先连接钱包': 'Connect a wallet first',
  };
  const ATTRS = ['placeholder', 'title', 'aria-label'];
  let lang = localStorage.getItem('ap_lang') || 'zh';
  const originals = new WeakMap();
  let obs = null;

  function tx(s) {
    if (lang !== 'en' || !s) return s;
    const key = s.replace(/\u00a0/g, ' ').trim();
    return D[key] || s;
  }

  function apply() {
    if (obs) obs.disconnect();
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walk.nextNode()) nodes.push(walk.currentNode);
    for (const n of nodes) {
      const p = n.parentElement;
      if (!p || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(p.tagName)) continue;
      const raw = n.nodeValue || '';
      if (lang === 'en' && !/[\u4e00-\u9fff]/.test(raw)) continue;
      if (lang === 'en') {
        if (!originals.has(n)) originals.set(n, raw);
        const out = tx(raw);
        if (out !== raw) n.nodeValue = out;
      } else if (originals.has(n)) {
        const orig = originals.get(n);
        if (n.nodeValue !== orig) n.nodeValue = orig;
      }
    }
    document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => {
      ATTRS.forEach(a => {
        const v = el.getAttribute(a);
        if (v && /[\u4e00-\u9fff]/.test(v)) el.setAttribute(a, tx(v));
      });
    });
    const btn = document.getElementById('langBtn');
    if (btn) btn.textContent = lang === 'en' ? '中' : '语';
    if (obs) obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  window.applyI18n = apply;
  window.toggleLang = function () {
    lang = lang === 'en' ? 'zh' : 'en';
    localStorage.setItem('ap_lang', lang);
    apply();
    return lang;
  };

  document.addEventListener('DOMContentLoaded', () => {
    apply();
    obs = new MutationObserver(() => apply());
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    const b = document.getElementById('langBtn');
    if (b) b.onclick = window.toggleLang;
  });
})();
