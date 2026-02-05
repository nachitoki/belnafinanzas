import React, { useEffect, useState } from 'react';
import { getAlerts } from '../../services/api';

const Alerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getAlerts();
                setAlerts(data || []);
            } catch (e) {
                console.error('Error loading alerts', e);
                setAlerts([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const colorFor = (sev) => {
        if (sev === 'high') return 'var(--status-red-main)';
        if (sev === 'medium') return 'var(--status-yellow-main)';
        return 'var(--color-text-dim)';
    };

    const formatDate = (value) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString();
    };

    const formatPct = (value) => {
        if (value === null || value === undefined) return '';
        const rounded = Math.round(Number(value) * 10) / 10;
        if (Number.isNaN(rounded)) return '';
        return `${rounded}%`;
    };

    const chipStyle = (tone) => {
        if (tone === 'danger') {
            return { background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' };
        }
        if (tone === 'warn') {
            return { background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D' };
        }
        return { background: '#E2E8F0', color: '#475569', border: '1px solid #CBD5F5' };
    };

    return (
        <div className="spending-card">
            <div className="section-title">Notificaciones</div>
            {loading ? (
                <div className="skeleton" style={{ height: '70px' }} />
            ) : alerts.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-dim)' }}>Sin alertas relevantes.</div>
            ) : (
                alerts.map((a, idx) => (
                    <div key={`${a.type}-${idx}`} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colorFor(a.severity) }} />
                        <div>
                            <div style={{ fontWeight: '700' }}>{a.title}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>{a.message}</div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                {a.date && (
                                    <span style={{
                                        ...chipStyle('neutral'),
                                        padding: '2px 8px',
                                        borderRadius: '999px',
                                        fontSize: '0.7rem',
                                        fontWeight: '600'
                                    }}>
                                        Fecha: {formatDate(a.date)}
                                    </span>
                                )}
                                {a.impact_pct ? (
                                    <span style={{
                                        ...chipStyle(a.severity === 'high' ? 'danger' : a.severity === 'medium' ? 'warn' : 'neutral'),
                                        padding: '2px 8px',
                                        borderRadius: '999px',
                                        fontSize: '0.7rem',
                                        fontWeight: '700'
                                    }}>
                                        Impacto {formatPct(a.impact_pct)}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default Alerts;
