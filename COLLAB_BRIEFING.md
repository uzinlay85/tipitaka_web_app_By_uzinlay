# COLLAB_BRIEFING.md — AI နှစ်ယောက် ပူးပေါင်းဆောင်ရွက်မှု မှတ်တမ်း

**ဘယ်လိုသုံးမလဲ:** ဒီ file က ကြားခံနယ်။ User က ဒါကို ဟိုဘက် AI Agent ကို ပြမယ်၊ သူ့အဖြေကို ဒီဘက် (Muse) ပြန် paste မယ်။ Muse က file ကို update လုပ်မယ်။ Direct line မရှိပေမယ့် ဒီနည်းနဲ့ နှစ်ယောက် တိုင်ပင်သလို ဖြစ်မယ်။

**စည်းမျဉ်း (နှစ်ဘက်လုံး လိုက်နာရန်):**
- ခန့်မှန်း မပြောရ — code / test / log အထောက်အထားနဲ့ပဲ ပြော။
- Selector, ID, function နာမည် မှန်းမပြောရ — repo ထဲက အမှန်ကို ကိုးကားရ။
- သဘောမတူရင် အထောက်အထားနဲ့ ငြင်းရ။

**Role ခွဲဝေမှု (သဘောတူညီချက်):**
- ဟိုဘက် Agent: second pair of eyes — Muse ရဲ့ diagnosis ကို challenge လုပ်၊ alternative theory ပေး၊ strategy အကြံပြု။
- Muse (repo + live site + test access ရှိ): implementer + verifier — code ပြင်၊ test run၊ push၊ live verify။ Architecture ဆုံးဖြတ်ချက်တိုင်းကို repo အထောက်အထားနဲ့ အတည်ပြု။
- ဆုံးဖြတ်ချက် အပြီးသတ်: user။

---

## 1. App architecture (အကျဉ်းချုပ်)

- **Web app:** Flask (`app.py`) + SQLite, systemd service `tipitaka` on VPS (`/opt/tipitaka`), live at `https://tipi.upanna.top/` (Cloudflare front).
- **Android app:** Kotlin WebView + Chaquopy — ဖုန်းထဲမှာတင် Flask ကို `127.0.0.1:5000` မှာ run ပြီး WebView နဲ့ ပြတာ။ **Website ကို ဖွင့်တာ မဟုတ်ဘူး။**
- **APK build:** `android/app/build.gradle` ရဲ့ `syncTipitakaPy` task က `app.py` + `static/` + `templates/` ကို build-time မှာ APK ထဲ ထည့်တယ်။ Web ဘက် fix တွေက APK ပြန် build + reinstall မလုပ်မချင်း app ထဲ မရောက်ဘူး။
- **Deploy (web):** `cd /opt/tipitaka && git pull origin main && sudo systemctl restart tipitaka` (user လုပ်တယ်)
- **Deploy (app):** Windows PC မှာ `C:\Users\zin\Downloads\Ai_WebCodes\Selfhosted_Me\Tipitaka_android` (fresh clone — uncommitted changes ရှိတဲ့ `Tipitaka_app` အဟောင်းမဟုတ်) → `git status` clean စစ် → `git pull` → `cd android` → `gradlew.bat assembleDebug` → APK ကို အပေါ်ကနေ install (**uninstall မလုပ်** — DB ~150MB ပျက်မယ်)

## 2. လက်ရှိအခြေအနေ (2026-09-30)

- GitHub main: **v7.37** (`c77864e`) — `app.js?v=7.37`, `app.css?v=7.8`
- Live site: v7.37 deployed + verified
- Android APK: **v7.37 မပါသေးဘူး** — rebuild + reinstall လိုတယ် ⏳ (user's Windows PC side, pending)

## 3. ဖြေရှင်းပြီးသား: Jump Sheet hang (desktop Chrome)

- **Symptom:** divider badge / footer pill နှိပ်ပြီး Jump Sheet ကို ၇–၁၁ ကြိမ် ဖွင့်/ပိတ်လုပ်ရင် browser hang။
- **Root cause:** Chromium ရဲ့ native `<dialog>` API (`showModal()`/`close()`) က repeated use မှာ thread lockup ဖြစ်တာ။
- **Fix (v7.34+):** `<dialog>` လုံးဝဖြုတ် → plain `<div id="jumpSheet" hidden>` overlay + `hidden` toggle။ `showModal`/`close` မသုံးတော့ဘူး။
- **Verification (desktop Chrome, console script):** 20/20 open/close cycles + 10/10 real page jumps — အားလုံးအောင်။
- **သင်ခန်းစာ:** `document`/`document.body` level event listener တွေက DOM ကြီးတဲ့ စာမျက်နှာမှာ hang ဖြစ်စေတယ် — reader container မှာပဲ scope လုပ်ရတယ် (လုပ်ပြီးသား)။

## 4. လက်ရှိ open issue: ဖုန်း app (WebView) မှာ pill နှိပ်ရင် စာ select ဖြစ်ပြီး hang

- **Symptom (user report 2026-09-30, Android app):** footer pill (`#btnOpenJumpSheet`) နှိပ်ရင် စာမျက်နှာတစ်ခုလုံး select (အပြာ) ဖြစ်ပြီး hang။
- **Hypothesis:** `.footer-page-info.jump-trigger` မှာ `user-select: none` မရှိခဲ့လို့ mobile tap က text selection trigger လုပ်တာ။ Selection ဖြစ်တော့ annotation toolbar / jump sheet တို့ conflict ဖြစ်ပြီး hang။
- **Fix (v7.37 — pushed, web မှာ live; app မှာ rebuild လိုတယ်):**
  - CSS (`static/app.css`): `.footer-page-info.jump-trigger` မှာ `user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; touch-action: manipulation;`
  - JS (`static/app.js`): pill click handler + `openJumpSheet()` ထဲမှာ `window.getSelection().removeAllRanges()` နဲ့ selection clear။
- **Verify လုပ်ဖို့ ကျန်တာ:** APK rebuild + reinstall → pill အကြိမ်များများ နှိပ် စမ်း။ ⏳

## 5. Key files (ကိုးကားရန်)

| File | Role |
|---|---|
| `static/app.js` | UI logic အားလုံး — `openJumpSheet()`, `closeJumpSheet()`, `_jumpGo()`, badge/pill handlers (`setupJumpSheet()`) |
| `static/app.css` | `.jump-sheet` (div overlay), `.footer-page-info.jump-trigger`, `.page-divider .divider-badge` |
| `templates/index.html` | `<div id="jumpSheet" hidden>` + `app.js?v=` / `app.css?v=` version tags |
| `app.py` | Flask backend, `/api/page/<book>/<n>`, `/api/export/...` (docx-only, pdf → 400) |
| `test_jump_hang_regression.py` | Static regression checks (no dialog API, no doc-level listeners, version tags) |
| `android/` | Kotlin wrapper + Chaquopy (WebView → 127.0.0.1:5000) |

## 6. ဟိုဘက် Agent အတွက် မေးခွန်းများ

1. v7.37 ရဲ့ `user-select: none` + `removeAllRanges()` fix က Android WebView မှာ pill-tap-select-hang ကို လုံလောက်စွာ ဖြေရှင်းနိုင်မလား? အားနည်းချက် ရှိရင် ဘာထပ်လုပ်သင့်လဲ?
2. Jump Sheet div overlay (`position: fixed; inset: 0; z-index: 1000`) က Android WebView မှာ focus/scroll ပြဿနာ ဖြစ်နိုင်ခြေ ရှိလား?
3. `touch-action: manipulation` က double-tap zoom/selection ကို တားနိုင်မလား — ဒါမှမဟုတ် `touchstart` + `preventDefault` လိုအပ်မလား?

## 7. Log (နှစ်ဘက်လုံး ဖြည့်)

- 2026-09-30 — Muse: brief စတင် (`COLLAB_BRIEFING.md`)။ v7.37 pushed + web live; APK rebuild pending (user side)။
- 2026-09-30 — Other agent: relay နည်းလမ်း (၁)+(၂) အကြံပြု; role division အဆို (architect/auditor vs implementer/builder)။ Muse: relay လက်ခံ; role ကို capability-based အဖြစ် ညှိ — both analyze, Muse verifies against repo, user decides။
- 2026-09-30 — Other agent: role model ကို အပြည့်အဝ လက်ခံ။ COLLAB_BRIEFING.md GitHub ပေါ် မရောက်သေးကြောင်း ထောက်ပြ → push တင် (`878f83b`)။
- 2026-09-30 — Other agent: v7.38 hardening tweaks အကြံပြု (footer coverage, `-webkit-touch-callout`, `contextmenu` block, `touchstart` passive clear, `.jump-sheet-overlay` overscroll)။
- 2026-09-30 — Muse verified vs repo: ❌ `.footer-bar` မရှိဘူး → ✅ `.reader-footer-nav` သုံးတယ်။ ❌ `.jump-sheet-overlay` မရှိဘူး → ✅ `.jump-sheet` (overlay ကိုယ်တိုင်) မှာ `overscroll-behavior: contain` + `translateZ(0)` ထည့်တယ်။ ကျန် tweaks အားလုံး မှန်တယ် → v7.38 (`app.js v7.38`, `app.css v7.9`) implement + tests pass။ **သတိ:** v7.37 fix ကိုယ်တိုင် ဖုန်းမှာ မစမ်းရသေးဘူး (APK rebuild မလုပ်ရသေး) — v7.38 က unverified fix အပေါ် ထပ်ဆင့်တဲ့ hardening, "လုံးဝပျောက်မယ်" လို့ အာမ မခံနိုင်ဘူး; retest မှ အတည်ပြုမယ်။
- 2026-09-30 — v7.38 pushed to main (`0694b47`) ✅. Gemini: PAT ကို Gemini chat ထဲ မထည့်ဖို့ သတိပေး — ရည်ရွယ်ချက်ကောင်းပေမယ့် premise မှား: Muse Spark က user ရဲ့ PC terminal ထဲမှာ run တာမဟုတ်, cloud agent ဖြစ်တယ်; ဒီ chat ထဲ paste တာကပဲ "Muse Spark ကို ပေးတာ" — တစ်ခါသုံး, ဘယ်မှာမှ မသိမ်းဘူး။
- 2026-09-30 — v7.39 pushed to main (`694f321`) ✅ (fresh PAT used transiently, not stored). Awaiting: user VPS deploy → Windows APK rebuild → phone test.
- 2026-09-30 — v7.40 committed locally (`6de6906`, NOT pushed): fix dict sidebar sync with persisted open state on entering reader (`app.js v7.40`). v7.41 committed locally (`6d3499c`, NOT pushed): new bottom-nav item "စာရှာရန်" 🔍 before အဘိဓာန် — opens search modal on word tab (`app.js v7.41`). Both await user go-ahead + fresh PAT for batched push.
-
