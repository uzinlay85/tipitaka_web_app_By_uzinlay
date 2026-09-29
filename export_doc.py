"""Export Tipitaka book pages to Word (.docx) / PDF.

The page HTML stored in the DB (classes: nikaya/book/chapter/bodytext/...)
is parsed into plain blocks, then rendered into:

- DOCX via python-docx  (pure python, no system deps; Word shapes Myanmar)
- PDF  via WeasyPrint   (Pango/HarfBuzz shapes Myanmar correctly;
                         uses the bundled Pyidaungsu TTF via @font-face,
                         needs libpango on the host - see VPS notes)
"""
import html as _html
import io
import os
import re
from html.parser import HTMLParser

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FONT_PATH = os.path.join(BASE_DIR, "static", "Pyidaungsu-2.5.3_Regular.ttf")

# p class -> block kind
_BLOCK_KIND = {
    "nikaya": "nikaya",
    "book": "book",
    "title": "book",
    "chapter": "chapter",
    "subhead": "chapter",
    "sub-head": "chapter",
    "centered": "center",
    "center": "center",
    "bodytext": "body",
    "noindentbodytext": "body",
    "body": "body",
    "hangnum": "body",
    "gatha": "verse",
    "gatha1": "verse",
    "gatha2": "verse",
    "gatha3": "verse",
}


class _BlockParser(HTMLParser):
    """Turn page HTML into a list of (kind, segments).

    segments: list of (text, bold) tuples; paranum spans become bold.
    """

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks = []
        self._kind = None
        self._segs = []
        self._bold = False
        self._skip_depth = 0  # inside <a ...> anchors (they are empty markers)

    def _flush(self):
        if self._kind is None:
            self._segs = []
            self._bold = False
            return
        text = "".join(t for t, _ in self._segs)
        text = re.sub(r"[ \t\xa0]+", " ", text).strip()
        # drop blocks that are only anchors/whitespace
        if text:
            # normalize internal newlines from <br>
            text = re.sub(r"\n{3,}", "\n\n", text)
            segs = [(t, b) for t, b in self._segs if t.strip()]
            if segs:
                self.blocks.append((self._kind, segs))
        self._kind = None
        self._segs = []
        self._bold = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a":
            self._skip_depth += 1
            return
        if self._skip_depth:
            return
        if tag == "p":
            self._flush()
            cls = (attrs.get("class") or "").split()
            kind = "body"
            for c in cls:
                if c in _BLOCK_KIND:
                    kind = _BLOCK_KIND[c]
                    break
            self._kind = kind
            self._segs = []
        elif tag == "br":
            if self._kind:
                self._segs.append(("\n", False))
        elif tag == "span" and "paranum" in (attrs.get("class") or ""):
            self._bold = True

    def handle_endtag(self, tag):
        if tag == "a":
            self._skip_depth = max(0, self._skip_depth - 1)
            return
        if self._skip_depth:
            return
        if tag == "p":
            self._flush()
        elif tag == "span":
            self._bold = False

    def handle_data(self, data):
        if self._skip_depth or self._kind is None:
            return
        self._segs.append((data, self._bold))


def parse_page(html_text):
    """Parse one page's HTML -> [(kind, [(text, bold), ...]), ...]."""
    p = _BlockParser()
    p.feed(html_text or "")
    p._flush()
    return p.blocks


def _iter_all_blocks(pages):
    """pages: list of (page_num, blocks)."""
    for page_num, blocks in pages:
        yield page_num, blocks


# ---------------------------------------------------------------- DOCX ---

def build_docx(book_name, pages, edition_label=""):
    from docx import Document
    from docx.shared import Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH

    doc = Document()

    # Base style: Pyidaungsu for Myanmar shaping in Word
    normal = doc.styles["Normal"]
    normal.font.name = "Pyidaungsu"
    normal.font.size = Pt(13)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.5

    for style_name, size, bold in (
        ("Heading 1", 17, True),
        ("Heading 2", 15, True),
        ("Heading 3", 13, True),
    ):
        st = doc.styles[style_name]
        st.font.name = "Pyidaungsu"
        st.font.size = Pt(size)
        st.font.bold = bold

    # Title page header
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run(book_name)
    run.font.size = Pt(20)
    run.font.bold = True
    run.font.name = "Pyidaungsu"
    if edition_label:
        sub = doc.add_paragraph()
        sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = sub.add_run(edition_label)
        r.font.size = Pt(13)
        r.font.name = "Pyidaungsu"
        r.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
    doc.add_page_break()

    total = len(pages)
    for idx, (page_num, blocks) in enumerate(_iter_all_blocks(pages)):
        label = doc.add_paragraph()
        label.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = label.add_run("— စာမျက်နှာ %d —" % page_num)
        r.font.size = Pt(10)
        r.font.color.rgb = RGBColor(0x99, 0x99, 0x99)
        r.font.name = "Pyidaungsu"

        for kind, segs in blocks:
            if kind == "nikaya":
                par = doc.add_paragraph(style="Heading 1")
                par.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif kind == "book":
                par = doc.add_paragraph(style="Heading 1")
                par.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif kind == "chapter":
                par = doc.add_paragraph(style="Heading 2")
            elif kind == "center":
                par = doc.add_paragraph()
                par.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif kind == "verse":
                par = doc.add_paragraph()
                par.paragraph_format.left_indent = Pt(24)
            else:
                par = doc.add_paragraph()
            for text, bold in segs:
                # split on <br> newlines into separate runs
                for j, chunk in enumerate(text.split("\n")):
                    if j:
                        par.add_run().add_break()
                    run = par.add_run(chunk)
                    run.font.name = "Pyidaungsu"
                    if bold:
                        run.font.bold = True
        if idx < total - 1:
            doc.add_page_break()

    core = doc.core_properties
    core.title = book_name
    core.author = "Tipitaka Web App"

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


# ----------------------------------------------------------------- PDF ---

_PDF_CSS = """
@font-face {{
    font-family: 'Pyidaungsu';
    src: url('{font_url}');
}}
@page {{
    size: A4;
    margin: 22mm 18mm 20mm 18mm;
    @top-center {{
        content: "{book_name}";
        font-family: 'Pyidaungsu', serif;
        font-size: 9pt;
        color: #888;
    }}
    @bottom-center {{
        content: "စာမျက်နှာ " counter(page);
        font-family: 'Pyidaungsu', serif;
        font-size: 9pt;
        color: #888;
    }}
}}
body {{
    font-family: 'Pyidaungsu', 'Noto Serif Myanmar', serif;
    font-size: 12.5pt;
    line-height: 1.9;
    color: #1a1a1a;
}}
.cover {{ text-align: center; margin-top: 90mm; page-break-after: always; }}
.cover h1 {{ font-size: 24pt; }}
.cover .edition {{ color: #666; font-size: 13pt; margin-top: 8mm; }}
.src-page {{ page-break-after: always; }}
.page-label {{ text-align: center; color: #999; font-size: 10pt; margin-bottom: 4mm; }}
h1.nikaya, h1.book {{ text-align: center; font-size: 16pt; margin: 6mm 0 4mm; }}
h2.chapter {{ font-size: 14pt; margin: 5mm 0 3mm; }}
p.center {{ text-align: center; }}
p.verse {{ margin-left: 10mm; }}
p.body {{ text-align: justify; margin: 0 0 2.5mm; }}
"""

_PDF_BODY_OPEN = """<html><head><meta charset="utf-8"><style>{css}</style></head><body>
<div class="cover"><h1>{book}</h1><div class="edition">{edition}</div></div>
"""


def build_pdf(book_name, pages, edition_label=""):
    from weasyprint import HTML

    font_url = "file://" + FONT_PATH
    css = _PDF_CSS.format(
        font_url=font_url,
        book_name=_html.escape(book_name).replace('"', ""),
    )
    parts = [
        _PDF_BODY_OPEN.format(
            css=css,
            book=_html.escape(book_name),
            edition=_html.escape(edition_label),
        )
    ]
    total = len(pages)
    for idx, (page_num, blocks) in enumerate(_iter_all_blocks(pages)):
        parts.append('<section class="src-page">')
        parts.append(
            '<div class="page-label">— စာမျက်နှာ %d —</div>' % page_num
        )
        for kind, segs in blocks:
            inner = []
            for text, bold in segs:
                esc = _html.escape(text).replace("\n", "<br>")
                inner.append("<b>%s</b>" % esc if bold else esc)
            html_inner = "".join(inner)
            if kind == "nikaya":
                parts.append("<h1 class=\"nikaya\">%s</h1>" % html_inner)
            elif kind == "book":
                parts.append("<h1 class=\"book\">%s</h1>" % html_inner)
            elif kind == "chapter":
                parts.append("<h2 class=\"chapter\">%s</h2>" % html_inner)
            elif kind == "center":
                parts.append("<p class=\"center\">%s</p>" % html_inner)
            elif kind == "verse":
                parts.append("<p class=\"verse\">%s</p>" % html_inner)
            else:
                parts.append("<p class=\"body\">%s</p>" % html_inner)
        parts.append("</section>")
    parts.append("</body></html>")
    return HTML(string="".join(parts)).write_pdf()


MAX_EXPORT_PAGES = 1000
