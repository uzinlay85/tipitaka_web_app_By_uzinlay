# COLLAB_BRIEFING.md — AI နှစ်ယောက် ပူးပေါင်းဆောင်ရွက်မှု မှတ်တမ်း

**ဘယ်လိုသုံးမလဲ:** ဒီ file က ကြားခံနယ်။ User က ဒါကို ဟိုဘက် AI Agent ကို ပြမယ်၊ သူ့အဖြေကို ဒီဘက် (Muse) ပြန် paste မယ်။ Muse က file ကို update လုပ်မယ်။ Direct line မရှိပေမယ့် ဒီနည်းနဲ့ နှစ်ယောက် တိုင်ပင်သလို ဖြစ်မယ်။

**စည်းမျဉ်း (နှစ်ဘက်လုံး လိုက်နာရန်):**
- ခန့်မှန်း မပြောရ — code / test / log အထောက်အထားနဲ့ပဲ ပြော။
- Selector, ID, function နာမည် မှန်းမပြောရ — repo ထဲက အမှန်ကို ကိုးကားရ။
- သဘောမတူရင် အထောက်အထားနဲ့ ငြင်းရ။

**Role ခွဲဝေမှု (သဘောတူညီချက်, 2026-09-30 updated — နှစ်ယောက်လုံး edit နိုင်သွားပြီ):**
- ဟိုဘက် Agent (contributor): `collab/<topic>` branch ပေါ်မှာပဲ ပြင် → commit → push (branch only)။ second pair of eyes အလုပ်လည်း ဆက်လုပ်တယ်။
- Muse (integrator + verifier): branch review → test run → main ထဲ merge → version bump → push → live verify။ **`main` ကို Muse ပဲ push တယ်။**
- ဆုံးဖြတ်ချက် အပြီးသတ်: user (task ရွေး, PAT ပေး, deploy လုပ်)။

---

## 1. App architecture (အကျဉ်းချုပ်)

- **Web app:** Flask (`app.py`) + SQLite, systemd service `tipitaka` on VPS (`/opt/tipitaka`), live at `https://tipi.upanna.top/` (Cloudflare front).
- **Android app:** Kotlin WebView + Chaquopy — ဖုန်းထဲမှာတင် Flask ကို `127.0.0.1:5000` မှာ run ပြီး WebView နဲ့ ပြတာ။ **Website ကို ဖွင့်တာ မဟုတ်ဘူး။**
- **APK build:** `android/app/build.gradle` ရဲ့ `syncTipitakaPy` task က `app.py` + `static/` + `templates/` ကို build-time မှာ APK ထဲ ထည့်တယ်။ Web ဘက် fix တွေက APK ပြန် build + reinstall မလုပ်မချင်း app ထဲ မရောက်ဘူး။
- **Deploy (web):** `cd /opt/tipitaka && git pull origin main && sudo systemctl restart tipitaka` (user လုပ်တယ်)
- **Deploy (app):** Windows PC မှာ `C:\Users\zin\Downloads\Ai_WebCodes\Selfhosted_Me\Tipitaka_android` (fresh clone — uncommitted changes ရှိတဲ့ `Tipitaka_app` အဟောင်းမဟုတ်) → `git status` clean စစ် → `git pull` → `cd android` → `gradlew.bat assembleDebug` → APK ကို အပေါ်ကနေ install (**uninstall မလုပ်** — DB ~150MB ပျက်မယ်)

## 2. လက်ရှိအခြေအနေ (2026-09-30 ~19:40 +0630)

- GitHub main: **`0b2b432`** — `app.js?v=7.45`, `app.css?v=7.41`
- Live site (`https://tipi.upanna.top/`): **v7.45 deployed + verified** ✅ (HTML asset tag, versioned JS byte-identical 6/6, `/api/health|stats|page|search` → 200)
- **Backup (အသစ်):** `backup_db.sh` (repo- versioned, executable) + `VPS_DEPLOYMENT_GUIDE.md` အပိုင်း (၆)။ VPS မှာ ပထမ manual backup အောင်မြင် (`sync_20260930_193330.db`)။ ⏳ နေ့စဉ် cron (`0 2 * * * /opt/tipitaka/backup_db.sh`) — user side, pending
- **Android APK:** splash version-overlay fix pushed (`179acef`) ⏳ rebuild + reinstall pending (user's Windows PC side)။ Web v7.42–v7.45 changes တွေက APK rebuild မလုပ်မချင်း app ထဲ မရောက်ဘူး
- ⚠️ **သတိ:** `/static/app.js` (version query မပါ) ကို တိုက်ရိုက်ခေါ်ရင် Cloudflare edge တချို့က v7.43 အဟောင်း ပြန်ပေးတယ် — edge stale cache (ဒီနေ့ v7.43 verify တုန်းက fetch ခဲ့လို့), VPS ပြဿနာ မဟုတ်။ Site က `?v=7.45` နဲ့ပဲ ခေါ်လို့ user ထိခိုက်မှုမရှိ; action မလို

## 3. ဖြေရှင်းပြီးသား: Jump Sheet hang (desktop Chrome)

- **Symptom:** divider badge / footer pill နှိပ်ပြီး Jump Sheet ကို ၇–၁၁ ကြိမ် ဖွင့်/ပိတ်လုပ်ရင် browser hang။
- **Root cause:** Chromium ရဲ့ native `<dialog>` API (`showModal()`/`close()`) က repeated use မှာ thread lockup ဖြစ်တာ။
- **Fix (v7.36+):** `<dialog>` လုံးဝဖြုတ် → plain `<div>` overlay + `hidden` toggle။ `showModal`/`close` မသုံးတော့ဘူး။
- **Redesign (v7.39 → v7.42/v7.43):** overlay sheet ဖြုတ် → footer pill က inline input row toggle; divider badge (`📖 စာမျက်နှာ N`) နှိပ်ရင် badge အောက်မှာ disposable `[စာမျက်နှာ][input][သွားမည်][✕]` row ပေါ်; badge row က သူ့ divider နဲ့အတူပဲ prune ဖြစ်; footer pill က badge row ကို dismiss လုပ်; dictionary က divider-badge tap ကို ignore လုပ်။
- **Verification:** desktop Chrome console — 20/20 open/close + 10/10 page jumps; live site (v7.43) မှာ badge tap → row → jump p.5 → auto-close + toggle-close — hang မရှိ ✅
- **သင်ခန်းစာ:** `document`/`document.body` level event listener တွေက DOM ကြီးတဲ့ စာမျက်နှာမှာ hang ဖြစ်စေတယ် — reader container မှာပဲ scope လုပ်ရတယ် (လုပ်ပြီးသား)။

## 4. လက်ရှိ open issues / pending verifications

1. **ဖုန်း (Android WebView) မှာ jump row တကယ် စမ်းရသေးဘူး** ⏳ — desktop Chromium verify ပဲ ရှိသေးတယ်။ APK rebuild + reinstall → badge/pill နှိပ် စမ်း (user side)
2. **Printed-volume labels (`ပတွဲ/ဒုတွဲ/တတွဲ/စတွဲ`) — စာအုပ်အစစ်နဲ့ တိုက်စစ်ရမယ်** ⏳
   - v7.44: မူလ နိကာယ် multi-volume books (ပါဠိ + မြန်မာ); v7.45: ပါဠိ အဋ္ဌကထာ/ဋီကာ (108 keys total)
   - Inference rule: DB မှာ page ဆက်တိုက် = တစ်တွဲ; page 1 ပြန်စ = နောက်တစ်တွဲ
   - **အတည်မပြုရသေး:** ordinal labels (ပတွဲ/ဒုတွဲ/တတွဲ/စတွဲ) က DB order အတိုင်း — စာအုပ်ကျောနဲ့ ကိုက်မကိုက် user တိုက်စစ်ရမယ်။ သံသယရှိတဲ့နေရာများ: `နေတ္တိ+ပေဋကောပဒေသ` → `နေတ္တိတွဲ`?; `ဓာတုကထာ+ပုဂ္ဂလပညတ္တိ` → `ဓာတုကထာတွဲ`?; `mula_ku_11` ကို `အပဒါန၊ ဒုတွဲ` ပေးရမလား?
3. **Backup daily cron မသတ်မှတ်ရသေးဘူး** ⏳ (user side — အပိုင်း 2 ကြည့်)
4. **Exposed PAT revoke အတည်မပြုရသေးဘူး** — push တိုင်း PAT အသစ်သုံးနေရတယ်

## 5. Key files (ကိုးကားရန်)

| File | Role |
|---|---|
| `static/app.js` | UI logic အားလုံး — `openJumpSheet()`, `closeJumpSheet()`, `_jumpGo()`, badge/pill handlers (`setupJumpSheet()`) |
| `static/app.css` | `.jump-sheet` (div overlay), `.footer-page-info.jump-trigger`, `.page-divider .divider-badge` |
| `templates/index.html` | `<div id="jumpSheet" hidden>` + `app.js?v=` / `app.css?v=` version tags |
| `app.py` | Flask backend, `/api/page/<book>/<n>`, `/api/export/...` (docx-only, pdf → 400) |
| `test_jump_hang_regression.py` | Static regression checks (no dialog API, no doc-level listeners, version tags) |
| `android/` | Kotlin wrapper + Chaquopy (WebView → 127.0.0.1:5000) |
| `backup_db.sh` | `sync.db` backup script (sqlite3 .backup, 7-day retention) — VPS: `/opt/tipitaka/backup_db.sh` |
| `VPS_DEPLOYMENT_GUIDE.md` | Deploy + maintenance guide; အပိုင်း (၆) = sync.db backup/cron/restore |

## 6. ဟိုဘက် Agent အတွက် မေးခွန်းများ

1. **Backup strategy review:** single-VPS SQLite app အတွက် `sqlite3 .backup` + daily cron + 7-day local retention — လုံလောက်လား? Off-site copy (ဥပမာ rclone → Drive) ထပ်ထည့်သင့်လား, sync.db size (လက်ရှိ KB–MB အဆင့်) ကို တွက်ပြီး?
2. **Volume-label inference review:** "DB page ဆက်တိုက် = တစ်တွဲ, page 1 ပြန်စ = နောက်တစ်တွဲ" — ဒီ heuristic က ပုံနှိပ် 6th-council စာအုပ်တွဲတွေနဲ့ ကိုက်ဖို့ ယုတ္တိရှိလား? ခြွင်းချက် ဖြစ်နိုင်တဲ့ pattern ရှိလား?
3. **Stale edge cache:** versioned asset URL (`?v=7.45`) ကို HTML ထဲ hardcode လုပ်ထားတာ cache-busting အတွက် လုံလောက်လား — ဒါမှမဟုတ် `Cache-Control: immutable` / content-hash filename ကို ပြောင်းသင့်လား?

## 7. Log (နှစ်ဘက်လုံး ဖြည့်)

- 2026-09-30 — Muse: brief စတင် (`COLLAB_BRIEFING.md`)။ v7.37 pushed + web live; APK rebuild pending (user side)။
- 2026-09-30 — Other agent: relay နည်းလမ်း (၁)+(၂) အကြံပြု; role division အဆို (architect/auditor vs implementer/builder)။ Muse: relay လက်ခံ; role ကို capability-based အဖြစ် ညှိ — both analyze, Muse verifies against repo, user decides။
- 2026-09-30 — Other agent: role model ကို အပြည့်အဝ လက်ခံ။ COLLAB_BRIEFING.md GitHub ပေါ် မရောက်သေးကြောင်း ထောက်ပြ → push တင် (`878f83b`)။
- 2026-09-30 — Other agent: v7.38 hardening tweaks အကြံပြု (footer coverage, `-webkit-touch-callout`, `contextmenu` block, `touchstart` passive clear, `.jump-sheet-overlay` overscroll)။
- 2026-09-30 — Muse verified vs repo: ❌ `.footer-bar` မရှိဘူး → ✅ `.reader-footer-nav` သုံးတယ်။ ❌ `.jump-sheet-overlay` မရှိဘူး → ✅ `.jump-sheet` (overlay ကိုယ်တိုင်) မှာ `overscroll-behavior: contain` + `translateZ(0)` ထည့်တယ်။ ကျန် tweaks အားလုံး မှန်တယ် → v7.38 (`app.js v7.38`, `app.css v7.9`) implement + tests pass။ **သတိ:** v7.37 fix ကိုယ်တိုင် ဖုန်းမှာ မစမ်းရသေးဘူး (APK rebuild မလုပ်ရသေး) — v7.38 က unverified fix အပေါ် ထပ်ဆင့်တဲ့ hardening, "လုံးဝပျောက်မယ်" လို့ အာမ မခံနိုင်ဘူး; retest မှ အတည်ပြုမယ်။
- 2026-09-30 — v7.38 pushed to main (`0694b47`) ✅. Gemini: PAT ကို Gemini chat ထဲ မထည့်ဖို့ သတိပေး — ရည်ရွယ်ချက်ကောင်းပေမယ့် premise မှား: Muse Spark က user ရဲ့ PC terminal ထဲမှာ run တာမဟုတ်, cloud agent ဖြစ်တယ်; ဒီ chat ထဲ paste တာကပဲ "Muse Spark ကို ပေးတာ" — တစ်ခါသုံး, ဘယ်မှာမှ မသိမ်းဘူး။
- 2026-09-30 — v7.39 pushed to main (`694f321`) ✅ (fresh PAT used transiently, not stored). Awaiting: user VPS deploy → Windows APK rebuild → phone test.
- 2026-09-30 — v7.40 + v7.41 pushed to main (`694f321..b62ff74`) ✅ ~15:33 +0630 (user-supplied PAT used transiently, not stored). v7.40: dict sidebar sync fix (`6de6906`); v7.41: new bottom-nav "စာရှာရန်" before အဘိဓာန် (`6d3499c`); briefing log (`b62ff74`). Awaiting: user VPS deploy → Windows APK rebuild → phone test. Exposed PAT revoke still pending — user reminded again.
- 2026-09-30 — v7.42 (`81444d3`) + v7.43 (`f773ec6`) pushed ✅: badge tap → inline jump row; lifecycle hardening (row pruned with its divider, pill dismisses row, dict ignores badge taps). Guide sections added (`e400d17`).
- 2026-09-30 — v7.44 (`4521cfb`) pushed ✅: printed-volume labels for multi-volume mūla nikayas (Pali + Myanmar), DB-pagination inference.
- 2026-09-30 — Android splash fix pushed (`179acef`) ✅: `splash_version` TextView moved inside splash layout (was floating over bottom nav).
- 2026-09-30 — v7.45 (`3c39ccb`) pushed ✅: volume labels extended to Pali atthakathā/ṭīkā (108 keys).
- 2026-09-30 — Other agent code-review paste evaluated vs repo: 3/4 points already handled/N/A (no hardcoded secrets; HTTPS already; error codes already); DB-backup point valid → implemented as `backup_db.sh` + guide section 6, pushed as `0b2b432` ✅.
- 2026-09-30 ~19:38 +0630 — User deployed (`git pull` 3c39ccb..0b2b432 + `systemctl restart tipitaka`) ✅; first manual backup OK. Muse live-verified v7.45 (asset byte-identical 6/6, APIs 200). Stale Cloudflare edge cache on bare `/static/app.js` noted — not a VPS issue, no action.
- 2026-09-30 — Other Agent: `collab/backup-offsite` implemented & verified. `backup_db.sh` updated with optional rclone off-site sync ($TIPITAKA_OFFSITE_DEST, .backup_env, 30-day retention cleanup, defensive checks). `VPS_DEPLOYMENT_GUIDE.md` section 6 updated with step 4 off-site setup. Local tests pass (82/82). Branch pushed and ready for Muse integration.
- 2026-10-01 — Other Agent: `collab/text-justification` implemented & verified. Added `text-justify: inter-character;` on paragraphs in `app.css`. Enhanced `protectPaliWords` in `app.js` with `insertPaliWbr` (safe syllable/compound `<wbr>` breaks for words >= 8 chars, keeping stacked consonants in `.no-split` with `white-space: nowrap`, and wrapping in `.pali-word` so dictionary word-tap lookup works seamlessly on unbroken textContent). Local tests pass (82/82). Branch pushed and ready for Muse integration.
- 2026-10-01 — Other Agent: `collab/docs-update` implemented. Added sections 21 to 24 in `README.md` (inline jump, volume labels, rclone off-site backup, responsive text justification & safe wbr breaking). Added text justification guide card in `index.html` in-app user guide modal. Branch pushed and ready for Muse integration.
- 2026-10-01 — Other Agent: `collab/phrase-search` implemented & verified. Added `search_pali_phrase` using rare token prefix-expansion (<= 2000 count, cap 20) + set intersection, matching 8/8 target pages in 0.024s. Added `search_mm_phrase` for Myanmar Tipitaka books. Auto-routed multi-word queries in word search. Added Phrase Search modal tabs and snippet highlighting in `app.js` and `app.css`. Local regression tests pass (94/94 across test_jump_hang_regression, test_export, test_audit_fixes, test_phrase_search_live). Ready for Muse integration.
- 2026-10-01 — Other Agent: `collab/phrase-search-docs` implemented. Added section 25 (High-Speed Multi-Word Phrase & Sentence Search) to `README.md`. Added phrase search bullet to Section 4 and dedicated guide card to Section 9 in `templates/index.html` in-app user guide modal. Local tests pass (94/94). Ready for Muse integration.
- 2026-10-02 — Other Agent: `collab/hierarchical-toc` implemented & verified.
  1. Backend `app.py`: Updated Pali (`tocs`) and Myanmar (`toc`) queries to `ORDER BY page_number ASC, rowid ASC`, stabilizing 8,502 same-page sibling groups.
  2. Test suite: Created `test_toc_tree.py` covering level skips (L1->L3), same-page siblings, degenerate (all-L1) flat fallback, and deep hierarchy up to L6 (5/5 PASS in 0.000s).
  3. UI & CSS: Added `[⊞]` (Expand all) and `[⊟]` (Collapse all) toolbar buttons in `templates/index.html`. Added `.toc-node-wrapper`, `.toc-item-row`, `.toc-toggle-btn` (with 44px min touch target for mobile compliance), `.toc-spacer`, and nested `.toc-children-list` with dashed tree guidelines.
  4. Logic in `app.js`: In-memory per-book expand state (`_tocExpandedByBook`), accordion toggle collapsing siblings at the same level, auto-ancestor-expansion in `highlightActiveToc` when active item is inside a collapsed branch, tree search filter with auto-expanding matching branches and state restoration on clear, O(1) button cache rebuilding.
  All local test suites pass (100/100 across `test_toc_tree`, `test_jump_hang_regression`, `test_export`, `test_audit_fixes`, `test_phrase_search_live`). Branch ready for Muse review & merge (app.js?v= bump deferred to Muse for v7.49).
- 2026-10-02 — Other Agent: `collab/search-tabs-ui` implemented & verified.
  1. UI Redesign: Eliminated horizontal dragging/overflowing on search modal tabs by introducing a Two-tier Scope and Action Pills system.
  2. Tier 1: Prominent scope switcher (`[☸ ပါဠိတော်]` vs `[🇲🇲 မြန်မာပြန်]`).
  3. Tier 2: Compact action pills per scope (`[📝 စကားလုံး]`, `[📄 စာပိုဒ်/အတွဲ]`, `[📜 သုတ္တန်]`, `[📚 ကျမ်းအမည်]` for Pali; `[📄 စာပိုဒ်/အတွဲ]`, `[📚 ကျမ်းအမည်]`, `[📑 မာတိကာ]` for MM). Zero horizontal dragging even on 320px mobile screens.
  4. Logic in `app.js`: `setSearchScope(scope, targetMode)` synchronizes scope with reader mode (`state.readerMode`), search history clicks, and dynamic placeholder updates. Retains all existing `.modal-tab-btn` and `data-mode` contracts.
  All local test suites pass (100/100). Branch ready for Muse review & merge (app.js/app.css version bump deferred to Muse for v7.50).
- 2026-10-02 — Other Agent: `collab/guide-telegram-contact` implemented. Added dedicated Telegram contact and feedback box (`@upanna`, link: `https://t.me/upanna`) in `templates/index.html` (User Guide Modal Section 12) and `README.md` author attribution section. Tests pass (100/100). Branch ready for review & merge.
- 2026-10-02 — Other Agent (Antigravity): `collab/in-app-updater` implemented. Complete In-App Updater architecture:
  1. Keystore Security (Step 1): `.gitignore` updated for `*.jks`/`*.keystore`/`release-keystore.properties`; `build.gradle` release signing config with graceful debug fallback; `generate_release_keystore.bat`/`.sh` generator scripts; `release-keystore.properties.example` template.
  2. Native Android: `FileProvider` configured with `file_paths.xml`; `REQUEST_INSTALL_PACKAGES` permission in `AndroidManifest.xml`; `MainActivity.kt` with `AndroidBridge.checkForUpdates()`, 3.5s delayed startup auto-check (silent offline skip, 24h snooze in `SharedPreferences`), `DownloadManager` download with complete receiver, and `Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES` permission flow leading to package install.
  3. Backend & Cache: `/api/android-update` endpoint in `app.py` with `Cache-Control: public, max-age=300` (Cloudflare CDN cached to prevent rate limits), supporting dynamic `android_release.json` override.
  4. Web Frontend: `#btnCheckAppUpdate` in User Guide Modal Section 12 calling `window.AndroidBridge.checkForUpdates()` or fallback toast for web users.
- 2026-10-03 — Other Agent (Antigravity): `collab/reader-search-dict-enhancements` implemented & verified.
  1. Search Result Highlight & Auto-Scroll (Issue 1): Added `highlightSearchTermsInContainer(container, query)` using safe DOM `TreeWalker` on text nodes (protecting `<span class="pali-word">` markup), smooth-scrolling to the first match with `block: 'center'`. Amber/yellow glowing highlight defined in `static/app.css` for light and dark themes. Wired into feed, single-page, and split-view panes in `static/app.js`. Handled auto-clearing via `clearPendingSearch()` on next/prev/jump/TOC/bookmark/input navigation.
  2. Canonical Book Order in Search (Issue 2): Selected `b.rowid AS book_order` in `search_pali_phrase` and sorted results strictly by `(book_order, page)`, accurately displaying books in standard Tipitaka sequence: Mula (1–61) -> Atthakatha (62–114) -> Tika (115–151) -> Anya (152–192) and canonical Nikaya order.
  3. Morphological Stemmer for Pali Dictionary (Issue 3): Added `get_pali_stem_candidates(clean)` in `app.py` covering enclitic stripping (`-န္တိ`, `-တိ`, `-ပိ`, `-ဉ္စ`, etc.), noun declension rules (`-ဝတော/-မတော` -> `-ဝါ/-ဝန္တ`, `-ဝေ/-ူနံ/-ုနာ/-ူဟိ/-ူသု` -> `-ု/-ူ`, `-ညော/-ရာဇာနော` -> `-ရာဇာ`, `-ိယာ` -> `-ီ`), pronominal plurals, and pronoun stems. Resolves inflected word lookups (e.g. `ဘဂဝတော`, `ဘိက္ခဝေ`, `ဘိက္ခူနံ`, `ရာညော`, `အာယသ္မတော`, `ဒေဝိယာ`) directly to root headwords.
  4. Prose Punctuation Preservation (Issue 4): Updated `format_chattasangayana_pali()` in `app.py` and `cleanPaliContent()` in `app.js` to preserve pauses in prose by converting Western commas `,` and semicolons `;` to Myanmar pada-thi `၊`, and `?`/`!` to pada-ma `။` (normalizing duplicate punctuation). Gatha verses correctly terminate in `၊` (odd padas) or `။` (even padas).
- 2026-10-04 — Other Agent (Antigravity): `collab/chattha-punctuation-rules` implemented & verified.
  1. Printed Book Alignment: Analyzed 5 high-resolution authentic Myanmar Chattha Sangayana printed book photos. In authentic typography:
     - Vocatives (`ဘိက္ခဝေ`, `ဘန္တေ`, `အာဝုသော`, `မဟာရာဇ`, `မဟာရာဇာ`, `အာနန္ဒ`, `ဗြာဟ္မဏ`, `တာတ`, `ဒေဝ`) NEVER have pada-thi (`၊`) before or after them.
     - Particles/Negatives (`န`, `နော`, `မာ`, `စ`, `ဝါ`, `ဟိ`, `တု`, `ပန`, `ခေါ`, `ဝတ`, `ဟန္ဒ`) NEVER have pada-thi (`၊`) immediately following them.
     - Legitimate clause boundaries (`... ဥပသမ္ပာဒေယျ၊`, `... ဥပသမ္ပာဒေတဗ္ဗော၊`, `... အဟောသိ၊`, `... ကရောထ၊`, `... ဟောတု၊`) and sentence ends (`။`) are strictly preserved.
  2. Backend & Frontend Implementation:
     - Precompiled regexes (`RE_VOCATIVES_BEFORE`, `RE_VOCATIVES_AFTER`, `RE_PARTICLES`) in `app.py` and `static/app.js` using Unicode-safe Myanmar non-letter lookarounds (avoiding ASCII-only `\b` pitfalls with Myanmar virama/vowels).
     - Inline HTML tags (such as VRI edition anchors `<a name="..."></a>`) are preserved while stripping the unwanted pada-thi.
     - Standardized duplicate punctuation and normalized spacing.
  3. Tests & Verification:
     - Added `test_chattha_vocative_and_particle_punctuation` in `test_stemmer_and_punc.py` covering user prompt, anchor tags preservation, and royal/monastic vocatives.
     - Real database page test against printed photo: `mula_vi_03` page 16 output is character-for-character identical to the printed book.
     - All 7 test suites pass 100% (107/107).
- 2026-10-04 — Other Agent (Antigravity): `collab/stemmer-conjunct-click-fix` implemented & verified.
  1. Conjunct Click Fix (Issue 2 from user): In `static/app.js:6641`, `e.target.closest('.pali-word, .no-split')` selected the inner child `<span class="no-split">` whenever the user clicked on any stacked conjunct (e.g. `မ္ဗ`, `ဒ္ဓ`, `က္ခ`, `တ္တ`), sending ONLY that 2-letter conjunct to the dictionary instead of the full word! Changed to `e.target.closest('.pali-word')`, correctly capturing the entire word (`သမ္မာသမ္ဗုဒ္ဓဿ`) wherever the user taps or clicks.
  2. Pali Morphological Stemmer Expansion (Issue 1 from user):
     - `-nt` and `-to` stems: `အရဟတော`, `အရဟတံ`, `အရဟတေ` -> `အရဟန္တ` (5 hits), `အရဟံ` (4 hits), `အရဟ` (6 hits). `မဟတော`, `မဟတာ` -> `မဟန္တ` (6 hits). Participles (`စရတော`, `ဂစ္ဆတော`, `ဇာနတော`) -> `စရ`, `ဂစ္ဆ`, `ဇာန`.
     - Kinship & Agent nouns in `-u` / `-ar`: `သတ္ထုနော`, `သတ္ထာရံ` -> `သတ္ထု` (5 hits), `သတ္ထာ` (2 hits); `ပိတရော`, `ပိတုနော` -> `ပိတု` (5 hits); `မာတရော`, `မာတုနော` -> `မာတု` (7 hits); `ဘာတရော` -> `ဘာတု`; `ဒါတုနော` -> `ဒါတု`.
     - Consonant stems: `ဗြဟ္မုနော`, `ဗြဟ္မာနော` -> `ဗြဟ္မာ` (4 hits), `ဗြဟ္မ` (5 hits); `အတ္တနော` -> `အတ္တာ` (2 hits).
     - Feminine `-u`/`-ū`: `ဝဓုယာ` -> `ဝဓူ` (7 hits).
     - Absolutive root: `ဉာတွာ` -> `ဇာနာတိ` (5 hits).
     - Pronouns: `တဿ`, `တေသံ`, `ယေသံ`, `ကေသံ` -> `တ`, `ယ`, `ကိံ`.
  3. Lookahead Hardening: Added `။` into `RE_VOCATIVES_BEFORE` in `app.py` and `PALI_VOCATIVES_BEFORE_RE` in `static/app.js` (`(?=[<၊။,\s”’"\'\)\]}}]|$ )`), addressing Muse's minor edge case observation.
  4. Tests: 41-word test suite passes 41/41 (100%). All 7 regression test suites pass (107/107).
- ⏳ Pending (user side): daily backup cron; phone test of jump row in WebView; volume-label vs physical-book check; APK rebuild+reinstall.

---

## 8. Two-editor workflow (2026-09-30 သဘောတူညီချက်)

နှစ်ယောက်လုံး edit နိုင်လို့ conflict/history ပျက်မှု ကာကွယ်ရန်:

**စည်းမျဉ်း:**
1. `main` ကို **Muse ပဲ** push တယ် (PAT flow + live verification တစ်ခုတည်းမှာ ရှိစေဖို့)
2. ဟိုဘက် Agent က `collab/<topic>` branch သီးသန့်ပေါ်မှာပဲ ပြင်တယ် (ဥပမာ `collab/backup-offsite`)
3. မပြင်ခင် အောက်က task table မှာ claim လုပ်ရမယ် — ဖိုင်တစ်ခုကို တစ်ချိန်တည်း တစ်ယောက်ပဲ
4. `app.js?v=` version bump ကို branch ထဲမှာ **မလုပ်ရ** — merge တဲ့အခါ Muse က လုပ်တယ်
5. Merge မလုပ်ခင် Muse က diff review + test run — မအောင်ရင် branch ကို ပြန်ပို့တယ်
6. သူ့ branch push မလုပ်ခင် local test တွေ (`test_jump_hang_regression.py`, `test_export.py`, `test_audit_fixes.py`) pass ရမယ် (other agent agreed 2026-09-30)
7. သူ့ branch push အတွက် user က တစ်ခါသုံး PAT paste ပေးရမယ် (မသိမ်းရ)

**အဆင့်ဆင့်:**
1. Task ရွေး → 2. သူ: branch ဖွင့် → ပြင် → push → "ready" ပြော → 3. User ဒီဘက် "collab/xxx ready" ပြော → 4. Muse: fetch → review → test → merge → version bump → push main → 5. User deploy → Muse live verify → 6. Briefing log ဖြည့်, branch ဖျက်

**Task claim table (လက်ရှိ):**

| Task | Claimed by | Branch | Status |
|---|---|---|---|
| (ဥပမာ) backup off-site copy | — | — | open |
| Off-site backup automation (rclone hook + guide) | Other Agent | `collab/backup-offsite` | ✅ merged to main (2026-09-30) |
| Text justification: safe `<wbr>` syllable breaks + inter-character, phone + desktop | Other Agent | `collab/text-justification` | ✅ merged to main (2026-10-01, v7.47) |
| Documentation update: README (sec 21-24) + in-app guide card | Other Agent | `collab/docs-update` | ✅ merged to main (2026-10-01) |
| | | | |
| Multi-word / phrase search with prefix expansion (Pali + MM) | Other Agent | `collab/phrase-search` | ✅ merged to main (2026-10-01, v7.48) |
| Documentation update: README (sec 25 phrase search) + in-app guide card | Other Agent | `collab/phrase-search-docs` | ✅ merged to main (2026-10-01) |
| Hierarchical Collapsible TOC (L1-L6, accordion, 44px tap, stable rowid order) | Other Agent | `collab/hierarchical-toc` | ✅ merged to main (2026-10-02, v7.49) |
| Two-tier Search Scope Tabs (Pali vs MM scope toggle, compact pills, zero horizontal scroll) | Other Agent | `collab/search-tabs-ui` | ✅ merged to main (2026-10-02, v7.50) |
| Telegram contact / feedback link in User Guide modal and README | Other Agent | `collab/guide-telegram-contact` | ✅ merged to main (2026-10-02) |
| In-App Updater (Native Android + FileProvider + /api/android-update + Keystore tools) | Other Agent (Antigravity) | `collab/in-app-updater` | ✅ merged to main (2026-10-02, v7.51) |
| Reader search highlight & auto-scroll, Canonical book search ordering, Pali stemmer dict lookup, Prose punctuation (၊ & ။) | Other Agent (Antigravity) | `collab/reader-search-dict-enhancements` | ✅ merged to main (2026-10-03, v7.52; Muse fixed TreeWalker lastIndex bug + history clear at merge) |
| Chattha Sangayana authentic punctuation rules (strip vocatives & particles false commas, preserve clause pada-thi & pada-ma) | Other Agent (Antigravity) | `collab/chattha-punctuation-rules` | ✅ merged to main (2026-10-04, v7.53; Muse verified: 1000 DB pages idempotent, anchors intact, JS↔PY parity) |
| Documentation update: README (sec 25 highlights, book order, stemmer) + in-app guide cards (sec 9) | Other Agent (Antigravity) | `collab/docs-reader-punc-update` | ✅ merged to main (2026-10-04; docs-only, no version bump; Muse fixed README highlight class name at merge) |
| Pali Stemmer expansion (အရဟတော, သမ္မာသမ္ဗုဒ္ဓဿ, မဟတော, သတ္ထုနော, ပိတရော, etc.) & Stacked Conjunct Click Fix | Other Agent (Antigravity) | `collab/stemmer-conjunct-click-fix` | ✅ merged to main (2026-10-04, v7.54; Muse fixed single-char pronoun lemmas တ/ယ/က dropped by len>=2 guard) |




