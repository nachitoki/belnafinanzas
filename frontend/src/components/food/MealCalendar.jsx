import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecipes } from '../../services/api';
import PillTabs from '../layout/PillTabs';

const STORAGE_PREFIX = 'meal_calendar_';
const TEMPLATE_KEY = 'meal_calendar_templates';

const buildWeeks = (year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks = [];
    let day = 1;
    let weekIndex = 1;
    while (day <= daysInMonth) {
        const start = day;
        const end = Math.min(day + 6, daysInMonth);
        weeks.push({
            week: weekIndex,
            start,
            end,
            days: Array.from({ length: end - start + 1 }, (_, i) => start + i)
        });
        day = end + 1;
        weekIndex += 1;
    }
    return weeks;
};

const MealCalendar = () => {
    const navigate = useNavigate();
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [viewMode, setViewMode] = useState('week');
    const [activeRecipe, setActiveRecipe] = useState('');
    const [showPicker, setShowPicker] = useState(false);
    const [search, setSearch] = useState('');
    const [showRecipes, setShowRecipes] = useState(true);
    const [savedPulse, setSavedPulse] = useState(false);
    const [monthOffset, setMonthOffset] = useState(0);
    const [templates, setTemplates] = useState(() => {
        try {
            const raw = localStorage.getItem(TEMPLATE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    });
    const [hasImportedMonth, setHasImportedMonth] = useState(false);
    const now = new Date();
    const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const storageKey = `${STORAGE_PREFIX}${year}-${String(month + 1).padStart(2, '0')}`;

    const weeks = useMemo(() => buildWeeks(year, month), [year, month]);
    const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);

    const [calendarData, setCalendarData] = useState(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    });

    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            setCalendarData(raw ? JSON.parse(raw) : {});
            setSelectedWeek(1);
        } catch (e) {
            setCalendarData({});
        }
    }, [storageKey]);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getRecipes();
                setRecipes(data || []);
            } catch (e) {
                console.error('Error loading recipes', e);
                setRecipes([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        try {
            if (monthOffset !== 0) return undefined;
            localStorage.setItem(storageKey, JSON.stringify(calendarData));
            setSavedPulse(true);
            const t = setTimeout(() => setSavedPulse(false), 1200);
            return () => clearTimeout(t);
        } catch (e) {
            // ignore
        }
        return undefined;
    }, [calendarData, storageKey, monthOffset]);

    useEffect(() => {
        try {
            localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
        } catch (e) {
            // ignore
        }
    }, [templates]);

    const currentWeek = weeks.find((w) => w.week === selectedWeek) || weeks[0];

    const recipeCostMap = useMemo(() => {
        const map = new Map();
        recipes.forEach((r) => {
            map.set(r.name, Number(r.cost || 0));
        });
        return map;
    }, [recipes]);
    const filteredRecipes = useMemo(() => {
        if (!search.trim()) return recipes;
        const q = search.trim().toLowerCase();
        return recipes.filter((r) => (r.name || '').toLowerCase().includes(q));
    }, [recipes, search]);

    const weekTotal = useMemo(() => {
        if (!currentWeek) return 0;
        return currentWeek.days.reduce((sum, day) => {
            const recipeName = calendarData[day];
            if (!recipeName) return sum;
            return sum + (recipeCostMap.get(recipeName) || 0);
        }, 0);
    }, [calendarData, currentWeek, recipeCostMap]);

    const monthTotal = useMemo(() => {
        return Object.keys(calendarData).reduce((sum, dayKey) => {
            const recipeName = calendarData[dayKey];
            if (!recipeName) return sum;
            return sum + (recipeCostMap.get(recipeName) || 0);
        }, 0);
    }, [calendarData, recipeCostMap]);

    const fmt = (value) => Math.round(Number(value || 0)).toLocaleString('es-CL');

    const updateDay = (day, value) => {
        if (monthOffset !== 0) return;
        setCalendarData((prev) => ({
            ...prev,
            [day]: value
        }));
    };

    const jumpToDay = (day) => {
        const el = document.getElementById(`meal-day-${day}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleDay = (day, recipeName) => {
        if (monthOffset !== 0) return;
        setCalendarData((prev) => {
            if (prev[day] === recipeName) {
                const next = { ...prev };
                delete next[day];
                return next;
            }
            return {
                ...prev,
                [day]: recipeName
            };
        });
    };

    const openPicker = (recipeName) => {
        setActiveRecipe(recipeName);
        setShowPicker(true);
    };

    const closePicker = () => {
        setShowPicker(false);
    };

    const clearWeek = () => {
        if (!currentWeek) return;
        if (monthOffset !== 0) return;
        const next = { ...calendarData };
        currentWeek.days.forEach((day) => {
            delete next[day];
        });
        setCalendarData(next);
    };

    const saveWeekTemplate = () => {
        if (!currentWeek) return;
        if (monthOffset !== 0) return;
        const days = currentWeek.days.map((day) => calendarData[day] || '');
        if (!days.some(Boolean)) {
            alert('Primero asigna platos a la semana.');
            return;
        }
        const name = prompt('Nombre de la semana (ej: Economica, Vegetariana, Rapida)');
        if (!name) return;
        const template = {
            id: `${Date.now()}`,
            name: name.trim(),
            days,
            created_at: new Date().toISOString()
        };
        setTemplates((prev) => [template, ...prev]);
    };

    const applyTemplateToWeek = (template) => {
        if (!currentWeek || !template) return;
        const next = { ...calendarData };
        currentWeek.days.forEach((day, idx) => {
            const value = template.days?.[idx] || '';
            if (value) next[day] = value;
        });
        setCalendarData(next);
    };

    const deleteTemplate = (templateId) => {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    };

    const latestCalendarKey = useMemo(() => {
        try {
            const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX));
            const sorted = keys.sort().reverse();
            return sorted[0] || null;
        } catch (e) {
            return null;
        }
    }, [storageKey, hasImportedMonth]);

    const importLatestMonth = () => {
        if (!latestCalendarKey || latestCalendarKey === storageKey) return;
        try {
            const raw = localStorage.getItem(latestCalendarKey);
            const data = raw ? JSON.parse(raw) : {};
            if (!data || Object.keys(data).length === 0) return;
            setCalendarData(data);
            setHasImportedMonth(true);
        } catch (e) {
            // ignore
        }
    };

    const copyWeek = (targetWeek) => {
        if (!currentWeek) return;
        if (monthOffset !== 0) return;
        const target = weeks.find((w) => w.week === targetWeek);
        if (!target) return;
        const next = { ...calendarData };
        currentWeek.days.forEach((day, idx) => {
            const targetDay = target.days[idx];
            if (!targetDay) return;
            const value = calendarData[day];
            if (value) next[targetDay] = value;
        });
        setCalendarData(next);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '520px', margin: '0 auto', minHeight: 'calc(100vh - var(--topbar-height, 72px) - var(--bottomnav-height, 96px))' }}>
            <PillTabs
                items={[
                    { label: 'Inventario', path: '/inventory?tab=inventario', icon: '\uD83D\uDCE6' },
                    { label: 'Estrategicos', path: '/products?origin=despensa', icon: '\u2B50' },
                    { label: 'Platos', path: '/recipes', icon: '\uD83C\uDF7D' },
                    { label: 'Calendario', path: '/meal-calendar', icon: '\uD83D\uDCC5' },
                    { label: 'Alertas', path: '/inventory?tab=alertas', icon: '\u26A0' }
                ]}
            />
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <button
                    onClick={() => navigate('/recipes')}
                    style={{ background: 'transparent', fontSize: '1rem', padding: '0 10px 0 0', border: 'none' }}
                >
                    Volver
                </button>
                <div>
                    <h2>Calendario de platos</h2>
                    <div className="page-subtitle">
                        Mes: {viewDate.toLocaleString('es-CL', { month: 'long', year: 'numeric' })}
                    </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <button
                        onClick={() => setMonthOffset((prev) => (prev === 0 ? -1 : 0))}
                        style={{
                            padding: '4px 8px',
                            borderRadius: '999px',
                            border: '1px solid var(--border-light)',
                            background: monthOffset === 0 ? '#ffffff' : '#f8fafc',
                            cursor: 'pointer',
                            fontSize: '0.7rem'
                        }}
                    >
                        {monthOffset === 0 ? 'Ver mes anterior' : 'Volver al mes actual'}
                    </button>
                    <div style={{ fontSize: '0.75rem', color: savedPulse ? 'var(--status-green-main)' : 'var(--color-text-dim)' }}>
                        {monthOffset === 0 ? (savedPulse ? 'Guardado OK' : 'Auto-guardado') : 'Solo lectura'}
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center' }}>Cargando platos...</div>
            ) : (
                <>
                    {Object.keys(calendarData || {}).length === 0 && latestCalendarKey && latestCalendarKey !== storageKey && (
                        <div className="spending-card" style={{ marginBottom: '12px' }}>
                            <div style={{ fontWeight: '700', marginBottom: '6px' }}>¿Cargar mes anterior?</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginBottom: '8px' }}>
                                Detectamos platos guardados en {latestCalendarKey.replace(STORAGE_PREFIX, '')}.
                            </div>
                            <button
                                onClick={importLatestMonth}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-light)',
                                    background: '#f8fafc',
                                    cursor: 'pointer'
                                }}
                            >
                                Usar platos del mes anterior
                            </button>
                        </div>
                    )}
                    <div className="spending-card" style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: '700', marginBottom: '4px' }}>Semana</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '8px' }}>
                            Programa platos por semana y ajusta dia a dia abajo.
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                            <button
                                onClick={() => setViewMode('week')}
                                style={{
                                    flex: 1,
                                    padding: '6px 10px',
                                    borderRadius: '999px',
                                    border: '1px solid var(--border-light)',
                                    background: viewMode === 'week' ? 'var(--status-green-main)' : 'var(--bg-card)',
                                    color: viewMode === 'week' ? 'white' : 'inherit',
                                    cursor: 'pointer'
                                }}
                            >
                                Semana
                            </button>
                            <button
                                onClick={() => setViewMode('month')}
                                style={{
                                    flex: 1,
                                    padding: '6px 10px',
                                    borderRadius: '999px',
                                    border: '1px solid var(--border-light)',
                                    background: viewMode === 'month' ? 'var(--status-green-main)' : 'var(--bg-card)',
                                    color: viewMode === 'month' ? 'white' : 'inherit',
                                    cursor: 'pointer'
                                }}
                            >
                                Mes
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {weeks.map((w) => (
                                <button
                                    key={`week-${w.week}`}
                                    onClick={() => setSelectedWeek(w.week)}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-light)',
                                        background: selectedWeek === w.week ? 'var(--status-green-main)' : 'var(--bg-card)',
                                        color: selectedWeek === w.week ? 'white' : 'inherit',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Semana {w.week}
                                </button>
                            ))}
                        </div>
                        {currentWeek && viewMode === 'week' && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: '6px' }}>
                                Dias {currentWeek.start} al {currentWeek.end}
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.9rem' }}>
                            <span>Valor semana</span>
                            <strong>${fmt(weekTotal)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span>Valor mes (programado)</span>
                            <strong>${fmt(monthTotal)}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                            <button
                                onClick={clearWeek}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-light)',
                                    background: '#f7fafc',
                                    cursor: 'pointer'
                                }}
                            >
                                Limpiar semana
                            </button>
                            <button
                                onClick={saveWeekTemplate}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-light)',
                                    background: '#ffffff',
                                    cursor: 'pointer'
                                }}
                            >
                                Guardar semana
                            </button>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Duplicar a</span>
                                {weeks.filter((w) => w.week !== selectedWeek).map((w) => (
                                    <button
                                        key={`copy-week-${w.week}`}
                                        onClick={() => copyWeek(w.week)}
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: '999px',
                                            border: '1px solid var(--border-light)',
                                            background: '#ffffff',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        Semana {w.week}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {templates.length > 0 && (
                        <div className="spending-card" style={{ marginBottom: '12px' }}>
                            <div style={{ fontWeight: '700', marginBottom: '8px' }}>Biblioteca de semanas</div>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {templates.map((t) => (
                                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>{t.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                                {t.days?.filter(Boolean).length || 0} dias con plato
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                onClick={() => applyTemplateToWeek(t)}
                                                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#f8fafc', cursor: 'pointer', fontSize: '0.75rem' }}
                                            >
                                                Usar
                                            </button>
                                            <button
                                                onClick={() => deleteTemplate(t.id)}
                                                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {templates.length === 0 && (
                        <div className="spending-card" style={{ marginBottom: '12px' }}>
                            <div style={{ fontWeight: '700', marginBottom: '6px' }}>Biblioteca de semanas</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                                Aun no tienes plantillas guardadas.
                            </div>
                        </div>
                    )}

                    <div className="spending-card" style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: '700', marginBottom: '8px' }}>Platos y valor</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                {recipes.length} platos disponibles
                            </div>
                            <button
                                onClick={() => setShowRecipes((prev) => !prev)}
                                style={{
                                    border: '1px solid var(--border-light)',
                                    background: '#f7fafc',
                                    padding: '4px 8px',
                                    borderRadius: '999px',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                }}
                            >
                                {showRecipes ? 'Ocultar' : 'Mostrar'}
                            </button>
                        </div>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar plato..."
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '10px' }}
                        />
                        {showRecipes && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                                {filteredRecipes.map((recipe) => (
                                    <button
                                        key={`recipe-card-${recipe.name}`}
                                        onClick={() => openPicker(recipe.name)}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '10px',
                                            border: activeRecipe === recipe.name ? '2px solid var(--status-green-main)' : '1px solid var(--border-light)',
                                            background: 'var(--bg-card)',
                                            textAlign: 'left',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ height: '70px', borderRadius: '8px', background: '#edf2f7', marginBottom: '6px' }} />
                                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{recipe.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                            ${fmt(recipe.cost || 0)}
                                        </div>
                                    </button>
                                ))}
                                {filteredRecipes.length === 0 && (
                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                                        Sin resultados.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="spending-card" style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: '700', marginBottom: '8px' }}>Platos por dia</div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                            <select
                                onChange={(e) => jumpToDay(e.target.value)}
                                defaultValue=""
                                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                            >
                                <option value="">Ir al dia...</option>
                                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                                    <option key={`jump-${day}`} value={day}>
                                        Dia {day}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={scrollToTop}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-light)',
                                    background: '#f7fafc',
                                    cursor: 'pointer'
                                }}
                            >
                                Subir
                            </button>
                        </div>
                        {viewMode === 'week' && currentWeek?.days.map((day) => (
                            <div key={`day-${day}`} id={`meal-day-${day}`} style={{ marginBottom: '10px' }}>
                                <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Dia {day}</div>
                                <select
                                    value={calendarData[day] || ''}
                                    onChange={(e) => updateDay(day, e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                >
                                    <option value="">Sin plato</option>
                                    {filteredRecipes.map((recipe) => (
                                        <option key={`${day}-${recipe.name}`} value={recipe.name}>
                                            {recipe.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                        {viewMode === 'month' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                                    <div key={`month-day-${day}`} id={`meal-day-${day}`} style={{ border: '1px solid var(--border-light)', borderRadius: '10px', padding: '8px' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>Dia {day}</div>
                                        <select
                                            value={calendarData[day] || ''}
                                            onChange={(e) => updateDay(day, e.target.value)}
                                        style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.85rem' }}
                                        >
                                            <option value="">Sin plato</option>
                                            {filteredRecipes.map((recipe) => (
                                                <option key={`${day}-${recipe.name}`} value={recipe.name}>
                                                    {recipe.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
            {showPicker && currentWeek && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 200
                    }}
                    onClick={closePicker}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '90%',
                            maxWidth: '360px',
                            background: 'white',
                            borderRadius: '12px',
                            padding: '16px',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.15)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontWeight: '700' }}>{activeRecipe}</div>
                            <button
                                onClick={closePicker}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '1.1rem',
                                    cursor: 'pointer'
                                }}
                            >
                                x
                            </button>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '10px' }}>
                            Dias {currentWeek.start} al {currentWeek.end}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                            {currentWeek.days.map((day) => (
                                <button
                                    key={`pick-${day}`}
                                    onClick={() => toggleDay(day, activeRecipe)}
                                    style={{
                                        padding: '8px',
                                        borderRadius: '8px',
                                        border: calendarData[day] === activeRecipe ? '2px solid var(--status-green-main)' : '1px solid var(--border-light)',
                                        background: calendarData[day] === activeRecipe ? '#e6f4ea' : '#f7fafc',
                                        cursor: 'pointer',
                                        fontWeight: '600'
                                    }}
                                >
                                    Dia {day}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={closePicker}
                            style={{
                                marginTop: '12px',
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-light)',
                                background: '#f7fafc',
                                cursor: 'pointer'
                            }}
                        >
                            Listo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MealCalendar;









