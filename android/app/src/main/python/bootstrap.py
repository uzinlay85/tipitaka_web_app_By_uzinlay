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
import socket
import threading
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


def _selftest(data_dir, port):
    """Hit /api/health over a raw socket from inside Python.

    Distinguishes 'server can't accept/dispatch' from 'Kotlin client can't
    connect': SELFTEST_OK but Kotlin still failing => client-side problem.
    """
    time.sleep(2)
    try:
        s = socket.create_connection(("127.0.0.1", port), timeout=10)
        s.settimeout(10)
        s.sendall(b"GET /api/health HTTP/1.0\r\nHost: 127.0.0.1\r\n"
                  b"Connection: close\r\n\r\n")
        resp = b""
        while True:
            try:
                chunk = s.recv(4096)
            except socket.timeout:
                break
            if not chunk:
                break
            resp += chunk
        s.close()
        line0 = resp.split(b"\r\n", 1)[0] if resp else b"<empty>"
        if b"200" in line0:
            _stage(data_dir, "SELFTEST_OK")
        else:
            _stage(data_dir, "SELFTEST_BAD_" + line0[:60].decode("latin1", "replace"))
    except Exception as e:
        _stage(data_dir, f"SELFTEST_FAIL_{type(e).__name__}")


def run_server(data_dir, port, sync_upstream="", version_name=""):
    _stage(data_dir, "BOOTSTRAP_ENTER")
    try:
        os.environ["TIPITAKA_DATA_DIR"] = data_dir
        if sync_upstream:
            os.environ["TIPITAKA_SYNC_UPSTREAM"] = sync_upstream
        if version_name:
            os.environ["ANDROID_VERSION_NAME"] = str(version_name).strip()
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
        # Self-test from inside Python, then serve. A hand-rolled accept
        # loop is used instead of serve_forever() so no selectors/epoll
        # machinery is involved at all -- just blocking accept().
        threading.Thread(target=_selftest, args=(data_dir, port),
                         daemon=True).start()
        _stage(data_dir, "ACCEPT_LOOP_START")
        srv.socket.settimeout(0.5)
        while True:  # blocking by design; process dies with the app
            try:
                request, client_address = srv.socket.accept()
            except socket.timeout:
                continue
            except OSError:
                break
            if srv.verify_request(request, client_address):
                t = threading.Thread(target=srv.process_request_thread,
                                     args=(request, client_address))
                t.daemon = True
                t.start()
            else:
                srv.shutdown_request(request)
    except BaseException:
        # Chaquopy routes stderr to logcat; print explicitly so the real
        # cause is never lost even if the Kotlin side can't capture it.
        traceback.print_exc()
        raise
