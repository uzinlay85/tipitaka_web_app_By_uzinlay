"""Tests for /api/export/<mode>/<book_id> (Word/PDF download)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

import app as A
from export_doc import parse_page

A.app.testing = True
c = A.app.test_client()

passed = failed = 0
def check(name, cond):
    global passed, failed
    print(("  PASS " if cond else "  FAIL ") + name)
    passed, failed = passed + cond, failed + (not cond)

# --- parser ---
import sqlite3
pconn = sqlite3.connect("tipitaka_pali.db")
row = pconn.execute("SELECT content FROM pages WHERE book_id='mula_vi_01' AND page=1").fetchone()
blocks = parse_page(row[0])
kinds = [k for k, _ in blocks]
check("parser finds nikaya/book/chapter/body blocks",
      "nikaya" in kinds and "book" in kinds and "chapter" in kinds and "body" in kinds)
check("parser strips anchor markers",
      not any("vin1" in t or "T1.0001" in t for _, segs in blocks for t, _ in segs))
check("parser marks paranum bold",
      any(b for _, segs in blocks for _, b in segs))
check("parser empty input -> no blocks", parse_page("") == [])

# --- docx ---
r = c.get("/api/export/pali/mula_vi_01?from=1&to=2&format=docx")
check("docx 200", r.status_code == 200)
check("docx mimetype", r.headers["Content-Type"].startswith(
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
check("docx not empty zip", len(r.data) > 10000 and r.data[:2] == b"PK")
check("docx filename", "tipitaka_mula_vi_01_p1-2.docx" in r.headers.get("Content-Disposition", ""))
from docx import Document
import io
doc = Document(io.BytesIO(r.data))
texts = [p.text for p in doc.paragraphs if p.text.strip()]
check("docx contains book title", any("ပါရာဇိကပါဠိ" in t for t in texts))
check("docx contains page label", any("စာမျက်နှာ 1" in t for t in texts))

# --- pdf ---
r = c.get("/api/export/pali/mula_vi_01?from=1&to=2&format=pdf")
check("pdf 200", r.status_code == 200)
check("pdf mimetype", r.headers["Content-Type"] == "application/pdf")
check("pdf magic", r.data[:5] == b"%PDF-")

# --- mm mode ---
r = c.get("/api/export/mm/01_vinaya_01?from=1&to=2&format=docx")
check("mm docx 200", r.status_code == 200 and len(r.data) > 5000)

# --- validation ---
check("bad book -> 404", c.get("/api/export/pali/nope?format=docx").status_code == 404)
check("bad format -> 400", c.get("/api/export/pali/mula_vi_01?format=exe").status_code == 400)
check("bad mode -> 400", c.get("/api/export/xx/mula_vi_01").status_code == 400)
r = c.get("/api/export/pali/mula_vi_01?from=1&to=2&format=DOCX")
check("format case-insensitive", r.status_code == 200)
r = c.get("/api/export/pali/mula_vi_01?from=abc&to=2&format=docx")
check("garbage page num -> 200 (defaults)", r.status_code == 200)
r = c.get("/api/export/pali/mula_vi_01?from=5&to=3&format=docx")
check("reversed range swapped -> 200", r.status_code == 200 and
      "p3-5" in r.headers.get("Content-Disposition", ""))

# --- rate limit (separate IP via X-Forwarded-For) ---
def hit(ip):
    return c.get("/api/export/pali/mula_vi_01?from=1&to=1&format=docx",
                 headers={"X-Forwarded-For": ip}).status_code
codes = [hit("9.9.9.9") for _ in range(12)]
check("rate limit allows 10 then 429s", codes[:10] == [200]*10 and all(x == 429 for x in codes[10:]))

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
