import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIncomes, getCommitments, getEvents, getBitacora } from '../../services/api';

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



const AnnualPlan = () => {
    const navigate = useNavigate();
    const currentMonthIndex = new Date().getMonth();
    const [selectedMonth, setSelectedMonth] = useState(currentMonthIndex);
    const [answers, setAnswers] = useState({});

    // States for Funds Data
    const [familyFunds, setFamilyFunds] = useState([]);
    const [loadingFunds, setLoadingFunds] = useState(true);

    // States for Flow Data
    const [annualProjection, setAnnualProjection] = useState([]);
    const [annualizedCommitments, setAnnualizedCommitments] = useState([]);
    const [financialHealth, setFinancialHealth] = useState(null);
    const [loadingFlow, setLoadingFlow] = useState(true);

    const fetchFlowData = async () => {
        try {
            const [inc, com, ev] = await Promise.all([
                getIncomes(), getCommitments(), getEvents()
            ]);

            const incomes = inc || [];
            const commitments = com || [];
            const events = ev || [];

            // 1. Calculate Monthly Fixed Income
            const monthlyIncomes = incomes.reduce((sum, item) => {
                if (item.is_variable) return sum;
                let amt = Number(item.amount || 0);
                if (item.frequency === 'weekly') return sum + (amt * 4);
                if (item.frequency === 'biweekly') return sum + (amt * 2);
                if (item.frequency === 'yearly' || item.frequency === 'one_time') return sum;
                return sum + amt;
            }, 0);

            // 2. Base Monthly Commitments
            const monthlyCommitmentsList = commitments.filter(c => c.frequency === 'monthly' || c.frequency === 'weekly' || c.frequency === 'biweekly');

            // Sorted list of annualized commitments
            const annualizedList = monthlyCommitmentsList.map(c => {
                let baseMonth = Number(c.amount || 0);
                if (c.frequency === 'weekly') baseMonth *= 4;
                if (c.frequency === 'biweekly') baseMonth *= 2;

                let remainingMonths = 12;
                let isInstallment = false;
                if (c.installments_total > 0) {
                    isInstallment = true;
                    remainingMonths = Math.max(0, c.installments_total - (c.installments_paid || 0));
                }

                const annualImpact = baseMonth * Math.min(12, remainingMonths);

                return {
                    name: c.name,
                    monthly: baseMonth,
                    annual: annualImpact,
                    isInstallment: isInstallment,
                    remaining: remainingMonths
                };
            }).sort((a, b) => b.annual - a.annual);
            setAnnualizedCommitments(annualizedList);

            // 3. Calculate Base Monthly Expenses for the 50/30/20 Rule
            let baseExpenses = 0;
            monthlyCommitmentsList.forEach(c => {
                let amt = Number(c.amount || 0);
                if (c.frequency === 'weekly') amt *= 4;
                if (c.frequency === 'biweekly') amt *= 2;
                baseExpenses += amt;
            });
            const idealIncome = baseExpenses * 2;
            const incomeGap = idealIncome > monthlyIncomes ? idealIncome - monthlyIncomes : 0;
            setFinancialHealth({
                currentIncome: monthlyIncomes,
                fixedExpenses: baseExpenses,
                idealIncome: idealIncome,
                incomeGap: incomeGap,
                healthRatio: monthlyIncomes > 0 ? (baseExpenses / monthlyIncomes) * 100 : 100
            });

            // 4. Build 12-month projection for current year
            const year = new Date().getFullYear();
            const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

            const projection = [];
            for (let i = 0; i < 12; i++) {
                let monthInc = monthlyIncomes;
                let monthExp = 0;
                let notas = [];

                const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`;

                // Add monthly/weekly/biweekly commitments conditionally
                monthlyCommitmentsList.forEach(c => {
                    let amt = Number(c.amount || 0);
                    if (c.frequency === 'weekly') amt *= 4;
                    if (c.frequency === 'biweekly') amt *= 2;

                    if (c.installments_total > 0) {
                        const remaining = Math.max(0, c.installments_total - (c.installments_paid || 0));
                        if (i < remaining) {
                            monthExp += amt;
                        }
                    } else {
                        monthExp += amt;
                    }
                });

                // Variable / One-time incomes for this month
                incomes.forEach(item => {
                    if (item.is_variable && item.month === monthStr) {
                        monthInc += Number(item.amount || 0);
                    }
                });

                // Specific Commitments for this month (Yearly, One time)
                commitments.forEach(c => {
                    if (c.frequency === 'yearly' || c.frequency === 'one_time') {
                        if (c.next_date && c.next_date.startsWith(monthStr)) {
                            monthExp += Number(c.amount || 0);
                            notas.push(`${c.name}`);
                        } else if (c.frequency === 'yearly' && c.next_date && c.next_date.substring(5, 7) === String(i + 1).padStart(2, '0')) {
                            // If yearly and falls in this month of any year, just project it for this month
                            monthExp += Number(c.amount || 0);
                            notas.push(`${c.name}`);
                        }
                    }
                });

                // Specific Events for this month
                events.forEach(e => {
                    if (e.date && e.date.startsWith(monthStr)) {
                        monthExp += Number(e.amount || 0);
                        notas.push(e.name);
                    }
                });

                const neto = monthInc - monthExp;
                projection.push({
                    month: monthNames[i],
                    ingresos: monthInc,
                    gastosFijos: monthExp,
                    neto: neto,
                    alerta: neto < 0,
                    nota: notas.join(', ')
                });
            }
            setAnnualProjection(projection);
            setLoadingFlow(false);
        } catch (err) {
            console.error(err);
            setLoadingFlow(false);
        }
    };

    const fetchFundsData = async () => {
        try {
            const data = await getBitacora();
            const bitacora = data || [];

            // Filter projects meant as "funds" or savings. We look for 'project' kind.
            const projects = bitacora.filter(entry =>
                String(entry.kind || '').toLowerCase() === 'project' &&
                entry.status !== 'archived' &&
                Number(entry.meta?.estimated_cost || 0) > 0
            );

            const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

            const funds = projects.map((p, idx) => {
                const target = Number(p.meta?.estimated_cost || 0);
                const current = Number(p.meta?.total_paid || 0);

                return {
                    id: p.id,
                    name: p.title || 'Proyecto Sin Nombre',
                    current: current,
                    target: target,
                    color: colors[idx % colors.length]
                };
            });

            setFamilyFunds(funds);
            setLoadingFunds(false);
        } catch (err) {
            console.error(err);
            setLoadingFunds(false);
        }
    };

    useEffect(() => {
        fetchFlowData();
        fetchFundsData();
    }, []);

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
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginBottom: '12px' }}>
                    Proyectos activos en tu Bitácora.
                </p>

                {loadingFunds ? (
                    <div style={{ color: '#888', fontSize: '0.85rem', textAlign: 'center' }}>Cargando proyectos...</div>
                ) : familyFunds.length === 0 ? (
                    <div style={{ color: '#aaa', fontSize: '0.85rem', textAlign: 'center', background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                        No tienes proyectos configurados en la Bitácora.
                    </div>
                ) : (
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
                )}
            </div>

            {/* Meta de Ingresos (Regla 50/30/20) */}
            <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 12px 0', color: 'var(--color-text-main)' }}>
                    Ingreso Ideal (Regla 50/30/20)
                </h3>
                {loadingFlow ? (
                    <div style={{ color: '#888', fontSize: '0.85rem' }}>Calculando regla 50/30/20...</div>
                ) : financialHealth && (
                    <div style={{
                        background: 'var(--color-bg-elevated, #fff)',
                        padding: '16px', borderRadius: '12px',
                        border: '1px solid var(--border-light, #e2e8f0)'
                    }}>
                        <p style={{ fontSize: '0.85rem', margin: '0 0 12px 0', color: 'var(--color-text-dim)', lineHeight: '1.4' }}>
                            Tus <strong>gastos fijos</strong> no deberían superar el <strong>50%</strong> de tus ingresos mensuales.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Gastos Fijos/Mes</div>
                                <div style={{ fontWeight: '700', color: 'var(--color-text-main)' }}>{formatCurrency(financialHealth.fixedExpenses)}</div>
                                <div style={{ fontSize: '0.7rem', marginTop: '4px', fontWeight: '600', color: financialHealth.healthRatio <= 50 ? '#166534' : '#991b1b' }}>
                                    {financialHealth.healthRatio.toFixed(1)}% de tu ingreso actual
                                </div>
                            </div>
                            <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                                <div style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: '600' }}>Ingreso Total Ideal</div>
                                <div style={{ fontWeight: '800', color: '#0369a1', fontSize: '1.1rem' }}>{formatCurrency(financialHealth.idealIncome)}</div>
                            </div>
                        </div>

                        {financialHealth.incomeGap > 0 ? (
                            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '12px', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.5rem' }}>📈</span>
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#b45309' }}>Brecha a Generar</div>
                                    <div style={{ fontSize: '0.8rem', color: '#b45309', lineHeight: '1.3', marginTop: '2px' }}>
                                        Te faltan <strong>{formatCurrency(financialHealth.incomeGap)}</strong> al mes para estar al día. (Extras o ahorros).
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.5rem' }}>🏆</span>
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#166534' }}>¡Equilibrio Saludable!</div>
                                    <div style={{ fontSize: '0.8rem', color: '#166534', lineHeight: '1.3', marginTop: '2px' }}>
                                        Tu ingreso fijo actual ya cubre tus gastos y margen de ahorro.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
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
                                {loadingFlow ? (
                                    <tr><td colSpan="4" style={{ padding: '12px', textAlign: 'center', color: '#888' }}>Cargando datos del flujo real...</td></tr>
                                ) : (
                                    annualProjection.map((row, i) => (
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
                                    )))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Costo Anualizado de Gastos Recurrentes */}
            <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 12px 0', color: 'var(--color-text-main)' }}>
                    Impacto Anual de Fijos
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginBottom: '12px' }}>
                    Tus pagos recurrentes mensualizados, vistos a lo largo de 12 meses.
                </p>

                {loadingFlow ? (
                    <div style={{ color: '#888', fontSize: '0.85rem', textAlign: 'center' }}>Cargando gastos fijos...</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {annualizedCommitments.map((c, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px',
                                background: 'var(--color-bg-elevated, #fff)',
                                border: '1px solid var(--border-light, #e2e8f0)',
                                borderRadius: '10px'
                            }}>
                                <div>
                                    <div style={{ fontWeight: '600', color: 'var(--color-text-main)', fontSize: '0.95rem' }}>
                                        {c.name} {c.isInstallment && <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--color-text-dim)', background: '#f1f5f9', padding: '2px 6px', borderRadius: '10px', marginLeft: '4px' }}>Cuotas</span>}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                        {formatCurrency(c.monthly)} / mes
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.75rem', color: c.isInstallment && c.remaining < 12 ? '#d97706' : 'var(--status-red-main)', fontWeight: '600', marginBottom: '2px' }}>
                                        {c.isInstallment && c.remaining < 12 ? `Costo Restante (${c.remaining}m)` : 'Costo a 1 Año'}
                                    </div>
                                    <div style={{ fontWeight: '800', color: 'var(--color-text-main)', fontSize: '1rem' }}>
                                        {formatCurrency(c.annual)}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {annualizedCommitments.length > 0 && (
                            <div style={{
                                marginTop: '4px', padding: '12px', background: '#fef2f2',
                                borderRadius: '10px', display: 'flex', justifyContent: 'space-between',
                                border: '1px solid #fecaca'
                            }}>
                                <span style={{ fontWeight: '700', color: '#991b1b' }}>Total Anual:</span>
                                <span style={{ fontWeight: '800', color: '#991b1b' }}>
                                    {formatCurrency(annualizedCommitments.reduce((acc, curr) => acc + curr.annual, 0))}
                                </span>
                            </div>
                        )}
                    </div>
                )}
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
