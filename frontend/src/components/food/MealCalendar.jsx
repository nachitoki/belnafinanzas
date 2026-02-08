import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecipes, getMeals, saveMeals } from '../../services/api';

const MealCalendar = () => {
    const navigate = useNavigate();
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);

    // View State
    const [viewMode, setViewMode] = useState('week'); // 'week' | 'month'
    const [currentDate, setCurrentDate] = useState(new Date()); // Pivot date

    // Data State
    const [calendarData, setCalendarData] = useState({}); // { "YYYY-MM-DD_type": recipeName }
    const [saving, setSaving] = useState(false);

    // Selection state
    const [activeRecipe, setActiveRecipe] = useState('');
    const [showPicker, setShowPicker] = useState(false);

    // Month View Interaction
    const [selectedDay, setSelectedDay] = useState(null); // { date: 'YYYY-MM-DD', type: 'lunch' }

    // Load Recipes Once
    useEffect(() => {
        getRecipes(1000).then(data => {
            setRecipes(data || []);
            setLoading(false);
        }).catch(err => {
            console.error('Failed to load recipes', err);
            setLoading(false);
        });
    }, []);

    // Load Meals when view or date changes
    useEffect(() => {
        const fetchMeals = async () => {
            // Calculate range based on viewMode
            let start, end;
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();

            if (viewMode === 'week') {
                // Start of week (Monday) from currentDate
                const day = currentDate.getDay();
                const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(currentDate.setDate(diff));
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);

                start = monday.toISOString().split('T')[0];
                end = sunday.toISOString().split('T')[0];
            } else {
                // Month View: 1st of month to last of month
                start = new Date(year, month, 1).toISOString().split('T')[0];
                end = new Date(year, month + 1, 0).toISOString().split('T')[0];
            }

            try {
                const data = await getMeals(start, end);
                // Transform to map: key = date_type, val = recipe_name
                const map = {};
                if (Array.isArray(data)) {
                    data.forEach(m => {
                        map[`${m.date}_${m.type}`] = m.recipe_name;
                    });
                }
                setCalendarData(prev => ({ ...prev, ...map }));
            } catch (e) {
                console.error("Error fetching meals", e);
            }
        };

        fetchMeals();
    }, [currentDate, viewMode]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = Object.entries(calendarData).map(([key, name]) => {
                const [date, type] = key.split('_');
                const r = recipes.find(rec => rec.name === name);
                return {
                    date,
                    type,
                    recipe_name: name,
                    recipe_id: null,
                    recipe_cost: r ? (r.cost || 0) : 0
                };
            });

            await saveMeals(payload);
            setSaving(false);
        } catch (e) {
            console.error(e);
            alert('Error al guardar');
            setSaving(false);
        }
    };

    // Helpers
    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const getWeekRange = () => {
        const d = new Date(currentDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(d.setDate(diff));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        const days = [];
        for (let i = 0; i < 7; i++) {
            const dt = new Date(start);
            dt.setDate(start.getDate() + i);
            days.push(formatDate(dt));
        }
        return { start: formatDate(start), end: formatDate(end), days };
    };

    const getMonthDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        let startDay = firstDay.getDay();
        if (startDay === 0) startDay = 7;

        const days = [];
        for (let i = 1; i < startDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const dt = new Date(year, month, i);
            days.push(formatDate(dt));
        }
        return days;
    };

    const assignRecipe = (date, type, recipeName) => {
        const key = `${date}_${type}`;
        setCalendarData(prev => ({
            ...prev,
            [key]: recipeName
        }));
    };

    const renderHeader = () => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                    onClick={() => navigate('/')}
                    style={{ background: 'transparent', fontSize: '1.2rem', padding: '0', border: 'none', cursor: 'pointer' }}
                >
                    {'\u2190'}
                </button>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Calendario</h2>
                    <div className="page-subtitle">Planificador de comidas</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={() => setViewMode('week')}
                    style={{
                        padding: '6px 12px', borderRadius: '20px', border: 'none',
                        background: viewMode === 'week' ? 'var(--status-green-main)' : '#f0f0f0',
                        color: viewMode === 'week' ? 'white' : '#666', fontWeight: '600', fontSize: '0.85rem'
                    }}
                >
                    Semana
                </button>
                <button
                    onClick={() => setViewMode('month')}
                    style={{
                        padding: '6px 12px', borderRadius: '20px', border: 'none',
                        background: viewMode === 'month' ? 'var(--status-green-main)' : '#f0f0f0',
                        color: viewMode === 'month' ? 'white' : '#666', fontWeight: '600', fontSize: '0.85rem'
                    }}
                >
                    Mes
                </button>
            </div>
        </div>
    );

    const renderNav = () => {
        const move = (dir) => {
            const d = new Date(currentDate);
            if (viewMode === 'week') d.setDate(d.getDate() + (dir * 7));
            else d.setMonth(d.getMonth() + dir);
            setCurrentDate(d);
        };

        let label = '';
        if (viewMode === 'week') {
            const { start, end } = getWeekRange();
            const s = start.split('-');
            const e = end.split('-');
            label = `${s[2]}/${s[1]} - ${e[2]}/${e[1]}`;
        } else {
            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            label = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        }

        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', background: 'var(--bg-card)', padding: '10px', borderRadius: '8px' }}>
                <button onClick={() => move(-1)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>{'<'}</button>
                <div style={{ fontWeight: '700' }}>{label}</div>
                <button onClick={() => move(1)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>{'>'}</button>
            </div>
        );
    };

    const renderWeekView = () => {
        const { days } = getWeekRange();
        const type = 'lunch';

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {days.map(date => {
                    const key = `${date}_${type}`;
                    const mealName = calendarData[key];
                    const recipe = recipes.find(r => r.name === mealName);
                    const dayName = new Date(date).toLocaleDateString('es-CL', { weekday: 'long' });
                    const dateNum = date.split('-')[2];
                    const isSelected = selectedDay && selectedDay.date === date;

                    return (
                        <div
                            key={date}
                            onClick={() => {
                                setSelectedDay({ date, type });
                                setShowPicker(true);
                            }}
                            className="spending-card"
                            style={{
                                padding: '12px', minHeight: '80px', cursor: 'pointer',
                                border: isSelected ? '2px solid var(--status-blue-main)' : '1px solid transparent',
                                background: mealName ? '#f0fff4' : 'white'
                            }}
                        >
                            <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'capitalize', color: 'var(--color-text-dim)', marginBottom: '4px' }}>
                                {dayName} {dateNum}
                            </div>
                            {mealName ? (
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '0.9rem', lineHeight: '1.2', color: 'var(--status-green-dark)' }}>{mealName}</div>
                                    {recipe && recipe.cost && (
                                        <div style={{ fontSize: '0.75rem', marginTop: '4px', color: '#666' }}>
                                            ${parseInt(recipe.cost).toLocaleString('es-CL')}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ color: '#ccc', fontSize: '0.85rem', fontStyle: 'italic' }}>Tocá para asignar</div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderMonthView = () => {
        const days = getMonthDays();
        const weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
        const type = 'lunch';

        return (
            <div style={{ background: 'white', borderRadius: '12px', padding: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                    {weekDays.map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: '700', color: '#888' }}>{d}</div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {days.map((date, idx) => {
                        if (!date) return <div key={`empty-${idx}`} />;

                        const key = `${date}_${type}`;
                        const mealName = calendarData[key];
                        const dayNum = parseInt(date.split('-')[2]);

                        return (
                            <div
                                key={date}
                                onClick={() => {
                                    setSelectedDay({ date, type });
                                    setShowPicker(true);
                                }}
                                style={{
                                    aspectRatio: '1',
                                    borderRadius: '6px',
                                    border: '1px solid #eee',
                                    padding: '4px',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                                    cursor: 'pointer',
                                    background: mealName ? '#dcfce7' : 'transparent',
                                    position: 'relative'
                                }}
                            >
                                <span style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '2px' }}>{dayNum}</span>
                                {mealName && (
                                    <div style={{
                                        width: '6px', height: '6px', borderRadius: '50%',
                                        background: 'var(--status-green-main)',
                                        marginTop: 'auto', marginBottom: '4px'
                                    }} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderPicker = () => {
        if (!showPicker || !selectedDay) return null;

        const key = `${selectedDay.date}_${selectedDay.type}`;
        const currentMeal = calendarData[key];
        const currentRecipe = recipes.find(r => r.name === currentMeal);

        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'end', justifyContent: 'center'
            }}>
                <div style={{
                    background: 'white', width: '100%', maxWidth: '480px',
                    borderRadius: '20px 20px 0 0', padding: '20px',
                    maxHeight: '80vh', display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>
                                {new Date(selectedDay.date).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                            <div className="page-subtitle">Planificar Almuerzo</div>
                        </div>
                        <button onClick={() => setShowPicker(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                    </div>

                    {currentMeal && (
                        <div style={{ marginBottom: '20px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                            <div style={{ fontWeight: '700', color: '#166534' }}>{currentMeal}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.9rem', color: '#15803d' }}>
                                <span>Costo estimado:</span>
                                <span>${currentRecipe ? parseInt(currentRecipe.cost).toLocaleString('es-CL') : '0'}</span>
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                                <span style={{ fontWeight: '600' }}>Ingredientes:</span> {currentRecipe?.ingredients?.join(', ') || 'N/A'}
                            </div>
                            <button
                                onClick={() => {
                                    assignRecipe(selectedDay.date, selectedDay.type, null);
                                    setShowPicker(false);
                                }}
                                style={{ marginTop: '10px', width: '100%', padding: '6px', background: '#fff', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                Quitar plato
                            </button>
                        </div>
                    )}

                    <div style={{ fontWeight: '600', marginBottom: '8px' }}>Seleccionar Receta</div>
                    <input
                        placeholder="Buscar plato..."
                        onChange={(e) => setActiveRecipe(e.target.value)}
                        value={activeRecipe}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '10px' }}
                        autoFocus
                    />

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {recipes.filter(r => r.name.toLowerCase().includes(activeRecipe.toLowerCase())).slice(0, 50).map(r => (
                            <div
                                key={r.name}
                                onClick={() => {
                                    assignRecipe(selectedDay.date, selectedDay.type, r.name);
                                    setShowPicker(false);
                                    setActiveRecipe('');
                                }}
                                style={{
                                    padding: '10px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}
                            >
                                <span>{r.name}</span>
                                <span style={{ fontSize: '0.85rem', color: '#888' }}>${parseInt(r.cost).toLocaleString('es-CL')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', minHeight: '100vh', paddingBottom: '100px' }}>
            {renderHeader()}
            {renderNav()}

            {loading ? <div className="loading-text">Cargando platos...</div> : (
                <>
                    {viewMode === 'week' ? renderWeekView() : renderMonthView()}
                </>
            )}

            <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '440px', zIndex: 900 }}>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                        background: 'var(--status-blue-main)', color: 'white',
                        fontWeight: '700', fontSize: '1rem',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        opacity: saving ? 0.8 : 1, cursor: saving ? 'wait' : 'pointer'
                    }}
                >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
            {renderPicker()}
        </div>
    );
};

export default MealCalendar;
