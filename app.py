import os
import sys
import sqlite3
import re
import webbrowser
import threading
from functools import lru_cache
from flask import Flask, jsonify, render_template, request, send_from_directory, g

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PALI_PATH = os.path.join(BASE_DIR, "tipitaka_pali.db")
DB_MM_PATH = os.path.join(BASE_DIR, "tipitaka_mm.db")
DB_PALI_RO_URI = f"file:{os.path.abspath(DB_PALI_PATH).replace(os.sep, '/')}?mode=ro"
DB_MM_RO_URI = f"file:{os.path.abspath(DB_MM_PATH).replace(os.sep, '/')}?mode=ro"
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

app = Flask(__name__, static_folder=STATIC_DIR, template_folder=TEMPLATES_DIR)

@app.after_request
def add_cache_headers(response):
    path = request.path
    # 1. Mutable user state: bookmarks and recent read state must never be cached
    if path.startswith("/api/bookmarks") or path.startswith("/api/recent"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    # 2. Static CSS, JS, fonts: cache in browser for 30 days
    elif path.startswith("/static/"):
        response.headers["Cache-Control"] = "public, max-age=2592000, immutable"
    # 3. Canonical Tipitaka text pages and catalogs: 24h browser cache, 7d CDN stale-while-revalidate
    elif path.startswith("/api/page/") or path.startswith("/api/book") or path.startswith("/api/categories") or path.startswith("/api/mm/") or path.startswith("/api/pali/companions/"):
        response.headers["Cache-Control"] = "public, max-age=86400, stale-while-revalidate=604800"
    return response

def get_pali_db(readonly=True):
    """Get request-scoped read-only SQLite connection, or standalone read-write connection for mutations."""
    if not readonly:
        conn = sqlite3.connect(DB_PALI_PATH, timeout=10.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        return conn

    conn = g.get('pali_db')
    if conn is not None:
        try:
            conn.execute("SELECT 1")
        except Exception:
            conn = None

    if conn is None:
        conn = sqlite3.connect(DB_PALI_RO_URI, uri=True, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA query_only = ON")
        conn.execute("PRAGMA cache_size = -64000")
        conn.execute("PRAGMA mmap_size = 268435456")
        g.pali_db = conn
    return conn

def get_mm_db():
    """Get request-scoped read-only SQLite connection for Myanmar Tipitaka database."""
    conn = g.get('mm_db')
    if conn is not None:
        try:
            conn.execute("SELECT 1")
        except Exception:
            conn = None

    if conn is None:
        conn = sqlite3.connect(DB_MM_RO_URI, uri=True, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA query_only = ON")
        conn.execute("PRAGMA cache_size = -32000")
        conn.execute("PRAGMA mmap_size = 268435456")
        g.mm_db = conn
    return conn

@app.teardown_appcontext
def close_db_connections(exception=None):
    """Automatically close all request-scoped database connections."""
    pali_db = g.pop('pali_db', None)
    if pali_db is not None:
        pali_db.close()
    mm_db = g.pop('mm_db', None)
    if mm_db is not None:
        mm_db.close()

def heal_databases():
    """Auto-correct any known legacy page numbering offsets once safely without write-lock storms."""
    if not os.path.exists(DB_PALI_PATH):
        return
    try:
        conn = sqlite3.connect(DB_PALI_PATH, timeout=5.0)
        cur = conn.cursor()
        check = cur.execute("SELECT page FROM pages WHERE id = 4838 AND book_id = 'mula_sa_03'").fetchone()
        if check and check[0] == 121:
            conn.close()
            return  # Already healed, skip writes
        cur.execute("UPDATE pages SET page = 121 WHERE id = 4838 AND book_id = 'mula_sa_03' AND page = 122")
        cur.execute("UPDATE pages SET page = 195 WHERE id = 16896 AND book_id = 'attha_vi_01_01' AND page = 194")
        cur.execute("UPDATE pages SET page = 57 WHERE id = 32354 AND book_id = 'attha_ku_zat_06' AND page = 58")
        cur.execute("UPDATE books SET lastpage = 80 WHERE id = 'annya_sadda_17' AND lastpage = 81")
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Pali DB self-heal notice: {e}")

heal_databases()

# Cache category names and structure
CATEGORIES_ORDER = ['vi', 'di', 'ma', 'sa', 'an', 'ku', 'bi', 'annya_vi', 'annya_bi', 'annya_sadda']
BASKET_LABELS = {
    'mula': 'ပါဠိတော် (Mūla)',
    'attha': 'အဋ္ဌကထာ (Aṭṭhakathā)',
    'tika': 'ဋီကာ (Ṭīkā)',
    'annya': 'အည (Añña)'
}

PALI_SUFFIXES = (
    '\u1031\u102b',           # ော (tall aa)
    '\u1031\u102c',           # ော (round aa)
    'ာနံ', 'ါနံ',             # -ānaṃ
    'ေဟိ', 'ေဘိ',             # -ehi, -ebhi
    'သ္မာ', 'သ္မိံ', 'မှိ', 'မှာ', # -smā, -smiṃ, -mhi, -mhā
    'ဿ', 'ာယ', 'ါယ',         # -ssa, -āya
    'ေန', 'ေသု', 'သု',         # -ena, -esu, -su
    'ဉ္စ', 'ဉ္စိ', 'ဝါ', 'ပိ', 'တိ', # enclitics: -ñca, -vā, -pi, -ti
    'ာ', 'ါ', 'ေ', 'ိ', 'ီ', 'ု', 'ူ', 'ံ'
)

# Precompiled Regular Expressions for High-Performance Text Processing
RE_CLEAN_PALI = re.compile(r"[\s\d၀-၉၊။,.\-—–“’”\"'()\[\]<>:;?!/\\#*~`]+")
RE_GATHA_LEAD_QUOTE = re.compile(r'(^|^(?:<a\b[^>]*>.*?</a>|<span\b[^>]*>.*?</span>|\s)*)[\u201c\u201d\u2018\u2019"\']+\s*')
RE_GATHA_CLOSE_QUOTE = re.compile(r'[\u201c\u201d\u2018\u2019"\']+(?=(?:န္တိ|တိ)[၊။]?)')
RE_GATHA_PUNCT_QUOTE = re.compile(r'[\u201c\u201d\u2018\u2019"\']+(?=[,၊။]|\s*(?:<|$))')
RE_GATHA_AFTER_PUNCT = re.compile(r'([၊။])[\u201c\u201d\u2018\u2019"\']+')

RE_PEYALA = re.compile(r'([^\s\.\…<]?)\s*(?:…|\.{2,})\s*(?:ပေ|ပ)\s*(?:…|\.{2,})\s*[၊။]?')
RE_MULTI_SPACES = re.compile(r'[ \t]{2,}')
RE_P_TAG = re.compile(r'<p\b([^>]*)>([\s\S]*?)</p>', flags=re.I)
RE_GATHA_CLASS = re.compile(r'\bclass\s*=\s*["\'][^"\']*gatha[^"\']*["\']', flags=re.I)
RE_CLASS_ATTR = re.compile(r'\bclass\s*=\s*["\']([^"\']+)["\']', flags=re.I)
RE_LEAD_WHITESPACE = re.compile(r'^\s+')
RE_LEAD_ANCHORS_SPACE = re.compile(r'^((?:<a\b[^>]*>.*?</a>)*)\s+')
RE_COMMA_SPLIT = re.compile(r',(?![^<]*>)\s*')
RE_COMMA_REMOVE = re.compile(r',(?![^<]*>)')
RE_PADA_NON_FINAL = re.compile(r'[၊။]([’"”’\'\s]*(?:<[^>]+>[’"”’\'\s]*)*)$')
RE_PADA_CHECK_PUNCT = re.compile(r'[၊]([’"”’\'\s]*(?:<[^>]+>[’"”’\'\s]*)*)$')
RE_PADA_CHECK_SECTION = re.compile(r'[။]([’"”’\'\s]*(?:<[^>]+>[’"”’\'\s]*)*)$')
RE_UNSPAN = re.compile(r'<span class="(?:pali-word|no-split)">([\s\S]*?)</span>')
RE_HTML_TAGS = re.compile(r'(<[^>]+>)')
RE_SYMBOLS_ONLY = re.compile(r'^[\s\d၀-၉၊။,.\-—–“’”"\'()\[\]<>:;?!/\\#*~`]+$')
RE_NON_SPACE = re.compile(r'\S+')
RE_STACKED_CONJUNCT = re.compile(r'([\u1000-\u1021\u1004\u103a]\u1039[\u1000-\u1021])')
RE_UNSPAN_NO_SPLIT = re.compile(r'<span class="no-split">([\s\S]*?)</span>')
RE_PEYALA_CLEAN_MM = re.compile(r'။\s*ပ\s*။')

def clean_pali_word(word):
    if not word:
        return ""
    return RE_CLEAN_PALI.sub("", word).strip()

def clean_gatha_quotes(text):
    if not text:
        return ""
    text = RE_GATHA_LEAD_QUOTE.sub(r'\1', text)
    text = RE_GATHA_CLOSE_QUOTE.sub('', text)
    text = RE_GATHA_PUNCT_QUOTE.sub('', text)
    text = RE_GATHA_AFTER_PUNCT.sub(r'\1', text)
    return text

def format_chattasangayana_pali(html):
    if not html:
        return ""
    
    # 1. Clean peyala abbreviations (...ပ..., ...ပေ..., …ပ…, …ပေ…) to "။ ပ ။"
    def repl_peyala(m):
        prefix = m.group(1)
        if prefix in ['။', '၊']:
            return f"{prefix} ။ ပ ။ "
        elif prefix:
            return f"{prefix}။ ပ ။ "
        else:
            return "။ ပ ။ "
            
    res_html = RE_PEYALA.sub(repl_peyala, html)
    res_html = RE_MULTI_SPACES.sub(' ', res_html)
    
    # 2. Process paragraphs for gāthās and prose
    def repl_p(m):
        attrs = m.group(1)
        content = m.group(2)
        if RE_GATHA_CLASS.search(attrs):
            cls_m = RE_CLASS_ATTR.search(attrs)
            cls_name = cls_m.group(1).lower() if cls_m else ""
            
            # If already wrapped in gatha-pada, preserve
            if '<span class="gatha-pada' in content:
                return f'<p{attrs}>{content}</p>'

            # Clean leading whitespace inside gatha paragraph so lines align perfectly
            content = RE_LEAD_WHITESPACE.sub('', content)
            content = RE_LEAD_ANCHORS_SPACE.sub(r'\1', content)
            content = clean_gatha_quotes(content)
            
            # Process padas: if separated by comma, wrap each pada in <span class="gatha-pada">
            if ',' in content and re.search(r',(?![^<]*>)', content):
                parts = RE_COMMA_SPLIT.split(content)
                padas = []
                for i, part in enumerate(parts):
                    p = clean_gatha_quotes(part.strip())
                    if i < len(parts) - 1:
                        p = RE_PADA_NON_FINAL.sub(r'၊\1', p)
                        if not RE_PADA_CHECK_PUNCT.search(p):
                            p = p + '၊'
                    else:
                        p = RE_PADA_NON_FINAL.sub(r'။\1', p)
                        if not RE_PADA_CHECK_SECTION.search(p):
                            p = p + '။'
                    p = clean_gatha_quotes(p)
                    padas.append(f'<span class="gatha-pada pada{i+1}">{p}</span>')
                res = ' '.join(padas)
                return f'<p{attrs}>{res}</p>'
            else:
                p = clean_gatha_quotes(content.strip())
                if 'gatha2' in cls_name or 'gatha4' in cls_name or 'gathalast' in cls_name:
                    p = re.sub(r'၊([’"”’\'\s]*(?:<[^>]+>[’"”’\'\s]*)*)$', r'။\1', p)
                p = clean_gatha_quotes(p)
                return f'<p{attrs}><span class="gatha-pada">{p}</span></p>'
        else:
            cleaned = RE_COMMA_REMOVE.sub('', content)
            return f'<p{attrs}>{cleaned}</p>'
            
    res_html = RE_P_TAG.sub(repl_p, res_html)

    # 3. Protect Pali words (wrap in <span class="pali-word">) so browser never splits stacked consonants (+) across line breaks
    unspanned = RE_UNSPAN.sub(r'\1', res_html)
    parts = RE_HTML_TAGS.split(unspanned)
    res_parts = []
    for part in parts:
        if not part or part.startswith('<'):
            res_parts.append(part)
        else:
            def repl_w(m):
                w = m.group(0)
                if RE_SYMBOLS_ONLY.match(w):
                    return w
                if len(w) <= 35:
                    return f'<span class="pali-word">{w}</span>'
                else:
                    return RE_STACKED_CONJUNCT.sub(r'<span class="no-split">\1</span>', w)
            res_parts.append(RE_NON_SPACE.sub(repl_w, part))
    return ''.join(res_parts)

def format_chattasangayana_mm(html):
    if not html:
        return ""
    def repl_peyala(m):
        prefix = m.group(1)
        if prefix in ['။', '၊']:
            return f"{prefix} ။ ပ ။ "
        elif prefix:
            return f"{prefix}။ ပ ။ "
        else:
            return "။ ပ ။ "
            
    res = RE_PEYALA.sub(repl_peyala, html)
    res = RE_PEYALA_CLEAN_MM.sub('။ ပ ။ ', res)
    res = RE_MULTI_SPACES.sub(' ', res)

    # Protect stacked consonants in Myanmar translation text so virama (+) never splits across lines
    unspanned = RE_UNSPAN_NO_SPLIT.sub(r'\1', res)
    parts = RE_HTML_TAGS.split(unspanned)
    res_parts = []
    for part in parts:
        if not part or part.startswith('<'):
            res_parts.append(part)
        else:
            res_parts.append(RE_STACKED_CONJUNCT.sub(r'<span class="no-split">\1</span>', part))
    return ''.join(res_parts)

@lru_cache(maxsize=1024)
def _cached_format_pali(html):
    return format_chattasangayana_pali(html)

@lru_cache(maxsize=1024)
def _cached_format_mm(html):
    return format_chattasangayana_mm(html)


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

    mm_books_count = 0
    mm_pages_count = 0
    if os.path.exists(DB_MM_PATH):
        conn_m = get_mm_db()
        cur_m = conn_m.cursor()
        mm_books_count = cur_m.execute("SELECT count(*) FROM book").fetchone()[0]
        mm_pages_count = cur_m.execute("SELECT count(*) FROM mm_pages").fetchone()[0]

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

    companions = get_companion_books(book_id)

    return jsonify({
        "book": dict(book),
        "tocs": [dict(t) for t in tocs],
        "suttas": [dict(s) for s in suttas],
        "related": related,
        "matching_mm_book": matching_mm_book,
        "companions": companions
    })

def get_companion_books(book_id):
    if not os.path.exists(DB_PALI_PATH):
        return None
    conn = get_pali_db()
    cur = conn.cursor()
    cur_book = cur.execute("SELECT id, name, basket, category FROM books WHERE id = ?", (book_id,)).fetchone()
    if not cur_book:
        return None

    books = cur.execute("SELECT id, name, basket FROM books").fetchall()
    book_map = {b["id"]: {"id": b["id"], "name": b["name"], "basket": b["basket"]} for b in books}

    root_id = book_id if cur_book["basket"] == "mula" else None
    if not root_id:
        matches = cur.execute("SELECT base, exp FROM pali_attha_tika_match WHERE base = ? OR exp = ?", (book_id, book_id)).fetchall()
        for row in matches:
            other = row[1] if row[0] == book_id else row[0]
            if other in book_map and book_map[other]["basket"] == "mula":
                root_id = other
                break

    all_related = set()
    if root_id:
        all_related.add(root_id)
        matches = cur.execute("SELECT base, exp FROM pali_attha_tika_match WHERE base = ? OR exp = ?", (root_id, root_id)).fetchall()
        for row in matches:
            other = row[1] if row[0] == root_id else row[0]
            all_related.add(other)
    else:
        matches = cur.execute("SELECT base, exp FROM pali_attha_tika_match WHERE base = ? OR exp = ?", (book_id, book_id)).fetchall()
        for row in matches:
            other = row[1] if row[0] == book_id else row[0]
            all_related.add(other)

    mula_list = [book_map[b] for b in sorted(all_related) if b in book_map and book_map[b]["basket"] == "mula" and b != book_id]
    attha_list = [book_map[b] for b in sorted(all_related) if b in book_map and book_map[b]["basket"] == "attha" and b != book_id]
    tika_list = [book_map[b] for b in sorted(all_related) if b in book_map and book_map[b]["basket"] == "tika" and b != book_id]

    mm_list = []
    if os.path.exists(DB_MM_PATH):
        m_conn = get_mm_db()
        m_cur = m_conn.cursor()
        search_pali_ids = [book_id]
        if root_id and root_id != book_id:
            search_pali_ids.append(root_id)
        for pid in search_pali_ids:
            srcs = m_cur.execute("""
                SELECT sb.mm_book_id, b.name 
                FROM source_book sb 
                JOIN book b ON sb.mm_book_id = b.id 
                WHERE sb.pali_book_id = ?
            """, (pid,)).fetchall()
            for s in srcs:
                if not any(m["id"] == s[0] for m in mm_list):
                    mm_list.append({"id": s[0], "name": s[1]})

    return {
        "current": {
            "id": cur_book["id"],
            "name": cur_book["name"],
            "basket": cur_book["basket"]
        },
        "root_id": root_id,
        "mula": mula_list,
        "attha": attha_list,
        "tika": tika_list,
        "mm": mm_list
    }

@app.route("/api/pali/companions/<book_id>")
def api_pali_companions(book_id):
    res = get_companion_books(book_id)
    if not res:
        return jsonify({"error": "Book not found"}), 404
    return jsonify(res)

@app.route("/api/page/<book_id>/<int:page_num>")
def api_page(book_id, page_num):
    conn = get_pali_db()
    cur = conn.cursor()

    book = cur.execute("SELECT id, name, firstpage, lastpage, pagecount FROM books WHERE id = ?", (book_id,)).fetchone()
    if not book:
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
            # Try source_book and paragraph number with majority voting
            src = m_cur.execute("""
                SELECT sb.mm_book_id, b.name, sb.link_type
                FROM source_book sb
                JOIN book b ON sb.mm_book_id = b.id
                WHERE sb.pali_book_id = ?
            """, (book_id,)).fetchone()
            if src:
                mm_bid, mm_bname, ltype = src
                target_mm_pg = 1
                nums = []
                if page_row and page_row["paranum"]:
                    nums = [int(n) for n in str(page_row["paranum"]).split('-') if n.isdigit()]
                
                # Check content for paragraph markers if nums empty
                if not nums and page_row and page_row["content"]:
                    found = re.findall(r'para(\d+)', page_row["content"])
                    nums = [int(n) for n in found if n.isdigit()]

                if nums:
                    # Count frequency of target MM pages across all paragraph numbers on this page
                    # Pick the page that contains the majority of the paragraphs
                    page_counts = {}
                    for num in nums:
                        mp = m_cur.execute("SELECT page_number FROM paragraphs WHERE book_id = ? AND paragraph_number = ?", (mm_bid, num)).fetchone()
                        if mp:
                            pg = mp[0]
                            page_counts[pg] = page_counts.get(pg, 0) + 1
                    
                    if page_counts:
                        best_pg = max(page_counts.items(), key=lambda x: (x[1], x[0]))[0]
                        target_mm_pg = best_pg
                    else:
                        mp = m_cur.execute("SELECT page_number FROM paragraphs WHERE book_id = ? AND paragraph_number = ?", (mm_bid, nums[0])).fetchone()
                        if mp:
                            target_mm_pg = mp[0]

                matching_mm = {"book_id": mm_bid, "book_name": mm_bname, "page": target_mm_pg, "paragraphs": nums}

    content_html = page_row["content"] if page_row else "<p>ဤစာမျက်နှာအတွက် အချက်အလက်မရှိပါ။</p>"
    if content_html:
        content_html = _cached_format_pali(content_html)

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
    else:
        src = cur.execute("SELECT pali_book_id FROM source_book WHERE mm_book_id = ?", (book_id,)).fetchone()
        if src:
            p_bid = src[0]
            # Paragraphs to pali page with majority voting
            paras = cur.execute("SELECT paragraph_number FROM paragraphs WHERE book_id = ? AND page_number = ?", (book_id, page_num)).fetchall()
            target_pali_page = 1
            nums = [p[0] for p in paras]
            p_conn = get_pali_db()
            p_cur = p_conn.cursor()
            if nums:
                pali_page_counts = {}
                for num in nums:
                    p_page_row = p_cur.execute(f"SELECT page FROM pages WHERE book_id = ? AND paranum LIKE '%-{num}-%' LIMIT 1", (p_bid,)).fetchone()
                    if p_page_row:
                        pg = p_page_row[0]
                        pali_page_counts[pg] = pali_page_counts.get(pg, 0) + 1
                if pali_page_counts:
                    target_pali_page = max(pali_page_counts.items(), key=lambda x: (x[1], x[0]))[0]
                else:
                    p_page_row = p_cur.execute(f"SELECT page FROM pages WHERE book_id = ? AND paranum LIKE '%-{nums[0]}-%' LIMIT 1", (p_bid,)).fetchone()
                    if p_page_row:
                        target_pali_page = p_page_row[0]
            pb = p_cur.execute("SELECT name FROM books WHERE id = ?", (p_bid,)).fetchone()
            if pb:
                matching_pali = {"book_id": p_bid, "book_name": pb[0], "page": target_pali_page, "paragraphs": nums}

    content_html = page_row[0] if page_row else "<p>ဤစာမျက်နှာအတွက် အချက်အလက်မရှိပါ။</p>"
    if content_html:
        content_html = _cached_format_mm(content_html)

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

# ----------------- Paragraph Match API (Split View Sync) -----------------

@app.route("/api/match/para_to_page")
def api_match_para_to_page():
    pali_book_id = request.args.get("pali_book_id", "")
    mm_book_id = request.args.get("mm_book_id", "")
    para_num = request.args.get("para", type=int)

    if not para_num:
        return jsonify({"error": "para required"}), 400

    result = {"para": para_num}

    # 1. Lookup in Myanmar DB
    if os.path.exists(DB_MM_PATH):
        m_conn = get_mm_db()
        m_cur = m_conn.cursor()
        target_mm_id = mm_book_id
        if not target_mm_id and pali_book_id:
            src = m_cur.execute("SELECT mm_book_id FROM source_book WHERE pali_book_id = ?", (pali_book_id,)).fetchone()
            if src:
                target_mm_id = src[0]
        if target_mm_id:
            mp = m_cur.execute("SELECT page_number FROM paragraphs WHERE book_id = ? AND paragraph_number = ?", (target_mm_id, para_num)).fetchone()
            if mp:
                result["mm_book_id"] = target_mm_id
                result["mm_page"] = mp[0]

    # 2. Lookup in Pali DB
    if os.path.exists(DB_PALI_PATH):
        p_conn = get_pali_db()
        p_cur = p_conn.cursor()
        target_pali_id = pali_book_id
        if not target_pali_id and mm_book_id and os.path.exists(DB_MM_PATH):
            m_conn = get_mm_db()
            m_cur = m_conn.cursor()
            src = m_cur.execute("SELECT pali_book_id FROM source_book WHERE mm_book_id = ?", (mm_book_id,)).fetchone()
            if src:
                target_pali_id = src[0]
        if target_pali_id:
            p_page = p_cur.execute("SELECT page FROM pages WHERE book_id = ? AND paranum LIKE ? LIMIT 1", (target_pali_id, f"%-{para_num}-%")).fetchone()
            if p_page:
                result["pali_book_id"] = target_pali_id
                result["pali_page"] = p_page[0]

    return jsonify(result)

@app.route("/api/match/pali_to_companion")
def api_match_pali_to_companion():
    source_book = request.args.get("source_book", "").strip()
    source_page = request.args.get("source_page", type=int)
    target_type = request.args.get("target_type", "pali").strip()
    target_book = request.args.get("target_book", "").strip()
    target_books_raw = request.args.get("target_books", "").strip()

    candidate_targets = []
    if target_books_raw:
        candidate_targets = [b.strip() for b in target_books_raw.split(",") if b.strip()]
    elif target_book:
        candidate_targets = [target_book]

    if not source_book or not source_page:
        return jsonify({"error": "Missing source_book or source_page"}), 400

    if target_type == "mm":
        # Resolve MM candidate target if not specified
        if not candidate_targets and os.path.exists(DB_MM_PATH):
            m_conn = get_mm_db()
            m_cur = m_conn.cursor()
            src = m_cur.execute("SELECT mm_book_id FROM source_book WHERE pali_book_id = ?", (source_book,)).fetchone()
            if not src:
                p_conn = get_pali_db()
                p_cur = p_conn.cursor()
                p_matches = p_cur.execute("SELECT base, exp FROM pali_attha_tika_match WHERE base = ? OR exp = ?", (source_book, source_book)).fetchall()
                for r in p_matches:
                    oth = r[1] if r[0] == source_book else r[0]
                    src2 = m_cur.execute("SELECT mm_book_id FROM source_book WHERE pali_book_id = ?", (oth,)).fetchone()
                    if src2:
                        candidate_targets = [src2[0]]
                        break
            else:
                candidate_targets = [src[0]]

        if not candidate_targets:
            return jsonify({"matched": False, "target_book": None, "target_page": 1})

        mm_bid = candidate_targets[0]
        # Query source Pali page's paragraph numbers
        p_conn = get_pali_db()
        p_cur = p_conn.cursor()
        page_row = p_cur.execute("SELECT paranum, content FROM pages WHERE book_id = ? AND page = ?", (source_book, source_page)).fetchone()

        m_conn = get_mm_db()
        m_cur = m_conn.cursor()

        # Try page map first
        pmap = m_cur.execute("""
            SELECT mm_page_number FROM mm_pali_page_map 
            WHERE pali_book_id = ? AND pali_page_number = ? AND mm_book_id = ?
        """, (source_book, source_page, mm_bid)).fetchone()
        if pmap:
            return jsonify({"matched": True, "target_book": mm_bid, "target_page": pmap[0]})

        # Try paragraph numbers
        nums = []
        if page_row and page_row["paranum"]:
            nums = [int(n) for n in str(page_row["paranum"]).strip('-').split('-') if n.isdigit()]
        if not nums and page_row and page_row["content"]:
            found = re.findall(r'para(\d+)', page_row["content"])
            nums = [int(n) for n in found if n.isdigit()]

        if nums:
            for num in nums:
                mp = m_cur.execute("SELECT page_number FROM paragraphs WHERE book_id = ? AND paragraph_number = ?", (mm_bid, num)).fetchone()
                if mp:
                    return jsonify({"matched": True, "target_book": mm_bid, "target_page": mp[0], "matched_para": num})

        return jsonify({"matched": False, "target_book": mm_bid, "target_page": 1})

    else:
        # Match Pali to Pali companion (Mūla, Aṭṭhakathā, or Ṭīkā)
        p_conn = get_pali_db()
        p_cur = p_conn.cursor()

        page_row = p_cur.execute("SELECT paranum, content FROM pages WHERE book_id = ? AND page = ?", (source_book, source_page)).fetchone()
        nums = []
        if page_row and page_row["paranum"]:
            nums = [int(n) for n in str(page_row["paranum"]).strip('-').split('-') if n.isdigit()]
        if not nums and page_row and page_row["content"]:
            found = re.findall(r'para(\d+)', page_row["content"])
            nums = [int(n) for n in found if n.isdigit()]

        # Optimized In-Memory Scan: Query each candidate book's page & paranum once (indexed on book_id)
        # Avoids repeated O(N*M) full table scans with leading wildcard LIKE '%-num-%'
        target_pages_map = {}
        for t_bid in candidate_targets:
            rows = p_cur.execute(
                "SELECT page, paranum FROM pages WHERE book_id = ? AND paranum != '' AND paranum IS NOT NULL",
                (t_bid,)
            ).fetchall()
            target_pages_map[t_bid] = []
            for r in rows:
                p_nums = [int(n) for n in str(r["paranum"]).strip('-').split('-') if n.isdigit()]
                target_pages_map[t_bid].append((r["page"], p_nums))

        if nums:
            for t_bid in candidate_targets:
                for num in nums:
                    for page_no, t_nums in target_pages_map.get(t_bid, []):
                        if num in t_nums:
                            return jsonify({"matched": True, "target_book": t_bid, "target_page": page_no, "matched_para": num})

        # Preceding paragraphs fallback
        prev_row = p_cur.execute("SELECT paranum FROM pages WHERE book_id = ? AND page < ? AND paranum != '' ORDER BY page DESC LIMIT 1", (source_book, source_page)).fetchone()
        if prev_row:
            prev_nums = [int(n) for n in str(prev_row["paranum"]).strip('-').split('-') if n.isdigit()]
            if prev_nums:
                last_num = prev_nums[-1]
                for num in range(last_num, 0, -1):
                    for t_bid in candidate_targets:
                        for page_no, t_nums in target_pages_map.get(t_bid, []):
                            if num in t_nums:
                                return jsonify({"matched": True, "target_book": t_bid, "target_page": page_no, "matched_para": num})

        def_bid = candidate_targets[0] if candidate_targets else source_book
        b = p_cur.execute("SELECT firstpage FROM books WHERE id = ?", (def_bid,)).fetchone()
        first_pg = b["firstpage"] if b else 1
        return jsonify({"matched": False, "target_book": def_bid, "target_page": first_pg})

# ----------------- Dictionary APIs with In-Memory LRU Cache -----------------

@lru_cache(maxsize=16384)
def _cached_pali_dict_lookup(clean):
    """Zero-I/O memoized lookup for recurring Pali words."""
    conn = sqlite3.connect(DB_PALI_RO_URI, uri=True, check_same_thread=False)
    conn.row_factory = sqlite3.Row
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
            results = tuple(dict(r) for r in rows)
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
            results = tuple(dict(r) for r in rows)

    conn.close()
    return matched_word, results

@app.route("/api/dictionary/lookup")
def api_dict_lookup():
    raw_word = request.args.get("word", "").strip()
    if not raw_word:
        return jsonify({"word": "", "results": []})

    clean = clean_pali_word(raw_word)
    if not clean:
        return jsonify({"word": raw_word, "results": []})

    matched_word, results = _cached_pali_dict_lookup(clean)

    return jsonify({
        "query": raw_word,
        "clean_word": clean,
        "matched_word": matched_word,
        "results": list(results)
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
    if request.method == "GET":
        conn = get_pali_db()
        cur = conn.cursor()
        rows = cur.execute("""
            SELECT bm.book_id, b.name as book_name, bm.page_number, bm.note 
            FROM bookmark bm
            LEFT JOIN books b ON bm.book_id = b.id
            ORDER BY bm.rowid DESC
        """).fetchall()
        return jsonify([dict(r) for r in rows])

    elif request.method == "POST":
        data = request.json or {}
        book_id = data.get("book_id")
        page_num = data.get("page_number")
        note = data.get("note", "")
        if not book_id or not page_num:
            return jsonify({"error": "Missing book_id or page_number"}), 400
        conn = get_pali_db(readonly=False)
        cur = conn.cursor()
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
            conn = get_pali_db(readonly=False)
            cur = conn.cursor()
            cur.execute("DELETE FROM bookmark WHERE book_id = ? AND page_number = ?", (book_id, page_num))
            conn.commit()
            conn.close()
        return jsonify({"status": "success", "action": "deleted"})

@app.route("/api/recent", methods=["GET", "POST"])
def api_recent():
    if request.method == "GET":
        conn = get_pali_db()
        cur = conn.cursor()
        row = cur.execute("""
            SELECT r.book_id, b.name as book_name, r.page_number 
            FROM recent r
            JOIN books b ON r.book_id = b.id
            LIMIT 1
        """).fetchone()
        if row:
            return jsonify(dict(row))
        return jsonify({"book_id": "mula_vi_01", "book_name": "ပါရာဇိကပါဠိ", "page_number": 1})

    elif request.method == "POST":
        data = request.json or {}
        book_id = data.get("book_id")
        page_num = data.get("page_number")
        if book_id and page_num:
            conn = get_pali_db(readonly=False)
            cur = conn.cursor()
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
