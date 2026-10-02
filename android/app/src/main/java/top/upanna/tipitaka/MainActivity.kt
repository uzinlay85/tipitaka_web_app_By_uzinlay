package top.upanna.tipitaka

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.util.Log
import android.view.View
import android.webkit.DownloadListener
import android.webkit.JavascriptInterface
import android.webkit.URLUtil
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.chaquo.python.Python
import org.json.JSONObject
import java.io.BufferedReader
import java.io.File
import java.io.FileOutputStream
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.Proxy
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicReference
import java.util.zip.ZipInputStream

class MainActivity : AppCompatActivity() {

    companion object {
        const val PORT = 5000
        const val SYNC_UPSTREAM = "https://tipi.upanna.top"
        // Same archive the VPS setup script uses (~150MB).
        const val DB_ZIP_ID = "1WX-09wlmRDma__j4ErLTK8jrSn8a1Fbx"
        const val DB_URL_DIRECT =
            "https://drive.usercontent.google.com/download?id=$DB_ZIP_ID&export=download&confirm=t"
        const val DB_URL_FALLBACK =
            "https://drive.google.com/uc?export=download&id=$DB_ZIP_ID"

        // In-app updater endpoints
        const val UPDATE_PRIMARY_URL = "https://tipi.upanna.top/api/android-update"
        const val UPDATE_FALLBACK_URL =
            "https://api.github.com/repos/uzinlay85/tipitaka_web_app_By_uzinlay/releases/latest"
        const val PREF_NAME = "tipitaka_updater"
        const val KEY_LAST_SNOOZE = "last_snooze_ms"
    }

    private lateinit var webView: WebView
    private lateinit var splash: View
    private lateinit var statusText: TextView
    private lateinit var progressBar: ProgressBar
    private val bg = Executors.newSingleThreadExecutor()
    // Root cause from the Flask/Chaquopy server thread (never swallowed silently).
    private val serverError = AtomicReference<Throwable?>(null)

    // Updater state
    private var downloadId: Long = -1L
    private var pendingApkFile: File? = null
    private var downloadReceiver: BroadcastReceiver? = null

    // JavaScript Bridge exposed to the web front-end
    class AndroidBridge(private val activity: MainActivity) {
        @JavascriptInterface
        fun checkForUpdates() {
            activity.runOnUiThread {
                activity.checkForUpdates(isManual = true)
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        webView = findViewById(R.id.webview)
        splash = findViewById(R.id.splash)
        statusText = findViewById(R.id.status_text)
        progressBar = findViewById(R.id.progress_bar)

        // Splash shows the real APK version (from versionName), so the
        // number on screen always matches the installed build.
        try {
            val ver = packageManager.getPackageInfo(packageName, 0).versionName
            findViewById<TextView>(R.id.splash_version).text = "v$ver"
        } catch (_: Exception) { }

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.databaseEnabled = true
        // localStorage etc. must persist like a browser profile
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()

        // Expose native bridge for in-app updater and future native interactions
        webView.addJavascriptInterface(AndroidBridge(this), "AndroidBridge")

        webView.setDownloadListener(DownloadListener { url, _, contentDisposition, mimeType, _ ->
            // Exported .docx -> system Downloads with a proper filename
            val fileName = URLUtil.guessFileName(url, contentDisposition, mimeType)
            try {
                val req = DownloadManager.Request(Uri.parse(url)).apply {
                    setTitle(fileName)
                    setMimeType(mimeType)
                    setNotificationVisibility(
                        DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    setDestinationInExternalPublicDir(
                        Environment.DIRECTORY_DOWNLOADS, "Tipitaka/$fileName")
                }
                (getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(req)
                setStatus("ဒေါင်းလုဒ်စတင်ပါပြီ: $fileName")
            } catch (e: Exception) {
                setStatus("ဒေါင်းလုဒ်မအောင်မြင်ပါ")
            }
        })

        bg.execute { startUp() }

        // 3.5s delayed startup auto-check for updates (silent offline skip, 24h snooze)
        bg.execute {
            try {
                Thread.sleep(3500)
                checkForUpdates(isManual = false)
            } catch (_: Exception) { }
        }
    }

    // ---------------- startup pipeline (background thread) ----------------

    private fun startUp() {
        try {
            val dbDir = File(filesDir, "databases").apply { mkdirs() }
            val paliDb = File(dbDir, "tipitaka_pali.db")
            val mmDb = File(dbDir, "tipitaka_mm.db")
            if (!isValidDb(paliDb) || !isValidDb(mmDb)) {
                setStatus("ပထမအကြိမ်: ကျမ်းစာဒေတာဘေ့စ် ဒေါင်းလုဒ်ဆွဲနေသည် (~150MB)…")
                runOnUiThread { progressBar.isIndeterminate = false }
                downloadAndExtractDb(dbDir)
            }
            if (!isValidDb(paliDb)) throw IllegalStateException("DB မတွေ့ပါ")

            setStatus("ဆာဗာ စတင်နေသည်…\n(ပထမအကြိမ် ၂-၃ မိနစ်ခန့် ကြာနိုင်သည်)")
            runOnUiThread { progressBar.isIndeterminate = true }
            // Fresh stage log for this launch; bootstrap.py appends markers
            // as it progresses so the splash shows exactly where it's stuck.
            try { File(dbDir, "server_stages.log").delete() } catch (_: Exception) { }
            // Blocking call on this bg thread; Flask serves 127.0.0.1:PORT.
            // Any startup failure is captured (never swallowed) and rethrown
            // from waitForServer() so the real cause reaches the UI + logcat.
            serverError.set(null)
            Thread {
                try {
                    Python.getInstance().getModule("bootstrap")
                        .callAttr("run_server", dbDir.absolutePath, PORT, SYNC_UPSTREAM)
                } catch (e: Throwable) {
                    Log.e("Tipitaka", "Flask server failed to start", e)
                    serverError.set(e)
                }
            }.start()

            waitForServer(dbDir)
            runOnUiThread {
                splash.visibility = View.GONE
                webView.visibility = View.VISIBLE
                webView.loadUrl("http://127.0.0.1:$PORT/")
            }
        } catch (e: Exception) {
            Log.e("Tipitaka", "startup failed", e)
            val cause = (serverError.get() ?: e).toString().take(400)
            setStatus("အမှား: $cause\n\napp ကို ပိတ်၍ ပြန်ဖွင့်ကြည့်ပါ။")
        }
    }

    private fun waitForServer(dbDir: File) {
        val deadline = System.currentTimeMillis() + 180_000
        var lastStage = ""
        var lastNetLog = 0L
        while (System.currentTimeMillis() < deadline) {
            // Fail fast with the REAL cause instead of a blind wait.
            serverError.get()?.let { throw IllegalStateException("ဆာဗာ error: $it", it) }
            // Show the Python-side stage so a hang is diagnosable on-screen.
            val stage = readLastStage(dbDir)
            if (stage != lastStage) {
                lastStage = stage
                val label = if (stage.isEmpty()) "Python စတင်နေသည်…"
                            else "အဆင့်: $stage"
                setStatus("ဆာဗာ စတင်နေသည်…\n($label)")
            }
            try {
                // NO_PROXY: system HTTP proxies (set by VPN/proxy apps) must
                // never intercept loopback traffic to our local server --
                // the in-Python self-test proved the server itself is fine.
                val c = URL("http://127.0.0.1:$PORT/api/health")
                    .openConnection(Proxy.NO_PROXY) as HttpURLConnection
                c.connectTimeout = 1500; c.readTimeout = 1500
                if (c.responseCode == 200) { c.disconnect(); return }
                c.disconnect()
            } catch (e: Exception) {
                // Surface the client-side failure mode on the splash
                // (throttled) instead of swallowing it.
                val now = System.currentTimeMillis()
                if (now - lastNetLog > 10000) {
                    lastNetLog = now
                    try {
                        val msg = (e.message ?: "").replace("\n", " ").take(60)
                        File(dbDir, "server_stages.log").appendText(
                            "${now / 1000} KOTLIN_NET_FAIL_${e.javaClass.simpleName}_$msg\n")
                    } catch (_: Exception) { }
                }
            }
            Thread.sleep(500)
        }
        serverError.get()?.let { throw IllegalStateException("ဆာဗာ မတက်လာပါ: $it", it) }
        val stage = readLastStage(dbDir).ifEmpty { "stage မရှိပါ (Python မစတင်ရသေး)" }
        throw IllegalStateException("ဆာဗာ မတက်လာပါ (အချိန်ကုန်သွားသည်; နောက်ဆုံးအဆင့်: $stage)")
    }

    private fun readLastStage(dbDir: File): String {
        return try {
            val f = File(dbDir, "server_stages.log")
            if (!f.exists()) return ""
            f.readLines().lastOrNull()?.substringAfter(" ")?.trim() ?: ""
        } catch (_: Exception) { "" }
    }

    // ---------------- first-run DB download ----------------

    private fun downloadAndExtractDb(dbDir: File) {
        if (!isOnline()) throw IllegalStateException("အင်တာနက်မရှိပါ")
        val zipFile = File(dbDir, "tipitaka_vps.zip")
        downloadWithResume(resolveDownloadUrl(), zipFile)
        setStatus("ဖြည်နေသည်…")
        extractDbs(zipFile, dbDir)
        zipFile.delete()
        setStatus("ပြီးပါပြီ")
    }

    /** Prefer the direct usercontent endpoint; fall back to the confirm-token flow. */
    private fun resolveDownloadUrl(): String {
        try {
            val c = URL(DB_URL_DIRECT).openConnection() as HttpURLConnection
            c.instanceFollowRedirects = true
            c.connectTimeout = 15000; c.readTimeout = 15000
            c.requestMethod = "HEAD"
            val type = c.contentType ?: ""
            c.disconnect()
            if (!type.contains("text/html")) return DB_URL_DIRECT
        } catch (_: Exception) { }
        // Fallback: scrape the confirm token from the warning page.
        val c = URL(DB_URL_FALLBACK).openConnection() as HttpURLConnection
        c.instanceFollowRedirects = true
        val html = c.inputStream.bufferedReader().readText()
        val cookie = c.headerFields["Set-Cookie"]?.joinToString("; ") { it.substringBefore(";") } ?: ""
        c.disconnect()
        val token = Regex("confirm=([0-9A-Za-z_]+)").find(html)?.groupValues?.get(1)
            ?: throw IllegalStateException("Drive confirm token မရပါ")
        pendingCookie = cookie
        return "$DB_URL_FALLBACK&confirm=$token"
    }

    private var pendingCookie: String = ""

    private fun downloadWithResume(url: String, dest: File) {
        val tmp = File(dest.parent, dest.name + ".part")
        var done = if (tmp.exists()) tmp.length() else 0L
        var attempt = 0
        while (attempt < 3) {
            val c = URL(url).openConnection() as HttpURLConnection
            try {
                c.instanceFollowRedirects = true
                c.connectTimeout = 20000; c.readTimeout = 30000
                if (pendingCookie.isNotEmpty()) c.setRequestProperty("Cookie", pendingCookie)
                if (done > 0) c.setRequestProperty("Range", "bytes=$done-")
                val code = c.responseCode
                if (code == 200) done = 0 // server ignored Range; restart
                else if (code != 206 && code != 200 && !(code in 300..399)) {
                    throw IllegalStateException("HTTP $code")
                }
                val total = (c.getHeaderField("Content-Length")?.toLongOrNull() ?: -1L)
                    .let { if (it >= 0) it + done else -1L }
                c.inputStream.use { input ->
                    FileOutputStream(tmp, done > 0).use { out ->
                        val buf = ByteArray(256 * 1024)
                        while (true) {
                            val n = input.read(buf)
                            if (n < 0) break
                            out.write(buf, 0, n)
                            done += n
                            if (total > 0) {
                                val pct = (done * 100 / total).toInt()
                                runOnUiThread {
                                    progressBar.progress = pct
                                    statusText.text = "ဒေါင်းလုဒ်ဆွဲနေသည်… $pct% (${done / 1048576}MB)"
                                }
                            }
                        }
                    }
                }
                if (tmp.renameTo(dest)) return
                throw IllegalStateException("ဖိုင်သိမ်းမရပါ")
            } catch (e: Exception) {
                attempt++
                if (attempt >= 3) throw e
                Thread.sleep(3000)
            } finally {
                c.disconnect()
            }
        }
    }

    private fun extractDbs(zipFile: File, dbDir: File) {
        var foundPali = false; var foundMm = false
        ZipInputStream(zipFile.inputStream().buffered()).use { zin ->
            var entry = zin.nextEntry
            while (entry != null) {
                val name = entry.name.substringAfterLast("/")
                val target = when (name) {
                    "tipitaka_pali.db" -> File(dbDir, name).also { foundPali = true }
                    "tipitaka_mm.db" -> File(dbDir, name).also { foundMm = true }
                    else -> null
                }
                if (target != null) {
                    FileOutputStream(target).use { zin.copyTo(it) }
                }
                zin.closeEntry()
                entry = zin.nextEntry
            }
        }
        if (!foundPali || !isValidDb(File(dbDir, "tipitaka_pali.db")))
            throw IllegalStateException("zip ထဲမှာ DB မတွေ့ပါ")
    }

    private fun isValidDb(f: File): Boolean {
        if (!f.exists() || f.length() < 100) return false
        return try {
            f.inputStream().use {
                val magic = ByteArray(16); it.read(magic)
                String(magic).startsWith("SQLite format 3\u0000")
            }
        } catch (_: Exception) { false }
    }

    private fun isOnline(): Boolean {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val net = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(net) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun setStatus(s: String) = runOnUiThread { statusText.text = s }

    // ---------------- In-App Updater ----------------

    data class UpdateInfo(
        val versionCode: Int,
        val versionName: String,
        val downloadUrl: String,
        val changelog: String
    )

    fun checkForUpdates(isManual: Boolean) {
        if (!isOnline()) {
            if (isManual) {
                Toast.makeText(this, "အင်တာနက်ချိတ်ဆက်မှု မရှိပါ", Toast.LENGTH_SHORT).show()
            }
            return
        }

        if (!isManual) {
            val prefs = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            val lastSnooze = prefs.getLong(KEY_LAST_SNOOZE, 0L)
            val now = System.currentTimeMillis()
            if (now - lastSnooze < 24 * 60 * 60 * 1000L) {
                return // Snoozed for 24 hours
            }
        }

        if (isManual) {
            Toast.makeText(this, "အပ်ဒိတ် စစ်ဆေးနေပါသည်...", Toast.LENGTH_SHORT).show()
        }

        bg.execute {
            try {
                val updateInfo = fetchUpdateInfo()
                if (updateInfo == null) {
                    if (isManual) {
                        runOnUiThread {
                            Toast.makeText(this, "အပ်ဒိတ် စစ်ဆေးမရပါ (ခေတ္တစောင့်ပြီး ပြန်လည်ကြိုးစားပါ)", Toast.LENGTH_SHORT).show()
                        }
                    }
                    return@execute
                }

                val currentVerCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    packageManager.getPackageInfo(packageName, 0).longVersionCode.toInt()
                } else {
                    @Suppress("DEPRECATION")
                    packageManager.getPackageInfo(packageName, 0).versionCode
                }
                val currentVerName = packageManager.getPackageInfo(packageName, 0).versionName ?: "1.0.0"

                if (updateInfo.versionCode > currentVerCode) {
                    runOnUiThread {
                        showUpdateDialog(updateInfo)
                    }
                } else {
                    if (isManual) {
                        runOnUiThread {
                            Toast.makeText(this, "လက်ရှိဗားရှင်း (v$currentVerName) သည် နောက်ဆုံးဗားရှင်း ဖြစ်ပါသည်", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e("Tipitaka", "Update check failed", e)
                if (isManual) {
                    runOnUiThread {
                        Toast.makeText(this, "အပ်ဒိတ် စစ်ဆေးရာတွင် အမှားဖြစ်ပေါ်ပါသည်", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
    }

    private fun fetchUpdateInfo(): UpdateInfo? {
        // 1. Try primary VPS endpoint (Cloudflare cached, lightweight JSON)
        try {
            val info = fetchFromPrimary()
            if (info != null) return info
        } catch (e: Exception) {
            Log.w("Tipitaka", "Primary update check failed, trying fallback: ${e.message}")
        }

        // 2. Fallback to GitHub Releases API
        try {
            return fetchFromFallback()
        } catch (e: Exception) {
            Log.e("Tipitaka", "Fallback update check also failed: ${e.message}")
        }
        return null
    }

    private fun fetchFromPrimary(): UpdateInfo? {
        val conn = URL(UPDATE_PRIMARY_URL).openConnection() as HttpURLConnection
        conn.connectTimeout = 8000
        conn.readTimeout = 8000
        conn.requestMethod = "GET"
        conn.setRequestProperty("Accept", "application/json")
        try {
            if (conn.responseCode != 200) return null
            val text = conn.inputStream.bufferedReader().use { it.readText() }
            val json = JSONObject(text)
            val vCode = json.optInt("versionCode", -1)
            val vName = json.optString("versionName", "")
            val dlUrl = json.optString("downloadUrl", "")
            val notes = json.optString("changelog", "")
            if (vCode > 0 && dlUrl.isNotEmpty()) {
                return UpdateInfo(vCode, vName, dlUrl, notes)
            }
        } finally {
            conn.disconnect()
        }
        return null
    }

    private fun fetchFromFallback(): UpdateInfo? {
        val conn = URL(UPDATE_FALLBACK_URL).openConnection() as HttpURLConnection
        conn.connectTimeout = 10000
        conn.readTimeout = 10000
        conn.requestMethod = "GET"
        conn.setRequestProperty("Accept", "application/vnd.github.v3+json")
        conn.setRequestProperty("User-Agent", "Tipitaka-Android-App")
        try {
            if (conn.responseCode != 200) return null
            val text = conn.inputStream.bufferedReader().use { it.readText() }
            val json = JSONObject(text)
            val tag = json.optString("tag_name", "").removePrefix("v").removePrefix("android-v")
            val body = json.optString("body", "")

            var apkUrl = ""
            val assets = json.optJSONArray("assets")
            if (assets != null) {
                for (i in 0 until assets.length()) {
                    val asset = assets.getJSONObject(i)
                    val name = asset.optString("name", "")
                    if (name.endsWith(".apk")) {
                        apkUrl = asset.optString("browser_download_url", "")
                        break
                    }
                }
            }
            if (apkUrl.isEmpty()) return null

            val parts = tag.split(".").mapNotNull { it.filter { c -> c.isDigit() }.toIntOrNull() }
            val vCode = if (parts.size >= 3) parts[0] * 10000 + parts[1] * 100 + parts[2]
                        else if (parts.size == 2) parts[0] * 10000 + parts[1] * 100
                        else parts.firstOrNull() ?: 1

            return UpdateInfo(vCode, tag, apkUrl, body)
        } finally {
            conn.disconnect()
        }
    }

    private fun showUpdateDialog(update: UpdateInfo) {
        val message = if (update.changelog.isNotBlank()) {
            "ဗားရှင်း: v${update.versionName}\n\nပြောင်းလဲချက်များ:\n${update.changelog}"
        } else {
            "ဗားရှင်းအသစ် (v${update.versionName}) ထွက်ရှိပါသည်။ ဒေါင်းလုဒ်ရယူလိုပါသလား?"
        }

        AlertDialog.Builder(this)
            .setTitle("အပ်ဒိတ်အသစ် ရရှိနိုင်ပါပြီ")
            .setMessage(message)
            .setPositiveButton("အပ်ဒိတ်ရယူမည်") { _, _ ->
                startApkDownload(update.downloadUrl, update.versionName)
            }
            .setNegativeButton("နောက်မှ") { _, _ ->
                val prefs = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
                prefs.edit().putLong(KEY_LAST_SNOOZE, System.currentTimeMillis()).apply()
            }
            .setCancelable(true)
            .show()
    }

    private fun startApkDownload(apkUrl: String, versionName: String) {
        try {
            val destDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: cacheDir
            val apkFile = File(destDir, "tipitaka-v$versionName.apk")
            if (apkFile.exists()) apkFile.delete()
            pendingApkFile = apkFile

            val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            val req = DownloadManager.Request(Uri.parse(apkUrl)).apply {
                setTitle("Tipitaka v$versionName")
                setDescription("အပ်ဒိတ်ဒေါင်းလုဒ်ဆွဲနေသည်...")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationUri(Uri.fromFile(apkFile))
                setMimeType("application/vnd.android.package-archive")
            }

            downloadId = dm.enqueue(req)
            Toast.makeText(this, "အပ်ဒိတ်ဒေါင်းလုဒ် စတင်နေပါပြီ...", Toast.LENGTH_SHORT).show()

            unregisterDownloadReceiver()

            val receiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    val id = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L) ?: -1L
                    if (id == downloadId) {
                        unregisterDownloadReceiver()
                        pendingApkFile?.let { file ->
                            if (file.exists()) {
                                promptInstall(file)
                            } else {
                                Toast.makeText(this@MainActivity, "ဖိုင်ဒေါင်းလုဒ် မအောင်မြင်ပါ", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                }
            }
            downloadReceiver = receiver
            val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ContextCompat.registerReceiver(this, receiver, filter, ContextCompat.RECEIVER_EXPORTED)
            } else {
                registerReceiver(receiver, filter)
            }
        } catch (e: Exception) {
            Log.e("Tipitaka", "Download failed", e)
            Toast.makeText(this, "ဒေါင်းလုဒ် စတင်မရပါ: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun unregisterDownloadReceiver() {
        downloadReceiver?.let {
            try { unregisterReceiver(it) } catch (_: Exception) {}
            downloadReceiver = null
        }
    }

    private fun promptInstall(apkFile: File) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!packageManager.canRequestPackageInstalls()) {
                AlertDialog.Builder(this)
                    .setTitle("ခွင့်ပြုချက် လိုအပ်သည်")
                    .setMessage("အပ်ဒိတ်ထည့်သွင်းနိုင်ရန် 'Install Unknown Apps' ခွင့်ပြုချက် ပေးရန် လိုအပ်ပါသည်။")
                    .setPositiveButton("ဆက်တင်သို့") { _, _ ->
                        val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                            data = Uri.parse("package:$packageName")
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(intent)
                    }
                    .setNegativeButton("မလုပ်တော့ပါ", null)
                    .show()
                return
            }
        }
        installApk(apkFile)
    }

    private fun installApk(apkFile: File) {
        try {
            val uri = FileProvider.getUriForFile(this, "${packageName}.fileprovider", apkFile)
            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(installIntent)
        } catch (e: Exception) {
            Log.e("Tipitaka", "Install intent failed", e)
            Toast.makeText(this, "အပ်ဒိတ်သွင်းမရပါ: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    // ---------------- activity lifecycle ----------------

    override fun onResume() {
        super.onResume()
        pendingApkFile?.let { file ->
            if (file.exists() && (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || packageManager.canRequestPackageInstalls())) {
                installApk(file)
                pendingApkFile = null
            }
        }
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.visibility == View.VISIBLE && webView.canGoBack())
            webView.goBack()
        else super.onBackPressed()
    }

    override fun onDestroy() {
        unregisterDownloadReceiver()
        if (::webView.isInitialized) webView.destroy()
        bg.shutdownNow()
        super.onDestroy()
    }
}
