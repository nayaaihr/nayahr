#!/usr/bin/env python3
"""Generate marketing-site legal pages (privacy/terms/dpa .html) from the legal
markdown. Single source of truth: edit the .md, re-run this. Pages are noindex
while the text is a draft — remove the meta once finalised."""
import os, markdown

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "..", "marketing")

DOCS = [
    ("PRIVACY-POLICY.md", "privacy.html", "Privacy Policy"),
    ("DATA-PROCESSING-AGREEMENT.md", "dpa.html", "Data Processing Agreement"),
    ("TERMS-OF-SERVICE.md", "terms.html", "Terms of Service"),
]

LOGO = ('<svg class="mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">'
        '<line x1="15" y1="17.5" x2="15" y2="33.5" stroke="#241a40" stroke-width="8.6" stroke-linecap="round"/>'
        '<line x1="33.5" y1="20" x2="33.5" y2="33.5" stroke="#241a40" stroke-width="8.6" stroke-linecap="round"/>'
        '<line x1="15" y1="32" x2="33.5" y2="17" stroke="#ec6a49" stroke-width="8.6" stroke-linecap="round"/>'
        '<circle cx="33.5" cy="12" r="4.3" fill="#ec6a49"/></svg>')

NAV = ('<a href="/privacy">Privacy</a> &nbsp;·&nbsp; <a href="/terms">Terms</a> '
       '&nbsp;·&nbsp; <a href="/dpa">DPA</a>')

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>NayaHR — __TITLE__</title>
<meta name="description" content="NayaHR __TITLE__"/>
<meta name="robots" content="noindex"/>
<link rel="canonical" href="https://nayahr.in/__SLUG__"/>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23241a40'/%3E%3Cline x1='11' y1='10' x2='11' y2='22' stroke='%23ffffff' stroke-width='5.2' stroke-linecap='round'/%3E%3Cline x1='21' y1='13' x2='21' y2='22' stroke='%23ffffff' stroke-width='5.2' stroke-linecap='round'/%3E%3Cline x1='11' y1='21' x2='21' y2='11' stroke='%23ec6a49' stroke-width='5.2' stroke-linecap='round'/%3E%3Ccircle cx='21' cy='8' r='2.8' fill='%23ec6a49'/%3E%3C/svg%3E"/>
<style>
  :root{ --brand:#0071e3; --brand-strong:#0a5bd0; --ink:#1d1d1f; --muted:#6b6b70; --line:#e6e6ea; --coral:#ec6a49; }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:#fff;line-height:1.6;-webkit-font-smoothing:antialiased}
  a{color:var(--brand);text-decoration:none}
  a:hover{text-decoration:underline}
  .wrap{max-width:820px;margin:0 auto;padding:0 22px}
  header{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.85);backdrop-filter:saturate(180%) blur(14px);border-bottom:1px solid var(--line)}
  .nav{display:flex;align-items:center;justify-content:space-between;height:60px;max-width:1080px;margin:0 auto;padding:0 22px}
  .logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:18px;letter-spacing:-.02em;color:var(--ink)}
  .mark{width:30px;height:30px;flex:none;display:block}
  .nav-links{font-size:14px;color:var(--muted)}
  .nav-links a{color:var(--muted)}
  .nav-links a:hover{color:var(--ink)}
  main{padding:44px 0 24px}
  .legal h1{font-size:clamp(28px,5vw,40px);letter-spacing:-.02em;line-height:1.12;margin-bottom:6px}
  .legal h2{font-size:20px;letter-spacing:-.01em;margin:30px 0 8px;padding-top:6px}
  .legal h3{font-size:16px;margin:20px 0 6px}
  .legal p{margin:10px 0;font-size:15.5px}
  .legal ul,.legal ol{margin:10px 0 10px 22px}
  .legal li{margin:5px 0;font-size:15.5px}
  .legal strong{color:var(--ink)}
  .legal hr{border:0;border-top:1px solid var(--line);margin:22px 0}
  .legal blockquote{background:#fff6f3;border-left:3px solid var(--coral);margin:16px 0;padding:12px 16px;color:#7a3a2c;font-size:14px;border-radius:0 10px 10px 0}
  .legal blockquote p{margin:0;font-size:14px}
  .legal table{width:100%;border-collapse:collapse;margin:14px 0;font-size:14px}
  .legal th{background:#241a40;color:#fff;text-align:left;padding:9px 11px;font-weight:600}
  .legal td{border:1px solid var(--line);padding:8px 11px;vertical-align:top}
  .legal tr:nth-child(even) td{background:#faf9fc}
  .legal code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;background:#f4f4f6;padding:1px 5px;border-radius:5px}
  .legal a{color:var(--brand)}
  .doclinks{display:flex;gap:16px;font-size:13.5px;margin:26px 0 6px;padding-top:18px;border-top:1px solid var(--line)}
  footer{border-top:1px solid var(--line);padding:28px 0;color:var(--muted);font-size:13.5px;margin-top:30px}
  .foot{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;max-width:1080px;margin:0 auto;padding:0 22px}
  .foot a{color:var(--muted)}
  .foot a:hover{color:var(--ink)}
</style>
</head>
<body>
<header>
  <div class="nav">
    <a class="logo" href="/">__LOGO__ NayaHR</a>
    <nav class="nav-links">__NAV__</nav>
  </div>
</header>
<main>
  <div class="wrap legal">
    __BODY__
    <div class="doclinks">__NAV__</div>
  </div>
</main>
<footer>
  <div class="foot">
    <div>© <span id="yr"></span> NayaHR · The AI-native HRIS for Indian businesses</div>
    <div>__NAV__ &nbsp;·&nbsp; <a href="mailto:hello@nayahr.in">hello@nayahr.in</a></div>
  </div>
</footer>
<script>document.getElementById('yr').textContent=new Date().getFullYear();</script>
</body>
</html>
"""


def build(md_name, html_name, title):
    with open(os.path.join(BASE, md_name), encoding="utf-8") as f:
        body = markdown.markdown(f.read(), extensions=["tables", "sane_lists", "attr_list"])
    slug = html_name.replace(".html", "")
    page = (TEMPLATE
            .replace("__TITLE__", title)
            .replace("__SLUG__", slug)
            .replace("__LOGO__", LOGO)
            .replace("__NAV__", NAV)
            .replace("__BODY__", body))
    out = os.path.join(OUT, html_name)
    with open(out, "w", encoding="utf-8") as f:
        f.write(page)
    print(f"  {html_name}  ({len(page)//1024} KB)")


print("Generating marketing legal pages:")
for d in DOCS:
    build(*d)
print("Done.")
