# Layered Redesign (အလွှာလိုက်) — Implementation Plan

**Date:** 2026-10-08
**Status:** Prototype building (`layered-redesign-prototype` artifact); awaiting user review
**User decisions:**
- Direction 2: အလွှာလိုက် (3 layers: ဖတ် → ရှာ → စီမံ)
- [စာမှတ်] stays in reader (one-tap bookmark)
- [ရှာရန်] removed from reader → use စာရှာရန် tab
- Reader toolbar: [ကျမ်းရွေး] [စာမှတ်] (2 buttons only)
- Bottom nav 6-tab order unchanged: Home | စာဖတ် | မှတ်တမ်း | စာရှာရန် | အဘိဓာန် | အခြား

## Design Rule
**ရောက်နေတဲ့ အခန်းမှာ အဲဒီအခန်းရဲ့ အလုပ်ပဲ မြင်ရမယ်။**
Each tab is a separate "room". No cross-layer controls visible.

| Layer | Tabs | Room purpose |
|-------|------|--------------|
| ဖတ် (Read) | စာဖတ် | Text only + minimal reading controls |
| ရှာ (Find) | Home, စာရှာရန်, အဘိဓာန် | Find/browse/lookup only |
| စီမံ (Manage) | မှတ်တမ်း, အခြား | Your stuff + settings only |

## Changes by Screen

### 1. စာဖတ် (READ layer)
**Current:** Toolbar has [ကျမ်းရွေး] [ရှာရန်] [စာမှတ်] [အခြား] (4 buttons)
**New:** Toolbar has [ကျမ်းရွေး] [စာမှတ်] (2 buttons)

Files:
- `templates/index.html` lines 1200-1209: remove `#btnReaderSearch` button
- `templates/index.html` lines 1221-1230: remove `#btnReaderMore` button
- `static/app.js` line 7530-7531: remove/guard `btnReaderMore` click listener
- `static/app.js` line 394, 405: `btnReaderMore`, `readerMoreSheet` element refs (keep null-safe or remove)
- `static/app.css`: adjust `.mobile-reader-toolbar` layout for 2 items (currently `justify-content: space-around` — works fine with 2)

**Functions moving out:**
- [ရှာရန်] (in-book search) → user goes to စာရှာရန် tab
- [အခြား] sheet (font size, background, notes, footnote toggle) → user goes to အခြား tab
- Note: `readerMoreSheet` HTML (line 1298) can stay hidden OR be removed. Recommend: remove to reduce DOM clutter, since all functions exist in အခြား tab.

**Trade-off noted:** Font-size adjustment while reading now requires leaving the reader. Acceptable per layered philosophy (set once, not constantly). If user complains later, consider a swipe gesture.

### 2. Home (FIND layer)
**Current:** Header (title + mode toggle + search btn), basket tabs, catalog, floating Sutta button
**New:** Clean library — "ဆက်ဖတ်ရန်" card + book list only

Changes:
- Remove `#homeBtnSearch` (line 398) — duplicates စာရှာရန် tab
- Remove `#btnFloatingSutta` (floating Sutta button) — duplicates စာရှာရန် tab
- Keep: title, mode toggle (ပါဠိ/မြန်မာပြန် — this is a browse preference, part of FIND), basket tabs, catalog
- Add: "ဆက်ဖတ်ရန်" (Continue Reading) card at top showing last-read book/page → tap goes to reader

### 3. စာရှာရန် (FIND layer)
**Current:** (need to audit — likely already focused)
**New:** No changes expected except removing any non-search controls if found.

### 4. အဘိဓာန် (FIND layer)
**Current:** (need to audit)
**New:** Dictionary lookup only. Remove any non-dictionary controls if found.

### 5. မှတ်တမ်း (MANAGE layer)
**Current:** (need to audit)
**New:** Bookmarks + History only. This becomes the ONLY place for bookmark management (reader only has one-tap add).

### 6. အခြား (MANAGE layer)
**Current:** (need to audit)
**New:** THE single settings hub. Must contain everything removed from other tabs:
- Font size, reading background (from reader's အခြား sheet)
- Page notes toggle, footnote toggle (from reader's အခြား sheet)
- User Guide, About, App Update check
- Any other settings currently scattered

## Implementation Order
1. Reader toolbar (2 buttons) — highest impact, user explicitly decided
2. အခြား tab audit — ensure it has all displaced settings BEFORE removing them from reader
3. Home simplification — remove duplicate search entry points, add Continue Reading
4. Audit remaining tabs (စာရှာရန်, အဘိဓာန်, မှတ်တမ်း) — remove cross-layer controls
5. Version bump + test + merge

## Testing Checklist
- [ ] Reader shows only [ကျမ်းရွေး] [စာမှတ်] on mobile
- [ ] [ကျမ်းရွေး] opens edition switcher correctly
- [ ] [စာမှတ်] toggles bookmark with feedback
- [ ] All removed functions accessible via their home tabs
- [ ] Desktop unaffected (or decide desktop scope separately)
- [ ] `node --check static/app.js` passes
- [ ] No dead button references (null-safe element lookups)

## Open Questions for User
- Desktop: apply layered design to desktop too, or mobile-only? (Recommend: mobile-first, desktop later)
- [စာမှတ်] in reader: just toggle, or also show quick access to bookmark list? (Recommend: just toggle; list lives in မှတ်တမ်း)
- **Copy page** (စာမျက်နှာ ကော်ပီ): the ReaderMoreSheet is the ONLY place that triggers it (`copyCurrentPageText()`, app.js:2363, called only at app.js:7600). If the sheet is removed: move it somewhere (recommend: အခြား drawer, next to other settings) or drop it?

## Mobile Tab Audit (2026-10-08 — done while user was out)

Verified in the actual code. Bottom-nav tabs are **overlays, not screens** — this is why tabs felt "mixed":

| Bottom nav | What it actually opens | Layer verdict |
|---|---|---|
| Home | home view (`setAppView("home")`) | Needs cleanup (finding 4) |
| စာဖတ် | reader view | Toolbar 4→2 buttons (plan refs verified ✓) |
| မှတ်တမ်း | History modal (reading + search history, filter pills) | ✓ Pure — no changes |
| စာရှာရန် | Search modal (Pali/MM scope + mode tabs) | ✓ Pure — no changes |
| အဘိဓာန် | Dict sidebar | ✓ Pure — no changes |
| အခြား | In reader: ReaderMoreSheet / Elsewhere: drawer (`toggleSidebar`) | Inconsistent — finding 6 |

**Findings:**

1. **Plan refs all verified** — reader toolbar buttons at index.html:1200/1221, sheet at index.html:1298, handlers at app.js:7506-7535, Home `homeBtnSearch` at index.html:398 + `btnFloatingSutta` at index.html:423, handlers at app.js:7239-7244. Also update the HTML comment at index.html:1196 ("Option A: 4 Actions").

2. **Sheet removal is safe for settings** — font size, theme, notes toggle already exist in the mobile drawer quick-controls (index.html:231-249: `btnFontDecMobile/IncMobile`, theme-switcher, `btnToggleNotesMobile`). Only the sheet goes; no settings are lost.

3. **TOC/Dict/Home reachable without the sheet** — breadcrumb tap opens the drawer TOC tab (app.js:6946-6954); dict via အဘိဓာန် nav; Home via Home nav. Only **copy-page** is orphaned (see Open Questions).

4. **Home cleanup (FIND layer)** — remove `homeBtnSearch` (index.html:398, duplicates စာရှာရန် tab) and `btnFloatingSutta` (index.html:423, duplicates the modal's သုတ္တန် tab); keep brand + mode toggle + basket tabs + catalog. Add "ဆက်ဖတ်ရန်" Continue Reading card (new work; recent-read state exists — `loadRecentOrFirst`).

5. **အခြား drawer: recommend keeping the drawer tabs as-is** — the drawer holds READ controls (edition switcher, companion picker, scroll mode, focus mode), FIND tabs (books tree, suttas), READ-nav (TOC tab), and MANAGE (bookmarks, annotations, settings quick-controls, user guide, history shortcut). But each drawer tab is already one job with a consistent pattern, so moving book-browse out is a separate, bigger change — out of scope for this round. The layered rule is satisfied at the bottom-nav level (အခြား = drawer, always).

6. **Proposed: `btnNavMore` always opens the drawer** (app.js:7299-7306) — in reader it currently opens the ReaderMoreSheet; with the sheet gone, always `toggleSidebar()`. Makes အခြား consistent everywhere.
