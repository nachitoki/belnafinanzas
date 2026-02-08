import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const CommitmentChart = ({ commitments, onFilterChange, selectedCategory }) => {
    // 1. Validar datos
    if (!commitments || commitments.length === 0) return null;

    // 2. Agrupar por categoría
    // "Almuerzos Planificados" y "Total Compra Grande" suelen ser "structural" o "Alimentación"
    // Usaremos la lógica de agrupación del componente padre si es posible, o una simplificada aquí.

    const getGroup = (c) => {
        // Lógica de agrupación visual (debe coincidir con Commitments.jsx idealmente)
        // O podemos agrupar por 'flow_category' si es más simple, pero el usuario quiere ver "Hogar", "Educación", etc.
        const name = (c.name || '').toLowerCase();
        // Excluir sintéticos duplicados si los hubiera, pero aquí entran todos.

        if (name.includes('arriendo') || name.includes('dividendo') || name.includes('luz') || name.includes('agua') || name.includes('gas') || name.includes('internet') || name.includes('casa') || name.includes('nana')) return 'Hogar';
        if (name.includes('colegio') || name.includes('jardin') || name.includes('universidad') || name.includes('matricula')) return 'Educación';
        if (name.includes('auto') || name.includes('bencina') || name.includes('tag') || name.includes('seguro auto') || name.includes('permiso') || name.includes('patente')) return 'Transporte';
        if (name.includes('isapre') || name.includes('seguro vida') || name.includes('medico') || name.includes('farmacia') || name.includes('doctor')) return 'Salud';
        if (name.includes('credito') || name.includes('prestamo') || name.includes('visa') || name.includes('mastercard') || name.includes('banco') || name.includes('cuota')) return 'Deudas';
        if (name.includes('super') || name.includes('jumbo') || name.includes('lider') || name.includes('unimarc') || name.includes('pan') || name.includes('fruta') || name.includes('feria') || name.includes('almuerzo') || name.includes('compra')) return 'Alimentación';
        return 'Otros';
    };

    // Ignoramos la tarjeta "Total Compra Grande" para el gráfico si duplica información?
    // "Almuerzos Planificados" + "Extras" = "Total Compra Grande".
    // Si mostramos ambas, se duplicará el monto visua.
    // FILTRO: Excluir "Total Compra Grande" del gráfico para no duplicar 'Almuerzos'.
    // Pero el usuario pidió ver "Almuerzos" y "Compra Grande" como tarjetas fijas.
    // Para el gráfico, usaremos los items individuales y "Almuerzos" (que es un item sintético).
    // "Total Compra Grande" es un resumen, mejor excluirlo del gráfico de distribución.

    const dataMap = commitments
        .filter(c => c.id !== 'synthetic_shopping') // Evitar duplicidad visual en el gráfico
        .reduce((acc, c) => {
            const group = getGroup(c);
            acc[group] = (acc[group] || 0) + Number(c.amount || 0);
            return acc;
        }, {});

    const data = Object.entries(dataMap).map(([name, value]) => ({ name, value }));
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Colores modernos y vibrantes
    const COLORS = {
        'Hogar': '#3B82F6', // Blue 500
        'Alimentación': '#10B981', // Emerald 500
        'Educación': '#F59E0B', // Amber 500
        'Salud': '#EF4444', // Red 500
        'Transporte': '#6366F1', // Indigo 500
        'Deudas': '#8B5CF6', // Violet 500
        'Otros': '#9CA3AF'  // Gray 400
    };

    const renderCenterLabel = () => {
        if (selectedCategory) {
            const catData = data.find(d => d.name === selectedCategory);
            return (
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                    <tspan x="50%" dy="-10" fontSize="14" fontWeight="600" fill="#666">{selectedCategory}</tspan>
                    <tspan x="50%" dy="20" fontSize="14" fontWeight="800" fill="#333">${catData?.value?.toLocaleString('es-CL')}</tspan>
                </text>
            );
        }
        return (
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                <tspan x="50%" dy="-10" fontSize="12" fontWeight="600" fill="#888">Total Mensual</tspan>
                <tspan x="50%" dy="22" fontSize="16" fontWeight="800" fill="#333">${total.toLocaleString('es-CL')}</tspan>
            </text>
        );
    };

    return (
        <div style={{ width: '100%', height: 260, position: 'relative', marginBottom: '10px' }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        onClick={(entry) => {
                            const newCat = entry.name === selectedCategory ? null : entry.name;
                            onFilterChange(newCat);
                        }}
                        cursor="pointer"
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={COLORS[entry.name] || COLORS['Otros']}
                                opacity={selectedCategory && selectedCategory !== entry.name ? 0.3 : 1}
                                stroke="none"
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value) => `$${value.toLocaleString('es-CL')}`}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Center Text Overlay (Simulated since Recharts Label can be tricky with positioning) */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                pointerEvents: 'none', textAlign: 'center'
            }}>
                {selectedCategory ? (
                    <>
                        <div style={{ fontSize: '0.8rem', color: '#888', fontWeight: '600' }}>{selectedCategory}</div>
                        <div style={{ fontSize: '0.95rem', color: '#111', fontWeight: '800' }}>
                            ${data.find(d => d.name === selectedCategory)?.value?.toLocaleString('es-CL')}
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: '600', textTransform: 'uppercase' }}>Total</div>
                        <div style={{ fontSize: '1rem', color: '#111', fontWeight: '800' }}>
                            ${total.toLocaleString('es-CL')}
                        </div>
                    </>
                )}
            </div>

            {selectedCategory && (
                <button
                    onClick={() => onFilterChange(null)}
                    style={{
                        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                        background: '#f3f4f6', border: 'none', padding: '4px 12px', borderRadius: '12px',
                        fontSize: '0.75rem', color: '#666', cursor: 'pointer', fontWeight: '600'
                    }}
                >
                    Ver Todos
                </button>
            )}
        </div>
    );
};

export default CommitmentChart;
