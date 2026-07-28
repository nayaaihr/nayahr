# NayaHR legal documents

The Markdown files here are the **single source of truth** for NayaHR's legal
documents. The website pages and the PDFs are generated from them.

## Files
- `PRIVACY-POLICY.md`, `DATA-PROCESSING-AGREEMENT.md`, `TERMS-OF-SERVICE.md` — the source text.
- `build_web.py` → generates `marketing/{privacy,terms,dpa}.html` (served at nayahr.in/privacy, /terms, /dpa).
- `build_pdfs.py` → generates the branded `NayaHR-*.pdf` files here (for lawyers / customer contracts).

## Regenerate everything
From the `platform/` directory:

```bash
npm run legal:build
```

(Regenerates both the marketing pages and the PDFs. Requires `python3` with the
`markdown` package, and Google Chrome for PDF rendering — macOS path.)

## Finalising (moving from draft to live)
1. Fill the remaining bracketed facts in the `.md` files: `[Registered address]`,
   `[CIN]`, `[Effective date]`, and confirm the Neon **Mumbai** residency +
   backup lines once that migration is done.
2. Remove the top "**DRAFT for legal review**" blockquote from each `.md`.
3. In `build_web.py`, remove the `<meta name="robots" content="noindex"/>` line
   so the pages are indexable.
4. Run `npm run legal:build` and commit.

> Have the documents reviewed by qualified Indian legal counsel before publishing.
