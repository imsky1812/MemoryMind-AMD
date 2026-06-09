# backend/ingest.py

import pdfplumber
import re
from datetime import datetime
from langchain_text_splitters import RecursiveCharacterTextSplitter
from search import list_sources

def extract_text_from_pdf(filepath: str) -> str:
    """Extract all text from a PDF file using pdfplumber."""
    text = ""
    with pdfplumber.open(filepath) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip()


def parse_whatsapp_export(filepath: str) -> str:
    """
    Parse WhatsApp .txt export into clean message text.
    Handles both formats:
      - "12/31/23, 10:30 AM - Name: message"
      - "[31/12/23, 10:30:00 AM] Name: message"
    """
    with open(filepath, "r", encoding="utf-8") as f:
        raw = f.read()

    # Try the common Android export format first
    pattern = r"\d{1,2}/\d{1,2}/\d{2,4},\s\d{1,2}:\d{2}\s(?:AM|PM)\s-\s[^:]+:\s(.+)"
    messages = re.findall(pattern, raw)

    if not messages:
        # Try iOS bracketed format
        pattern = r"\[\d{1,2}/\d{1,2}/\d{2,4},\s\d{1,2}:\d{2}:\d{2}\s(?:AM|PM)\]\s[^:]+:\s(.+)"
        messages = re.findall(pattern, raw)

    return "\n".join(messages) if messages else raw


def chunk_text(text: str, source: str, doc_type: str) -> list[dict]:
    """
    Split text into overlapping chunks with metadata.
    300-char chunks with 50-char overlap — sweet spot for bge-m3 RAG quality.
    Returns list of dicts with 'text' and 'metadata' keys.
    """
    if not text or not text.strip():
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=300,
        chunk_overlap=50,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_text(text)

    return [
        {
            "text": chunk,
            "metadata": {
                "source": source,
                "type": doc_type,
                "date": datetime.now().isoformat(),
                "chunk_index": i,
                "total_chunks": len(chunks),
            },
        }
        for i, chunk in enumerate(chunks)
    ]


def ingest_file(filepath: str, filename: str) -> list[dict]:
    """
    Auto-detect file type and return list of chunk dicts.
    Supported: .pdf, .txt (plain text or WhatsApp export)
    """
    lower = filename.lower()

    if lower.endswith(".pdf"):
        text = extract_text_from_pdf(filepath)
        return chunk_text(text, filename, "pdf")

    elif lower.endswith(".txt"):
        with open(filepath, "r", encoding="utf-8") as f:
            raw = f.read()
        # Detect WhatsApp export by its timestamp pattern
        if (" - " in raw and ("AM -" in raw or "PM -" in raw)) or \
           ("[" in raw and ("AM]" in raw or "PM]" in raw)):
            text = parse_whatsapp_export(filepath)
            return chunk_text(text, filename, "whatsapp")
        else:
            return chunk_text(raw, filename, "note")

    else:
        raise ValueError(f"Unsupported file type: {filename}. Allowed: .pdf, .txt")
