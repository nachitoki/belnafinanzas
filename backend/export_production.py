#!/usr/bin/env python3
"""
Script to export ALL financial data from PRODUCTION Firestore to Markdown.
"""

import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import firebase_admin
from firebase_admin import credentials, firestore

def main():
    # Use production credentials
    key_path = os.path.join(os.path.dirname(__file__), 'prod-credentials.json')
    
    if not os.path.exists(key_path):
        print(f"ERROR: No se encontró {key_path}")
        return
    
    # Clear any existing app
    if firebase_admin._apps:
        firebase_admin.delete_app(firebase_admin.get_app())
    
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    
    # Get ALL households
    print("Buscando households en producción...")
    households = list(db.collection('households').stream())
    print(f"Encontrados: {len(households)} households")
    
    if not households:
        print("No households found")
        return
    
    all_reports = []
    
    for hh in households:
        household_id = hh.id
        hh_data = hh.to_dict()
        hh_name = hh_data.get('name', 'Sin nombre')
        print(f"\n=== Procesando: {hh_name} ({household_id}) ===")
        
        doc_ref = db.collection('households').document(household_id)
        
        # Fetch all collections
        incomes = [d.to_dict() for d in doc_ref.collection('incomes').stream()]
        commitments = [d.to_dict() for d in doc_ref.collection('commitments').stream()]
        transactions = [d.to_dict() for d in doc_ref.collection('transactions').stream()]
        events = [d.to_dict() for d in doc_ref.collection('events').stream()]
        categories = {d.id: d.to_dict() for d in doc_ref.collection('categories').stream()}
        
        print(f"  Ingresos: {len(incomes)}")
        print(f"  Compromisos: {len(commitments)}")
        print(f"  Transacciones: {len(transactions)}")
        print(f"  Eventos: {len(events)}")
        
        # Calculate totals
        total_income = sum(float(i.get('amount', 0) or 0) for i in incomes)
        total_commitments = sum(float(c.get('amount', 0) or 0) for c in commitments)
        total_events = sum(float(e.get('amount_estimate', 0) or 0) for e in events)
        total_expenses = sum(abs(float(t.get('amount', 0) or 0)) for t in transactions if float(t.get('amount', 0) or 0) < 0)
        
        balance = total_income - total_commitments
        
        now = datetime.now()
        month_name = now.strftime("%B %Y")
        
        md_lines = [
            f"# Reporte Financiero - {hh_name}",
            f"",
            f"**Generado:** {now.strftime('%Y-%m-%d %H:%M')}",
            f"**Mes:** {month_name}",
            f"",
            f"---",
            f"",
            f"## 💰 Resumen General",
            f"",
            f"| Concepto | Monto |",
            f"|----------|------:|",
            f"| **Total Ingresos (mensual)** | ${total_income:,.0f} |",
            f"| **Total Compromisos (mensual)** | ${total_commitments:,.0f} |",
            f"| **Balance Proyectado** | ${balance:,.0f} |",
            f"| Eventos Programados | ${total_events:,.0f} |",
            f"| Gastos Registrados | ${total_expenses:,.0f} |",
            f"",
            f"---",
            f"",
        ]
        
        # INGRESOS
        md_lines.extend([
            f"## 📥 Ingresos ({len(incomes)})",
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
            md_lines.append(f"| **TOTAL** | **${total_income:,.0f}** | |")
        else:
            md_lines.append("*No hay ingresos registrados.*")
        
        # COMPROMISOS
        md_lines.extend([
            f"",
            f"---",
            f"",
            f"## 📤 Compromisos Mensuales ({len(commitments)})",
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
            md_lines.append(f"| **TOTAL** | **${total_commitments:,.0f}** | | |")
        else:
            md_lines.append("*No hay compromisos registrados.*")
        
        # EVENTOS
        md_lines.extend([
            f"",
            f"---",
            f"",
            f"## 📅 Eventos Programados ({len(events)})",
            f"",
        ])
        if events:
            md_lines.append("| Nombre | Monto | Fecha | Obligatorio |")
            md_lines.append("|--------|------:|-------|:-----------:|")
            for ev in sorted(events, key=lambda x: x.get('date', ''), reverse=False):
                name = ev.get('name', 'Sin nombre')
                amount = float(ev.get('amount_estimate', 0) or 0)
                date = ev.get('date', '-')
                mandatory = "✅" if ev.get('is_mandatory') else "❌"
                md_lines.append(f"| {name} | ${amount:,.0f} | {date} | {mandatory} |")
        else:
            md_lines.append("*No hay eventos programados.*")
        
        # TRANSACCIONES RECIENTES
        md_lines.extend([
            f"",
            f"---",
            f"",
            f"## 🧾 Transacciones Recientes ({len(transactions)})",
            f"",
        ])
        if transactions:
            md_lines.append("| Descripción | Monto | Fecha | Categoría |")
            md_lines.append("|-------------|------:|-------|-----------|")
            sorted_tx = sorted(transactions, key=lambda x: str(x.get('occurred_on', '')), reverse=True)
            for tx in sorted_tx[:30]:  # Limit to last 30
                desc = tx.get('description', 'Sin descripción')[:40]
                amount = float(tx.get('amount', 0) or 0)
                date = tx.get('occurred_on', '-')
                if hasattr(date, 'isoformat'):
                    date = date.isoformat()[:10]
                cat_id = tx.get('category_id')
                cat_name = categories.get(cat_id, {}).get('name', '-') if cat_id else '-'
                md_lines.append(f"| {desc} | ${amount:,.0f} | {date} | {cat_name} |")
        else:
            md_lines.append("*No hay transacciones registradas.*")
        
        md_lines.extend([
            f"",
            f"---",
            f"",
            f"*Reporte generado automáticamente desde Firestore (Producción).*"
        ])
        
        all_reports.append('\n'.join(md_lines))
    
    # Write combined report
    output_path = os.path.join(os.path.dirname(__file__), "REPORTE_PRODUCCION.md")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n\n---\n\n'.join(all_reports))
    
    print(f"\n✅ Reporte guardado en: {output_path}")

if __name__ == "__main__":
    main()
