#!/usr/bin/env node
/* 把 deweb/site/ 发布到 TapeKit SiteRegistry（BNB Smart Chain 56）。
   前提：容器已开通、钱包是电路 NFT 持有人或已 setOperator 的 operator。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const require = createRequire(import.meta.url);
const ethers = require(path.join(ROOT, 'deweb/site/vendor/ethers.umd.min.js'));

const SITE_ABI = [
  'function putFile(address container,string path,string contentType,bytes32 sha256Hash,bytes data)',
  'function appendChunk(address container,string path,uint256 expectIndex,bytes data)',
  'function setFallback(address container,string path)',
];
const BIND_ABI = [
  'function monthlyFee() view returns (uint256)',
  'function bind(string name,address container,uint256 months) payable',
];
const SITE = '0xd006ffdd5Ae313B17729621A00999cD3C71CE5e6';
const BIND = '0x861EE183de2BBE4a6ecf9D15812C123b566a3DB7';

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
}

async function main() {
  const container = arg('container');
  const pk = arg('pk');
  const rpc = arg('rpc', 'https://bsc-dataseed.bnbchain.org');
  const gasPrice = arg('gasprice', '300000000');
  const name = arg('name');
  const months = Number(arg('months', '1'));
  if (!container || !pk) {
    console.error('用法: node tools/publish_deweb.mjs --container 0x... --pk 0x... [--name "<id>.<cpu>.tape" --months 1] [--rpc ...]');
    process.exit(1);
  }

  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const site = new ethers.Contract(SITE, SITE_ABI, wallet);
  const opts = { gasPrice: ethers.BigNumber.from(gasPrice) };

  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'deweb/manifest.json'), 'utf8'));
  console.log(`发布 ${manifest.fileCount} 个文件 / ${(manifest.totalBytes / 1e6).toFixed(2)} MB → ${container}`);

  for (const f of manifest.files) {
    const chunks = f.chunks.map(b => ethers.utils.arrayify(ethers.utils.base64.decode(b)));
    let tx = await site.putFile(container, f.path, f.contentType, f.sha256, chunks[0], opts);
    await tx.wait();
    for (let i = 1; i < chunks.length; i++) {
      tx = await site.appendChunk(container, f.path, i, chunks[i], opts);
      await tx.wait();
    }
    console.log(`  ✓ ${f.path} (${f.size} B, ${chunks.length} chunk)`);
  }

  tx = await site.setFallback(container, 'index.html', opts);
  await tx.wait();
  console.log('fallback = index.html');

  if (name) {
    const bind = new ethers.Contract(BIND, BIND_ABI, wallet);
    const fee = await bind.monthlyFee();
    const value = fee.mul(months);
    console.log(`激活 ${name} ${months} 个月：${ethers.utils.formatEther(value)} BNB`);
    tx = await bind.bind(name, container, months, { ...opts, value });
    await tx.wait();
    console.log('  ✓ 名字已激活');
  }
  console.log('完成。用 https://<id>-<cpu>.tapekit.org/.tape/status 逐文件核对。');
}

main().catch(e => { console.error('发布失败:', e.reason || e.message || e); process.exit(1); });
