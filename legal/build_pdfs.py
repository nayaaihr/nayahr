#!/usr/bin/env python3
"""Render NayaHR legal markdown -> branded PDF (headless Chrome). macOS.
Single source of truth: edit the .md, re-run this (or `npm run legal:build`)."""
import os, subprocess, tempfile, markdown

BASE = os.path.dirname(os.path.abspath(__file__))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

LOGO = ("<svg width='34' height='34' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'>"
        "<rect width='32' height='32' rx='8' fill='#241a40'/>"
        "<line x1='11' y1='10' x2='11' y2='22' stroke='#fff' stroke-width='5.2' stroke-linecap='round'/>"
        "<line x1='21' y1='13' x2='21' y2='22' stroke='#fff' stroke-width='5.2' stroke-linecap='round'/>"
        "<line x1='11' y1='21' x2='21' y2='11' stroke='#ec6a49' stroke-width='5.2' stroke-linecap='round'/>"
        "<circle cx='21' cy='8' r='2.8' fill='#ec6a49'/></svg>")

CSS = """
:root{ --navy:#241a40; --coral:#ec6a49; --ink:#1d1d1f; --muted:#6b6b70; --line:#e6e6ea; }
@page { size: A4; margin: 16mm 15mm 20mm 15mm; }
* { box-sizing: border-box; }
body { font-family: Georgia, 'Times New Roman', serif; font-size: 10.6pt; line-height: 1.55; color: var(--ink); margin: 0; }
.masthead { display:flex; align-items:center; justify-content:space-between; padding-bottom:10px; border-bottom:2px solid var(--coral); margin-bottom:8px; }
.brand { display:flex; align-items:center; gap:10px; }
.brand .name { font-family:-apple-system,'Helvetica Neue',Arial,sans-serif; font-weight:700; color:var(--navy); font-size:12pt; letter-spacing:.2px; }
.ribbon { font-family:-apple-system,'Helvetica Neue',Arial,sans-serif; font-size:8pt; font-weight:700; letter-spacing:.6px; color:#fff; background:var(--coral); padding:5px 10px; border-radius:999px; text-transform:uppercase; }
h1 { font-family:-apple-system,'Helvetica Neue',Arial,sans-serif; color:var(--navy); font-size:21pt; margin:14px 0 4px; }
h2 { font-family:-apple-system,'Helvetica Neue',Arial,sans-serif; color:var(--navy); font-size:12.5pt; margin:20px 0 6px; padding-top:4px; }
h3 { font-family:-apple-system,'Helvetica Neue',Arial,sans-serif; color:var(--navy); font-size:11pt; margin:14px 0 5px; }
p { margin:7px 0; }
a { color:var(--navy); text-decoration:underline; }
strong { color:var(--ink); }
ul,ol { margin:7px 0 7px 20px; padding:0; }
li { margin:3px 0; }
hr { border:0; border-top:1px solid var(--line); margin:16px 0; }
blockquote { background:#fff6f3; border-left:3px solid var(--coral); margin:12px 0; padding:10px 14px; color:#7a3a2c; font-size:9.6pt; border-radius:0 8px 8px 0; }
blockquote p { margin:0; }
table { width:100%; border-collapse:collapse; margin:10px 0; font-size:9.6pt; }
th { background:var(--navy); color:#fff; text-align:left; padding:7px 9px; font-family:-apple-system,'Helvetica Neue',Arial,sans-serif; font-weight:600; }
td { border:1px solid var(--line); padding:6px 9px; vertical-align:top; }
tr:nth-child(even) td { background:#faf9fc; }
code { font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:9pt; background:#f4f4f6; padding:1px 4px; border-radius:4px; }
.footer { position:fixed; bottom:6mm; left:0; right:0; text-align:center; font-family:-apple-system,'Helvetica Neue',Arial,sans-serif; font-size:7.5pt; color:var(--muted); }
h2,h3 { break-after:avoid; }
table,blockquote,li { break-inside:avoid; }
"""

DOCS = [
    ("PRIVACY-POLICY.md", "NayaHR-Privacy-Policy.pdf", "Privacy Policy"),
    ("DATA-PROCESSING-AGREEMENT.md", "NayaHR-Data-Processing-Agreement.pdf", "Data Processing Agreement"),
    ("TERMS-OF-SERVICE.md", "NayaHR-Terms-of-Service.pdf", "Terms of Service"),
]

def build(md_name, pdf_name, short):
    with open(os.path.join(BASE, md_name), encoding="utf-8") as f:
        body = markdown.markdown(f.read(), extensions=["tables", "sane_lists", "attr_list"])
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="masthead"><div class="brand">{LOGO}<span class="name">NayaHR Private Limited</span></div>
<span class="ribbon">Draft &middot; For Legal Review</span></div>
{body}
<div class="footer">NayaHR Private Limited &middot; {short} &middot; Confidential draft &mdash; not legal advice</div>
</body></html>"""
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as t:
        t.write(html); src = t.name
    out = os.path.join(BASE, pdf_name)
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
                    "--run-all-compositor-stages-before-draw", "--virtual-time-budget=3000",
                    f"--print-to-pdf={out}", f"file://{src}"],
                   check=True, capture_output=True)
    os.unlink(src)
    print(f"  {pdf_name}  ({os.path.getsize(out)//1024} KB)")

if __name__ == "__main__":
    print("Building legal PDFs:")
    for d in DOCS:
        build(*d)
    print("Done.")
