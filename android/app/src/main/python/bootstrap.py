"""Android entry point, started from MainActivity via Chaquopy.

Runs the same Flask app as the web/VPS deployment, but with:
  TIPITAKA_DATA_DIR      -> app-private storage holding the downloaded .db files
  TIPITAKA_SYNC_UPSTREAM -> VPS base URL; /api/sync/* is proxied there so the
                            phone keeps cross-device sync while offline-capable
                            for everything else.

The WSGI server is stdlib wsgiref (threaded), NOT Werkzeug's dev server:
Werkzeug's run_simple() hangs on some Android devices -- get_sockaddr()
calls socket.getaddrinfo() which has no timeout in bionic, and log_startup()
writes to stderr. wsgiref binds the numeric 127.0.0.1 directly (no DNS) and
does no stderr logging.
"""
import os
import time
import traceback


def _stage(data_dir, name):
    """Append a timestamped stage marker so MainActivity can show exactly
    where startup is stuck (no logcat needed)."""
    try:
        with open(os.path.join(data_dir, "server_stages.log"), "a") as f:
            f.write(f"{time.time():.1f} {name}\n")
    except Exception:
        pass


def run_server(data_dir, port, sync_upstream=""):
    _stage(data_dir, "BOOTSTRAP_ENTER")
    try:
        os.environ["TIPITAKA_DATA_DIR"] = data_dir
        if sync_upstream:
            os.environ["TIPITAKA_SYNC_UPSTREAM"] = sync_upstream
        _stage(data_dir, "ENV_SET")

        _stage(data_dir, "IMPORT_APP_START")
        import app as tipitaka_app
        _stage(data_dir, "IMPORT_APP_DONE")

        _stage(data_dir, "MAKE_SERVER_START")
        from wsgiref.simple_server import WSGIServer, WSGIRequestHandler
        from socketserver import ThreadingMixIn

        class ThreadedWSGIServer(ThreadingMixIn, WSGIServer):
            daemon_threads = True
            allow_reuse_address = True

            def setup_environ(self):
                # Skip socket.getfqdn() reverse-DNS lookup (can hang on some
                # Android devices); the app never uses SERVER_NAME.
                env = self.base_environ = {}
                env["SERVER_NAME"] = "127.0.0.1"
                env["GATEWAY_INTERFACE"] = "CGI/1.1"
                env["SERVER_PORT"] = str(self.server_address[1])
                env["REMOTE_HOST"] = ""
                env["CONTENT_LENGTH"] = ""
                env["SCRIPT_NAME"] = ""

        # ("127.0.0.1", port) tuple binds directly: no getaddrinfo, no DNS.
        srv = ThreadedWSGIServer(("127.0.0.1", port), WSGIRequestHandler)
        srv.set_app(tipitaka_app.app)
        _stage(data_dir, "MAKE_SERVER_DONE")
        _stage(data_dir, "SERVE_FOREVER_START")
        srv.serve_forever()  # blocking by design
    except BaseException:
        # Chaquopy routes stderr to logcat; print explicitly so the real
        # cause is never lost even if the Kotlin side can't capture it.
        traceback.print_exc()
        raise
