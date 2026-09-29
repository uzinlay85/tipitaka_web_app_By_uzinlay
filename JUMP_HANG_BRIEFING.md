# Page Jump Pill Hang — Full Diagnostic Briefing (2026-09-29)

## Problem Statement
Tapping the page jump pill (`#btnOpenJumpSheet` footer pill "စာမျက်နှာ X / Y", or `.divider-badge` "📖 • စာမျက်နှာ X") causes the browser to hang with "Page Unresponsive" dialog. Repro path: tap pill → panel opens (sometimes) → close/scroll → tap another pill → **HANG**. All controls freeze including DevTools console.

- Repo: `~/workspace/tipitaka_web_app` → GitHub `uzinlay85/tipitaka_web_app_By_uzinlay`
- Live: `https://tipi.upanna.top/` (VPS deploy: `cd /opt/tipitaka && git pull origin main && sudo systemctl restart tipitaka`)
- Browser: Brave (Chromium) on user's phone = real test env. Desktop Brave also reproduces.
- Remote HEAD: `166e1c3` (app.js v7.8, app.css v7.2). **User has NOT yet deployed v7.8** (last confirmed on v7.7).

## Bisection History — Ruled OUT
| Version | Change | Result |
|---|---|---|
| v6.19 | `pruneFeedDOM()` before sheet open | Hang persisted → DOM size NOT the cause |
| v6.20 | Skip `updateCurrentViewPage()` while sheet open | Hang persisted → observer loop NOT the cause |
| v6.21 | Disable TOC tick rendering | Hang persisted → ticks NOT the cause |
| v6.22 | Disable sheet open animation | Hang persisted → animation NOT the cause |
| v7.0 | Rewrite: fixed overlay → inline panel | Hang persisted |
| v7.1 | No DOM move, no scrollIntoView | Hang persisted |
| v7.2 | `openJumpSheet` completely empty | **Hang persisted** → proved hang is NOT inside openJumpSheet body |
| v7.3 | Disabled document-level badge handlers | **Hang GONE** → document handlers were a cause |

## Root Causes FOUND (3)

### Cause ① — Document-level `pointerdown`/`click` handlers (FIXED in v7.4)
```javascript
// ❌ BEFORE (hung):
document.addEventListener("pointerdown", (e) => {
    _badgeDownPos = e.target.closest(".divider-badge") ? [e.clientX, e.clientY] : null;
});
document.addEventListener("click", (e) => {
    const badge = e.target.closest(".divider-badge");
    ...
});

// ✅ AFTER (v7.4, no hang):
if (el.readerContainer) el.readerContainer.addEventListener("click", (e) => {
    const badge = e.target.closest ? e.target.closest(".divider-badge") : null;
    if (!badge) return;
    openJumpSheet(badge);
});
```
Calling `e.target.closest()` on **every** `pointerdown` at `document` level hangs Chromium/Brave. Delegating on `#readerContainer` (smaller subtree) + removing `pointerdown` entirely fixed it.

### Cause ② — `insertBefore` moving the panel in DOM (CONFIRMED by v7.6)
```javascript
// ❌ This HANGS (v7.6 reintroduced it → hang returned immediately):
triggerEl.parentNode.insertBefore(el.jumpSheet, triggerEl.nextSibling);
```
The panel contains a range input with custom `::-webkit-slider-thumb` / `::-webkit-slider-runnable-track`. Reparenting the node in the DOM hangs the renderer. **Never move `#jumpSheet` in the DOM.**

### Cause ③ — `position: sticky` layout loop (FOUND in v7.7)
```css
/* ❌ HANGS: unhiding changes body height → sticky recalc → scroll shift → loop */
.jump-sheet { position: sticky; bottom: 8px; }
```

## Current State — v7.8 (commit 166e1c3, NOT yet deployed by user)
```css
/* app.css v7.2 */
.jump-sheet {
    display: block;
    margin: 0;
    position: fixed;
    left: 12px; right: 12px; bottom: 8px;
    z-index: 50;
}
.jump-sheet[hidden] { display: none; }
```
```javascript
// app.js v7.8 — openJumpSheet: NO insertBefore, NO scrollIntoView, just unhide
function openJumpSheet(triggerEl) {
    _trackAction("openJumpSheet");
    if (!el.jumpSheet) return;
    if (!el.jumpSheet.hidden && _jumpAnchor === triggerEl) { closeJumpSheet(); return; }
    const isMM = _jumpIsMM();
    _jumpFirst = isMM ? (state.mmFirstPage || 1) : (state.paliFirstPage || 1);
    _jumpLast = isMM ? (state.mmLastPage || 1) : (state.paliLastPage || 1);
    const cur = isMM ? (state.mmPage || _jumpFirst) : (state.paliPage || _jumpFirst);
    el.jumpSlider.min = _jumpFirst;
    el.jumpSlider.max = _jumpLast;
    el.jumpSlider.value = cur;
    el.jumpMinLabel.textContent = toMyanmarNum(_jumpFirst);
    el.jumpMaxLabel.textContent = toMyanmarNum(_jumpLast);
    el.jumpCurLabel.textContent = `စာ-${toMyanmarNum(cur)} / ${toMyanmarNum(_jumpLast)}`;
    el.jumpPageInput.value = "";
    el.jumpPageInput.placeholder = `စာမျက်နှာနံပါတ် (${toMyanmarNum(_jumpFirst)}–${toMyanmarNum(_jumpLast)})`;
    _jumpUpdateBubble(cur);
    _jumpAnchor = triggerEl || null;
    _jumpRenderTicks(isMM ? state.mmTocs : state.paliTocs);  // capped at 120
    el.jumpSheet.hidden = false;
}
```
Footer pill has direct listener (not delegated):
```javascript
if (el.btnOpenJumpSheet) el.btnOpenJumpSheet.addEventListener("click", (e) => {
    e.stopPropagation();
    openJumpSheet(el.btnOpenJumpSheet);
});
```

## Key Constraints for Any Fix
1. **NEVER** `insertBefore`/`appendChild`/`after()` the `#jumpSheet` element (Cause ②).
2. **NEVER** `document.addEventListener("pointerdown", ...)` with `closest()` (Cause ①).
3. **NEVER** `position: sticky` on the panel (Cause ③).
4. `position: fixed` was the ORIGINAL design (pre-v7.0) and hung — but that was WITH the document handlers active. v7.8 uses fixed WITHOUT document handlers; untested by user.
5. `scrollIntoView({behavior:"smooth"})` is suspected; use `behavior:"auto"` or avoid.
6. Myanmar numerals: display uses `toMyanmarNum()`; internal logic uses plain numbers. No NaN loops exist.
7. Ticks are capped at 120 and proven innocent.

## Open Questions for Discussion
- If v7.8 (fixed, no backdrop) still hangs → fixed positioning itself is the problem → try: panel permanently in HTML flow near footer (never moved), no scroll.
- If v7.8 works → clean up: remove dead code, restore drag-guard if desired (without pointerdown).
- The `_jumpRenderTicks` innerHTML with 120 spans: proven innocent but could be lazier.
- Consider: does the hang require the panel to CONTAIN the range input? Would a simpler panel (no slider) hang?
