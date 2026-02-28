import React, { useEffect, useState } from 'react';
import { getHorizon } from '../../services/api';
import catObserving from '../../assets/mascots/cat/cat_observing.webp';

const Horizon = ({ initialItems }) => {
    const [items, setItems] = useState(initialItems || []);
    const [loading, setLoading] = useState(!initialItems);

    const [filterMode, setFilterMode] = useState('all'); // 'all', 'current', 'next'

    useEffect(() => {
        if (initialItems) {
            setItems(initialItems);
            setLoading(false);
            return;
        }

        const load = async () => {
            // ... existing load logic
            try {
                const data = await getHorizon();
                setItems(data || []);
            } catch (e) {
                console.error('Error loading horizon', e);
                setItems([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [initialItems]);

    const formatDays = (dateStr) => {
        if (!dateStr) return '';
        const target = new Date(dateStr);
        if (Number.isNaN(target.getTime())) return '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);
        const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));
        if (diff === 0) return 'Hoy';
        if (diff === 1) return 'Manana';
        if (diff > 1) return `En ${diff} dias`;
        return 'Vencido';
    };

    const formatDate = (value) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString();
    };

    const chipStyle = (tone) => {
        // ... existing chipStyle
        if (tone === 'critical') {
            return { background: '#7F1D1D', color: '#fff', border: '1px solid #991B1B' };
        }
        if (tone === 'danger') {
            return { background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' };
        }
        if (tone === 'warn') {
            return { background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D' };
        }
        return { background: '#E2E8F0', color: '#475569', border: '1px solid #CBD5F5' };
    };

    // ... helpers
    const softAlert = (item) => {
        const pct = Number(item?.impact_pct || 0);
        if (pct >= 5) return { tone: 'danger', label: 'Alerta suave' };
        if (pct >= 3) return { tone: 'warn', label: 'Atencion' };
        return null;
    };

    const flowLabel = (value) => {
        if (value === 'structural') return 'Estructural';
        if (value === 'provision') return 'Provision';
        if (value === 'discretionary') return 'Discrecional';
        return null;
    };

    const formatAmount = (item) => {
        const amount = Number(item?.amount || 0);
        const formatted = `$${amount.toLocaleString('es-CL')}`;
        if (item?.provisioned) return `${formatted} /mes`;
        return formatted;
    };

    // Filter Logic
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Naively handle next month rollover
    const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
    const nextMonth = nextMonthDate.getMonth();
    const nextMonthYear = nextMonthDate.getFullYear();

    const monthName = (m) => {
        const names = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return names[m];
    };

    const filteredItems = items.filter(item => {
        if (filterMode === 'all') return true;
        if (!item.date) return false;
        const d = new Date(item.date);
        if (filterMode === 'current') {
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }
        if (filterMode === 'next') {
            return d.getMonth() === nextMonth && d.getFullYear() === nextMonthYear;
        }
        return false;
    });

    const grouped = filteredItems.reduce((acc, it) => {
        const key = it.date || 'sin-fecha';
        acc[key] = acc[key] || [];
        acc[key].push(it);
        return acc;
    }, {});

    const sortedDates = Object.keys(grouped).sort((a, b) => {
        if (a === 'sin-fecha') return 1;
        if (b === 'sin-fecha') return -1;
        return new Date(a) - new Date(b);
    });

    return (
        <div className="upcoming-container">
            <div className="section-title">Proximo en el horizonte</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '16px' }}>
                Proximos 60 dias
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {[
                    { key: 'all', label: 'Todo' },
                    { key: 'current', label: monthName(currentMonth) },
                    { key: 'next', label: monthName(nextMonth) }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilterMode(tab.key)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '999px',
                            border: 'none',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            background: filterMode === tab.key ? 'var(--primary-main)' : 'var(--bg-card)',
                            color: filterMode === tab.key ? '#fff' : 'var(--color-text-dim)',
                            boxShadow: filterMode === tab.key ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {!loading && (
                <div style={{
                    background: 'var(--bg-card)',
                    padding: '16px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ zIndex: 1 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                            {filterMode === 'all' ? 'Total Proyectado (60d)' : `Total ${filterMode === 'current' ? monthName(currentMonth) : monthName(nextMonth)}`}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-text-main)' }}>
                            ${Math.round(filteredItems.reduce((acc, it) => acc + Number(it.amount || 0), 0)).toLocaleString('es-CL')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '4px' }}>
                            {filteredItems.length} items en cola
                        </div>
                    </div>

                    {/* The Cat */}
                    <img
                        src={catObserving}
                        alt="Observing Cat"
                        style={{
                            height: '80px',
                            objectFit: 'contain',
                            marginRight: '-10px',
                            marginBottom: '-10px',
                            opacity: 0.8
                        }}
                    />
                </div>
            )}
            {!loading && filteredItems.length > 0 && filterMode === 'all' && (
                <div style={{ marginBottom: '10px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                    IA: Revisa los impactos con alerta suave esta semana.
                </div>
            )}
            {loading ? (
                <div className="skeleton" style={{ height: '90px' }} />
            ) : items.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-dim)' }}>Nada pendiente...</div>
            ) : (
                sortedDates.map((date) => {
                    const group = grouped[date] || [];
                    const total = group.reduce((sum, g) => sum + Number(g.amount || 0), 0);
                    const hasHigh = group.some(g => g.severity === 'high');
                    return (
                        <details key={date} style={{ marginBottom: '8px' }}>
                            <summary style={{
                                listStyle: 'none',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 12px',
                                borderRadius: '12px',
                                border: '1px solid var(--border-light)',
                                background: 'var(--bg-card)',
                                cursor: 'pointer'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div style={{ fontWeight: '700' }}>{formatDate(date)}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                        {formatDays(date)} - {group.length} items
                                    </div>
                                </div>
                                <div style={{ fontWeight: '700', color: hasHigh ? 'var(--status-red-main)' : 'var(--status-yellow-main)' }}>
                                    ${Number(total || 0).toLocaleString('es-CL')}
                                </div>
                            </summary>
                            <div style={{ marginTop: '6px' }}>
                                {group.map((item, idx) => {
                                    const alert = softAlert(item);
                                    return (
                                        <div key={`${item.type}-${idx}`} className={`upcoming-item ${item.severity === 'high' ? 'red' : 'yellow'}`}>
                                            <div className="item-icon-circle">{item.type === 'commitment' ? 'C' : 'E'}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '700' }}>{item.label || item.name || 'Sin nombre'}</div>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                                    <span style={{
                                                        ...chipStyle(item.severity === 'critical' ? 'critical' : (item.severity === 'high' ? 'danger' : 'warn')),
                                                        padding: '2px 8px',
                                                        borderRadius: '999px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '700'
                                                    }}>
                                                        {item.is_overdue ? '¡VENCIDO!' : (item.type === 'commitment' ? 'Compromiso' : 'Evento')}
                                                    </span>
                                                    {flowLabel(item.flow_category) && (
                                                        <span style={{
                                                            ...chipStyle('default'),
                                                            padding: '2px 8px',
                                                            borderRadius: '999px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: '600'
                                                        }}>
                                                            {flowLabel(item.flow_category)}
                                                        </span>
                                                    )}
                                                    {item.provisioned && (
                                                        <span style={{
                                                            ...chipStyle('warn'),
                                                            padding: '2px 8px',
                                                            borderRadius: '999px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: '700'
                                                        }}>
                                                            Provision mensual
                                                        </span>
                                                    )}
                                                    {item.severity === 'high' && (
                                                        <span style={{
                                                            ...chipStyle('danger'),
                                                            padding: '2px 8px',
                                                            borderRadius: '999px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: '700'
                                                        }}>
                                                            Obligatorio
                                                        </span>
                                                    )}
                                                    {alert && (
                                                        <span style={{
                                                            ...chipStyle(alert.tone),
                                                            padding: '2px 8px',
                                                            borderRadius: '999px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: '700'
                                                        }}>
                                                            {alert.label}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: '700', color: item.severity === 'high' ? 'var(--status-red-main)' : 'var(--status-yellow-main)' }}>
                                                {formatAmount(item)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </details>
                    );
                })
            )}
        </div>
    );
};

export default Horizon;
