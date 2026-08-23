#!/usr/bin/env python3
"""Record the BrokerDesk Flutter web demo tour to MP4."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8099"
OUT_DIR = Path(sys.argv[2] if len(sys.argv) > 2 else "/home/linuxbox/src/brokerdesk/demo")
OUT_DIR.mkdir(parents=True, exist_ok=True)
RAW = OUT_DIR / "raw"
RAW.mkdir(exist_ok=True)


async def main() -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            record_video_dir=str(RAW),
            record_video_size={"width": 1440, "height": 900},
            device_scale_factor=1,
        )
        page = await context.new_page()
        await page.goto(URL, wait_until="domcontentloaded")
        await page.wait_for_selector("flutter-view, flt-glass-pane, flt-semantics-host", timeout=60000)
        # Login auto-submits, then 6 pages × 2.6s plus settle.
        await page.wait_for_timeout(26000)
        video = page.video
        await context.close()
        await browser.close()
        if video is None:
            raise SystemExit("playwright did not produce a video")
        src = Path(await video.path())
        dest = OUT_DIR / "brokerdesk-demo.webm"
        dest.write_bytes(src.read_bytes())
        print(dest)


if __name__ == "__main__":
    asyncio.run(main())
