import sys
from pypdf import PdfReader

def extract_text(pdf_path, output_path):
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Extracted text to {output_path}")
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")

if __name__ == "__main__":
    extract_text("public/regulamin.pdf", "data/regulamin.txt")
    extract_text("public/rodo.pdf", "data/rodo.txt")
