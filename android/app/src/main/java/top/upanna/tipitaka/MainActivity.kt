package top.upanna.tipitaka

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.util.Log
import android.view.View
import android.webkit.DownloadListener
import android.webkit.URLUtil
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.chaquo.python.Python
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
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
    }

    private lateinit var webView: WebView
    private lateinit var splash: View
    private lateinit var statusText: TextView
    private lateinit var progressBar: ProgressBar
    private val bg = Executors.newSingleThreadExecutor()
    // Root cause from the Flask/Chaquopy server thread (never swallowed silently).
    private val serverError = AtomicReference<Throwable?>(null)

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        webView = findViewById(R.id.webview)
        splash = findViewById(R.id.splash)
        statusText = findViewById(R.id.status_text)
        progressBar = findViewById(R.id.progress_bar)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.databaseEnabled = true
        // localStorage etc. must persist like a browser profile
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()
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

            waitForServer()
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

    private fun waitForServer() {
        val deadline = System.currentTimeMillis() + 180_000
        while (System.currentTimeMillis() < deadline) {
            // Fail fast with the REAL cause instead of a blind 90s wait.
            serverError.get()?.let { throw IllegalStateException("ဆာဗာ error: $it", it) }
            try {
                val c = URL("http://127.0.0.1:$PORT/api/health")
                    .openConnection() as HttpURLConnection
                c.connectTimeout = 1500; c.readTimeout = 1500
                if (c.responseCode == 200) { c.disconnect(); return }
                c.disconnect()
            } catch (_: Exception) { }
            Thread.sleep(500)
        }
        serverError.get()?.let { throw IllegalStateException("ဆာဗာ မတက်လာပါ: $it", it) }
        throw IllegalStateException("ဆာဗာ မတက်လာပါ (အချိန်ကုန်သွားသည်)")
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

    // ---------------- activity lifecycle ----------------

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.visibility == View.VISIBLE && webView.canGoBack())
            webView.goBack()
        else super.onBackPressed()
    }

    override fun onDestroy() {
        if (::webView.isInitialized) webView.destroy()
        bg.shutdownNow()
        super.onDestroy()
    }
}
