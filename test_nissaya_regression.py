"""Static regression checks for the Myanmar Nissaya gloss layer (v7.64+).

The nissaya feature adds:
- backend: /api/nissaya/<book_id>/<page> + /api/nissaya/available/<book_id>,
  backed by an optional separate nissaya.db (graceful when absent)
- frontend: "မြန်မာ နိဿယ" toggle in the Reader More Sheet (အပြင်အဆင်),
  per-paragraph gloss injection after page render
- CSS: .nissaya-gloss styling

These checks avoid importing Flask or requiring the production DB.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
JS = (ROOT / "static/app.js").read_text(encoding="utf-8")
CSS = (ROOT / "static/app.css").read_text(encoding="utf-8")
HTML = (ROOT / "templates/index.html").read_text(encoding="utf-8")
PY = (ROOT / "app.py").read_text(encoding="utf-8")


def check(name, condition):
    if not condition:
        raise AssertionError(name)
    print(f"PASS {name}")


# --- backend ---
check("nissaya page endpoint exists", '@app.route("/api/nissaya/<book_id>/<int:page_num>")' in PY)
check("nissaya availability endpoint exists", '@app.route("/api/nissaya/available/<book_id>")' in PY)
check("nissaya db helper exists", "def get_nissaya_db():" in PY)
check("nissaya db path constant", 'DB_NISSAYA_PATH' in PY and 'nissaya.db' in PY)
check("nissaya degrades when db absent", "os.path.exists(DB_NISSAYA_PATH)" in PY)
check("nissaya connection closed on teardown", "g.pop('nissaya_db'" in PY)
check("nissaya api cached like page api", 'path.startswith("/api/nissaya/")' in PY)

# --- frontend HTML ---
check("nissaya toggle row in More Sheet", 'id="nissayaToggleRow"' in HTML)
check("nissaya toggle button exists", 'id="btnMoreToggleNissaya"' in HTML)
check("nissaya toggle label exists", 'id="moreNissayaStateText"' in HTML)
check("nissaya desktop toolbar button exists", 'id="btnToggleNissaya"' in HTML)
check("nissaya desktop toolbar label exists", 'id="toggleNissayaLabel"' in HTML)
check("nissaya search tab in pali group", 'data-mode="nissaya"' in HTML and 'id="paliTabsGroup"' in HTML)
check("nissaya search tab in mm group", 'data-mode="nissaya"' in HTML and 'id="mmTabsGroup"' in HTML)

# --- frontend JS ---
check("nissaya element refs", "btnMoreToggleNissaya" in JS and "moreNissayaStateText" in JS)
check("nissaya desktop element refs", "btnToggleNissaya" in JS and "toggleNissayaLabel" in JS)
check("nissaya state persisted", 'tipitaka_show_nissaya' in JS)
check("setNissayaVisibility defined", "function setNissayaVisibility(" in JS)
check("nissaya click handler wired", 'btnMoreToggleNissaya.addEventListener("click"' in JS)
check("nissaya desktop toolbar click handler wired", 'btnToggleNissaya.addEventListener("click"' in JS)
check("nissaya edition switcher card rendered", 'id="switcherCardNissaya"' in JS)
check("nissaya edition switcher click handler wired", 'type === "nissaya"' in JS)
check("nissaya search mode handled in performSearch", 'data.type === "nissaya"' in JS)
check("nissaya search result click navigation", 'targetType === "nissaya"' in JS)
check("nissaya hooked into post-render", "applyNissayaToCurrentPage()" in JS)
check("nissaya fetch uses page endpoint", "/api/nissaya/${encodeURIComponent(bookId)}/${page}" in JS)
check("nissaya injection targets para anchors", 'a[name^="para"]' in JS)
check("nissaya verses attach after gatha", "/^gatha/i.test" in JS)
check("nissaya hidden in MM mode", 'state.readerMode === "mm"' in JS)
check("nissaya responses cached", "nissayaCache" in JS)

# --- backend enhancements ---
check("nissaya search endpoint handled", 'stype == "nissaya"' in PY)
check("nissaya snippet helper exists", "def make_nissaya_snippet(" in PY)
check("jataka excluded from nissaya endpoint", "mula_ku_10" in PY)
check("attha/tika fallback logic exists", "pali_attha_tika_match" in PY and "paragraph_mapping" in PY)

check("nissaya feed append/prepend helper exists", "function applyNissayaToFeedSection(" in JS)
check("nissaya mode blocks helper exists", "function injectNissayaModeBlocks(" in JS)
check("nissaya injected on feed append", "applyNissayaToFeedSection(sec, bookId, actualPage)" in JS)
check("continue reading card uses setAppView", 'card.onclick' in JS and 'setAppView("reader")' in JS and 'showView' not in JS)
check("continue reading card supports nissaya", 'top.mode === "nissaya"' in JS)
check("2-hop tika fallback exists in backend", "2-hop" in PY and "pali_attha_tika_match" in PY)

# --- CSS ---
check("nissaya gloss styled", ".nissaya-gloss" in CSS)
check("nissaya desktop button active styled", ".tool-btn.nissaya-toggle-btn.active" in CSS)
check("nissaya edition layer active styled", ".edition-switcher-card.edition-layer-card.active-layer" in CSS)
check("nissaya search result styled", ".search-result-item.nissaya-search-item" in CSS)

print("All nissaya regression checks passed.")
