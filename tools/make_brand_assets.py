#!/usr/bin/env python3
"""重做品牌素材：顶部标识用的字、favicon、OG 封面（中文不豆腐块）。"""
import pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT = "/System/Library/Fonts/STHeiti Medium.ttc"
GOLD = (242, 193, 78)
PAPER = (242, 239, 255)
MIST = (156, 150, 196)
VIOLET = (183, 155, 255)


def f(size):
    return ImageFont.truetype(FONT, size)


def bg(w, h):
    im = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / h
        d.line((0, y, w, y), fill=(int(15 + t * 12), int(12 + t * 10), int(36 + t * 22)))
    # 电路纹理
    for x in range(0, w, 80):
        d.line((x, 0, x + 200, h), fill=(38, 31, 78), width=1)
        d.ellipse((x + 160, h // 2 - 3, x + 166, h // 2 + 3), fill=(80, 62, 140))
    return im


def center_at(d, text, cx, y, font, fill):
    bb = d.textbbox((0, 0), text, font=font)
    d.text((cx - (bb[2] - bb[0]) / 2, y), text, font=font, fill=fill)


def game():
    im = bg(1200, 630)
    d = ImageDraw.Draw(im)
    # logo 方块
    d.rounded_rectangle((70, 64, 162, 156), radius=14, fill=GOLD)
    d.text((89, 74), "卡", font=f(62), fill=(15, 12, 36))
    d.text((190, 78), "卡灵战争", font=f(42), fill=PAPER)
    d.text((192, 132), "AGENT PACKS · SEASON 0", font=f(20), fill=GOLD)
    # 主标题
    d.text((70, 205), "你抽到的不是英雄，", font=f(56), fill=PAPER)
    d.text((70, 278), "是一条规则。", font=f(64), fill=GOLD)
    d.text((72, 385), "12 条 NAND 电路 · 4→189 门", font=f(21), fill=MIST)
    d.text((72, 425), "全输入穷举验证 · 任何人可 eval()", font=f(21), fill=MIST)
    # 右侧卡
    d.rounded_rectangle((820, 105, 1130, 535), radius=20, outline=GOLD, width=2, fill=(20, 16, 48))
    center_at(d, "12", 975, 150, f(96), GOLD)
    center_at(d, "条链上规则", 975, 275, f(28), PAPER)
    center_at(d, "68 合约测试", 975, 355, f(20), MIST)
    center_at(d, "BNB Chain 56", 975, 405, f(19), VIOLET)
    d.text((70, 550), "agentid.cards", font=f(34), fill=(255, 138, 216))
    out = ROOT / "og/game.jpg"
    out.parent.mkdir(exist_ok=True)
    im.save(out, quality=92)
    print(out)


def story():
    im = bg(1200, 630)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((70, 64, 162, 156), radius=14, fill=GOLD)
    d.text((89, 74), "卡", font=f(62), fill=(15, 12, 36))
    d.text((190, 78), "卡灵战争 · 世界观", font=f(38), fill=PAPER)
    d.text((192, 132), "THE WORLD OF KALING WAR", font=f(19), fill=GOLD)
    d.text((70, 215), "深夜的金库", font=f(70), fill=GOLD)
    d.text((70, 315), "有人把规则刻进 NAND 电路，", font=f(40), fill=PAPER)
    d.text((70, 375), "规则长成了人形。", font=f(46), fill=PAPER)
    d.text((72, 475), "十二卡灵 · 四大家族 · 第 0 战季", font=f(25), fill=MIST)
    d.text((70, 550), "agentid.cards/story.html", font=f(30), fill=(255, 138, 216))
    out = ROOT / "og/story.jpg"
    im.save(out, quality=92)
    print(out)


def favicon():
    for size, name in [(64, "favicon.ico"), (32, "favicon-32.png"), (180, "apple-touch-icon.png")]:
        im = Image.new("RGBA", (size, size), (15, 12, 36, 255))
        d = ImageDraw.Draw(im)
        pad = max(1, size // 16)
        d.ellipse((pad, pad, size - pad, size - pad), outline=GOLD + (255,), width=max(1, size // 24))
        fnt = f(int(size * 0.52))
        bb = d.textbbox((0, 0), "卡", font=fnt)
        d.text(((size - (bb[2] - bb[0])) / 2 - bb[0], (size - (bb[3] - bb[1])) / 2 - bb[1]),
               "卡", font=fnt, fill=GOLD + (255,))
        if size == 64:
            im.save(ROOT / name, sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
        else:
            im.save(ROOT / name)
        print(ROOT / name)


if __name__ == "__main__":
    game()
    story()
    favicon()
