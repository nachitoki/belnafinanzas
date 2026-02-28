import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCommitments, createCommitment, updateCommitment, deleteCommitment } from '../../services/api';
import PillTabs from '../layout/PillTabs';
import CommitmentChart from './CommitmentChart';

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
    const [hasInstallments, setHasInstallments] = useState(false);
    const [isVariable, setIsVariable] = useState(false);
    const [installmentsPaid, setInstallmentsPaid] = useState('');
    const [saving, setSaving] = useState(false);

    // Month Selection
    const [searchParams, setSearchParams] = useSearchParams();
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const getNextMonthStr = () => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d.toISOString().slice(0, 7);
    };
    const nextMonthStr = getNextMonthStr();
    const selectedMonth = searchParams.get('month') || currentMonthStr;

    const setSelectedMonth = (m) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('month', m);
        setSearchParams(newParams);
    };

    // Activity State
    const [actionSavingId, setActionSavingId] = useState(null);
    const [actionPayingId, setActionPayingId] = useState(null);
    const [payAmount, setPayAmount] = useState('');

    // Chart Filter State
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [filterStatus, setFilterStatus] = useState('pending'); // 'all', 'pending', 'paid'

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
                installments_paid: hasInstallments ? parseNumber(installmentsPaid) : 0,
                is_variable: isVariable
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
            alert('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const confirmPay = (item) => {
        if (!payAmount) return;
        setActionSavingId(item.id);
        updateCommitment(item.id, { action: 'pay', paid_amount: payAmount })
            .then(() => {
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

    const handleEditOpen = (item) => {
        setEditingItem({
            ...item,
            has_installments: (item.installments_total > 0),
            installments_paid: item.installments_paid || 0,
            installments_total: item.installments_total || 0,
            is_variable: item.is_variable || false
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
                installments_paid: editingItem.has_installments ? parseNumber(editingItem.installments_paid) : 0,
                is_variable: editingItem.is_variable
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

    const getGroup = (c) => {
        const name = (c.name || '').toLowerCase();
        if (name.includes('arriendo') || name.includes('dividendo') || name.includes('luz') || name.includes('agua') || name.includes('gas') || name.includes('internet') || name.includes('casa') || name.includes('nana')) return 'Hogar';
        if (name.includes('colegio') || name.includes('jardin') || name.includes('universidad') || name.includes('matricula')) return 'Educación';
        if (name.includes('auto') || name.includes('bencina') || name.includes('tag') || name.includes('seguro auto') || name.includes('permiso') || name.includes('patente')) return 'Transporte';
        if (name.includes('isapre') || name.includes('seguro vida') || name.includes('medico') || name.includes('farmacia') || name.includes('doctor')) return 'Salud';
        if (name.includes('credito') || name.includes('prestamo') || name.includes('visa') || name.includes('mastercard') || name.includes('banco') || name.includes('cuota')) return 'Deudas';
        if (name.includes('super') || name.includes('jumbo') || name.includes('lider') || name.includes('unimarc') || name.includes('pan') || name.includes('fruta') || name.includes('feria') || name.includes('almuerzo') || name.includes('compra')) return 'Alimentación';
        return 'Otros';
    };

    const isOxygen = (c) => {
        const g = getGroup(c);
        return g === 'Hogar' || g === 'Alimentación' || g === 'Salud';
    };

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
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <button onClick={() => navigate('/')} style={{ background: 'transparent', fontSize: '1.2rem', padding: '0 10px 0 0', border: 'none' }}>
                    {'\u2190'}
                </button>
                <div>
                    <h2>Compromisos</h2>
                    <div className="page-subtitle">Pagos fijos y deudas</div>
                </div>
            </div>

            <div className="spending-card" style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginBottom: '10px', fontWeight: '800' }}>AGREGAR COMPROMISO</div>
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
                    <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd', minWidth: '0' }}
                    >
                        <option value="monthly">Mensual</option>
                        <option value="weekly">Semanal</option>
                        <option value="biweekly">Quincenal</option>
                        <option value="yearly">Anual</option>
                        <option value="one_time">Único</option>
                    </select>
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
                <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={isVariable} onChange={(e) => setIsVariable(e.target.checked)} />
                        Monto variable
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={hasInstallments} onChange={(e) => setHasInstallments(e.target.checked)} />
                        Cuotas
                    </label>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ width: '100%', padding: '10px', background: 'var(--status-green-main)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700' }}
                >
                    {saving ? 'Guardando...' : 'Guardar'}
                </button>
            </div>

            {/* Month Selector */}
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', margin: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '800', textTransform: 'capitalize' }}>
                    {(() => {
                        const [y, m] = selectedMonth.split('-');
                        return new Date(y, parseInt(m) - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
                    })()}
                </span>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', gap: '4px' }}>
                    <button
                        onClick={() => setSelectedMonth(currentMonthStr)}
                        style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', background: selectedMonth === currentMonthStr ? '#fff' : 'transparent', color: selectedMonth === currentMonthStr ? 'var(--status-blue-main)' : '#64748b' }}
                    > Este Mes </button>
                    <button
                        onClick={() => setSelectedMonth(nextMonthStr)}
                        style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', background: selectedMonth === nextMonthStr ? '#fff' : 'transparent', color: selectedMonth === nextMonthStr ? 'var(--status-blue-main)' : '#64748b' }}
                    > Siguiente </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                {['pending', 'paid', 'all'].map(s => (
                    <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        style={{ padding: '6px 14px', borderRadius: '999px', border: 'none', fontSize: '0.75rem', fontWeight: '700', background: filterStatus === s ? 'var(--status-blue-main)' : '#f1f5f9', color: filterStatus === s ? '#fff' : '#64748b' }}
                    >
                        {s === 'pending' ? 'Por Pagar' : s === 'paid' ? 'Pagados' : 'Todos'}
                    </button>
                ))}
            </div>

            {loading ? <div className="loading-text">Cargando...</div> : (
                (() => {
                    const [y, m] = selectedMonth.split('-');
                    const targetMonthIdx = parseInt(m) - 1;
                    const targetYear = parseInt(y);

                    const isPaidThisMonth = (c) => {
                        if (!c.last_paid_at) return false;
                        const p = new Date(c.last_paid_at);
                        return p.getMonth() === targetMonthIdx && p.getFullYear() === targetYear;
                    };

                    const isOverdue = (c) => {
                        if (!c.next_date || isPaidThisMonth(c)) return false;
                        const d = new Date(c.next_date);
                        return d.getFullYear() < targetYear || (d.getFullYear() === targetYear && d.getMonth() < targetMonthIdx);
                    };

                    const isThisMonth = (c) => {
                        if (!c.next_date || isPaidThisMonth(c)) return false;
                        const d = new Date(c.next_date);
                        return d.getMonth() === targetMonthIdx && d.getFullYear() === targetYear;
                    };

                    const isFuture = (c) => {
                        if (!c.next_date || isPaidThisMonth(c)) return false;
                        const d = new Date(c.next_date);
                        return d.getFullYear() > targetYear || (d.getFullYear() === targetYear && d.getMonth() > targetMonthIdx);
                    };

                    const paid = commitments.filter(isPaidThisMonth);
                    const overdue = commitments.filter(isOverdue);
                    const pending = commitments.filter(isThisMonth);
                    const future = commitments.filter(isFuture);

                    const renderList = (items, title, color = '#64748b') => {
                        if (items.length === 0) return null;
                        const grouped = items.reduce((acc, c) => {
                            const g = getGroup(c);
                            acc[g] = acc[g] || [];
                            acc[g].push(c);
                            return acc;
                        }, {});

                        return (
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: '900', color, textTransform: 'uppercase', marginBottom: '12px', paddingLeft: '4px', letterSpacing: '0.05em' }}>
                                    {title} ({items.length})
                                </div>
                                {Object.entries(grouped).map(([group, gItems]) => (
                                    <div key={group} style={{ marginBottom: '16px' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px', marginBottom: '8px', fontWeight: '700' }}>{group.toUpperCase()}</div>
                                        {gItems.map(c => {
                                            const oxygen = isOxygen(c);
                                            const paidNow = isPaidThisMonth(c);
                                            return (
                                                <div key={c.id} className="spending-card" style={{ marginBottom: '8px', borderLeft: `4px solid ${paidNow ? '#22C55E' : (color === '#EF4444' ? '#EF4444' : (oxygen ? '#3B82F6' : '#E2E8F0'))}`, opacity: paidNow ? 0.8 : 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{c.name}</span>
                                                                {oxygen && <span style={{ fontSize: '0.55rem', background: '#EFF6FF', color: '#1E40AF', padding: '1px 4px', borderRadius: '4px', fontWeight: '900' }}>OXÍGENO</span>}
                                                                {c.frequency === 'monthly' && <span>🔄</span>}
                                                            </div>
                                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{c.next_date} · {c.frequency}</div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontWeight: '800' }}>${Math.round(c.amount).toLocaleString('es-CL')}</div>
                                                            {paidNow && (
                                                                <div style={{ color: '#22c55e', fontSize: '0.7rem', fontWeight: '700' }}>✓ Pagado</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {!paidNow && (
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', borderTop: '1px solid #f8fafc', paddingTop: '8px' }}>
                                                            <button onClick={() => handleEditOpen(c)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.5 }}>✏️</button>
                                                            <button onClick={() => handleDelete(c.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.5 }}>🗑️</button>
                                                            <div style={{ flex: 1 }} />
                                                            {actionPayingId === c.id ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <input value={payAmount} onChange={e => setPayAmount(e.target.value)} type="number" style={{ width: '70px', padding: '4px', fontSize: '0.8rem', border: '2px solid #22c55e', borderRadius: '4px' }} autoFocus />
                                                                    <button onClick={() => confirmPay(c)} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem' }}>OK</button>
                                                                    <button onClick={() => setActionPayingId(null)} style={{ background: '#eee', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem' }}>X</button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => { setActionPayingId(c.id); setPayAmount(c.amount); }}
                                                                    style={{ background: color === '#EF4444' ? '#EF4444' : (oxygen ? '#3B82F6' : '#22C55E'), color: 'white', border: 'none', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}
                                                                > Pagar </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        );
                    };

                    return (
                        <div>
                            {overdue.length > 0 && renderList(overdue, 'Vencidos', '#EF4444')}
                            {(filterStatus === 'pending' || filterStatus === 'all') && renderList(pending, 'Pendientes de este mes', 'var(--color-text-dim)')}
                            {(filterStatus === 'paid' || filterStatus === 'all') && renderList(paid, 'Pagados durante este mes', '#22C55E')}
                            {filterStatus === 'all' && future.length > 0 && (
                                <div style={{ opacity: 0.6, marginTop: '20px' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Próximos Meses ({future.length})</div>
                                    {future.map(c => (
                                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: '8px', marginBottom: '4px', border: '1px solid #f1f5f9' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>{c.name}</span>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>${Math.round(c.amount).toLocaleString('es-CL')}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()
            )}

            {editModalOpen && editingItem && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '360px' }}>
                        <h3 style={{ marginTop: 0 }}>Editar Compromiso</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                            <input value={editingItem.amount} onChange={e => setEditingItem({ ...editingItem, amount: e.target.value })} type="number" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                            <select value={editingItem.frequency} onChange={e => setEditingItem({ ...editingItem, frequency: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                                <option value="monthly">Mensual</option>
                                <option value="weekly">Semanal</option>
                                <option value="biweekly">Quincenal</option>
                                <option value="yearly">Anual</option>
                                <option value="one_time">Único</option>
                            </select>
                            <input type="date" value={editingItem.next_date} onChange={e => setEditingItem({ ...editingItem, next_date: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => setEditModalOpen(false)} style={{ flex: 1, padding: '10px', background: '#eee', border: 'none', borderRadius: '6px' }}>Cerrar</button>
                                <button onClick={handleEditSubmit} style={{ flex: 1, padding: '10px', background: 'var(--status-blue-main)', color: 'white', border: 'none', borderRadius: '6px' }}>Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Commitments;
