import sys
import subprocess
import importlib

def install_and_read(pdf_path):
    try:
        import fitz
    except ImportError:
        print("Instalando PyMuPDF...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "PyMuPDF"])
        import fitz

    print(f"Leyendo {pdf_path}...")
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    
    output_path = "patrimore_content.txt"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Texto extraído y guardado en {output_path}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        install_and_read(sys.argv[1])
    else:
        print("Uso: python read_pdf.py <ruta_al_pdf>")
