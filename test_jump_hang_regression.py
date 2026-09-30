"""Static regression checks for the page jump sheet hang fix.

These checks intentionally avoid importing Flask or requiring the production DB.
The bug is caused by event delegation and layout choices in the browser client.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
JS = (ROOT / "static/app.js").read_text(encoding="utf-8")
CSS = (ROOT / "static/app.css").read_text(encoding="utf-8")
HTML = (ROOT / "templates/index.html").read_text(encoding="utf-8")


def check(name, condition):
    if not condition:
        raise AssertionError(name)
    print(f"PASS {name}")


check("no document-level pointerdown handler", 'document.addEventListener("pointerdown"' not in JS)
check("annotation delegation is reader-local", "el.readerContainer.addEventListener(\"click\"" in JS)
check("dropdown outside checks use contains", "el.scrollModeDropdownWrapper.contains(e.target)" in JS and
      "el.relatedDropdownWrapper.contains(e.target)" in JS)
check("jump badge delegation is reader-local", "e.target.closest(\".divider-badge\")" in JS and
      "e.stopPropagation();" in JS)
check("jump panel is never reparented", "insertBefore(el.jumpSheet" not in JS and "appendChild(el.jumpSheet" not in JS)
check("jump panel avoids feed layout reads", "triggerEl.getBoundingClientRect()" not in JS and
      "el.jumpSheet.style.top" not in JS and
      "showModal()" not in JS and
      'id="jumpSheet"' in HTML)
check("jump slider uses custom div", 'id="jumpCSlider"' in HTML and 'type="range"' not in HTML)
check("jump panel is div overlay (not dialog)", '<div id="jumpSheet"' in HTML and '<dialog id="jumpSheet"' not in HTML)
check("jump panel has no manual positioning", "el.jumpSheet.style.top" not in JS)
check("cache-busting version is current", 'app.js?v=7.38' in HTML and 'app.css?v=7.9' in HTML)
check("feed loader skips while jump panel open", "if (el.jumpSheet && !el.jumpSheet.hidden) return;" in JS)

check("footer pill prevents text selection", "user-select: none" in CSS and ".footer-page-info.jump-trigger" in CSS)
check("v7.38 footer-nav selection hardening", ".reader-footer-nav" in CSS and "-webkit-touch-callout: none" in CSS)
check("v7.38 pill blocks long-press menu", 'addEventListener("contextmenu"' in JS)
check("v7.38 pill clears selection on touchstart", 'addEventListener("touchstart"' in JS and "{ passive: true }" in JS)
check("v7.38 sheet contains overscroll", "overscroll-behavior: contain" in CSS)
