import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEvents, createEvent, updateEvent } from '../../services/api';
import PillTabs from '../layout/PillTabs';

const Events = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [eventType, setEventType] = useState('annual');
    const [date, setDate] = useState('');
    const [isMandatory, setIsMandatory] = useState(false);
    const [flowCategory, setFlowCategory] = useState('provision');
    const [saving, setSaving] = useState(false);
    const [actionSavingId, setActionSavingId] = useState(null);

    const loadEvents = async () => {
        try {
            const data = await getEvents();
            setEvents(data || []);
            setLoadError('');
            window.localStorage.setItem('events_cache_v1', JSON.stringify({ ts: Date.now(), data: data || [] }));
        } catch (e) {
            console.error('Error loading events', e);
            setEvents([]);
            setLoadError('No se pudieron cargar los eventos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const cachedRaw = window.localStorage.getItem('events_cache_v1');
        if (cachedRaw) {
            try {
                const cached = JSON.parse(cachedRaw);
                if (Array.isArray(cached?.data)) {
                    setEvents(cached.data);
                    setLoadError('');
                    setLoading(false);
                }
            } catch (e) {
                console.warn('Invalid events cache', e);
            }
        }
        loadEvents();
    }, []);

    const parseNumber = (value) => {
        if (value === null || value === undefined) return 0;
        const normalized = String(value).replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(normalized);
        return Number.isNaN(parsed) ? 0 : parsed;
    };

    const handleSave = async () => {
        if (!name.trim()) {
            alert('Ingresa un nombre para el evento.');
            return;
        }
        if (!date) {
            alert('Selecciona una fecha para el evento.');
            return;
        }
        setSaving(true);
        try {
            await createEvent({
                name: name.trim(),
                amount_estimate: parseNumber(amount),
                event_type: eventType,
                date,
                is_mandatory: isMandatory,
                flow_category: flowCategory
            });
            setName('');
            setAmount('');
            setEventType('annual');
            setDate('');
            setIsMandatory(false);
            setFlowCategory('provision');
            await loadEvents();
        } catch (e) {
            console.error('Error creating event', e);
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            alert('Error al guardar: ' + detail);
        } finally {
            setSaving(false);
        }
    };

    const handlePostpone = (item, value = null) => {
        const days = value || prompt('Cuantos dias postergar? (5, 10, 15, 30, next_month)', '5');
        if (!days) return;
        const normalized = String(days).trim().toLowerCase();
        setActionSavingId(item.id);
        updateEvent(item.id, { action: 'postpone', postpone_days: normalized })
            .then(loadEvents)
            .catch((e) => {
                console.error('Error postponing event', e);
                const detail = e.response?.data?.detail || e.message || 'Error desconocido';
                alert('No se pudo postergar: ' + detail);
            })
            .finally(() => setActionSavingId(null));
    };

    const typeLabel = (t) => {
        if (t === 'technical') return 'Tecnico';
        if (t === 'eventual') return 'Eventual';
        return 'Anual';
    };

    const flowLabel = (value) => {
        if (value === 'provision') return 'Provision';
        if (value === 'discretionary') return 'Discrecional/Deuda';
        return 'Estructural';
    };

    return (
        <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', minHeight: 'calc(100vh - var(--topbar-height, 72px) - var(--bottomnav-height, 96px))' }}>
            <PillTabs
                items={[
                    { label: 'Ingresos', path: '/incomes?tab=ingresos', icon: '\u2B06\uFE0F' },
                    { label: 'Compromisos', path: '/commitments?tab=compromisos', icon: '\uD83D\uDCC4' },
                    { label: 'Eventos', path: '/events?tab=eventos', icon: '\uD83D\uDCC6' },
                    { label: 'Horizonte', path: '/horizon', icon: '\u23F3' },
                    { label: 'Distribucion', path: '/incomes?tab=distribucion', icon: '\uD83C\uDF69' }
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
                    <h2>Eventos</h2>
                    <div className="page-subtitle">Eventos planificados del ano</div>
                </div>
            </div>

            <div className="spending-card" style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '10px' }}>AGREGAR EVENTO</div>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre (Cumpleanos, Permiso, Viaje, etc.)"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Monto estimado"
                        inputMode="decimal"
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                    />
                    <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        style={{ width: '140px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                    >
                        <option value="annual">Anual</option>
                        <option value="technical">Tecnico</option>
                        <option value="eventual">Eventual</option>
                    </select>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        type="date"
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                        <input
                            type="checkbox"
                            checked={isMandatory}
                            onChange={(e) => setIsMandatory(e.target.checked)}
                        />
                        Obligatorio
                    </label>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <select
                        value={flowCategory}
                        onChange={(e) => setFlowCategory(e.target.value)}
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                    >
                        <option value="structural">Estructural</option>
                        <option value="provision">Provision</option>
                        <option value="discretionary">Discrecional/Deuda</option>
                    </select>
                </div>
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

            <h3 className="section-title" style={{ textAlign: 'center', marginTop: '20px' }}>EVENTOS REGISTRADOS</h3>

            {loading ? (
                <div className="loading-text">Cargando eventos...</div>
            ) : loadError ? (
                <div style={{ textAlign: 'center', color: '#C53030' }}>
                    {loadError}
                    <div style={{ marginTop: '8px' }}>
                        <button
                            onClick={() => { setLoading(true); loadEvents(); }}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff' }}
                        >
                            Reintentar
                        </button>
                    </div>
                </div>
            ) : events.length === 0 ? (
                <div className="loading-text">Sin eventos aun.</div>
            ) : (
                events.map((ev) => (
                    <div key={ev.id} className="spending-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontWeight: '700' }}>{ev.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                    {typeLabel(ev.event_type)} {ev.flow_category ? `- ${flowLabel(ev.flow_category)}` : ''} {ev.is_mandatory ? '- Obligatorio' : ''} {ev.date ? `- ${ev.date}` : ''}
                                </div>
                            </div>
                            <div style={{ fontWeight: '700', color: ev.is_mandatory ? 'var(--status-red-main)' : 'var(--status-yellow-main)' }}>
                                ${Number(ev.amount_estimate || 0).toLocaleString('es-CL')}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {[5, 10, 15, 30].map((d) => (
                                <button
                                    key={`${ev.id}-postpone-${d}`}
                                    onClick={() => handlePostpone(ev, String(d))}
                                    type="button"
                                    disabled={actionSavingId === ev.id}
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
                                onClick={() => handlePostpone(ev, 'next_month')}
                                type="button"
                                disabled={actionSavingId === ev.id}
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
                                Prox. mes
                            </button>
                            <button
                                onClick={() => handlePostpone(ev)}
                                type="button"
                                disabled={actionSavingId === ev.id}
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
                    </div>
                ))
            )}
        </div>
    );
};

export default Events;













