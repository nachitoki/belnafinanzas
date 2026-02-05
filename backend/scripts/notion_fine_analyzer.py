import pandas as pd
import os
import glob
import json
import re
from pathlib import Path

def clean_currency(value):
    if pd.isna(value) or not isinstance(value, str):
        return 0
    # Remove CLP, symbols, and commas
    cleaned = re.sub(r'[^\d]', '', value)
    return int(cleaned) if cleaned else 0

def fine_analyze_notion(base_dir, output_file="summary_notion.md"):
    print(f"Iniciando analisis fino en: {base_dir}")
    
    files = glob.glob(os.path.join(base_dir, "**", "*.csv"), recursive=True)
    
    dataframes = {}
    for f in files:
        name = Path(f).name
        try:
            # Explicitly use utf-8 for reading Notion exports
            df = pd.read_csv(f, encoding='utf-8')
            dataframes[name] = df
        except Exception as e:
            try:
                # Fallback to cp1252 if utf-8 fails
                df = pd.read_csv(f, encoding='cp1252')
                dataframes[name] = df
            except:
                print(f"Warning: could not load {name}")

    # Identify key Dataframes (fuzzy matching)
    df_trans = None
    df_prod = None
    df_recipes = None
    df_ingredients = None

    for name, df in dataframes.items():
        if "Transacciones" in name: df_trans = df
        if "Despensa Productos" in name and "_all" in name: df_prod = df
        if "Recetario Familiar" in name: df_recipes = df
        if "Ingredientes de Recetas" in name and "_all" in name: df_ingredients = df

    report = []
    report.append("# Resumen de Datos Extraidos de Notion")
    report.append(f"\nSe analizaron **{len(files)}** archivos CSV encontrados en la exportacion.")

    # 1. Analisis de Transacciones
    if df_trans is not None:
        report.append("\n## Transacciones y Gastos")
        # Clean Monto
        df_trans['Monto_Num'] = df_trans['Monto'].apply(clean_currency)
        total_gasto = df_trans[df_trans['Tipo'] == 'Gasto']['Monto_Num'].sum()
        count_gasto = len(df_trans[df_trans['Tipo'] == 'Gasto'])
        
        report.append(f"- **Total de Transacciones**: {len(df_trans)}")
        report.append(f"- **Gasto Historico Registrado**: ${total_gasto:,} CLP")
        
        # Categorias mas comunes
        top_cats = df_trans[df_trans['Tipo'] == 'Gasto']['Categoría'].value_counts().head(5)
        report.append("\n### Top 5 Categorias de Gasto:")
        for cat, count in top_cats.items():
            report.append(f"  - {cat}: {count} veces")

    # 2. Analisis de Productos
    if df_prod is not None:
        report.append("\n## Catalogo de Productos (Despensa)")
        report.append(f"- **Productos Unicos**: {len(df_prod)}")
        
        # Identify Strategic Products (those with price)
        # Using column 'Precio compra'
        df_prod['Precio_Num'] = df_prod['Precio compra'].apply(clean_currency)
        strategic_count = len(df_prod[df_prod['Precio_Num'] > 0])
        report.append(f"- **Productos con historial de precio**: {strategic_count}")
        
        top_expensive = df_prod.sort_values(by='Precio_Num', ascending=False).head(5)
        report.append("\n### Productos de Mayor Valor Unitario (estimado):")
        for _, row in top_expensive.iterrows():
            report.append(f"  - {row['Producto']}: ${row['Precio_Num']:,} CLP")

    # 3. Analisis de Recetas
    if df_recipes is not None:
        report.append("\n## Recetario y Planificacion")
        report.append(f"- **Recetas registradas**: {len(df_recipes)}")
        
        if df_ingredients is not None:
            most_used = df_ingredients['Producto de despensa'].value_counts().head(10)
            report.append("\n### Ingredientes mas criticos (presentes en mas recetas):")
            for prod, count in most_used.items():
                clean_name = re.sub(r'\s*\(.*\)', '', str(prod))
                report.append(f"  - {clean_name}: usado en {count} recetas")

    # 4. Clasificacion Estrategica Sugerida
    report.append("\n## Clasificacion Estrategica (Propuesta de Cerebro)")
    report.append("Basado en el cruce de datos, estos productos se clasifican como **Clase A** (Estrategicos):")
    
    if df_ingredients is not None:
        top_strategic = df_ingredients['Producto de despensa'].value_counts().head(15).index.tolist()
        for prod in top_strategic:
            clean_name = re.sub(r'\s*\(.*\)', '', str(prod))
            report.append(f"  - [x] {clean_name}")

    # Write the report
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(report))
    
    print(f"Analisis completado. Resumen guardado en: {output_file}")

if __name__ == "__main__":
    base_path = r"S:\APP FINANZAS FAMILIARES\Datos Notion\Extracted\Private & Shared\Bases de datos Familiares (Maestra Suprema)"
    fine_analyze_notion(base_path, "S:/APP FINANZAS FAMILIARES/RESUMEN_DATOS_NOTION.md")
