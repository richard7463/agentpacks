#!/usr/bin/env python3
"""把产品实录 + 卡灵立绘合成 60–90 秒提交视频（无需 AI 生图额度）。

用法：
    python3 tools/make_demo.py
产出：
    demo/kaling-demo-90s.mp4  (1280x720, H.264)

中文标题用 PIL 预渲染（本机 ffmpeg 未编入 drawtext），再交给 ffmpeg 做 Ken Burns。
"""
import pathlib
import subprocess

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEMO = ROOT / "demo"
FONT = "/System/Library/Fonts/STHeiti Medium.ttc"
PRODUCT = DEMO / "kaling-walkthrough.mp4"
OUT = DEMO / "kaling-demo-90s.mp4"
W, H, FPS = 1280, 720, 30


def run(args):
    r = subprocess.run(args, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if r.returncode:
        raise RuntimeError(r.stderr.decode("utf-8", "replace")[-1500:])


def titled_png(img: pathlib.Path, texts: list[tuple[str, int, str]]) -> pathlib.Path:
    """把立绘铺成 2560x1440 并写上中文标题（画面随后缩放一半到 1280x720）。"""
    src = Image.open(img).convert("RGB")
    ratio = max(2560 / src.width, 1440 / src.height)
    src = src.resize((int(src.width * ratio), int(src.height * ratio)), Image.LANCZOS)
    left = (src.width - 2560) // 2
    top = (src.height - 1440) // 2
    canvas = src.crop((left, top, left + 2560, top + 1440))
    shade = Image.new("RGBA", canvas.size, (8, 6, 24, 120))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shade).convert("RGB")

    d = ImageDraw.Draw(canvas)
    for i, (text, size, color) in enumerate(texts):
        font = ImageFont.truetype(FONT, size * 2)
        bb = d.textbbox((0, 0), text, font=font)
        x = (2560 - (bb[2] - bb[0])) / 2
        y = 420 if i == 0 else 660 + (i - 1) * 140
        d.text((x, y), text, font=font, fill=color, stroke_width=3, stroke_fill=(0, 0, 0))
    out = DEMO / f"_still_{img.stem}.png"
    canvas.save(out)
    return out


def still(img: pathlib.Path, seconds: int, texts: list[tuple[str, int, str]]) -> pathlib.Path:
    still_png = titled_png(img, texts)
    out = DEMO / f"_seg_{img.stem}_{seconds}.mp4"
    run([
        "ffmpeg", "-y", "-loop", "1", "-i", str(still_png), "-t", str(seconds),
        "-vf", "zoompan=z='min(zoom+0.0007,1.14)':d=1:"
               f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS}",
        "-r", str(FPS), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", str(out),
    ])
    still_png.unlink(missing_ok=True)
    return out


def main():
    DEMO.mkdir(exist_ok=True)
    if not PRODUCT.exists():
        raise SystemExit(f"缺少产品实录：{PRODUCT}（先跑 tools/record_demo.py）")

    segs = [
        still(ROOT / "heroes" / "t9.jpg", 9, [
            ("卡 灵 战 争", 86, "#F2C14E"),
            ("你抽到的不是英雄，是一条规则", 34, "#F2EFFF"),
        ]),
        still(ROOT / "heroes" / "t2.jpg", 7, [
            ("12 条 NAND 电路", 58, "#6CF2D6"),
            ("4 → 189 门 · 全输入穷举验证 · 任何人可 eval()", 28, "#F2EFFF"),
        ]),
        PRODUCT,
        still(ROOT / "heroes" / "t0.jpg", 9, [
            ("agentid.cards", 72, "#F2C14E"),
            ("第 0 战季开放 · 卡真的能挡住钱", 32, "#F2EFFF"),
        ]),
    ]

    listfile = DEMO / "_concat.txt"
    listfile.write_text("".join(f"file '{p}'\n" for p in segs), encoding="utf-8")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listfile),
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22",
         "-movflags", "+faststart", str(OUT)])
    for p in segs:
        if p != PRODUCT:
            p.unlink(missing_ok=True)
    listfile.unlink(missing_ok=True)
    print("合成完成：", OUT)


if __name__ == "__main__":
    main()
