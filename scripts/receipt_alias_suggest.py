import argparse
import csv
import re
from pathlib import Path


ALIASES = [
    (["miel de abeja aysen 500"], "Miel de abeja 500 g", "Aysen"),
    (["pilas duracell triple a"], "Pilas AAA", "Duracell"),
    (["palta cod"], "Palta (kg)", ""),
    (["clementina malla 1"], "Clementina malla 1 kg", ""),
    (["pizza cong sadia"], "Pizza congelada", "Sadia"),
    (["pizza artesanal"], "Pizza artesanal", "PF"),
    (["ramitas s original"], "Ramitas originales (S)", "Evercrisp"),
    (["detodoito ii", "detodoito 2"], "De Todito 2", "Evercrisp"),
    (["crunchis mani marc"], "Crunchis mani", "Marco Polo"),
    (["coca cola lata 350"], "Coca-Cola lata 350 ml", "Coca-Cola"),
    (["naranja sofruco"], "Naranja malla", "Sofruco"),
    (["aco ballerina dp 7", "aco ballerina dp7"], "Acondicionador DP7", "Ballerina"),
    (["manzana verde expo"], "Manzana verde (kg)", ""),
    (["molde queque red"], "Molde queque", "RED"),
    (["harina integral se lecta", "harina integral selecta"], "Harina integral 1 kg", "Selecta"),
    (["chancaca 2 bloques"], "Chancaca pack 2", ""),
    (["set escritorio art"], "Set escritorio (articulos)", ""),
]

FALLBACKS = [
    (["pilas aaa", "pilas triple a", "triple a pilas"], "Pilas AAA", ""),
    (["pilas aa", "pilas doble a", "doble a pilas"], "Pilas AA", ""),
]


def normalize(text: str) -> str:
    value = text or ""
    value = value.lower()
    value = re.sub(r"\s+", " ", value)
    value = value.strip()
    return value


def suggest(raw: str):
    text = normalize(raw)
    if not text:
        return None
    for tokens, clean, brand in ALIASES + FALLBACKS:
        if any(token in text for token in tokens):
            return clean, brand
    return None


def read_lines(path: Path, column: str | None):
    if not path.exists():
        raise FileNotFoundError(path)
    if path.suffix.lower() in {".csv", ".tsv"}:
        delimiter = "\t" if path.suffix.lower() == ".tsv" else ","
        with path.open("r", encoding="utf-8") as f:
            reader = csv.DictReader(f, delimiter=delimiter)
            if column and column not in reader.fieldnames:
                raise ValueError(f"Column '{column}' not found. Available: {reader.fieldnames}")
            target = column or (reader.fieldnames[0] if reader.fieldnames else None)
            if not target:
                return []
            for row in reader:
                yield str(row.get(target, "")).strip()
    else:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                yield line.strip()


def main():
    parser = argparse.ArgumentParser(description="Suggest receipt alias normalizations.")
    parser.add_argument("--input", required=True, help="Input file (.txt/.csv/.tsv)")
    parser.add_argument("--column", default=None, help="Column name for CSV/TSV")
    parser.add_argument("--output", default="receipt_alias_suggestions.csv", help="Output CSV path")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    rows = []
    for raw in read_lines(input_path, args.column):
        suggestion = suggest(raw)
        if suggestion:
            clean, brand = suggestion
        else:
            clean, brand = "", ""
        rows.append({
            "raw": raw,
            "clean": clean,
            "brand": brand
        })

    with output_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["raw", "clean", "brand"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {output_path}")


if __name__ == "__main__":
    main()
