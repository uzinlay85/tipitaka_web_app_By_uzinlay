"""Integration tests for the 2026-09-28 security/perf/integration fixes.
Covers: download endpoints removed, search validation, stats cache,
sync push conditional upsert (incl. kind='bookmark'), rate limits,
last_seen throttle.
"""
import json
import os
import sqlite3
import sys
import tempfile

# Isolate the sync DB so we never touch production state
_tmp = tempfile.mkdtemp()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import app as appmod
import time as _time

appmod.SYNC_DB_PATH = os.path.join(_tmp, "test_sync.db")

# Point the big DBs at nothing (endpoints under test don't need them,
# except /api/search which needs the pali DB -- create a tiny one)
pali_tmp = os.path.join(_tmp, "tipitaka_pali.db")
conn = sqlite3.connect(pali_tmp)
conn.execute("CREATE TABLE books (id TEXT PRIMARY KEY, name TEXT, firstpage INT, lastpage INT, pagecount INT)")
conn.execute("CREATE TABLE pages (id INTEGER PRIMARY KEY, book_id TEXT, page INT, content TEXT, paranum TEXT)")
conn.execute("CREATE TABLE suttas (id INTEGER PRIMARY KEY, name TEXT)")
conn.execute("CREATE TABLE dictionary (id INTEGER PRIMARY KEY)")
conn.execute("CREATE TABLE wordlist (word TEXT PRIMARY KEY, rowids TEXT, count INT)")
conn.execute("INSERT INTO wordlist VALUES ('test', '1,2', 2)")
conn.execute("INSERT INTO wordlist VALUES ('သဗ္ဗေ', '1', 1)")
conn.execute("INSERT INTO wordlist VALUES ('ဓမ္မာ', '1', 1)")
conn.execute("INSERT INTO wordlist VALUES ('အနတ္တာ', '1', 1)")
conn.execute("INSERT INTO books VALUES ('b1','Test Book',1,10,10)")
conn.execute("INSERT INTO pages VALUES (1, 'b1', 1, '<p>သဗ္ဗေ ဓမ္မာ အနတ္တာ</p>', '1')")
conn.commit()
conn.close()
appmod.DB_PALI_PATH = pali_tmp
appmod.DB_PALI_RO_URI = f"file:{pali_tmp}?mode=ro"
appmod.DB_MM_PATH = os.path.join(_tmp, "no_mm.db")  # absent -> MM paths skipped

client = appmod.app.test_client()
passed = failed = 0

def check(name, cond, extra=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  PASS {name}")
    else:
        failed += 1
        print(f"  FAIL {name} {extra}")

print("== retired legacy endpoints (410 Gone) ==")
for method, path, payload in [
    ("GET", "/api/bookmarks", None),
    ("POST", "/api/bookmarks", {"book_id": "b1", "page_number": 1}),
    ("DELETE", "/api/bookmarks", {"book_id": "b1", "page_number": 1}),
    ("GET", "/api/recent", None),
    ("POST", "/api/recent", {"book_id": "b1", "page_number": 1}),
]:
    r = client.open(path, method=method, json=payload)
    check(f"{method} {path} -> 410", r.status_code == 410, r.status_code)

print("== download endpoints removed ==")
check("GET /download-vps-zip -> 404", client.get("/download-vps-zip").status_code == 404)
check("GET /download-code-update -> 404", client.get("/download-code-update").status_code == 404)

print("== search validation ==")
r = client.get("/api/search?q=x&p=abc")
check("bad page -> 200 not 500", r.status_code == 200, r.status_code)
r = client.get("/api/search?q=x&limit=999999")
check("huge limit clamped (no crash)", r.status_code == 200)
r = client.get("/api/search?q=x&p=-5&limit=-3")
check("negative page/limit -> 200", r.status_code == 200)

print("== stats cache ==")
r1 = client.get("/api/stats")
check("stats 200", r1.status_code == 200, r1.status_code)
check("stats cached (same object)", appmod._STATS_CACHE is not None)
r2 = client.get("/api/stats")
check("stats stable", r1.get_json() == r2.get_json())

print("== sync: create/claim rate limit ==")
# exhaust create limit quickly with a small window via direct _rate_ok test
appmod._SYNC_RATE.clear()
ok = all(appmod._rate_ok("1.2.3.4", limit=3, window=300) for _ in range(3))
check("3 allowed", ok)
check("4th blocked", not appmod._rate_ok("1.2.3.4", limit=3, window=300))
# eviction (not wipe) under flood
for i in range(2100):
    appmod._rate_ok(f"10.0.0.{i}", limit=1000, window=300)
check("table bounded, not wiped", 0 < len(appmod._SYNC_RATE) <= 2000, len(appmod._SYNC_RATE))

print("== sync: push/pull with bookmark kind ==")
r = client.post("/api/sync/create", json={"device_name": "t"})
body = r.get_json()
check("create 200", r.status_code == 200, r.status_code)
secret, code = body["secret"], body["code"]

now = int(_time.time() * 1000)  # must be ~server time: tombstones older than 90d are pruned
push_payload = {
    "secret": secret,
    "annotations": [
        {"id": "a1", "bookId": "b1", "bookName": "B", "page": 1, "paraId": "p",
         "paraText": "t", "selText": "s", "selStart": 0, "color": "amber",
         "note": "n", "updatedAt": now, "deleted": 0},
    ],
    "history": [
        {"id": "r1", "kind": "reading", "bookId": "b1", "bookName": "B", "page": 5,
         "mode": "pali", "chapterName": "c", "updatedAt": now, "timestamp": now, "deleted": 0},
        {"id": "bm_b1_7", "kind": "bookmark", "bookId": "b1", "bookName": "B",
         "page": 7, "note": "my note", "mode": "pali",
         "updatedAt": now, "timestamp": now, "deleted": 0},
        {"id": "bad1", "kind": "bookmark", "bookId": "b1", "bookName": "B",
         "page": 8, "note": "x" * 5000, "mode": "pali",
         "updatedAt": now, "timestamp": now, "deleted": 0},
        {"id": "evil", "kind": "bookmark<script>", "bookId": "b1", "page": 1,
         "updatedAt": now, "deleted": 0},
    ],
}
r = client.post("/api/sync/push", json=push_payload)
check("push 200", r.status_code == 200, r.get_data(as_text=True)[:200])

# LWW: older update must NOT overwrite
r = client.post("/api/sync/push", json={
    "secret": secret,
    "annotations": [{"id": "a1", "bookId": "b1", "page": 1, "note": "STALE",
                     "updatedAt": now - 1000, "deleted": 0}],
    "history": [{"id": "bm_b1_7", "kind": "bookmark", "bookId": "b1", "page": 7,
                 "note": "STALE", "updatedAt": now - 1000, "deleted": 0}],
})
check("stale push 200", r.status_code == 200)

r = client.post("/api/sync/pull", json={"secret": secret, "since": 0})
d = r.get_json()
anns = {a["id"]: a for a in d["annotations"]}
hist = {h["id"]: h for h in d["history"]}
check("pull 200", r.status_code == 200)
check("annotation kept newer (no stale overwrite)", anns.get("a1", {}).get("note") == "n",
      anns.get("a1", {}).get("note"))
check("bookmark present", "bm_b1_7" in hist)
check("bookmark fields whitelisted", hist["bm_b1_7"].get("note") == "my note"
      and hist["bm_b1_7"].get("kind") == "bookmark", str(hist.get("bm_b1_7")))
check("bookmark note length-capped", len(hist["bad1"]["note"]) <= 500, len(hist["bad1"]["note"]))
check("bookmark newer wins", hist["bm_b1_7"].get("note") == "my note")
check("evil kind normalized", hist["evil"]["kind"] == "reading")
check("reading entry intact", hist.get("r1", {}).get("page") == 5)

# tombstone delete propagates
r = client.post("/api/sync/push", json={
    "secret": secret, "annotations": [],
    "history": [{"id": "bm_b1_7", "kind": "bookmark", "bookId": "b1", "page": 7,
                 "updatedAt": now + 1000, "deleted": 1}],
})
r = client.post("/api/sync/pull", json={"secret": secret, "since": 0})
hist = {h["id"]: h for h in r.get_json()["history"]}
check("bookmark tombstone", hist.get("bm_b1_7", {}).get("deleted") == 1)

print("== sync: last_seen throttle ==")
sconn = sqlite3.connect(appmod.SYNC_DB_PATH)
sconn.row_factory = sqlite3.Row
row = sconn.execute("SELECT last_seen FROM sync_devices").fetchone()
ls1 = row["last_seen"]
client.post("/api/sync/pull", json={"secret": secret, "since": 0})
row = sconn.execute("SELECT last_seen FROM sync_devices").fetchone()
check("last_seen not rewritten on immediate re-pull", row["last_seen"] == ls1,
      f"{ls1} -> {row['last_seen']}")
sconn.close()

print("== sync: auth still enforced ==")
check("push bad secret -> 401",
      client.post("/api/sync/push", json={"secret": "nope", "annotations": [], "history": []}).status_code == 401)
check("pull bad secret -> 401",
      client.post("/api/sync/pull", json={"secret": "nope"}).status_code == 401)

print("== phrase search ==")
r_phrase = client.get("/api/search", query_string={"q": "သဗ္ဗေ ဓမ္မာ", "type": "phrase"})
check("phrase search 200", r_phrase.status_code == 200)
d_phrase = r_phrase.get_json()
check("phrase search type is phrase", d_phrase.get("type") == "phrase")
check("phrase search matches", d_phrase.get("total") == 1, f"got {d_phrase.get('total')}")
check("phrase search has snippets", len(d_phrase.get("results", [])) == 1 and "snippet" in d_phrase["results"][0])

r_auto = client.get("/api/search", query_string={"q": "သဗ္ဗေ ဓမ္မာ", "type": "word"})
check("word multi-word auto-delegates to phrase", r_auto.status_code == 200 and r_auto.get_json().get("type") == "phrase")
check("word multi-word returns total 1", r_auto.get_json().get("total") == 1)

r_mm = client.get("/api/search", query_string={"q": "သစ္စာလေးပါး", "type": "mm_phrase"})
check("mm phrase search 200 without mm db", r_mm.status_code == 200)
check("mm phrase search returns 0 without mm db", r_mm.get_json().get("total") == 0)

print("== app version resolution ==")
r_index = client.get("/")
check("index 200", r_index.status_code == 200)
check("app_version in html", f"Version {appmod.APP_VERSION}" in r_index.get_data(as_text=True))
_rel_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "android_release.json")
_expected_ver = None
try:
    with open(_rel_path, encoding="utf-8") as _rf:
        _expected_ver = json.load(_rf).get("versionName")
except Exception:
    pass
# Priority: ANDROID_VERSION_NAME env (Android runtime) > android_release.json > "1.0.2" fallback
_env_ver = os.environ.get("ANDROID_VERSION_NAME")
check("app_version matches env/json/fallback", appmod.APP_VERSION == ((_env_ver or _expected_ver or "1.0.2").strip()))

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)

