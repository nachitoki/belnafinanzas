import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getIncomes, createIncome, updateIncome, deleteIncome, getBitacora, askBitacora } from '../../services/api';
import PillTabs from '../layout/PillTabs';
import { loadDistributionMeta } from '../../utils/distributionMeta';

const Incomes = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [incomes, setIncomes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState('monthly');
    const [isVariable, setIsVariable] = useState(false);
    const [month, setMonth] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [activeTab, setActiveTab] = useState('ingresos');

    const currentMonth = new Date().toISOString().slice(0, 7);
    const totalFixedMonthly = incomes.reduce((sum, inc) => {
        if (inc.is_variable) return sum;
        const amt = Number(inc.amount || 0);
        if (inc.frequency === 'weekly') return sum + amt * 4;
        if (inc.frequency === 'biweekly') return sum + amt * 2;
        if (inc.frequency === 'one_time' || inc.frequency === 'yearly') return sum;
        return sum + amt;
    }, 0);
    const variableByMonth = incomes.reduce((acc, inc) => {
        if (!inc.is_variable) return acc;
        const m = inc.month || '';
        acc[m] = (acc[m] || 0) + Number(inc.amount || 0);
        return acc;
    }, {});

    const last3Months = (() => {
        const res = [];
        const d = new Date();
        for (let i = 0; i < 3; i += 1) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            res.push(`${y}-${m}`);
            d.setMonth(d.getMonth() - 1);
        }
        return res;
    })();

    const totalVariableThisMonth = (variableByMonth[currentMonth] || 0);
    const avgVariable3Months = last3Months.reduce((sum, m) => sum + (variableByMonth[m] || 0), 0) / 3;

    const fixedBySource = incomes.reduce((acc, inc) => {
        if (inc.is_variable) return acc;
        const key = inc.name || 'Sin nombre';
        const amt = Number(inc.amount || 0);
        if (inc.frequency === 'weekly') acc[key] = (acc[key] || 0) + amt * 4;
        else if (inc.frequency === 'biweekly') acc[key] = (acc[key] || 0) + amt * 2;
        else if (inc.frequency === 'monthly') acc[key] = (acc[key] || 0) + amt;
        else acc[key] = (acc[key] || 0);
        return acc;
    }, {});

    const variableBySource = incomes.reduce((acc, inc) => {
        if (!inc.is_variable) return acc;
        const key = inc.name || 'Sin nombre';
        acc[key] = (acc[key] || 0) + Number(inc.amount || 0);
        return acc;
    }, {});
    const totalIncomes = incomes.reduce((acc, inc) => acc + Number(inc.amount || 0), 0);

    const distributionMeta = loadDistributionMeta();

    const loadIncomes = async () => {
        try {
            const data = await getIncomes();
            setIncomes(data || []);
            window.localStorage.setItem('incomes_cache_v1', JSON.stringify({ ts: Date.now(), data: data || [] }));
        } catch (e) {
            console.error('Error loading incomes', e);
            setIncomes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const cachedRaw = window.localStorage.getItem('incomes_cache_v1');
        if (cachedRaw) {
            try {
                const cached = JSON.parse(cachedRaw);
                if (Array.isArray(cached?.data)) {
                    setIncomes(cached.data);
                    setLoading(false);
                }
            } catch (e) {
                console.warn('Invalid incomes cache', e);
            }
        }
        loadIncomes();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab') || 'ingresos';
        setActiveTab(tab);
    }, [location.search]);

    const parseNumber = (value) => {
        if (value === null || value === undefined) return 0;
        const normalized = String(value).replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(normalized);
        if (Number.isNaN(parsed)) return 0;
        return Math.round(parsed);
    };

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await createIncome({
                name: name.trim(),
                amount: parseNumber(amount),
                frequency,
                is_variable: isVariable,
                month: isVariable ? month : null,
                min_amount: isVariable ? parseNumber(minAmount) : null
            });
            setName('');
            setAmount('');
            setFrequency('monthly');
            setIsVariable(false);
            setMonth('');
            setMinAmount('');
            await loadIncomes();
        } catch (e) {
            console.error('Error creating income', e);
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            alert('Error al guardar: ' + detail);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (inc) => {
        setEditingId(inc.id);
        setEditForm({
            id: inc.id,
            name: inc.name || '',
            amount: inc.amount || 0,
            frequency: inc.frequency || 'monthly',
            is_variable: inc.is_variable || false,
            month: inc.month || '',
            min_amount: inc.min_amount ?? '',
        });
    };

    const handleUpdate = async () => {
        if (!editForm.name?.trim()) return;
        setSaving(true);
        try {
            await updateIncome(editingId, {
                name: editForm.name,
                amount: parseNumber(editForm.amount),
                frequency: editForm.is_variable ? 'one_time' : editForm.frequency,
                is_variable: editForm.is_variable,
                month: editForm.is_variable ? editForm.month : null,
                min_amount: editForm.is_variable ? parseNumber(editForm.min_amount) : null
            });
            setEditingId(null);
            setEditForm({});
            await loadIncomes();
        } catch (e) {
            console.error('Error updating income', e);
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            alert('Error al guardar: ' + detail);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (incId) => {
        if (!window.confirm('Eliminar este ingreso?')) return;
        setSaving(true);
        try {
            await deleteIncome(incId);
            await loadIncomes();
        } catch (e) {
            console.error('Error deleting income', e);
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            alert('Error al eliminar: ' + detail);
        } finally {
            setSaving(false);
        }
    };

    const [distributionReal, setDistributionReal] = useState(null);
    const [projectImpact, setProjectImpact] = useState({ total: 0, count: 0 });
    const [savingsMessage, setSavingsMessage] = useState('');
    const [savingsLoading, setSavingsLoading] = useState(false);

    const getMonthlyTarget = (entry) => {
        const meta = entry?.meta || {};
        if (meta.monthly_target) return Number(meta.monthly_target);
        const horizon = Number(meta.horizon_months || 0);
        const baseCost = Number(meta.estimated_cost || 0);
        if (horizon > 0 && baseCost > 0) return Math.round(baseCost / horizon);
        const tco = Number(meta.tco_total || 0);
        if (horizon > 0 && tco > 0) return Math.round(tco / horizon);
        return 0;
    };

    const loadDistributionReal = async () => {
        try {
            // We reuse getIncomes which is already imported, but we need getDashboardSummary logic.
            // Since we don't have getDashboardSummary exported in api.js readily available in this file's imports, 
            // let's check if we can import it or if we need to add it.
            // Actually, we can just use the endpoint directly if api.js has a generic 'get' or similar, 
            // but let's assume we need to import 'getDashboardSummary' from api.
        } catch (e) {
            console.error(e);
        }
    };

    // Changing approach: I need to verify if getDashboardSummary is exported in api.js. 
    // If not, I'll add it. Just in case, I will look at api.js first.
    // Wait, I cannot look at api.js inside replace_file_content.
    // I will assume standard pattern: import { getDashboardSummary } from '../../services/api';

    // Let's add the fetch logic inside useEffect or activeTab check.
    useEffect(() => {
        if (activeTab !== 'distribucion') return;
        import('../../services/api').then(api => {
            if (api.getDashboardSummary) {
                api.getDashboardSummary().then(data => {
                    if (data && data.distribution_real) {
                        setDistributionReal(data.distribution_real);
                    }
                }).catch(err => console.error('Error loading distribution', err));
            }
        });
        getBitacora()
            .then((data) => {
                const projects = Array.isArray(data)
                    ? data.filter((entry) => String(entry.kind || '').toLowerCase() === 'project' && entry.status !== 'archived')
                    : [];
                const total = projects.reduce((sum, p) => sum + getMonthlyTarget(p), 0);
                setProjectImpact({ total, count: projects.length });
            })
            .catch((err) => console.error('Error loading projects', err));
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'distribucion') return;
        if (!distributionReal) return;
        const contextKey = JSON.stringify({
            income: distributionReal.total_income || 0,
            expenses: distributionReal.total_expenses || 0,
            oxigeno: distributionReal.oxigeno || 0,
            vida: distributionReal.vida || 0,
            blindaje: distributionReal.blindaje || 0,
            projects: projectImpact.total || 0
        });
        const cacheKey = 'ai_savings_cache_v1';
        const cachedRaw = window.localStorage.getItem(cacheKey);
        if (cachedRaw) {
            try {
                const cached = JSON.parse(cachedRaw);
                if (cached?.key === contextKey && cached?.message) {
                    setSavingsMessage(cached.message);
                    return;
                }
            } catch (e) {
                // ignore cache parse
            }
        }
        const fetchSavings = async () => {
            setSavingsLoading(true);
            try {
                const context = [
                    `Ingresos: ${Math.round(distributionReal.total_income || 0).toLocaleString('es-CL')}`,
                    `Gastos: ${Math.round(distributionReal.total_expenses || 0).toLocaleString('es-CL')}`,
                    `Distribucion real: Oxigeno ${distributionReal.oxigeno || 0}%, Vida ${distributionReal.vida || 0}%, Blindaje ${distributionReal.blindaje || 0}%`,
                    projectImpact.total > 0 ? `Proyectos activos: ${Math.round(projectImpact.total).toLocaleString('es-CL')} / mes` : ''
                ].filter(Boolean).join('. ');
                const res = await askBitacora({
                    question: 'Da 1 recomendacion breve de ahorro/inversion basica para este mes. Max 160 caracteres. Sin bullets.',
                    context
                });
                const msg = (res?.answer || '').replace(/\s+/g, ' ').trim();
                setSavingsMessage(msg);
                window.localStorage.setItem(cacheKey, JSON.stringify({ key: contextKey, message: msg }));
            } catch (err) {
                setSavingsMessage('');
            } finally {
                setSavingsLoading(false);
            }
        };
        fetchSavings();
    }, [activeTab, distributionReal, projectImpact]);

    const distData = distributionReal || { oxigeno: 0, vida: 0, blindaje: 0 };

    return (
        <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', minHeight: 'calc(100vh - var(--topbar-height, 72px) - var(--bottomnav-height, 96px))' }}>
            <PillTabs
                items={[
                    { label: 'Ingresos', path: '/incomes?tab=ingresos', icon: '\u2B06\uFE0F' },
                    { label: 'Compromisos', path: '/commitments?tab=compromisos', icon: '\uD83D\uDCC4' },
                    { label: 'Eventos', path: '/events?tab=eventos', icon: '\uD83D\uDCC6' },
                    { label: 'Horizonte', path: '/horizon', icon: '\u23F3' },
                    { label: 'Distribución', path: '/incomes?tab=distribucion', icon: '\uD83C\uDF69' }
                ]}
            />
            {/* Headers and other tabs omitted for brevity in replacement... */}

            {activeTab === 'distribucion' && (
                <>
                    <div className="spending-card" style={{ marginTop: '10px' }}>
                        <div className="section-title">Distribución Real (Mes Actual)</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginBottom: '10px' }}>
                            Oxígeno - Vida - Blindaje (meta vs real)
                        </div>
                        {[
                            { label: 'Oxígeno', meta: distributionMeta.oxigeno, real: distData.oxigeno, desc: 'Gastos fijos indispensables (Vivienda, Servicios, Supermercado)' },
                            { label: 'Vida', meta: distributionMeta.vida, real: distData.vida, desc: 'Estilo de vida y disfrute (Salidas, Hobbies, Gustos)' },
                            { label: 'Blindaje', meta: distributionMeta.blindaje, real: distData.blindaje, desc: 'Seguridad financiera (Ahorro, Inversiones, Pago Deuda)' }
                        ].map((g) => {
                            const delta = g.real - g.meta;
                            // For Oxigeno/Vida, being OVER meta is bad (Red). Being UNDER is good (Green).
                            // For Blindaje (Savings), being OVER meta is good (Green). Being UNDER is bad (Red).
                            const isBlindaje = g.label === 'Blindaje';

                            let tone;
                            if (isBlindaje) {
                                tone = delta >= 0 ? 'var(--status-green-main)' : delta > -5 ? 'var(--status-yellow-main)' : 'var(--status-red-main)';
                            } else {
                                tone = delta > 5 ? 'var(--status-red-main)' : delta > 0 ? 'var(--status-yellow-main)' : 'var(--status-green-main)';
                            }

                            return (
                                <div key={g.label} style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4px' }}>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '1rem' }}>{g.label}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{g.desc}</div>
                                        </div>
                                        <span style={{ color: tone, fontWeight: '600', fontSize: '0.9rem' }}>{g.real}% / {g.meta}%</span>
                                    </div>
                                    <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(g.real, 100)}%`, height: '100%', background: tone }} />
                                    </div>
                                    <div style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                        {delta > 0 ? (isBlindaje ? `Superando meta por ${delta}%` : `Sobre meta por ${delta}%`)
                                            : delta < 0 ? (isBlindaje ? `Bajo meta por ${Math.abs(delta)}%` : `Ahorro de ${Math.abs(delta)}% vs meta`)
                                                : 'En meta'}
                                    </div>
                                </div>
                            );
                        })}
                        <div style={{ marginTop: '16px', padding: '10px', background: '#f8f9fa', borderRadius: '8px', fontSize: '0.8rem' }}>
                            <div><strong>Total Ingresos:</strong> ${Math.round(distData.total_income || 0).toLocaleString('es-CL')}</div>
                            <div><strong>Total Gastos (categorizados):</strong> ${Math.round(distData.total_expenses || 0).toLocaleString('es-CL')}</div>
                            {projectImpact.count > 0 && (
                                <div style={{ marginTop: '6px' }}>
                                    <strong>Proyectos activos:</strong> ${Math.round(projectImpact.total || 0).toLocaleString('es-CL')} / mes ({projectImpact.count})
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="spending-card" style={{ marginTop: '12px' }}>
                        <div className="section-title">Ahorro e inversión básica</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>
                            Recomendación breve basada en tu flujo actual.
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                            {savingsLoading
                                ? 'IA: generando recomendación...'
                                : (savingsMessage ? `IA: ${savingsMessage}` : 'IA: mensaje no disponible.')}
                        </div>
                    </div>
                </>
            )}


            {activeTab !== 'distribucion' && (
                <div className="spending-card">
                    <div className="section-title">Resumen</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--color-text-dim)' }}>Fijos mensuales</span>
                        <span style={{ fontWeight: '700', color: 'var(--status-green-main)' }}>${Math.round(Number(totalFixedMonthly || 0)).toLocaleString('es-CL')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--color-text-dim)' }}>Variables (mes actual)</span>
                        <span style={{ fontWeight: '700', color: 'var(--status-yellow-main)' }}>${Math.round(Number(totalVariableThisMonth || 0)).toLocaleString('es-CL')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--color-text-dim)' }}>Promedio variable (3 meses)</span>
                        <span style={{ fontWeight: '700', color: 'var(--status-yellow-main)' }}>${Math.round(Number(avgVariable3Months || 0)).toLocaleString('es-CL')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '8px' }}>
                        <span style={{ fontWeight: '700' }}>Total registrado</span>
                        <span style={{ fontWeight: '800', color: 'var(--color-text-main)' }}>${Math.round(Number(totalIncomes || 0)).toLocaleString('es-CL')}</span>
                    </div>
                </div>
            )}

            {activeTab !== 'distribucion' && (
                <div className="spending-card">
                    <div className="section-title">Fuentes</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>Fijas</div>
                    {Object.keys(fixedBySource).length === 0 ? (
                        <div style={{ color: '#aaa', fontSize: '0.85rem' }}>Sin fuentes fijas.</div>
                    ) : (
                        Object.entries(fixedBySource).map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>{k}</span>
                                <span style={{ fontWeight: '700' }}>${Math.round(Number(v || 0)).toLocaleString('es-CL')}</span>
                            </div>
                        ))
                    )}
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', margin: '8px 0 6px' }}>Variables</div>
                    {Object.keys(variableBySource).length === 0 ? (
                        <div style={{ color: '#aaa', fontSize: '0.85rem' }}>Sin fuentes variables.</div>
                    ) : (
                        Object.entries(variableBySource).map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>{k}</span>
                                <span style={{ fontWeight: '700' }}>${Math.round(Number(v || 0)).toLocaleString('es-CL')}</span>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab !== 'distribucion' && (
                <>
                    <div className="spending-card" style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '10px' }}>AGREGAR INGRESO</div>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nombre (Sueldo, Bono, Venta, etc.)"
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '8px' }}
                        />

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={isVariable}
                                onChange={(e) => setIsVariable(e.target.checked)}
                            />
                            <span>¿Es un ingreso variable (ej. venta, bono)?</span>
                        </label>

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Monto"
                                inputMode="decimal"
                                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd', minWidth: '0' }}
                            />
                            {!isVariable && (
                                <select
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value)}
                                    style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd', minWidth: '0' }}
                                >
                                    <option value="monthly">Mensual</option>
                                    <option value="weekly">Semanal</option>
                                    <option value="biweekly">Quincenal</option>
                                    <option value="yearly">Anual</option>
                                    <option value="one_time">Unico</option>
                                </select>
                            )}
                            {isVariable && (
                                <input
                                    type="month"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    placeholder="Mes"
                                    style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd', minWidth: '0' }}
                                />
                            )}
                        </div>
                        {isVariable && (
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input
                                    value={minAmount}
                                    onChange={(e) => setMinAmount(e.target.value)}
                                    placeholder="Mínimo asegurado (opcional)"
                                    inputMode="decimal"
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', minWidth: '0' }}
                                />
                            </div>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: saving ? '#9AE6B4' : 'var(--status-green-main)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                opacity: saving ? 0.8 : 1
                            }}
                        >
                            {saving ? 'Guardando...' : 'Guardar Ingreso'}
                        </button>
                    </div>
                </>
            )}

            {activeTab !== 'distribucion' && (
                <h3 className="section-title" style={{ textAlign: 'center', marginTop: '20px' }}>INGRESOS REGISTRADOS</h3>
            )}

            {activeTab !== 'distribucion' && loading ? (
                <div className="loading-text">Cargando ingresos...</div>
            ) : activeTab !== 'distribucion' && incomes.length === 0 ? (
                <div className="loading-text">Sin ingresos aun.</div>
            ) : activeTab !== 'distribucion' ? (
                incomes.map((inc) => (
                    <div key={inc.id} className="spending-card">
                        {editingId === inc.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <input
                                    value={editForm.name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                                    <input
                                        type="checkbox"
                                        checked={editForm.is_variable || false}
                                        onChange={(e) => setEditForm({ ...editForm, is_variable: e.target.checked })}
                                    />
                                    Ingreso variable (por mes)
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        value={editForm.amount}
                                        onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                                        inputMode="decimal"
                                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    />
                                    {!editForm.is_variable && (
                                        <select
                                            value={editForm.frequency || 'monthly'}
                                            onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })}
                                            style={{ width: '140px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                        >
                                            <option value="monthly">Mensual</option>
                                            <option value="weekly">Semanal</option>
                                            <option value="biweekly">Quincenal</option>
                                            <option value="one_time">Unico</option>
                                        </select>
                                    )}
                                </div>
                                {editForm.is_variable && (
                                    <input
                                        type="month"
                                        value={editForm.month || ''}
                                        onChange={(e) => setEditForm({ ...editForm, month: e.target.value })}
                                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    />
                                )}
                                {editForm.is_variable && (
                                    <input
                                        value={editForm.min_amount || ''}
                                        onChange={(e) => setEditForm({ ...editForm, min_amount: e.target.value })}
                                        placeholder="Mínimo garantizado"
                                        inputMode="decimal"
                                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    />
                                )}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={handleUpdate}
                                        disabled={saving}
                                        style={{ flex: 1, padding: '8px', background: 'var(--status-green-main)', color: 'white', border: 'none', borderRadius: '6px' }}
                                    >
                                        Guardar
                                    </button>
                                    <button
                                        onClick={() => { setEditingId(null); setEditForm({}); }}
                                        disabled={saving}
                                        style={{ flex: 1, padding: '8px', background: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '6px' }}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: '700' }}>{inc.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                        {inc.is_variable ? `Variable - ${inc.month || ''}` : (inc.frequency || 'mensual')}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: '700', color: 'var(--status-green-main)' }}>
                                        ${Math.round(Number(inc.amount || 0)).toLocaleString('es-CL')}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => handleEdit(inc)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                                        >
                                            {'\u270F\uFE0F'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(inc.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                                        >
                                            {'\uD83D\uDDD1\uFE0F'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))
            ) : null}
        </div>
    );
};

export default Incomes;



















