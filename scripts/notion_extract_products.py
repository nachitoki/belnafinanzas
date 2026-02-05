import argparse
import csv
from pathlib import Path

from receipt_alias_suggest import suggest


DEFAULT_COLUMNS = [
    "Producto",
    "Nombre",
    "Name",
    "Item",
    "Producto de despensa",
    "Producto de la boleta",
    "Producto (Maestra)",
]


def find_column(headers, preferred):
    if not headers:
        return None
    lowered = {h.lower(): h for h in headers}
    for col in preferred:
        if col.lower() in lowered:
            return lowered[col.lower()]
    return None


def extract_from_csv(path: Path, columns):
    names = []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            return names
        target = find_column(reader.fieldnames, columns)
        if not target:
            return names
        for row in reader:
            value = (row.get(target) or "").strip()
            if value:
                names.append(value)
    return names


def main():
    parser = argparse.ArgumentParser(description="Extract product names from Notion export CSVs.")
    parser.add_argument("--dir", required=True, help="Root directory to scan for CSV files")
    parser.add_argument("--output-raw", default="notion_products_raw.txt", help="Raw output list")
    parser.add_argument("--output-suggest", default="notion_products_suggestions.csv", help="Suggestions CSV")
    parser.add_argument("--columns", default=None, help="Comma-separated column names (override defaults)")
    args = parser.parse_args()

    root = Path(args.dir)
    if not root.exists():
        raise FileNotFoundError(root)

    columns = DEFAULT_COLUMNS
    if args.columns:
        columns = [c.strip() for c in args.columns.split(",") if c.strip()]

    raw_names = []
    for path in root.rglob("*.csv"):
        raw_names.extend(extract_from_csv(path, columns))

    BLACKLIST = {
        "deudas", "educación", "homeschool", "plato 1", "plato 2", "plato 3", "plato 4",
        "proyectos", "transporte", "vivienda", "varios", "homeschoolm", "extras despensa",
        "ferretería", "emilia", "carlitos", "insumos despensa", "sophia", "mamá", "mes actual",
        "servicios básicos", "plato", "mariatrinidad", "ocio", "papá"
    }
    def is_blacklisted(name):
        value = name.lower().strip()
        if value in BLACKLIST:
            return True
        for token in BLACKLIST:
            if value.startswith(token + " ("):
                return True
        if '%' in name or '/' in name:
            return True
        return False

    unique = sorted({name.strip() for name in raw_names if name.strip() and not is_blacklisted(name)})

    raw_path = Path(args.output_raw)
    with raw_path.open("w", encoding="utf-8") as f:
        for name in unique:
            f.write(name + "\n")

    suggest_path = Path(args.output_suggest)
    with suggest_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["raw", "clean", "brand"])
        writer.writeheader()
        for name in unique:
            s = suggest(name) or ("", "")
            writer.writerow({"raw": name, "clean": s[0], "brand": s[1]})

    print(f"Found {len(unique)} unique names")
    print(f"Wrote raw list: {raw_path}")
    print(f"Wrote suggestions: {suggest_path}")


if __name__ == "__main__":
    main()
