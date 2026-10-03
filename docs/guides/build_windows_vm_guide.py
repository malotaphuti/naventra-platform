"""Generates docs/guides/OCI-Windows-VM-Guide.pdf.

Requires: pip install reportlab==4.2.5   (uses the Segoe UI / Consolas fonts that ship with Windows)
Run:      python docs/guides/build_windows_vm_guide.py

All figures are vector illustrations of the OCI Console drawn below (not screenshots).
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
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
                                PageBreak, Preformatted, NextPageTemplate, CondPageBreak, KeepTogether)
from reportlab.platypus.tableofcontents import TableOfContents

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "OCI-Windows-VM-Guide.pdf")
DATE = "3 October 2026"
VERSION = "1.0"

# ---------------------------------------------------------------- fonts & colours
F = r"C:\Windows\Fonts"
for name, file in [("Segoe", "segoeui.ttf"), ("Segoe-Bold", "segoeuib.ttf"), ("Segoe-Light", "segoeuisl.ttf"),
                   ("Consolas", "consola.ttf"), ("Consolas-Bold", "consolab.ttf")]:
    pdfmetrics.registerFont(TTFont(name, os.path.join(F, file)))
for b in (0, 1):
    for i in (0, 1):
        addMapping("Segoe", b, i, "Segoe-Bold" if b else "Segoe")
        addMapping("Consolas", b, i, "Consolas-Bold" if b else "Consolas")

NAVY = colors.HexColor("#0a1222")
NAVY2 = colors.HexColor("#111c33")
TEAL = colors.HexColor("#0d9488")
TEAL_L = colors.HexColor("#14b8a6")
CYAN = colors.HexColor("#22d3ee")
TEXT = colors.HexColor("#0f172a")
MUTED = colors.HexColor("#64748b")
BORDER = colors.HexColor("#e2e8f0")
SOFT = colors.HexColor("#f1f5f9")
CODE_BG = colors.HexColor("#0f172a")
CODE_FG = colors.HexColor("#e2e8f0")
WIN = colors.HexColor("#2563eb")          # Windows accent used in figures
MARK = colors.HexColor("#e11d48")         # numbered callout markers
CONSOLE_HEAD = colors.HexColor("#1f2937")
PRIMARY_BTN = colors.HexColor("#1f6feb")

# ---------------------------------------------------------------- text styles
base = dict(fontName="Segoe", fontSize=9.6, leading=14, textColor=TEXT)
S = {
    "body": ParagraphStyle("body", **base, spaceAfter=6),
    "cell": ParagraphStyle("cell", **{**base, "fontSize": 8.6, "leading": 11.6}),
    "cellh": ParagraphStyle("cellh", **{**base, "fontName": "Segoe-Bold", "fontSize": 8.6, "leading": 11.6,
                                        "textColor": colors.white}),
    "h1": ParagraphStyle("h1", fontName="Segoe-Bold", fontSize=19, leading=24, textColor=NAVY, spaceBefore=4,
                         spaceAfter=10),
    "h2": ParagraphStyle("h2", fontName="Segoe-Bold", fontSize=13, leading=17, textColor=TEAL, spaceBefore=12,
                         spaceAfter=6),
    "toctitle": ParagraphStyle("toctitle", fontName="Segoe-Bold", fontSize=19, leading=24, textColor=NAVY,
                               spaceAfter=10),
    "bullet": ParagraphStyle("bullet", **base, leftIndent=14, bulletIndent=3, spaceAfter=3),
    "step": ParagraphStyle("step", **base, leftIndent=18, bulletIndent=0, spaceAfter=4),
    "code": ParagraphStyle("code", fontName="Consolas", fontSize=7.9, leading=10.6, textColor=CODE_FG),
    "caption": ParagraphStyle("caption", fontName="Segoe", fontSize=8, leading=11, textColor=MUTED,
                              alignment=1, spaceBefore=3, spaceAfter=12),
    "tocl1": ParagraphStyle("tocl1", fontName="Segoe-Bold", fontSize=10.5, leading=17, textColor=TEXT),
    "tocl2": ParagraphStyle("tocl2", fontName="Segoe", fontSize=9.2, leading=13.5, leftIndent=16, textColor=MUTED),
}


def md(text):
    t = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"(?<![\*\w])\*(?!\*)(.+?)\*(?!\w)", r"<i>\1</i>", t)
    t = re.sub(r"`(.+?)`", r'<font face="Consolas" size="8.6" color="#0f766e">\1</font>', t)
    return t


story = []


def P(t):
    story.append(Paragraph(md(t), S["body"]))


def H1(t):
    story.append(CondPageBreak(70 * mm))
    story.append(Paragraph(t, S["h1"]))


def H2(t):
    story.append(CondPageBreak(45 * mm))
    story.append(Paragraph(t, S["h2"]))


def bullets(items):
    for it in items:
        story.append(Paragraph(md(it), S["bullet"], bulletText="•"))


def steps(items, start=1):
    for n, it in enumerate(items, start):
        story.append(Paragraph(md(it), S["step"], bulletText=f"{n}."))


def code(text):
    pre = Preformatted(text.strip("\n"), S["code"])
    t = Table([[pre]], colWidths=[174 * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), CODE_BG),
                           ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                           ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    story.extend([Spacer(1, 4), t, Spacer(1, 10)])


def callout(kind, title, text):
    bg, fg = {"note": ("#eff6ff", "#2563eb"), "warn": ("#fffbeb", "#d97706"),
              "danger": ("#fef2f2", "#dc2626"), "tip": ("#f0fdfa", "#0d9488")}[kind]
    p = Paragraph(f'<font face="Segoe-Bold" color="{fg}">{title}</font>&nbsp;&nbsp;{md(text)}', S["cell"])
    t = Table([[p]], colWidths=[174 * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
                           ("LINEBEFORE", (0, 0), (0, -1), 3, colors.HexColor(fg)),
                           ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                           ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
    story.extend([Spacer(1, 3), t, Spacer(1, 8)])


def table(head, rows, widths):
    data = [[Paragraph(md(h), S["cellh"]) for h in head]]
    data += [[Paragraph(md(str(c)), S["cell"]) for c in r] for r in rows]
    t = Table(data, colWidths=[w * mm for w in widths], repeatRows=1)
    st = [("BACKGROUND", (0, 0), (-1, 0), NAVY2), ("VALIGN", (0, 0), (-1, -1), "TOP"),
          ("LINEBELOW", (0, 1), (-1, -1), 0.4, BORDER), ("BOX", (0, 0), (-1, -1), 0.4, BORDER),
          ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
          ("TOPPADDING", (0, 0), (-1, -1), 4.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5)]
    st += [("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f8fafc")) for i in range(2, len(data), 2)]
    t.setStyle(TableStyle(st))
    story.extend([t, Spacer(1, 10)])


FIG = [0]


def figure(drawing, caption):
    FIG[0] += 1
    cap = Paragraph(f"<b>Figure {FIG[0]}.</b> {md(caption)} <i>(Illustration of the OCI Console; "
                    f"labels match the console, layout may differ slightly.)</i>", S["caption"])
    story.append(KeepTogether([Spacer(1, 4), drawing, cap]))


# =============================================================== DRAWING KIT (console illustrations)
W = 494  # drawing width in points (= text width)


def txt(d, x, y, s, size=7.2, font="Segoe", color=TEXT, anchor="start"):
    d.add(String(x, y, s, fontName=font, fontSize=size, fillColor=color, textAnchor=anchor))


def rect(d, x, y, w, h, fill=colors.white, stroke=BORDER, r=3, sw=0.8, dash=None):
    d.add(Rect(x, y, w, h, rx=r, ry=r, fillColor=fill, strokeColor=stroke, strokeWidth=sw, strokeDashArray=dash))


def marker(d, x, y, n):
    """Numbered red circle used to point at the thing to click."""
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


def button(d, x, y, w, label, primary=True, h=15):
    rect(d, x, y, w, h, fill=PRIMARY_BTN if primary else colors.white,
         stroke=PRIMARY_BTN if primary else colors.HexColor("#94a3b8"), r=3)
    txt(d, x + w / 2, y + 4.6, label, 7, "Segoe-Bold", colors.white if primary else TEXT, "middle")


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


def checkbox(d, x, y, label, on=False):
    rect(d, x, y, 8, 8, fill=PRIMARY_BTN if on else colors.white, stroke=PRIMARY_BTN if on else MUTED, r=1.5)
    if on:
        d.add(Line(x + 1.8, y + 4, x + 3.6, y + 2, strokeColor=colors.white, strokeWidth=1.2))
        d.add(Line(x + 3.6, y + 2, x + 6.5, y + 6.2, strokeColor=colors.white, strokeWidth=1.2))
    txt(d, x + 13, y + 1.5, label, 7.2, "Segoe", TEXT)


def browser(h, url, crumb=None, region="South Africa Central (Johannesburg)"):
    """Browser window + console header. Returns (drawing, content_top_y)."""
    d = Drawing(W, h)
    rect(d, 0, 0, W, h, fill=colors.white, stroke=colors.HexColor("#cbd5e1"), r=6, sw=1)
    # browser chrome
    rect(d, 0, h - 20, W, 20, fill=colors.HexColor("#e2e8f0"), stroke=colors.HexColor("#cbd5e1"), r=6, sw=1)
    d.add(Rect(0.5, h - 20, W - 1, 8, fillColor=colors.HexColor("#e2e8f0"), strokeColor=None))
    for i, c in enumerate(["#f87171", "#fbbf24", "#34d399"]):
        d.add(Circle(10 + i * 10, h - 10, 3, fillColor=colors.HexColor(c), strokeColor=None))
    rect(d, 46, h - 16, W - 120, 12, fill=colors.white, stroke=colors.HexColor("#cbd5e1"), r=6)
    txt(d, 54, h - 12.3, url, 6.6, "Segoe", MUTED)
    # console header
    d.add(Rect(0.5, h - 40, W - 1, 20, fillColor=CONSOLE_HEAD, strokeColor=None))
    for i in range(3):
        d.add(Line(9, h - 26.5 - i * 3.5, 19, h - 26.5 - i * 3.5, strokeColor=colors.white, strokeWidth=1.1))
    txt(d, 27, h - 33.5, "Cloud Console", 8, "Segoe-Bold", colors.white)
    rect(d, 140, h - 36, 140, 12, fill=colors.HexColor("#374151"), stroke=colors.HexColor("#4b5563"), r=3)
    txt(d, 147, h - 32.3, "Search resources, services...", 6.4, "Segoe", colors.HexColor("#9ca3af"))
    txt(d, W - 40, h - 33.3, region, 6.6, "Segoe", colors.white, "end")
    d.add(Circle(W - 22, h - 30, 6, fillColor=colors.HexColor("#4b5563"), strokeColor=None))
    top = h - 40
    if crumb:
        txt(d, 12, top - 13, crumb, 6.6, "Segoe", PRIMARY_BTN)
        top -= 18
    return d, top


def panel_title(d, x, y, t, size=11):
    txt(d, x, y, t, size, "Segoe-Bold", TEXT)


# --------------------------------------------------------------- figures
def fig_architecture():
    d = Drawing(W, 230)
    rect(d, 0, 70, 98, 80, fill=colors.HexColor("#f8fafc"))
    txt(d, 49, 132, "Your computer", 8, "Segoe-Bold", TEXT, "middle")
    rect(d, 22, 96, 54, 30, fill=colors.HexColor("#dbeafe"), stroke=WIN)
    txt(d, 49, 108, "RDP client", 6.8, "Segoe-Bold", WIN, "middle")
    txt(d, 49, 82, "Remote Desktop / Windows App", 6, "Segoe", MUTED, "middle")
    # cloud internet
    rect(d, 118, 92, 60, 36, fill=colors.white, stroke=colors.HexColor("#94a3b8"), r=14, dash=(3, 2))
    txt(d, 148, 107, "Internet", 7.4, "Segoe-Bold", MUTED, "middle")
    arrow(d, 98, 110, 118, 110, WIN)
    # OCI
    rect(d, 196, 4, 298, 222, fill=colors.HexColor("#fff7ed"), stroke=colors.HexColor("#fdba74"), r=6)
    txt(d, 345, 213, "Oracle Cloud Infrastructure - region (e.g. Johannesburg)", 7.6, "Segoe-Bold",
        colors.HexColor("#c2410c"), "middle")
    rect(d, 206, 12, 278, 192, fill=colors.HexColor("#fffbeb"), stroke=colors.HexColor("#fcd34d"), r=5, dash=(3, 2))
    txt(d, 345, 192, "VCN 10.0.0.0/16  -  Internet Gateway", 7.2, "Segoe-Bold", colors.HexColor("#92400e"), "middle")
    rect(d, 216, 20, 258, 160, fill=colors.white, stroke=colors.HexColor("#cbd5e1"), r=5)
    txt(d, 345, 168, "Public subnet 10.0.0.0/24", 7.2, "Segoe-Bold", TEXT, "middle")
    # security list
    rect(d, 226, 120, 110, 38, fill=colors.HexColor("#fef2f2"), stroke=colors.HexColor("#fca5a5"))
    txt(d, 281, 146, "Security List", 7.2, "Segoe-Bold", colors.HexColor("#b91c1c"), "middle")
    txt(d, 281, 136, "Ingress TCP 3389", 6.6, "Segoe", TEXT, "middle")
    txt(d, 281, 127, "from YOUR-IP/32 only", 6.6, "Segoe", TEXT, "middle")
    # VM
    rect(d, 354, 40, 110, 118, fill=colors.HexColor("#eff6ff"), stroke=WIN, sw=1.2)
    for i in range(2):
        for j in range(2):
            d.add(Rect(392 + j * 9, 130 - i * 9, 8, 8, fillColor=WIN, strokeColor=None))
    txt(d, 409, 113, "Windows Server VM", 7.6, "Segoe-Bold", WIN, "middle")
    txt(d, 409, 103, "Shape VM.Standard.E4.Flex", 6.4, "Segoe", TEXT, "middle")
    txt(d, 409, 94, "2 OCPU / 16 GB RAM", 6.4, "Segoe", TEXT, "middle")
    txt(d, 409, 85, "Public IP 129.151.x.x", 6.4, "Segoe", TEXT, "middle")
    rect(d, 368, 48, 82, 26, fill=colors.white, stroke=colors.HexColor("#94a3b8"))
    txt(d, 409, 63, "Boot volume", 6.8, "Segoe-Bold", TEXT, "middle")
    txt(d, 409, 54, "256 GB (C:)", 6.4, "Segoe", MUTED, "middle")
    arrow(d, 178, 110, 226, 132, WIN, 1.4, "RDP :3389", 200, 128)
    arrow(d, 336, 139, 354, 120, WIN)
    txt(d, 270, 32, "Steps 1-4 build the network,", 6.6, "Segoe", MUTED, "middle")
    txt(d, 270, 24, "steps 5-9 create the VM.", 6.6, "Segoe", MUTED, "middle")
    return d


def fig_menu():
    d, top = browser(250, "cloud.oracle.com/?region=af-johannesburg-1")
    # navigation drawer
    rect(d, 0.5, 0.5, 170, top - 0.5, fill=colors.HexColor("#f8fafc"), stroke=BORDER, r=0)
    for i, (item, on) in enumerate([("Home", False), ("Compute", True), ("Storage", False), ("Networking", False),
                                    ("Oracle Database", False), ("Identity & Security", False),
                                    ("Billing & Cost Management", False)]):
        y = top - 22 - i * 22
        if on:
            d.add(Rect(0.5, y - 6, 170, 20, fillColor=colors.HexColor("#e0f2fe"), strokeColor=None))
        txt(d, 14, y, item, 7.6, "Segoe-Bold" if on else "Segoe", TEXT)
    rect(d, 171, 40, 160, top - 50, fill=colors.white, stroke=BORDER)
    txt(d, 182, top - 22, "Compute", 9, "Segoe-Bold", TEXT)
    for i, item in enumerate(["Overview", "Instances", "Dedicated Virtual Machine Hosts", "Instance Configurations",
                              "Instance Pools", "Custom Images"]):
        y = top - 44 - i * 18
        txt(d, 182, y, item, 7.4, "Segoe-Bold" if item == "Instances" else "Segoe",
            PRIMARY_BTN if item == "Instances" else TEXT)
    highlight(d, 179, top - 68, 52, 13)
    marker(d, 14, top - 6, 1)
    marker(d, 160, top - 41, 2)
    marker(d, 240, top - 61, 3)
    # region picker emphasis
    highlight(d, W - 175, 214, 138, 13)
    marker(d, W - 182, 220, "R")
    txt(d, 400, 60, "Check the region (top right)", 7, "Segoe-Bold", MARK, "middle")
    txt(d, 400, 50, "before creating anything.", 7, "Segoe", MARK, "middle")
    return d


def fig_vcn_wizard():
    d, top = browser(240, "cloud.oracle.com/networking/vcns", "Networking  >  Virtual Cloud Networks")
    panel_title(d, 14, top - 14, "Virtual Cloud Networks in fleet-demo Compartment", 10)
    button(d, 14, top - 40, 70, "Create VCN", False)
    button(d, 90, top - 40, 88, "Start VCN Wizard", True)
    highlight(d, 90, top - 40, 88, 15)
    marker(d, 186, top - 32, 1)
    # modal
    rect(d, 150, 14, 330, top - 64, fill=colors.white, stroke=colors.HexColor("#94a3b8"), r=4, sw=1)
    txt(d, 162, top - 72, "Start VCN Wizard", 9.5, "Segoe-Bold", TEXT)
    rect(d, 162, top - 122, 306, 38, fill=colors.HexColor("#eff6ff"), stroke=PRIMARY_BTN)
    radio(d, 170, top - 99, "Create VCN with Internet Connectivity", True,
          "VCN, public & private subnets, internet gateway, NAT gateway, route rules")
    rect(d, 162, top - 162, 306, 32, stroke=BORDER)
    radio(d, 170, top - 142, "Add Internet Connectivity and Site-to-Site VPN to a VCN", False)
    marker(d, 156, top - 96, 2)
    button(d, 330, 22, 64, "Start VCN Wizard", True)
    button(d, 400, 22, 50, "Cancel", False)
    marker(d, 336 - 12, 30, 3)
    return d


def fig_vcn_config():
    d, top = browser(290, "cloud.oracle.com/networking/vcns/wizard", "Networking  >  VCN Wizard  >  Configuration")
    panel_title(d, 14, top - 14, "Create a VCN with Internet Connectivity", 10)
    # stepper
    for i, (s, on) in enumerate([("Configuration", True), ("Review and Create", False)]):
        d.add(Circle(22 + i * 120, top - 32, 6, fillColor=PRIMARY_BTN if on else colors.white,
                     strokeColor=PRIMARY_BTN, strokeWidth=1))
        txt(d, 22 + i * 120, top - 34.5, str(i + 1), 6.6, "Segoe-Bold", colors.white if on else PRIMARY_BTN, "middle")
        txt(d, 32 + i * 120, top - 34.5, s, 7, "Segoe-Bold" if on else "Segoe", TEXT)
    field(d, 14, top - 72, 220, "VCN name", "windows-demo-vcn")
    highlight(d, 14, top - 72, 220, 15)
    marker(d, 244, top - 64, 1)
    field(d, 254, top - 72, 220, "Compartment", "fleet-demo", select=True)
    txt(d, 14, top - 92, "Configure VCN", 8, "Segoe-Bold", TEXT)
    field(d, 14, top - 122, 140, "VCN IPv4 CIDR block", "10.0.0.0/16")
    txt(d, 14, top - 142, "Configure public subnet", 8, "Segoe-Bold", TEXT)
    field(d, 14, top - 172, 140, "IPv4 CIDR block", "10.0.0.0/24")
    txt(d, 254, top - 142, "Configure private subnet", 8, "Segoe-Bold", TEXT)
    field(d, 254, top - 172, 140, "IPv4 CIDR block", "10.0.1.0/24")
    txt(d, 170, top - 117, "Defaults are fine", 6.8, "Segoe-Bold", TEAL)
    button(d, 14, 12, 40, "Next", True)
    button(d, 60, 12, 46, "Cancel", False)
    marker(d, 34, 36, 2)
    txt(d, 120, 16, "then on the Review page click  Create", 7, "Segoe-Bold", TEAL)
    return d


def fig_ingress():
    d, top = browser(270, "cloud.oracle.com/networking/vcns/.../security-lists",
                     "Networking > VCNs > windows-demo-vcn > Security Lists > Default Security List")
    panel_title(d, 14, top - 14, "Add Ingress Rules", 10)
    txt(d, 14, top - 28, "Ingress Rule 1", 7.6, "Segoe-Bold", MUTED)
    checkbox(d, 14, top - 44, "Stateless", False)
    field(d, 14, top - 74, 150, "Source Type", "CIDR", select=True)
    field(d, 174, top - 74, 150, "Source CIDR", "203.0.113.25/32")
    highlight(d, 174, top - 74, 150, 15)
    marker(d, 334, top - 66, 1)
    txt(d, 344, top - 69, "your public IP + /32", 6.8, "Segoe-Bold", MARK)
    field(d, 14, top - 108, 150, "IP Protocol", "TCP", select=True)
    marker(d, 172, top - 100, 2)
    field(d, 14, top - 142, 150, "Source Port Range (optional)", "All", placeholder=True)
    field(d, 174, top - 142, 150, "Destination Port Range", "3389")
    highlight(d, 174, top - 142, 150, 15)
    marker(d, 334, top - 134, 3)
    field(d, 14, top - 176, 310, "Description", "Allow RDP from my office only")
    button(d, 14, 12, 92, "Add Ingress Rules", True)
    button(d, 112, 12, 46, "Cancel", False)
    marker(d, 116 - 6, 36, 4)
    rect(d, 344, 22, 140, 52, fill=colors.HexColor("#fef2f2"), stroke=colors.HexColor("#fca5a5"))
    txt(d, 414, 60, "Never use 0.0.0.0/0", 7.2, "Segoe-Bold", colors.HexColor("#b91c1c"), "middle")
    txt(d, 414, 49, "for port 3389. Open RDP is", 6.6, "Segoe", TEXT, "middle")
    txt(d, 414, 40, "scanned and brute-forced", 6.6, "Segoe", TEXT, "middle")
    txt(d, 414, 31, "within minutes.", 6.6, "Segoe", TEXT, "middle")
    return d


def fig_create_basic():
    d, top = browser(290, "cloud.oracle.com/compute/instances/create", "Compute  >  Instances  >  Create compute instance")
    # left stepper
    rect(d, 0.5, 0.5, 120, top - 0.5, fill=colors.HexColor("#f8fafc"), stroke=BORDER, r=0)
    for i, s in enumerate(["Basic information", "Security", "Networking", "Storage", "Review"]):
        on = i == 0
        y = top - 22 - i * 22
        d.add(Circle(16, y + 2.5, 5.5, fillColor=PRIMARY_BTN if on else colors.white, strokeColor=PRIMARY_BTN))
        txt(d, 16, y, str(i + 1), 6.4, "Segoe-Bold", colors.white if on else PRIMARY_BTN, "middle")
        txt(d, 27, y, s, 7.2, "Segoe-Bold" if on else "Segoe", TEXT)
    panel_title(d, 134, top - 16, "Basic information", 10)
    field(d, 134, top - 50, 200, "Name", "win-demo-01")
    highlight(d, 134, top - 50, 200, 15)
    marker(d, 344, top - 42, 1)
    field(d, 134, top - 84, 200, "Create in compartment", "fleet-demo", select=True)
    txt(d, 134, top - 104, "Placement", 8, "Segoe-Bold", TEXT)
    field(d, 134, top - 134, 200, "Availability domain", "AD-1", select=True)
    txt(d, 134, top - 158, "Image and shape", 8, "Segoe-Bold", TEXT)
    rect(d, 134, 14, 340, top - 178, fill=colors.white, stroke=BORDER)
    txt(d, 144, 38, "Image:  Oracle Linux 9 (default)", 7.2, "Segoe", TEXT)
    txt(d, 144, 24, "Shape:  VM.Standard.E4.Flex", 7.2, "Segoe", TEXT)
    button(d, 390, 34, 74, "Change image", False)
    highlight(d, 390, 34, 74, 15)
    marker(d, 382, 41, 2)
    return d


def fig_image():
    d, top = browser(310, "cloud.oracle.com/compute/instances/create", "Create compute instance  >  Select an image")
    panel_title(d, 14, top - 16, "Select an image", 10)
    for i, (t, on) in enumerate([("Platform images", True), ("Oracle images", False), ("Partner images", False),
                                 ("My images", False)]):
        txt(d, 14 + i * 84, top - 34, t, 7.4, "Segoe-Bold" if on else "Segoe", PRIMARY_BTN if on else MUTED)
        if on:
            d.add(Line(14, top - 38, 78, top - 38, strokeColor=PRIMARY_BTN, strokeWidth=1.6))
    cards = [("Oracle Linux", "#c2410c"), ("Ubuntu", "#ea580c"), ("Red Hat", "#dc2626"), ("CentOS", "#7c3aed"),
             ("Windows", "#2563eb"), ("AlmaLinux", "#0f766e")]
    for i, (name, c) in enumerate(cards):
        x = 14 + (i % 3) * 156
        y = top - 98 - (i // 3) * 52
        on = name == "Windows"
        rect(d, x, y, 148, 44, fill=colors.HexColor("#eff6ff") if on else colors.white,
             stroke=PRIMARY_BTN if on else BORDER, sw=1.4 if on else 0.8)
        d.add(Rect(x + 8, y + 14, 16, 16, fillColor=colors.HexColor(c), strokeColor=None))
        txt(d, x + 32, y + 24, name, 8, "Segoe-Bold", TEXT)
        txt(d, x + 32, y + 13, "Server 2022 Standard" if on else "Latest", 6.4, "Segoe", MUTED)
        if on:
            marker(d, x + 140, y + 38, 1)
    field(d, 14, top - 178, 220, "Image build", "Windows Server 2022 Standard", select=True)
    highlight(d, 14, top - 178, 220, 15)
    marker(d, 244, top - 170, 2)
    checkbox(d, 22, top - 200, "I have reviewed and accept the Microsoft license terms", True)
    marker(d, 11, top - 196, 3)
    button(d, 330, 12, 80, "Select image", True)
    button(d, 416, 12, 50, "Cancel", False)
    marker(d, 322, 20, 4)
    return d


def fig_shape():
    d, top = browser(292, "cloud.oracle.com/compute/instances/create", "Create compute instance  >  Browse all shapes")
    panel_title(d, 14, top - 16, "Browse all shapes", 10)
    txt(d, 14, top - 32, "Instance type:", 7.2, "Segoe-Bold", TEXT)
    radio(d, 80, top - 35, "Virtual machine", True)
    radio(d, 170, top - 35, "Bare metal machine", False)
    for i, (t, on, dis) in enumerate([("AMD", True, False), ("Intel", False, False), ("Ampere (Arm)", False, True),
                                      ("Specialty", False, False)]):
        x = 14 + i * 96
        rect(d, x, top - 74, 90, 26, fill=colors.HexColor("#eff6ff") if on else (SOFT if dis else colors.white),
             stroke=PRIMARY_BTN if on else BORDER, sw=1.3 if on else 0.8)
        txt(d, x + 45, top - 63, t, 7.6, "Segoe-Bold", MUTED if dis else TEXT, "middle")
        if dis:
            txt(d, x + 45, top - 71, "not available for Windows", 5.6, "Segoe", MARK, "middle")
    marker(d, 100, top - 50, 1)
    # shape table
    hy = top - 96
    d.add(Rect(14, hy, 466, 14, fillColor=SOFT, strokeColor=BORDER))
    for x, h in [(30, "Shape name"), (190, "OCPU"), (250, "Memory (GB)"), (340, "Network bandwidth")]:
        txt(d, x, hy + 4, h, 6.8, "Segoe-Bold", MUTED)
    rows = [("VM.Standard.E5.Flex", "1-94", "1-1049"), ("VM.Standard.E4.Flex", "1-64", "1-1024"),
            ("VM.Standard.E3.Flex", "1-100", "1-1024")]
    for i, (n, o, m) in enumerate(rows):
        y = hy - 16 - i * 16
        on = n == "VM.Standard.E4.Flex"
        if on:
            d.add(Rect(14, y - 4, 466, 16, fillColor=colors.HexColor("#eff6ff"), strokeColor=PRIMARY_BTN))
        d.add(Circle(22, y + 3, 3, fillColor=PRIMARY_BTN if on else colors.white, strokeColor=PRIMARY_BTN))
        txt(d, 30, y, n, 7.2, "Segoe-Bold" if on else "Segoe", TEXT)
        txt(d, 190, y, o, 7, "Segoe", TEXT)
        txt(d, 250, y, m, 7, "Segoe", TEXT)
        txt(d, 340, y, "Proportional to OCPUs", 7, "Segoe", MUTED)
    marker(d, 474, hy - 26, 2)
    # sliders
    for i, (label, val, frac) in enumerate([("Number of OCPUs", "2", 0.12), ("Amount of memory (GB)", "16", 0.22)]):
        y = 50 - i * 26
        txt(d, 14, y + 8, label, 7, "Segoe-Bold", TEXT)
        d.add(Line(130, y + 10, 380, y + 10, strokeColor=BORDER, strokeWidth=3))
        d.add(Line(130, y + 10, 130 + 250 * frac, y + 10, strokeColor=PRIMARY_BTN, strokeWidth=3))
        d.add(Circle(130 + 250 * frac, y + 10, 5, fillColor=colors.white, strokeColor=PRIMARY_BTN, strokeWidth=1.4))
        rect(d, 390, y + 3, 40, 14, stroke=colors.HexColor("#cbd5e1"))
        txt(d, 410, y + 7, val, 7.4, "Segoe-Bold", TEXT, "middle")
    marker(d, 444, 46, 3)
    button(d, 446, 4, 40, "Select", True)
    return d


def fig_network():
    d, top = browser(250, "cloud.oracle.com/compute/instances/create", "Create compute instance  >  Networking")
    panel_title(d, 14, top - 16, "Primary VNIC information", 10)
    radio(d, 14, top - 36, "Select existing virtual cloud network", True)
    radio(d, 200, top - 36, "Create new virtual cloud network", False)
    marker(d, 6, top - 22, 1)
    field(d, 14, top - 72, 220, "Virtual cloud network in fleet-demo", "windows-demo-vcn", select=True)
    field(d, 254, top - 72, 220, "Subnet in fleet-demo", "public subnet-windows-demo-vcn (regional)", select=True)
    highlight(d, 254, top - 72, 220, 15)
    marker(d, 482, top - 64, 2)
    txt(d, 14, top - 96, "Primary VNIC IP addresses", 8, "Segoe-Bold", TEXT)
    radio(d, 14, top - 114, "Automatically assign private IPv4 address", True)
    checkbox(d, 14, top - 132, "Automatically assign public IPv4 address", True)
    highlight(d, 12, top - 134, 184, 12)
    marker(d, 206, top - 128, 3)
    rect(d, 14, 14, 466, top - 160, fill=colors.HexColor("#f8fafc"), stroke=BORDER)
    txt(d, 24, top - 162, "Add SSH keys", 8, "Segoe-Bold", MUTED)
    txt(d, 24, top - 176, "Not used for Windows: you sign in with the 'opc' user and the initial password shown", 7,
        "Segoe", MUTED)
    txt(d, 24, top - 186, "on the instance page after it is created (Step 9).", 7, "Segoe", MUTED)
    return d


def fig_storage():
    d, top = browser(290, "cloud.oracle.com/compute/instances/create", "Create compute instance  >  Storage / Review")
    panel_title(d, 14, top - 16, "Boot volume", 10)
    checkbox(d, 14, top - 34, "Specify a custom boot volume size and performance setting", False)
    txt(d, 14, top - 50, "Default boot volume size for this Windows image: 256 GB  (Balanced, 10 VPUs/GB)", 7.2,
        "Segoe", TEXT)
    checkbox(d, 14, top - 68, "Use in-transit encryption", True)
    checkbox(d, 14, top - 84, "Encrypt this volume with a key that you manage", False)
    rect(d, 14, 46, 466, top - 130, fill=colors.HexColor("#f8fafc"), stroke=BORDER)
    txt(d, 24, top - 108, "Review", 8, "Segoe-Bold", TEXT)
    for i, (k, v) in enumerate([("Name", "win-demo-01"), ("Image", "Windows Server 2022 Standard"),
                                ("Shape", "VM.Standard.E4.Flex - 2 OCPU, 16 GB"),
                                ("Subnet", "public subnet-windows-demo-vcn"), ("Public IPv4", "Yes")]):
        txt(d, 24, top - 122 - i * 11, k, 7, "Segoe-Bold", MUTED)
        txt(d, 110, top - 122 - i * 11, v, 7, "Segoe", TEXT)
    button(d, 14, 14, 50, "Create", True)
    highlight(d, 14, 14, 50, 15)
    marker(d, 74, 21, 1)
    button(d, 90, 14, 90, "Save as stack", False)
    button(d, 186, 14, 46, "Cancel", False)
    txt(d, 300, 18, "Estimated cost is shown at the bottom of the page", 6.8, "Segoe", MUTED)
    return d


def fig_details():
    d, top = browser(270, "cloud.oracle.com/compute/instances/ocid1.instance...",
                     "Compute  >  Instances  >  Instance details")
    d.add(Rect(14, top - 60, 48, 48, fillColor=colors.HexColor("#dcfce7"), strokeColor=colors.HexColor("#16a34a")))
    txt(d, 38, top - 40, "RUNNING", 7, "Segoe-Bold", colors.HexColor("#15803d"), "middle")
    marker(d, 14, top - 10, 1)
    panel_title(d, 74, top - 22, "win-demo-01", 11)
    for i, b in enumerate(["Start", "Stop", "Reboot", "More actions"]):
        button(d, 74 + i * 56, top - 52, 52, b, False, 14)
    # tabs
    txt(d, 14, top - 78, "Details", 7.6, "Segoe-Bold", PRIMARY_BTN)
    d.add(Line(14, top - 82, 42, top - 82, strokeColor=PRIMARY_BTN, strokeWidth=1.6))
    for i, t in enumerate(["Networking", "Storage", "Security", "Monitoring"]):
        txt(d, 64 + i * 60, top - 78, t, 7.4, "Segoe", MUTED)
    rect(d, 14, 14, 226, top - 100, stroke=BORDER)
    txt(d, 24, top - 104, "Instance information", 8, "Segoe-Bold", TEXT)
    for i, (k, v) in enumerate([("Availability domain", "AD-1"), ("Shape", "VM.Standard.E4.Flex"),
                                ("OCPU count", "2"), ("Memory (GB)", "16"), ("Image", "Windows-Server-2022-Std..."),
                                ("Launch mode", "PARAVIRTUALIZED")]):
        txt(d, 24, top - 120 - i * 13, k, 7, "Segoe-Bold", MUTED)
        txt(d, 120, top - 120 - i * 13, v, 7, "Segoe", TEXT)
    rect(d, 252, 14, 228, top - 100, fill=colors.HexColor("#eff6ff"), stroke=PRIMARY_BTN, sw=1.2)
    txt(d, 262, top - 104, "Instance access", 8, "Segoe-Bold", TEXT)
    txt(d, 262, top - 120, "Public IP address", 7, "Segoe-Bold", MUTED)
    txt(d, 350, top - 120, "129.151.170.42", 7.4, "Segoe-Bold", TEXT)
    txt(d, 412, top - 120, "Copy", 7, "Segoe", PRIMARY_BTN)
    marker(d, 474, top - 117, 2)
    txt(d, 262, top - 138, "Username", 7, "Segoe-Bold", MUTED)
    txt(d, 350, top - 138, "opc", 7.4, "Segoe-Bold", TEXT)
    txt(d, 262, top - 156, "Initial password", 7, "Segoe-Bold", MUTED)
    txt(d, 350, top - 156, "••••••••••••••", 7.4, "Segoe-Bold", TEXT)
    txt(d, 412, top - 156, "Show  Copy", 7, "Segoe", PRIMARY_BTN)
    highlight(d, 260, top - 160, 212, 30)
    marker(d, 474, top - 147, 3)
    txt(d, 262, 30, "The initial password is one-time: Windows forces", 6.6, "Segoe", MUTED)
    txt(d, 262, 21, "you to change it at the first sign-in.", 6.6, "Segoe", MUTED)
    return d


def fig_rdp():
    d = Drawing(W, 210)
    # mstsc window
    rect(d, 0, 20, 236, 170, fill=colors.HexColor("#f8fafc"), stroke=colors.HexColor("#94a3b8"), r=4, sw=1)
    d.add(Rect(0.5, 170, 235, 19.5, fillColor=colors.white, strokeColor=None))
    txt(d, 10, 176, "Remote Desktop Connection", 7.6, "Segoe-Bold", TEXT)
    d.add(Rect(10, 130, 216, 32, fillColor=colors.HexColor("#1e40af"), strokeColor=None))
    txt(d, 20, 148, "Remote Desktop", 8, "Segoe-Light", colors.white)
    txt(d, 20, 137, "Connection", 10, "Segoe-Bold", colors.white)
    field(d, 14, 92, 206, "Computer:", "129.151.170.42", select=True)
    highlight(d, 14, 92, 206, 15)
    marker(d, 228, 100, 1)
    txt(d, 14, 74, "User name: None specified", 7, "Segoe", MUTED)
    txt(d, 14, 63, "You will be asked for credentials when you connect.", 6.6, "Segoe", MUTED)
    button(d, 120, 30, 50, "Connect", True)
    button(d, 176, 30, 46, "Help", False)
    marker(d, 112, 37, 2)
    # credentials dialog
    rect(d, 258, 20, 236, 170, fill=colors.white, stroke=colors.HexColor("#94a3b8"), r=4, sw=1)
    txt(d, 268, 176, "Windows Security", 7.6, "Segoe-Bold", TEXT)
    txt(d, 268, 158, "Enter your credentials", 10, "Segoe-Bold", TEXT)
    txt(d, 268, 146, "These credentials will be used to connect to 129.151.170.42.", 6.6, "Segoe", MUTED)
    rect(d, 268, 118, 214, 16, stroke=colors.HexColor("#cbd5e1"), r=2)
    txt(d, 274, 123, "opc", 7.4, "Segoe", TEXT)
    rect(d, 268, 96, 214, 16, stroke=colors.HexColor("#cbd5e1"), r=2)
    txt(d, 274, 101, "••••••••••••••", 7.4, "Segoe", TEXT)
    highlight(d, 268, 96, 214, 38)
    marker(d, 488, 126, 3)
    txt(d, 268, 82, "More choices  >  Use a different account", 6.6, "Segoe", PRIMARY_BTN)
    button(d, 330, 30, 70, "OK", True)
    button(d, 406, 30, 70, "Cancel", False)
    marker(d, 322, 37, 4)
    return d


def fig_cert_and_password():
    d = Drawing(W, 200)
    # certificate warning
    rect(d, 0, 10, 236, 180, fill=colors.white, stroke=colors.HexColor("#94a3b8"), r=4, sw=1)
    txt(d, 10, 176, "Remote Desktop Connection", 7.6, "Segoe-Bold", TEXT)
    d.add(Polygon([22, 140, 34, 160, 46, 140], fillColor=colors.HexColor("#f59e0b"), strokeColor=None))
    txt(d, 34, 144, "!", 9, "Segoe-Bold", colors.white, "middle")
    txt(d, 56, 152, "The identity of the remote computer", 7.6, "Segoe-Bold", TEXT)
    txt(d, 56, 141, "cannot be verified. Do you want to", 7.6, "Segoe-Bold", TEXT)
    txt(d, 56, 130, "connect anyway?", 7.6, "Segoe-Bold", TEXT)
    txt(d, 14, 110, "Name in the certificate: win-demo-01", 6.8, "Segoe", MUTED)
    txt(d, 14, 99, "The certificate is not from a trusted authority.", 6.8, "Segoe", MUTED)
    checkbox(d, 14, 74, "Don't ask me again for this computer", False)
    button(d, 110, 22, 56, "Yes", True)
    button(d, 172, 22, 56, "No", False)
    marker(d, 102, 29, 1)
    # change password screen
    d.add(Rect(258, 10, 236, 180, rx=4, ry=4, fillColor=colors.HexColor("#0b3a75"), strokeColor=None))
    txt(d, 376, 160, "The user's password must be changed", 8, "Segoe-Bold", colors.white, "middle")
    txt(d, 376, 149, "before signing in.", 8, "Segoe-Bold", colors.white, "middle")
    button(d, 350, 128, 52, "OK", False)
    marker(d, 342, 135, 2)
    for i, ph in enumerate(["opc", "Old password (initial)", "New password", "Confirm password"]):
        y = 102 - i * 20
        rect(d, 296, y, 160, 15, fill=colors.white, stroke=colors.HexColor("#cbd5e1"), r=1)
        txt(d, 302, y + 4.5, ph, 7, "Segoe", TEXT if i == 0 else MUTED)
    highlight(d, 296, 22, 160, 55)
    marker(d, 466, 50, 3)
    return d


def fig_actions():
    d, top = browser(230, "cloud.oracle.com/compute/instances/ocid1.instance...",
                     "Compute  >  Instances  >  win-demo-01")
    panel_title(d, 14, top - 18, "win-demo-01", 11)
    for i, b in enumerate(["Start", "Stop", "Reboot"]):
        button(d, 14 + i * 56, top - 44, 52, b, False, 14)
    button(d, 182, top - 44, 70, "More actions", False, 14)
    highlight(d, 70, top - 44, 52, 14)
    marker(d, 96, top - 22, 1)
    rect(d, 182, top - 134, 120, 86, fill=colors.white, stroke=colors.HexColor("#94a3b8"))
    for i, t in enumerate(["Create custom image", "Edit", "Move resource", "Add tags", "Terminate"]):
        txt(d, 192, top - 62 - i * 15, t, 7.2, "Segoe-Bold" if t == "Terminate" else "Segoe",
            colors.HexColor("#b91c1c") if t == "Terminate" else TEXT)
    marker(d, 310, top - 122, 2)
    rect(d, 320, 12, 164, 118, fill=colors.white, stroke=colors.HexColor("#94a3b8"), r=4, sw=1)
    txt(d, 330, 116, "Terminate instance", 8.5, "Segoe-Bold", TEXT)
    txt(d, 330, 102, "Are you sure you want to terminate", 6.8, "Segoe", MUTED)
    txt(d, 330, 93, "win-demo-01? This cannot be undone.", 6.8, "Segoe", MUTED)
    checkbox(d, 330, 70, "Permanently delete the attached", True)
    txt(d, 343, 61, "boot volume", 7.2, "Segoe", TEXT)
    marker(d, 476, 74, 3)
    button(d, 330, 22, 90, "Terminate instance", True)
    txt(d, 14, 40, "Stop  = pause billing for OCPU, memory", 7, "Segoe-Bold", TEAL)
    txt(d, 14, 30, "          and Windows licence (disk still billed)", 7, "Segoe", TEXT)
    txt(d, 14, 16, "Terminate  = delete the VM (and its disk if ticked)", 7, "Segoe-Bold", colors.HexColor("#b91c1c"))
    return d


# ---------------------------------------------------------------- page templates
class Doc(BaseDocTemplate):
    def __init__(self, fn):
        super().__init__(fn, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=20 * mm,
                         bottomMargin=18 * mm, title="How to Create a Windows Virtual Machine in OCI",
                         author="Naventra Platform", subject="Step-by-step Windows Server VM on Oracle Cloud")
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="f")
        self.addPageTemplates([PageTemplate("cover", [frame], onPage=cover_page),
                               PageTemplate("body", [frame], onPage=body_page)])

    def afterFlowable(self, f):
        if isinstance(f, Paragraph) and f.style.name in ("h1", "h2"):
            text = f.getPlainText()
            level = 0 if f.style.name == "h1" else 1
            key = f"k{id(f)}"
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, level=level, closed=level > 0)
            self.notify("TOCEntry", (level, text, self.page, key))


def cover_page(c, doc):
    w, h = A4
    c.saveState()
    c.setFillColor(NAVY)
    c.rect(0, 0, w, h, fill=1, stroke=0)
    c.setFillColor(NAVY2)
    c.rect(0, 0, w, h * 0.36, fill=1, stroke=0)
    # windows-style tile mark
    for i in range(2):
        for j in range(2):
            c.setFillColor(colors.HexColor("#3b82f6"))
            c.rect(18 * mm + j * 7.6 * mm, h - 55 * mm - i * 7.6 * mm, 7 * mm, 7 * mm, fill=1, stroke=0)
    c.setFillColor(CYAN)
    c.setFont("Segoe-Bold", 9)
    c.drawString(18 * mm, h - 92 * mm, "COMPLETE STEP-BY-STEP DEMO")
    c.setFillColor(colors.white)
    c.setFont("Segoe-Bold", 28)
    c.drawString(18 * mm, h - 107 * mm, "How to Create a Windows")
    c.drawString(18 * mm, h - 119 * mm, "Virtual Machine in OCI")
    c.setFillColor(colors.HexColor("#cbd5e1"))
    c.setFont("Segoe-Light", 13)
    c.drawString(18 * mm, h - 134 * mm, "Windows Server on Oracle Cloud Infrastructure, from an empty")
    c.drawString(18 * mm, h - 141 * mm, "account to a Remote Desktop session, with illustrated screens.")
    y = h * 0.36 - 30 * mm
    for k, v in [("Version", VERSION), ("Date", DATE), ("Time needed", "About 30-45 minutes"),
                 ("Level", "Beginner - no prior OCI experience needed")]:
        c.setFont("Segoe", 9.5)
        c.setFillColor(colors.HexColor("#64748b"))
        c.drawString(18 * mm, y, k.upper())
        c.setFillColor(colors.white)
        c.drawString(55 * mm, y, v)
        y -= 7.5 * mm
    c.setFillColor(colors.HexColor("#3b82f6"))
    c.rect(0, 0, w, 3 * mm, fill=1, stroke=0)
    c.restoreState()


def body_page(c, doc):
    w, h = A4
    c.saveState()
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.6)
    c.line(18 * mm, h - 13 * mm, w - 18 * mm, h - 13 * mm)
    c.setFont("Segoe-Bold", 8)
    c.setFillColor(WIN)
    c.drawString(18 * mm, h - 11 * mm, "Windows VM in OCI")
    c.setFont("Segoe", 8)
    c.setFillColor(MUTED)
    c.drawString(47 * mm, h - 11 * mm, "Complete step-by-step demo")
    c.drawRightString(w - 18 * mm, h - 11 * mm, f"v{VERSION} - {DATE}")
    c.line(18 * mm, 12 * mm, w - 18 * mm, 12 * mm)
    c.drawRightString(w - 18 * mm, 8 * mm, f"Page {doc.page}")
    c.drawString(18 * mm, 8 * mm, "Figures are illustrations of the OCI Console, not screenshots.")
    c.restoreState()


# =============================================================== CONTENT
story.append(NextPageTemplate("body"))
story.append(PageBreak())
story.append(Paragraph("Contents", S["toctitle"]))
toc = TableOfContents()
toc.levelStyles = [S["tocl1"], S["tocl2"]]
story.append(toc)
story.append(PageBreak())

# ---------------------------------------------------------------- overview
H1("1. What you will build")
P("By the end of this demo you will have a **Windows Server 2022** virtual machine running in Oracle Cloud "
  "Infrastructure (OCI) that you can use from your own computer over **Remote Desktop (RDP)**, exactly like a "
  "physical Windows server in a data centre.")
figure(fig_architecture(), "The finished setup: your RDP client reaches the Windows VM over the internet. "
       "A Security List rule only lets RDP in from your own IP address.")
table(["Part", "What it is", "Created in"], [
    ["Compartment", "A folder that groups your OCI resources and controls who can manage them.", "Step 2 (optional)"],
    ["VCN + public subnet", "Your private network in OCI, with a gateway to the internet.", "Step 3"],
    ["Security List rule", "Firewall rule allowing RDP (TCP 3389) from your IP only.", "Step 4"],
    ["Compute instance", "The Windows Server virtual machine (CPU, memory, public IP).", "Steps 5-9"],
    ["Boot volume", "The VM's C: drive (256 GB by default for Windows images).", "Step 8"],
], [34, 104, 36])
H2("The 13 steps at a glance")
table(["#", "Step", "#", "Step"], [
    ["1", "Sign in and choose your region", "8", "Configure the boot volume and create"],
    ["2", "(Optional) Create a compartment", "9", "Wait for RUNNING and copy the credentials"],
    ["3", "Create the virtual cloud network (VCN)", "10", "Connect with Remote Desktop"],
    ["4", "Allow RDP from your IP address", "11", "Change the initial password"],
    ["5", "Start creating the instance", "12", "Secure and update Windows"],
    ["6", "Choose the Windows Server image", "13", "Stop or delete the VM to control cost"],
    ["7", "Choose a shape and networking", "", ""],
], [8, 79, 8, 79])

# ---------------------------------------------------------------- prerequisites
H1("2. Before you begin")
table(["You need", "Details"], [
    ["An OCI account that can be billed", "Windows Server VMs are **not part of the Always Free tier**: Microsoft licensing is "
     "charged per OCPU per hour while the VM runs. A new **Free Trial** account's trial credits can pay for it, "
     "otherwise upgrade to **Pay As You Go**."],
    ["Permission to create resources", "If you are not the tenancy administrator, ask for a policy such as "
     "`Allow group <your-group> to manage all-resources in compartment <name>`."],
    ["Your public IP address", "Search \"what is my IP\" in your browser and note it, e.g. `203.0.113.25`. "
     "You will allow RDP only from this address."],
    ["A Remote Desktop client", "Windows: built-in **Remote Desktop Connection** (`mstsc`). macOS / iOS / Android: "
     "Microsoft **Windows App** (formerly Microsoft Remote Desktop). Linux: Remmina."],
], [44, 130])
callout("warn", "Cost.", "Billing for OCPU, memory and the Windows licence runs while the instance is "
        "**RUNNING**. Storage for the boot volume is billed until you delete it. Use OCI's Cost Estimator "
        "(oracle.com/cloud/costestimator.html) for current prices, and see Step 13 to stop or delete the VM "
        "when you're done with the demo.")
callout("note", "Windows needs an x86 shape.", "Windows images run only on AMD or Intel shapes, such as "
        "VM.Standard.E4.Flex, E5.Flex or Standard3.Flex. They can't use the Ampere (Arm) A1 shapes that are "
        "popular for free Linux VMs.")

# ---------------------------------------------------------------- steps
H1("3. Step-by-step demo")
H2("Step 1 - Sign in and choose your region")
steps([
    "Go to **cloud.oracle.com**, enter your **Cloud Account Name** (tenancy), click **Next** and sign in.",
    "Look at the **region** name at the top right of the console. Choose the region closest to the people who will "
    "use the VM, e.g. **South Africa Central (Johannesburg)**. Everything you create lives in this region.",
    "Open the navigation menu (the three lines at the top left). You will use **Networking** in Step 3 and "
    "**Compute > Instances** in Step 5.",
])
figure(fig_menu(), "Navigation menu: (1) open the menu, (2) Compute, (3) Instances. Confirm the region at the "
       "top right first.")

H2("Step 2 - (Optional) Create a compartment")
P("Compartments keep projects separate and make clean-up easy (delete everything inside one folder). "
  "Skip this step to use the default root compartment.")
steps([
    "Menu > **Identity & Security** > **Compartments** > **Create Compartment**.",
    "Name: `fleet-demo`; Description: `Windows VM demo`; Parent: your root compartment. Click **Create Compartment**.",
    "In every later screen, pick `fleet-demo` in the **Compartment** drop-down (usually on the left side of list pages).",
])

H2("Step 3 - Create the virtual cloud network (VCN)")
P("The VM needs a network with a route to the internet. The VCN Wizard builds all of it in one go.")
steps([
    "Menu > **Networking** > **Virtual Cloud Networks**. Make sure your compartment is selected.",
    "Click **Start VCN Wizard**, choose **Create VCN with Internet Connectivity** and click **Start VCN Wizard**.",
])
figure(fig_vcn_wizard(), "Start the VCN Wizard (1), choose 'Create VCN with Internet Connectivity' (2), confirm (3).")
steps([
    "Enter **VCN name** `windows-demo-vcn`. Leave the CIDR blocks at their defaults "
    "(VCN `10.0.0.0/16`, public subnet `10.0.0.0/24`, private subnet `10.0.1.0/24`).",
    "Click **Next**, review, then click **Create**. Wait until every item shows a green tick, then click **View VCN**.",
], start=3)
figure(fig_vcn_config(), "Name the VCN (1), keep the default address ranges, click Next (2) and then Create.")

H2("Step 4 - Allow RDP from your IP address")
P("By default the subnet only allows SSH (port 22). Windows Remote Desktop uses **TCP port 3389**, which you must open, "
  "but only for your own address.")
steps([
    "On the VCN page open **Security Lists** (in the left menu or the **Security** tab) and click "
    "**Default Security List for windows-demo-vcn**.",
    "Under **Ingress Rules** click **Add Ingress Rules** and fill in the values below, then click **Add Ingress Rules**.",
])
table(["Field", "Value"], [
    ["Stateless", "Unticked"],
    ["Source Type", "CIDR"],
    ["Source CIDR", "`<your-public-ip>/32`, e.g. `203.0.113.25/32` (the /32 means \"exactly this one address\")"],
    ["IP Protocol", "TCP"],
    ["Source Port Range", "Leave empty (All)"],
    ["Destination Port Range", "`3389`"],
    ["Description", "`Allow RDP from my office only`"],
], [44, 130])
figure(fig_ingress(), "Ingress rule for RDP: your IP /32 (1), TCP (2), port 3389 (3), then Add Ingress Rules (4).")
callout("danger", "Never open 3389 to 0.0.0.0/0.", "Bots scan the whole internet for open RDP ports and start "
        "guessing passwords within minutes. If your IP changes (home internet, travel), edit this rule rather than "
        "opening it to everyone. You can also delete the default SSH (22) rule; Windows doesn't need it.")

H2("Step 5 - Start creating the instance")
steps([
    "Menu > **Compute** > **Instances**, check the compartment, click **Create instance**.",
    "**Name**: `win-demo-01`. **Create in compartment**: `fleet-demo`.",
    "**Placement**: keep the suggested **Availability domain** (any works).",
    "In **Image and shape**, click **Change image**.",
])
figure(fig_create_basic(), "Basic information: name the instance (1), then Change image (2).")

H2("Step 6 - Choose the Windows Server image")
steps([
    "On the **Platform images** tab select **Windows**.",
    "In **Image build** choose **Windows Server 2022 Standard** (or the newest Windows Server version listed in your region).",
    "Read and accept the **Microsoft license terms** checkbox.",
    "Click **Select image**.",
])
figure(fig_image(), "Select Windows (1), pick the Windows Server build (2), accept the licence (3), Select image (4).")
callout("note", "Licence included.", "Oracle's Windows platform images include the Windows Server licence; you "
        "don't need your own product key. The licence cost is part of the hourly price while the VM runs.")

H2("Step 7 - Choose a shape and networking")
P("The **shape** is the size of the VM. Click **Change shape**, then:")
steps([
    "Instance type **Virtual machine**, shape series **AMD** (Ampere is not available for Windows).",
    "Select **VM.Standard.E4.Flex** (or E5.Flex).",
    "Set **Number of OCPUs** to **2** and **Amount of memory** to **16 GB**, then click **Select shape**.",
])
figure(fig_shape(), "AMD series (1), VM.Standard.E4.Flex (2), 2 OCPUs and 16 GB memory (3).")
table(["Use", "OCPUs", "Memory", "Notes"], [
    ["Quick demo / light admin tasks", "1", "8-16 GB", "Cheapest; Windows feels slow below 8 GB."],
    ["**Recommended for this demo**", "**2**", "**16 GB**", "Comfortable RDP desktop, small apps."],
    ["Small application server", "4", "32 GB", "IIS, SQL Server Express, build agents."],
], [52, 18, 26, 78])
P("One AMD **OCPU** equals two vCPUs (threads), so 2 OCPUs appear as 4 processors inside Windows.")
P("Now scroll to **Networking** (Primary VNIC information):")
steps([
    "Choose **Select existing virtual cloud network** and pick `windows-demo-vcn`.",
    "Choose **Select existing subnet** and pick the **public subnet** (not the private one).",
    "Make sure **Automatically assign public IPv4 address** is ticked.",
])
figure(fig_network(), "Existing VCN (1), the public subnet (2), and a public IPv4 address (3). SSH keys are not "
       "used for Windows.")

H2("Step 8 - Configure the boot volume and create")
steps([
    "In **Boot volume**, keep the default size (**256 GB** for Windows images) and leave **in-transit encryption** on.",
    "Check the **Review** summary: Windows image, E4.Flex shape, public subnet, public IP.",
    "Click **Create**. The instance appears with the state **PROVISIONING** (orange).",
])
figure(fig_storage(), "Keep the default boot volume, review the summary and click Create (1).")

H2("Step 9 - Wait for RUNNING and copy the credentials")
steps([
    "Wait until the state changes to **RUNNING** (green), usually 2-5 minutes.",
    "On the **Details** tab find **Instance access**. Copy the **Public IP address**.",
    "Note the **Username** (`opc`) and click **Show** / **Copy** next to **Initial password**.",
])
figure(fig_details(), "RUNNING (1), the public IP (2), and the one-time username/password (3) under Instance access.")
callout("tip", "Give Windows a few more minutes.", "RUNNING means the VM has booted, but Windows still finishes its "
        "first-boot setup (sysprep, network, RDP service) for another 3-10 minutes. If RDP doesn't connect straight away, "
        "wait and try again.")

H2("Step 10 - Connect with Remote Desktop")
P("**On Windows:** press **Win + R**, type `mstsc` and press Enter (or search for *Remote Desktop Connection*).")
steps([
    "In **Computer** paste the public IP and click **Connect**.",
    "In the credentials window choose **More choices > Use a different account**, enter user `opc` and the initial password, click **OK**.",
    "A certificate warning appears because the VM uses a self-signed certificate. Check the name matches your instance and click **Yes**.",
])
figure(fig_rdp(), "Remote Desktop Connection: enter the public IP (1), Connect (2), sign in as opc with the initial "
       "password (3), OK (4).")
code("""
:: Windows shortcut - opens Remote Desktop straight to the VM
mstsc /v:129.151.170.42
""")
table(["Your computer", "RDP client", "How"], [
    ["Windows 10/11", "Remote Desktop Connection", "`mstsc /v:<public-ip>`"],
    ["macOS / iPhone / iPad", "Windows App (App Store)", "Add PC > PC name = public IP > user `opc`"],
    ["Android", "Windows App (Play Store)", "Add PC > public IP"],
    ["Linux", "Remmina", "New connection, protocol RDP, server = public IP"],
], [36, 50, 88])

H2("Step 11 - Change the initial password")
steps([
    "Accept the certificate prompt (**Yes**).",
    "Windows shows **\"The user's password must be changed before signing in\"**. Click **OK**.",
    "Enter the initial password as the old password, then a new strong password twice. Windows requires at least "
    "12 characters with upper case, lower case, numbers and symbols. Store it in a password manager.",
])
figure(fig_cert_and_password(), "Accept the self-signed certificate (1), acknowledge the password change (2), set a "
       "new password (3).")
P("After the password change, the Windows Server desktop and **Server Manager** open. Your Windows VM is ready.")

H2("Step 12 - Secure and update Windows")
bullets([
    "**Windows Update:** Settings > Windows Update > **Check for updates**, install everything and restart (your RDP "
    "session drops; reconnect after 2-3 minutes).",
    "**Separate admin account:** create your own administrator user (Computer Management > Local Users and Groups) "
    "instead of using `opc` every day.",
    "**Keep RDP restricted:** if your IP changes, update the Security List rule from Step 4; never open it to everyone.",
    "**Keep the IP fixed (optional):** the public IP is *ephemeral* and changes if the instance is recreated. To keep it, "
    "go to the instance's **Attached VNICs > IPv4 Addresses** and convert it to a **Reserved public IP**.",
    "**Backups:** open the instance's **Boot volume** and assign a **backup policy** (e.g. Bronze/Silver/Gold) so OCI "
    "takes scheduled backups of C:.",
])
code("""
# In PowerShell on the VM (Run as Administrator) - useful first commands
Get-ComputerInfo -Property OsName, OsVersion, CsNumberOfLogicalProcessors, CsTotalPhysicalMemory
Get-NetFirewallRule -DisplayGroup "Remote Desktop" | Select DisplayName, Enabled
Set-TimeZone -Id "South Africa Standard Time"
""")

H2("Step 13 - Stop or delete the VM to control cost")
table(["Action", "What happens", "Billing"], [
    ["**Stop**", "Windows shuts down; VM keeps its disk and configuration.",
     "OCPU, memory and Windows licence charges stop. Boot volume storage continues."],
    ["**Start**", "VM boots again (the ephemeral public IP may change unless reserved).", "Charges resume."],
    ["**Terminate**", "VM is deleted. Tick *Permanently delete the attached boot volume* to delete C: too.",
     "All charges stop (once the boot volume is deleted)."],
], [24, 80, 70])
figure(fig_actions(), "Stop (1) pauses compute and licence billing; More actions > Terminate (2) deletes the VM, "
       "optionally with its boot volume (3).")
P("To remove the whole demo: terminate the instance (with its boot volume), then delete `windows-demo-vcn` "
  "(Networking > VCN > **Delete**, which also removes its subnets, gateways and security list), and finally the "
  "`fleet-demo` compartment if you created one.")

# ---------------------------------------------------------------- troubleshooting
H1("4. Troubleshooting")
table(["Problem", "Likely cause", "Fix"], [
    ["RDP: \"Remote Desktop can't connect to the remote computer\"",
     "Port 3389 not allowed from your current IP; Windows still finishing first boot",
     "Check the Step 4 rule matches your current public IP; wait 5-10 minutes after RUNNING and retry."],
    ["Worked yesterday, fails today", "Your home/office public IP changed", "Update the Source CIDR in the ingress rule."],
    ["\"Out of host capacity\" when creating", "No free capacity for that shape in that AD",
     "Pick another availability domain or another AMD/Intel shape (E5.Flex, Standard3.Flex)."],
    ["Windows not offered for the shape", "An Ampere (Arm) shape is selected", "Choose an AMD or Intel shape (Step 7)."],
    ["Initial password not shown", "Instance still provisioning, or it has been changed already",
     "Wait for RUNNING. If lost after changing it, use the instance **Console connection** to reset it, or recreate."],
    ["\"Service limit exceeded\"", "Tenancy quota for that shape is 0 or used up",
     "Governance & Administration > Limits, Quotas and Usage > request a limit increase."],
    ["Very slow desktop", "Too little memory/OCPU, or updates installing", "Resize: instance > Edit > shape (stop it first for some changes)."],
    ["Can't find the instance", "Wrong region or compartment selected", "Check the region (top right) and the compartment filter."],
], [46, 56, 72])

# ---------------------------------------------------------------- quick reference
H1("5. Quick reference card")
table(["Item", "Value used in this demo"], [
    ["Region", "South Africa Central (Johannesburg)"],
    ["Compartment", "`fleet-demo`"],
    ["VCN / subnet", "`windows-demo-vcn` 10.0.0.0/16, public subnet 10.0.0.0/24"],
    ["Ingress rule", "TCP 3389 from `<your-ip>/32`"],
    ["Instance name", "`win-demo-01`"],
    ["Image", "Windows Server 2022 Standard (platform image, licence included)"],
    ["Shape", "VM.Standard.E4.Flex, 2 OCPU / 16 GB"],
    ["Boot volume", "256 GB (default)"],
    ["Sign-in", "User `opc` + initial password (Instance access), changed at first login"],
    ["Connect", "`mstsc /v:<public-ip>`"],
], [40, 134])
H2("Checklist")
table(["Done", "Task"], [
    ["[ ]", "Correct region and compartment selected"],
    ["[ ]", "VCN created with the wizard (internet connectivity)"],
    ["[ ]", "Ingress rule TCP 3389 from my IP /32 only"],
    ["[ ]", "Instance created: Windows Server image, AMD/Intel shape, public subnet, public IPv4"],
    ["[ ]", "Instance RUNNING; public IP and initial password copied"],
    ["[ ]", "Connected with RDP and changed the initial password"],
    ["[ ]", "Windows Update run; boot volume backup policy assigned"],
    ["[ ]", "VM stopped or terminated when not needed"],
], [14, 160])

doc = Doc(OUT)
doc.multiBuild(story)
print("written", OUT)
