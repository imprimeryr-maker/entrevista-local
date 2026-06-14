import io

from pypdf import PdfReader


def extraer_texto_pdf(file_bytes):
    try:
        pdf_file = io.BytesIO(file_bytes)
        reader = PdfReader(pdf_file)
        texto = []
        for page in reader.pages:
            page_text = page.extract_text() or ""
            texto.append(page_text)
        resultado = "\n\n".join(texto).strip()
        if len(resultado) < 50:
            return _ocr_pdf(file_bytes)
        return resultado if resultado else _ocr_pdf(file_bytes)
    except Exception as e:
        try:
            return _ocr_pdf(file_bytes)
        except Exception:
            return f"Error al extraer texto del PDF: {str(e)}"


def _ocr_pdf(file_bytes):
    from pdf2image import convert_from_bytes
    import pytesseract

    images = convert_from_bytes(file_bytes, dpi=300)
    texto_completo = []
    for img in images:
        texto = pytesseract.image_to_string(img, lang="spa")
        texto_completo.append(texto.strip())
    return "\n\n".join(texto_completo)
