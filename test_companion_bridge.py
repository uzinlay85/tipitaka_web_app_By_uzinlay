"""Static regression checks for the Pāḷi ⇄ Aṭṭhakathā/Ṭīkā bridge (v7.76).

The reader travels between the Pāḷi root text and its commentaries from two
surfaces:
  1. the Unified Edition Switcher modal ("ကျမ်းရွေး") on mobile, and
  2. the "တွဲဖက်ကျမ်း" dropdown + split view on desktop.

These checks pin the fixes that made the return trip work, without importing
Flask or requiring the production databases:

  * The "မူလပါဠိတော်" card must resolve the Mūla *root* book — previously, when
    the reader stood inside an Aṭṭhakathā/Ṭīkā volume, the card pointed at that
    same commentary volume (so "return to Pāḷi" went nowhere) and it lost the
    matched page.
  * Paragraph click-through in the split view needs an approximate fallback
    page, because commentary volumes only mark a subset of paragraph numbers.
  * "➔ ဖတ်မည်" (open this companion book) must land on the matched page instead
    of page 1.
  * The removed v7.59 edition pills must not leave dangling handlers behind.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
JS = (ROOT / "static/app.js").read_text(encoding="utf-8")
APP = (ROOT / "app.py").read_text(encoding="utf-8")


def check(name, condition):
    if not condition:
        raise AssertionError(name)
    print(f"PASS {name}")


# --- Edition Switcher: Mūla card resolution ---
check("mula id helper exists", "function isMulaBookId(bookId)" in JS)
check("cached mula root helper exists", "function getCachedMulaRoot(bookId)" in JS)
check("mula card uses mula-only origin",
      "state.swapOrigin.mode === \"pali\" && isMulaBookId(state.swapOrigin.bookId)" in JS)
check("mula card title has a stable id", 'id="switcherPaliTitle"' in JS)
check("mula card page is matched while reading a commentary",
      "paliTargetId !== curBookId" in JS and "target_book=${encodeURIComponent(paliTargetId)}" in JS)
check("mula card title refreshed from companion payload",
      'comp.current.id === paliCard.getAttribute("data-book")' in JS)

# --- Companion "➔ ဖတ်မည်" lands on the matched page ---
check("matchCompanionPage helper exists", "async function matchCompanionPage(targetBookId, targetType)" in JS)
check("pali goto uses matched page", 'matchCompanionPage(relId, "pali")' in JS)
check("mm goto uses matched page", 'matchCompanionPage(mmId, "mm")' in JS)

# --- Removed edition pills leave no dangling code ---
check("no edition pill DOM queries", "edition-pill" not in JS)
check("no updateEditionPills calls", "updateEditionPills" not in JS)
check("no pill companion cache", "pillCompanions" not in JS)

# --- Backend: approximate paragraph fallback ---
check("nearest para helper exists", "def find_nearest_pali_para_page(" in APP)
check("para_to_page uses the nearest fallback", "find_nearest_pali_para_page(p_cur, target_pali_id, para_num)" in APP)
check("para_to_page handles mm paragraph gaps",
      "paragraph_number <= ? ORDER BY paragraph_number DESC LIMIT 1" in APP)
check("companion base prefers a mula volume", "WHERE m.exp = ? AND b.basket = 'mula'" in APP)

print("ALL COMPANION BRIDGE CHECKS PASS")
