import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const patrimoreMonths = [
    {
        id: 'ene', name: 'Enero', title: 'Empieza Bien, Planifica Tu Año',
        desc: 'Enero es el mes para ordenar, priorizar y tomar decisiones estratégicas. Transforma la intención en acción.',
        activities: [
            { label: 'Meta a Corto Plazo', type: 'text' },
            { label: 'Meta a Mediano Plazo', type: 'text' },
            { label: 'Meta a Largo Plazo', type: 'text' }
        ]
    },
    {
        id: 'feb', name: 'Febrero', title: 'Disfruta Hoy, Sin Pagarlo Mañana',
        desc: 'Disfrutar está perfecto, pero con equilibrio es mejor. El bienestar real no tensiona el futuro.',
        activities: [
            { label: 'Gasto de disfrute esencial 1', type: 'text' },
            { label: 'Gasto de disfrute esencial 2', type: 'text' },
            { label: 'Gasto innecesario a reducir', type: 'text' }
        ]
    },
    {
        id: 'mar', name: 'Marzo', title: 'Pon en Orden Tu Año y Tu Billetera',
        desc: 'La rutina vuelve con fuerza. Marzo invita a ordenar compromisos para dar estabilidad al resto del año.',
        activities: [
            { label: 'Gastos fijos principales', type: 'textarea' },
            { label: '¿Cuáles puedes optimizar?', type: 'text' }
        ]
    },
    {
        id: 'abr', name: 'Abril', title: 'Impuestos con Inteligencia',
        desc: 'Conocer el sistema es forma de cuidar el patrimonio. Entiende tus beneficios y organízate.',
        activities: [
            { label: 'Beneficios aprovechables', type: 'text' },
            { label: 'Dudas pendientes por resolver', type: 'textarea' }
        ]
    },
    {
        id: 'may', name: 'Mayo', title: 'Planificar es Cuidar',
        desc: 'Pensar en el futuro es una expresión de amor hacia quienes forman parte de nuestra vida.',
        activities: [
            { label: '¿A quién quieres proteger?', type: 'text' },
            { label: 'Acción preventiva para asegurarlo', type: 'textarea' }
        ]
    },
    {
        id: 'jun', name: 'Junio', title: 'Recalcula Tu Rumbo',
        desc: 'Mitad del año. Evalúa qué metas siguen vigentes, cuáles cambiaron y ajusta el camino.',
        activities: [
            { label: 'Metas de enero vigentes', type: 'textarea' },
            { label: 'Ajuste mensual de presupuesto', type: 'text' }
        ]
    },
    {
        id: 'jul', name: 'Julio', title: 'Protege Lo Que Has Construido',
        desc: 'Previsión y estructura permiten enfrentar imprevistos sin desestabilizar la vida.',
        activities: [
            { label: 'Pilares financieros actuales', type: 'textarea' },
            { label: '¿Qué podría afectarlos?', type: 'text' }
        ]
    },
    {
        id: 'ago', name: 'Agosto', title: 'Tu Legado Comienza Hoy',
        desc: 'Piensa en futuro, continuidad y trascendencia. ¿Qué quieres construir más allá de ti?',
        activities: [
            { label: 'Impacto que deseas dejar', type: 'textarea' },
            { label: 'Primer paso concreto', type: 'text' }
        ]
    },
    {
        id: 'sep', name: 'Septiembre', title: 'Celebra con Sentido y Presupuesto',
        desc: 'Disfrutar plenamente, pero con equilibrio. Elige con intención y disfruta sin culpa.',
        activities: [
            { label: 'Presupuesto máximo de disfrute', type: 'number' },
            { label: 'Ajustes para convivir con este gasto', type: 'textarea' }
        ]
    },
    {
        id: 'oct', name: 'Octubre', title: 'Revisa tus Inversiones',
        desc: 'Momento de revisar dónde está tu dinero y qué rentabilidad y seguridad te está dando.',
        activities: [
            { label: 'Instrumentos actuales', type: 'textarea' },
            { label: 'Próxima inversión objetivo', type: 'text' }
        ]
    },
    {
        id: 'nov', name: 'Noviembre', title: 'Prepárate para el Cierre',
        desc: 'Anticipa los gastos fuertes que vienen a fin de año para que no te tomen por sorpresa.',
        activities: [
            { label: 'Gastos proyectados diciembre', type: 'textarea' },
            { label: 'Ahorro necesario hoy', type: 'number' }
        ]
    },
    {
        id: 'dic', name: 'Diciembre', title: 'Balance y Reflexión',
        desc: 'Cierre del año. Celebra lo logrado, aprende de los errores y descansa para el próximo.',
        activities: [
            { label: 'Mayor logro financiero', type: 'text' },
            { label: 'Lección más importante', type: 'textarea' }
        ]
    }
];

// Mock flow data for the Annual projection matrix
const annualProjection = [
    { month: 'Ene', ingresos: 2100000, gastosFijos: 1500000, neto: 600000, alerta: false },
    { month: 'Feb', ingresos: 2100000, gastosFijos: 1500000, neto: 600000, alerta: false },
    { month: 'Mar', ingresos: 2100000, gastosFijos: 2800000, neto: -700000, alerta: true, nota: 'Matrículas y Permisos de Circulación' },
    { month: 'Abr', ingresos: 2100000, gastosFijos: 1500000, neto: 600000, alerta: false },
    { month: 'May', ingresos: 2100000, gastosFijos: 1500000, neto: 600000, alerta: false },
    { month: 'Jun', ingresos: 2100000, gastosFijos: 1600000, neto: 500000, alerta: false },
];

// Mock Funds (Sobres)
const familyFunds = [
    { id: 1, name: 'Homeschooling', current: 150000, target: 400000, color: '#3B82F6' },
    { id: 2, name: 'Fondo Salud', current: 120000, target: 500000, color: '#10B981' },
];

const AnnualPlan = () => {
    const navigate = useNavigate();
    const currentMonthIndex = new Date().getMonth();
    const [selectedMonth, setSelectedMonth] = useState(currentMonthIndex);
    const [answers, setAnswers] = useState({});

    const handleAnswer = (monthId, actIndex, value) => {
        setAnswers(prev => ({
            ...prev,
            [`${monthId}-${actIndex}`]: value
        }));
    };

    const formatCurrency = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

    const activeMonthData = patrimoreMonths[selectedMonth];

    return (
        <div style={{
            padding: '20px 20px 100px',
            maxWidth: '480px',
            margin: '0 auto',
            minHeight: '100vh',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
                <button onClick={() => navigate(-1)} style={{
                    background: 'var(--color-bg-elevated, #fff)',
                    border: '1px solid var(--border-light, #e2e8f0)',
                    borderRadius: '8px',
                    width: '36px', height: '36px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer'
                }}>
                    <span style={{ fontSize: '1.2rem', color: "var(--color-text-dim, #64748b)" }}>{'<'}</span>
                </button>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-main, #0f172a)' }}>
                        Planificador Anual
                    </h1>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim, #64748b)' }}>Pauta Patrimore 2026</span>
                </div>
            </div>

            {/* Fondos de Destino (from feedback) */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 12px 0', color: 'var(--color-text-main)' }}>
                    Fondos Familiares (Sobres)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {familyFunds.map(fund => {
                        const pct = Math.min(Math.round((fund.current / fund.target) * 100), 100);
                        return (
                            <div key={fund.id} style={{
                                background: 'var(--color-bg-elevated, #fff)',
                                padding: '16px', borderRadius: '12px',
                                border: '1px solid var(--border-light, #e2e8f0)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: '600', color: 'var(--color-text-main)' }}>{fund.name}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>{pct}%</span>
                                </div>
                                <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: fund.color, borderRadius: '4px' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ fontWeight: '600' }}>{formatCurrency(fund.current)}</span>
                                    <span style={{ color: 'var(--color-text-dim)' }}>Meta: {formatCurrency(fund.target)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Matriz de Flujo Anual (from feedback) */}
            <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 12px 0', color: 'var(--color-text-main)' }}>
                    Proyección de Flujo Anual
                </h3>
                <div style={{
                    background: 'var(--color-bg-elevated, #fff)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-light, #e2e8f0)',
                    overflow: 'hidden'
                }}>
                    <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', color: 'var(--color-text-dim)' }}>
                                    <th style={{ padding: '12px', fontWeight: '600', borderBottom: '1px solid var(--border-light)' }}>Mes</th>
                                    <th style={{ padding: '12px', fontWeight: '600', borderBottom: '1px solid var(--border-light)' }}>Ingresos</th>
                                    <th style={{ padding: '12px', fontWeight: '600', borderBottom: '1px solid var(--border-light)' }}>Gastos</th>
                                    <th style={{ padding: '12px', fontWeight: '600', borderBottom: '1px solid var(--border-light)' }}>Neto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {annualProjection.map((row, i) => (
                                    <tr key={i} style={{
                                        borderBottom: '1px solid var(--border-light)',
                                        background: row.alerta ? '#fef2f2' : 'transparent'
                                    }}>
                                        <td style={{ padding: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {row.month}
                                            {row.alerta && <span style={{ color: '#ef4444' }} title={row.nota}>⚠️</span>}
                                        </td>
                                        <td style={{ padding: '12px' }}>${(row.ingresos / 1000)}k</td>
                                        <td style={{ padding: '12px' }}>${(row.gastosFijos / 1000)}k</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: '4px', fontWeight: '700',
                                                background: row.neto > 0 ? '#dcfce7' : '#fecaca',
                                                color: row.neto > 0 ? '#166534' : '#991b1b'
                                            }}>
                                                ${(row.neto / 1000)}k
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Patrimore Monthly Modules */}
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 12px 0', color: 'var(--color-text-main)' }}>
                Reflexión Mensual Patrimore
            </h3>

            {/* Month Selector Wrapper */}
            <div style={{
                margin: '0 -20px 20px -20px',
                overflowX: 'auto',
                padding: '4px 20px',
                display: 'flex',
                gap: '8px'
            }}>
                {patrimoreMonths.map((m, idx) => (
                    <button
                        key={m.id}
                        onClick={() => setSelectedMonth(idx)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            whiteSpace: 'nowrap',
                            fontWeight: '600',
                            cursor: 'pointer',
                            background: selectedMonth === idx ? 'var(--status-blue-main, #3B82F6)' : 'var(--color-bg-elevated, #fff)',
                            color: selectedMonth === idx ? '#fff' : 'var(--color-text-dim)',
                            border: selectedMonth === idx ? '1px solid var(--status-blue-main)' : '1px solid var(--border-light)'
                        }}
                    >
                        {m.name}
                    </button>
                ))}
            </div>

            {/* Active Month Content */}
            <div style={{
                background: 'var(--color-bg-elevated, #fff)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid var(--border-light, #e2e8f0)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
            }}>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: 'var(--status-blue-dark, #1E3A8A)' }}>
                    {activeMonthData.title}
                </h2>
                <p style={{ margin: '0 0 24px 0', fontSize: '0.9rem', color: 'var(--color-text-dim)', lineHeight: '1.5' }}>
                    {activeMonthData.desc}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {activeMonthData.activities.map((act, idx) => (
                        <div key={idx}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-text-main)' }}>
                                {act.label}
                            </label>
                            {act.type === 'textarea' ? (
                                <textarea
                                    value={answers[`${activeMonthData.id}-${idx}`] || ''}
                                    onChange={(e) => handleAnswer(activeMonthData.id, idx, e.target.value)}
                                    placeholder="Escribe tu respuesta aquí..."
                                    style={{
                                        width: '100%',
                                        minHeight: '80px',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-light)',
                                        fontFamily: 'inherit',
                                        fontSize: '0.9rem',
                                        resize: 'vertical',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            ) : (
                                <input
                                    type={act.type}
                                    value={answers[`${activeMonthData.id}-${idx}`] || ''}
                                    onChange={(e) => handleAnswer(activeMonthData.id, idx, e.target.value)}
                                    placeholder={act.type === 'number' ? 'Ej: 50000' : 'Escribe tu respuesta aquí...'}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-light)',
                                        fontFamily: 'inherit',
                                        fontSize: '0.9rem',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <button style={{
                    marginTop: '24px',
                    width: '100%',
                    padding: '14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--status-blue-main, #3B82F6)',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '1rem',
                    cursor: 'pointer'
                }}>
                    Guardar Reflexión de {activeMonthData.name}
                </button>
            </div>
        </div>
    );
};

export default AnnualPlan;
