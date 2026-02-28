#!/usr/bin/env python3
"""
Script to export ALL financial data from Firestore to Markdown.
"""

import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import firebase_admin
from firebase_admin import credentials, firestore

def main():
    key_path = os.path.join(os.path.dirname(__file__), 'service-account-key.json')
    
    if not firebase_admin._apps:
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    # Get household
    households = list(db.collection('households').stream())
    if not households:
        print("No households found")
        return
    
    hh = households[0]
    household_id = hh.id
    doc_ref = db.collection('households').document(household_id)
    
    # Fetch all collections
    incomes = [d.to_dict() for d in doc_ref.collection('incomes').stream()]
    commitments = [d.to_dict() for d in doc_ref.collection('commitments').stream()]
    transactions = [d.to_dict() for d in doc_ref.collection('transactions').stream()]
    events = [d.to_dict() for d in doc_ref.collection('events').stream()]
    categories = {d.id: d.to_dict() for d in doc_ref.collection('categories').stream()}
    
    # Calculate totals
    total_income = sum(float(i.get('amount', 0) or 0) for i in incomes)
    total_commitments = sum(float(c.get('amount', 0) or 0) for c in commitments)
    total_events = sum(float(e.get('amount_estimate', 0) or 0) for e in events)
    total_expenses = sum(abs(float(t.get('amount', 0) or 0)) for t in transactions if float(t.get('amount', 0) or 0) < 0)
    
    now = datetime.now()
    month_name = now.strftime("%B %Y")
    
    md_lines = [
        f"# Reporte Financiero Completo - {month_name}",
        f"",
        f"**Generado:** {now.strftime('%Y-%m-%d %H:%M')}",
        f"**Household:** Familia Demo",
        f"",
        f"---",
        f"",
        f"## Resumen General",
        f"",
        f"| Concepto | Cantidad | Monto Total |",
        f"|----------|:--------:|------------:|",
        f"| Ingresos Registrados | {len(incomes)} | ${total_income:,.0f} |",
        f"| Compromisos Fijos | {len(commitments)} | ${total_commitments:,.0f} |",
        f"| Eventos Programados | {len(events)} | ${total_events:,.0f} |",
        f"| Transacciones (Gastos) | {len(transactions)} | ${total_expenses:,.0f} |",
        f"",
        f"---",
        f"",
    ]
    
    # INGRESOS
    md_lines.extend([
        f"## Ingresos ({len(incomes)})",
        f"",
    ])
    if incomes:
        md_lines.append("| Nombre | Monto | Frecuencia |")
        md_lines.append("|--------|------:|------------|")
        for inc in sorted(incomes, key=lambda x: float(x.get('amount', 0) or 0), reverse=True):
            name = inc.get('name', 'Sin nombre')
            amount = float(inc.get('amount', 0) or 0)
            freq = inc.get('frequency', 'monthly')
            md_lines.append(f"| {name} | ${amount:,.0f} | {freq} |")
    else:
        md_lines.append("*No hay ingresos registrados en la colección 'incomes'.*")
    
    # COMPROMISOS
    md_lines.extend([
        f"",
        f"---",
        f"",
        f"## Compromisos Fijos ({len(commitments)})",
        f"",
    ])
    if commitments:
        md_lines.append("| Nombre | Monto | Frecuencia | Próximo Pago |")
        md_lines.append("|--------|------:|------------|--------------|")
        for comm in sorted(commitments, key=lambda x: float(x.get('amount', 0) or 0), reverse=True):
            name = comm.get('name', 'Sin nombre')
            amount = float(comm.get('amount', 0) or 0)
            freq = comm.get('frequency', 'monthly')
            next_date = comm.get('next_date', '-')
            if hasattr(next_date, 'isoformat'):
                next_date = next_date.isoformat()[:10]
            md_lines.append(f"| {name} | ${amount:,.0f} | {freq} | {next_date} |")
    else:
        md_lines.append("*No hay compromisos registrados en la colección 'commitments'.*")
    
    # EVENTOS PROGRAMADOS
    md_lines.extend([
        f"",
        f"---",
        f"",
        f"## Eventos Programados ({len(events)})",
        f"",
    ])
    if events:
        md_lines.append("| Nombre | Monto Estimado | Fecha | Tipo | Obligatorio |")
        md_lines.append("|--------|---------------:|-------|------|:-----------:|")
        for ev in sorted(events, key=lambda x: x.get('date', ''), reverse=False):
            name = ev.get('name', 'Sin nombre')
            amount = float(ev.get('amount_estimate', 0) or 0)
            date = ev.get('date', '-')
            ev_type = ev.get('event_type', '-')
            mandatory = "✅" if ev.get('is_mandatory') else "❌"
            md_lines.append(f"| {name} | ${amount:,.0f} | {date} | {ev_type} | {mandatory} |")
    else:
        md_lines.append("*No hay eventos programados.*")
    
    # TRANSACCIONES RECIENTES
    md_lines.extend([
        f"",
        f"---",
        f"",
        f"## Transacciones Recientes ({len(transactions)})",
        f"",
    ])
    if transactions:
        md_lines.append("| Descripción | Monto | Fecha | Categoría |")
        md_lines.append("|-------------|------:|-------|-----------|")
        for tx in sorted(transactions, key=lambda x: str(x.get('occurred_on', '')), reverse=True):
            desc = tx.get('description', 'Sin descripción')
            amount = float(tx.get('amount', 0) or 0)
            date = tx.get('occurred_on', '-')
            if hasattr(date, 'isoformat'):
                date = date.isoformat()[:10]
            cat_id = tx.get('category_id')
            cat_name = categories.get(cat_id, {}).get('name', '-') if cat_id else '-'
            md_lines.append(f"| {desc} | ${amount:,.0f} | {date} | {cat_name} |")
    else:
        md_lines.append("*No hay transacciones registradas.*")
    
    # CATEGORÍAS
    md_lines.extend([
        f"",
        f"---",
        f"",
        f"## Categorías ({len(categories)})",
        f"",
    ])
    if categories:
        md_lines.append("| Nombre | Tipo | Esencial |")
        md_lines.append("|--------|------|:--------:|")
        for cat_id, cat in categories.items():
            name = cat.get('name', 'Sin nombre')
            kind = cat.get('kind', '-')
            essential = "✅" if cat.get('essential') else "❌"
            md_lines.append(f"| {name} | {kind} | {essential} |")
    
    md_lines.extend([
        f"",
        f"---",
        f"",
        f"*Reporte generado automáticamente desde Firestore.*"
    ])
    
    # Write to file
    output_path = os.path.join(os.path.dirname(__file__), "reporte_financiero_completo.md")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(md_lines))
    
    print(f"✅ Reporte guardado en: {output_path}")

if __name__ == "__main__":
    main()
