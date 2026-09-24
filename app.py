import os
import sys
import sqlite3
import re
import webbrowser
import threading
from flask import Flask, jsonify, render_template, request, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PALI_PATH = os.path.join(BASE_DIR, "tipitaka_pali.db")
DB_MM_PATH = os.path.join(BASE_DIR, "tipitaka_mm.db")
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

app = Flask(__name__, static_folder=STATIC_DIR, template_folder=TEMPLATES_DIR)

def get_pali_db():
    conn = sqlite3.connect(DB_PALI_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size = -64000")
    return conn

def get_mm_db():
    conn = sqlite3.connect(DB_MM_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size = -32000")
    return conn

# Cache category names and structure
CATEGORIES_ORDER = ['vi', 'di', 'ma', 'sa', 'an', 'ku', 'bi', 'annya_vi', 'annya_bi', 'annya_sadda']
BASKET_LABELS = {
    'mula': 'ပါဠိတော် (Mūla)',
    'attha': 'အဋ္ဌကထာ (Aṭṭhakathā)',
    'tika': 'ဋီကာ (Ṭīkā)',
    'annya': 'အည (Añña)'
}

PALI_SUFFIXES = [
    '\u1031\u102b',           # ော (tall aa)
    '\u1031\u102c',           # ော (round aa)
    'ာနံ', 'ါနံ',             # -ānaṃ
    'ေဟိ', 'ေဘိ',             # -ehi, -ebhi
    'သ္မာ', 'သ္မိံ', 'မှိ', 'မှာ', # -smā, -smiṃ, -mhi, -mhā
    'ဿ', 'ာယ', 'ါယ',         # -ssa, -āya
    'ေန', 'ေသု', 'သု',         # -ena, -esu, -su
    'ဉ္စ', 'ဉ္စိ', 'ဝါ', 'ပိ', 'တိ', # enclitics: -ñca, -vā, -pi, -ti
    'ာ', 'ါ', 'ေ', 'ိ', 'ီ', 'ု', 'ူ', 'ံ'
]

def clean_pali_word(word):
    if not word:
        return ""
    return re.sub(r"[\s\d၀-၉၊။,.\-—–“’”\"'()\[\]<>:;?!/\\#*~`]+", "", word).strip()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/download-vps-zip")
def download_vps_zip():
    return send_from_directory(BASE_DIR, "tipitaka_vps.zip", as_attachment=True)

@app.route("/download-code-update")
def download_code_update():
    return send_from_directory(BASE_DIR, "code_update.zip", as_attachment=True)

@app.route("/api/stats")
def api_stats():
    conn_p = get_pali_db()
    cur_p = conn_p.cursor()
    books_count = cur_p.execute("SELECT count(*) FROM books").fetchone()[0]
    pages_count = cur_p.execute("SELECT count(*) FROM pages").fetchone()[0]
    suttas_count = cur_p.execute("SELECT count(*) FROM suttas").fetchone()[0]
    dict_count = cur_p.execute("SELECT count(*) FROM dictionary").fetchone()[0]
    words_count = cur_p.execute("SELECT count(*) FROM wordlist").fetchone()[0]
    conn_p.close()

    mm_books_count = 0
    mm_pages_count = 0
    if os.path.exists(DB_MM_PATH):
        conn_m = get_mm_db()
        cur_m = conn_m.cursor()
        mm_books_count = cur_m.execute("SELECT count(*) FROM book").fetchone()[0]
        mm_pages_count = cur_m.execute("SELECT count(*) FROM mm_pages").fetchone()[0]
        conn_m.close()

    return jsonify({
        "books": books_count,
        "pages": pages_count,
        "suttas": suttas_count,
        "dictionary_words": dict_count,
        "indexed_words": words_count,
        "mm_books": mm_books_count,
        "mm_pages": mm_pages_count
    })

# ----------------- Pali APIs -----------------

@app.route("/api/categories")
def api_categories():
    conn = get_pali_db()
    cur = conn.cursor()
    cats = cur.execute("SELECT id, name, basket FROM category").fetchall()
    
    books = cur.execute("""
        SELECT id, basket, category, name, short_name, firstpage, lastpage, pagecount 
        FROM books 
        ORDER BY id ASC
    """).fetchall()
    conn.close()

    cat_map = {c["id"]: {"id": c["id"], "name": c["name"], "basket": c["basket"], "books": []} for c in cats}
    for b in books:
        cid = b["category"]
        if cid in cat_map:
            cat_map[cid]["books"].append({
                "id": b["id"],
                "basket": b["basket"],
                "basket_label": BASKET_LABELS.get(b["basket"], b["basket"]),
                "category": b["category"],
                "name": b["name"],
                "short_name": b["short_name"],
                "firstpage": b["firstpage"],
                "lastpage": b["lastpage"],
                "pagecount": b["pagecount"]
            })

    ordered = []
    for cid in CATEGORIES_ORDER:
        if cid in cat_map:
            ordered.append(cat_map[cid])
    for cid, val in cat_map.items():
        if cid not in CATEGORIES_ORDER:
            ordered.append(val)

    return jsonify(ordered)

@app.route("/api/books")
def api_books():
    conn = get_pali_db()
    cur = conn.cursor()
    books = cur.execute("""
        SELECT b.id, b.basket, b.category, c.name as category_name, b.name, b.short_name, b.firstpage, b.lastpage, b.pagecount 
        FROM books b
        LEFT JOIN category c ON b.category = c.id
        ORDER BY b.id ASC
    """).fetchall()
    conn.close()
    return jsonify([dict(b) for b in books])

@app.route("/api/book/<book_id>")
def api_book(book_id):
    conn = get_pali_db()
    cur = conn.cursor()
    
    book = cur.execute("""
        SELECT b.id, b.basket, b.category, c.name as category_name, b.name, b.short_name, b.firstpage, b.lastpage, b.pagecount 
        FROM books b
        LEFT JOIN category c ON b.category = c.id
        WHERE b.id = ?
    """, (book_id,)).fetchone()
    
    if not book:
        conn.close()
        return jsonify({"error": "Book not found"}), 404

    tocs = cur.execute("""
        SELECT name, type, page_number 
        FROM tocs 
        WHERE book_id = ? 
        ORDER BY page_number ASC
    """, (book_id,)).fetchall()

    suttas = cur.execute("""
        SELECT name, page_number, sutta_id, nikaya, volume, section, sutta_number 
        FROM suttas 
        WHERE book_id = ? 
        ORDER BY page_number ASC
    """, (book_id,)).fetchall()

    related = []
    matches = cur.execute("""
        SELECT m.base, b1.name as base_name, m.exp, b2.name as exp_name
        FROM pali_attha_tika_match m
        JOIN books b1 ON m.base = b1.id
        JOIN books b2 ON m.exp = b2.id
        WHERE m.base = ? OR m.exp = ?
    """, (book_id, book_id)).fetchall()

    for m in matches:
        if m["base"] == book_id:
            related.append({"id": m["exp"], "name": m["exp_name"], "rel_type": "commentary"})
        else:
            related.append({"id": m["base"], "name": m["base_name"], "rel_type": "root"})

    # Check matching Myanmar book
    matching_mm_book = None
    if os.path.exists(DB_MM_PATH):
        m_conn = get_mm_db()
        m_cur = m_conn.cursor()
        src = m_cur.execute("""
            SELECT sb.mm_book_id, b.name 
            FROM source_book sb 
            JOIN book b ON sb.mm_book_id = b.id 
            WHERE sb.pali_book_id = ?
        """, (book_id,)).fetchone()
        if src:
            matching_mm_book = {"book_id": src[0], "book_name": src[1]}
        m_conn.close()

    conn.close()

    return jsonify({
        "book": dict(book),
        "tocs": [dict(t) for t in tocs],
        "suttas": [dict(s) for s in suttas],
        "related": related,
        "matching_mm_book": matching_mm_book
    })

@app.route("/api/page/<book_id>/<int:page_num>")
def api_page(book_id, page_num):
    conn = get_pali_db()
    cur = conn.cursor()

    book = cur.execute("SELECT id, name, firstpage, lastpage, pagecount FROM books WHERE id = ?", (book_id,)).fetchone()
    if not book:
        conn.close()
        return jsonify({"error": "Book not found"}), 404

    if page_num < book["firstpage"]:
        page_num = book["firstpage"]
    elif page_num > book["lastpage"]:
        page_num = book["lastpage"]

    page_row = cur.execute("""
        SELECT id, book_id, page, content, paranum 
        FROM pages 
        WHERE book_id = ? AND page = ?
    """, (book_id, page_num)).fetchone()

    current_toc = cur.execute("""
        SELECT name, type 
        FROM tocs 
        WHERE book_id = ? AND page_number <= ? 
        ORDER BY page_number DESC LIMIT 1
    """, (book_id, page_num)).fetchone()

    # Find matching Myanmar translation page
    matching_mm = None
    if os.path.exists(DB_MM_PATH):
        m_conn = get_mm_db()
        m_cur = m_conn.cursor()
        
        # Try page map first
        pmap = m_cur.execute("""
            SELECT m.mm_book_id, b.name, m.mm_page_number
            FROM mm_pali_page_map m
            JOIN book b ON m.mm_book_id = b.id
            WHERE m.pali_book_id = ? AND m.pali_page_number = ?
        """, (book_id, page_num)).fetchone()

        if pmap:
            matching_mm = {"book_id": pmap[0], "book_name": pmap[1], "page": pmap[2]}
        else:
            # Try source_book and paragraph number
            src = m_cur.execute("""
                SELECT sb.mm_book_id, b.name, sb.link_type
                FROM source_book sb
                JOIN book b ON sb.mm_book_id = b.id
                WHERE sb.pali_book_id = ?
            """, (book_id,)).fetchone()
            if src:
                mm_bid, mm_bname, ltype = src
                target_mm_pg = 1
                if page_row and page_row["paranum"]:
                    nums = [int(n) for n in str(page_row["paranum"]).split('-') if n.isdigit()]
                    if nums:
                        first_num = nums[0]
                        mp = m_cur.execute("SELECT page_number FROM paragraphs WHERE book_id = ? AND paragraph_number = ?", (mm_bid, first_num)).fetchone()
                        if mp:
                            target_mm_pg = mp[0]
                matching_mm = {"book_id": mm_bid, "book_name": mm_bname, "page": target_mm_pg}

        m_conn.close()

    conn.close()

    content_html = page_row["content"] if page_row else "<p>ဤစာမျက်နှာအတွက် အချက်အလက်မရှိပါ။</p>"

    return jsonify({
        "book_id": book_id,
        "book_name": book["name"],
        "page": page_num,
        "first_page": book["firstpage"],
        "last_page": book["lastpage"],
        "page_count": book["pagecount"],
        "has_prev": page_num > book["firstpage"],
        "has_next": page_num < book["lastpage"],
        "prev_page": page_num - 1 if page_num > book["firstpage"] else None,
        "next_page": page_num + 1 if page_num < book["lastpage"] else None,
        "paranum": page_row["paranum"] if page_row else "",
        "chapter_name": current_toc["name"] if current_toc else "",
        "content": content_html,
        "matching_mm": matching_mm
    })

# ----------------- Myanmar Translation APIs -----------------

@app.route("/api/mm/categories")
def api_mm_categories():
    if not os.path.exists(DB_MM_PATH):
        return jsonify([])
    conn = get_mm_db()
    cur = conn.cursor()
    cats = cur.execute("SELECT id, name FROM category ORDER BY id ASC").fetchall()
    books = cur.execute("SELECT id, category_id, name, first_page, last_page, number_of_pages FROM book ORDER BY id ASC").fetchall()
    conn.close()

    cat_map = {c["id"]: {"id": c["id"], "name": c["name"], "books": []} for c in cats}
    for b in books:
        cid = b["category_id"]
        if cid in cat_map:
            cat_map[cid]["books"].append({
                "id": b["id"],
                "name": b["name"],
                "first_page": b["first_page"],
                "last_page": b["last_page"],
                "page_count": b["number_of_pages"]
            })

    return jsonify(list(cat_map.values()))

@app.route("/api/mm/books")
def api_mm_books():
    if not os.path.exists(DB_MM_PATH):
        return jsonify([])
    conn = get_mm_db()
    cur = conn.cursor()
    books = cur.execute("""
        SELECT b.id, b.category_id, c.name as category_name, b.name, b.first_page, b.last_page, b.number_of_pages as page_count
        FROM book b
        JOIN category c ON b.category_id = c.id
        ORDER BY b.id ASC
    """).fetchall()
    conn.close()
    return jsonify([dict(b) for b in books])

@app.route("/api/mm/book/<book_id>")
def api_mm_book(book_id):
    if not os.path.exists(DB_MM_PATH):
        return jsonify({"error": "Myanmar database not found"}), 404
    conn = get_mm_db()
    cur = conn.cursor()

    book = cur.execute("""
        SELECT b.id, b.category_id, c.name as category_name, b.name, b.first_page, b.last_page, b.number_of_pages as page_count
        FROM book b
        JOIN category c ON b.category_id = c.id
        WHERE b.id = ?
    """, (book_id,)).fetchone()

    if not book:
        conn.close()
        return jsonify({"error": "Myanmar book not found"}), 404

    tocs = cur.execute("""
        SELECT name, type, page_number 
        FROM toc 
        WHERE book_id = ? 
        ORDER BY page_number ASC
    """, (book_id,)).fetchall()

    suttas = cur.execute("""
        SELECT name, page_number 
        FROM sutta 
        WHERE book_id = ? 
        ORDER BY page_number ASC
    """, (book_id,)).fetchall()

    # Corresponding Pali book
    matching_pali_book = None
    src = cur.execute("""
        SELECT sb.pali_book_id, sb.link_type
        FROM source_book sb
        WHERE sb.mm_book_id = ?
    """, (book_id,)).fetchone()

    if src:
        # Get pali book name from pali db
        p_conn = get_pali_db()
        p_cur = p_conn.cursor()
        pb = p_cur.execute("SELECT name FROM books WHERE id = ?", (src[0],)).fetchone()
        if pb:
            matching_pali_book = {"book_id": src[0], "book_name": pb[0]}
        p_conn.close()

    conn.close()

    return jsonify({
        "book": dict(book),
        "tocs": [dict(t) for t in tocs],
        "suttas": [dict(s) for s in suttas],
        "matching_pali_book": matching_pali_book
    })

@app.route("/api/mm/page/<book_id>/<int:page_num>")
def api_mm_page(book_id, page_num):
    if not os.path.exists(DB_MM_PATH):
        return jsonify({"error": "Myanmar database not found"}), 404
    conn = get_mm_db()
    cur = conn.cursor()

    book = cur.execute("SELECT id, name, first_page, last_page, number_of_pages FROM book WHERE id = ?", (book_id,)).fetchone()
    if not book:
        conn.close()
        return jsonify({"error": "Myanmar book not found"}), 404

    if page_num < book["first_page"]:
        page_num = book["first_page"]
    elif page_num > book["last_page"]:
        page_num = book["last_page"]

    page_row = cur.execute("SELECT content FROM mm_pages WHERE book_id = ? AND page = ?", (book_id, page_num)).fetchone()

    current_toc = cur.execute("""
        SELECT name 
        FROM toc 
        WHERE book_id = ? AND page_number <= ? 
        ORDER BY page_number DESC LIMIT 1
    """, (book_id, page_num)).fetchone()

    # Find matching Pali page
    matching_pali = None
    pmap = cur.execute("""
        SELECT pali_book_id, pali_page_number 
        FROM mm_pali_page_map 
        WHERE mm_book_id = ? AND mm_page_number = ?
    """, (book_id, page_num)).fetchone()

    if pmap:
        p_conn = get_pali_db()
        p_cur = p_conn.cursor()
        pb = p_cur.execute("SELECT name FROM books WHERE id = ?", (pmap[0],)).fetchone()
        if pb:
            matching_pali = {"book_id": pmap[0], "book_name": pb[0], "page": pmap[1]}
        p_conn.close()
    else:
        src = cur.execute("SELECT pali_book_id FROM source_book WHERE mm_book_id = ?", (book_id,)).fetchone()
        if src:
            p_bid = src[0]
            # Paragraph to pali page
            para = cur.execute("SELECT paragraph_number FROM paragraphs WHERE book_id = ? AND page_number = ? LIMIT 1", (book_id, page_num)).fetchone()
            target_pali_page = 1
            p_conn = get_pali_db()
            p_cur = p_conn.cursor()
            if para:
                p_page_row = p_cur.execute(f"SELECT page FROM pages WHERE book_id = ? AND paranum LIKE '%-{para[0]}-%' LIMIT 1", (p_bid,)).fetchone()
                if p_page_row:
                    target_pali_page = p_page_row[0]
            pb = p_cur.execute("SELECT name FROM books WHERE id = ?", (p_bid,)).fetchone()
            if pb:
                matching_pali = {"book_id": p_bid, "book_name": pb[0], "page": target_pali_page}
            p_conn.close()

    conn.close()

    content_html = page_row[0] if page_row else "<p>ဤစာမျက်နှာအတွက် အချက်အလက်မရှိပါ။</p>"

    return jsonify({
        "book_id": book_id,
        "book_name": book["name"],
        "page": page_num,
        "first_page": book["first_page"],
        "last_page": book["last_page"],
        "page_count": book["number_of_pages"],
        "has_prev": page_num > book["first_page"],
        "has_next": page_num < book["last_page"],
        "prev_page": page_num - 1 if page_num > book["first_page"] else None,
        "next_page": page_num + 1 if page_num < book["last_page"] else None,
        "chapter_name": current_toc[0] if current_toc else "",
        "content": content_html,
        "matching_pali": matching_pali
    })

# ----------------- Dictionary APIs -----------------

@app.route("/api/dictionary/lookup")
def api_dict_lookup():
    raw_word = request.args.get("word", "").strip()
    if not raw_word:
        return jsonify({"word": "", "results": []})

    clean = clean_pali_word(raw_word)
    if not clean:
        return jsonify({"word": raw_word, "results": []})

    conn = get_pali_db()
    cur = conn.cursor()

    candidates = [clean]
    for s in PALI_SUFFIXES:
        if clean.endswith(s) and len(clean) > len(s):
            stem = clean[:-len(s)]
            if len(stem) >= 2 and stem not in candidates:
                candidates.append(stem)

    results = []
    matched_word = clean

    for cand in candidates:
        rows = cur.execute("""
            SELECT d.word, d.definition, b.id as book_id, b.name as book_name 
            FROM dictionary d 
            JOIN dictionary_books b ON d.book_id = b.id 
            WHERE d.word = ? 
            ORDER BY b.user_order ASC
        """, (cand,)).fetchall()
        if rows:
            matched_word = cand
            results = [dict(r) for r in rows]
            break

    if not results and len(clean) >= 2:
        rows = cur.execute("""
            SELECT d.word, d.definition, b.id as book_id, b.name as book_name 
            FROM dictionary d 
            JOIN dictionary_books b ON d.book_id = b.id 
            WHERE d.word LIKE ? 
            ORDER BY b.user_order ASC LIMIT 10
        """, (clean + "%",)).fetchall()
        if rows:
            matched_word = rows[0]["word"]
            results = [dict(r) for r in rows]

    conn.close()

    return jsonify({
        "query": raw_word,
        "clean_word": clean,
        "matched_word": matched_word,
        "results": results
    })

# ----------------- Search API -----------------

@app.route("/api/search")
def api_search():
    query = request.args.get("q", "").strip()
    stype = request.args.get("type", "word")
    page = int(request.args.get("p", 1))
    limit = int(request.args.get("limit", 20))
    offset = (page - 1) * limit

    if not query:
        return jsonify({"results": [], "total": 0})

    if stype == "mm_book":
        # Search Myanmar translated books
        if not os.path.exists(DB_MM_PATH):
            return jsonify({"results": [], "total": 0})
        m_conn = get_mm_db()
        m_cur = m_conn.cursor()
        rows = m_cur.execute("""
            SELECT b.id, b.name, c.name as category_name, b.first_page, b.last_page, b.number_of_pages as page_count
            FROM book b
            JOIN category c ON b.category_id = c.id
            WHERE b.name LIKE ?
            LIMIT 50
        """, (f"%{query}%",)).fetchall()
        m_conn.close()
        return jsonify({
            "type": "mm_book",
            "query": query,
            "total": len(rows),
            "results": [dict(r) for r in rows]
        })

    elif stype == "mm_toc":
        # Search Myanmar TOC
        if not os.path.exists(DB_MM_PATH):
            return jsonify({"results": [], "total": 0})
        m_conn = get_mm_db()
        m_cur = m_conn.cursor()
        total = m_cur.execute("SELECT count(*) FROM toc WHERE name LIKE ?", (f"%{query}%",)).fetchone()[0]
        rows = m_cur.execute("""
            SELECT t.name, t.type, t.page_number, t.book_id, b.name as book_name
            FROM toc t
            JOIN book b ON t.book_id = b.id
            WHERE t.name LIKE ?
            ORDER BY t.book_id, t.page_number
            LIMIT ? OFFSET ?
        """, (f"%{query}%", limit, offset)).fetchall()
        m_conn.close()
        return jsonify({
            "type": "mm_toc",
            "query": query,
            "total": total,
            "page": page,
            "results": [dict(r) for r in rows]
        })

    elif stype == "sutta":
        conn = get_pali_db()
        cur = conn.cursor()
        total = cur.execute("SELECT count(*) FROM suttas WHERE name LIKE ?", (f"%{query}%",)).fetchone()[0]
        rows = cur.execute("""
            SELECT s.name, s.book_id, s.page_number, b.name as book_name, s.sutta_id, s.nikaya
            FROM suttas s
            JOIN books b ON s.book_id = b.id
            WHERE s.name LIKE ?
            ORDER BY s.page_number ASC
            LIMIT ? OFFSET ?
        """, (f"%{query}%", limit, offset)).fetchall()
        conn.close()
        return jsonify({
            "type": "sutta",
            "query": query,
            "total": total,
            "page": page,
            "results": [dict(r) for r in rows]
        })

    elif stype == "book":
        conn = get_pali_db()
        cur = conn.cursor()
        rows = cur.execute("""
            SELECT b.id, b.name, b.short_name, b.basket, c.name as category_name, b.firstpage, b.lastpage, b.pagecount
            FROM books b
            LEFT JOIN category c ON b.category = c.id
            WHERE b.name LIKE ? OR b.short_name LIKE ?
            LIMIT 50
        """, (f"%{query}%", f"%{query}%")).fetchall()
        conn.close()
        return jsonify({
            "type": "book",
            "query": query,
            "total": len(rows),
            "results": [dict(r) for r in rows]
        })

    elif stype == "toc":
        conn = get_pali_db()
        cur = conn.cursor()
        total = cur.execute("SELECT count(*) FROM tocs WHERE name LIKE ?", (f"%{query}%",)).fetchone()[0]
        rows = cur.execute("""
            SELECT t.name, t.type, t.page_number, t.book_id, b.name as book_name
            FROM tocs t
            JOIN books b ON t.book_id = b.id
            WHERE t.name LIKE ?
            ORDER BY t.book_id, t.page_number
            LIMIT ? OFFSET ?
        """, (f"%{query}%", limit, offset)).fetchall()
        conn.close()
        return jsonify({
            "type": "toc",
            "query": query,
            "total": total,
            "page": page,
            "results": [dict(r) for r in rows]
        })

    else:
        # Word Search
        conn = get_pali_db()
        cur = conn.cursor()
        clean_q = clean_pali_word(query)
        word_rows = cur.execute("""
            SELECT word, rowids, count 
            FROM wordlist 
            WHERE word = ?
        """, (clean_q,)).fetchall()

        if not word_rows:
            word_rows = cur.execute("""
                SELECT word, rowids, count 
                FROM wordlist 
                WHERE word LIKE ? 
                ORDER BY count DESC LIMIT 5
            """, (clean_q + "%",)).fetchall()

        if not word_rows:
            conn.close()
            return jsonify({"type": "word", "query": query, "total": 0, "results": [], "matched_words": []})

        matched_words = [r["word"] for r in word_rows]
        all_page_ids = []
        for r in word_rows:
            rowids_str = r["rowids"] or ""
            tokens = [t.strip() for t in rowids_str.split(",") if t.strip()]
            for tok in tokens:
                pid = tok.split("_")[0]
                if pid not in all_page_ids:
                    all_page_ids.append(pid)

        total_occurrences = sum(r["count"] for r in word_rows)
        total_pages = len(all_page_ids)
        slice_ids = all_page_ids[offset:offset + limit]

        results = []
        if slice_ids:
            placeholders = ",".join(["?"] * len(slice_ids))
            pages = cur.execute(f"""
                SELECT p.id, p.book_id, b.name as book_name, p.page, p.content
                FROM pages p
                JOIN books b ON p.book_id = b.id
                WHERE p.id IN ({placeholders})
            """, slice_ids).fetchall()

            page_dict = {str(p["id"]): p for p in pages}
            for pid in slice_ids:
                if pid in page_dict:
                    p = page_dict[pid]
                    clean_text = re.sub(r"<[^>]+>", " ", p["content"])
                    clean_text = " ".join(clean_text.split())
                    pos = clean_text.find(clean_q)
                    if pos != -1:
                        start = max(0, pos - 60)
                        end = min(len(clean_text), pos + len(clean_q) + 90)
                        snippet = ("..." if start > 0 else "") + clean_text[start:end] + ("..." if end < len(clean_text) else "")
                    else:
                        snippet = clean_text[:140] + "..."

                    results.append({
                        "page_id": p["id"],
                        "book_id": p["book_id"],
                        "book_name": p["book_name"],
                        "page": p["page"],
                        "snippet": snippet
                    })

        conn.close()
        return jsonify({
            "type": "word",
            "query": query,
            "matched_words": matched_words,
            "total_occurrences": total_occurrences,
            "total": total_pages,
            "page": page,
            "results": results
        })

# ----------------- Bookmarks & Recent -----------------

@app.route("/api/bookmarks", methods=["GET", "POST", "DELETE"])
def api_bookmarks():
    conn = get_pali_db()
    cur = conn.cursor()
    if request.method == "GET":
        rows = cur.execute("""
            SELECT bm.book_id, b.name as book_name, bm.page_number, bm.note 
            FROM bookmark bm
            LEFT JOIN books b ON bm.book_id = b.id
            ORDER BY bm.rowid DESC
        """).fetchall()
        conn.close()
        return jsonify([dict(r) for r in rows])

    elif request.method == "POST":
        data = request.json or {}
        book_id = data.get("book_id")
        page_num = data.get("page_number")
        note = data.get("note", "")
        if not book_id or not page_num:
            conn.close()
            return jsonify({"error": "Missing book_id or page_number"}), 400
        existing = cur.execute("SELECT 1 FROM bookmark WHERE book_id = ? AND page_number = ?", (book_id, page_num)).fetchone()
        if not existing:
            cur.execute("INSERT INTO bookmark (book_id, page_number, note) VALUES (?, ?, ?)", (book_id, page_num, note))
            conn.commit()
        conn.close()
        return jsonify({"status": "success", "action": "added"})

    elif request.method == "DELETE":
        data = request.json or {}
        book_id = data.get("book_id")
        page_num = data.get("page_number")
        if book_id and page_num:
            cur.execute("DELETE FROM bookmark WHERE book_id = ? AND page_number = ?", (book_id, page_num))
            conn.commit()
        conn.close()
        return jsonify({"status": "success", "action": "deleted"})

@app.route("/api/recent", methods=["GET", "POST"])
def api_recent():
    conn = get_pali_db()
    cur = conn.cursor()
    if request.method == "GET":
        row = cur.execute("""
            SELECT r.book_id, b.name as book_name, r.page_number 
            FROM recent r
            JOIN books b ON r.book_id = b.id
            LIMIT 1
        """).fetchone()
        conn.close()
        if row:
            return jsonify(dict(row))
        return jsonify({"book_id": "mula_vi_01", "book_name": "ပါရာဇိကပါဠိ", "page_number": 1})

    elif request.method == "POST":
        data = request.json or {}
        book_id = data.get("book_id")
        page_num = data.get("page_number")
        if book_id and page_num:
            cur.execute("DELETE FROM recent")
            cur.execute("INSERT INTO recent (book_id, page_number) VALUES (?, ?)", (book_id, page_num))
            conn.commit()
        conn.close()
        return jsonify({"status": "success"})

def open_browser():
    webbrowser.open_new("http://127.0.0.1:5000")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    if os.environ.get("NO_BROWSER") != "1":
        threading.Timer(1.2, open_browser).start()
    print(f"==================================================")
    print(f" Tipitaka Pali & Myanmar Web Reader")
    print(f" Server running at: http://127.0.0.1:{port}")
    print(f" Press Ctrl+C to stop.")
    print(f"==================================================")
    app.run(host="0.0.0.0", port=port, debug=False)
