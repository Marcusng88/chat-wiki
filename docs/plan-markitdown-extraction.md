# Plan: Integrate markitdown into Ingestion Extract Step

## Context

Current `extract.py` has hand-rolled extractors:
- PDF → PyMuPDF (`fitz`)
- PPTX → `python-pptx`
- MD/TXT → raw decode
- Images → LLM multimodal description

Gaps: no DOCX, no XLSX, no HTML support. Custom extractors = maintenance burden.

markitdown covers all of these via one API, stream-based, no disk I/O.

---

## What Changes

### 1. Dependency swap

```bash
uv add 'markitdown[pdf,docx,pptx,xlsx]'
uv remove pymupdf python-pptx
```

> Note: verify `python-pptx` not used elsewhere before removing.

---

### 2. `extract.py` — replace extractors

**Remove:**
- `_extract_pdf()` / `_extract_pdf_dispatch()`
- `_extract_pptx()` / `_extract_pptx_dispatch()`
- `_extract_plain()`
- `_EXTRACTORS` dict

**Add:**

```python
import asyncio
import io
from markitdown import MarkItDown, StreamInfo

_md = MarkItDown()

_MIME_MAP = {
    "pdf":  "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "md":   "text/markdown",
    "txt":  "text/plain",
    "html": "text/html",
}

def _extract_markitdown(data: bytes, file_type: str) -> str:
    mime = _MIME_MAP.get(file_type, "application/octet-stream")
    stream_info = StreamInfo(extension=f".{file_type}", mimetype=mime)
    result = _md.convert_stream(io.BytesIO(data), stream_info=stream_info)
    return result.markdown
```

**Keep as-is:**
- `_extract_image()` + `_extract_image_dispatch()` — markitdown image requires LLM plugin, current multimodal approach is better quality

**New dispatch in `extract_text` tool:**

```python
if file_type == "image" or file_type in {"jpg", "jpeg", "png", "gif", "webp"}:
    return await asyncio.get_event_loop().run_in_executor(
        None, _extract_image_dispatch, data, storage_path
    )

if file_type not in _MIME_MAP:
    raise ValueError(f"Unsupported file type: {file_type}")

return await asyncio.get_event_loop().run_in_executor(
    None, _extract_markitdown, data, file_type
)
```

> markitdown is sync → wrap in `run_in_executor` to not block FastAPI event loop.

---

### 3. `ingestion.py` — expand SUPPORTED_TYPES

```python
SUPPORTED_TYPES = {"pdf", "docx", "pptx", "xlsx", "md", "txt", "html", "image"}
```

---

### 4. `documents.py` / upload API — accept new MIME types

Verify upload endpoint validates `file_type`. Add `docx`, `xlsx`, `html` to allowed list if hardcoded.

---

## What Does NOT Change

| Thing | Reason |
|---|---|
| Image extraction (LLM multimodal) | Better quality than markitdown OCR plugin |
| Chunking, embedding, wiki, index steps | Downstream of extraction — unchanged |
| Agent, tools, DB schema | No impact |
| PDF page markers `[Page N]` | **Lost** — markitdown outputs clean markdown, no page markers. Acceptable tradeoff: structure preserved via headings. If page markers needed, stick with PyMuPDF for PDF only. |

---

## Decision Point

**PDF: markitdown or keep PyMuPDF?**

| | markitdown | PyMuPDF |
|---|---|---|
| Page markers `[Page N]` | No | Yes |
| Table extraction | Good (markdown tables) | Basic |
| Image-heavy PDFs | Poor (no OCR without plugin) | Good (we add LLM description) |
| Maintenance | Zero | Custom code |

**Recommendation:** Use markitdown for PDF unless page markers critical. If needed, hybrid: markitdown for docx/pptx/xlsx/html, keep PyMuPDF for PDF.

---

## Files Touched

| File | Change |
|---|---|
| `backend/app/agents/docs_ingestion/tools/extract.py` | Replace extractors with markitdown |
| `backend/app/services/ingestion.py` | Expand SUPPORTED_TYPES |
| `backend/app/api/documents.py` | Allow new file types in upload validation |
| `pyproject.toml` | Via `uv add`/`uv remove` only |

---

## Test Plan

- [ ] PDF: text extracted, structure preserved
- [ ] DOCX: headings + paragraphs in markdown
- [ ] PPTX: slide content extracted
- [ ] XLSX: table rows as markdown table
- [ ] TXT/MD: passthrough unchanged
- [ ] Image: still uses LLM path, not markitdown
- [ ] Unsupported type → `ValueError` still raised
- [ ] No event loop blocking (run_in_executor wraps sync call)
