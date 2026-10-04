"""Shared building blocks for the illustrated PDF guides in docs/guides (ReportLab).

Provides fonts, text styles, story helpers (headings, steps, tables, callouts, figures),
a small kit for drawing OCI Console illustrations, and a document template with cover page.
Requires: pip install reportlab==4.2.5   (uses the Segoe UI / Consolas fonts that ship with Windows)
"""
import math
import os
import re

from reportlab.lib import colors
from reportlab.lib.fonts import addMapping
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon, Circle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
                                PageBreak, Preformatted, NextPageTemplate, CondPageBreak, KeepTogether)
from reportlab.platypus.tableofcontents import TableOfContents

# ---------------------------------------------------------------- fonts & colours
_F = r"C:\Windows\Fonts"
for _name, _file in [("Segoe", "segoeui.ttf"), ("Segoe-Bold", "segoeuib.ttf"), ("Segoe-Light", "segoeuisl.ttf"),
                     ("Consolas", "consola.ttf"), ("Consolas-Bold", "consolab.ttf")]:
    pdfmetrics.registerFont(TTFont(_name, os.path.join(_F, _file)))
for _b in (0, 1):
    for _i in (0, 1):
        addMapping("Segoe", _b, _i, "Segoe-Bold" if _b else "Segoe")
        addMapping("Consolas", _b, _i, "Consolas-Bold" if _b else "Consolas")

NAVY = colors.HexColor("#0a1222")
NAVY2 = colors.HexColor("#111c33")
TEAL = colors.HexColor("#0d9488")
CYAN = colors.HexColor("#22d3ee")
TEXT = colors.HexColor("#0f172a")
MUTED = colors.HexColor("#64748b")
BORDER = colors.HexColor("#e2e8f0")
SOFT = colors.HexColor("#f1f5f9")
CODE_BG = colors.HexColor("#0f172a")
CODE_FG = colors.HexColor("#e2e8f0")
BLUE = colors.HexColor("#2563eb")
GREEN = colors.HexColor("#16a34a")
AMBER = colors.HexColor("#d97706")
MARK = colors.HexColor("#e11d48")
CONSOLE_HEAD = colors.HexColor("#1f2937")
PRIMARY_BTN = colors.HexColor("#1f6feb")
DARK_BTN = colors.HexColor("#1f2937")

# ---------------------------------------------------------------- text styles
_base = dict(fontName="Segoe", fontSize=9.6, leading=14, textColor=TEXT)
S = {
    "body": ParagraphStyle("body", **_base, spaceAfter=6),
    "cell": ParagraphStyle("cell", **{**_base, "fontSize": 8.6, "leading": 11.6}),
    "cellh": ParagraphStyle("cellh", **{**_base, "fontName": "Segoe-Bold", "fontSize": 8.6, "leading": 11.6,
                                        "textColor": colors.white}),
    "h1": ParagraphStyle("h1", fontName="Segoe-Bold", fontSize=19, leading=24, textColor=NAVY, spaceBefore=4,
                         spaceAfter=10),
    "h2": ParagraphStyle("h2", fontName="Segoe-Bold", fontSize=13, leading=17, textColor=TEAL, spaceBefore=12,
                         spaceAfter=6),
    "toctitle": ParagraphStyle("toctitle", fontName="Segoe-Bold", fontSize=19, leading=24, textColor=NAVY,
                               spaceAfter=10),
    "bullet": ParagraphStyle("bullet", **_base, leftIndent=14, bulletIndent=3, spaceAfter=3),
    "step": ParagraphStyle("step", **_base, leftIndent=18, bulletIndent=0, spaceAfter=4),
    "code": ParagraphStyle("code", fontName="Consolas", fontSize=7.9, leading=10.6, textColor=CODE_FG),
    "caption": ParagraphStyle("caption", fontName="Segoe", fontSize=8, leading=11, textColor=MUTED, alignment=1,
                              spaceBefore=3, spaceAfter=12),
    "tocl1": ParagraphStyle("tocl1", fontName="Segoe-Bold", fontSize=10.5, leading=17, textColor=TEXT),
    "tocl2": ParagraphStyle("tocl2", fontName="Segoe", fontSize=9.2, leading=13.5, leftIndent=16, textColor=MUTED),
}


def md(text):
    """Tiny markup: escape XML, then **bold**, *italic* and `code`."""
    t = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"(?<![\*\w])\*(?!\*)(.+?)\*(?!\w)", r"<i>\1</i>", t)
    t = re.sub(r"`(.+?)`", r'<font face="Consolas" size="8.6" color="#0f766e">\1</font>', t)
    return t


class Story(list):
    """Flowable list with helpers for the common building blocks."""

    def __init__(self):
        super().__init__()
        self.fig_no = 0

    def p(self, t):
        self.append(Paragraph(md(t), S["body"]))

    def h1(self, t):
        self.append(CondPageBreak(70 * mm))
        self.append(Paragraph(t, S["h1"]))

    def h2(self, t):
        self.append(CondPageBreak(45 * mm))
        self.append(Paragraph(t, S["h2"]))

    def bullets(self, items):
        for it in items:
            self.append(Paragraph(md(it), S["bullet"], bulletText="•"))

    def steps(self, items, start=1):
        for n, it in enumerate(items, start):
            self.append(Paragraph(md(it), S["step"], bulletText=f"{n}."))

    def code(self, text):
        t = Table([[Preformatted(text.strip("\n"), S["code"])]], colWidths=[174 * mm])
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), CODE_BG),
                               ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                               ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
        self.extend([Spacer(1, 4), t, Spacer(1, 10)])

    def callout(self, kind, title, text):
        bg, fg = {"note": ("#eff6ff", "#2563eb"), "warn": ("#fffbeb", "#d97706"),
                  "danger": ("#fef2f2", "#dc2626"), "tip": ("#f0fdfa", "#0d9488")}[kind]
        p = Paragraph(f'<font face="Segoe-Bold" color="{fg}">{title}</font>&nbsp;&nbsp;{md(text)}', S["cell"])
        t = Table([[p]], colWidths=[174 * mm])
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
                               ("LINEBEFORE", (0, 0), (0, -1), 3, colors.HexColor(fg)),
                               ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                               ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
        self.extend([Spacer(1, 3), t, Spacer(1, 8)])

    def table(self, head, rows, widths):
        data = [[Paragraph(md(h), S["cellh"]) for h in head]]
        data += [[Paragraph(md(str(c)), S["cell"]) for c in r] for r in rows]
        t = Table(data, colWidths=[w * mm for w in widths], repeatRows=1)
        st = [("BACKGROUND", (0, 0), (-1, 0), NAVY2), ("VALIGN", (0, 0), (-1, -1), "TOP"),
              ("LINEBELOW", (0, 1), (-1, -1), 0.4, BORDER), ("BOX", (0, 0), (-1, -1), 0.4, BORDER),
              ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
              ("TOPPADDING", (0, 0), (-1, -1), 4.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5)]
        st += [("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f8fafc")) for i in range(2, len(data), 2)]
        t.setStyle(TableStyle(st))
        self.extend([t, Spacer(1, 10)])

    def figure(self, drawing, caption, illustration=True):
        self.fig_no += 1
        note = (" <i>(Illustration of the OCI Console; labels match the console, layout may differ slightly.)</i>"
                if illustration else "")
        cap = Paragraph(f"<b>Figure {self.fig_no}.</b> {md(caption)}{note}", S["caption"])
        self.append(KeepTogether([Spacer(1, 4), drawing, cap]))

    def toc_page(self):
        self.append(NextPageTemplate("body"))
        self.append(PageBreak())
        self.append(Paragraph("Contents", S["toctitle"]))
        toc = TableOfContents()
        toc.levelStyles = [S["tocl1"], S["tocl2"]]
        self.append(toc)
        self.append(PageBreak())


# =============================================================== drawing kit (console illustrations)
W = 494  # drawing width in points (= text width on A4 with 18 mm margins)


def txt(d, x, y, s, size=7.2, font="Segoe", color=TEXT, anchor="start"):
    d.add(String(x, y, s, fontName=font, fontSize=size, fillColor=color, textAnchor=anchor))


def rect(d, x, y, w, h, fill=colors.white, stroke=BORDER, r=3, sw=0.8, dash=None):
    d.add(Rect(x, y, w, h, rx=r, ry=r, fillColor=fill, strokeColor=stroke, strokeWidth=sw, strokeDashArray=dash))


def marker(d, x, y, n):
    """Numbered red circle pointing at the thing to click."""
    d.add(Circle(x, y, 7, fillColor=MARK, strokeColor=colors.white, strokeWidth=1.2))
    txt(d, x, y - 2.6, str(n), 7.5, "Segoe-Bold", colors.white, "middle")


def highlight(d, x, y, w, h):
    d.add(Rect(x - 2, y - 2, w + 4, h + 4, rx=4, ry=4, fillColor=None, strokeColor=MARK, strokeWidth=1.6))


def arrow(d, x1, y1, x2, y2, color=TEAL, width=1.4, label=None, lx=None, ly=None):
    d.add(Line(x1, y1, x2, y2, strokeColor=color, strokeWidth=width))
    a = math.atan2(y2 - y1, x2 - x1)
    p1 = (x2 - 6 * math.cos(a - 0.45), y2 - 6 * math.sin(a - 0.45))
    p2 = (x2 - 6 * math.cos(a + 0.45), y2 - 6 * math.sin(a + 0.45))
    d.add(Polygon([x2, y2, *p1, *p2], fillColor=color, strokeColor=color))
    if label:
        txt(d, lx if lx is not None else (x1 + x2) / 2, ly if ly is not None else (y1 + y2) / 2 + 4, label, 6.8,
            "Segoe-Bold", color, "middle")


def button(d, x, y, w, label, kind="primary", h=15):
    fill, stroke, fg = {"primary": (PRIMARY_BTN, PRIMARY_BTN, colors.white),
                        "dark": (DARK_BTN, DARK_BTN, colors.white),
                        "plain": (colors.white, colors.HexColor("#94a3b8"), TEXT)}[kind]
    rect(d, x, y, w, h, fill=fill, stroke=stroke, r=3)
    txt(d, x + w / 2, y + 4.6, label, 7, "Segoe-Bold", fg, "middle")


def field(d, x, y, w, label, value, h=15, select=False, placeholder=False):
    txt(d, x, y + h + 4, label, 6.8, "Segoe-Bold", TEXT)
    rect(d, x, y, w, h, stroke=colors.HexColor("#cbd5e1"), r=2)
    txt(d, x + 5, y + 4.6, value, 7.2, "Segoe", MUTED if placeholder else TEXT)
    if select:
        d.add(Polygon([x + w - 11, y + 9, x + w - 5, y + 9, x + w - 8, y + 5], fillColor=MUTED, strokeColor=MUTED))


def radio(d, x, y, label, on=False, sub=None):
    d.add(Circle(x + 4, y + 4, 4, fillColor=colors.white, strokeColor=PRIMARY_BTN if on else MUTED, strokeWidth=1))
    if on:
        d.add(Circle(x + 4, y + 4, 2.2, fillColor=PRIMARY_BTN, strokeColor=PRIMARY_BTN))
    txt(d, x + 12, y + 1.5, label, 7.2, "Segoe-Bold" if on else "Segoe", TEXT)
    if sub:
        txt(d, x + 12, y - 8, sub, 6.4, "Segoe", MUTED)


def pill(d, x, y, label, fill="#dcfce7", fg="#15803d"):
    from reportlab.pdfbase.pdfmetrics import stringWidth
    w = stringWidth(label, "Segoe-Bold", 6.6) + 12
    rect(d, x, y, w, 12, fill=colors.HexColor(fill), stroke=colors.HexColor(fill), r=6)
    txt(d, x + w / 2, y + 3.6, label, 6.6, "Segoe-Bold", colors.HexColor(fg), "middle")
    return w


def browser(h, url, crumb=None, region="South Africa Central (Johannesburg)"):
    """Browser window + console header. Returns (drawing, content_top_y)."""
    d = Drawing(W, h)
    rect(d, 0, 0, W, h, fill=colors.white, stroke=colors.HexColor("#cbd5e1"), r=6, sw=1)
    rect(d, 0, h - 20, W, 20, fill=colors.HexColor("#e2e8f0"), stroke=colors.HexColor("#cbd5e1"), r=6, sw=1)
    d.add(Rect(0.5, h - 20, W - 1, 8, fillColor=colors.HexColor("#e2e8f0"), strokeColor=None))
    for i, c in enumerate(["#f87171", "#fbbf24", "#34d399"]):
        d.add(Circle(10 + i * 10, h - 10, 3, fillColor=colors.HexColor(c), strokeColor=None))
    rect(d, 46, h - 16, W - 120, 12, fill=colors.white, stroke=colors.HexColor("#cbd5e1"), r=6)
    txt(d, 54, h - 12.3, url, 6.6, "Segoe", MUTED)
    d.add(Rect(0.5, h - 40, W - 1, 20, fillColor=CONSOLE_HEAD, strokeColor=None))
    for i in range(3):
        d.add(Line(9, h - 26.5 - i * 3.5, 19, h - 26.5 - i * 3.5, strokeColor=colors.white, strokeWidth=1.1))
    txt(d, 27, h - 33.5, "Cloud", 8, "Segoe-Bold", colors.white)
    rect(d, 140, h - 36, 140, 12, fill=colors.HexColor("#374151"), stroke=colors.HexColor("#4b5563"), r=3)
    txt(d, 147, h - 32.3, "Search resources, services...", 6.4, "Segoe", colors.HexColor("#9ca3af"))
    txt(d, W - 40, h - 33.3, region, 6.6, "Segoe", colors.white, "end")
    d.add(Circle(W - 22, h - 30, 6, fillColor=colors.HexColor("#4b5563"), strokeColor=None))
    top = h - 40
    if crumb:
        txt(d, 12, top - 13, crumb, 6.6, "Segoe", PRIMARY_BTN)
        top -= 18
    return d, top


def side_nav(d, top, title, items, active, width=120):
    """Left service navigation like the console's Compute / Networking side menu."""
    d.add(Rect(0.5, 0.5, width, top - 0.5, fillColor=colors.HexColor("#f8fafc"), strokeColor=BORDER))
    txt(d, 12, top - 18, title, 8.6, "Segoe-Bold", TEXT)
    for i, it in enumerate(items):
        y = top - 38 - i * 16
        if it == active:
            d.add(Rect(0.5, y - 4, width, 15, fillColor=colors.HexColor("#e2e8f0"), strokeColor=None))
        txt(d, 12, y, it, 7, "Segoe-Bold" if it == active else "Segoe", TEXT)


# ---------------------------------------------------------------- document template
class GuideDoc(BaseDocTemplate):
    """A4 guide: cover page + numbered body pages with header/footer and a clickable outline."""

    def __init__(self, path, title, subject, header, footer, cover):
        super().__init__(path, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=20 * mm,
                         bottomMargin=18 * mm, title=title, author="Naventra Platform", subject=subject)
        self.header, self.footer, self.cover = header, footer, cover
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="f")
        self.addPageTemplates([PageTemplate("cover", [frame], onPage=self._cover_page),
                               PageTemplate("body", [frame], onPage=self._body_page)])

    def afterFlowable(self, f):
        if isinstance(f, Paragraph) and f.style.name in ("h1", "h2"):
            text = f.getPlainText()
            level = 0 if f.style.name == "h1" else 1
            key = f"k{id(f)}"
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, level=level, closed=level > 0)
            self.notify("TOCEntry", (level, text, self.page, key))

    def _cover_page(self, c, doc):
        cv = self.cover
        w, h = A4
        c.saveState()
        c.setFillColor(NAVY)
        c.rect(0, 0, w, h, fill=1, stroke=0)
        c.setFillColor(NAVY2)
        c.rect(0, 0, w, h * 0.36, fill=1, stroke=0)
        cv["mark"](c, 18 * mm, h - 62 * mm)
        c.setFillColor(CYAN)
        c.setFont("Segoe-Bold", 9)
        c.drawString(18 * mm, h - 92 * mm, cv["eyebrow"])
        c.setFillColor(colors.white)
        c.setFont("Segoe-Bold", 28)
        for i, line in enumerate(cv["title"]):
            c.drawString(18 * mm, h - 107 * mm - i * 12 * mm, line)
        c.setFillColor(colors.HexColor("#cbd5e1"))
        c.setFont("Segoe-Light", 13)
        y0 = h - 107 * mm - len(cv["title"]) * 12 * mm - 3 * mm
        for i, line in enumerate(cv["subtitle"]):
            c.drawString(18 * mm, y0 - i * 7 * mm, line)
        y = h * 0.36 - 30 * mm
        for k, v in cv["facts"]:
            c.setFont("Segoe", 9.5)
            c.setFillColor(colors.HexColor("#64748b"))
            c.drawString(18 * mm, y, k.upper())
            c.setFillColor(colors.white)
            c.drawString(55 * mm, y, v)
            y -= 7.5 * mm
        c.setFillColor(cv["accent"])
        c.rect(0, 0, w, 3 * mm, fill=1, stroke=0)
        c.restoreState()

    def _body_page(self, c, doc):
        w, h = A4
        c.saveState()
        c.setStrokeColor(BORDER)
        c.setLineWidth(0.6)
        c.line(18 * mm, h - 13 * mm, w - 18 * mm, h - 13 * mm)
        c.setFont("Segoe-Bold", 8)
        c.setFillColor(BLUE)
        c.drawString(18 * mm, h - 11 * mm, self.header[0])
        c.setFont("Segoe", 8)
        c.setFillColor(MUTED)
        c.drawString(18 * mm + pdfmetrics.stringWidth(self.header[0], "Segoe-Bold", 8) + 3 * mm, h - 11 * mm,
                     self.header[1])
        c.drawRightString(w - 18 * mm, h - 11 * mm, self.header[2])
        c.line(18 * mm, 12 * mm, w - 18 * mm, 12 * mm)
        c.drawRightString(w - 18 * mm, 8 * mm, f"Page {doc.page}")
        c.drawString(18 * mm, 8 * mm, self.footer)
        c.restoreState()
