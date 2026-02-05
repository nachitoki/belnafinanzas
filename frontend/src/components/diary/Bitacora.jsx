import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    getBitacora,
    createBitacora,
    updateBitacora,
    askBitacora,
    generateBitacoraObservations,
    generateBitacoraPatterns,
    simulateBitacoraIdea
} from '../../services/api';
import { loadDistributionMeta, getDistributionMetaLabel } from '../../utils/distributionMeta';
import PillTabs from '../layout/PillTabs';

const iconEmoji = {
    observaciones: '\uD83D\uDC41\uFE0F',
    consultas: '\u2753',
    patrones: '\uD83D\uDCC8',
    ideas: '\uD83D\uDCA1',
    proyectos: '\uD83D\uDEA9'
};

const ENABLE_ADVANCED_INSIGHTS = true;
const ENABLE_SIMULATION = true;
const ENABLE_EMOTION = false;
const ENABLE_TCO = true;
const ENABLE_NOTEBOOKLM = false;
const ANSWER_PREVIEW_LIMIT = 140;
const SIM_PREVIEW_LIMIT = 160;

const Bitacora = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingId, setSavingId] = useState(null);
    const [saveMessage, setSaveMessage] = useState('');
    const [activeTab, setActiveTab] = useState('observaciones');
    const [questionText, setQuestionText] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [expandedSimulationId, setExpandedSimulationId] = useState(null);
    const [convertTarget, setConvertTarget] = useState(null);
    const [projectTarget, setProjectTarget] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    const [aiObsLoading, setAiObsLoading] = useState(false);
    const [aiObsMessage, setAiObsMessage] = useState('');
    const [aiPatternLoading, setAiPatternLoading] = useState(false);
    const [aiPatternMessage, setAiPatternMessage] = useState('');
    const [simulations, setSimulations] = useState({});
    const [advancedSimulations, setAdvancedSimulations] = useState({});
    const [expandedAdvancedId, setExpandedAdvancedId] = useState(null);
    const [aiAdvancedLoading, setAiAdvancedLoading] = useState(false);
    const [aiAdvancedMessage, setAiAdvancedMessage] = useState('');
    const autoObsTriggered = useRef(false);
    const autoPatternTriggered = useRef(false);
    const [ideaForm, setIdeaForm] = useState({
        title: '',
        category: 'compra',
        cost: '',
        horizon: '',
        emotion: '',
        tco: ''
    });

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab') || 'observaciones';
        setActiveTab(tab);
    }, [location.search]);


    const loadEntries = async () => {
        setLoading(true);
        try {
            const data = await getBitacora();
            setEntries(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Error loading bitacora', e);
            setEntries([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEntries();
    }, []);



    const normalizeKind = (entry) => {
        const raw = entry?.kind;
        const text = String(entry?.text || '').toLowerCase();
        const hasQuestion = text.includes('?');
        const mentionsIdea = text.includes('idea') || text.includes('sueño') || text.includes('sueno') || text.includes('proyecto');

        if (!raw) {
            if (mentionsIdea) return 'idea';
            return hasQuestion ? 'nota' : 'nota';
        }

        const k = String(raw).toLowerCase();
        if (k === 'observacion' || k === 'observation') return 'observacion';
        if (k === 'decision' || k === 'pattern') {
            if (hasQuestion) return 'idea';
            return 'decision';
        }
        if (k === 'idea') return 'idea';
        if (k === 'project' || k === 'proyecto') return 'project';
        if (k === 'nota' || k === 'question') return 'nota';

        if (mentionsIdea) return 'idea';
        return hasQuestion ? 'nota' : 'nota';
    };


    const entriesByTab = useMemo(() => {
        const groups = {
            observaciones: [],
            consultas: [],
            patrones: [],
            ideas: [],
            proyectos: []
        };
        (entries || []).forEach((entry) => {
            const isArchived = entry?.status === 'archived';
            if (isArchived && !showArchived) return;
            const kindValue = normalizeKind(entry);
            if (kindValue === 'observacion') groups.observaciones.push(entry);
            else if (kindValue === 'decision') groups.patrones.push(entry);
            else if (kindValue === 'idea') groups.ideas.push(entry);
            else if (kindValue === 'project') groups.proyectos.push(entry);
            else groups.consultas.push(entry);
        });
        return groups;
    }, [entries, showArchived]);


    const parseTitleSummary = (rawText, fallbackTitle) => {
        if (!rawText) return { title: fallbackTitle, summary: '' };
        const titleMatch = rawText.match(/titulo\s*:\s*(.+)/i);
        const summaryMatch = rawText.match(/resumen\s*:\s*(.+)/i);
        const title = titleMatch ? titleMatch[1].trim() : fallbackTitle;
        const summary = summaryMatch ? summaryMatch[1].trim() : rawText.trim();
        return { title, summary };
    };

    const runAutoObservations = async () => {
        setAiObsLoading(true);
        setAiObsMessage('');
        try {
            let count = 0;
            try {
                const res = await generateBitacoraObservations();
                count = Number(res?.created || 0);
            } catch (err) {
                if (err?.response?.status === 404) {
                    const context = buildAskContext();
                    const ai = await askBitacora({
                        question: 'Genera 1 observación breve del hogar. Devuelve en 2 líneas: Titulo: ... y Resumen: ...',
                        context
                    });
                    const { title, summary } = parseTitleSummary(ai?.answer || '', 'Observación IA');
                    if (summary) {
                        await createBitacora({
                            text: title,
                            title,
                            summary,
                            detail: summary,
                            impact: 'medium',
                            kind: 'observation',
                            status: 'active',
                            meta: { source: 'auto_fallback' }
                        });
                        count = 1;
                    }
                } else {
                    throw err;
                }
            }
            if (count > 0) {
                setAiObsMessage(`Observaciones IA generadas: ${count}`);
                await loadEntries();
            } else {
                setAiObsMessage('No hay observaciones con impacto suficiente.');
            }
        } catch (err) {
            console.error('Error generating observations', err);
            setAiObsMessage('No se pudo generar observaciones IA.');
        } finally {
            setAiObsLoading(false);
        }
    };

    const runAutoPatterns = async () => {
        setAiPatternLoading(true);
        setAiPatternMessage('');
        try {
            let count = 0;
            try {
                const res = await generateBitacoraPatterns();
                count = Number(res?.created || 0);
            } catch (err) {
                if (err?.response?.status === 404) {
                    const context = buildAskContext();
                    const ai = await askBitacora({
                        question: 'Genera 1 patrón financiero detectado. Devuelve en 2 líneas: Titulo: ... y Resumen: ...',
                        context
                    });
                    const { title, summary } = parseTitleSummary(ai?.answer || '', 'Patrón IA');
                    if (summary) {
                        await createBitacora({
                            text: title,
                            title,
                            summary,
                            detail: summary,
                            impact: 'medium',
                            kind: 'pattern',
                            status: 'active',
                            meta: { source: 'auto_fallback' }
                        });
                        count = 1;
                    }
                } else {
                    throw err;
                }
            }
            if (count > 0) {
                setAiPatternMessage(`Patrones IA generados: ${count}`);
                await loadEntries();
            } else {
                setAiPatternMessage('No hay patrones con impacto suficiente.');
            }
        } catch (err) {
            console.error('Error generating patterns', err);
            setAiPatternMessage('No se pudo generar patrones IA.');
        } finally {
            setAiPatternLoading(false);
        }
    };

    const handleSimulateIdea = async (entry) => {
        if (!entry?.id) return;
        setSimulations((prev) => ({
            ...prev,
            [entry.id]: { loading: true, text: prev[entry.id]?.text || '' }
        }));
        try {
            const meta = entry.meta || {};
            const context = buildAskContext();
            const res = await simulateBitacoraIdea({
                title: entry.title || entry.text || 'Idea',
                category: meta.category,
                estimated_cost: meta.estimated_cost,
                horizon_months: meta.horizon_months,
                tco_total: meta.tco_total,
                context
            });
            const simulationText = res?.simulation || '';
            const nextMeta = {
                ...(meta || {}),
                simulation_text: simulationText,
                simulation_at: new Date().toISOString(),
                monthly_target: res?.monthly_target ?? meta.monthly_target ?? null
            };
            await updateBitacora(entry.id, { meta: nextMeta });
            await loadEntries();
            setSimulations((prev) => ({
                ...prev,
                [entry.id]: { loading: false, text: simulationText }
            }));
        } catch (err) {
            console.error('Error simulating idea', err);
            setSimulations((prev) => ({
                ...prev,
                [entry.id]: { loading: false, text: prev[entry.id]?.text || '' }
            }));
        }
    };

    useEffect(() => {
        if (
            activeTab === 'observaciones'
            && ENABLE_ADVANCED_INSIGHTS
            && entriesByTab.observaciones.length === 0
            && !loading
            && !autoObsTriggered.current
        ) {
            autoObsTriggered.current = true;
            runAutoObservations();
        }
    }, [activeTab, ENABLE_ADVANCED_INSIGHTS, entriesByTab.observaciones.length, loading]);

    useEffect(() => {
        if (
            activeTab === 'patrones'
            && ENABLE_ADVANCED_INSIGHTS
            && entriesByTab.patrones.length === 0
            && !loading
            && !autoPatternTriggered.current
        ) {
            autoPatternTriggered.current = true;
            runAutoPatterns();
        }
    }, [activeTab, ENABLE_ADVANCED_INSIGHTS, entriesByTab.patrones.length, loading]);

    const buildAskContext = () => {
        const now = new Date();
        const monthKey = now.toISOString().slice(0, 7);
        const meta = loadDistributionMeta();
        const metaLabel = getDistributionMetaLabel(meta);
        return `Mes actual: ${monthKey}. ${metaLabel}.`;
    };

    const handleAsk = async () => {
        if (!questionText.trim()) return;
        setSaving(true);
        setSavingId('new-question');
        setSaveMessage('');
        try {
            const storedContext = buildAskContext();
            let answer = '';
            try {
                const ai = await askBitacora({
                    question: questionText.trim(),
                    context: storedContext
                });
                answer = ai?.answer || '';
            } catch (err) {
                console.error('IA no disponible', err);
            }
            if (!answer) {
                answer = 'No se pudo generar respuesta IA. Intenta nuevamente.';
            }
            await createBitacora({
                text: questionText.trim(),
                kind: 'question',
                answer,
                meta: { context: storedContext }
            });
            setQuestionText('');
            setSaveMessage('Consulta guardada');
            await loadEntries();
        } catch (e) {
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            setSaveMessage(`Error: ${detail}`);
        } finally {
            setSaving(false);
            setSavingId(null);
        }
    };

    const openConvert = (entry) => {
        const title = entry?.text || '';
        setConvertTarget(entry);
        setIdeaForm({
            title,
            category: 'compra',
            cost: '',
            horizon: '',
            emotion: '',
            tco: ''
        });
    };

    const handleConvert = async () => {
        if (!convertTarget || !ideaForm.title.trim()) return;
        setSaving(true);
        setSavingId(convertTarget.id);
        setSaveMessage('');
        try {
            await updateBitacora(convertTarget.id, {
                text: ideaForm.title.trim(),
                kind: 'idea',
                meta: {
                    ...(convertTarget.meta || {}),
                    category: ideaForm.category,
                    estimated_cost: ideaForm.cost ? Number(ideaForm.cost) : null,
                    horizon_months: ideaForm.horizon ? Number(ideaForm.horizon) : null,
                    emotion_tag: ideaForm.emotion || null,
                    tco_total: ideaForm.tco ? Number(ideaForm.tco) : null
                },
                status: 'active'
            });
            setConvertTarget(null);
            setIdeaForm({ title: '', category: 'compra', cost: '', horizon: '', emotion: '', tco: '' });
            setSaveMessage('Idea creada');
            await loadEntries();
        } catch (e) {
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            setSaveMessage(`Error: ${detail}`);
        } finally {
            setSaving(false);
            setSavingId(null);
        }
    };

    const archiveEntry = async (entry) => {
        if (!entry?.id || !entry?.kind) return;
        setSaving(true);
        setSavingId(entry.id);
        setSaveMessage('');
        try {
            await updateBitacora(entry.id, { status: 'archived' });
            setSaveMessage('Archivado');
            await loadEntries();
        } catch (e) {
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            setSaveMessage(`Error: ${detail}`);
        } finally {
            setSaving(false);
            setSavingId(null);
        }
    };

    const acceptProject = async (ideaEntry) => {
        if (!ideaEntry) return;
        setSaving(true);
        setSavingId(ideaEntry.id);
        setSaveMessage('');
        try {
            const meta = ideaEntry.meta || null;
            let nextMeta = meta;
            const costBase = meta?.estimated_cost || meta?.tco_total || null;
            if (costBase && meta?.horizon_months) {
                const monthly = Number(costBase) / Number(meta.horizon_months || 1);
                nextMeta = { ...meta, monthly_target: Number.isFinite(monthly) ? Math.round(monthly) : null };
            }
            await updateBitacora(ideaEntry.id, {
                kind: 'project',
                meta: nextMeta,
                status: 'active'
            });
            setSaveMessage('Proyecto creado');
            await loadEntries();
        } catch (e) {
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            setSaveMessage(`Error: ${detail}`);
        } finally {
            setSaving(false);
            setSavingId(null);
        }
    };

    const openProjectConfirm = (entry) => {
        setProjectTarget(entry);
    };

    const closeProjectConfirm = () => {
        setProjectTarget(null);
    };

    const exportMarkdown = () => {
        const grouped = entriesByTab;
        const lines = [
            '# Estado Financiero - Bitácora',
            '## Observaciones',
            ...(grouped.observaciones.map((o) => `- ${o.text || o.title || 'Observacion'}`)),
            '## Consultas',
            ...(grouped.consultas.map((q) => `- ${q.text || 'Consulta'}`)),
            '## Ideas',
            ...(grouped.ideas.map((i) => `- ${i.text || 'Idea'}`)),
            '## Proyectos',
            ...(grouped.proyectos.map((p) => `- ${p.text || 'Proyecto'}`))
        ];
        const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'estado_financiero_bitacora.md';
        a.click();
        URL.revokeObjectURL(url);
    };

    const viewDetail = (entry, type) => {
        navigate(`/bitacora/${entry.id}`, { state: { entry, type } });
    };

    const tabTitle = useMemo(() => {
        if (activeTab === 'observaciones') return 'Observaciones';
        if (activeTab === 'consultas') return 'Consultas';
        if (activeTab === 'patrones') return 'Patrones';
        if (activeTab === 'ideas') return 'Ideas';
        if (activeTab === 'proyectos') return 'Proyectos';
        return 'Bitácora';
    }, [activeTab]);

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

    const toggleExpand = (id) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    const tabCounts = useMemo(() => ({
        observaciones: entriesByTab.observaciones.length,
        consultas: entriesByTab.consultas.length,
        patrones: entriesByTab.patrones.length,
        ideas: entriesByTab.ideas.length,
        proyectos: entriesByTab.proyectos.length
    }), [entriesByTab]);

        const toCardEntry = (entry) => ({
        id: entry.id,
        title: entry.title || entry.text || 'Sin t�tulo',
        summary: entry.summary || (entry.kind ? `Tipo: ${entry.kind}` : ''),
        detail: entry.detail || (entry.answer ? `Q: ${entry.text}\n\nA: ${entry.answer}` : (entry.text || '')),
        impact: entry.impact || null,
        kind: entry.kind,
        context: entry.created_at ? `Creado: ${entry.created_at}` : '',
        meta: entry.meta,
        answer: entry.answer,
        status: entry.status
    });

    const getMonthlyTarget = (entry) => {
        const meta = entry?.meta || {};
        if (meta.monthly_target) return Number(meta.monthly_target);
        const horizon = Number(meta.horizon_months || 0);
        const baseCost = Number(meta.estimated_cost || 0);
        if (horizon > 0 && baseCost > 0) return Math.round(baseCost / horizon);
        const tco = Number(meta.tco_total || 0);
        if (horizon > 0 && tco > 0) return Math.round(tco / horizon);
        return null;
    };

    const renderMonthlyTarget = (entry) => {
        const monthly = getMonthlyTarget(entry);
        if (!monthly) return null;
        return (
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                Ahorro mensual aprox: ${Number(monthly).toLocaleString('es-CL')}
            </div>
        );
    };

    const getIncomeTotalFromCache = () => {
        try {
            const cachedRaw = window.localStorage.getItem('dashboard_cache_v1');
            const cached = cachedRaw ? JSON.parse(cachedRaw) : null;
            const income = cached?.data?.month_overview?.income_total;
            return Number(income || 0);
        } catch (e) {
            return 0;
        }
    };

    const handleSimulateIdeaAdvanced = async (entry) => {
        if (!entry?.id) return;
        setAdvancedSimulations((prev) => ({
            ...prev,
            [entry.id]: { loading: true, text: prev[entry.id]?.text || '' }
        }));
        try {
            const meta = entry.meta || {};
            const context = buildAskContext();
            const prompt = [
                `Idea: ${entry.title || entry.text || 'Idea'}`,
                `Categoria: ${meta.category || 'compra'}`,
                meta.estimated_cost ? `Costo estimado: ${meta.estimated_cost}` : '',
                meta.horizon_months ? `Horizonte: ${meta.horizon_months} meses` : '',
                meta.tco_total ? `TCO estimado: ${meta.tco_total}` : '',
                context
            ].filter(Boolean).join('. ');
            const ai = await askBitacora({
                question: 'Simula la idea con enfoque en impacto mensual, riesgos y alternativas. Responde en 4 lineas: Impacto mensual, Riesgos, Alternativas, Recomendacion.',
                context: prompt
            });
            const simulationText = (ai?.answer || '').trim();
            const nextMeta = {
                ...(meta || {}),
                simulation_text_adv: simulationText,
                simulation_adv_at: new Date().toISOString()
            };
            await updateBitacora(entry.id, { meta: nextMeta });
            await loadEntries();
            setAdvancedSimulations((prev) => ({
                ...prev,
                [entry.id]: { loading: false, text: simulationText }
            }));
        } catch (err) {
            console.error('Error simulating advanced idea', err);
            setAdvancedSimulations((prev) => ({
                ...prev,
                [entry.id]: { loading: false, text: prev[entry.id]?.text || '' }
            }));
        }
    };

    const runAdvancedInsights = async () => {
        setAiAdvancedLoading(true);
        setAiAdvancedMessage('');
        try {
            const context = buildAskContext();
            const ai = await askBitacora({
                question: 'Genera 1 insight avanzado (impacto alto) con enfoque en ahorro/inversion basica. Devuelve en 2 lineas: Titulo: ... y Resumen: ...',
                context
            });
            const { title, summary } = parseTitleSummary(ai?.answer || '', 'Insight avanzado');
            if (summary) {
                await createBitacora({
                    text: title,
                    title,
                    summary,
                    detail: summary,
                    impact: 'high',
                    kind: 'observation',
                    status: 'active',
                    meta: { source: 'advanced_insight' }
                });
                setAiAdvancedMessage('Insight avanzado creado');
                await loadEntries();
            } else {
                setAiAdvancedMessage('No se pudo generar insight avanzado.');
            }
        } catch (err) {
            console.error('Error generating advanced insight', err);
            setAiAdvancedMessage('No se pudo generar insight avanzado.');
        } finally {
            setAiAdvancedLoading(false);
        }
    };

    const renderProjectConfirm = (entry) => {
        if (!entry || projectTarget?.id !== entry.id) return null;
        const otherProjects = entriesByTab.proyectos.filter((p) => p.id !== entry.id && p.status !== 'archived');
        const monthlyNew = getMonthlyTarget(entry) || 0;
        const monthlyExisting = otherProjects.reduce((sum, p) => sum + (getMonthlyTarget(p) || 0), 0);
        const monthlyTotal = monthlyNew + monthlyExisting;
        const incomeTotal = getIncomeTotalFromCache();
        const meta = loadDistributionMeta();
        const blindajeCap = incomeTotal > 0 ? Math.round((incomeTotal * Number(meta.blindaje || 0)) / 100) : 0;
        const exceedsCap = blindajeCap > 0 && monthlyTotal > blindajeCap;
        const overBy = exceedsCap ? (monthlyTotal - blindajeCap) : 0;
        return (
            <div className="spending-card" style={{ marginTop: '10px', background: '#F8FAFC' }}>
                <div style={{ fontWeight: '700', marginBottom: '6px' }}>Aceptar como Proyecto</div>
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
                {renderMonthlyTarget(entry)}
                {ENABLE_TCO && (monthlyNew > 0 || monthlyExisting > 0) && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: '6px' }}>
                        Impacto mensual combinado: ${Number(monthlyTotal).toLocaleString('es-CL')} (incluye ${Number(monthlyExisting).toLocaleString('es-CL')} de proyectos activos).
                    </div>
                )}
                {ENABLE_TCO && exceedsCap && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--status-red-main)', marginTop: '6px' }}>
                        Trade-off: supera la capacidad de Blindaje en ${Number(overBy).toLocaleString('es-CL')} / mes. Podría retrasar otros proyectos.
                    </div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                        onClick={closeProjectConfirm}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#ffffff' }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            closeProjectConfirm();
                            acceptProject(entry);
                        }}
                        disabled={saving && savingId === entry.id}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#f8fafc' }}
                    >
                        {saving && savingId === entry.id ? 'Guardando...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', minHeight: 'calc(100vh - var(--topbar-height, 72px) - var(--bottomnav-height, 96px))' }}>
            <PillTabs
                items={[
                    { label: `Observaciones (${tabCounts.observaciones})`, path: '/bitacora?tab=observaciones', icon: iconEmoji.observaciones },
                    { label: `Consultas (${tabCounts.consultas})`, path: '/bitacora?tab=consultas', icon: iconEmoji.consultas },
                    { label: `Patrones (${tabCounts.patrones})`, path: '/bitacora?tab=patrones', icon: iconEmoji.patrones },
                    { label: `Ideas (${tabCounts.ideas})`, path: '/bitacora?tab=ideas', icon: iconEmoji.ideas },
                    { label: `Proyectos (${tabCounts.proyectos})`, path: '/bitacora?tab=proyectos', icon: iconEmoji.proyectos }
                ]}
            />
            <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{ background: 'transparent', fontSize: '1.2rem', padding: '0 6px 0 0', border: 'none' }}
                    >
                        {'\u2190'}
                    </button>
                    <div>
                        <h2 style={{ margin: 0 }}>Bitácora</h2>
                        <div className="page-subtitle">Notas, decisiones y eventos</div>
                        {ENABLE_NOTEBOOKLM && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                Base de conocimiento activa (NotebookLM)
                            </div>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => navigate('/bitacora?tab=consultas')}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-light)',
                            background: '#ffffff',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                        }}
                    >
                        Nueva consulta
                    </button>
                    <button
                        onClick={exportMarkdown}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-light)',
                            background: '#f8fafc',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                        }}
                    >
                        Exportar MD
                    </button>
                    <button
                        onClick={() => setShowArchived((prev) => !prev)}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-light)',
                            background: showArchived ? '#111827' : '#ffffff',
                            color: showArchived ? '#ffffff' : 'inherit',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                        }}
                    >
                    {showArchived ? 'Archivados (ON)' : 'Archivados'}
                    </button>
                </div>
            </div>

            {saveMessage && (
                <div className="spending-card" style={{ marginTop: '6px', fontSize: '0.85rem' }}>
                    {saveMessage}
                </div>
            )}

            <h3 className="section-title" style={{ textAlign: 'center', marginTop: '14px' }}>
                {tabTitle}
            </h3>

            {activeTab === 'observaciones' && (
                <>
                    <div className="spending-card" style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                            Observaciones automáticas cuando hay patrón + impacto.
                        </div>
                        {ENABLE_ADVANCED_INSIGHTS && (
                            <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                Insights avanzados activos.
                            </div>
                        )}
                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                                onClick={runAutoObservations}
                                disabled={aiObsLoading}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-light)',
                                    background: '#ffffff',
                                    cursor: aiObsLoading ? 'not-allowed' : 'pointer',
                                    fontSize: '0.8rem'
                                }}
                            >
                                {aiObsLoading ? 'Generando...' : 'Generar observaciones IA'}
                            </button>
                            {ENABLE_ADVANCED_INSIGHTS && (
                                <button
                                    onClick={runAdvancedInsights}
                                    disabled={aiAdvancedLoading}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-light)',
                                        background: '#f8fafc',
                                        cursor: aiAdvancedLoading ? 'not-allowed' : 'pointer',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    {aiAdvancedLoading ? 'Generando...' : 'Insights avanzados'}
                                </button>
                            )}
                            {aiObsMessage && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                    {aiObsMessage}
                                </span>
                            )}
                            {aiAdvancedMessage && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                    {aiAdvancedMessage}
                                </span>
                            )}
                        </div>
                    </div>
                    {loading && <div className="loading-text">Cargando observaciones...</div>}
                    {!loading && entriesByTab.observaciones.length === 0 && (
                        <div className="loading-text">Sin observaciones reales aún.</div>
                    )}
                    {entriesByTab.observaciones.map((obs) => (
                        <div key={obs.id} className="spending-card" style={{ marginTop: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: '700' }}>{obs.title || obs.text}</div>
                                {obs.status === 'archived' && (
                                    <span style={{
                                        background: '#E5E7EB',
                                        color: '#374151',
                                        padding: '2px 8px',
                                        borderRadius: '999px',
                                        fontSize: '0.7rem',
                                        fontWeight: '700'
                                    }}>
                                        Archivado
                                    </span>
                                )}
                                {obs.impact && (
                                    <span style={{
                                        ...impactStyle(obs.impact),
                                        padding: '2px 8px',
                                        borderRadius: '999px',
                                        fontSize: '0.7rem',
                                        fontWeight: '700'
                                    }}>
                                        {impactLabel(obs.impact)}
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: '6px' }}>
                                {obs.summary || obs.text}
                            </div>
                            {expandedId === obs.id && (
                                <div style={{ fontSize: '0.85rem', marginTop: '6px' }}>{obs.detail || obs.text}</div>
                            )}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => toggleExpand(obs.id)}
                                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#f8fafc' }}
                                >
                                    {expandedId === obs.id ? 'Ocultar detalle' : 'Ver detalle'}
                                </button>
                                <button
                                    onClick={() => viewDetail(toCardEntry(obs), 'observaciones')}
                                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#ffffff' }}
                                >
                                    Abrir tarjeta
                                </button>
                                <button
                                    onClick={() => archiveEntry(obs)}
                                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#ffffff' }}
                                >
                                    Archivar
                                </button>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {activeTab === 'patrones' && (
                <>
                    <div className="spending-card" style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                            Los patrones los genera la IA automáticamente.
                        </div>
                        {ENABLE_ADVANCED_INSIGHTS && entriesByTab.patrones.length === 0 && (
                            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    onClick={runAutoPatterns}
                                    disabled={aiPatternLoading}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-light)',
                                        background: '#ffffff',
                                        cursor: aiPatternLoading ? 'not-allowed' : 'pointer',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    {aiPatternLoading ? 'Generando...' : 'Generar patrones IA'}
                                </button>
                                {aiPatternMessage && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                        {aiPatternMessage}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    {loading && <div className="loading-text">Cargando patrones...</div>}
                    {!loading && entriesByTab.patrones.length === 0 && (
                        <div className="loading-text">Sin patrones reales aún.</div>
                    )}
                    {entriesByTab.patrones.map((pat) => (
                        <div key={pat.id} className="spending-card" style={{ marginTop: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: '700' }}>{pat.title || pat.text}</div>
                                {pat.status === 'archived' && (
                                    <span style={{
                                        background: '#E5E7EB',
                                        color: '#374151',
                                        padding: '2px 8px',
                                        borderRadius: '999px',
                                        fontSize: '0.7rem',
                                        fontWeight: '700'
                                    }}>
                                        Archivado
                                    </span>
                                )}
                                {pat.impact && (
                                    <span style={{
                                        ...impactStyle(pat.impact),
                                        padding: '2px 8px',
                                        borderRadius: '999px',
                                        fontSize: '0.7rem',
                                        fontWeight: '700'
                                    }}>
                                        {impactLabel(pat.impact)}
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: '6px' }}>
                                {pat.summary || pat.text}
                            </div>
                            {expandedId === pat.id && (
                                <div style={{ fontSize: '0.85rem', marginTop: '6px' }}>{pat.detail || pat.text}</div>
                            )}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                <button
                                    onClick={() => toggleExpand(pat.id)}
                                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#f8fafc' }}
                                >
                                    {expandedId === pat.id ? 'Ocultar detalle' : 'Ver detalle'}
                                </button>
                                <button
                                    onClick={() => viewDetail(toCardEntry(pat), 'patrones')}
                                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#ffffff' }}
                                >
                                    Abrir tarjeta
                                </button>
                            </div>
                        </div>
                    ))}
                </>
            )}

                        {activeTab === 'consultas' && (
                <>
                    <div className="spending-card" style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '10px' }}>
                            NUEVA CONSULTA
                        </div>
                        <textarea
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            placeholder="Que quieres analizar hoy?"
                            rows={3}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '8px', resize: 'vertical' }}
                        />
                        <button
                            onClick={handleAsk}
                            disabled={saving && savingId === 'new-question'}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: 'var(--status-green-main)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: saving && savingId === 'new-question' ? 'not-allowed' : 'pointer',
                                opacity: saving && savingId === 'new-question' ? 0.8 : 1
                            }}
                        >
                            {saving && savingId === 'new-question' ? 'Analizando...' : 'Analizar con IA'}
                        </button>
                    </div>

                    <div className="spending-card" style={{ marginTop: '10px' }}>
                        <div style={{ fontWeight: '700', marginBottom: '8px' }}>Consultas recientes</div>
                        {entriesByTab.consultas.length === 0 ? (
                            <div className="loading-text">Sin consultas aun.</div>
                        ) : (
                            entriesByTab.consultas.map((q) => {
                                const answerText = q.answer || 'Respuesta IA pendiente.';
                                const isExpanded = expandedId === q.id;
                                const answerPreview = !isExpanded && answerText.length > ANSWER_PREVIEW_LIMIT
                                    ? `${answerText.slice(0, ANSWER_PREVIEW_LIMIT)}...`
                                    : answerText;
                                return (
                                    <div key={q.id} style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border-light)', marginBottom: '8px' }}>
                                        <div style={{ fontWeight: '700' }}>{q.text || 'Consulta'}</div>
                                        {q.status === 'archived' && (
                                            <div style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: '700' }}>
                                                ARCHIVADO
                                            </div>
                                        )}
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: '6px' }}>
                                            {answerPreview}
                                        </div>
                                        {isExpanded && (
                                            <div style={{ fontSize: '0.8rem', marginTop: '6px', color: 'var(--color-text-dim)' }}>
                                                Contexto: {q.meta?.context || 'mes actual, flujo y eventos.'}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={() => toggleExpand(q.id)}
                                                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#f8fafc' }}
                                            >
                                                {isExpanded ? 'Ver menos' : 'Ver más'}
                                            </button>
                                            <button
                                                onClick={() => viewDetail(toCardEntry(q), 'consultas')}
                                                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#ffffff' }}
                                            >
                                                Abrir tarjeta
                                            </button>
                                            <button
                                                onClick={() => openConvert(q)}
                                                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#ffffff' }}
                                            >
                                                Convertir en Idea
                                            </button>
                                        </div>
                                        {convertTarget?.id === q.id && (
                                            <div className="spending-card" style={{ marginTop: '10px' }}>
                                                <div style={{ fontWeight: '700', marginBottom: '8px' }}>Convertir en Idea</div>
                                                <input
                                                    value={ideaForm.title}
                                                    onChange={(e) => setIdeaForm((prev) => ({ ...prev, title: e.target.value }))}
                                                    placeholder="Nombre de la idea"
                                                    style={{ width: '100%', marginBottom: '8px', boxSizing: 'border-box' }}
                                                />
                                                <select
                                                    value={ideaForm.category}
                                                    onChange={(e) => setIdeaForm((prev) => ({ ...prev, category: e.target.value }))}
                                                    style={{ width: '100%', marginBottom: '8px', boxSizing: 'border-box' }}
                                                >
                                                    <option value="compra">Compra</option>
                                                    <option value="viaje">Viaje</option>
                                                    <option value="inversion">Inversion</option>
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
                                                        style={{ width: '100%', marginBottom: '8px', boxSizing: 'border-box' }}
                                                    >
                                                        <option value="">Etiqueta emocional (opcional)</option>
                                                        <option value="cansado">Cansado</option>
                                                        <option value="apurado">Apurado</option>
                                                        <option value="celebracion">Celebracion</option>
                                                    </select>
                                                )}
                                                {ENABLE_TCO && (
                                                    <input
                                                        value={ideaForm.tco}
                                                        onChange={(e) => setIdeaForm((prev) => ({ ...prev, tco: e.target.value }))}
                                                        placeholder="TCO estimado (opcional)"
                                                        inputMode="decimal"
                                                        style={{ width: '100%', marginBottom: '8px', boxSizing: 'border-box' }}
                                                    />
                                                )}
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => setConvertTarget(null)}
                                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#f8fafc' }}
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={handleConvert}
                                                        disabled={saving && savingId === convertTarget?.id}
                                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#ffffff' }}
                                                    >
                                                        {saving && savingId === convertTarget?.id ? 'Guardando...' : 'Guardar idea'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}

            {activeTab === 'ideas' && (
                <>
                    <div className="spending-card" style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                            Las ideas nacen desde una consulta.
                        </div>
                    </div>
                    {entriesByTab.ideas.length === 0 ? (
                        <div className="loading-text" style={{ marginTop: '10px' }}>Sin ideas aun.</div>
                    ) : (
                        entriesByTab.ideas.map((entry) => {
                            const simulationText = entry.meta?.simulation_text || simulations[entry.id]?.text || '';
                            const simulationAdvancedText = entry.meta?.simulation_text_adv || advancedSimulations[entry.id]?.text || '';
                            const hasSimulation = Boolean(simulationText);
                            const hasAdvancedSimulation = Boolean(simulationAdvancedText);
                            const isSimulationExpanded = expandedSimulationId === entry.id;
                            const isAdvancedExpanded = expandedAdvancedId === entry.id;
                            const simulationPreview = !isSimulationExpanded && simulationText.length > SIM_PREVIEW_LIMIT
                                ? `${simulationText.slice(0, SIM_PREVIEW_LIMIT)}...`
                                : simulationText;
                            const simulationAdvancedPreview = !isAdvancedExpanded && simulationAdvancedText.length > SIM_PREVIEW_LIMIT
                                ? `${simulationAdvancedText.slice(0, SIM_PREVIEW_LIMIT)}...`
                                : simulationAdvancedText;
                            return (
                            <div key={entry.id} className="spending-card" style={{ marginTop: '10px' }}>
                                <div style={{ fontWeight: '700' }}>{entry.title || entry.text || 'Idea'}</div>
                                {entry.status === 'archived' && (
                                    <div style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: '700' }}>
                                        ARCHIVADO
                                    </div>
                                )}
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                    Tipo: {entry.meta?.category || 'sin definir'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                    Costo: {entry.meta?.estimated_cost ? `$${Number(entry.meta.estimated_cost).toLocaleString('es-CL')}` : 'sin definir'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                    Horizonte: {entry.meta?.horizon_months ? `${entry.meta.horizon_months} meses` : 'sin definir'}
                                </div>
                                {ENABLE_EMOTION && entry.meta?.emotion_tag && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                        Emocion: {entry.meta.emotion_tag}
                                    </div>
                                )}
                                {ENABLE_TCO && entry.meta?.tco_total && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                        TCO: ${Number(entry.meta.tco_total).toLocaleString('es-CL')}
                                    </div>
                                )}
                                {renderMonthlyTarget(entry)}
                                {ENABLE_SIMULATION && (
                                    <div style={{ marginTop: '6px' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontWeight: '700' }}>Simulacion IA</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                                            {hasSimulation ? simulationPreview : 'Disponible bajo demanda'}
                                        </div>
                                        {hasSimulation && simulationText.length > SIM_PREVIEW_LIMIT && (
                                            <button
                                                onClick={() => setExpandedSimulationId(isSimulationExpanded ? null : entry.id)}
                                                style={{ marginTop: '6px', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#f8fafc', fontSize: '0.75rem' }}
                                            >
                                                {isSimulationExpanded ? 'Ver menos' : 'Ver más'}
                                            </button>
                                        )}
                                    </div>
                                )}
                                {ENABLE_SIMULATION && (
                                    <div style={{ marginTop: '8px' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontWeight: '700' }}>Simulacion avanzada</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                                            {hasAdvancedSimulation ? simulationAdvancedPreview : 'Disponible bajo demanda'}
                                        </div>
                                        {hasAdvancedSimulation && simulationAdvancedText.length > SIM_PREVIEW_LIMIT && (
                                            <button
                                                onClick={() => setExpandedAdvancedId(isAdvancedExpanded ? null : entry.id)}
                                                style={{ marginTop: '6px', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#f8fafc', fontSize: '0.75rem' }}
                                            >
                                                {isAdvancedExpanded ? 'Ver menos' : 'Ver mÃ¡s'}
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => viewDetail(toCardEntry(entry), 'ideas')}
                                        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#ffffff' }}
                                    >
                                        Abrir tarjeta
                                    </button>
                                    {ENABLE_SIMULATION && (
                                        <button
                                            onClick={() => handleSimulateIdea(entry)}
                                            disabled={simulations[entry.id]?.loading}
                                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#ffffff' }}
                                        >
                                            {simulations[entry.id]?.loading ? 'Simulando...' : 'Simular IA'}
                                        </button>
                                    )}
                                    {ENABLE_SIMULATION && (
                                        <button
                                            onClick={() => handleSimulateIdeaAdvanced(entry)}
                                            disabled={advancedSimulations[entry.id]?.loading}
                                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#ffffff' }}
                                        >
                                            {advancedSimulations[entry.id]?.loading ? 'Simulando...' : 'Simular avanzado'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => openProjectConfirm(entry)}
                                        disabled={saving && savingId === entry.id}
                                        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#f8fafc' }}
                                    >
                                        {saving && savingId === entry.id ? 'Guardando...' : 'Aceptar como Proyecto'}
                                    </button>
                                    <button
                                        onClick={() => archiveEntry(entry)}
                                        disabled={saving && savingId === entry.id}
                                        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#ffffff' }}
                                    >
                                        {saving && savingId === entry.id ? 'Guardando...' : 'Archivar'}
                                    </button>
                                </div>
                                {renderProjectConfirm(entry)}
                            </div>
                            );
                        })
                    )}
                </>
            )}
{activeTab === 'proyectos' && (
                <div className="spending-card" style={{ marginTop: '10px' }}>
                    <div style={{ fontWeight: '700', marginBottom: '6px' }}>Proyectos activos</div>
                    {entriesByTab.proyectos.length > 0 ? (
                        <div style={{ display: 'grid', gap: '8px' }}>
                            {entriesByTab.proyectos.map((entry) => (
                                <div key={entry.id} style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                                    <div style={{ fontWeight: '700' }}>{entry.title || entry.text || 'Proyecto'}</div>
                                    {entry.status === 'archived' && (
                                        <div style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: '700' }}>
                                            ARCHIVADO
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>{entry.created_at || ''}</div>
                                    {renderMonthlyTarget(entry)}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                        <button
                                            onClick={() => viewDetail(toCardEntry(entry), 'proyectos')}
                                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#ffffff' }}
                                        >
                                            Ver detalle
                                        </button>
                                        <button
                                            onClick={() => archiveEntry(entry)}
                                            disabled={saving && savingId === entry.id}
                                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#f8fafc' }}
                                        >
                                            {saving && savingId === entry.id ? 'Guardando...' : 'Archivar'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                            Aún no hay proyectos activos.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Bitacora;















