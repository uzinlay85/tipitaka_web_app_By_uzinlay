"""Android entry point, started from MainActivity via Chaquopy.

Runs the same Flask app as the web/VPS deployment, but with:
  TIPITAKA_DATA_DIR    -> app-private storage holding the downloaded .db files
  TIPITAKA_SYNC_UPSTREAM -> VPS base URL; /api/sync/* is proxied there so the
                            phone keeps cross-device sync while offline-capable
                            for everything else.
"""
import os
import traceback


def run_server(data_dir, port, sync_upstream=""):
    try:
        os.environ["TIPITAKA_DATA_DIR"] = data_dir
        if sync_upstream:
            os.environ["TIPITAKA_SYNC_UPSTREAM"] = sync_upstream
        import app as tipitaka_app
        tipitaka_app.app.run(host="127.0.0.1", port=port, threaded=True)
    except BaseException:
        # Chaquopy routes stderr to logcat; print explicitly so the real
        # cause is never lost even if the Kotlin side can't capture it.
        traceback.print_exc()
        raise
