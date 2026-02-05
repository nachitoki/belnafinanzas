import React, { useMemo } from 'react';
import projectProgress from '../../data/projectProgress.json';

const STATUS_COLORS = {
    done: '#15803D',
    inProgress: '#F59E0B',
    planned: '#9CA3AF'
};

const RoadmapProgress = () => {
    const phases = projectProgress.phases || [];
    const updatedAt = projectProgress.updatedAt || null;
    const totals = useMemo(() => {
        let total = 0;
        let doneCount = 0;
        let inProgressCount = 0;
        phases.forEach((phase) => {
            phase.tasks.forEach((task) => {
                total += 1;
                if (task.status === 'done') doneCount += 1;
                if (task.status === 'inProgress') inProgressCount += 1;
            });
        });
        const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);
        return { total, doneCount, inProgressCount, percent };
    }, [phases]);

    const containerStyle = {
        padding: '20px 20px 120px',
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: 'calc(100vh - var(--topbar-height, 72px) - var(--bottomnav-height, 96px))'
    };

    return (
        <div style={containerStyle}>
            <div style={{ marginBottom: '18px', marginTop: '8px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Progreso del proyecto</h2>
                <p className="page-subtitle">MVP + post-v1 + v2</p>
            </div>

            <div className="spending-card" style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'baseline' }}>
                    <div>
                        <div style={{ fontWeight: '700' }}>Progreso general</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                            {projectProgress.note}
                        </div>
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '1.4rem' }}>{totals.percent}%</div>
                </div>
                <div className="spending-bar" style={{ height: '14px', borderRadius: '10px' }}>
                    <div
                        className="spending-bar-fill green"
                        style={{ width: `${totals.percent}%` }}
                    />
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: '6px' }}>
                    {totals.doneCount} completados - {totals.inProgressCount} en progreso - {totals.total} en total
                </div>
                <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                    Última actualización: {updatedAt ? new Date(updatedAt).toLocaleString() : 'sin datos'}
                </div>
                <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                    Actualizado por Codex (solo lectura).
                </div>
            </div>

            {phases.map((phase) => {
                const total = phase.tasks.length;
                const doneCount = phase.tasks.filter((t) => t.status === 'done').length;
                const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);
                return (
                    <div key={phase.id} className="spending-card" style={{ cursor: 'default' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div>
                                <div style={{ fontWeight: '700' }}>{phase.title}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                    {phase.highlight}
                                </div>
                            </div>
                            <div style={{ fontWeight: '700', fontSize: '1rem' }}>{percent}%</div>
                        </div>
                        {total === 0 ? (
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                                Fase conceptual / estrategia.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {phase.tasks.map((task) => (
                                    <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div
                                                style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '6px',
                                                    border: `1px solid ${STATUS_COLORS[task.status]}`,
                                                    background: task.status === 'done' ? 'rgba(16,185,129,0.2)' : '#fff',
                                                    color: task.status === 'done' ? STATUS_COLORS[task.status] : STATUS_COLORS[task.status],
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: '800'
                                                }}
                                            >
                                                {task.status === 'done' ? '\u2713' : task.status === 'inProgress' ? '\u23F3' : ''}
                                            </div>
                                            <div>
                                                <div>{task.title}</div>
                                                {task.description && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                                        {task.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: STATUS_COLORS[task.status] }}>
                                            {task.status === 'done' ? 'Completado' : task.status === 'inProgress' ? 'En progreso' : 'Planificado'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default RoadmapProgress;
