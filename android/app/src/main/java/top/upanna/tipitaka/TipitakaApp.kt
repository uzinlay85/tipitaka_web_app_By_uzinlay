package top.upanna.tipitaka

import com.chaquo.python.android.PyApplication

/** Starts the Chaquopy Python runtime once per process (required before any
 *  Python.getInstance() call). The Flask server itself is started from
 *  MainActivity on a background thread via bootstrap.run_server(). */
class TipitakaApp : PyApplication()
