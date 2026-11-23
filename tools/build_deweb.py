#!/usr/bin/env python3
"""准备 DeWEB / TapeKit 发布目录。

产出：
    deweb/site/          纯静态站（全部相对路径，自托管 ethers，去掉远程字体/OG 绝对地址）
    deweb/manifest.json  每个文件的 MIME / SHA-256 / 24KB 分块（base64）
    deweb/README.md      发布步骤

不含任何链上操作；发布需要 circuit NFT + container + 钱包签名。
"""
import base64
import hashlib
import json
import pathlib
import re
import shutil

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "deweb"
SITE = OUT / "site"
ETHERS_SRC = ROOT / "deweb-build" / "ethers.umd.min.js"

FILES = [
    "index.html", "story.html", "terms.html", "pitch.html", "check.html",
    "app.js", "ui.css", "fx.js", "i18n.js", "privy-widget.js",
]
DIRS = ["heroes", "faces", "og", "c", "en"]

MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".svg": "image/svg+xml", ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8",
    ".woff2": "font/woff2", ".mp4": "video/mp4",
}
CHUNK = 24000


def rel_prefix(path: pathlib.Path) -> str:
    depth = len(path.relative_to(SITE).parts) - 1
    return "../" * depth if depth > 0 else ""


def transform_html(text: str, path: pathlib.Path) -> str:
    # 去掉所有指向外站的 meta / canonical / alternate（含 OG / Twitter 卡片）
    text = re.sub(
        r'\s*<meta[^>]+(?:property|name)="(?:og:|twitter:|description|viewport)[^>]*>',
        "", text, flags=re.I,
    )
    text = re.sub(r'\s*<link[^>]+rel="(?:canonical|alternate)"[^>]*>', "", text, flags=re.I)
    # 去掉 Google Fonts 的 preconnect / stylesheet
    text = re.sub(r'\s*<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>', "", text, flags=re.I)
    # ethers 自托管
    text = re.sub(
        r'<script[^>]+src="https://cdn\.jsdelivr\.net/npm/ethers@[^"]+"[^>]*>\s*</script>',
        '<script src="vendor/ethers.umd.min.js" defer></script>', text, flags=re.I,
    )
    # 绝对站内地址 → 相对路径（按文件所在深度）
    pre = rel_prefix(path)

    def sub_abs(m):
        tail = m.group(1).lstrip("/")
        if tail == "":
            return f"{pre}index.html"
        return pre + tail

    text = re.sub(r"https?://agentid\.cards/([^\s\"'<>)]*)", sub_abs, text)
    text = text.replace("https://agentid.cards", pre.rstrip("/") or ".")
    return text


def transform_js(text: str) -> str:
    # 只处理会导致链外加载的点；分享链接保留绝对地址（X 预览必须）
    text = text.replace(
        "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js",
        "vendor/ethers.umd.min.js",
    )
    # data:image/svg+xml 里带 http:// 命名空间，静态扫描会当成链外引用 → 换成本地 PNG
    text = re.sub(r'background-image:url\("data:image/svg\+xml,[^"]*"\)',
                  'background-image:url("noise.png")', text)
    return text


def build() -> None:
    if SITE.exists():
        shutil.rmtree(SITE)
    (SITE / "vendor").mkdir(parents=True)

    for name in FILES:
        src = ROOT / name
        if not src.exists():
            continue
        dst = SITE / name
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)

    for d in DIRS:
        src = ROOT / d
        if not src.exists():
            continue
        shutil.copytree(src, SITE / d, dirs_exist_ok=True,
                        ignore=shutil.ignore_patterns(".DS_Store"))

    shutil.copy2(ETHERS_SRC, SITE / "vendor" / "ethers.umd.min.js")

    # 本地噪点纹理（替掉含 http:// 命名空间的 SVG data URI）
    noise = Image.new("RGB", (160, 160))
    noise.putdata([(lambda v: (v, v, v))(int((i * 73 + i // 160 * 131) % 256))
                   for i in range(160 * 160)])
    noise.save(SITE / "noise.png")

    for p in SITE.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix.lower() == ".html":
            p.write_text(transform_html(p.read_text(encoding="utf-8"), p), encoding="utf-8")
        elif p.suffix.lower() in (".js", ".css"):
            p.write_text(transform_js(p.read_text(encoding="utf-8")), encoding="utf-8")

    files = []
    for p in sorted(SITE.rglob("*")):
        if not p.is_file():
            continue
        data = p.read_bytes()
        rel = p.relative_to(SITE).as_posix()
        if len(data) > CHUNK * 350:
            raise SystemExit(f"文件超过 8.4MB，需拆分：{rel}")
        chunks = [base64.b64encode(data[i:i + CHUNK]).decode("ascii")
                  for i in range(0, len(data), CHUNK)] or [""]
        files.append({
            "path": rel,
            "contentType": MIME.get(p.suffix.lower(), "application/octet-stream"),
            "sha256": "0x" + hashlib.sha256(data).hexdigest(),
            "size": len(data),
            "chunks": chunks,
        })

    manifest = {
        "generator": "tools/build_deweb.py",
        "siteStore": "0xd006ffdd5Ae313B17729621A00999cD3C71CE5e6",
        "domainBinding": "0x861EE183de2BBE4a6ecf9D15812C123b566a3DB7",
        "containerOpener": "0x021745DE2f42A7839d96f2d3634d0294487D81F1",
        "chunkMax": CHUNK,
        "fileCount": len(files),
        "totalBytes": sum(f["size"] for f in files),
        "files": files,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"DeWEB 构建完成：{len(files)} 文件 / {manifest['totalBytes'] / 1e6:.2f} MB")
    print("目录：", SITE)
    print("清单：", OUT / "manifest.json")


if __name__ == "__main__":
    build()
