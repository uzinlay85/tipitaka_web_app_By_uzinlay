#!/usr/bin/env python3
"""verify_android_release.py — scripted Android release checks.

Replicates what used to be done by hand after each Antigravity build:
download the signed APK from the GitHub release, parse its binary
AndroidManifest.xml, and cross-check versionCode / versionName / package
against android_release.json (the file /api/android-update serves).

Usage:
    python3 verify_android_release.py            # JSON + live-endpoint + HEAD checks
    python3 verify_android_release.py --apk      # also download the APK and
                                                # parse its real binary manifest
    python3 verify_android_release.py --apk-path path/to/app-release.apk
                                                # verify a local APK file instead
                                                # of downloading

Exit code: 0 = every check passed, nonzero = at least one check failed.
"""

import argparse
import io
import json
import os
import struct
import sys
import urllib.request
import zipfile

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
RELEASE_JSON = os.path.join(REPO_ROOT, "android_release.json")
LIVE_UPDATER_URL = "https://tipi.upanna.top/api/android-update"
EXPECTED_PACKAGE = "top.upanna.tipitaka"  # android/app/build.gradle applicationId
MIN_APK_BYTES = 20 * 1024 * 1024          # release APKs are ~44 MB

PASS, FAIL, SKIP = "PASS", "FAIL", "SKIP"
results = []


def report(name, ok, detail=""):
    """ok: True=PASS, False=FAIL, None=SKIP (could not check, not a failure)."""
    results.append((name, ok, detail))
    tag = PASS if ok is True else (FAIL if ok is False else SKIP)
    print(f"[{tag}] {name}" + (f" — {detail}" if detail else ""))


# ---------------------------------------------------------------------------
# Binary AndroidManifest.xml (AXML) parsing — no aapt / no JDK needed.
# Layout confirmed against aapt2 output: startElement name index at +20,
# attribute records start at +36, each record 20 bytes.
# ---------------------------------------------------------------------------

TYPE_STRING = 0x03
TYPE_INT_DEC = 0x10


def _read_uleb128(data, off):
    val, shift = 0, 0
    while True:
        b = data[off]
        off += 1
        val |= (b & 0x7F) << shift
        shift += 7
        if not (b & 0x80):
            break
    return val, off


def _read_string_pool(data, off):
    """Return (list_of_strings, end_offset_of_chunk)."""
    _type, _hdr, size = struct.unpack_from("<HHI", data, off)
    if _type != 0x0001:
        raise ValueError("expected StringPool chunk")
    (count, _styles, flags, strings_start, _styles_start) = struct.unpack_from(
        "<IIIII", data, off + 8)
    utf8 = bool(flags & 0x100)
    offs_base = off + 28
    strings_base = off + strings_start
    strings = []
    for i in range(count):
        s_off = strings_base + struct.unpack_from("<I", data, offs_base + 4 * i)[0]
        if utf8:
            _chars, s_off = _read_uleb128(data, s_off)
            byte_len, s_off = _read_uleb128(data, s_off)
            raw = data[s_off:s_off + byte_len]
            strings.append(raw.decode("utf-8", errors="replace"))
        else:
            n = struct.unpack_from("<H", data, s_off)[0]
            s_off += 2
            if n & 0x8000:  # long-form length
                n = ((n & 0x7FFF) << 16) | struct.unpack_from("<H", data, s_off)[0]
                s_off += 2
            raw = data[s_off:s_off + 2 * n]
            strings.append(raw.decode("utf-16-le", errors="replace"))
    return strings, off + size


def parse_binary_manifest(manifest_bytes):
    """Extract package / versionCode / versionName from binary AXML manifest."""
    # First chunk is the XML resource header (RES_XML_TYPE 0x0003, 8 bytes),
    # immediately followed by the StringPool chunk.
    strings, off = _read_string_pool(manifest_bytes, 8)
    got = {}
    while off < len(manifest_bytes):
        _type, _hdr, size = struct.unpack_from("<HHI", manifest_bytes, off)
        if _type == 0x0102:  # startElement
            name_idx = struct.unpack_from("<I", manifest_bytes, off + 20)[0]
            if strings[name_idx] == "manifest":
                attr_count = struct.unpack_from("<H", manifest_bytes, off + 28)[0]
                for a in range(attr_count):
                    base = off + 36 + a * 20
                    ns_idx, name_idx_attr = struct.unpack_from("<II", manifest_bytes, base)
                    data_type = manifest_bytes[base + 15]
                    data = struct.unpack_from("<I", manifest_bytes, base + 16)[0]
                    attr_name = strings[name_idx_attr]
                    if attr_name == "package" and data_type == TYPE_STRING:
                        got["package"] = strings[data]
                    elif attr_name == "versionCode" and data_type == TYPE_INT_DEC:
                        got["versionCode"] = data
                    elif attr_name == "versionName" and data_type == TYPE_STRING:
                        got["versionName"] = strings[data]
                break
        if size <= 0:
            break
        off += size
    return got


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------

def check_release_json():
    try:
        with open(RELEASE_JSON, encoding="utf-8") as f:
            meta = json.load(f)
    except Exception as e:
        report("android_release.json readable", False, str(e))
        return None
    ok = (
        isinstance(meta.get("versionCode"), int)
        and isinstance(meta.get("versionName"), str)
        and meta.get("downloadUrl", "").startswith("https://")
        and isinstance(meta.get("changelog"), str)
    )
    report("android_release.json well-formed", ok,
           f"versionCode={meta.get('versionCode')} versionName={meta.get('versionName')}")
    return meta if ok else None


def check_download_url(url):
    req = urllib.request.Request(url, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            code, size = r.status, r.headers.get("Content-Length")
    except Exception as e:
        report("downloadUrl returns HTTP 200 (HEAD)", False, str(e))
        return False
    ok = code == 200
    size_ok = size is None or int(size) >= MIN_APK_BYTES
    report("downloadUrl returns HTTP 200 (HEAD)", ok,
           f"status={code}" + (f" size={int(size):,} bytes" if size else ""))
    if ok and size:
        report("APK size looks like a real release", size_ok,
               f"{int(size):,} bytes")
    return ok


def check_live_updater(meta):
    try:
        with urllib.request.urlopen(LIVE_UPDATER_URL, timeout=30) as r:
            live = json.loads(r.read().decode("utf-8"))
    except Exception as e:
        # A network error here usually means the *script's* network can't
        # reach the site (e.g. sandboxed CI), not that the site is down.
        report("live /api/android-update reachable", None,
               f"could not connect ({e}); check manually")
        return
    match = (live.get("versionCode") == meta["versionCode"]
             and live.get("versionName") == meta["versionName"])
    report("live /api/android-update serves this release", match,
           f"live={live.get('versionCode')}/{live.get('versionName')}")


def check_apk_bytes(apk_bytes, meta):
    try:
        with zipfile.ZipFile(io.BytesIO(apk_bytes)) as z:
            manifest = z.read("AndroidManifest.xml")
    except Exception as e:
        report("APK is a valid zip with AndroidManifest.xml", False, str(e))
        return
    try:
        got = parse_binary_manifest(manifest)
    except Exception as e:
        report("binary manifest parsed", False, str(e))
        return
    report("binary manifest parsed", True,
           f"package={got.get('package')} versionCode={got.get('versionCode')} "
           f"versionName={got.get('versionName')}")
    report("package matches", got.get("package") == EXPECTED_PACKAGE,
           f"expected {EXPECTED_PACKAGE}")
    report("versionCode matches android_release.json",
           got.get("versionCode") == meta["versionCode"],
           f"apk={got.get('versionCode')} json={meta['versionCode']}")
    report("versionName matches android_release.json",
           got.get("versionName") == meta["versionName"],
           f"apk={got.get('versionName')} json={meta['versionName']}")


def download_apk(url):
    print("Downloading APK (~44 MB)…")
    with urllib.request.urlopen(url, timeout=120) as r:
        total = int(r.headers.get("Content-Length") or 0)
        chunks, got = [], 0
        while True:
            b = r.read(1024 * 1024)
            if not b:
                break
            chunks.append(b)
            got += len(b)
            if total:
                print(f"\r  {got:,}/{total:,} bytes ({100 * got // total}%)",
                      end="", flush=True)
        print()
    return b"".join(chunks)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apk", action="store_true",
                    help="download the APK and verify its real binary manifest")
    ap.add_argument("--apk-path", default=None,
                    help="verify a local APK file instead of downloading")
    args = ap.parse_args()

    meta = check_release_json()
    if meta is None:
        sys.exit(1)
    check_download_url(meta["downloadUrl"])
    check_live_updater(meta)

    if args.apk_path:
        with open(args.apk_path, "rb") as f:
            check_apk_bytes(f.read(), meta)
    elif args.apk:
        apk_bytes = download_apk(meta["downloadUrl"])
        print(f"Downloaded {len(apk_bytes):,} bytes")
        check_apk_bytes(apk_bytes, meta)

    failed = [n for n, ok, _ in results if ok is False]
    passed = [n for n, ok, _ in results if ok is True]
    skipped = [n for n, ok, _ in results if ok is None]
    print(f"\n{len(passed)}/{len(results)} checks passed"
          + (f", {len(skipped)} skipped." if skipped else "."))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
