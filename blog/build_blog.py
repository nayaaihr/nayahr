#!/usr/bin/env python3
"""Generate the NayaHR blog (marketing/blog/*.html) from Markdown posts in
blog/posts/*.md, styled to match nayahr.in, with SEO meta + BlogPosting JSON-LD.
Also regenerates marketing/sitemap.xml (homepage + blog index + every post).

Post front matter (top of each .md, `Key: value` lines):
  Title:       ...
  Description: ...   (≤160 chars — meta description)
  Slug:        my-post-slug
  Date:        2026-08-02
  Keywords:    a, b, c
"""
import os, glob, re, json, markdown

def esc(s):
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

BASE = os.path.dirname(os.path.abspath(__file__))
POSTS_DIR = os.path.join(BASE, "posts")
OUT_DIR = os.path.join(BASE, "..", "marketing", "blog")
SITEMAP = os.path.join(BASE, "..", "marketing", "sitemap.xml")
SITE = "https://nayahr.in"

LOGO = ('<svg class="mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">'
        '<line x1="15" y1="17.5" x2="15" y2="33.5" stroke="#241a40" stroke-width="8.6" stroke-linecap="round"/>'
        '<line x1="33.5" y1="20" x2="33.5" y2="33.5" stroke="#241a40" stroke-width="8.6" stroke-linecap="round"/>'
        '<line x1="15" y1="32" x2="33.5" y2="17" stroke="#ec6a49" stroke-width="8.6" stroke-linecap="round"/>'
        '<circle cx="33.5" cy="12" r="4.3" fill="#ec6a49"/></svg>')

CSS = """
  :root{ --brand:#0071e3; --brand-strong:#0a5bd0; --ink:#1d1d1f; --muted:#6b6b70; --line:#e6e6ea; --coral:#ec6a49; --navy:#241a40; }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:#fff;line-height:1.65;-webkit-font-smoothing:antialiased}
  a{color:var(--brand);text-decoration:none}
  a:hover{text-decoration:underline}
  .wrap{max-width:760px;margin:0 auto;padding:0 22px}
  header{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.85);backdrop-filter:saturate(180%) blur(14px);border-bottom:1px solid var(--line)}
  .nav{display:flex;align-items:center;justify-content:space-between;height:60px;max-width:1080px;margin:0 auto;padding:0 22px}
  .logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:18px;letter-spacing:-.02em;color:var(--ink)}
  .mark{width:30px;height:30px;flex:none;display:block}
  .nav-links{display:flex;gap:22px;font-size:14.5px;color:var(--muted);align-items:center}
  .nav-links a{color:var(--muted)}.nav-links a:hover{color:var(--ink)}
  .btn{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:980px;padding:11px 20px;font-size:15px;font-weight:600;background:var(--brand);color:#fff}
  .btn:hover{background:var(--brand-strong);text-decoration:none}
  @media(max-width:640px){.nav-links a:not(.btn){display:none}}
  main{padding:48px 0 10px}
  .crumb{font-size:13px;color:var(--muted);margin-bottom:14px}
  article h1{font-size:clamp(28px,5vw,40px);line-height:1.15;letter-spacing:-.02em;margin-bottom:10px}
  .postmeta{color:var(--muted);font-size:14px;margin-bottom:26px;padding-bottom:20px;border-bottom:1px solid var(--line)}
  article h2{font-size:23px;letter-spacing:-.01em;margin:34px 0 10px}
  article h3{font-size:18px;margin:24px 0 8px}
  article p{margin:14px 0;font-size:16.5px}
  article ul,article ol{margin:14px 0 14px 24px}
  article li{margin:7px 0;font-size:16.5px}
  article strong{color:var(--ink)}
  article blockquote{background:#f6f9ff;border-left:3px solid var(--brand);margin:18px 0;padding:12px 18px;color:#334;border-radius:0 10px 10px 0;font-size:15.5px}
  article table{width:100%;border-collapse:collapse;margin:18px 0;font-size:15px}
  article th{background:var(--navy);color:#fff;text-align:left;padding:9px 12px;font-weight:600}
  article td{border:1px solid var(--line);padding:9px 12px;vertical-align:top}
  article tr:nth-child(even) td{background:#fafafb}
  article code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px;background:#f4f4f6;padding:1px 6px;border-radius:5px}
  article hr{border:0;border-top:1px solid var(--line);margin:26px 0}
  .cta{margin:40px 0 10px;padding:26px;background:linear-gradient(180deg,#f7fbff,#eaf3ff);border:1px solid #dcebff;border-radius:18px;text-align:center}
  .cta h3{font-size:20px;margin-bottom:6px}.cta p{color:var(--muted);margin-bottom:16px;font-size:15.5px}
  .disc{font-size:13px;color:var(--muted);margin-top:30px;font-style:italic}
  /* index */
  .lead{color:var(--muted);font-size:17px;margin:6px 0 30px}
  .postlist{display:grid;gap:16px;margin-bottom:20px}
  .postcard{border:1px solid var(--line);border-radius:16px;padding:22px 24px;transition:transform .15s,box-shadow .15s}
  .postcard:hover{transform:translateY(-2px);box-shadow:0 2px 4px rgba(0,0,0,.05),0 16px 34px rgba(0,0,0,.07)}
  .postcard a{color:inherit}.postcard a:hover{text-decoration:none}
  .postcard h2{font-size:20px;letter-spacing:-.01em;margin-bottom:6px;color:var(--ink)}
  .postcard p{color:var(--muted);font-size:15px}
  .postcard .d{font-size:12.5px;color:var(--muted);margin-top:10px;text-transform:uppercase;letter-spacing:.04em}
  footer{border-top:1px solid var(--line);padding:28px 0;color:var(--muted);font-size:13.5px;margin-top:34px}
  .foot{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;max-width:1080px;margin:0 auto;padding:0 22px}
  .foot a{color:var(--muted)}.foot a:hover{color:var(--ink)}
"""

HEADER = f"""<header><div class="nav">
  <a class="logo" href="/">{LOGO} NayaHR</a>
  <nav class="nav-links"><a href="/#modules">Modules</a><a href="/blog">Blog</a><a class="btn" href="https://app.nayahr.in">Sign in</a></nav>
</div></header>"""

FOOTER = """<footer><div class="foot">
  <div>© <span id="yr"></span> NayaHR · The AI-native HRIS for Indian businesses</div>
  <div><a href="/blog">Blog</a> &nbsp;·&nbsp; <a href="/privacy">Privacy</a> &nbsp;·&nbsp; <a href="/terms">Terms</a> &nbsp;·&nbsp; <a href="mailto:hello@nayahr.in">hello@nayahr.in</a></div>
</div></footer>
<script>document.getElementById('yr').textContent=new Date().getFullYear();</script>"""

CTA = """<div class="cta"><h3>Run your whole people operation in one place</h3>
<p>NayaHR is the AI-native HRIS for Indian SMBs — Core HR, payroll, recruitment, performance and more. Start free.</p>
<a class="btn" href="https://app.nayahr.in">Get started →</a></div>"""

ICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23241a40'/%3E%3Cline x1='11' y1='10' x2='11' y2='22' stroke='%23ffffff' stroke-width='5.2' stroke-linecap='round'/%3E%3Cline x1='21' y1='13' x2='21' y2='22' stroke='%23ffffff' stroke-width='5.2' stroke-linecap='round'/%3E%3Cline x1='11' y1='21' x2='21' y2='11' stroke='%23ec6a49' stroke-width='5.2' stroke-linecap='round'/%3E%3Ccircle cx='21' cy='8' r='2.8' fill='%23ec6a49'/%3E%3C/svg%3E")

def page(title, desc, canonical, keywords, head_extra, body):
    title, desc, keywords = esc(title), esc(desc), esc(keywords)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{title}</title>
<meta name="description" content="{desc}"/>
{f'<meta name="keywords" content="{keywords}"/>' if keywords else ''}
<meta name="robots" content="index, follow, max-image-preview:large"/>
<link rel="canonical" href="{canonical}"/>
<link rel="icon" href="{ICON}" type="image/svg+xml"/>
<meta property="og:type" content="article"/>
<meta property="og:site_name" content="NayaHR"/>
<meta property="og:title" content="{title}"/>
<meta property="og:description" content="{desc}"/>
<meta property="og:url" content="{canonical}"/>
<meta property="og:image" content="{SITE}/og.png"/>
<meta property="og:locale" content="en_IN"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="{title}"/>
<meta name="twitter:description" content="{desc}"/>
{head_extra}
<style>{CSS}</style>
</head>
<body>
{HEADER}
{body}
{FOOTER}
</body>
</html>"""

def load_posts():
    posts = []
    md = markdown.Markdown(extensions=["meta", "tables", "sane_lists", "attr_list", "fenced_code"])
    for path in glob.glob(os.path.join(POSTS_DIR, "*.md")):
        md.reset()
        with open(path, encoding="utf-8") as f:
            html = md.convert(f.read())
        # Drop a leading H1 in the body — the template already renders the title.
        html = re.sub(r"^\s*<h1[^>]*>.*?</h1>\s*", "", html, count=1, flags=re.S | re.I)
        m = {k: (v[0] if isinstance(v, list) else v) for k, v in md.Meta.items()}
        posts.append({
            "title": m.get("title", "Untitled"),
            "description": m.get("description", ""),
            "slug": m.get("slug", os.path.splitext(os.path.basename(path))[0]),
            "date": m.get("date", ""),
            "keywords": m.get("keywords", ""),
            "html": html,
        })
    posts.sort(key=lambda p: p["date"], reverse=True)
    return posts

def fmt_date(d):
    from datetime import datetime
    try: return datetime.strptime(d, "%Y-%m-%d").strftime("%d %B %Y")
    except Exception: return d

def build():
    os.makedirs(OUT_DIR, exist_ok=True)
    posts = load_posts()

    # Individual posts
    for p in posts:
        url = f"{SITE}/blog/{p['slug']}"
        ld = {
            "@context": "https://schema.org", "@type": "BlogPosting",
            "headline": p["title"], "description": p["description"],
            "datePublished": p["date"], "dateModified": p["date"],
            "author": {"@type": "Organization", "name": "NayaHR"},
            "publisher": {"@type": "Organization", "name": "NayaHR", "logo": {"@type": "ImageObject", "url": f"{SITE}/og.png"}},
            "mainEntityOfPage": {"@type": "WebPage", "@id": url}, "image": f"{SITE}/og.png",
        }
        head = f'<script type="application/ld+json">{json.dumps(ld).replace("<", "\\u003c")}</script>'
        body = (f'<main><div class="wrap"><article>'
                f'<div class="crumb"><a href="/">Home</a> › <a href="/blog">Blog</a></div>'
                f'<h1>{esc(p["title"])}</h1>'
                f'<div class="postmeta">{fmt_date(p["date"])} · NayaHR</div>'
                f'{p["html"]}{CTA}'
                f'<p class="disc">This article is general information for Indian SMBs, not legal, tax or financial advice. '
                f'Verify statutory rates and rules with a qualified professional.</p>'
                f'</article></div></main>')
        with open(os.path.join(OUT_DIR, f"{p['slug']}.html"), "w", encoding="utf-8") as f:
            f.write(page(f"{p['title']} — NayaHR", p["description"], url, p["keywords"], head, body))
        print(f"  blog/{p['slug']}.html")

    # Blog index
    cards = "\n".join(
        f'<div class="postcard"><a href="/blog/{p["slug"]}"><h2>{esc(p["title"])}</h2>'
        f'<p>{esc(p["description"])}</p><div class="d">{fmt_date(p["date"])}</div></a></div>'
        for p in posts)
    idx_body = (f'<main><div class="wrap">'
                f'<h1>NayaHR Blog</h1>'
                f'<p class="lead">Practical guides on HR, payroll and compliance for Indian small and medium businesses.</p>'
                f'<div class="postlist">{cards}</div></div></main>')
    idx_ld = {"@context": "https://schema.org", "@type": "Blog", "name": "NayaHR Blog", "url": f"{SITE}/blog",
              "publisher": {"@type": "Organization", "name": "NayaHR"}}
    with open(os.path.join(OUT_DIR, "index.html"), "w", encoding="utf-8") as f:
        f.write(page("NayaHR Blog — HR, payroll & compliance for Indian SMBs",
                     "Practical guides on HR, payroll, and statutory compliance for Indian small and medium businesses, from NayaHR.",
                     f"{SITE}/blog", "HR blog India, payroll guide, HR software",
                     f'<script type="application/ld+json">{json.dumps(idx_ld)}</script>', idx_body))
    print("  blog/index.html")

    # Sitemap (homepage + blog index + posts)
    urls = [(f"{SITE}/", "1.0", "weekly"), (f"{SITE}/blog", "0.8", "weekly")]
    urls += [(f"{SITE}/blog/{p['slug']}", "0.7", "monthly") for p in posts]
    entries = "\n".join(
        f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{max(p['date'] for p in posts) if posts else '2026-08-02'}</lastmod>"
        f"\n    <changefreq>{cf}</changefreq>\n    <priority>{pr}</priority>\n  </url>"
        for (u, pr, cf) in urls)
    with open(SITEMAP, "w", encoding="utf-8") as f:
        f.write(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{entries}\n</urlset>\n')
    print(f"  sitemap.xml ({len(urls)} urls)")

if __name__ == "__main__":
    print("Building NayaHR blog:")
    build()
    print("Done.")
