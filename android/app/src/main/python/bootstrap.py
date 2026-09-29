"""Android entry point, started from MainActivity via Chaquopy.

Runs the same Flask app as the web/VPS deployment, but with:
  TIPITAKA_DATA_DIR    -> app-private storage holding the downloaded .db files
  TIPITAKA_SYNC_UPSTREAM -> VPS base URL; /api/sync/* is proxied there so the
                            phone keeps cross-device sync while offline-capable
                            for everything else.
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
        _stage(data_dir, "RUN_CALL_START")
        # Blocking by design: serves until the process dies.
        tipitaka_app.app.run(host="127.0.0.1", port=port, threaded=True)
    except BaseException:
        # Chaquopy routes stderr to logcat; print explicitly so the real
        # cause is never lost even if the Kotlin side can't capture it.
        traceback.print_exc()
        raise
