import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecipes, getMeals, saveMeals, getShoppingList, addShoppingItem, deleteShoppingItem } from '../../services/api';

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

    // Shopping List State
    const [showShoppingModal, setShowShoppingModal] = useState(false);
    const [shoppingItems, setShoppingItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemCost, setNewItemCost] = useState('');

    // Selection state
    const [activeRecipe, setActiveRecipe] = useState('');
    const [showPicker, setShowPicker] = useState(false);

    // Month View Interaction
    const [selectedDay, setSelectedDay] = useState(null); // { date: 'YYYY-MM-DD', type: 'lunch' }

    // Template State
    const [templates, setTemplates] = useState([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateName, setTemplateName] = useState('');

    // Load Recipes Once
    useEffect(() => {
        getRecipes(1000).then(data => {
            setRecipes(data || []);
            setLoading(false);
        }).catch(err => {
            console.error('Failed to load recipes', err);
            setLoading(false);
        });

        const saved = localStorage.getItem('meal_plan_templates');
        if (saved) {
            try { setTemplates(JSON.parse(saved)); } catch (e) { }
        }
    }, []);

    // Load Meals and Shopping List when view or date changes
    useEffect(() => {
        const fetchAll = async () => {
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

                // Fetch Shopping List for current month
                const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
                const extras = await getShoppingList(monthStr);
                setShoppingItems(extras || []);

            } catch (e) {
                console.error("Error fetching data", e);
            }
        };

        fetchAll();
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
                    recipe_name: name || "", // Sanitize null/undefined to empty string
                    recipe_id: null,
                    recipe_cost: r ? Math.round(r.cost || 0) : 0
                };
            });

            await saveMeals(payload);
            setSaving(false);
        } catch (e) {
            console.error(e);
            const detail = e.response?.data?.detail
                ? JSON.stringify(e.response.data.detail)
                : (e.message || 'Error desconocido');
            alert('Error al guardar: ' + detail);
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

    const saveTemplate = () => {
        if (!templateName) return;
        // Get current week's data from memory (calendarData)
        // We find all items within the current week range
        const { start, end, days } = getWeekRange();
        const items = {};
        days.forEach(d => {
            const key = `${d}_lunch`;
            if (calendarData[key]) items[key] = calendarData[key];
        });

        // Store as relative offsets? Or just raw data? 
        // Better: store as array of { dayOffset: 0..6, recipeName }
        const templateItems = days.map((d, idx) => ({
            dayOffset: idx,
            recipeName: calendarData[`${d}_lunch`] || null
        })).filter(x => x.recipeName);

        const newTmpl = { name: templateName, items: templateItems };
        const newTemplates = [...templates, newTmpl];
        setTemplates(newTemplates);
        localStorage.setItem('meal_plan_templates', JSON.stringify(newTemplates));
        setTemplateName('');
        setShowTemplateModal(false);
        alert('Plantilla guardada');
    };

    const loadTemplate = (tmpl) => {
        if (!confirm(`¿Cargar plantilla "${tmpl.name}"? Reemplazará la semana actual.`)) return;
        const { start, days } = getWeekRange();
        const map = { ...calendarData }; // copy existing

        // Clear current week first? Or overwrite? Overwrite is safer.
        days.forEach(d => delete map[`${d}_lunch`]); // clear

        tmpl.items.forEach(item => {
            const date = days[item.dayOffset];
            if (date) {
                map[`${date}_lunch`] = item.recipeName;
            }
        });
        setCalendarData(map);
        setShowTemplateModal(false);
    };

    const copyPreviousWeek = async () => {
        if (!confirm('¿Copiar la semana anterior a esta?')) return;
        // Calculate prev week range
        const d = new Date(currentDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const currentMonday = new Date(d.setDate(diff));

        const prevMonday = new Date(currentMonday);
        prevMonday.setDate(currentMonday.getDate() - 7);
        const prevSunday = new Date(prevMonday);
        prevSunday.setDate(prevMonday.getDate() + 6);

        try {
            const prevData = await getMeals(prevMonday.toISOString().split('T')[0], prevSunday.toISOString().split('T')[0]);
            if (prevData && prevData.length > 0) {
                const map = { ...calendarData };
                // Map prev dates to current dates
                // We rely on order or day index
                // Let's iterate 0..6
                for (let i = 0; i < 7; i++) {
                    const pDay = new Date(prevMonday); pDay.setDate(prevMonday.getDate() + i);
                    const pStr = formatDate(pDay);
                    const cDay = new Date(currentMonday); cDay.setDate(currentMonday.getDate() + i);
                    const cStr = formatDate(cDay);

                    // Find meal for pStr
                    const meal = prevData.find(m => m.date === pStr && m.type === 'lunch');
                    if (meal) {
                        map[`${cStr}_lunch`] = meal.recipe_name;
                    }
                }
                setCalendarData(map);
            } else {
                alert('No hay datos en la semana anterior');
            }
        } catch (e) { console.error(e); }
    };

    const calculateTotal = () => {
        let total = 0;
        let keys = [];
        if (viewMode === 'week') {
            const { days } = getWeekRange();
            keys = days.map(d => `${d}_lunch`);
        } else {
            const days = getMonthDays().filter(d => d);
            keys = days.map(d => `${d}_lunch`);
        }

        keys.forEach(k => {
            const name = calendarData[k];
            if (name) {
                const r = recipes.find(rec => rec.name === name);
                if (r && r.cost) total += parseInt(r.cost);
            }
        });
        return total;
    };

    // --- Shopping List Logic ---
    const handleAddShoppingItem = async () => {
        if (!newItemName) return;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

        try {
            const item = {
                name: newItemName,
                estimated_cost: parseInt(newItemCost || '0'),
                month: monthStr,
                is_checked: false
            };
            const added = await addShoppingItem(item);
            setShoppingItems([...shoppingItems, added]);
            setNewItemName('');
            setNewItemCost('');
        } catch (e) { alert('Error adding item'); }
    };

    const handleDeleteShoppingItem = async (id) => {
        if (!confirm('Eliminar item?')) return;
        try {
            await deleteShoppingItem(id);
            setShoppingItems(shoppingItems.filter(i => i.id !== id));
        } catch (e) { alert('Error deleting'); }
    };

    const calculateShoppingTotal = () => {
        const mealsTotal = getMonthMealsTotal();
        const extrasTotal = shoppingItems.reduce((acc, curr) => acc + (parseInt(curr.estimated_cost) || 0), 0);
        return { mealsTotal, extrasTotal, grandTotal: mealsTotal + extrasTotal };
    };

    const getMonthMealsTotal = () => {
        // We need month items. calendarData has everything loaded SO FAR.
        // We should filter by current month.
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const items = Object.entries(calendarData).filter(([key, val]) => {
            const date = key.split('_')[0];
            const d = new Date(date);
            return d.getFullYear() === year && d.getMonth() === month && val;
        });

        return items.reduce((acc, [key, name]) => {
            const r = recipes.find(rec => rec.name === name);
            return acc + (r ? parseInt(r.cost || 0) : 0);
        }, 0);
    };

    const renderShoppingModal = () => {
        if (!showShoppingModal) return null;
        const { mealsTotal, extrasTotal, grandTotal } = calculateShoppingTotal();

        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 1100,
                background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <div style={{ background: 'white', width: '90%', maxWidth: '450px', borderRadius: '12px', padding: '20px', maxHeight: '85vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0 }}>Compra Grande</h3>
                        <button onClick={() => setShowShoppingModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                    </div>

                    {/* Summary Card */}
                    <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #bbf7d0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#166534' }}>Almuerzos ({new Date(currentDate).toLocaleDateString('es-CL', { month: 'long' })})</span>
                            <span style={{ fontWeight: '600', color: '#166534' }}>${mealsTotal.toLocaleString('es-CL')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#166534' }}>Insumos Extra</span>
                            <span style={{ fontWeight: '600', color: '#166534' }}>${extrasTotal.toLocaleString('es-CL')}</span>
                        </div>
                        <div style={{ height: '1px', background: '#bbf7d0', margin: '8px 0' }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                            <span style={{ fontWeight: '700', color: '#166534' }}>Total Estimado</span>
                            <span style={{ fontWeight: '800', color: '#166534' }}>${grandTotal.toLocaleString('es-CL')}</span>
                        </div>
                    </div>

                    <h4 style={{ marginBottom: '10px' }}>Insumos Extra</h4>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <input
                            placeholder="Ítem (ej: Detergente)"
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                        <input
                            placeholder="$$"
                            type="number"
                            value={newItemCost}
                            onChange={e => setNewItemCost(e.target.value)}
                            style={{ width: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                        <button onClick={handleAddShoppingItem} style={{ padding: '8px', background: 'var(--status-blue-main)', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>+</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {shoppingItems.map(item => (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                                <div>
                                    <div style={{ fontWeight: '600' }}>{item.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>${item.estimated_cost?.toLocaleString('es-CL')}</div>
                                </div>
                                <button onClick={() => handleDeleteShoppingItem(item.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Eliminar</button>
                            </div>
                        ))}
                        {shoppingItems.length === 0 && <div style={{ color: '#ccc', fontStyle: 'italic', textAlign: 'center' }}>No hay insumos extra.</div>}
                    </div>
                </div>
            </div>
        );
    };

    const getWeekNumber = (d) => {
        const firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
        const dayOfWeek = firstDayOfMonth.getDay() || 7; // 1 (Mon) - 7 (Sun)
        return Math.ceil((d.getDate() + dayOfWeek - 1) / 7);
    };

    // --- UI Renders ---

    const renderHeader = () => (
        <div style={{ marginBottom: '16px' }}>
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
                        <div className="page-subtitle">Planificador</div>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: '8px 16px', borderRadius: '20px', border: 'none',
                        background: 'var(--status-blue-main)', color: 'white',
                        fontWeight: '600', fontSize: '0.9rem',
                        opacity: saving ? 0.7 : 1, cursor: saving ? 'wait' : 'pointer'
                    }}
                >
                    {saving ? 'Guardando...' : 'Guardar'}
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                <button
                    onClick={() => setViewMode('week')}
                    style={{
                        padding: '6px 16px', borderRadius: '20px', border: 'none',
                        background: viewMode === 'week' ? 'var(--status-green-main)' : '#f0f0f0',
                        color: viewMode === 'week' ? 'white' : '#666', fontWeight: '600', fontSize: '0.85rem'
                    }}
                >
                    Semana
                </button>
                <button
                    onClick={() => setViewMode('month')}
                    style={{
                        padding: '6px 16px', borderRadius: '20px', border: 'none',
                        background: viewMode === 'month' ? 'var(--status-green-main)' : '#f0f0f0',
                        color: viewMode === 'month' ? 'white' : '#666', fontWeight: '600', fontSize: '0.85rem'
                    }}
                >
                    Mes
                </button>
            </div>

            {/* Total Indicator */}
            <div style={{
                background: 'var(--status-green-transparent)', padding: '10px 16px', borderRadius: '12px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                color: 'var(--status-green-dark)', marginBottom: '10px'
            }}>
                <span style={{ fontWeight: '600' }}>Total {viewMode === 'week' ? 'Semana' : 'Mes'}:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '800' }}>${calculateTotal().toLocaleString('es-CL')}</span>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                <button onClick={() => setShowShoppingModal(true)} style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', padding: '8px 12px', background: '#dcfce7', color: '#166534', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', border: '1px solid #86efac' }}>
                    🛍️ Compra Grande / Extras
                </button>
                {viewMode === 'week' && (
                    <>
                        <button onClick={copyPreviousWeek} style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', padding: '8px 12px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '20px', cursor: 'pointer' }}>
                            Copiar Anterior
                        </button>
                        <button onClick={() => setShowTemplateModal(true)} style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', padding: '8px 12px', background: '#f3e8ff', color: '#7e22ce', border: 'none', borderRadius: '20px', cursor: 'pointer' }}>
                            Plantillas
                        </button>
                    </>
                )}
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
            const weekNum = getWeekNumber(currentDate);
            label = `Semana ${weekNum} (${s[2]}/${s[1]} - ${e[2]}/${e[1]})`;
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
                position: 'fixed', inset: 0, zIndex: 2000,
                background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <div style={{
                    background: 'white', width: '90%', maxWidth: '400px',
                    borderRadius: '12px', padding: '20px',
                    maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>
                                {new Date(selectedDay.date).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric' })}
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

    const renderTemplateModal = () => {
        if (!showTemplateModal) return null;
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 1100,
                background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <div style={{ background: 'white', width: '90%', maxWidth: '400px', borderRadius: '12px', padding: '20px' }}>
                    <h3 style={{ marginTop: 0 }}>Gestión de Plantillas</h3>

                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>Guardar semana actual</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="Nombre (ej: Semana Barata)"
                                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                            />
                            <button onClick={saveTemplate} style={{ padding: '8px 12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                Guardar
                            </button>
                        </div>
                    </div>

                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>Cargar plantilla</div>
                        {templates.length === 0 && <div style={{ color: '#888', fontStyle: 'italic' }}>No hay plantillas guardadas.</div>}
                        {templates.map((t, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid #eee' }}>
                                <span>{t.name}</span>
                                <div>
                                    <button onClick={() => loadTemplate(t)} style={{ padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}>
                                        Cargar
                                    </button>
                                    <button
                                        onClick={() => {
                                            const newT = templates.filter((_, i) => i !== idx);
                                            setTemplates(newT);
                                            localStorage.setItem('meal_plan_templates', JSON.stringify(newT));
                                        }}
                                        style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button onClick={() => setShowTemplateModal(false)} style={{ marginTop: '16px', width: '100%', padding: '10px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                        Cerrar
                    </button>
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

            {renderPicker()}
            {renderTemplateModal()}
            {renderShoppingModal()}
        </div>
    );
};

export default MealCalendar;
