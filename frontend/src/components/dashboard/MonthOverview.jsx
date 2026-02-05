import React, { useEffect, useMemo, useState } from 'react';
import { loadDistributionMeta } from '../../utils/distributionMeta';
import { askBitacora } from '../../services/api';

const DASHBOARD_AI_CACHE_KEY = 'ai_dashboard_cache_v1';

const MonthOverview = ({ data, distributionReal, projectEntry }) => {
    if (!data) return null;

    const [aiMessage, setAiMessage] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiExpanded, setAiExpanded] = useState(false);

    const fmt = (n) => Math.round(Number(n || 0)).toLocaleString('es-CL');
    const incomeTotal = Number(data.income_total || 0);
    const commitmentsTotal = Number(data.commitments_total || 0);
    const eventsMandatory = Number(data.events_mandatory_total || 0);
    const eventsOptional = Number(data.events_optional_total || 0);
    const projectedBalance = Number(data.projected_balance || 0);

    const optionalBudget = (data.optional_budget !== undefined && data.optional_budget !== null)
        ? data.optional_budget
        : Math.max(projectedBalance || 0, 0);
    const stabilizationBuffer = projectedBalance > 0 ? Math.round(projectedBalance) : 0;
    const availableOptional = Math.max(optionalBudget - stabilizationBuffer, 0);

    const oxigeno = commitmentsTotal + eventsMandatory;
    const vida = eventsOptional;
    const blindaje = Math.max(incomeTotal - oxigeno - vida, 0);
    const denom = incomeTotal > 0 ? incomeTotal : Math.max(oxigeno + vida + blindaje, 1);

    const pct = (value) => Math.max(0, Math.round((value / denom) * 100));
    const pctOxigeno = pct(oxigeno);
    const pctVida = pct(vida);
    const pctBlindaje = Math.max(0, 100 - pctOxigeno - pctVida);

    const effectiveMeta = loadDistributionMeta({ realDistribution: distributionReal });

    const distributionMessage = (() => {
        if (pctBlindaje <= 0) return 'Este mes no hay margen para Blindaje sin ajustar Oxígeno.';
        if (pctOxigeno - meta.oxigeno >= 10) {
            const delta = Math.round(((pctOxigeno - meta.oxigeno) / 100) * denom);
            return `Si reduces ${fmt(delta)} en Oxígeno, Blindaje podría subir este mes.`;
        }
        if (meta.blindaje - pctBlindaje >= 5) {
            const gap = Math.round(((meta.blindaje - pctBlindaje) / 100) * denom);
            return `Queda ${fmt(gap)} para Blindaje este mes.`;
        }
        return 'Vas en línea con la distribución. Mantén el ritmo.';
    })();

    const liquidityMessage = (() => {
        if (projectedBalance < 0) return 'IA: prioridad liquidez futura. Evita nuevos compromisos.';
        if (stabilizationBuffer > 0) return 'IA: excedente reservado en Fondo de estabilización (no disponible).';
        return null;
    })();

    const spendRatio = incomeTotal > 0 ? (oxigeno + vida) / incomeTotal : 0;
    const pulseState = spendRatio <= 0.9 ? 'green' : spendRatio <= 1 ? 'yellow' : 'red';
    const pulseMessage = pulseState === 'green'
        ? 'Mes estable respecto a tu promedio.'
        : pulseState === 'yellow'
            ? 'El mes viene más ajustado. Ojo con gastos variables.'
            : 'Ritmo alto de gasto. Revisa variables esta semana.';

    const pulseColor = pulseState === 'green'
        ? 'var(--status-green-main)'
        : pulseState === 'yellow'
            ? 'var(--status-yellow-main)'
            : 'var(--status-red-main)';

    const weekBase = [0.35, 0.5, 0.65, 0.8];
    const weekFactor = pulseState === 'green' ? 0.9 : pulseState === 'yellow' ? 1 : 1.1;
    const weeklyHeights = weekBase.map((v) => Math.min(1, v * weekFactor));

    const projectMonthly = useMemo(() => {
        if (!projectEntry?.meta) return 0;
        const monthlyTarget = Number(projectEntry.meta.monthly_target || 0);
        if (monthlyTarget > 0) return monthlyTarget;
        const cost = Number(projectEntry.meta.estimated_cost || 0);
        const horizon = Number(projectEntry.meta.horizon_months || 0);
        if (cost > 0 && horizon > 0) return Math.round(cost / horizon);
        return 0;
    }, [projectEntry]);

    const AI_PREVIEW_LIMIT = 140;

    const aiContextKey = useMemo(() => (
        JSON.stringify({
            incomeTotal,
            commitmentsTotal,
            eventsMandatory,
            eventsOptional,
            pctOxigeno,
            pctVida,
            pctBlindaje,
            pulseState,
            projectedBalance,
            projectMonthly
        })
    ), [
        incomeTotal,
        commitmentsTotal,
        eventsMandatory,
        eventsOptional,
        pctOxigeno,
        pctVida,
        pctBlindaje,
        pulseState,
        projectedBalance,
        projectMonthly
    ]);

    useEffect(() => {
        let active = true;
        const cachedRaw = window.localStorage.getItem(DASHBOARD_AI_CACHE_KEY);
        if (cachedRaw) {
            try {
                const cached = JSON.parse(cachedRaw);
                if (cached?.key === aiContextKey && cached?.message) {
                    setAiMessage(cached.message);
                    setAiExpanded(false);
                    return () => { active = false; };
                }
            } catch (e) {
                // ignore cache parse errors
            }
        }
        const fetchAiMessage = async () => {
            setAiLoading(true);
            try {
                const context = [
                    `Ingresos: ${fmt(incomeTotal)}`,
                    `Compromisos: ${fmt(commitmentsTotal)}`,
                    `Eventos obligatorios: ${fmt(eventsMandatory)}`,
                    `Eventos opcionales: ${fmt(eventsOptional)}`,
                    `Oxigeno: ${pctOxigeno}%, Vida: ${pctVida}%, Blindaje: ${pctBlindaje}%`,
                    `Pulso: ${pulseState}`,
                    `Saldo proyectado: ${fmt(projectedBalance)}`,
                    projectMonthly > 0 ? `Proyecto activo: ${fmt(projectMonthly)} / mes` : ''
                ].filter(Boolean).join('. ');
                const res = await askBitacora({
                    question: 'Genera 1 mensaje MUY breve para dashboard (max 160 caracteres). Sin bullets. Una sola frase + sugerencia suave si aplica.',
                    context
                });
                if (!active) return;
                const raw = (res?.answer || '').replace(/\s+/g, ' ').trim();
                const clean = raw;
                setAiMessage(clean);
                setAiExpanded(false);
                window.localStorage.setItem(DASHBOARD_AI_CACHE_KEY, JSON.stringify({ key: aiContextKey, message: clean }));
            } catch (err) {
                if (!active) return;
                setAiMessage('');
            } finally {
                if (active) setAiLoading(false);
            }
        };
        fetchAiMessage();

        return () => { active = false; };
    }, [aiContextKey, incomeTotal, commitmentsTotal, eventsMandatory, eventsOptional, pctOxigeno, pctVida, pctBlindaje, pulseState, projectedBalance]);

    return (
        <div className="spending-card">
            <div className="section-title">Cómo viene el mes</div>

            <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>
                    Distribución del ingreso
                </div>
                <div style={{ display: 'flex', height: '12px', borderRadius: '999px', overflow: 'hidden', background: '#e2e8f0' }}>
                    <div style={{ width: `${pctOxigeno}%`, background: '#FCA5A5' }} />
                    <div style={{ width: `${pctVida}%`, background: '#FCD34D' }} />
                    <div style={{ width: `${pctBlindaje}%`, background: '#86EFAC' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '6px' }}>
                    <span>Oxígeno {pctOxigeno}%</span>
                    <span>Vida {pctVida}%</span>
                    <span>Blindaje {pctBlindaje}%</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '4px' }}>
                    Meta: Oxígeno {effectiveMeta.oxigeno}% - Vida {effectiveMeta.vida}% - Blindaje {effectiveMeta.blindaje}%
                </div>
                <div style={{ marginTop: '6px', fontSize: '0.85rem' }}>{distributionMessage}</div>
                <div style={{ marginTop: '6px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                    {aiLoading
                        ? 'IA: generando mensaje...'
                        : (aiMessage
                            ? `IA: ${aiExpanded || aiMessage.length <= AI_PREVIEW_LIMIT ? aiMessage : `${aiMessage.slice(0, AI_PREVIEW_LIMIT)}...`}`
                            : 'IA: mensaje no disponible.')}
                </div>
                {aiMessage && aiMessage.length > AI_PREVIEW_LIMIT && (
                    <button
                        onClick={() => setAiExpanded((prev) => !prev)}
                        style={{
                            marginTop: '4px',
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            borderRadius: '999px',
                            border: '1px solid var(--border-light)',
                            background: '#ffffff',
                            cursor: 'pointer'
                        }}
                    >
                        {aiExpanded ? 'Ver menos' : 'Ver mas'}
                    </button>
                )}
                {liquidityMessage && (
                    <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                        {liquidityMessage}
                    </div>
                )}
                {projectMonthly > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                        Proyecto activo impacta {fmt(projectMonthly)} / mes.
                    </div>
                )}
            </div>

            <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>
                    Pulso del mes
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '44px' }}>
                    {weeklyHeights.map((h, idx) => (
                        <div
                            key={`wk-${idx}`}
                            style={{
                                width: '20%',
                                height: `${Math.round(h * 100)}%`,
                                background: pulseColor,
                                borderRadius: '6px'
                            }}
                        />
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                    <span style={{ fontWeight: '700' }}>Saldo proyectado</span>
                    <span style={{ fontWeight: '800', color: projectedBalance >= 0 ? 'var(--status-green-main)' : 'var(--status-red-main)' }}>{fmt(projectedBalance)}</span>
                </div>
                {stabilizationBuffer > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                        <span style={{ color: 'var(--color-text-dim)' }}>Fondo de estabilización (invisible)</span>
                        <span style={{ fontWeight: '700', color: 'var(--color-text-dim)' }}>{fmt(stabilizationBuffer)}</span>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ color: 'var(--color-text-dim)' }}>Disponible para opcionales</span>
                    <span style={{ fontWeight: '700', color: 'var(--status-yellow-main)' }}>{fmt(availableOptional)}</span>
                </div>
            </div>

            {Array.isArray(data.projections) && data.projections.length > 1 && (
                <div style={{ marginTop: '12px', borderTop: '1px dashed var(--border-light)', paddingTop: '10px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>Proyección 3 meses</div>
                    {data.projections.slice(1, 4).map((p) => (
                        <div key={p.month} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: 'var(--color-text-dim)' }}>{p.month}</span>
                            <span style={{ fontWeight: '700', color: p.projected_balance >= 0 ? 'var(--status-green-main)' : 'var(--status-red-main)' }}>
                                {fmt(p.projected_balance)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MonthOverview;
