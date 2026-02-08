import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCommitments, createCommitment, updateCommitment, deleteCommitment } from '../../services/api';
import PillTabs from '../layout/PillTabs';

const Commitments = () => {
    const navigate = useNavigate();
    const [commitments, setCommitments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Add Form State
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState('monthly');
    const [nextDate, setNextDate] = useState('');
    const [flowCategory, setFlowCategory] = useState('structural');
    const [installmentsTotal, setInstallmentsTotal] = useState('');
    const [installmentsPaid, setInstallmentsPaid] = useState('');
    const [hasInstallments, setHasInstallments] = useState(false);
    const [saving, setSaving] = useState(false);

    // Activity State
    const [actionSavingId, setActionSavingId] = useState(null);
    const [actionPayingId, setActionPayingId] = useState(null);
    const [payAmount, setPayAmount] = useState('');

    // Edit Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);

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
            console.error('Error creating commitment', e);
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            alert('Error al guardar: ' + detail);
        } finally {
            setSaving(false);
        }
    };

    const confirmPay = (item) => {
        if (!payAmount) return;
        setActionSavingId(item.id);
        updateCommitment(item.id, { action: 'pay', paid_amount: payAmount })
            .then(() => {
                // alert(`¡Pagado! Se ha registrado el gasto de "${item.name}" en tu flujo.`);
                loadCommitments();
            })
            .catch(err => {
                console.error(err);
                alert('Error al pagar');
            })
            .finally(() => {
                setActionSavingId(null);
                setActionPayingId(null);
            });
    };

    const handlePay = (item) => {
        // Deprecated in favor of inline flow, keeping if needed for direct calls
        setActionPayingId(item.id);
        setPayAmount(item.amount);
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

    // Edit Handlers
    const handleEditOpen = (item) => {
        setEditingItem({
            ...item,
            has_installments: (item.installments_total > 0),
            installments_paid: item.installments_paid || 0,
            installments_total: item.installments_total || 0
        });
        setEditModalOpen(true);
    };

    const handleEditSubmit = async () => {
        if (!editingItem || !editingItem.name) return;
        setSavingEdit(true);
        try {
            await updateCommitment(editingItem.id, {
                name: editingItem.name,
                amount: parseNumber(editingItem.amount),
                frequency: editingItem.frequency,
                next_date: editingItem.next_date || null,
                flow_category: editingItem.flow_category,
                installments_total: editingItem.has_installments ? parseNumber(editingItem.installments_total) : 0,
                installments_paid: editingItem.has_installments ? parseNumber(editingItem.installments_paid) : 0
            });
            setEditModalOpen(false);
            setEditingItem(null);
            await loadCommitments();
        } catch (e) {
            console.error('Error updating commitment', e);
            alert('Error al actualizar');
        } finally {
            setSavingEdit(false);
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

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={hasInstallments}
                        onChange={(e) => setHasInstallments(e.target.checked)}
                    />
                    <span>¿Es una compra en cuotas?</span>
                </label>

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

            {/* Groups Rendering */}
            {loading ? (
                <div className="loading-text">Cargando compromisos...</div>
            ) : commitments.length === 0 ? (
                <div className="loading-text">Sin compromisos aun.</div>
            ) : (
                (() => {
                    // Grouping Logic
                    const getGroup = (c) => {
                        const name = (c.name || '').toLowerCase();
                        if (name.includes('arriendo') || name.includes('dividendo') || name.includes('luz') || name.includes('agua') || name.includes('gas') || name.includes('internet') || name.includes('casa') || name.includes('nana')) return 'Hogar';
                        if (name.includes('colegio') || name.includes('jardin') || name.includes('universidad') || name.includes('matricula')) return 'Educación';
                        if (name.includes('auto') || name.includes('bencina') || name.includes('tag') || name.includes('seguro auto') || name.includes('permiso') || name.includes('patente')) return 'Transporte';
                        if (name.includes('isapre') || name.includes('seguro vida') || name.includes('medico') || name.includes('farmacia') || name.includes('doctor')) return 'Salud';
                        if (name.includes('credito') || name.includes('prestamo') || name.includes('visa') || name.includes('mastercard') || name.includes('banco') || name.includes('cuota')) return 'Deudas / Financiero';
                        if (name.includes('super') || name.includes('jumbo') || name.includes('lider') || name.includes('unimarc') || name.includes('pan') || name.includes('fruta') || name.includes('feria') || name.includes('almuerzo')) return 'Alimentación / Super';
                        return 'Otros';
                    };

                    const groups = commitments.reduce((acc, c) => {
                        const g = getGroup(c);
                        acc[g] = acc[g] || [];
                        acc[g].push(c);
                        return acc;
                    }, {});

                    const groupOrder = ['Hogar', 'Alimentación / Super', 'Educación', 'Salud', 'Transporte', 'Deudas / Financiero', 'Otros'];

                    return groupOrder.map(groupName => {
                        const items = groups[groupName] || [];
                        if (items.length === 0) return null;

                        const totalGroup = items.reduce((sum, i) => sum + Number(i.amount || 0), 0);

                        return (
                            <div key={groupName} style={{ marginBottom: '20px' }}>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '12px',
                                    border: '1px solid var(--border-light)', marginBottom: '8px'
                                }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-main)' }}>{groupName}</h3>
                                    <span style={{ fontWeight: '700', color: 'var(--color-text-dim)' }}>${totalGroup.toLocaleString('es-CL')}</span>
                                </div>

                                {items.map(c => (
                                    <div key={c.id} className="spending-card" style={{ marginBottom: '8px', borderLeft: '4px solid #E2E8F0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{c.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {c.frequency || 'mensual'} {c.next_date ? `· ${c.next_date}` : ''}
                                                    {c.flow_category === 'provision' && (
                                                        <span style={{
                                                            fontSize: '0.65rem', background: '#FEF3C7', color: '#B45309',
                                                            padding: '2px 6px', borderRadius: '4px', border: '1px solid #FCD34D',
                                                            fontWeight: '600'
                                                        }}>
                                                            PROVISIÓN
                                                        </span>
                                                    )}
                                                </div>
                                                {(c.installments_total > 0) && (
                                                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--status-blue-main)' }}>
                                                        Cuota {c.installments_paid + 1}/{c.installments_total}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                    {(() => {
                                                        if (!c.last_paid_at) return null;
                                                        const p = new Date(c.last_paid_at);
                                                        const n = new Date();
                                                        const isPaid = p.getMonth() === n.getMonth() && p.getFullYear() === n.getFullYear();
                                                        if (!isPaid) return null;
                                                        return (
                                                            <span style={{
                                                                background: '#DCFCE7', color: '#166534',
                                                                fontSize: '0.7rem', fontWeight: '800',
                                                                padding: '2px 6px', borderRadius: '4px', border: '1px solid #86EFAC'
                                                            }}>
                                                                PAGADO
                                                            </span>
                                                        );
                                                    })()}
                                                    <div style={{ fontWeight: '700', color: 'var(--status-green-main)' }}>
                                                        ${Math.round(Number(c.amount)).toLocaleString('es-CL')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions Bar */}
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #eee' }}>
                                            {(() => {
                                                const isPaidThisMonth = (() => {
                                                    if (!c.last_paid_at) return false;
                                                    const p = new Date(c.last_paid_at);
                                                    const n = new Date();
                                                    return p.getMonth() === n.getMonth() && p.getFullYear() === n.getFullYear();
                                                })();

                                                return (
                                                    <>
                                                        <button
                                                            onClick={() => handleEditOpen(c)}
                                                            style={{ border: 'none', background: 'transparent', fontSize: '1rem', cursor: 'pointer', opacity: 0.6 }}
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(c.id)}
                                                            style={{ border: 'none', background: 'transparent', fontSize: '1rem', cursor: 'pointer', opacity: 0.6 }}
                                                        >
                                                            🗑️
                                                        </button>

                                                        <div style={{ width: '1px', background: '#ddd', margin: '0 4px' }}></div>

                                                        <button
                                                            onClick={() => handlePostpone(c)}
                                                            disabled={isPaidThisMonth}
                                                            style={{ fontSize: '0.7rem', border: '1px solid #ddd', background: 'white', borderRadius: '4px', padding: '2px 6px', opacity: isPaidThisMonth ? 0.5 : 1 }}
                                                        >
                                                            Postergar
                                                        </button>

                                                        {actionPayingId === c.id ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <input
                                                                    type="number"
                                                                    value={payAmount}
                                                                    onChange={(e) => setPayAmount(e.target.value)}
                                                                    style={{ width: '80px', padding: '2px 4px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #2E7D32' }}
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    onClick={() => confirmPay(c)}
                                                                    disabled={actionSavingId === c.id}
                                                                    style={{
                                                                        fontSize: '0.7rem', background: '#2E7D32', color: 'white',
                                                                        border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {actionSavingId === c.id ? '...' : 'OK'}
                                                                </button>
                                                                <button
                                                                    onClick={() => { setActionPayingId(null); setPayAmount(''); }}
                                                                    style={{
                                                                        fontSize: '0.7rem', background: '#ddd', color: '#666',
                                                                        border: 'none', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    X
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => { setActionPayingId(c.id); setPayAmount(c.amount); }}
                                                                disabled={actionSavingId === c.id || isPaidThisMonth}
                                                                style={{
                                                                    fontSize: '0.75rem', border: 'none',
                                                                    background: (actionSavingId === c.id || isPaidThisMonth) ? '#ddd' : 'var(--status-green-main)',
                                                                    color: (isPaidThisMonth) ? '#666' : 'white',
                                                                    borderRadius: '4px', padding: '4px 10px', fontWeight: '600'
                                                                }}
                                                            >
                                                                {actionSavingId === c.id ? '...' : isPaidThisMonth ? 'Listo' : 'Pagar'}
                                                            </button>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    });
                })()
            )}

            {/* EDIT MODAL */}
            {editModalOpen && editingItem && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '360px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0, textAlign: 'center' }}>Editar Compromiso</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>Nombre</label>
                            <input
                                value={editingItem.name}
                                onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                            />

                            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>Monto</label>
                            <input
                                value={editingItem.amount}
                                onChange={e => setEditingItem({ ...editingItem, amount: e.target.value })}
                                type="number"
                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>Frecuencia</label>
                                    <select
                                        value={editingItem.frequency || 'monthly'}
                                        onChange={e => setEditingItem({ ...editingItem, frequency: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    >
                                        <option value="monthly">Mensual</option>
                                        <option value="weekly">Semanal</option>
                                        <option value="biweekly">Quincenal</option>
                                        <option value="yearly">Anual</option>
                                        <option value="one_time">Unico</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>Próx. Fecha</label>
                                    <input
                                        type="date"
                                        value={editingItem.next_date ? editingItem.next_date.split('T')[0] : ''}
                                        onChange={e => setEditingItem({ ...editingItem, next_date: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    />
                                </div>
                            </div>

                            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>Categoría Flujo</label>
                            <select
                                value={editingItem.flow_category || 'structural'}
                                onChange={e => setEditingItem({ ...editingItem, flow_category: e.target.value })}
                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                            >
                                <option value="structural">Estructural</option>
                                <option value="provision">Provisión</option>
                                <option value="discretionary">Discrecional/Deuda</option>
                            </select>

                            {/* Edit Installments Logic */}
                            <div style={{ borderTop: '1px dashed #eee', paddingTop: '10px', marginTop: '4px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer', marginBottom: '8px' }}>
                                    <input
                                        type="checkbox"
                                        checked={editingItem.has_installments || false}
                                        onChange={e => setEditingItem({ ...editingItem, has_installments: e.target.checked })}
                                    />
                                    <span>¿Es cuotas?</span>
                                </label>

                                {editingItem.has_installments && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.75rem', color: '#aaa' }}>Pagadas</label>
                                            <input
                                                type="number"
                                                value={editingItem.installments_paid || 0}
                                                onChange={e => setEditingItem({ ...editingItem, installments_paid: e.target.value })}
                                                style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #ddd' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.75rem', color: '#aaa' }}>Total</label>
                                            <input
                                                type="number"
                                                value={editingItem.installments_total || 0}
                                                onChange={e => setEditingItem({ ...editingItem, installments_total: e.target.value })}
                                                style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #ddd' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button
                                    onClick={() => setEditModalOpen(false)}
                                    disabled={savingEdit}
                                    style={{ flex: 1, padding: '12px', background: '#f5f5f5', border: 'none', borderRadius: '8px' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleEditSubmit}
                                    disabled={savingEdit}
                                    style={{ flex: 1, padding: '12px', background: 'var(--status-blue-main)', color: 'white', border: 'none', borderRadius: '8px' }}
                                >
                                    {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Commitments;
