import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCommitments, createCommitment, updateCommitment, deleteCommitment } from '../../services/api';
import PillTabs from '../layout/PillTabs';

const Commitments = () => {
    const navigate = useNavigate();
    const [commitments, setCommitments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState('monthly');
    const [nextDate, setNextDate] = useState('');
    const [flowCategory, setFlowCategory] = useState('structural');
    const [installmentsTotal, setInstallmentsTotal] = useState('');
    const [installmentsPaid, setInstallmentsPaid] = useState('');
    const [hasInstallments, setHasInstallments] = useState(false);
    const [saving, setSaving] = useState(false);
    const [actionSavingId, setActionSavingId] = useState(null);

    const parseNumber = (value) => {
        if (value === null || value === undefined) return 0;
        const normalized = String(value).replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(normalized);
        return Number.isNaN(parsed) ? 0 : parsed;
    };

    const flowLabel = (value) => {
        if (value === 'structural') return 'Estructural';
        if (value === 'provision') return 'Provision';
        if (value === 'discretionary') return 'Discrecional/Deuda';
        return '';
    };

    const loadCommitments = async () => {
        try {
            setLoading(true);
            const data = await getCommitments();
            setCommitments(data || []);
            window.localStorage.setItem('commitments_cache_v1', JSON.stringify({ ts: Date.now(), data: data || [] }));
        } catch (e) {
            console.error('Error loading commitments', e);
            setCommitments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const cachedRaw = window.localStorage.getItem('commitments_cache_v1');
        if (cachedRaw) {
            try {
                const cached = JSON.parse(cachedRaw);
                if (Array.isArray(cached?.data)) {
                    setCommitments(cached.data);
                    setLoading(false);
                }
            } catch (e) {
                console.warn('Invalid commitments cache', e);
            }
        }
        loadCommitments();
    }, []);

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await createCommitment({
                name: name.trim(),
                amount: parseNumber(amount),
                frequency,
                next_date: nextDate || null,
                flow_category: flowCategory,
                installments_total: hasInstallments ? parseNumber(installmentsTotal) : 0,
                installments_paid: hasInstallments ? parseNumber(installmentsPaid) : 0
            });
            setName('');
            setAmount('');
            setFrequency('monthly');
            setNextDate('');
            setFlowCategory('structural');
            setHasInstallments(false);
            setInstallmentsTotal('');
            setInstallmentsPaid('');
            await loadCommitments();
        } catch (e) {
            // ... existing error catch ...
            console.error('Error creating commitment', e);
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            alert('Error al guardar: ' + detail);
        } finally {
            setSaving(false);
        }
    };

    // ... handlePay and handlePostpone ...
    const handlePay = (item) => {
        const confirm = window.confirm(`Marcar "${item.name}" como pagado por $${Number(item.amount).toLocaleString('es-CL')}?`);
        if (!confirm) return;
        setActionSavingId(item.id);
        updateCommitment(item.id, { action: 'pay' })
            .then(() => {
                alert(`¡Pagado! Se ha registrado el gasto de "${item.name}" en tu flujo.`);
                loadCommitments();
            })
            .catch((e) => {
                console.error('Error paying commitment', e);
                const detail = e.response?.data?.detail || e.message || 'Error desconocido';
                alert('No se pudo marcar como pagado: ' + detail);
            })
            .finally(() => setActionSavingId(null));
    };

    const handlePostpone = (item, value = null) => {
        const days = value || prompt('¿Cuántos días postergar? (5, 10, 15, 30, next_month)', '5');
        if (!days) return;
        const normalized = String(days).trim().toLowerCase();
        setActionSavingId(item.id);
        updateCommitment(item.id, { action: 'postpone', postpone_days: normalized })
            .then(loadCommitments)
            .catch((e) => {
                console.error('Error postponing commitment', e);
                const detail = e.response?.data?.detail || e.message || 'Error desconocido';
                alert('No se pudo postergar: ' + detail);
            })
            .finally(() => setActionSavingId(null));
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este compromiso?')) return;
        try {
            await deleteCommitment(id);
            await loadCommitments();
        } catch (e) {
            console.error('Error deleting commitment', e);
            alert('Error al eliminar');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', minHeight: 'calc(100vh - var(--topbar-height, 72px) - var(--bottomnav-height, 96px))' }}>
            {/* ... tabs and header ... */}
            <PillTabs
                items={[
                    { label: 'Ingresos', path: '/incomes?tab=ingresos', icon: '\u2B06\uFE0F' },
                    { label: 'Compromisos', path: '/commitments?tab=compromisos', icon: '\uD83D\uDCC4' },
                    { label: 'Eventos', path: '/events?tab=eventos', icon: '\uD83D\uDCC6' },
                    { label: 'Horizonte', path: '/horizon', icon: '\u23F3' },
                    { label: 'Distribución', path: '/incomes?tab=distribucion', icon: '\uD83C\uDF69' }
                ]}
            />
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <button
                    onClick={() => navigate('/')}
                    style={{ background: 'transparent', fontSize: '1.2rem', padding: '0 10px 0 0', border: 'none' }}
                >
                    {'\u2190'}
                </button>
                <div>
                    <h2>Compromisos</h2>
                    <div className="page-subtitle">Pagos fijos y deudas</div>
                </div>
            </div>

            <div className="spending-card" style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '10px' }}>AGREGAR COMPROMISO</div>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre (Arriendo, Luz, Internet, etc.)"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '8px' }}
                />
                {/* ... Inputs Row 1 ... */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Monto"
                        inputMode="decimal"
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd', minWidth: '0' }}
                    />
                    {frequency !== 'one_time' && (
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
                    {frequency === 'one_time' && (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>
                            Unico
                        </div>
                    )}
                </div>
                {/* ... Inputs Row 2 ... */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                        value={nextDate}
                        onChange={(e) => setNextDate(e.target.value)}
                        type="date"
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd', minWidth: '0' }}
                    />
                    <select
                        value={flowCategory}
                        onChange={(e) => setFlowCategory(e.target.value)}
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd', minWidth: '0' }}
                    >
                        <option value="structural">Estructural</option>
                        <option value="provision">Provisión</option>
                        <option value="discretionary">Discrecional/Deuda</option>
                    </select>
                </div>

                {/* Installments Checkbox */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={hasInstallments}
                        onChange={(e) => setHasInstallments(e.target.checked)}
                    />
                    <span>¿Es una compra en cuotas?</span>
                </label>

                {/* Installment Inputs */}
                {hasInstallments && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        <input
                            value={installmentsPaid}
                            onChange={(e) => setInstallmentsPaid(e.target.value)}
                            placeholder="Cuotas pagadas (ej: 0)"
                            inputMode="numeric"
                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd', minWidth: '0' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-dim)' }}>de</div>
                        <input
                            value={installmentsTotal}
                            onChange={(e) => setInstallmentsTotal(e.target.value)}
                            placeholder="Total cuotas (ej: 12)"
                            inputMode="numeric"
                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd', minWidth: '0' }}
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
                    {saving ? 'Guardando...' : 'Guardar'}
                </button>
            </div>

            <h3 className="section-title" style={{ textAlign: 'center', marginTop: '20px' }}>COMPROMISOS REGISTRADOS</h3>

            {loading ? (
                <div className="loading-text">Cargando compromisos...</div>
            ) : commitments.length === 0 ? (
                <div className="loading-text">Sin compromisos aun.</div>
            ) : (
                commitments.map((c) => (
                    <div key={c.id} className="spending-card" style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div>
                                <div style={{ fontWeight: '700' }}>{c.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                    {c.frequency || 'mensual'} {c.flow_category ? `- ${flowLabel(c.flow_category)}` : ''} {c.next_date ? `- Proximo: ${c.next_date}` : ''}
                                </div>
                                {(c.installments_total > 0) && (
                                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--status-blue-main)', marginTop: '2px' }}>
                                        Cuota {c.installments_paid + 1} de {c.installments_total}
                                    </div>
                                )}
                            </div>
                            <div style={{ fontWeight: '700', color: 'var(--status-red-main)' }}>
                                ${Number(c.amount || 0).toLocaleString('es-CL')}
                            </div>
                            <button
                                onClick={() => handleDelete(c.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem',
                                    marginLeft: '10px',
                                    opacity: 0.5
                                }}
                                title="Eliminar"
                            >
                                🗑️
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                {[5, 10, 15, 30].map((d) => (
                                    <button
                                        key={`${c.id}-postpone-${d}`}
                                        onClick={() => handlePostpone(c, String(d))}
                                        type="button"
                                        style={{
                                            background: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '999px',
                                            padding: '4px 10px',
                                            fontSize: '0.75rem',
                                            color: 'var(--color-text-dim)',
                                            cursor: 'pointer',
                                            touchAction: 'manipulation'
                                        }}
                                    >
                                        +{d}d
                                    </button>
                                ))}
                                <button
                                    onClick={() => handlePostpone(c, 'next_month')}
                                    type="button"
                                    style={{
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '999px',
                                        padding: '4px 10px',
                                        fontSize: '0.75rem',
                                        color: 'var(--color-text-dim)',
                                        cursor: 'pointer',
                                        touchAction: 'manipulation'
                                    }}
                                >
                                    Próx. mes
                                </button>
                                <button
                                    onClick={() => handlePostpone(c)}
                                    type="button"
                                    style={{
                                        background: 'transparent',
                                        border: '1px dashed #cbd5e0',
                                        borderRadius: '999px',
                                        padding: '4px 10px',
                                        fontSize: '0.75rem',
                                        color: 'var(--color-text-dim)',
                                        cursor: 'pointer',
                                        touchAction: 'manipulation'
                                    }}
                                >
                                    Otro...
                                </button>
                            </div>
                            <button
                                onClick={() => handlePay(c)}
                                type="button"
                                disabled={actionSavingId === c.id}
                                style={{
                                    background: 'var(--status-green-main)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    fontSize: '0.85rem',
                                    color: 'white',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                {actionSavingId === c.id ? 'Guardando...' : 'Pagar compromiso'}
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default Commitments;














