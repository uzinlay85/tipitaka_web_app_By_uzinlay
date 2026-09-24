import zipfile
import sqlite3
import os
import re
import time

target_dir = r"C:\Users\zin\Downloads\Ai_WebCodes\Selfhosted_Me\Tipitaka_app"
apk_mm_path = os.path.join(target_dir, "Tipitak_MM", "Tipitaka_MM.apk")
out_db_path = os.path.join(target_dir, "tipitaka_mm.db")

print("Starting Tipitaka Myanmar Database creation...")
t0 = time.time()

# 1. Read existing tables from tipi_mm.db in apk
with zipfile.ZipFile(apk_mm_path) as z:
    raw_db_bytes = z.read("assets/databases/tipi_mm.db")
    tmp_db = os.path.join(target_dir, "temp_tipi_mm.db")
    with open(tmp_db, "wb") as f:
        f.write(raw_db_bytes)

# Remove old db if exists
if os.path.exists(out_db_path):
    try:
        os.remove(out_db_path)
    except Exception:
        pass

src_conn = sqlite3.connect(tmp_db)
src_cur = src_conn.cursor()

dest_conn = sqlite3.connect(out_db_path)
dest_cur = dest_conn.cursor()
dest_conn.execute("PRAGMA journal_mode=WAL")
dest_conn.execute("PRAGMA synchronous=NORMAL")

# Copy tables: category, book, toc, sutta, source_book, mm_pali_page_map, paragraphs
for tbl in ["category", "book", "toc", "sutta", "source_book", "mm_pali_page_map", "paragraphs"]:
    schema = src_cur.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{tbl}'").fetchone()[0]
    dest_cur.execute(schema)
    rows = src_cur.execute(f"SELECT * FROM \"{tbl}\"").fetchall()
    if rows:
        placeholders = ",".join(["?"] * len(rows[0]))
        dest_cur.executemany(f"INSERT INTO \"{tbl}\" VALUES ({placeholders})", rows)
    print(f"Copied table '{tbl}': {len(rows)} rows")

# Create mm_pages table
dest_cur.execute("""
CREATE TABLE IF NOT EXISTS mm_pages (
    book_id TEXT,
    page INTEGER,
    content TEXT,
    PRIMARY KEY (book_id, page)
)
""")

mm_digits = {'၀': 0, '၁': 1, '၂': 2, '၃': 3, '၄': 4, '၅': 5, '၆': 6, '၇': 7, '၈': 8, '၉': 9}
def from_mm_num(s):
    val = 0
    for ch in s:
        if ch in mm_digits:
            val = val * 10 + mm_digits[ch]
    return val

books = src_cur.execute("SELECT id, name, number_of_pages FROM book ORDER BY id").fetchall()
para_pattern = re.compile(r'<span class="paragraph">([၀-၉\d]+)</span>')

with zipfile.ZipFile(apk_mm_path) as z:
    for b_id, b_name, b_pages in books:
        fname = f"assets/Books/{b_id}.html"
        try:
            html = z.read(fname).decode("utf-8", errors="ignore")
        except KeyError:
            print(f"File not found: {fname}")
            continue

        pages_data = []

        if "\n---\n" in html:
            # Split by page delimiter
            parts = html.split("\n---\n")
            for idx, part in enumerate(parts):
                clean_part = re.sub(r'</?(?:html|body|head)[^>]*>', '', part).strip()
                pages_data.append((b_id, idx + 1, clean_part))
        else:
            # Paragraph-mapped book
            para_to_page = {}
            for p_num, pg in src_cur.execute("SELECT paragraph_number, page_number FROM paragraphs WHERE book_id = ?", (b_id,)).fetchall():
                para_to_page[p_num] = pg

            matches = list(para_pattern.finditer(html))
            if matches:
                # Find start of paragraph tags
                p_starts = []
                p_nums = []
                for m in matches:
                    p_num = from_mm_num(m.group(1))
                    p_nums.append(p_num)
                    # Find preceding <p or heading before this span
                    p_idx = html.rfind('<p', max(0, m.start() - 250), m.start())
                    if p_idx == -1: p_idx = m.start()
                    p_starts.append(p_idx)

                # Intro before first paragraph
                body_start = html.find("<body>")
                intro_start = body_start + len("<body>") if body_start != -1 else 0
                intro = html[intro_start:p_starts[0]].strip()

                page_dict = {}
                last_pg = 1
                for i in range(len(matches)):
                    p_num = p_nums[i]
                    target_pg = para_to_page.get(p_num, last_pg)
                    last_pg = target_pg

                    start_idx = p_starts[i]
                    end_idx = p_starts[i+1] if (i + 1 < len(matches)) else html.find("</body>")
                    if end_idx == -1: end_idx = len(html)

                    chunk = html[start_idx:end_idx].strip()
                    if target_pg not in page_dict:
                        page_dict[target_pg] = []
                    page_dict[target_pg].append(chunk)

                # Prepend intro to page 1
                if 1 in page_dict and intro:
                    page_dict[1].insert(0, intro)
                elif intro:
                    page_dict[1] = [intro]

                max_pg = max(page_dict.keys()) if page_dict else b_pages
                current_text = ""
                for pg in range(1, max(max_pg, b_pages) + 1):
                    if pg in page_dict:
                        current_text = "\n".join(page_dict[pg])
                        pages_data.append((b_id, pg, current_text))
                    else:
                        pages_data.append((b_id, pg, current_text or "<p>စာမျက်နှာ ဆက်လက်ဖတ်ရှုရန်</p>"))
            else:
                # Fallback: single page
                pages_data.append((b_id, 1, html))

        if pages_data:
            dest_cur.executemany("INSERT OR REPLACE INTO mm_pages (book_id, page, content) VALUES (?, ?, ?)", pages_data)
            print(f"  Processed [{b_id}] {b_name} -> {len(pages_data)} pages")

dest_conn.commit()

# Create Indexes
print("Creating Indexes...")
dest_cur.execute("CREATE INDEX IF NOT EXISTS idx_mm_pages ON mm_pages(book_id, page)")
dest_cur.execute("CREATE INDEX IF NOT EXISTS idx_mm_toc ON toc(book_id)")
dest_cur.execute("CREATE INDEX IF NOT EXISTS idx_mm_sutta ON sutta(book_id)")
dest_cur.execute("CREATE INDEX IF NOT EXISTS idx_mm_source ON source_book(pali_book_id, mm_book_id)")
dest_cur.execute("CREATE INDEX IF NOT EXISTS idx_mm_page_map ON mm_pali_page_map(pali_book_id, pali_page_number)")
dest_cur.execute("CREATE INDEX IF NOT EXISTS idx_mm_page_map_rev ON mm_pali_page_map(mm_book_id, mm_page_number)")
dest_cur.execute("CREATE INDEX IF NOT EXISTS idx_mm_paragraphs ON paragraphs(book_id, paragraph_number)")
dest_conn.commit()

src_conn.close()
dest_conn.close()
if os.path.exists(tmp_db):
    try: os.remove(tmp_db)
    except Exception: pass

print(f"Finished building {out_db_path} in {time.time()-t0:.2f} seconds!")
