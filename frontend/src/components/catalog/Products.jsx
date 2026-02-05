import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getProducts, getProductPrices, getRecipes, updateProduct, importNotionProducts } from '../../services/api';
import PillTabs from '../layout/PillTabs';

const Products = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isDespensa = new URLSearchParams(location.search).get('origin') === 'despensa';
    const [products, setProducts] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [prices, setPrices] = useState([]);
    const [loadingPrices, setLoadingPrices] = useState(false);
    const [query, setQuery] = useState('');
    const [recipeQuery, setRecipeQuery] = useState('');
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [manualPrice, setManualPrice] = useState('');
    const [manualUnit, setManualUnit] = useState('');
    const [editName, setEditName] = useState('');
    const [filterGroup, setFilterGroup] = useState('all');
    const [filterRecipeLinked, setFilterRecipeLinked] = useState(false);
    const [filterPerishable, setFilterPerishable] = useState('all');
    const [savingManual, setSavingManual] = useState(false);
    const [importing, setImporting] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [prodData, recipeData] = await Promise.all([
                    getProducts(),
                    getRecipes()
                ]);
                setProducts(prodData || []);
                setRecipes(recipeData || []);
            } catch (e) {
                console.error('Error loading products', e);
                setProducts([]);
                setRecipes([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredRecipes = useMemo(() => {
        const q = recipeQuery.trim().toLowerCase();
        if (!q) return recipes;
        return recipes.filter((r) => (r.name || '').toLowerCase().includes(q));
    }, [recipes, recipeQuery]);

    const normalize = (value) => {
        return (value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    };

    const isLegacyPrice = (price) => {
        const store = (price?.store_name || '').toLowerCase();
        return store.includes('notion') || store.includes('legacy');
    };

    const recipeIngredientSet = useMemo(() => {
        if (!selectedRecipe || !Array.isArray(selectedRecipe.ingredients)) return null;
        return selectedRecipe.ingredients.map((i) => normalize(i));
    }, [selectedRecipe]);

    const filteredProducts = useMemo(() => {
        const q = query.trim().toLowerCase();
        let list = products;
        if (q) {
            list = list.filter((p) => (p.name || '').toLowerCase().includes(q));
        }
        if (recipeIngredientSet && recipeIngredientSet.length > 0) {
            list = list.filter((p) => {
                const pn = normalize(p.name);
                return recipeIngredientSet.some((ing) => ing.includes(pn) || pn.includes(ing));
            });
        }
        if (filterGroup !== 'all') {
            if (filterGroup === 'limpieza') {
                list = list.filter((p) => (p.category_tag || '') === 'limpieza');
            } else if (filterGroup === 'extras') {
                list = list.filter((p) => (p.group || '') === 'extras');
            } else if (filterGroup === 'despensa') {
                list = list.filter((p) => (p.group || '') === 'despensa');
            }
        }
        if (filterRecipeLinked) {
            list = list.filter((p) => !!p.recipe_linked);
        }
        if (filterPerishable !== 'all') {
            list = list.filter((p) => (filterPerishable === 'yes' ? !!p.perishable : !p.perishable));
        }
        return list;
    }, [products, query, recipeIngredientSet, filterGroup, filterRecipeLinked, filterPerishable]);

    const handleSelectProduct = async (product) => {
        setSelectedProduct(product);
        setManualPrice(product.manual_price || '');
        setManualUnit(product.manual_unit || '');
        setEditName(product.name || '');
        setLoadingPrices(true);
        try {
            const data = await getProductPrices(product.id);
            setPrices(data);
        } catch (e) {
            console.error('Error loading product prices', e);
            setPrices([]);
        } finally {
            setLoadingPrices(false);
        }
    };

    const handleSaveManual = async () => {
        if (!selectedProduct) return;
        setSavingManual(true);
        setSaveMessage('');
        try {
            const normalizedManual = manualPrice ? Number(String(manualPrice).replace(/\./g, '').replace(',', '.')) : null;
            const updates = {
                manual_price: normalizedManual,
                manual_unit: manualUnit || null,
                group: selectedProduct.group,
                category_tag: selectedProduct.category_tag,
                perishable: selectedProduct.perishable
            };
            if (editName && editName.trim() && editName.trim() !== selectedProduct.name) {
                updates.name_raw = editName.trim();
            }
            await updateProduct(selectedProduct.id, {
                ...updates
            });
            setProducts((prev) => prev.map((p) => (
                p.id === selectedProduct.id
                    ? {
                        ...p,
                        name: updates.name_raw ? updates.name_raw : p.name,
                        name_norm: updates.name_raw ? updates.name_raw : p.name_norm,
                        manual_price: normalizedManual,
                        manual_unit: manualUnit || null,
                        group: updates.group,
                        category_tag: updates.category_tag,
                        perishable: updates.perishable
                    }
                    : p
            )));
            setSaveMessage('Guardado');
        } catch (e) {
            console.error('Error saving manual price', e);
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            alert('Error al guardar: ' + detail);
        } finally {
            setSavingManual(false);
        }
    };

    const handleImportNotion = async () => {
        setImporting(true);
        try {
            await importNotionProducts();
            const data = await getProducts();
            setProducts(data || []);
        } catch (e) {
            console.error('Error importing Notion products', e);
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            alert('Error al importar: ' + detail);
        } finally {
            setImporting(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', minHeight: 'calc(100vh - var(--topbar-height, 72px) - var(--bottomnav-height, 96px))' }}>
            <PillTabs
                items={isDespensa ? [
                    { label: 'Inventario', path: '/inventory?tab=inventario', icon: '\uD83D\uDCE6' },
                    { label: 'Estrategicos', path: '/products?origin=despensa', icon: '\u2B50' },
                    { label: 'Platos', path: '/recipes', icon: '\uD83C\uDF7D' },
                    { label: 'Calendario', path: '/meal-calendar', icon: '\uD83D\uDCC5' },
                    { label: 'Alertas', path: '/inventory?tab=alertas', icon: '\u26A0' }
                ] : [
                    { label: 'Registro', path: '/receipts?tab=upload', icon: '\uD83E\uDDFE' },
                    { label: 'Lista', path: '/receipts?tab=list', icon: '\u2705' },
                    { label: 'Precios', path: '/products', icon: '\uD83C\uDFF7\uFE0F' },
                    { label: 'Historial', path: '/receipts?tab=history', icon: '\uD83D\uDD52' },
                    { label: 'Ahorro', path: '/receipts?tab=ahorro', icon: '\uD83D\uDCB0' }
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
                    <h2 style={{ margin: 0 }}>{isDespensa ? 'Estrategicos' : 'Productos'}</h2>
                    <div className="page-subtitle">
                        {isDespensa ? 'Productos estrategicos' : 'Consulta de precios'}
                    </div>
                    {isDespensa && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                            Solo Clase A (estrategicos)
                        </div>
                    )}
                </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>BUSCAR PRODUCTO</div>
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar producto..."
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '8px' }}
            />

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <select
                    value={filterGroup}
                    onChange={(e) => setFilterGroup(e.target.value)}
                    style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                >
                    <option value="all">Todos</option>
                    <option value="despensa">Despensa / comida base</option>
                    <option value="extras">Extras despensa</option>
                    <option value="limpieza">Limpieza y hogar</option>
                </select>
                <select
                    value={filterPerishable}
                    onChange={(e) => setFilterPerishable(e.target.value)}
                    style={{ width: '140px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                >
                    <option value="all">Perecibles</option>
                    <option value="yes">Solo si</option>
                    <option value="no">Solo no</option>
                </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--color-text-dim)', marginBottom: '12px' }}>
                <input
                    type="checkbox"
                    checked={filterRecipeLinked}
                    onChange={(e) => setFilterRecipeLinked(e.target.checked)}
                />
                Solo ingredientes de receta
            </label>

            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>BUSCAR PLATO (FILTRA INGREDIENTES)</div>
            <input
                value={recipeQuery}
                onChange={(e) => setRecipeQuery(e.target.value)}
                placeholder="Buscar plato para filtrar ingredientes..."
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '8px' }}
            />

            <div style={{ marginBottom: '12px' }}>
                <button
                    onClick={handleImportNotion}
                    disabled={importing}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', background: '#f7fafc', width: '100%' }}
                >
                    {importing ? 'Importando...' : 'Importar productos desde Notion (completo)'}
                </button>
            </div>

            {filteredRecipes.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>SELECCIONAR PLATO</div>
                    <select
                        value={selectedRecipe?.name || ''}
                        onChange={(e) => {
                            const name = e.target.value;
                            const r = recipes.find((x) => x.name === name);
                            setSelectedRecipe(r || null);
                        }}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                    >
                        <option value="">Sin filtro por plato</option>
                        {filteredRecipes.map((r) => (
                            <option key={r.name} value={r.name}>{r.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center' }}>Cargando productos...</div>
            ) : filteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aaa' }}>Sin productos aun.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredProducts.map((product) => (
                        <div
                            key={product.id}
                            onClick={() => handleSelectProduct(product)}
                            style={{
                                textAlign: 'left',
                                padding: '12px',
                                borderRadius: '10px',
                                border: selectedProduct?.id === product.id ? '2px solid var(--status-green-main)' : '1px solid var(--border-light)',
                                background: 'var(--bg-card)',
                                cursor: 'pointer',
                                position: 'relative'
                            }}
                        >
                            {selectedProduct?.id === product.id && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedProduct(null); }}
                                    style={{
                                        position: 'absolute',
                                        top: '6px',
                                        right: '6px',
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '999px',
                                        border: '1px solid var(--border-light)',
                                        background: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        lineHeight: '20px'
                                    }}
                                    aria-label="Cerrar"
                                >
                                    x
                                </button>
                            )}
                            <div style={{ fontWeight: '700' }}>{product.name}</div>
                            {product.name_norm && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>{product.name_norm}</div>
                            )}
                            {product.manual_price ? (
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                    Manual (legacy): ${Math.round(product.manual_price).toLocaleString('es-CL')} {product.manual_unit ? `/${product.manual_unit}` : ''}
                                </div>
                            ) : null}
                            {selectedProduct?.id === product.id && (
                                <div style={{ marginTop: '8px' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>Nombre del producto</div>
                                    <input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        placeholder="Nombre (marca opcional)"
                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '8px' }}
                                    />
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>Precio manual</div>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                        <input
                                            value={manualPrice}
                                            onChange={(e) => setManualPrice(e.target.value)}
                                            placeholder="Precio"
                                            inputMode="decimal"
                                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                        />
                                        <select
                                            value={manualUnit}
                                            onChange={(e) => setManualUnit(e.target.value)}
                                            style={{ width: '120px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                        >
                                            <option value="">Unidad</option>
                                            <option value="unidad">unidad</option>
                                            <option value="kg">kg</option>
                                            <option value="g">g</option>
                                            <option value="gr">gr</option>
                                            <option value="lt">lt</option>
                                            <option value="ml">ml</option>
                                            <option value="pack">pack</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleSaveManual(); }}
                                        disabled={savingManual}
                                        style={{ width: '100%', padding: '8px 12px', background: 'var(--status-green-main)', color: 'white', border: 'none', borderRadius: '6px' }}
                                    >
                                        Guardar
                                    </button>
                                    {saveMessage && (
                                        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--status-green-main)', marginTop: '6px' }}>
                                            {saveMessage}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <select
                                            value={selectedProduct.category_tag || (selectedProduct.group === 'extras' ? 'extras' : 'comida')}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                const nextGroup = value === 'limpieza' || value === 'extras' ? 'extras' : 'despensa';
                                                const nextCategory = value === 'limpieza' ? 'limpieza' : (value === 'extras' ? 'extras' : 'comida');
                                                setSelectedProduct((prev) => prev ? { ...prev, group: nextGroup, category_tag: nextCategory } : prev);
                                            }}
                                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                        >
                                            <option value="comida">Despensa / comida base</option>
                                            <option value="extras">Extras despensa</option>
                                            <option value="limpieza">Limpieza y hogar</option>
                                        </select>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedProduct.perishable === false}
                                                onChange={(e) => setSelectedProduct((prev) => prev ? { ...prev, perishable: !e.target.checked } : prev)}
                                            />
                                            No perecible
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {selectedProduct && (
                <div style={{ marginTop: '20px' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)', marginBottom: '8px' }}>
                        Precios recientes
                    </h3>
                    {loadingPrices ? (
                        <div>Cargando precios...</div>
                    ) : prices.length === 0 ? (
                        <div style={{ color: '#aaa' }}>Sin precios asociados todavia.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {prices.map((p, idx) => (
                                <div key={`${p.store_id}-${idx}`} className="spending-card" style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                                    <div>
                                        <div style={{ fontWeight: '600' }}>{p.store_name || 'Tienda'}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>{p.date || '-'}</div>
                                        {isLegacyPrice(p) && (
                                            <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Legacy</div>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: '700', color: 'var(--status-green-main)' }}>
                                            ${Number(p.total_price || 0).toLocaleString('es-CL')}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                            {p.unit_price ? `$${Number(p.unit_price).toLocaleString('es-CL')} / ${p.unit || 'u'}` : ''}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Products;







