# Corpus PDF Sources

Place source PDF files in this directory, then run `scripts/ingest_pdf.py` to convert them to
Markdown. The generated `.md` files are automatically picked up by `scripts/ingest_corpus.py`.

**This directory is gitignored for PDFs** (`*.pdf`). Download source files from the URLs below.

---

## CrossFit Level 1 Training Guide

- **File**: `CrossFit_L1_Training_Guide.pdf`
- **URL**: https://www.crossfit.com/cf-info/crossfit-foundations (free download, account required)
- **Version**: Check for the most recent edition on crossfit.com
- **Target corpus dir**: `corpus/crossfit_standards/`
- **Notes**: ~200 pages. Contains movement standards, programming theory, nutrition basics.

---

## Sports Science References

### ACWR Systematic Review

- **File**: `acwr_systematic_review.pdf`
- **Suggested source**: Search "Gabbett ACWR systematic review" on PubMed or ResearchGate
- **Target corpus dir**: `corpus/programming_docs/`

### HRV and Recovery (open-access)

- **File**: `hrv_recovery_review.pdf`
- **Suggested source**: Search "heart rate variability recovery sport" on PubMed (open-access filter)
- **Target corpus dir**: `corpus/programming_docs/`

---

## CrossFit Journal Articles

Web articles do not require PDF conversion. Use `trafilatura` to scrape directly to Markdown:

```bash
pip install trafilatura
python -c "
import trafilatura
from pathlib import Path
url = 'https://journal.crossfit.com/article/<slug>'
html = trafilatura.fetch_url(url)
content = trafilatura.extract(html, output_format='markdown')
Path('corpus/crossfit_standards/<slug>.md').write_text(content)
"
```

---

## Legal Note

FitHub is invite-only and non-commercial. Ingesting these sources for private RAG use is
consistent with fair use. Do not surface raw corpus text verbatim in the UI — the LLM must
paraphrase. If FitHub becomes public or commercial, replace CrossFit-copyrighted sources with
open-access equivalents (PubMed papers, open coaching wikis).
