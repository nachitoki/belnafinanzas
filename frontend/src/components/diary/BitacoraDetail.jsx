import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getBitacoraEntry, createBitacora, updateBitacora } from '../../services/api';

const impactStyle = (impact) => {
    if (impact === 'high') return { background: '#FEE2E2', color: '#B91C1C' };
    if (impact === 'medium') return { background: '#FEF3C7', color: '#B45309' };
    return { background: '#E0F2FE', color: '#0369A1' };
};

const impactLabel = (impact) => {
    if (impact === 'high') return 'Impacto alto';
    if (impact === 'medium') return 'Impacto medio';
    return 'Impacto bajo';
};

const kindLabel = (kind) => {
    if (kind === 'observacion' || kind === 'observation') return 'Observaciones';
    if (kind === 'decision' || kind === 'pattern') return 'Patrones';
    if (kind === 'nota' || kind === 'question') return 'Consultas';
    if (kind === 'idea') return 'Ideas';
    if (kind === 'project') return 'Proyectos';
    return 'Detalle';
};

const ENABLE_EMOTION = false;
const ENABLE_TCO = false;

const BitacoraDetail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const [entry, setEntry] = useState(location.state?.entry || null);
    const [loading, setLoading] = useState(!location.state?.entry);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [convertOpen, setConvertOpen] = useState(false);
    const [confirmProject, setConfirmProject] = useState(false);
    const [ideaForm, setIdeaForm] = useState({
        title: location.state?.entry?.title || '',
        category: 'compra',
        cost: '',
        horizon: '',
        emotion: '',
        tco: ''
    });

    const type = location.state?.type || (entry?.kind ? kindLabel(entry.kind).toLowerCase() : 'detalle');

    useEffect(() => {
        const fetchEntry = async () => {
            if (!params.id || entry) return;
            setLoading(true);
            try {
                const data = await getBitacoraEntry(params.id);
                                setEntry({
                    id: data.id,
                    title: data.title || data.text || 'Sin t�tulo',
                    summary: data.summary || (data.kind ? `Tipo: ${data.kind}` : ''),
                    detail: data.detail || data.text || '',
                    answer: data.answer,
                    meta: data.meta,
                    impact: data.impact || null,
                    kind: data.kind,
                    context: data.created_at ? `Creado: ${data.created_at}` : ''
                });
            } catch (e) {
                const detail = e.response?.data?.detail || e.message || 'Error desconocido';
                setError(detail);
            } finally {
                setLoading(false);
            }
        };
        fetchEntry();
    }, [params.id, entry]);

    useEffect(() => {
        if (!entry) return;
        setIdeaForm((prev) => ({
            ...prev,
            title: entry.title || prev.title
        }));
    }, [entry]);


    const handleConvert = async () => {
        if (!entry || !ideaForm.title.trim()) return;
        setSaving(true);
        try {
            await updateBitacora(entry.id, {
                text: ideaForm.title.trim(),
                kind: 'idea',
                meta: {
                    ...(entry.meta || {}),
                    category: ideaForm.category,
                    estimated_cost: ideaForm.cost ? Number(ideaForm.cost) : null,
                    horizon_months: ideaForm.horizon ? Number(ideaForm.horizon) : null,
                    emotion_tag: ideaForm.emotion || null,
                    tco_total: ideaForm.tco ? Number(ideaForm.tco) : null
                },
                status: 'active'
            });
            setConvertOpen(false);
            navigate('/bitacora?tab=ideas');
        } catch (e) {
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            alert(`Error al convertir: ${detail}`);
        } finally {
            setSaving(false);
        }
    };

    const handleAcceptProject = async () => {
        if (!entry) return;
        setSaving(true);
        try {
            const meta = entry.meta || null;
            let nextMeta = meta;
            if (meta?.estimated_cost && meta?.horizon_months) {
                const monthly = Number(meta.estimated_cost) / Number(meta.horizon_months || 1);
                nextMeta = { ...meta, monthly_target: Number.isFinite(monthly) ? Math.round(monthly) : null };
            }
            await updateBitacora(entry.id, {
                kind: 'project',
                meta: nextMeta,
                status: 'active'
            });
            navigate('/bitacora?tab=proyectos');
        } catch (e) {
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            alert(`Error al convertir: ${detail}`);
        } finally {
            setSaving(false);
        }
    };

    const handleArchive = async () => {
        if (!entry?.id || !entry?.kind) return;
        setSaving(true);
        try {
            await updateBitacora(entry.id, { status: 'archived' });
            navigate('/bitacora');
        } catch (e) {
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            alert(`Error al archivar: ${detail}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', minHeight: 'calc(100vh - var(--topbar-height, 72px) - var(--bottomnav-height, 96px))' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <button
                    onClick={() => navigate('/bitacora')}
                    style={{ background: 'transparent', fontSize: '1.2rem', padding: '0 10px 0 0', border: 'none' }}
                >
                    {'\u2190'}
                </button>
                <div>
                    <h2>Detalle Bitácora</h2>
                    <div className="page-subtitle">Tarjeta {type}</div>
                </div>
            </div>

            {loading && (
                <div className="loading-text">Cargando detalle...</div>
            )}

            {!loading && error && (
                <div className="spending-card">
                    <div style={{ fontWeight: '700', marginBottom: '6px' }}>No se pudo cargar</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{error}</div>
                    <button
                        onClick={() => navigate('/bitacora')}
                        style={{ marginTop: '10px', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#f8fafc' }}
                    >
                        Volver a Bitácora
                    </button>
                </div>
            )}

            {!loading && !error && !entry && (
                <div className="spending-card">
                    <div style={{ fontWeight: '700', marginBottom: '6px' }}>Sin datos de tarjeta</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                        Abre una tarjeta desde Bitácora para ver el detalle. ID: {params.id}
                    </div>
                    <button
                        onClick={() => navigate('/bitacora')}
                        style={{ marginTop: '10px', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#f8fafc' }}
                    >
                        Volver a Bitácora
                    </button>
                </div>
            )}

            {!loading && !error && entry && (
                <div className="spending-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: '700' }}>{entry.title}</div>
                        {entry.impact && (
                            <span style={{
                                ...impactStyle(entry.impact),
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontSize: '0.7rem',
                                fontWeight: '700'
                            }}>
                                {impactLabel(entry.impact)}
                            </span>
                        )}
                    </div>
                    {entry.summary && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: '6px' }}>
                            {entry.summary}
                        </div>
                    )}
                    {entry.detail && (
                        <div style={{ fontSize: '0.9rem', marginTop: '10px' }}>{entry.detail}</div>
                    )}
                    {entry.answer && (
                        <div style={{ marginTop: '10px', fontSize: '0.9rem' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Respuesta IA</div>
                            <div>{entry.answer}</div>
                        </div>
                    )}
{entry.meta?.simulation_text && (
                        <div style={{ marginTop: '10px', fontSize: '0.9rem' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Simulacion IA</div>
                            <div>{entry.meta.simulation_text}</div>
                        </div>
                    )}
                    {entry.meta && (
                        <div style={{ marginTop: '12px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Detalles</div>
                            {entry.meta.category && (
                                <div style={{ fontSize: '0.85rem' }}>Tipo: {entry.meta.category}</div>
                            )}
                            {entry.meta.estimated_cost !== undefined && entry.meta.estimated_cost !== null && (
                                <div style={{ fontSize: '0.85rem' }}>
                                    Costo: ${Number(entry.meta.estimated_cost || 0).toLocaleString('es-CL')}
                                </div>
                            )}
                            {entry.meta.horizon_months && (
                                <div style={{ fontSize: '0.85rem' }}>Horizonte: {entry.meta.horizon_months} meses</div>
                            )}
                            {entry.meta.monthly_target && (
                                <div style={{ fontSize: '0.85rem' }}>
                                    Ahorro mensual aprox: ${Number(entry.meta.monthly_target).toLocaleString('es-CL')}
                                </div>
                            )}
                            {ENABLE_EMOTION && entry.meta.emotion_tag && (
                                <div style={{ fontSize: '0.85rem' }}>
                                    Emoción: {entry.meta.emotion_tag}
                                </div>
                            )}
                            {ENABLE_TCO && entry.meta.tco_total && (
                                <div style={{ fontSize: '0.85rem' }}>
                                    TCO: ${Number(entry.meta.tco_total).toLocaleString('es-CL')}
                                </div>
                            )}
                            {entry.meta.context && (
                                <div style={{ fontSize: '0.85rem' }}>Contexto: {entry.meta.context}</div>
                            )}
                        </div>
                    )}
                    {entry.context && (
                        <div style={{ marginTop: '12px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Contexto relacionado</div>
                            <div style={{ fontSize: '0.85rem' }}>{entry.context}</div>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                        {entry.kind && (
                            <button
                                onClick={handleArchive}
                                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#ffffff' }}
                            >
                                Archivar
                            </button>
                        )}
                        {type === 'consultas' && (
                            <button
                                onClick={() => setConvertOpen((prev) => !prev)}
                                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#f8fafc' }}
                            >
                            Convertir en Idea
                            </button>
                        )}
                        {type === 'ideas' && (
                            <button
                                onClick={() => setConfirmProject((prev) => !prev)}
                                disabled={saving}
                                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#f8fafc' }}
                            >
                                {saving ? 'Guardando...' : 'Aceptar como Proyecto'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {confirmProject && entry && (
                <div className="spending-card" style={{ marginTop: '12px', background: '#F8FAFC' }}>
                    <div style={{ fontWeight: '700', marginBottom: '6px' }}>Confirmar Proyecto</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                        Costo: {entry.meta?.estimated_cost ? `$${Number(entry.meta.estimated_cost).toLocaleString('es-CL')}` : 'sin definir'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                        Horizonte: {entry.meta?.horizon_months ? `${entry.meta.horizon_months} meses` : 'sin definir'}
                    </div>
                    {ENABLE_TCO && entry.meta?.tco_total && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                            TCO: ${Number(entry.meta.tco_total).toLocaleString('es-CL')}
                        </div>
                    )}
                    {entry.meta?.monthly_target && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                            Ahorro mensual aprox: ${Number(entry.meta.monthly_target).toLocaleString('es-CL')}
                        </div>
                    )}
                    {ENABLE_TCO && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: '6px' }}>
                            Trade-off estimado: este proyecto puede retrasar otros objetivos.
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                            onClick={() => setConfirmProject(false)}
                            style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#ffffff' }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAcceptProject}
                            disabled={saving}
                            style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#f8fafc' }}
                        >
                            {saving ? 'Guardando...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            )}

            {convertOpen && entry && (
                <div className="spending-card" style={{ marginTop: '12px' }}>
                    <div style={{ fontWeight: '700', marginBottom: '8px' }}>Convertir en Idea</div>
                    <input
                        value={ideaForm.title}
                        onChange={(e) => setIdeaForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Nombre de la idea"
                        style={{ width: '100%', marginBottom: '8px' }}
                    />
                    <select
                        value={ideaForm.category}
                        onChange={(e) => setIdeaForm((prev) => ({ ...prev, category: e.target.value }))}
                        style={{ width: '100%', marginBottom: '8px' }}
                    >
                        <option value="compra">Compra</option>
                        <option value="viaje">Viaje</option>
                        <option value="inversion">Inversión</option>
                        <option value="emprendimiento">Emprendimiento</option>
                        <option value="vida">Vida</option>
                    </select>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                            value={ideaForm.cost}
                            onChange={(e) => setIdeaForm((prev) => ({ ...prev, cost: e.target.value }))}
                            placeholder="Costo estimado"
                            inputMode="decimal"
                            style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }}
                        />
                        <input
                            value={ideaForm.horizon}
                            onChange={(e) => setIdeaForm((prev) => ({ ...prev, horizon: e.target.value }))}
                            placeholder="Horizonte (meses)"
                            inputMode="numeric"
                            style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }}
                        />
                    </div>
                    {ENABLE_EMOTION && (
                        <select
                            value={ideaForm.emotion}
                            onChange={(e) => setIdeaForm((prev) => ({ ...prev, emotion: e.target.value }))}
                            style={{ width: '100%', marginBottom: '8px' }}
                        >
                            <option value="">Etiqueta emocional (opcional)</option>
                            <option value="cansado">Cansado</option>
                            <option value="apurado">Apurado</option>
                            <option value="celebracion">Celebración</option>
                            <option value="neutral">Neutral</option>
                        </select>
                    )}
                    {ENABLE_TCO && (
                        <input
                            value={ideaForm.tco}
                            onChange={(e) => setIdeaForm((prev) => ({ ...prev, tco: e.target.value }))}
                            placeholder="TCO estimado (opcional)"
                            inputMode="decimal"
                            style={{ width: '100%', marginBottom: '8px' }}
                        />
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setConvertOpen(false)}
                            style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#f8fafc' }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConvert}
                            disabled={saving}
                            style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#ffffff' }}
                        >
                            {saving ? 'Guardando...' : 'Guardar idea'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BitacoraDetail;



