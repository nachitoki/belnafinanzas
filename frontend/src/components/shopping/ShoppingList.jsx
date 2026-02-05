
import React, { useEffect, useMemo, useState } from 'react';
import {
    getShoppingList,
    getShoppingSuggestions,
    createShoppingItem,
    updateShoppingItem,
    deleteShoppingItem,
    getProductPrices,
    getRecipes
} from '../../services/api';

const ShoppingList = ({ mode = 'list' }) => {
    const [items, setItems] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [querySuggestions, setQuerySuggestions] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncingPlanned, setSyncingPlanned] = useState(false);
    const [suggestQuery, setSuggestQuery] = useState('');
    const [name, setName] = useState('');
    const [qty, setQty] = useState('');
    const [unit, setUnit] = useState('');
    const [isWeekly, setIsWeekly] = useState(false);
    const [weeks, setWeeks] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [pricesByItem, setPricesByItem] = useState({});
    const [listView, setListView] = useState('list');
    const [showChecked, setShowChecked] = useState(false);
    const isAhorro = mode === 'ahorro';

    const loadAll = async () => {
        setLoading(true);
        try {
            const [listData, suggestionData] = await Promise.all([
                getShoppingList(),
                getShoppingSuggestions()
            ]);
            setItems(listData || []);
            setSuggestions(suggestionData || []);
            setQuerySuggestions([]);
            window.localStorage.setItem('shopping_list_cache_v1', JSON.stringify({
                ts: Date.now(),
                items: listData || [],
                suggestions: suggestionData || []
            }));
        } catch (e) {
            console.error('Error loading shopping list', e);
            setItems([]);
            setSuggestions([]);
            setQuerySuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const cachedRaw = window.localStorage.getItem('shopping_list_cache_v1');
        if (cachedRaw) {
            try {
                const cached = JSON.parse(cachedRaw);
                if (Array.isArray(cached?.items)) {
                    setItems(cached.items);
                    setSuggestions(Array.isArray(cached.suggestions) ? cached.suggestions : []);
                    setLoading(false);
                }
            } catch (e) {
                console.warn('Invalid shopping list cache', e);
            }
        }
        loadAll();
    }, []);

    useEffect(() => {
        const loadRecipes = async () => {
            try {
                const data = await getRecipes();
                const overridesRaw = window.localStorage.getItem('recipes_override');
                const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
                const merged = (data || []).map((r) => {
                    const key = r.id || r.name;
                    const override = overrides[key] || overrides[r.name] || overrides[normalizeKey(r.name)];
                    return override ? { ...r, ...override } : r;
                });
                setRecipes(merged);
            } catch (e) {
                console.error('Error loading recipes', e);
                setRecipes([]);
            }
        };
        loadRecipes();
    }, []);

    useEffect(() => {
        let active = true;
        const q = (isAhorro ? suggestQuery : name || '').trim();
        if (!q || q.length < 2) {
            setQuerySuggestions([]);
            setSuggestionsLoading(false);
            return () => { active = false; };
        }
        setSuggestionsLoading(true);
        const timer = setTimeout(async () => {
            try {
                const data = await getShoppingSuggestions(q);
                if (active) setQuerySuggestions(data || []);
            } catch (e) {
                if (active) setQuerySuggestions([]);
            } finally {
                if (active) setSuggestionsLoading(false);
            }
        }, 300);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [name, suggestQuery, isAhorro]);
    const handleAdd = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            const payload = {
                name: name.trim(),
                qty: qty ? Number(qty) : null,
                unit: unit || null,
                bucket: isWeekly ? 'weekly' : 'monthly',
                weeks: isWeekly ? weeks : []
            };
            const res = await createShoppingItem(payload);
            setItems(prev => [
                {
                    id: res?.id || `${Date.now()}`,
                    name: payload.name,
                    qty: payload.qty,
                    unit: payload.unit,
                    bucket: payload.bucket,
                    weeks: payload.weeks,
                    checked: false
                },
                ...prev
            ]);
            setName('');
            setQty('');
            setUnit('');
            setIsWeekly(false);
            setWeeks([]);
            loadAll();
        } catch (e) {
            console.error('Error creating item', e);
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            alert('Error al guardar: ' + detail);
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (item) => {
        try {
            await updateShoppingItem(item.id, { checked: !item.checked });
            setItems(items.map(i => (i.id === item.id ? { ...i, checked: !item.checked } : i)));
        } catch (e) {
            console.error('Error updating item', e);
        }
    };

    const handleDelete = async (itemId) => {
        if (!window.confirm('Eliminar este item?')) return;
        setSaving(true);
        try {
            await deleteShoppingItem(itemId);
            setItems(items.filter(i => i.id !== itemId));
        } catch (e) {
            console.error('Error deleting item', e);
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            alert('Error al eliminar: ' + detail);
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditForm({
            name: item.name || '',
            qty: item.qty || '',
            unit: item.unit || '',
            bucket: item.bucket || 'monthly',
            weeks: Array.isArray(item.weeks) ? item.weeks : []
        });
    };

    const handleUpdate = async () => {
        if (!editingId) return;
        setSaving(true);
        try {
            await updateShoppingItem(editingId, {
                name: editForm.name,
                qty: editForm.qty ? Number(editForm.qty) : null,
                unit: editForm.unit || null,
                bucket: editForm.bucket || 'monthly',
                weeks: editForm.bucket === 'weekly' ? (editForm.weeks || []) : []
            });
            setEditingId(null);
            setEditForm({});
            await loadAll();
        } catch (e) {
            console.error('Error updating item', e);
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            alert('Error al guardar: ' + detail);
        } finally {
            setSaving(false);
        }
    };

    const addSuggestion = async (sug) => {
        setSaving(true);
        try {
            const payload = {
                name: sug.name,
                product_id: sug.product_id,
                qty: null,
                unit: sug.latest_price?.unit || null,
                bucket: 'monthly',
                weeks: []
            };
            const res = await createShoppingItem(payload);
            setItems(prev => [
                {
                    id: res?.id || `${Date.now()}`,
                    name: payload.name,
                    product_id: payload.product_id,
                    qty: payload.qty,
                    unit: payload.unit,
                    bucket: payload.bucket,
                    weeks: payload.weeks,
                    checked: false
                },
                ...prev
            ]);
            loadAll();
        } catch (e) {
            console.error('Error adding suggestion', e);
            const detail = e.response?.data?.detail || e.message || 'Error desconocido';
            alert('Error al guardar: ' + detail);
        } finally {
            setSaving(false);
        }
    };

    const togglePrices = async (item) => {
        if (!item.product_id) return;
        if (pricesByItem[item.id]) {
            setPricesByItem(prev => ({ ...prev, [item.id]: null }));
            return;
        }
        try {
            const prices = await getProductPrices(item.product_id);
            setPricesByItem(prev => ({ ...prev, [item.id]: prices || [] }));
        } catch (e) {
            console.error('Error loading prices', e);
            setPricesByItem(prev => ({ ...prev, [item.id]: [] }));
        }
    };
    const fmt = (n) => Math.round(Number(n || 0)).toLocaleString('es-CL');
    const normalizeText = (value) =>
        (value || '')
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    const normalizeKey = (value) =>
        (value || '')
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    const getItemKey = (item) => normalizeKey(item?.name || item?.product_name || '');

    const mergeItems = (list) => {
        const map = new Map();
        list.forEach((item) => {
            const key = getItemKey(item) || `${item.id}`;
            const entry = map.get(key);
            if (!entry) {
                map.set(key, { items: [item] });
                return;
            }
            entry.items.push(item);
        });
        return Array.from(map.values()).map((entry) => {
            const itemsGroup = entry.items;
            const base = itemsGroup[0];
            const baseUnit = base.unit || '';
            const sameUnit = itemsGroup.every((i) => (i.unit || '') === baseUnit);
            const qtys = itemsGroup.map((i) => Number(i.qty)).filter((n) => !Number.isNaN(n));
            const summedQty = sameUnit && qtys.length ? qtys.reduce((a, b) => a + b, 0) : null;
            return {
                ...base,
                qty: summedQty !== null ? summedQty : base.qty,
                _groupItems: itemsGroup,
                _groupCount: itemsGroup.length,
                checked: itemsGroup.every((i) => !!i.checked)
            };
        });
    };

    const parseIngredient = (raw) => {
        const text = (raw || '').toString().trim();
        if (!text) return { name: '', qty: null, unit: null };
        const directMatch = text.match(/^\s*(\d+(?:[.,]\d+)?)\s*(kg|g|gr|grs|gramo|gramos|ml|lt|l|lts|litro|litros|unidad|un|ud|u|pack|paq)?\s*(.*)$/i);
        if (directMatch) {
            const qtyValue = directMatch[1] ? Number(String(directMatch[1]).replace(',', '.')) : null;
            let unitValue = (directMatch[2] || '').toLowerCase();
            if (unitValue === 'l' || unitValue === 'lts' || unitValue === 'litro' || unitValue === 'litros') unitValue = 'lt';
            if (unitValue === 'gr' || unitValue === 'grs' || unitValue === 'gramo' || unitValue === 'gramos') unitValue = 'g';
            if (unitValue === 'un' || unitValue === 'ud' || unitValue === 'u') unitValue = 'unidad';
            const nameValue = (directMatch[3] || '').trim() || text;
            return { name: nameValue, qty: qtyValue, unit: unitValue || null };
        }
        const anywhereMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr|grs|gramo|gramos|ml|lt|l|lts|litro|litros|unidad|un|ud|u|pack|paq)/i);
        if (!anywhereMatch) return { name: text, qty: null, unit: null };
        const qtyValue = anywhereMatch[1] ? Number(String(anywhereMatch[1]).replace(',', '.')) : null;
        let unitValue = (anywhereMatch[2] || '').toLowerCase();
        if (unitValue === 'l' || unitValue === 'lts' || unitValue === 'litro' || unitValue === 'litros') unitValue = 'lt';
        if (unitValue === 'gr' || unitValue === 'grs' || unitValue === 'gramo' || unitValue === 'gramos') unitValue = 'g';
        if (unitValue === 'un' || unitValue === 'ud' || unitValue === 'u') unitValue = 'unidad';
        const nameValue = text.replace(anywhereMatch[0], '').trim() || text;
        return { name: nameValue, qty: qtyValue, unit: unitValue || null };
    };

    const isLegacyPrice = (price) => {
        const store = (price?.store_name || '').toLowerCase();
        return store.includes('notion') || store.includes('legacy');
    };

    const getEstimate = (item) => {
        const best = item?.best_price;
        if (best && isLegacyPrice(best)) return null;
        const unitPrice = best?.unit_price;
        if (!unitPrice) return null;
        const qtyValue = Number(item?.qty);
        if (!Number.isNaN(qtyValue) && qtyValue > 0) {
            return unitPrice * qtyValue;
        }
        return unitPrice;
    };

    const normalizeUnit = (value) => {
        const unitValue = (value || '').toString().toLowerCase().trim();
        if (unitValue === 'gr' || unitValue === 'grs' || unitValue === 'gramo' || unitValue === 'gramos') return 'g';
        if (unitValue === 'l' || unitValue === 'lt' || unitValue === 'lts' || unitValue === 'litro' || unitValue === 'litros') return 'lt';
        if (unitValue === 'kg' || unitValue === 'kilo' || unitValue === 'kilos') return 'kg';
        if (unitValue === 'ml') return 'ml';
        if (unitValue === 'un' || unitValue === 'ud' || unitValue === 'u') return 'unidad';
        return unitValue || null;
    };

    const getWeightRoundingSuggestion = (qtyValue, unitValue) => {
        if (!qtyValue || !unitValue) return null;
        const unit = normalizeUnit(unitValue);
        if (unit !== 'kg' && unit !== 'g') return null;
        const grams = unit === 'kg' ? qtyValue * 1000 : qtyValue;
        if (!grams || grams <= 0) return null;
        const roundedKg = Math.ceil(grams / 1000);
        if (roundedKg <= 0) return null;
        const roundedGrams = roundedKg * 1000;
        if (roundedGrams <= grams) return null;
        return `${roundedKg} kg`;
    };

    const visibleItems = showChecked ? items : items.filter((i) => !i.checked);
    const monthlyItems = visibleItems.filter(i => (i.bucket || 'monthly') === 'monthly');
    const weeklyItems = visibleItems.filter(i => (i.bucket || 'monthly') === 'weekly');
    const suggestionFilter = ((isAhorro ? suggestQuery : name) || '').trim().toLowerCase();
    const filteredSuggestions = suggestionFilter ? querySuggestions : suggestions;
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const totalWeeks = Math.ceil(daysInMonth / 7);
    const weekOptions = Array.from({ length: totalWeeks }, (_, i) => i + 1);

    const toggleWeek = (w) => {
        setWeeks(prev => (
            prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]
        ));
    };

    const toggleEditWeek = (w) => {
        setEditForm((prev) => {
            const current = Array.isArray(prev.weeks) ? prev.weeks : [];
            const next = current.includes(w) ? current.filter(x => x !== w) : [...current, w];
            return { ...prev, weeks: next };
        });
    };

    const monthlySummary = monthlyItems.reduce((acc, item) => {
        const estimate = getEstimate(item);
        if (estimate === null) {
            acc.missing += 1;
        } else {
            acc.total += estimate;
        }
        return acc;
    }, { total: 0, missing: 0 });

    const weeklySummary = weeklyItems.reduce((acc, item) => {
        const estimate = getEstimate(item);
        if (estimate === null) {
            acc.missing += 1;
        } else {
            acc.total += estimate;
        }
        return acc;
    }, { total: 0, missing: 0 });

    const weeklyTotals = weeklyItems.reduce((acc, item) => {
        const estimate = getEstimate(item);
        if (estimate === null) return acc;
        const weeksList = Array.isArray(item.weeks) && item.weeks.length > 0 ? item.weeks : [1];
        weeksList.forEach((w) => {
            acc[w] = (acc[w] || 0) + estimate;
        });
        return acc;
    }, {});

    const CATEGORY_RULES = [
        { name: 'Frutas y verduras', test: /fruta|verdur|manzana|naranja|palta|tomate|cebolla|papa|limon|platano|banana|uva|lechuga|zanahoria|pepino|ajo|brocoli|espinaca|pimiento|kiwi|pera|durazno|clementina/ },
        { name: 'Carnes y pescados', test: /pollo|carne|bistec|cerdo|pescado|atun|jurel|salmon|jamon|salchicha|chorizo|pavo/ },
        { name: 'Lacteos', test: /leche|yogur|queso|mantequilla|crema/ },
        { name: 'Panaderia', test: /pan|molde|tortilla|queque|harina|masa|galleta/ },
        { name: 'Congelados', test: /congel|pizza|helado/ },
        { name: 'Bebidas', test: /bebida|gaseosa|cola|agua|jugo|cerveza|vino|ron|pisco/ },
        { name: 'Limpieza', test: /detergente|lavaloza|cloro|jabon|limpieza|esponja|toalla|bolsa de basura|basura|desinfect/ },
        { name: 'Higiene', test: /shampoo|acondicionador|pasta dental|cepillo|papel higienico|desodorante|toallas|pañal|algodon/ },
        { name: 'Mascotas', test: /perro|gato|mascota|arena|alimento mascota/ },
        { name: 'Despensa', test: /arroz|fideo|pasta|azucar|sal|aceite|harina|cafe|te|miel|mermelada|lata|conserva|legumbre|poroto|lenteja|garbanzo|salsa|chancaca/ }
    ];

    const getCategory = (value) => {
        const normalized = normalizeText(value);
        if (!normalized) return 'Otros';
        const match = CATEGORY_RULES.find((rule) => rule.test.test(normalized));
        return match ? match.name : 'Otros';
    };

    const groupedItems = useMemo(() => {
        const map = new Map();
        visibleItems.forEach((item) => {
            const baseName = item.name || item.product_name || 'Sin nombre';
            const unitValue = normalizeUnit(item.unit || null);
            const qtyValue = Number(item.qty);
            const category = getCategory(baseName);
            const key = `${category}__${normalizeText(baseName)}__${unitValue || 'unitless'}`;
            if (!normalizeText(baseName)) return;
            const current = map.get(key) || {
                name: baseName,
                category,
                unit: unitValue,
                qty: 0,
                count: 0,
                estimate: 0,
                grams: 0,
                ml: 0
            };
            current.count += 1;
            const estimate = getEstimate(item);
            if (estimate !== null) {
                current.estimate += estimate;
            }
            if (!Number.isNaN(qtyValue) && qtyValue > 0 && unitValue) {
                current.qty += qtyValue;
                if (unitValue === 'kg') current.grams += qtyValue * 1000;
                if (unitValue === 'g') current.grams += qtyValue;
                if (unitValue === 'lt') current.ml += qtyValue * 1000;
                if (unitValue === 'ml') current.ml += qtyValue;
            }
            if (baseName.length > current.name.length) current.name = baseName;
            map.set(key, current);
        });
        const grouped = {};
        Array.from(map.values()).forEach((entry) => {
            if (!grouped[entry.category]) grouped[entry.category] = [];
            grouped[entry.category].push(entry);
        });
        Object.values(grouped).forEach((list) => {
            list.sort((a, b) => a.name.localeCompare(b.name));
        });
        return grouped;
    }, [visibleItems]);

    const plannedIngredients = (() => {
        if (!recipes.length) return [];
        const now = new Date();
        const key = `meal_calendar_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        let calendar = {};
        try {
            const raw = window.localStorage.getItem(key);
            calendar = raw ? JSON.parse(raw) : {};
        } catch (e) {
            calendar = {};
        }
        if (!calendar || Object.keys(calendar).length === 0) {
            try {
                const keys = Object.keys(window.localStorage).filter((k) => k.startsWith('meal_calendar_'));
                const latest = keys
                    .map((k) => ({ k, ym: k.replace('meal_calendar_', '') }))
                    .sort((a, b) => (a.ym > b.ym ? -1 : 1))[0];
                if (latest?.k) {
                    const raw = window.localStorage.getItem(latest.k);
                    calendar = raw ? JSON.parse(raw) : {};
                }
            } catch (e) {
                // ignore
            }
        }
        const plannedValues = Object.values(calendar || {}).filter(Boolean);
        const plannedRecipeNames = new Set(plannedValues);
        const plannedRecipeNamesNormalized = new Set(plannedValues.map((value) => normalizeKey(value)));
        if (!plannedRecipeNames.size && !plannedRecipeNamesNormalized.size) return [];
        const plannedCounts = plannedValues.reduce((acc, value) => {
            const raw = String(value);
            const norm = normalizeKey(raw);
            acc.raw[raw] = (acc.raw[raw] || 0) + 1;
            acc.norm[norm] = (acc.norm[norm] || 0) + 1;
            return acc;
        }, { raw: {}, norm: {} });
        const overridesRaw = window.localStorage.getItem('recipes_override');
        const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
        const mergedRecipes = recipes.map((r) => {
            const key = r.id || r.name;
            const override = overrides[key] || overrides[r.name] || overrides[normalizeKey(r.name)];
            return override ? { ...r, ...override } : r;
        });
        const map = new Map();
        mergedRecipes.forEach((recipe) => {
            const recipeName = recipe.name || '';
            const normalizedName = normalizeKey(recipeName);
            const recipeId = recipe.id ? String(recipe.id) : '';
            const normalizedId = normalizeKey(recipeId);
            if (
                !plannedRecipeNames.has(recipeName) &&
                !plannedRecipeNamesNormalized.has(normalizedName) &&
                (!recipeId || !plannedRecipeNames.has(recipeId)) &&
                (!normalizedId || !plannedRecipeNamesNormalized.has(normalizedId))
            ) {
                return;
            }
            const occurrences =
                plannedCounts.raw[recipeName] ||
                plannedCounts.norm[normalizedName] ||
                (recipeId ? plannedCounts.raw[recipeId] : 0) ||
                (normalizedId ? plannedCounts.norm[normalizedId] : 0) ||
                1;
            (recipe.ingredients || []).forEach((ing) => {
                const parsed = parseIngredient(ing);
                const cleaned = parsed.name;
                const normalized = normalizeText(cleaned);
                if (!normalized) return;
                if (!parsed.qty || !parsed.unit) return;
                const current = map.get(normalized) || { name: cleaned, qty: 0, unit: parsed.unit || null, count: 0, mixedUnit: false };
                current.count += occurrences;
                if (parsed.qty && parsed.unit && (current.unit === parsed.unit || !current.unit)) {
                    current.unit = parsed.unit;
                    current.qty += parsed.qty * occurrences;
                } else if (parsed.qty && parsed.unit && current.unit && current.unit !== parsed.unit) {
                    const preferWeight = ['g', 'kg', 'ml', 'lt'];
                    if (current.unit === 'unidad' && preferWeight.includes(parsed.unit)) {
                        current.unit = parsed.unit;
                        current.qty = parsed.qty * occurrences;
                        current.mixedUnit = false;
                    } else if (!preferWeight.includes(current.unit) && preferWeight.includes(parsed.unit)) {
                        current.unit = parsed.unit;
                        current.qty = parsed.qty * occurrences;
                        current.mixedUnit = false;
                    } else if (preferWeight.includes(current.unit) && parsed.unit === 'unidad') {
                        // keep weight-based unit
                    } else {
                        current.mixedUnit = true;
                    }
                }
                if (cleaned.length > current.name.length) current.name = cleaned;
                map.set(normalized, current);
            });
        });
        return Array.from(map.entries()).map(([key, value]) => ({
            key,
            name: value.name,
            qty: value.qty || null,
            unit: value.unit || null,
            count: value.count,
            mixedUnit: value.mixedUnit
        }));
    })();

    const plannedByKey = useMemo(() => {
        const map = new Map();
        plannedIngredients.forEach((entry) => {
            map.set(entry.key, entry);
        });
        return map;
    }, [plannedIngredients]);

    const getPlannedEntryForName = (rawName) => {
        const key = normalizeText(rawName || '');
        if (!key) return null;
        const exact = plannedByKey.get(key);
        if (exact) return exact;
        return plannedIngredients.find((entry) => key.includes(entry.key) || entry.key.includes(key)) || null;
    };

    const plannedMissingCount = (() => {
        if (!plannedIngredients.length) return 0;
        const itemNames = new Set(items.map((i) => normalizeText(i.name || i.product_name || '')));
        return plannedIngredients.filter((entry) => !itemNames.has(entry.key)).length;
    })();

    const autoPlannedSet = useMemo(() => {
        const now = new Date();
        const syncKey = `shopping_sync_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        try {
            const raw = window.localStorage.getItem(syncKey);
            const parsed = raw ? JSON.parse(raw) : [];
            return new Set((parsed || []).map((n) => normalizeText(n)));
        } catch (e) {
            return new Set();
        }
    }, [plannedIngredients.length, items.length]);

    useEffect(() => {
        if (isAhorro) return;
        if (!plannedIngredients.length) return;
        if (syncingPlanned) return;
        const now = new Date();
        const syncKey = `shopping_sync_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        let synced = [];
        try {
            const raw = window.localStorage.getItem(syncKey);
            synced = raw ? JSON.parse(raw) : [];
        } catch (e) {
            synced = [];
        }
        const itemNames = new Set(items.map((i) => normalizeText(i.name || i.product_name || '')));
        const toAdd = plannedIngredients.filter((entry) => {
            const n = entry.key;
            return n && !itemNames.has(n) && !synced.includes(n);
        });
        const toUpdate = items
            .map((item) => {
                const key = normalizeText(item.name || item.product_name || '');
                const planned = plannedByKey.get(key);
                if (!planned || !planned.qty || !planned.unit) return null;
                const plannedUnit = normalizeUnit(planned.unit);
                const itemUnit = normalizeUnit(item.unit);
                const qtyValue = Number(item.qty);
                const plannedQty = Number(planned.qty);
                const autoSynced = autoPlannedSet.has(key);
                const needsQty = !qtyValue || Number.isNaN(qtyValue);
                const needsUnit = !itemUnit;
                const mismatchUnit = plannedUnit && itemUnit && plannedUnit !== itemUnit;
                const mismatchQty = plannedQty && qtyValue && Math.abs(plannedQty - qtyValue) > 0.0001;
                if (!autoSynced && !needsQty && !needsUnit && !mismatchUnit && !mismatchQty) return null;
                if (!autoSynced && !needsQty && !needsUnit) return null;
                return {
                    item,
                    planned,
                    plannedUnit,
                    plannedQty,
                    key
                };
            })
            .filter(Boolean);
        if (toAdd.length === 0 && toUpdate.length === 0) return;
        setSyncingPlanned(true);
        const createPromises = toAdd.map((entry) => createShoppingItem({
            name: entry.name,
            qty: entry.qty || null,
            unit: entry.unit || null,
            bucket: 'monthly',
            weeks: []
        }));
        const updatePromises = toUpdate.map(({ item, planned, plannedUnit, plannedQty }) =>
            updateShoppingItem(item.id, {
                qty: plannedQty || null,
                unit: plannedUnit || null
            })
        );
        Promise.all([...createPromises, ...updatePromises]).then(() => {
            const next = [...synced, ...toAdd.map((entry) => entry.key)];
            try {
                window.localStorage.setItem(syncKey, JSON.stringify(next));
            } catch (e) {
                // ignore
            }
            setItems((prev) => prev.map((i) => {
                const key = normalizeText(i.name || i.product_name || '');
                const upd = toUpdate.find((u) => u.item.id === i.id);
                if (!upd) return i;
                return { ...i, qty: upd.plannedQty || i.qty, unit: upd.plannedUnit || i.unit };
            }));
            loadAll();
        }).catch((e) => {
            console.error('Error syncing planned ingredients', e);
        }).finally(() => {
            setSyncingPlanned(false);
        });
    }, [plannedIngredients.length, items.length, isAhorro, syncingPlanned, plannedByKey, autoPlannedSet]);
    const renderList = (title, list) => {
        const mergedList = mergeItems(list);
        return (
        <div className="spending-card" style={{ marginTop: title === 'Semanal' ? '12px' : undefined }}>
            <div className="section-title">{title}</div>
            {loading && items.length === 0 ? (
                <div style={{ textAlign: 'center' }}>Cargando lista...</div>
            ) : mergedList.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aaa' }}>Sin items por ahora.</div>
            ) : (
                mergedList.map((item) => (
                    <div key={item.id} style={{ borderBottom: '1px dashed var(--border-light)', padding: '8px 0' }}>
                        {editingId === item.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <input
                                    value={editForm.name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        value={editForm.qty || ''}
                                        onChange={(e) => setEditForm({ ...editForm, qty: e.target.value })}
                                        inputMode="decimal"
                                        placeholder="Cantidad"
                                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    />
                                    <input
                                        value={editForm.unit || ''}
                                        onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                                        placeholder="Unidad"
                                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    />
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                                    <input
                                        type="checkbox"
                                        checked={(editForm.bucket || 'monthly') === 'weekly'}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setEditForm({
                                                ...editForm,
                                                bucket: checked ? 'weekly' : 'monthly',
                                                weeks: checked ? (editForm.weeks || []) : []
                                            });
                                        }}
                                    />
                                    Semanal
                                </label>
                                {editForm.bucket === 'weekly' && (
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {weekOptions.map((w) => (
                                            <label key={w} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={(editForm.weeks || []).includes(w)}
                                                    onChange={() => toggleEditWeek(w)}
                                                />
                                                Semana {w}
                                            </label>
                                        ))}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={handleUpdate}
                                        disabled={saving}
                                        style={{ flex: 1, padding: '8px', background: 'var(--status-green-main)', color: 'white', border: 'none', borderRadius: '6px' }}
                                    >
                                        Guardar
                                    </button>
                                    <button
                                        onClick={() => { setEditingId(null); setEditForm({}); }}
                                        disabled={saving}
                                        style={{ flex: 1, padding: '8px', background: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '6px' }}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!item.checked}
                                        onChange={() => {
                                            const group = item._groupItems || [item];
                                            const nextChecked = !item.checked;
                                            Promise.all(group.map((g) => updateShoppingItem(g.id, { checked: nextChecked })))
                                                .then(() => {
                                                    const ids = new Set(group.map((g) => g.id));
                                                    setItems((prev) => prev.map((i) => ids.has(i.id) ? { ...i, checked: nextChecked } : i));
                                                })
                                                .catch((e) => console.error('Error updating items', e));
                                        }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: '700', textDecoration: item.checked ? 'line-through' : 'none' }}>
                                            {item.name || item.product_name || 'Sin nombre'}
                                            {item._groupCount > 1 && (
                                                <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                                    x{item._groupCount}
                                                </span>
                                            )}
                                        </div>
                                        {autoPlannedSet.has(normalizeText(item.name || item.product_name || '')) && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                                ♻ Platos
                                            </div>
                                        )}
                                        {(() => {
                                            const plannedEntry = getPlannedEntryForName(item.name || item.product_name || '');
                                            if (!plannedEntry) return null;
                                            if (plannedEntry.qty && plannedEntry.unit) return null;
                                            return (
                                                <div style={{ fontSize: '0.75rem', color: '#c53030' }}>
                                                    ⚠ Falta cantidad en receta
                                                </div>
                                            );
                                        })()}
                                        {(item.qty || item.unit) && !getPlannedEntryForName(item.name || item.product_name || '') && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                                {item.qty ? item.qty : ''} {item.unit || ''}
                                            </div>
                                        )}
                                        {(() => {
                                            const entry = getPlannedEntryForName(item.name || item.product_name || '');
                                            if (!entry) return null;
                                            return (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                                    Requerido: {(() => {
                                                        if (entry.unit === 'kg' || entry.unit === 'g') {
                                                            const grams = entry.unit === 'kg' ? (entry.qty || 0) * 1000 : (entry.qty || 0);
                                                            return `${Math.round(grams || 0)} g`;
                                                        }
                                                        if (entry.unit === 'lt' || entry.unit === 'ml') {
                                                            const ml = entry.unit === 'lt' ? (entry.qty || 0) * 1000 : (entry.qty || 0);
                                                            return `${Math.round(ml || 0)} ml`;
                                                        }
                                                        if (entry.qty && entry.unit === 'unidad') return `${entry.qty} unidades`;
                                                        if (entry.qty) return `${entry.qty} ${entry.unit || ''}`;
                                                        return entry.count > 1 ? `${entry.count} items` : '1 item';
                                                    })()}
                                                </div>
                                            );
                                        })()}
                                        {(() => {
                                            const key = normalizeText(item.name || item.product_name || '');
                                            const planned = getPlannedEntryForName(item.name || item.product_name || '');
                                            const qtyValue = planned?.qty || item.qty;
                                            const unitValue = planned?.unit || item.unit;
                                            const suggestion = getWeightRoundingSuggestion(Number(qtyValue), unitValue);
                                            if (!suggestion) return null;
                                            return (
                                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>
                                                    Sugerencia: comprar {suggestion}
                                                </div>
                                            );
                                        })()}
                                        
                                        {Array.isArray(item.weeks) && item.weeks.length > 0 && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                                Semanas: {item.weeks.join(', ')}
                                            </div>
                                        )}
                                        {item.best_price?.unit_price && !isLegacyPrice(item.best_price) && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                                Mejor: ${fmt(item.best_price.unit_price)} {item.best_price.unit ? `/${item.best_price.unit}` : ''} {item.best_price.store_name ? `- ${item.best_price.store_name}` : ''}
                                            </div>
                                        )}
                                        {item.best_price?.unit_price && isLegacyPrice(item.best_price) && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                                Mejor (legacy): ${fmt(item.best_price.unit_price)} {item.best_price.unit ? `/${item.best_price.unit}` : ''} {item.best_price.store_name ? `- ${item.best_price.store_name}` : ''}
                                            </div>
                                        )}
                                        {getEstimate(item) !== null && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                                Total estimado: ${fmt(getEstimate(item))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {item.product_id && (
                                        <button
                                            onClick={() => togglePrices(item)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                        >
                                            $
                                        </button>
                                    )}
                                    <button
                                        onClick={() => startEdit(item)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        {'\u270F\uFE0F'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const group = item._groupItems || [item];
                                            if (!window.confirm('Eliminar este item?')) return;
                                            Promise.all(group.map((g) => deleteShoppingItem(g.id)))
                                                .then(() => {
                                                    const ids = new Set(group.map((g) => g.id));
                                                    setItems((prev) => prev.filter((i) => !ids.has(i.id)));
                                                })
                                                .catch((e) => console.error('Error deleting items', e));
                                        }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        {'\uD83D\uDDD1\uFE0F'}
                                    </button>
                                </div>
                            </div>
                        )}
                        {Array.isArray(pricesByItem[item.id]) && (
                            <div style={{ marginTop: '8px', paddingLeft: '22px' }}>
                                {pricesByItem[item.id].length === 0 ? (
                                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Sin precios disponibles.</div>
                                ) : (
                                    pricesByItem[item.id].map((p, idx) => (
                                        <div key={`${item.id}-p-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '4px' }}>
                                            <span>{p.store_name || 'Tienda'}</span>
                                            <span>${fmt(p.unit_price)} {p.unit ? `/${p.unit}` : ''}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
    };

    return (
        <div style={{ marginTop: '10px' }}>
            {!isAhorro && plannedIngredients.length > 0 && (
                <div className="spending-card" style={{ marginBottom: '12px' }}>
                    <div className="section-title">Platos del mes</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                        {plannedIngredients.length} ingredientes detectados. {plannedMissingCount} faltantes.
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                        {syncingPlanned ? 'Sincronizando faltantes...' : 'Faltantes se agregan a la lista automaticamente.'}
                    </div>
                </div>
            )}
            {isAhorro && (
                <div className="spending-card" style={{ marginBottom: '12px' }}>
                    <div className="section-title">Ahorro por producto / tienda</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                        Revisa sugerencias de sustitucion y mejores precios recientes.
                    </div>
                    <input
                        value={suggestQuery}
                        onChange={(e) => setSuggestQuery(e.target.value)}
                        placeholder="Buscar producto"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginTop: '8px' }}
                    />
                </div>
            )}

            {!isAhorro && (
                <div className="spending-card" style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '8px' }}>AGREGAR ITEM</div>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nombre del producto"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '8px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                            placeholder="Cantidad"
                            inputMode="decimal"
                            style={{ flex: 1, minWidth: '0', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                        <input
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            placeholder="Unidad"
                            style={{ flex: '0 0 120px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--color-text-dim)', marginBottom: '8px' }}>
                        <input
                            type="checkbox"
                            checked={isWeekly}
                            onChange={(e) => {
                                setIsWeekly(e.target.checked);
                                if (!e.target.checked) setWeeks([]);
                            }}
                        />
                        Semanal
                    </label>
                    {isWeekly && (
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                            {weekOptions.map((w) => (
                                <label key={w} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                    <input
                                        type="checkbox"
                                        checked={weeks.includes(w)}
                                        onChange={() => toggleWeek(w)}
                                    />
                                    Semana {w}
                                </label>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={handleAdd}
                        disabled={saving}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: saving ? '#9AE6B4' : 'var(--status-green-main)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: saving ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {saving ? 'Guardando...' : 'Agregar'}
                    </button>
                </div>
            )}

            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="spending-card" style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="section-title">{isAhorro ? 'Sugerencias de ahorro' : 'Sugerencias'}</div>
                        <button
                            onClick={() => setShowSuggestions(false)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer' }}
                        >
                            Ocultar
                        </button>
                    </div>
                    {filteredSuggestions.map((sug, idx) => (
                        <div key={sug.product_id || `${sug.name}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div>
                                <div style={{ fontWeight: '600' }}>{sug.name}</div>
                                {sug.latest_price?.unit_price && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                        ${fmt(sug.latest_price.unit_price)} {sug.latest_price.unit ? `/${sug.latest_price.unit}` : ''} {sug.latest_price.store_name ? `- ${sug.latest_price.store_name}` : ''}
                                    </div>
                                )}
                            </div>
                            {!isAhorro && (
                                <button
                                    onClick={() => addSuggestion(sug)}
                                    disabled={saving}
                                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', background: '#f7fafc' }}
                                >
                                    +
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {showSuggestions && filteredSuggestions.length === 0 && suggestionsLoading && (
                <div className="spending-card" style={{ marginBottom: '12px', textAlign: 'center', color: 'var(--color-text-dim)' }}>
                    Buscando sugerencias...
                </div>
            )}
            {showSuggestions && filteredSuggestions.length === 0 && !suggestionsLoading && isAhorro && (
                <div className="spending-card" style={{ marginBottom: '12px', textAlign: 'center', color: 'var(--color-text-dim)' }}>
                    Sin sugerencias por ahora.
                </div>
            )}
            {!showSuggestions && (
                <div className="spending-card" style={{ marginBottom: '12px' }}>
                    <button
                        onClick={() => setShowSuggestions(true)}
                        style={{ background: 'none', border: '1px dashed #cbd5e0', color: 'var(--color-text-dim)', width: '100%', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        Mostrar sugerencias
                    </button>
                </div>
            )}

            {!isAhorro && (
                <>
                    <div className="spending-card" style={{ marginBottom: '12px' }}>
                        <div className="section-title">Vista de lista</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                            <button
                                onClick={() => setListView('list')}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '999px',
                                    border: listView === 'list' ? '1px solid var(--status-green-main)' : '1px solid #e2e8f0',
                                    background: listView === 'list' ? '#ecfdf3' : 'white',
                                    color: listView === 'list' ? 'var(--status-green-main)' : 'var(--color-text-dim)'
                                }}
                            >
                                Ver lista
                            </button>
                            <button
                                onClick={() => setListView('grouped')}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '999px',
                                    border: listView === 'grouped' ? '1px solid var(--status-green-main)' : '1px solid #e2e8f0',
                                    background: listView === 'grouped' ? '#ecfdf3' : 'white',
                                    color: listView === 'grouped' ? 'var(--status-green-main)' : 'var(--color-text-dim)'
                                }}
                            >
                                Ver por categorias
                            </button>
                            <button
                                onClick={() => setShowChecked((prev) => !prev)}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '999px',
                                    border: showChecked ? '1px solid var(--status-green-main)' : '1px solid #e2e8f0',
                                    background: showChecked ? '#ecfdf3' : 'white',
                                    color: showChecked ? 'var(--status-green-main)' : 'var(--color-text-dim)'
                                }}
                            >
                                {showChecked ? 'Mostrar comprados' : 'Ocultar comprados'}
                            </button>
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>
                            La vista por categorias unifica items iguales y suma cantidades.
                        </div>
                    </div>

                    <div className="spending-card" style={{ marginBottom: '12px' }}>
                        <div className="section-title">Resumen estimado</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span>Compra grande</span>
                            <strong>${fmt(monthlySummary.total)}</strong>
                        </div>
                        {monthlySummary.missing > 0 && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>
                                {monthlySummary.missing} item(s) sin precio
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span>Semanal (total)</span>
                            <strong>${fmt(weeklySummary.total)}</strong>
                        </div>
                        {weeklySummary.missing > 0 && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>
                                {weeklySummary.missing} item(s) sin precio
                            </div>
                        )}
                        {Object.keys(weeklyTotals).length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '4px' }}>
                                    Estimado por semana
                                </div>
                                {weekOptions.map((w) => (
                                    weeklyTotals[w] ? (
                                        <div key={`wk-${w}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                            <span>Semana {w}</span>
                                            <span>${fmt(weeklyTotals[w])}</span>
                                        </div>
                                    ) : null
                                ))}
                            </div>
                        )}
                    </div>

                    {listView === 'list' ? (
                        <>
                            {renderList('Compra grande', monthlyItems)}
                            {renderList('Semanal', weeklyItems)}
                        </>
                    ) : (
                        <div className="spending-card">
                            <div className="section-title">Lista agrupada</div>
                            {Object.keys(groupedItems).length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#aaa' }}>Sin items por ahora.</div>
                            ) : (
                                Object.entries(groupedItems).map(([category, entries]) => (
                                    <div key={category} style={{ marginTop: '12px' }}>
                                        <div style={{ fontWeight: '700', marginBottom: '6px' }}>{category}</div>
                                        {entries.map((entry) => (
                                            <div key={`${category}-${entry.name}-${entry.unit || 'unitless'}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border-light)' }}>
                                                <span>{entry.name}</span>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                                                    {entry.grams > 0 ? `${Math.round(entry.grams)} g` : entry.ml > 0 ? `${Math.round(entry.ml)} ml` : entry.qty ? `${entry.qty} ${entry.unit || ''}` : entry.count > 1 ? `${entry.count} items` : ''}
                                                </span>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                                                    {entry.estimate > 0 ? `$${fmt(entry.estimate)}` : ''}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ShoppingList;



