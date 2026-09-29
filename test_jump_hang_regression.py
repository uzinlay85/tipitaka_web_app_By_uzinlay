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
check("jump panel avoids feed layout reads", "const r = triggerEl.getBoundingClientRect()" not in JS and
      "const maxTop = Math.max(8, window.innerHeight - estH - 8)" in JS and
      "Math.min(96, maxTop)" in JS)
check("jump slider uses custom div", 'id="jumpCSlider"' in HTML and 'type="range"' not in HTML)
check("jump panel is absolute, not sticky", ".jump-sheet {" in CSS and
      "position: absolute;" in CSS[CSS.index(".jump-sheet {"):CSS.index(".jump-sheet[hidden]")] and
      "position: sticky" not in CSS[CSS.index(".jump-sheet {"):CSS.index(".jump-sheet[hidden")] )
check("cache-busting version is current", 'app.js?v=7.27' in HTML)
