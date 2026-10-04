"""Generates docs/deployment/FleetOps-Deployment-Guide.pdf.

Requires: pip install reportlab==4.2.5   (uses the Segoe UI / Consolas fonts that ship with Windows)
Run:      python docs/deployment/build_guide.py
"""
import os
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table,
                                TableStyle, PageBreak, KeepTogether, Preformatted, NextPageTemplate,
                                CondPageBreak)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(HERE, "FleetOps-Deployment-Guide.pdf")
DATE = "3 October 2026"
VERSION = "1.0"

# ---------------------------------------------------------------- fonts & colours
F = r"C:\Windows\Fonts"
pdfmetrics.registerFont(TTFont("Segoe", F + r"\segoeui.ttf"))
pdfmetrics.registerFont(TTFont("Segoe-Bold", F + r"\segoeuib.ttf"))
pdfmetrics.registerFont(TTFont("Segoe-Light", F + r"\segoeuisl.ttf"))
pdfmetrics.registerFont(TTFont("Consolas", F + r"\consola.ttf"))
pdfmetrics.registerFont(TTFont("Consolas-Bold", F + r"\consolab.ttf"))
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

# ---------------------------------------------------------------- styles
base = dict(fontName="Segoe", fontSize=9.6, leading=14, textColor=TEXT)
S = {
    "body": ParagraphStyle("body", **base, spaceAfter=6),
    "small": ParagraphStyle("small", **{**base, "fontSize": 8.4, "leading": 11.5}),
    "cell": ParagraphStyle("cell", **{**base, "fontSize": 8.6, "leading": 11.6}),
    "cellh": ParagraphStyle("cellh", **{**base, "fontName": "Segoe-Bold", "fontSize": 8.6,
                                        "leading": 11.6, "textColor": colors.white}),
    "h1": ParagraphStyle("h1", fontName="Segoe-Bold", fontSize=19, leading=24, textColor=NAVY,
                         spaceBefore=4, spaceAfter=10),
    "h2": ParagraphStyle("h2", fontName="Segoe-Bold", fontSize=13, leading=17, textColor=TEAL,
                         spaceBefore=12, spaceAfter=6),
    "h3": ParagraphStyle("h3", fontName="Segoe-Bold", fontSize=10.5, leading=14, textColor=TEXT,
                         spaceBefore=8, spaceAfter=4),
    "bullet": ParagraphStyle("bullet", **base, leftIndent=14, bulletIndent=3, spaceAfter=3),
    "step": ParagraphStyle("step", **base, leftIndent=18, bulletIndent=0, spaceAfter=4),
    "code": ParagraphStyle("code", fontName="Consolas", fontSize=7.7, leading=10.2, textColor=CODE_FG),
    "toctitle": ParagraphStyle("toctitle", fontName="Segoe-Bold", fontSize=19, leading=24, textColor=NAVY,
                               spaceAfter=10),
    "tocl1": ParagraphStyle("tocl1", fontName="Segoe-Bold", fontSize=10.5, leading=17, textColor=TEXT),
    "tocl2": ParagraphStyle("tocl2", fontName="Segoe", fontSize=9.2, leading=13.5, leftIndent=16,
                            textColor=MUTED),
}


def md(text):
    """Tiny markup: escape XML, then **bold** and `code`."""
    t = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"`(.+?)`", r'<font face="Consolas" size="8.6" color="#0f766e">\1</font>', t)
    return t


story = []
P = lambda t, st="body": story.append(Paragraph(md(t), S[st]))


# Headings never sit alone at the bottom of a page: require room for the heading plus some content
def H1(t):
    story.append(CondPageBreak(60 * mm))
    story.append(Paragraph(t, S["h1"]))


def H2(t):
    story.append(CondPageBreak(40 * mm))
    story.append(Paragraph(t, S["h2"]))


def H3(t):
    story.append(CondPageBreak(30 * mm))
    story.append(Paragraph(md(t), S["h3"]))


def bullets(items):
    for it in items:
        story.append(Paragraph(md(it), S["bullet"], bulletText="•"))


def steps(items, start=1):
    for n, it in enumerate(items, start):
        story.append(Paragraph(md(it), S["step"], bulletText=f"{n}."))


def code(text, chunk=16):
    """Dark code panel. Split into tables of `chunk` lines so long blocks can break across pages."""
    lines = text.strip("\n").split("\n")
    parts = [lines[i:i + chunk] for i in range(0, len(lines), chunk)]
    story.append(Spacer(1, 4))
    for n, part in enumerate(parts):
        pre = Preformatted("\n".join(part), S["code"])
        t = Table([[pre]], colWidths=[174 * mm])
        first, last = n == 0, n == len(parts) - 1
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), CODE_BG),
                               ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                               ("TOPPADDING", (0, 0), (-1, -1), 8 if first else 0),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 8 if last else 0)]))
        story.append(t)
    story.append(Spacer(1, 10))


def callout(kind, title, text):
    tone = {"note": (colors.HexColor("#eff6ff"), colors.HexColor("#2563eb")),
            "warn": (colors.HexColor("#fffbeb"), colors.HexColor("#d97706")),
            "danger": (colors.HexColor("#fef2f2"), colors.HexColor("#dc2626")),
            "tip": (colors.HexColor("#f0fdfa"), TEAL)}[kind]
    p = Paragraph(f'<font face="Segoe-Bold" color="{tone[1].hexval()}">{title}</font>&nbsp;&nbsp;{md(text)}',
                  S["cell"])
    t = Table([[p]], colWidths=[174 * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), tone[0]),
                           ("LINEBEFORE", (0, 0), (0, -1), 3, tone[1]),
                           ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                           ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
    story.append(Spacer(1, 3))
    story.append(t)
    story.append(Spacer(1, 8))


def table(head, rows, widths):
    data = [[Paragraph(md(h), S["cellh"]) for h in head]]
    data += [[Paragraph(md(str(c)), S["cell"]) for c in r] for r in rows]
    t = Table(data, colWidths=[w * mm for w in widths], repeatRows=1)
    st = [("BACKGROUND", (0, 0), (-1, 0), NAVY2),
          ("VALIGN", (0, 0), (-1, -1), "TOP"),
          ("LINEBELOW", (0, 1), (-1, -1), 0.4, BORDER),
          ("BOX", (0, 0), (-1, -1), 0.4, BORDER),
          ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
          ("TOPPADDING", (0, 0), (-1, -1), 4.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5)]
    for i in range(1, len(data)):
        if i % 2 == 0:
            st.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f8fafc")))
    t.setStyle(TableStyle(st))
    story.append(t)
    story.append(Spacer(1, 10))


# ---------------------------------------------------------------- architecture diagram
def arrow(d, x1, y1, x2, y2, color=TEAL, label=None, lx=None, ly=None, width=1.4):
    d.add(Line(x1, y1, x2, y2, strokeColor=color, strokeWidth=width))
    import math
    a = math.atan2(y2 - y1, x2 - x1)
    s = 6
    p1 = (x2 - s * math.cos(a - 0.45), y2 - s * math.sin(a - 0.45))
    p2 = (x2 - s * math.cos(a + 0.45), y2 - s * math.sin(a + 0.45))
    d.add(Polygon([x2, y2, p1[0], p1[1], p2[0], p2[1]], fillColor=color, strokeColor=color))
    if label:
        d.add(String(lx if lx is not None else (x1 + x2) / 2, ly if ly is not None else (y1 + y2) / 2 + 4,
                     label, fontName="Segoe-Bold", fontSize=6.6, fillColor=color, textAnchor="middle"))


def box(d, x, y, w, h, title, lines=(), fill=colors.white, stroke=BORDER, tcolor=TEXT, dash=None, tsize=7.6):
    d.add(Rect(x, y, w, h, rx=5, ry=5, fillColor=fill, strokeColor=stroke, strokeWidth=0.9,
               strokeDashArray=dash))
    d.add(String(x + w / 2, y + h - 11, title, fontName="Segoe-Bold", fontSize=tsize, fillColor=tcolor,
                 textAnchor="middle"))
    for i, ln in enumerate(lines):
        d.add(String(x + w / 2, y + h - 21 - i * 8.6, ln, fontName="Segoe", fontSize=6.4, fillColor=MUTED,
                     textAnchor="middle"))


def diagram():
    W, H = 494, 300
    d = Drawing(W, H)
    # left column
    box(d, 0, 222, 104, 58, "Developer PC / CI", ["docker buildx build", "--platform amd64,arm64", "--push"],
        fill=colors.HexColor("#f8fafc"))
    box(d, 0, 122, 104, 66, "Docker Hub", ["you/fleetops-backend:1.0.0", "you/fleetops-frontend:1.0.0",
                                           "(+ official postgres,", "redis, caddy images)"],
        fill=colors.HexColor("#eff6ff"), stroke=colors.HexColor("#93c5fd"), tcolor=colors.HexColor("#1d4ed8"))
    box(d, 0, 30, 104, 52, "Users (browser)", ["https://fleetops.your-domain", "phones & desktops"],
        fill=colors.HexColor("#f8fafc"))
    arrow(d, 52, 222, 52, 190, colors.HexColor("#2563eb"), "1. push images", 52 + 30, 204)
    # OCI frames
    box(d, 126, 0, 368, 298, "Oracle Cloud Infrastructure (OCI) - your region", fill=colors.HexColor("#fff7ed"),
        stroke=colors.HexColor("#fdba74"), tcolor=colors.HexColor("#c2410c"), tsize=8)
    box(d, 136, 8, 348, 274, "VCN - public subnet - Security List allows TCP 22 (your IP), 80, 443",
        fill=colors.HexColor("#fffbeb"), stroke=colors.HexColor("#fcd34d"), tcolor=colors.HexColor("#92400e"),
        dash=(3, 2), tsize=7)
    box(d, 146, 16, 328, 250, "Compute VM - Ampere A1 (ARM) - Ubuntu 24.04 - Docker Engine + Compose",
        fill=colors.white, stroke=colors.HexColor("#cbd5e1"), tsize=7.2)
    d.add(String(310, 238, "private Docker network \"fleetops\" (only Caddy publishes ports)",
                 fontName="Segoe", fontSize=6.4, fillColor=MUTED, textAnchor="middle"))
    # containers
    teal_fill = colors.HexColor("#f0fdfa")
    box(d, 158, 52, 84, 52, "caddy", [":80 / :443 published", "HTTPS + Let's Encrypt"], fill=teal_fill,
        stroke=TEAL_L, tcolor=TEAL)
    box(d, 268, 52, 84, 52, "frontend (nginx)", ["Angular app", "proxies /api -> backend"], fill=teal_fill,
        stroke=TEAL_L, tcolor=TEAL)
    box(d, 378, 52, 86, 52, "backend", ["Spring Boot :8080", "Flyway migrations"], fill=teal_fill,
        stroke=TEAL_L, tcolor=TEAL)
    box(d, 378, 140, 86, 44, "postgres", ["PostgreSQL 16 :5432", "internal only"])
    box(d, 268, 140, 84, 44, "redis", ["Redis 7 :6379", "sessions / tokens"])
    for i, (x, name) in enumerate([(158, "caddy_data"), (268, "redis_data"), (378, "postgres_data")]):
        box(d, x, 196, 84 if x != 378 else 86, 26, name, [], fill=SOFT, tsize=6.6)
    d.add(String(200, 186, "named volumes (persist across", fontName="Segoe", fontSize=6, fillColor=MUTED,
                 textAnchor="middle"))
    d.add(String(200, 179, "restarts & image updates)", fontName="Segoe", fontSize=6, fillColor=MUTED,
                 textAnchor="middle"))
    arrow(d, 242, 78, 268, 78)
    arrow(d, 352, 78, 378, 78)
    arrow(d, 421, 104, 421, 140, colors.HexColor("#64748b"), width=1)
    arrow(d, 378, 92, 352, 150, colors.HexColor("#64748b"), width=1)
    arrow(d, 104, 56, 158, 70, TEAL, "2. HTTPS :443", 131, 70)
    arrow(d, 104, 155, 146, 155, colors.HexColor("#2563eb"), "3. pull", 122, 159)
    return d


# ---------------------------------------------------------------- page templates
class Doc(BaseDocTemplate):
    def __init__(self, fn):
        super().__init__(fn, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=20 * mm,
                         bottomMargin=18 * mm, title="FleetOps - Production Deployment Guide",
                         author="Naventra Platform", subject="Docker Hub + Oracle Cloud deployment")
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="f")
        self.addPageTemplates([PageTemplate("cover", [frame], onPage=cover_page),
                               PageTemplate("body", [frame], onPage=body_page)])

    def afterFlowable(self, f):
        if isinstance(f, Paragraph) and f.style.name in ("h1", "h2"):
            text = re.sub(r"<[^>]+>", "", f.getPlainText())
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
    c.rect(0, 0, w, h * 0.38, fill=1, stroke=0)
    c.setFillColor(TEAL_L)
    c.rect(18 * mm, h - 62 * mm, 14 * mm, 14 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Segoe-Bold", 15)
    c.drawString(36 * mm, h - 56.5 * mm, "FleetOps")
    c.setFillColor(CYAN)
    c.setFont("Segoe-Bold", 9)
    c.drawString(18 * mm, h - 92 * mm, "PRODUCTION DEPLOYMENT GUIDE")
    c.setFillColor(colors.white)
    c.setFont("Segoe-Bold", 30)
    c.drawString(18 * mm, h - 108 * mm, "Taking FleetOps live")
    c.drawString(18 * mm, h - 121 * mm, "on the internet")
    c.setFillColor(colors.HexColor("#cbd5e1"))
    c.setFont("Segoe-Light", 13)
    c.drawString(18 * mm, h - 136 * mm, "Docker images on Docker Hub, running on an Oracle Cloud (OCI) VM,")
    c.drawString(18 * mm, h - 143 * mm, "behind HTTPS with automatic certificates.")
    c.setFont("Segoe", 9.5)
    c.setFillColor(colors.HexColor("#94a3b8"))
    rows = [("Version", VERSION), ("Date", DATE), ("Applies to", "FleetOps (naventra-platform) main branch"),
            ("Audience", "Developers / DevOps deploying FleetOps")]
    y = h * 0.38 - 30 * mm
    for k, v in rows:
        c.setFillColor(colors.HexColor("#64748b"))
        c.drawString(18 * mm, y, k.upper())
        c.setFillColor(colors.white)
        c.drawString(55 * mm, y, v)
        y -= 7.5 * mm
    c.setFillColor(TEAL_L)
    c.rect(0, 0, w, 3 * mm, fill=1, stroke=0)
    c.restoreState()


def body_page(c, doc):
    w, h = A4
    c.saveState()
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.6)
    c.line(18 * mm, h - 13 * mm, w - 18 * mm, h - 13 * mm)
    c.setFont("Segoe-Bold", 8)
    c.setFillColor(TEAL)
    c.drawString(18 * mm, h - 11 * mm, "FleetOps")
    c.setFont("Segoe", 8)
    c.setFillColor(MUTED)
    c.drawString(31 * mm, h - 11 * mm, "Production Deployment Guide - Docker Hub + Oracle Cloud")
    c.drawRightString(w - 18 * mm, h - 11 * mm, f"v{VERSION} - {DATE}")
    c.line(18 * mm, 12 * mm, w - 18 * mm, 12 * mm)
    c.drawRightString(w - 18 * mm, 8 * mm, f"Page {doc.page}")
    c.drawString(18 * mm, 8 * mm, "Keep this document with the repository: docs/deployment/")
    c.restoreState()


# ================================================================ CONTENT
story.append(NextPageTemplate("body"))
story.append(PageBreak())

story.append(Paragraph("Contents", S["toctitle"]))
toc = TableOfContents()
toc.levelStyles = [S["tocl1"], S["tocl2"]]
toc.dotsMinLevel = 0
story.append(toc)
story.append(PageBreak())

# ---------------------------------------------------------------- 1
H1("1. How the deployment works")
P("FleetOps is not one program but a small set of cooperating services. Each one runs in its own "
  "Docker **container**, built from a Docker **image**. In production all of them run together on a "
  "single Oracle Cloud virtual machine, managed by **Docker Compose** from one file "
  "(`deploy/docker-compose.prod.yml`). You never start containers one by one: a single command "
  "pulls the right image versions and starts, wires up and health-checks the whole stack.")
P("The process has three stages that you repeat for every release:")
table(["Stage", "Where it happens", "What it does"], [
    ["1. Build & publish", "Your PC (or GitHub Actions)",
     "Builds the two FleetOps images (backend, frontend) for both Intel/AMD and ARM CPUs and pushes them "
     "to Docker Hub with a version tag such as `1.0.0`."],
    ["2. Pull", "The OCI virtual machine",
     "`docker compose pull` downloads the tagged FleetOps images plus the official Postgres, Redis and "
     "Caddy images."],
    ["3. Run", "The OCI virtual machine",
     "`docker compose up -d` starts or replaces containers. Data lives in named volumes, so it survives "
     "restarts and upgrades. Caddy serves the site over HTTPS on your domain."],
], [30, 42, 102])
P("The repository already contains everything the server needs in the `deploy/` folder:")
table(["File", "Purpose"], [
    ["`deploy/docker-compose.prod.yml`", "The production stack: 5 services, private network, volumes, health checks, log rotation."],
    ["`deploy/Caddyfile`", "HTTPS reverse proxy. Gets and renews Let's Encrypt certificates automatically."],
    ["`deploy/.env.example`", "Template for the secrets and settings file (`.env`) that lives only on the server."],
    ["`deploy/scripts/deploy.sh`", "One-command release: backup, pull, restart, wait until healthy."],
    ["`deploy/scripts/backup.sh`", "Compressed PostgreSQL backup, keeps 14 days. Run daily from cron."],
], [58, 116])
callout("note", "Oracle VM.", "This guide uses an **Oracle Cloud Infrastructure (OCI) Compute** virtual machine, "
        "because that is what makes the system reachable on the internet. If you meant an Oracle "
        "**VirtualBox** VM on your own computer, sections 6 to 9 still apply (install Ubuntu, Docker, run "
        "the same compose file), but you would also need a public IP and port forwarding on your router, "
        "which is not recommended for production.")

# ---------------------------------------------------------------- 2
H1("2. Images and containers")
P("**In production there are 5 containers, built from 5 images.** Only 2 of those images are yours "
  "(built from this repository and published to Docker Hub). The other 3 are official images that "
  "Docker Hub already hosts.")
H2("2.1 Images you build and publish (2)")
table(["Image (Docker Hub)", "Built from", "Contains", "Size (approx.)"], [
    ["`<you>/fleetops-backend:<version>`", "`backend/Dockerfile`",
     "Spring Boot API (Java 21 JRE on Alpine). Runs Flyway database migrations on start-up.", "~200 MB"],
    ["`<you>/fleetops-frontend:<version>`", "`frontend/Dockerfile`",
     "Compiled Angular app served by nginx. nginx also forwards `/api/` to the backend.", "~25 MB"],
], [48, 32, 70, 24])
H2("2.2 Official images pulled as-is (3)")
table(["Image", "Role", "Exposed to internet?"], [
    ["`postgres:16-alpine`", "Database. Data in the `postgres_data` volume.", "No, private network only"],
    ["`redis:7-alpine`", "Refresh-token / session store (password protected, persisted to disk).", "No, private network only"],
    ["`caddy:2-alpine`", "HTTPS entry point and reverse proxy. Handles certificates.", "Yes: ports 80 and 443"],
], [40, 92, 42])
H2("2.3 Build-only images (never run in production)")
P("Each Dockerfile uses a **multi-stage build**: a heavy toolchain image compiles the code, then only the "
  "result is copied into a small runtime image. The toolchain images stay on the build machine.")
table(["Build stage image", "Used for", "Final runtime image"], [
    ["`maven:3.9-eclipse-temurin-21`", "Compiling the backend into a JAR", "`eclipse-temurin:21-jre-alpine`"],
    ["`node:20-alpine`", "`npm ci` + `ng build` of the frontend", "`nginx:1.25-alpine`"],
], [56, 64, 54])
H2("2.4 Local vs production")
table(["", "Local (docker-compose.yml)", "Production (deploy/docker-compose.prod.yml)"], [
    ["Containers", "4: postgres, redis, backend, frontend", "5: postgres, redis, backend, frontend, **caddy**"],
    ["Images", "Built on your machine (`build:`)", "Pulled from Docker Hub by version tag (`image:`)"],
    ["Ports open", "4200, 8080, 5432, 6379 (convenient for development)", "Only 80 and 443 (Caddy)"],
    ["HTTPS", "No", "Yes, automatic Let's Encrypt certificates"],
    ["Secrets", "Hard-coded development values", "`.env` file on the server only (chmod 600)"],
    ["Swagger / API docs", "On", "Off"],
], [28, 66, 80])
callout("tip", "Every base image is multi-architecture.", "All seven base images (`eclipse-temurin`, `maven`, "
        "`node`, `nginx`, `postgres`, `redis`, `caddy`) publish both `linux/amd64` and `linux/arm64` "
        "variants (checked on " + DATE + "), so FleetOps runs on Oracle's free ARM (Ampere A1) machines.")

# ---------------------------------------------------------------- 3
story.append(CondPageBreak(120 * mm))
H1("3. Architecture")
story.append(diagram())
story.append(Spacer(1, 8))
H2("3.1 Request flow")
steps([
    "The browser opens `https://your-domain`. DNS resolves the domain to the VM's reserved public IP.",
    "OCI's **Security List** lets TCP 80/443 through to the VM; the VM's own firewall (iptables) allows them too.",
    "**Caddy** terminates HTTPS with a Let's Encrypt certificate and forwards the request to the **frontend** container.",
    "The frontend's **nginx** returns the Angular app for normal pages, and forwards anything under `/api/` to the **backend** container on port 8080.",
    "The **backend** reads and writes **PostgreSQL** and stores refresh tokens in **Redis**. Neither is reachable from outside the Docker network.",
])
H2("3.2 Ports")
table(["Port", "Where", "Open to"], [
    ["22/tcp", "VM (SSH)", "Your own IP address only"],
    ["80/tcp", "Caddy", "Everyone (HTTP, redirected to HTTPS; used for certificate issuance)"],
    ["443/tcp + 443/udp", "Caddy", "Everyone (HTTPS, HTTP/3)"],
    ["8080, 5432, 6379", "backend, postgres, redis", "Nobody outside the private Docker network"],
], [36, 46, 92])

# ---------------------------------------------------------------- 4
H1("4. Prerequisites and costs")
table(["You need", "Notes"], [
    ["Oracle Cloud account", "Free Tier sign-up at cloud.oracle.com (credit card needed for identity checks). Pick a "
     "home region close to your users, e.g. **South Africa Central (Johannesburg)**. The home region cannot be changed later."],
    ["Docker Hub account", "hub.docker.com. Free accounts allow unlimited public repositories but only a limited number "
     "of private ones; check current limits at docker.com/pricing."],
    ["A domain name", "Any registrar (e.g. a `.co.za` domain). You must be able to create a DNS **A record**."],
    ["Build machine", "Docker Desktop with buildx (already installed on your PC), or GitHub Actions."],
    ["SSH key pair", "Generate with `ssh-keygen -t ed25519` if you do not have one."],
], [40, 134])
H2("4.1 Recommended VM size")
table(["Setting", "Recommended", "Why"], [
    ["Shape", "`VM.Standard.A1.Flex` (Ampere ARM)", "Part of OCI Always Free; far more memory than the free AMD micro shape."],
    ["OCPUs / memory", "2 OCPU / 12 GB (minimum 1 OCPU / 6 GB)", "Spring Boot + PostgreSQL + Angular build headroom."],
    ["Boot volume", "100 GB", "Images, database, backups and logs."],
    ["Image (OS)", "Canonical Ubuntu 24.04 (aarch64)", "This guide's commands assume Ubuntu; Oracle Linux notes included."],
], [32, 62, 80])
P("**Cost:** OCI Always Free currently includes Ampere A1 capacity equivalent to 4 OCPUs and 24 GB RAM, "
  "200 GB of block storage and 10 TB/month of outbound data, so this setup can run at **R0/month** apart from "
  "the domain name. Always confirm current limits on Oracle's Free Tier page; they can change.")
callout("warn", "\"Out of host capacity\".", "Free A1 capacity is popular. If instance creation fails with this "
        "error, try another Availability Domain, try again later, or upgrade the account to Pay As You Go: you still "
        "pay nothing while you stay within the Always Free limits, and capacity is easier to get.")

# ---------------------------------------------------------------- 5
H1("5. Phase 1 - Prepare a release")
steps([
    "Make sure `main` builds and the app works locally (`docker compose up -d --build`, then log in and click through).",
    "Choose a version number using **semantic versioning**: `MAJOR.MINOR.PATCH` (start with `1.0.0`). "
    "Bump PATCH for fixes, MINOR for new features, MAJOR for breaking changes.",
    "Tag the commit so every image can be traced back to its source:",
])
code("""
git checkout main && git pull
git tag -a v1.0.0 -m "FleetOps 1.0.0"
git push origin v1.0.0
""")
callout("danger", "Never deploy :latest.", "Production must always run an exact version tag. `latest` changes "
        "silently, makes rollbacks impossible to reason about, and different servers can end up running different code.")

# ---------------------------------------------------------------- 6
H1("6. Phase 2 - Publish the images to Docker Hub")
H2("6.1 One-time Docker Hub setup")
steps([
    "Sign in at hub.docker.com and create two repositories: **fleetops-backend** and **fleetops-frontend**. "
    "Public is fine: the images contain no secrets (all passwords and keys come from the server's `.env` at runtime). "
    "Use private repositories if your plan allows and you prefer the code not to be downloadable.",
    "Go to **Account settings > Personal access tokens** and create two tokens: one with **Read & Write** "
    "(for your PC / CI to push) and one **Read-only** (for the server to pull). Store them in a password manager.",
    "On your PC, log in with the Read & Write token (use the token as the password):",
])
code("docker login -u <your-dockerhub-username>")
H2("6.2 Build for both CPU types and push")
P("Oracle's free VMs use **ARM** processors while your PC is **x86**. An image built only for your PC fails on "
  "the server with `exec format error`. `docker buildx` builds both variants into a single multi-architecture "
  "tag; Docker Desktop emulates ARM automatically.")
code("""
# one-time: create a builder that can produce multi-platform images
docker buildx create --name fleetops --driver docker-container --use
docker buildx inspect --bootstrap

# every release (run from the repository root)
$env:U = "<your-dockerhub-username>"      # PowerShell;  bash: U=<your-dockerhub-username>
$env:V = "1.0.0"

docker buildx build --platform linux/amd64,linux/arm64 `
  -t "$env:U/fleetops-backend:$env:V" --push ./backend

docker buildx build --platform linux/amd64,linux/arm64 `
  -t "$env:U/fleetops-frontend:$env:V" --push ./frontend
""")
P("Then confirm that both architectures were published:")
code("""
docker buildx imagetools inspect <you>/fleetops-backend:1.0.0
# expect:  Platform: linux/amd64   and   Platform: linux/arm64
""")
callout("tip", "Slow ARM builds?", "Building the ARM variant under emulation can take 10-30 minutes "
        "(Maven and the Angular compiler are CPU-heavy). Alternatives: let GitHub Actions do it (section 12), or "
        "build directly on the ARM VM with `docker build` and push from there.")
callout("note", "Network hiccups.", "If a build fails with `ECONNRESET` or \"Premature end of Content-Length\", "
        "just run it again: both Dockerfiles cache downloaded dependencies, so a retry resumes quickly.")

# ---------------------------------------------------------------- 7
H1("7. Phase 3 - Create the Oracle Cloud infrastructure")
H2("7.1 Network (VCN)")
steps([
    "In the OCI Console open **Networking > Virtual cloud networks** and click **Start VCN Wizard > "
    "Create VCN with Internet Connectivity**. Name it `fleetops-vcn` and accept the defaults. This creates a "
    "public subnet, an internet gateway and route rules.",
    "Open the VCN > **Security Lists > Default Security List** > **Add Ingress Rules** and add:",
])
table(["Source CIDR", "Protocol", "Destination port", "Purpose"], [
    ["`<your-public-ip>/32`", "TCP", "22", "SSH from your location only (replace the default 0.0.0.0/0 rule)"],
    ["`0.0.0.0/0`", "TCP", "80", "HTTP + Let's Encrypt validation"],
    ["`0.0.0.0/0`", "TCP", "443", "HTTPS"],
    ["`0.0.0.0/0`", "UDP", "443", "HTTP/3 (optional)"],
], [38, 20, 30, 86])
H2("7.2 Compute instance")
steps([
    "**Compute > Instances > Create instance**. Name: `fleetops-prod`.",
    "**Image and shape**: Change image to **Canonical Ubuntu 24.04** (the aarch64 build is chosen automatically for "
    "ARM). Change shape to **Ampere > VM.Standard.A1.Flex** with **2 OCPUs and 12 GB** memory.",
    "**Networking**: select `fleetops-vcn` and its **public subnet**; keep **Assign a public IPv4 address** on.",
    "**Add SSH keys**: upload your public key (`~/.ssh/id_ed25519.pub`).",
    "**Boot volume**: set a custom size of **100 GB**.",
    "Click **Create** and wait until the state is **Running**.",
])
H2("7.3 Reserve the public IP")
P("A normal (ephemeral) public IP changes if the instance is ever recreated, which would break your DNS. Make it "
  "permanent: open the instance > **Attached VNICs > (primary VNIC) > IPv4 Addresses** > edit the address and "
  "choose **Reserved public IP > Create new**. Note this IP; DNS will point to it.")
H2("7.4 Connect")
code("ssh -i ~/.ssh/id_ed25519 ubuntu@<reserved-public-ip>      # Oracle Linux images use the user 'opc'")

# ---------------------------------------------------------------- 8
H1("8. Phase 4 - Prepare the server")
H2("8.1 Updates and basics")
code("""
sudo apt-get update && sudo apt-get -y upgrade
sudo timedatectl set-timezone Africa/Johannesburg
sudo apt-get install -y unattended-upgrades && sudo dpkg-reconfigure -plow unattended-upgrades
sudo reboot        # if the upgrade asked for it; then reconnect
""")
H2("8.2 Open the host firewall (important on OCI)")
P("Oracle's Ubuntu images ship with **iptables** rules that reject all incoming traffic except SSH, even after the "
  "Security List allows it. Two changes are needed: allow 80/443, and remove the blanket FORWARD reject rule, "
  "which can block traffic Docker forwards to containers.")
code("""
# 1) Allow HTTP/HTTPS. Find the line number of the REJECT rule first:
sudo iptables -L INPUT --line-numbers
#    then insert the ACCEPT rules ABOVE it (replace 5 with that REJECT line number):
sudo iptables -I INPUT 5 -p tcp -m state --state NEW --dport 80  -j ACCEPT
sudo iptables -I INPUT 5 -p tcp -m state --state NEW --dport 443 -j ACCEPT
sudo iptables -I INPUT 5 -p udp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# 2) Remove the FORWARD reject rule from the saved rules and reload:
sudo sed -i '/-A FORWARD -j REJECT --reject-with icmp-host-prohibited/d' /etc/iptables/rules.v4
sudo netfilter-persistent reload
""")
callout("warn", "Do not enable ufw on OCI.", "Oracle recommends against ufw on its images; it can lock you out of "
        "SSH. Use the iptables commands above. On **Oracle Linux** instead run: "
        "`sudo firewall-cmd --permanent --add-service=http --add-service=https && sudo firewall-cmd --reload`.")
H2("8.3 Install Docker Engine and the Compose plugin")
code("""
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \\
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \\
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER      # run docker without sudo; log out and back in afterwards
sudo systemctl enable --now docker
docker version && docker compose version
""")
P("Docker inserts its own firewall rules when it starts. If you change iptables later, run "
  "`sudo systemctl restart docker` afterwards so Docker's rules are re-applied.")

# ---------------------------------------------------------------- 9
H1("9. Phase 5 - Point your domain at the server")
steps([
    "At your DNS provider create an **A record**: name `fleetops` (or `@` for the bare domain), value = the "
    "**reserved public IP**, TTL 300.",
    "Optionally add `www` as another A record (the Caddyfile redirects `www` to the main name).",
    "Wait for propagation, then check from your PC: `nslookup fleetops.your-domain.co.za` must return the reserved IP.",
])
callout("note", "Order matters.", "Create the DNS record **before** starting Caddy. Caddy requests the certificate "
        "on first start, and Let's Encrypt can only validate the domain once it resolves to your server and port 80 is open.")

# ---------------------------------------------------------------- 10
H1("10. Phase 6 - Deploy FleetOps")
H2("10.1 Copy the deployment files to the server")
code("""
# from your PC, in the repository root
scp -r deploy ubuntu@<reserved-public-ip>:~/fleetops

# on the server
cd ~/fleetops && chmod +x scripts/*.sh && ls
#   Caddyfile  docker-compose.prod.yml  .env.example  scripts/
""")
P("(Alternatively `git clone` the repository on the server and work from its `deploy/` folder; then a "
  "`git pull` updates the compose file and scripts.)")
H2("10.2 Create the secrets file")
code("""
cp .env.example .env && chmod 600 .env
openssl rand -base64 32 | tr -d '/+=' | cut -c1-32     # use for DB_PASSWORD
openssl rand -base64 32 | tr -d '/+=' | cut -c1-32     # use for REDIS_PASSWORD
openssl rand -base64 64 | tr -d '\\n'; echo            # use for JWT_SECRET
nano .env      # fill in DOCKERHUB_USER, FLEETOPS_VERSION, DOMAIN, ACME_EMAIL and the three secrets
""")
table(["Variable", "Example", "Notes"], [
    ["`DOCKERHUB_USER`", "`naventra`", "Docker Hub account that owns the two repositories."],
    ["`FLEETOPS_VERSION`", "`1.0.0`", "The tag to run. Changed by `deploy.sh <version>`."],
    ["`DOMAIN`", "`fleetops.example.co.za`", "Must match the DNS A record."],
    ["`ACME_EMAIL`", "`it@example.co.za`", "Let's Encrypt expiry notices."],
    ["`DB_PASSWORD`, `REDIS_PASSWORD`", "random", "Set once. Postgres only applies the password when its volume is first created."],
    ["`JWT_SECRET`", "random, 64+ chars", "Signs login tokens. Changing it logs everyone out."],
    ["`FLEETOPS_TIMEZONE`", "`Africa/Johannesburg`", "Business time zone for entered dates and times."],
    ["`MAIL_*`", "SMTP settings", "Optional; needed only for password-reset emails."],
], [44, 42, 88])
H2("10.3 Log in to Docker Hub on the server")
code("docker login -u <your-dockerhub-username>      # paste the READ-ONLY token as the password")
P("Needed for private repositories, and it also lifts Docker Hub's anonymous pull rate limits.")
H2("10.4 Start the stack")
code("""
./scripts/deploy.sh 1.0.0
# ==> Deploying FleetOps 1.0.0
# ==> Waiting for the backend to become healthy...
# ==> Backend healthy. FleetOps 1.0.0 is live.

docker compose -f docker-compose.prod.yml --env-file .env ps
""")
P("On the first start the backend runs the Flyway migrations, creating all tables and the initial administrator "
  "account. Caddy obtains the HTTPS certificate within a minute or so.")
H2("10.5 Verify")
code("""
curl -I https://fleetops.example.co.za                       # HTTP/2 200
curl https://fleetops.example.co.za/api/actuator/health       # {"status":"UP"}
docker compose -f docker-compose.prod.yml --env-file .env logs --tail=50 caddy backend
""")
callout("danger", "Change the admin password immediately.", "The first migration creates `admin` with the "
        "documented password `Admin@123`. Log in right away, open the user menu (top right) > **Change password**, "
        "and set a strong one. Then create real accounts under **Users** and give each person their own login. "
        "If you want zero exposure, open the site through an SSH tunnel first "
        "(`ssh -L 8443:localhost:443 ...`) or deploy before creating the DNS record.")

# ---------------------------------------------------------------- 11
H1("11. Phase 7 - Operating the system")
H2("11.1 Releasing a new version")
steps([
    "Tag and push the new version (section 5), build and push the images (section 6.2) with the new tag, e.g. `1.1.0`.",
    "On the server: `cd ~/fleetops && ./scripts/deploy.sh 1.1.0`.",
])
P("`deploy.sh` backs up the database first, updates `FLEETOPS_VERSION` in `.env`, pulls the new images, "
  "recreates only the containers whose image changed, waits for the backend health check and prints its logs if "
  "it fails. Expect about 20-40 seconds of downtime for the backend restart.")
H2("11.2 Rolling back")
code("./scripts/deploy.sh 1.0.0        # previous version")
callout("warn", "Database migrations are forward-only.", "If the new version added Flyway migrations, the old "
        "version may not understand the new schema. In that case restore the backup that `deploy.sh` made just before "
        "the upgrade (11.4), then deploy the old version.")
H2("11.3 Backups")
P("Schedule the backup script daily (it keeps 14 days of compressed dumps in `~/fleetops/backups`):")
code("""
crontab -e
# add:
0 2 * * * /home/ubuntu/fleetops/scripts/backup.sh >> /home/ubuntu/fleetops/backups/backup.log 2>&1
""")
P("Copies on the same disk do not protect against losing the VM. Copy them off the server, for example to an OCI "
  "**Object Storage** bucket (Always Free includes 20 GB) with the OCI CLI or rclone:")
code("oci os object bulk-upload --bucket-name fleetops-backups --src-dir ~/fleetops/backups --include '*.dump'")
H2("11.4 Restoring a backup")
code("""
cd ~/fleetops
C="docker compose -f docker-compose.prod.yml --env-file .env"
$C stop backend
$C exec -T postgres pg_restore -U fleetops -d fleetops --clean --if-exists < backups/fleetops-YYYYMMDD-HHMMSS.dump
$C start backend
""")
H2("11.5 Logs, monitoring and housekeeping")
table(["Task", "Command / approach"], [
    ["Follow backend logs", "`docker compose -f docker-compose.prod.yml --env-file .env logs -f backend`"],
    ["Container status & health", "`docker compose -f docker-compose.prod.yml --env-file .env ps`"],
    ["CPU / memory per container", "`docker stats`"],
    ["Log size", "Capped automatically: 5 x 10 MB per container (set in the compose file)."],
    ["Uptime alerts", "Free external monitor (e.g. UptimeRobot) on `https://<domain>/api/actuator/health`."],
    ["VM alerts", "OCI Console > Observability > Alarms on CPU, memory and boot-volume usage."],
    ["Disk clean-up", "`docker image prune -f` (deploy.sh does this after each successful release)."],
    ["OS patches", "unattended-upgrades installs security updates; reboot monthly in a quiet window."],
    ["Audit trail", "In the app: **Audit Log** (admin) lists every change, with user and IP address."],
], [46, 128])
H2("11.6 Growing later")
bullets([
    "**More capacity:** edit the instance shape (A1.Flex OCPUs / memory) and reboot. No code changes.",
    "**Managed database:** move PostgreSQL to OCI Database with PostgreSQL; set `DB_HOST` etc. in `.env` and remove the postgres service.",
    "**Several app servers:** put an OCI Load Balancer in front, run backend/frontend on more VMs, keep Postgres and Redis shared. "
    "Beyond that, consider Kubernetes (OCI OKE) using the same two images.",
])

# ---------------------------------------------------------------- 12
H1("12. Automating releases with GitHub Actions (optional)")
P("Instead of building on your PC, let GitHub build and push the images whenever you push a version tag, then "
  "deploy over SSH. Add these **repository secrets** (Settings > Secrets and variables > Actions): "
  "`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` (Read & Write), `OCI_HOST` (reserved IP), `OCI_SSH_KEY` "
  "(a private key whose public key is in the server's `~/.ssh/authorized_keys`).")
code("""
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  images:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [backend, frontend]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-qemu-action@v3
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: ./${{ matrix.app }}
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/fleetops-${{ matrix.app }}:${{ github.ref_name }}
          cache-from: type=gha,scope=${{ matrix.app }}
          cache-to: type=gha,mode=max,scope=${{ matrix.app }}

  deploy:
    needs: images
    runs-on: ubuntu-latest
    environment: production          # add a required reviewer here for a manual approval gate
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.OCI_HOST }}
          username: ubuntu
          key: ${{ secrets.OCI_SSH_KEY }}
          script: cd ~/fleetops && ./scripts/deploy.sh ${{ github.ref_name }}
""")
callout("note", "Tag format.", "With this workflow the Docker tag equals the Git tag (e.g. `v1.1.0`). Use the same "
        "form in `FLEETOPS_VERSION`, or strip the `v` in the workflow if you prefer plain `1.1.0`. The SSH deploy "
        "step needs port 22 open to GitHub's runners; if you restrict SSH to your own IP, keep the `images` job and "
        "run `deploy.sh` yourself.")

# ---------------------------------------------------------------- 13
H1("13. Security checklist")
table(["Done", "Item"], [
    ["[ ]", "Admin password changed from `Admin@123`; every person has their own account; unused accounts disabled."],
    ["[ ]", "`.env` has strong random `DB_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`; `chmod 600 .env`; never committed."],
    ["[ ]", "Security List: SSH (22) limited to your IP; only 80/443 open to the world."],
    ["[ ]", "Postgres and Redis have **no** published ports (true in the provided compose file)."],
    ["[ ]", "HTTPS works and HTTP redirects to HTTPS (Caddy does this automatically)."],
    ["[ ]", "Swagger/API docs disabled in production (set in the compose file)."],
    ["[ ]", "Server pulls with a **read-only** Docker Hub token; CI uses a separate read/write token."],
    ["[ ]", "Daily backups run **and** are copied off the VM; a restore has been tested at least once."],
    ["[ ]", "Unattended security upgrades enabled; monthly reboot scheduled."],
    ["[ ]", "Uptime monitor and OCI alarms configured."],
    ["[ ]", "Images are pinned to a version tag, never `latest`."],
], [14, 160])

# ---------------------------------------------------------------- 14
H1("14. Troubleshooting")
table(["Symptom", "Likely cause", "Fix"], [
    ["Browser times out on the domain", "Security List or host iptables blocking 80/443; DNS not pointing at the VM",
     "Check section 7.1 and 8.2; `nslookup <domain>`; from the VM `curl -I http://localhost`."],
    ["Caddy log: certificate / challenge failed", "DNS not propagated yet, or port 80 blocked",
     "Fix DNS/ports, then `... restart caddy`. Caddy retries automatically."],
    ["`502 Bad Gateway`", "frontend or backend not running/healthy", "`... ps` and `... logs backend frontend`."],
    ["`exec format error`", "Image built only for amd64, server is ARM", "Rebuild with `--platform linux/amd64,linux/arm64` (6.2)."],
    ["Backend restarts: password authentication failed", "`DB_PASSWORD` changed after the volume was created",
     "Set it back, or `ALTER USER fleetops PASSWORD '...'` inside postgres. Postgres ignores the variable on an existing volume."],
    ["Everyone logged out after deploy", "`JWT_SECRET` changed, or Redis data lost", "Keep `JWT_SECRET` stable; Redis persists to the `redis_data` volume."],
    ["Times shown 2 hours off", "Wrong business time zone", "Set `FLEETOPS_TIMEZONE` in `.env`, redeploy."],
    ["\"Out of host capacity\" creating the VM", "Free A1 capacity exhausted in that AD",
     "Other AD, retry later, or upgrade to Pay As You Go (still free within limits)."],
    ["`pull access denied`", "Private repository and not logged in, or wrong `DOCKERHUB_USER`/tag", "`docker login` on the server; check `.env`."],
    ["Disk full", "Old images / logs / backups", "`docker system df`, `docker image prune -a`, check `backups/`."],
], [44, 52, 78])

# ---------------------------------------------------------------- appendix
H1("Appendix A - Command cheat sheet")
code("""
# --- on your PC (each release) ---
git tag -a v1.1.0 -m "FleetOps 1.1.0" && git push origin v1.1.0
docker buildx build --platform linux/amd64,linux/arm64 -t <you>/fleetops-backend:1.1.0  --push ./backend
docker buildx build --platform linux/amd64,linux/arm64 -t <you>/fleetops-frontend:1.1.0 --push ./frontend

# --- on the server ---
cd ~/fleetops
./scripts/deploy.sh 1.1.0                    # release (backup + pull + restart + health check)
./scripts/deploy.sh 1.0.0                    # roll back
./scripts/backup.sh                          # manual backup
C="docker compose -f docker-compose.prod.yml --env-file .env"
$C ps                                        # status
$C logs -f backend                           # logs
$C restart caddy                             # restart one service
$C down                                      # stop everything (volumes/data are kept)
""")
H1("Appendix B - The production compose file")
P("For reference, the file shipped in `deploy/docker-compose.prod.yml` (the repository copy is authoritative):")
with open(os.path.join(REPO, "deploy", "docker-compose.prod.yml"), encoding="utf-8") as fh:
    code(fh.read())
H2("Caddyfile")
with open(os.path.join(REPO, "deploy", "Caddyfile"), encoding="utf-8") as fh:
    code(fh.read().replace("\t", "    "))

doc = Doc(OUT)
doc.multiBuild(story)
print("written", OUT)
