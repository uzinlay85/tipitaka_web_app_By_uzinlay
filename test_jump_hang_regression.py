"""Static regression checks for the inline page-jump redesign (v7.39+) and the
v7.42 badge-tap restoration.

The jump sheet overlay (dialog/div), custom slider, and tick strip are gone.
The footer pill toggles an inline input row in normal flow; divider badge taps
open a disposable inline row right below the badge (no overlay, no dialog).
These checks intentionally avoid importing Flask or requiring the production DB.
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


# --- Unchanged hardening from earlier versions ---
check("no document-level pointerdown handler", 'document.addEventListener("pointerdown"' not in JS)
check("annotation delegation is reader-local", "el.readerContainer.addEventListener(\"click\"" in JS)
check("dropdown outside checks use contains", "el.scrollModeDropdownWrapper.contains(e.target)" in JS and
      "el.relatedDropdownWrapper.contains(e.target)" in JS)
check("footer pill prevents text selection", "user-select: none" in CSS and ".footer-page-info.jump-trigger" in CSS)
check("footer-nav selection hardening kept", ".reader-footer-nav" in CSS and "-webkit-touch-callout: none" in CSS)
check("pill blocks long-press menu", 'addEventListener("contextmenu"' in JS)
check("pill clears selection on touchstart", 'addEventListener("touchstart"' in JS and "{ passive: true }" in JS)

# --- v7.39: the jump sheet is fully gone ---
check("no jumpSheet element in HTML", 'id="jumpSheet"' not in HTML)
check("no jumpSheet references in JS", "jumpSheet" not in JS)
check("no jumpSheet styles in CSS", "jump-sheet" not in CSS)
check("no dialog API anywhere", "showModal()" not in JS and "<dialog" not in HTML)
check("no slider code remains", "jumpCSlider" not in JS and "jumpCSlider" not in HTML and
      "_csliderSet" not in JS and 'type="range"' not in HTML)
check("no tick-strip code remains", "jumpTicks" not in JS and "_jumpRenderTicks" not in JS)

# --- v7.39: inline jump row replaces it ---
check("inline jump row exists in HTML", 'id="jumpInlineRow"' in HTML and
      'id="jumpInlineInput"' in HTML and
      'id="btnJumpInlineGo"' in HTML and
      'id="btnJumpInlineClose"' in HTML)
check("inline row hidden by default", 'id="jumpInlineRow" hidden' in HTML)
check("inline row styled in CSS", ".jump-inline-row" in CSS and ".jump-inline-input" in CSS)
check("inline input stays editable", "user-select: text" in CSS)
check("inline row is not an overlay", ".jump-inline-row" in CSS and
      "position: fixed" not in CSS.split(".jump-inline-row")[1].split("}")[0])
check("toggle + submit wired in JS", "function setupInlineJump" in JS and
      "function _jumpInlineToggle" in JS and
      "function _jumpInlineSubmit" in JS and
      "setupInlineJump();" in JS)
check("navigation core kept", "function _jumpGo(page)" in JS and
      "loadMMPage(state.mmBookId, page)" in JS and
      "loadPaliPage(state.paliBookId, page)" in JS)

# --- v7.42: divider badges open a disposable inline row (no overlay) ---
check("badge tap opens inline badge row", 'closest(".divider-badge")' in JS and
      "function _jumpBadgeToggle" in JS and 'id="jumpBadgeRow"' not in HTML)
check("badge row is inline, not an overlay", "jumpBadgeRow" in JS and
      "showModal()" not in JS)
check("badges are tappable again", ".divider-badge" in CSS and
      "pointer-events: auto" in CSS)
check("badge row cleaned on prune", 'getElementById("jumpBadgeRow")' in JS)

# --- v7.43: badge-row lifecycle hardening ---
check("badge row survives unrelated prunes", "toRemove.includes(anchor)" in JS)
check("footer pill dismisses badge row", 'getElementById("jumpBadgeRow")' in JS and
      "function _jumpInlineToggle" in JS)
check("dictionary ignores badge taps", 'closest(".divider-badge")' in JS and
      "badge taps open the inline jump row" in JS)

# --- versions ---
check("cache-busting version is current", 'app.js?v=' in HTML and 'app.css?v=' in HTML)

print("ALL PASS")
