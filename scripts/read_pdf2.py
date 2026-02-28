import sys
import subprocess
import traceback

def read_pdf(pdf_path):
    try:
        try:
            import PyPDF2
        except ImportError:
            print("Instalando PyPDF2...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", "PyPDF2"])
            import PyPDF2

        print(f"Leyendo {pdf_path}...")
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        
        output_path = "patrimore_content.txt"
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Texto extraído y guardado en {output_path}")
    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        read_pdf(sys.argv[1])
    else:
        print("Falta ruta al pdf")
