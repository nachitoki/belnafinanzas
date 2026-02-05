import pandas as pd
import json
import os
import argparse

def analyze_notion_data(input_file="notion_gastos.csv", output_dir="output"):
    """
    Analiza datos históricos de Notion para clasificar productos (A/B/C)
    y extraer contexto de tiendas.
    """
    if not os.path.exists(input_file):
        print(f"❌ Error: No se encontró el archivo '{input_file}'")
        return

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print(f"🔍 Cargando datos desde {input_file}...")
    
    # 1. Cargar datos
    try:
        df = pd.read_csv(input_file)
    except Exception as e:
        print(f"❌ Error al leer el CSV: {e}")
        return

    # 2. Normalización básica
    # Intentar detectar columnas si varían un poco
    col_map = {c.lower(): c for c in df.columns}
    
    prod_col = col_map.get('producto', 'producto')
    date_col = col_map.get('fecha', 'fecha')
    total_col = col_map.get('monto_total', 'monto_total')
    store_col = col_map.get('tienda', 'tienda')

    df["producto_norm"] = df[prod_col].str.lower().str.strip()

    # 3. Agrupación por producto
    print("🧠 Calculando métricas de productos...")
    grouped = df.groupby("producto_norm").agg(
        frecuencia=(date_col, "count"),
        gasto_total=(total_col, "sum"),
        precio_promedio=(total_col, "mean"),
        precio_std=(total_col, "std"),
        tiendas_distintas=(store_col, "nunique")
    ).reset_index()

    # 4. Rellenar nulos (std dev es NaN si solo hay 1 compra)
    grouped["precio_std"] = grouped["precio_std"].fillna(0)

    # 5. Umbrales dinámicos (cuantiles 0.7 según diseño del Director)
    FREQ_ALTA = grouped["frecuencia"].quantile(0.7)
    GASTO_ALTO = grouped["gasto_total"].quantile(0.7)
    VARIACION_ALTA = grouped["precio_std"].quantile(0.7)

    # 6. Clasificación A/B/C
    def clasificar(row):
        score = 0
        if row["frecuencia"] >= FREQ_ALTA:
            score += 1
        if row["gasto_total"] >= GASTO_ALTO:
            score += 1
        if row["precio_std"] >= VARIACION_ALTA:
            score += 1
        if row["tiendas_distintas"] > 1:
            score += 1

        if score >= 3:
            return "A"
        elif score == 2:
            return "B"
        else:
            return "C"

    grouped["clasificacion"] = grouped.apply(clasificar, axis=1)

    # 7. Guardar outputs
    print(f"💾 Guardando resultados en la carpeta '{output_dir}'...")
    
    grouped.to_csv(os.path.join(output_dir, "productos_clasificados.csv"), index=False)

    # Productos Estratégicos (Clase A)
    estrategicos = grouped[grouped["clasificacion"] == "A"][
        ["producto_norm", "frecuencia", "gasto_total"]
    ].to_dict(orient="records")

    with open(os.path.join(output_dir, "productos_estrategicos.json"), "w", encoding="utf-8") as f:
        json.dump(estrategicos, f, indent=2, ensure_ascii=False)

    # 8. Contexto por tienda
    contexto_tiendas = (
        df.groupby([store_col, "producto_norm"])
        .agg(
            compras=(date_col, "count"),
            gasto=(total_col, "sum")
        )
        .reset_index()
    )

    contexto_tiendas.to_json(
        os.path.join(output_dir, "contexto_tiendas.json"),
        orient="records",
        indent=2,
        force_ascii=False
    )

    # Resumen para consola
    counts = grouped["clasificacion"].value_counts().to_dict()
    print("\n✔ Análisis completo")
    print(f"📊 Resumen de clasificación:")
    print(f"   🟢 Clase A (Estratégicos): {counts.get('A', 0)}")
    print(f"   🟡 Clase B (Operativos):   {counts.get('B', 0)}")
    print(f"   🔴 Clase C (Ignorables):   {counts.get('C', 0)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analizador de datos de Notion")
    parser.add_argument("--input", default="notion_gastos.csv", help="Archivo CSV de entrada")
    parser.add_argument("--outdir", default="notion_analysis_results", help="Directorio de salida")
    
    args = parser.parse_args()
    analyze_notion_data(args.input, args.outdir)
