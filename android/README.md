# တိပိဋက Android App (Phase 1)

WebView + Chaquopy wrapper — web version ရဲ့ feature 100% ကို phone ပေါ်မှာ
online/offline နှစ်မျိုးလုံး သုံးလို့ရအောင် ထုပ်ထားတာ။

## Architecture

- **Native shell (Kotlin):** splash, ပထမအကြိမ် DB download (~150MB, Google Drive),
  WebView, .docx export → Downloads
- **Chaquopy:** repo root က `app.py` + `export_doc.py` + `static/` + `templates/`
  ကို build တိုင်း auto-sync ပြီး phone ထဲမှာ Flask (`127.0.0.1:5000`) အဖြစ် run
- **Sync:** `/api/sync/*` ကို `TIPITAKA_SYNC_UPSTREAM` (VPS)�ီ proxy လုပ် —
  offline မှာ ကျန်တာ အကုန်အလုပ်လုပ်၊ online ကျရင် sync တက်
- `app.py` ဘက်က ပြောင်းလဲမှုက env-gated: `TIPITAKA_DATA_DIR`,
  `TIPITAKA_SYNC_UPSTREAM`, `/api/health` — web/VPS မှာ မထိခိုက်ဘူး

## Local build

```bash
# လိုအပ်ချက်: JDK 17, Android SDK (platform 34, build-tools 34), Gradle 8.7+
export JAVA_HOME=/path/to/jdk17
export ANDROID_HOME=/path/to/android-sdk
cd android
gradle assembleDebug --no-daemon
# -> app/build/outputs/apk/debug/app-debug.apk
```

## Release (GitHub Releases)

```bash
git tag android-v1.0.0
git push origin android-v1.0.0
```

GitHub Actions က APK build ပြီး Release မှာ attach လုပ်ပေးမယ်။
APK က **debug-signed** — GitHub ကနေ တိုက်ရိုက်သွင်းဖို့အတွက် လုံလောက်တယ်။

## Play Store (နောင်မှ)

1. Release keystore ထုတ်: `keytool -genkeypair ...`
2. `app/build.gradle` ရဲ့ `release` block မှာ signingConfig ထည့်
3. `assembleRelease` build, Play Console ($25) ကနေ တင်
4. Privacy policy URL လိုမယ်

## Versioning

Tag `android-vX.Y.Z` → `versionName=X.Y.Z`, `versionCode`=GitHub run number။
