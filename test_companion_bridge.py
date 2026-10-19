"""Static regression checks for the Pāḷi ⇄ Aṭṭhakathā/Ṭīkā bridge (v7.76+).

The reader travels between the Pāḷi root text, its commentaries and the
translations from three surfaces:
  1. the Unified Edition Switcher modal ("ကျမ်းရွေး") — desktop header hub
     button (v7.78) *and* the mobile bottom toolbar,
  2. the "တွဲဖက်ကျမ်း" dropdown + split view on desktop, and
  3. the mobile drawer "ကျမ်းရွေး / တွဲဖက်ကျမ်းစာများ" button (v7.78).

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
  * (v7.78) The unified switcher must be reachable from the desktop header and
    from the mobile drawer, and it must expose a one-tap "↩ return" card.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
JS = (ROOT / "static/app.js").read_text(encoding="utf-8")
APP = (ROOT / "app.py").read_text(encoding="utf-8")
HTML = (ROOT / "templates/index.html").read_text(encoding="utf-8")


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

# --- v7.78: unified switcher reachable from every layout ---
check("desktop header has an edition-hub button", 'id="btnOpenEdition"' in HTML)
check("edition-hub button wired to the switcher",
      'el.btnOpenEdition.addEventListener("click"' in JS and "openEditionSwitcher();" in JS)
check("edition-hub reference registered in el",
      "btnOpenEdition: document.getElementById" in JS)

_mobile_handler = JS.split('el.btnOpenCompanionMobile.addEventListener("click"')[1].split("});")[0]
check("mobile drawer companion button opens the switcher",
      "openEditionSwitcher();" in _mobile_handler)
check("mobile companion row no longer toggles the hidden desktop dropdown",
      'el.relatedDropdownWrapper.classList.toggle("open");' not in _mobile_handler)

# --- v7.78: one-tap return + grouped companions inside the switcher ---
check("return-to-origin card is rendered", 'id="switcherCardReturn"' in JS)
check("return-to-origin card is handled", 'if (type === "origin")' in JS)
check("return card skips a duplicate of the Mula card",
      "originCoveredByPaliCard" in JS)
check("companion group label present", "edition-switcher-section-label" in JS)

print("ALL COMPANION BRIDGE CHECKS PASS")
