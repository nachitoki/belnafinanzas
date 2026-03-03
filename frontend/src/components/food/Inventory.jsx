import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getRecipes, getShoppingList } from '../../services/api';
import PillTabs from '../layout/PillTabs';

const STORAGE_KEY = 'inventory_selected_recipes';

import catConfident from '../../assets/mascots/cat/cat_confident.webp';

const normalizeText = (value) =>
    (value || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const Inventory = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [recipes, setRecipes] = useState([]);
    const [shoppingList, setShoppingList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showMissingOnly, setShowMissingOnly] = useState(false);
    const [showAlertsOnly, setShowAlertsOnly] = useState(false);
    const [selected, setSelected] = useState(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [recipesData, listData] = await Promise.all([getRecipes(), getShoppingList()]);
                setRecipes(recipesData || []);
                setShoppingList(listData || []);
            } catch (e) {
                console.error('Error loading inventory data', e);
                setRecipes([]);
                setShoppingList([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab === 'alertas') {
            setShowMissingOnly(true);
            setShowAlertsOnly(true);
        }
        if (tab === 'inventario') {
            setShowMissingOnly(false);
            setShowAlertsOnly(false);
        }
    }, [location.search]);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
        } catch (e) {
            // ignore
        }
    }, [selected]);

    const loadFromCalendar = () => {
        try {
            const keys = Object.keys(localStorage).filter((k) => k.startsWith('meal_calendar_'));
            if (keys.length === 0) return;
            const latest = keys.sort().reverse()[0];
            const raw = localStorage.getItem(latest);
            const data = raw ? JSON.parse(raw) : {};
            const values = Object.values(data || {}).filter(Boolean);
            const unique = Array.from(new Set(values));
            setSelected(unique);
        } catch (e) {
            // ignore
        }
    };

    const selectedSet = useMemo(() => new Set(selected), [selected]);

    const shoppingNames = useMemo(() => {
        const names = new Set();
        (shoppingList || []).forEach((item) => {
            const normalized = normalizeText(item?.name || '');
            if (normalized) {
                names.add(normalized);
            }
        });
        return names;
    }, [shoppingList]);

    const ingredientSummary = useMemo(() => {
        const map = new Map();
        recipes
            .filter((r) => selectedSet.has(r.name))
            .forEach((r) => {
                (r.ingredients || []).forEach((ingredient) => {
                    const normalized = normalizeText(ingredient);
                    if (!normalized) return;
                    const current = map.get(normalized) || {
                        label: ingredient,
                        count: 0,
                    };
                    current.count += 1;
                    if (ingredient.length > current.label.length) {
                        current.label = ingredient;
                    }
                    map.set(normalized, current);
                });
            });
        return Array.from(map.entries()).map(([key, value]) => ({
            key,
            label: value.label,
            count: value.count,
            inList: shoppingNames.has(key),
        }));
    }, [recipes, selectedSet, shoppingNames]);

    const filteredIngredients = ingredientSummary.filter((item) => {
        if (showMissingOnly && item.inList) return false;
        if (!search) return true;
        return normalizeText(item.label).includes(normalizeText(search));
    });

    const totalIngredients = ingredientSummary.length;
    const totalMissing = ingredientSummary.filter((item) => !item.inList).length;

    const coveragePct = totalIngredients > 0 ? Math.round(((totalIngredients - totalMissing) / totalIngredients) * 100) : 0;

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
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <button
                    onClick={() => navigate('/recipes')}
                    style={{ background: 'transparent', fontSize: '1.2rem', padding: '0 10px 0 0', border: 'none' }}
                >
                    {'\u2190'}
                </button>
                <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>Inventario proyectado</h2>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                        Basado en platos seleccionados
                    </div>
                </div>
            </div>

            {/* Summary Card with Cat */}
            {!loading && !showAlertsOnly && (
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
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Cobertura de Recetas</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '800', color: coveragePct > 80 ? 'var(--status-green-main)' : coveragePct > 50 ? 'var(--status-yellow-main)' : 'var(--status-red-main)' }}>
                            {coveragePct}%
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '4px' }}>
                            {totalIngredients - totalMissing} de {totalIngredients} ingredientes
                        </div>
                    </div>

                    <img
                        src={catConfident}
                        alt="Confident Cat"
                        style={{
                            height: '90px',
                            objectFit: 'contain',
                            marginRight: '-10px',
                            marginBottom: '-12px',
                            opacity: 0.9
                        }}
                    />
                </div>
            )}

            {loading ? (
                <div className="loading-text">Cargando inventario...</div>
            ) : (
                <>
                    {!showAlertsOnly && (
                        <>
                            <div className="spending-card" style={{ marginBottom: '14px' }}>
                                <div style={{ fontWeight: '700', marginBottom: '8px' }}>Seleccionar platos</div>
                                <button
                                    onClick={loadFromCalendar}
                                    style={{
                                        marginBottom: '8px',
                                        padding: '6px 10px',
                                        borderRadius: '999px',
                                        border: '1px solid #e2e8f0',
                                        background: '#f8fafc',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Usar calendario del mes
                                </button>
                                <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                    {recipes.length === 0 ? (
                                        <div className="loading-text">Sin platos aun.</div>
                                    ) : (
                                        recipes.map((recipe) => (
                                            <label
                                                key={recipe.name}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSet.has(recipe.name)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelected((prev) => [...prev, recipe.name]);
                                                        } else {
                                                            setSelected((prev) => prev.filter((item) => item !== recipe.name));
                                                        }
                                                    }}
                                                />
                                                <span>{recipe.name}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="spending-card" style={{ marginBottom: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <div style={{ fontWeight: '700' }}>Resumen</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                                        {totalMissing} faltantes de {totalIngredients}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.9rem' }}>Platos seleccionados: {selected.length}</div>
                                <div style={{ fontSize: '0.9rem' }}>Ingredientes distintos: {totalIngredients}</div>
                            </div>

                            <div className="spending-card" style={{ marginBottom: '14px' }}>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Buscar ingrediente..."
                                        style={{ flex: 1, minWidth: '180px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    />
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={showMissingOnly}
                                            onChange={(e) => setShowMissingOnly(e.target.checked)}
                                        />
                                        Solo faltantes
                                    </label>
                                </div>

                                {selected.length === 0 ? (
                                    <div style={{ color: 'var(--color-text-dim)' }}>
                                        Selecciona platos para ver el inventario proyectado.
                                    </div>
                                ) : filteredIngredients.length === 0 ? (
                                    <div style={{ color: 'var(--color-text-dim)' }}>Sin ingredientes para mostrar.</div>
                                ) : (
                                    filteredIngredients.map((item) => (
                                        <div
                                            key={item.key}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '6px 0',
                                                borderBottom: '1px solid var(--border-light)',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: '600' }}>{item.label}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                                    En {item.count} plato(s)
                                                </div>
                                            </div>
                                            <div style={{
                                                fontWeight: '700',
                                                color: item.inList ? 'var(--status-green-main)' : 'var(--status-red-main)'
                                            }}>
                                                {item.inList ? 'En lista' : 'Falta'}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}

                    {showAlertsOnly && (
                        <div className="spending-card" style={{ marginBottom: '14px' }}>
                            <div style={{ fontWeight: '700', marginBottom: '8px' }}>Alertas (demo)</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>Solo productos estrategicos (Clase A)</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginBottom: '8px' }}>
                                Recompra temprana  -  Inmovilizacion prolongada
                            </div>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                <div style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                                    Posible recompra temprana en "Arroz 1kg".
                                </div>
                                <div style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                                    Inmovilizacion prolongada en "Detergente".
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Inventory;





