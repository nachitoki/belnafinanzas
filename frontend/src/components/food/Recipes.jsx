import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts, getRecipes } from '../../services/api';
import PillTabs from '../layout/PillTabs';

const Recipes = () => {
    const navigate = useNavigate();
    const [recipes, setRecipes] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [view, setView] = useState('list');
    const [newName, setNewName] = useState('');
    const [newIngredients, setNewIngredients] = useState([
        { name: '', qty: '', unit: 'g', masterPrice: '', masterUnit: 'kg', isExisting: false }
    ]);
    const [newNote, setNewNote] = useState('');
    const [editingRecipe, setEditingRecipe] = useState(null);
    const [editName, setEditName] = useState('');
    const [editIngredients, setEditIngredients] = useState([]);
    const lastIngredientRef = useRef(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [recipeData, productData] = await Promise.all([
                    getRecipes(),
                    getProducts()
                ]);
                const overridesRaw = window.localStorage.getItem('recipes_override');
                const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
                const merged = (recipeData || []).map((r) => {
                    const key = r.id || r.name;
                    const override = overrides[key] || overrides[r.name] || overrides[normalizeKey(r.name)];
                    return override ? { ...r, ...override } : r;
                });
                setRecipes(merged);
                setProducts(productData || []);
            } catch (e) {
                console.error('Error loading recipes', e);
                setRecipes([]);
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (lastIngredientRef.current) {
            lastIngredientRef.current.focus();
        }
    }, [newIngredients.length]);

    const filtered = recipes.filter(r => r.name.toLowerCase().includes(query.toLowerCase()));

    const parseNumber = (value) => {
        if (value === null || value === undefined) return 0;
        const normalized = String(value).replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(normalized);
        if (Number.isNaN(parsed)) return 0;
        return Math.round(parsed);
    };

    const normalizeKey = (value) =>
        (value || '')
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    const parseIngredientLine = (raw) => {
        const text = (raw || '').toString().trim();
        if (!text) return { name: '', qty: '', unit: '' };
        const directMatch = text.match(/^\s*(\d+(?:[.,]\d+)?)\s*(kg|g|gr|grs|gramo|gramos|ml|lt|l|lts|litro|litros|unidad|un|ud|u|pack|paq)?\s*(.*)$/i);
        if (directMatch) {
            const qtyValue = directMatch[1] ? String(directMatch[1]).replace(',', '.') : '';
            let unitValue = (directMatch[2] || '').toLowerCase();
            if (unitValue === 'l' || unitValue === 'lts' || unitValue === 'litro' || unitValue === 'litros') unitValue = 'lt';
            if (unitValue === 'gr' || unitValue === 'grs' || unitValue === 'gramo' || unitValue === 'gramos') unitValue = 'g';
            if (unitValue === 'un' || unitValue === 'ud' || unitValue === 'u') unitValue = 'unidad';
            const nameValue = (directMatch[3] || '').trim() || text;
            return { name: nameValue, qty: qtyValue, unit: unitValue || '' };
        }
        const anywhereMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr|grs|gramo|gramos|ml|lt|l|lts|litro|litros|unidad|un|ud|u|pack|paq)/i);
        if (!anywhereMatch) return { name: text, qty: '', unit: '' };
        const qtyValue = anywhereMatch[1] ? String(anywhereMatch[1]).replace(',', '.') : '';
        let unitValue = (anywhereMatch[2] || '').toLowerCase();
        if (unitValue === 'l' || unitValue === 'lts' || unitValue === 'litro' || unitValue === 'litros') unitValue = 'lt';
        if (unitValue === 'gr' || unitValue === 'grs' || unitValue === 'gramo' || unitValue === 'gramos') unitValue = 'g';
        if (unitValue === 'un' || unitValue === 'ud' || unitValue === 'u') unitValue = 'unidad';
        const nameValue = text.replace(anywhereMatch[0], '').trim() || text;
        return { name: nameValue, qty: qtyValue, unit: unitValue || '' };
    };

    const addIngredientRow = () => {
        setNewIngredients((prev) => [
            ...prev,
            { name: '', qty: '', unit: 'g', masterPrice: '', masterUnit: 'kg', isExisting: false }
        ]);
    };

    const updateIngredient = (index, field, value) => {
        setNewIngredients((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const removeIngredient = (index) => {
        setNewIngredients((prev) => prev.filter((_, i) => i !== index));
    };

    const toGrams = (qty, unit) => {
        const q = parseNumber(qty);
        if (unit === 'kg') return q * 1000;
        return q;
    };

    const toMl = (qty, unit) => {
        const q = parseNumber(qty);
        if (unit === 'lt') return q * 1000;
        return q;
    };

    const estimateCost = (ing) => {
        const masterPrice = parseNumber(ing.masterPrice);
        if (!masterPrice) return 0;
        if (ing.masterUnit === 'unidad') return masterPrice * parseNumber(ing.qty || 0);
        if (ing.masterUnit === 'kg') {
            const grams = toGrams(ing.qty || 0, ing.unit || 'g');
            return (masterPrice / 1000) * grams;
        }
        if (ing.masterUnit === 'lt') {
            const ml = toMl(ing.qty || 0, ing.unit || 'ml');
            return (masterPrice / 1000) * ml;
        }
        return masterPrice;
    };

    const calcTotal = () =>
        newIngredients.reduce((sum, ing) => sum + estimateCost(ing), 0);

    const handleCreate = () => {
        if (!newName.trim()) return;
        const payload = {
            name: newName.trim(),
            cost: calcTotal(),
            ingredients: newIngredients
                .map((i) => {
                    const name = i.name.trim();
                    if (!name) return null;
                    const qty = i.qty ? String(i.qty).trim() : '';
                    const unit = i.unit ? String(i.unit).trim() : (qty ? 'g' : '');
                    const prefix = [qty, unit].filter(Boolean).join(' ');
                    return prefix ? `${prefix} ${name}` : name;
                })
                .filter(Boolean),
            note: newNote.trim() || null
        };
        setRecipes((prev) => [payload, ...prev]);
        setNewName('');
        setNewIngredients([{ name: '', qty: '', unit: 'g', masterPrice: '', masterUnit: 'kg', isExisting: false }]);
        setNewNote('');
        setView('list');
    };

    const openEdit = (recipe) => {
        setEditingRecipe(recipe);
        setEditName(recipe.name || '');
        const parsed = (recipe.ingredients || []).map((line) => {
            const base = parseIngredientLine(line);
            if (base.qty && !base.unit) {
                return { ...base, unit: 'g' };
            }
            return base;
        });
        setEditIngredients(parsed.length ? parsed : [{ name: '', qty: '', unit: '' }]);
    };

    const updateEditIngredient = (index, field, value) => {
        setEditIngredients((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const addEditIngredient = () => {
        setEditIngredients((prev) => [...prev, { name: '', qty: '', unit: '' }]);
    };

    const removeEditIngredient = (index) => {
        setEditIngredients((prev) => prev.filter((_, i) => i !== index));
    };

    const saveEdit = () => {
        if (!editingRecipe) return;
        const updated = {
            ...editingRecipe,
            name: editName.trim() || editingRecipe.name,
            ingredients: editIngredients
                .map((i) => {
                    const name = i.name.trim();
                    if (!name) return null;
                    const qty = i.qty ? String(i.qty).trim() : '';
                    const unit = i.unit ? String(i.unit).trim() : (qty ? 'g' : '');
                    const prefix = [qty, unit].filter(Boolean).join(' ');
                    return prefix ? `${prefix} ${name}` : name;
                })
                .filter(Boolean)
        };
        try {
            const overridesRaw = window.localStorage.getItem('recipes_override');
            const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
            const keyId = updated.id || editingRecipe.id || null;
            const keyName = updated.name;
            const keyNorm = normalizeKey(updated.name);
            const payload = { name: updated.name, ingredients: updated.ingredients, cost: updated.cost };
            if (keyId) overrides[keyId] = payload;
            overrides[keyName] = payload;
            overrides[keyNorm] = payload;
            window.localStorage.setItem('recipes_override', JSON.stringify(overrides));
        } catch (e) {
            // ignore localStorage errors
        }
        setRecipes((prev) => prev.map((r) => (r === editingRecipe ? updated : r)));
        setEditingRecipe(null);
        setEditName('');
        setEditIngredients([]);
    };

    const productIndex = useMemo(() => {
        const map = new Map();
        products.forEach((p) => {
            if (!p?.name) return;
            const key = p.name.toLowerCase();
            map.set(key, {
                name: p.name,
                unit: p.manual_unit || 'kg',
                price: p.manual_price || ''
            });
        });
        return map;
    }, [products]);

    const handleIngredientName = (index, value) => {
        const key = String(value || '').trim().toLowerCase();
        const found = productIndex.get(key);
        setNewIngredients((prev) => {
            const next = [...prev];
            next[index] = {
                ...next[index],
                name: value,
                isExisting: !!found,
                masterPrice: found ? String(found.price || '') : next[index].masterPrice,
                masterUnit: found ? found.unit : next[index].masterUnit
            };
            return next;
        });
    };

    return (
        <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', minHeight: 'calc(100vh - var(--topbar-height, 72px) - var(--bottomnav-height, 96px))' }}>
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
                    onClick={() => navigate('/')}
                    style={{ background: 'transparent', fontSize: '1.2rem', padding: '0 10px 0 0', border: 'none' }}
                >
                    {'\u2190'}
                </button>
                <div>
                    <h2>Platos base</h2>
                    <div className="page-subtitle">Platos y costos estimados</div>
                </div>
            </div>

            <div className="spending-card" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setView('list')}
                        style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: '999px',
                            border: '1px solid var(--border-light)',
                            background: view === 'list' ? '#fff' : '#f1f5f9',
                            fontWeight: view === 'list' ? '700' : '600',
                            cursor: 'pointer'
                        }}
                    >
                        Platos
                    </button>
                    <button
                        onClick={() => setView('new')}
                        style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: '999px',
                            border: '1px solid var(--border-light)',
                            background: view === 'new' ? '#fff' : '#f1f5f9',
                            fontWeight: view === 'new' ? '700' : '600',
                            cursor: 'pointer'
                        }}
                    >
                        Nuevo plato
                    </button>
                </div>
            </div>

            {view === 'list' && (
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar plato..."
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '12px' }}
                />
            )}
            <button
                onClick={() => navigate('/inventory')}
                style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-card)',
                    fontWeight: '600',
                    marginBottom: '12px',
                    cursor: 'pointer'
                }}
            >
                Inventario proyectado
            </button>
            <button
                onClick={() => navigate('/meal-calendar')}
                style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-card)',
                    fontWeight: '600',
                    marginBottom: '12px',
                    cursor: 'pointer'
                }}
            >
                Calendario de platos
            </button>

            {view === 'list' && (
                <>
                    {loading ? (
                        <div className="loading-text">Cargando platos...</div>
                    ) : filtered.length === 0 ? (
                        <div className="loading-text">Sin platos aun.</div>
                    ) : (
                        filtered.map((r, idx) => (
                            <div key={`${r.name}-${idx}`} className="spending-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <div style={{ fontWeight: '700' }}>{r.name}</div>
                                    <button
                                        onClick={() => openEdit(r)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                        title="Editar plato"
                                    >
                                        {'\u270F\uFE0F'}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <div style={{ fontWeight: '700', color: 'var(--status-green-main)' }}>
                                        ${Math.round(Number(r.cost || 0)).toLocaleString('es-CL')}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>{r.meal_type || '-'}</div>
                                {r.ingredients?.length > 0 && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: '6px' }}>
                                        {r.ingredients.map((line, i) => {
                                            const parsed = parseIngredientLine(line);
                                            const qtyPart = parsed.qty && parsed.unit ? `${parsed.qty} ${parsed.unit}` : parsed.qty ? parsed.qty : '';
                                            return (
                                                <div key={`${r.name}-ing-${i}`}>
                                                    {parsed.name}{qtyPart ? ` · ${qtyPart}` : ''}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </>
            )}

            {view === 'new' && (
                <div className="spending-card">
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '8px' }}>
                        NUEVO PLATO
                    </div>
                    <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nombre del plato"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '10px' }}
                    />
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>
                        Ingredientes (cantidad + unidad). Si no existe, agrega precio master.
                    </div>
                    {newIngredients.map((ing, idx) => (
                        <div key={`ing-${idx}`} style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            <input
                                value={ing.name}
                                onChange={(e) => handleIngredientName(idx, e.target.value)}
                                placeholder="Buscar ingrediente..."
                                style={{ flex: '1 1 180px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                list="product-options"
                                ref={idx === newIngredients.length - 1 ? lastIngredientRef : null}
                            />
                            {ing.isExisting && (
                                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                    Existe
                                </div>
                            )}
                            <input
                                value={ing.qty}
                                onChange={(e) => updateIngredient(idx, 'qty', e.target.value)}
                                placeholder="Cantidad"
                                inputMode="decimal"
                                style={{ flex: '0 1 90px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                            />
                            <select
                                value={ing.unit}
                                onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                                style={{ flex: '0 1 90px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                            >
                                <option value="g">g</option>
                                <option value="kg">kg</option>
                                <option value="ml">ml</option>
                                <option value="lt">lt</option>
                                <option value="unidad">unidad</option>
                                <option value="pack">pack</option>
                            </select>
                            {!ing.isExisting && (
                                <>
                                    <input
                                        value={ing.masterPrice}
                                        onChange={(e) => updateIngredient(idx, 'masterPrice', e.target.value)}
                                        placeholder="Precio master"
                                        inputMode="decimal"
                                        style={{ flex: '0 1 130px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    />
                                    <select
                                        value={ing.masterUnit}
                                        onChange={(e) => updateIngredient(idx, 'masterUnit', e.target.value)}
                                        style={{ flex: '0 1 90px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    >
                                        <option value="kg">$/kg</option>
                                        <option value="lt">$/lt</option>
                                        <option value="unidad">$/unidad</option>
                                    </select>
                                </>
                            )}
                            {ing.isExisting && (
                                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                    Precio ya guardado
                                </div>
                            )}
                            <button
                                onClick={() => removeIngredient(idx)}
                                style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: '6px', padding: '0 8px' }}
                            >
                                x
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={addIngredientRow}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', background: '#f7fafc', marginBottom: '10px' }}
                    >
                        + Agregar ingrediente
                    </button>
                    {products.length > 0 && (
                        <datalist id="product-options">
                            {products.map((p) => (
                                <option key={p.id || p.name} value={p.name || ''} />
                            ))}
                        </datalist>
                    )}
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Notas (opcional)"
                        rows={2}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '10px' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontWeight: '700' }}>Costo estimado</span>
                        <span style={{ fontWeight: '800', color: 'var(--status-green-main)' }}>
                            ${calcTotal().toLocaleString('es-CL')}
                        </span>
                    </div>
                    <button
                        onClick={handleCreate}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: 'var(--status-green-main)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Guardar plato
                    </button>
                </div>
            )}
            {editingRecipe && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', width: '92%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto', borderRadius: '16px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ fontWeight: '700' }}>Editar plato</div>
                            <button onClick={() => setEditingRecipe(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem' }}>
                                {'\u2715'}
                            </button>
                        </div>
                        <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Nombre del plato"
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '10px' }}
                        />
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>
                            Ingredientes (cantidad + unidad)
                        </div>
                        {editIngredients.map((ing, idx) => (
                            <div key={`edit-ing-${idx}`} style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                <input
                                    value={ing.name}
                                    onChange={(e) => updateEditIngredient(idx, 'name', e.target.value)}
                                    placeholder="Ingrediente"
                                    list="product-options"
                                    style={{ flex: '1 1 180px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                                {productIndex.get(String(ing.name || '').trim().toLowerCase()) && (
                                    <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                        Existe
                                    </div>
                                )}
                                <input
                                    value={ing.qty}
                                    onChange={(e) => updateEditIngredient(idx, 'qty', e.target.value)}
                                    placeholder="Cantidad"
                                    inputMode="decimal"
                                    style={{ flex: '0 1 90px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                                <select
                                    value={ing.unit || 'g'}
                                    onChange={(e) => updateEditIngredient(idx, 'unit', e.target.value)}
                                    style={{ flex: '0 1 90px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                >
                                    <option value="g">g</option>
                                    <option value="kg">kg</option>
                                    <option value="ml">ml</option>
                                    <option value="lt">lt</option>
                                    <option value="unidad">unidad</option>
                                    <option value="pack">pack</option>
                                </select>
                                <button
                                    onClick={() => removeEditIngredient(idx)}
                                    style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: '6px', padding: '0 8px' }}
                                >
                                    x
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={addEditIngredient}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', background: '#f7fafc', marginBottom: '10px' }}
                        >
                            + Agregar ingrediente
                        </button>
                        {products.length > 0 && (
                            <datalist id="product-options">
                                {products.map((p) => (
                                    <option key={p.id || p.name} value={p.name || ''} />
                                ))}
                            </datalist>
                        )}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setEditingRecipe(null)}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f1f5f9' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveEdit}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--status-green-main)', color: 'white', fontWeight: '700' }}
                            >
                                Guardar cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Recipes;











