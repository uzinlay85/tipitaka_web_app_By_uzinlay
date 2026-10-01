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
