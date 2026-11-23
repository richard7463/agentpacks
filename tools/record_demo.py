#!/usr/bin/env python3
"""卡灵战争 · 产品实录录制器

用法：
    python3 tools/record_demo.py [--url https://agentid.cards] [--out demo]

产出：
    demo/<timestamp>.webm   —— 1280×720 无声实录（可直接进剪辑软件配音/配乐）

录制内容（一条完整用户旅程）：
    落地页 → 免费开一包 → 撕包 → 名人卡翻面 → 晒到 X 面板
    → 实验室 · 电路剧场 → 复算一笔支付 → 世界观页滚动
"""
import argparse
import pathlib
import time

from playwright.sync_api import sync_playwright


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="https://agentid.cards")
    ap.add_argument("--out", default="demo")
    args = ap.parse_args()

    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(
            viewport={"width": 1280, "height": 720},
            record_video_dir=str(out),
            record_video_size={"width": 1280, "height": 720},
        )
        page = ctx.new_page()
        page.goto(args.url, wait_until="networkidle", timeout=90000)
        page.wait_for_timeout(2500)

        # 1 · 落地页
        page.mouse.wheel(0, 420)
        page.wait_for_timeout(1800)
        page.mouse.wheel(0, -420)
        page.wait_for_timeout(1200)

        # 2 · 免费开一包
        page.click("#bLandOpen")
        page.wait_for_timeout(2200)
        # 3 · 撕包
        if page.locator("#bOpenIt").is_visible():
            page.click("#bOpenIt")
        page.wait_for_timeout(2600)
        # 4 · 全部翻开
        if page.locator("#bAll").is_visible():
            page.click("#bAll")
        page.wait_for_timeout(2800)
        # 5 · 晒到 X 面板（不真的发）
        if page.locator("#bShareX").is_visible():
            page.click("#bShareX")
            page.wait_for_timeout(2600)
        # 关闭
        if page.locator("#bClose").is_visible():
            page.click("#bClose")
        page.wait_for_timeout(1200)

        # 6 · 实验室
        page.click('button.tab[data-v="gate"]')
        page.wait_for_timeout(2000)
        page.mouse.wheel(0, 500)
        page.wait_for_timeout(2200)

        # 7 · 复算
        if page.locator("#rcAmt").is_visible():
            page.fill("#rcAmt", "12")
            page.fill("#rcSpent", "0")
            page.wait_for_timeout(600)
            page.click("#bRuleCheck")
            page.wait_for_timeout(2400)

        # 8 · 世界观
        page.goto(args.url.rstrip("/") + "/story.html", wait_until="networkidle", timeout=90000)
        page.wait_for_timeout(2200)
        page.mouse.wheel(0, 900)
        page.wait_for_timeout(2400)
        page.mouse.wheel(0, 1400)
        page.wait_for_timeout(2400)
        page.mouse.wheel(0, 1600)
        page.wait_for_timeout(2000)

        video = page.video
        page.close()
        ctx.close()
        path = video.path() if video else None
        print("录好了：", path)
        browser.close()


if __name__ == "__main__":
    main()
