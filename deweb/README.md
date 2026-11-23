# DeWEB / TapeKit 发布说明

本站的链上版本。**先构建，后发布**。构建产物 `site/` 可以直接交给 HashPort 控制台上传，也可以用 `tools/publish_deweb.mjs` 自己签交易。

## 1. 它是什么

网站文件存在 BNB Smart Chain 的 `SiteRegistry` 里，挂在一枚 TapeOut 电路 NFT 的 ERC-6551 container 下。每个文件记录大小和 SHA-256，TapeKit 内核读取时逐字节校验。

- 链上名字：`<#ID>.<processor number>.tape`，例如 `4246.0.tape`
- 访问：`tape://<id>.<cpu>.tape/`，或网关 `https://<id>-<cpu>.tapekit.org/`
- 状态页：`https://<id>-<cpu>.tapekit.org/.tape/status`

## 2. 前置条件

1. 一枚 **BNB 主网 TapeOut 电路 NFT**（processor 地址 + tokenId）
2. container 已开通：HashPort 控制台会做，或用容器 opener `0x021745DE2f42A7839d96f2d3634d0294487D81F1` 的 `open(circuits, tokenId)`
3. 持有该 NFT 的钱包 + BNB gas

合约（BNB 56）：

| 用途 | 地址 |
|---|---|
| Processor factory | `0x68224F668083c29e9800Be2a646d42d18cedF7e2` |
| Container opener | `0x021745DE2f42A7839d96f2d3634d0294487D81F1` |
| SiteRegistry | `0xd006ffdd5Ae313B17729621A00999cD3C71CE5e6` |
| DomainBinding | `0x861EE183de2BBE4a6ecf9D15812C123b566a3DB7` |

## 3. 构建

```bash
cd ../..                       # 回到仓库根
python3 tools/build_deweb.py
```

构建脚本做了这些事：

- 只拷贝纯静态文件（HTML / JS / CSS / 图片 / EN 页 / 分享落地页）
- ethers 从 CDN 改成本地 `vendor/ethers.umd.min.js`
- 删掉 Google Fonts、OG/Twitter meta、canonical 等链外绝对地址
- 把 `https://agentid.cards/...` 按目录深度改写成相对路径
- 把 CSS 里带 `http://www.w3.org` 命名空间的 SVG data URI 换成本地 `noise.png`
- 生成 `manifest.json`：每个文件的 MIME、SHA-256、24,000 字节分块（base64）

限制检查：单块 24,000 B、单文件 ≤ 8.4 MB、路径 ≤ 5,000。当前 `privy-widget.js` 4.6 MB（193 块），能过。

## 4. 发布

### 方式 A：HashPort 控制台

把 `deweb/site/` 整个目录上传，控制台自动算哈希、切块、设 fallback。

### 方式 B：脚本

```bash
node tools/publish_deweb.mjs \
  --container 0x<container> \
  --pk 0x<私钥> \
  --name "<id>.<cpu>.tape" \
  --months 1
```

脚本会：逐文件 `putFile` + `appendChunk` → `setFallback(index.html)` → 可选 `DomainBinding.bind()` 激活名字（当前 0.08 BNB / 30 天）。

> `putFile`/`appendChunk` 只能由 container 的 holder 或 `setOperator` 授权的地址调用。

## 5. 核对

```bash
# 状态页（每个文件是否 verified、有无链外引用）
open https://<id>-<cpu>.tapekit.org/.tape/status

# 命令行逐文件核对哈希
node -e "import('./kernel/src/index.js').then(async ({createKernel}) => { const k=createKernel(); const r=await k.resolve('<id>.<cpu>.tape'); const s=await k.openSite(r); for (const p of s.manifest.paths) { const f=await s.get(p); console.log(f.status, f.sha256, p); } })"

# 本地哈希对照
shasum -a 256 deweb/site/index.html
```

## 6. 关于「100% on-chain」

构建产物在**静态 HTML/CSS 层面**已经没有链外引用（扫描为 0）。但有两个运行时行为会带来链外请求，会在状态页被列出、并让徽章变成「references off-chain resources」：

1. 分享到 X 走 `twitter.com/intent/tweet`
2. Privy 登录走 `auth.privy.io` 的 iframe（只在用户点登录时触发）

如果你要严格 100% 徽章，发布前在 `app.js` 里把这两处改成「复制链接到剪贴板」并移除 `privy-widget.js`。链上读写（`window.ethereum` / 公共 RPC）不算链外。

## 7. 更新 / 下线

- 更新：改源码 → 重跑构建 → 重新 `putFile`（同路径会整体替换）
- 下线：对每个路径调用 `removeFile`
- 转让电路 NFT：网站、container 和剩余激活时间一起转让
