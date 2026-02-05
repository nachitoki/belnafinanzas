import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { uploadReceipt, confirmReceipt, getStores, createManualReceipt, getExpensePatterns } from '../../services/api';
import ReceiptHistory from './ReceiptHistory';
import ShoppingList from '../shopping/ShoppingList';
import PillTabs from '../layout/PillTabs';
import { RECEIPT_ALIASES, RECEIPT_FALLBACKS } from '../../data/receipt-aliases';

const Receipts = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const fileInputRef = useRef(null);

    // TAB STATE: 'upload' | 'history' | 'list' | 'ahorro'
    const [activeTab, setActiveTab] = useState('upload');

    // UPLOAD LOGIC STATES
    const [status, setStatus] = useState('idle');
    const [scannedData, setScannedData] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [confirming, setConfirming] = useState(false);
    const [stores, setStores] = useState([]);

    // SMART PATTERNS & MANUAL ENTRY
    const [patterns, setPatterns] = useState([]);
    const [manualModalOpen, setManualModalOpen] = useState(false);
    const [manualData, setManualData] = useState({ store: '', total: '', date: '', items: [] });
    const [filteredPatterns, setFilteredPatterns] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        getExpensePatterns().then(data => {
            if (data) setPatterns(data);
        });
    }, []);

    const guessReceiptType = (value) => {
        const text = (value || '').toString().toLowerCase();
        if (!text) return 'otros';
        if (text.includes('sodimac') || text.includes('easy') || text.includes('ferreter')) return 'ferreteria';
        if (text.includes('farmacia') || text.includes('cruz verde') || text.includes('salcob')) return 'salud';
        if (text.includes('copec') || text.includes('shell') || text.includes('petro') || text.includes('terpel')) return 'combustible';
        if (text.includes('jumbo') || text.includes('unimarc') || text.includes('lider') || text.includes('santa isabel')) return 'alimentos';
        if (text.includes('supermercado') || text.includes('market')) return 'alimentos';
        if (text.includes('librer') || text.includes('papeler')) return 'libreria';
        if (text.includes('telefono') || text.includes('internet') || text.includes('cable') || text.includes('luz') || text.includes('agua') || text.includes('gas')) return 'servicios';
        return 'hogar';
    };

    const parseRawItems = (raw) => {
        if (!raw) return [];
        const lines = String(raw)
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
        const ignore = /(total|subtotal|iva|vuelto|cambio|propina|tarjeta|debito|credito|boleta|factura|caja|cajero|rut)/i;
        const items = [];
        lines.forEach((line) => {
            if (ignore.test(line)) return;
            const match = line.match(/^(.*?)(\d{3,}(?:[.,]\d{1,2})?)$/);
            if (!match) return;
            const name = match[1].replace(/[\s\-]+$/g, '').trim();
            const priceRaw = match[2];
            if (!name) return;
            const price = parseNumber(priceRaw);
            if (!price) return;
            items.push({
                id: `raw-${items.length}-${Date.now()}`,
                name_raw: name,
                name_clean: '',
                name_brand: '',
                qty: 1,
                unit_price: price,
                discount: 0,
                line_total: price
            });
        });
        return items;
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setStatus('uploading');
        setErrorMsg('');

        try {
            const result = await uploadReceipt(file);
            const inferredType = guessReceiptType(result?.merchant || result?.store_name || '');
            const rawItems = (!result?.items || result.items.length === 0) ? parseRawItems(result?.raw_text) : result.items;
            setScannedData({
                ...result,
                items: rawItems || [],
                receipt_type: result?.receipt_type || inferredType
            });
            setStatus('review');
        } catch (err) {
            console.error(err);
            setErrorMsg('Error al procesar la imagen. Intenta nuevamente.');
            setStatus('error');
        }
    };

    const parseNumber = (value) => {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number') return value;
        const normalized = String(value).replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(normalized);
        return Number.isNaN(parsed) ? 0 : parsed;
    };

    const aliasStorageKey = 'receipt_aliases_v1';
    const readAliasMap = () => {
        try {
            const raw = window.localStorage.getItem(aliasStorageKey);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    };
    const writeAliasMap = (next) => {
        try {
            window.localStorage.setItem(aliasStorageKey, JSON.stringify(next));
        } catch (e) {
            // ignore
        }
    };

    const handleConfirm = async () => {
        if (!scannedData || !scannedData.receipt_id) return;

        setStatus('confirming');
        setConfirming(true);
        try {
            // Prepare confirmation data in the format expected by backend
            const confirmData = {
                store_name: scannedData.merchant || '',
                store_rut: scannedData.store_rut || '',
                receipt_type: scannedData.receipt_type || '',
                date: scannedData.date || new Date().toISOString().split('T')[0],
                total: parseNumber(scannedData.total),
                items: scannedData.items ? scannedData.items.map(i => ({
                    id: i.id,
                    name_raw: i.name_raw,
                    name_clean: i.name_clean || null,
                    name_brand: i.name_brand || null,
                    qty: parseNumber(i.qty) || 1,
                    unit_price: parseNumber(i.unit_price) || 0,
                    discount: parseNumber(i.discount) || 0,
                    line_total: parseNumber(i.line_total) || 0
                })) : []
            };

            await confirmReceipt(scannedData.receipt_id, confirmData);
            setStatus('success');
            setTimeout(() => {
                setStatus('idle');
                setScannedData(null);
                setActiveTab('upload'); // Return to upload screen after success
            }, 1500);
        } catch (err) {
            console.error(err);
            setErrorMsg('Error al confirmar. Intenta nuevamente.');
            setStatus('review');
        } finally {
            setConfirming(false);
        }
    };

    const loadStores = async () => {
        try {
            const data = await getStores();
            setStores((data || []).filter((store) => {
                const name = (store?.name || '').trim().toLowerCase();
                if (!name) return false;
                return !['sin nombre', 'desconocida', 'tienda desconocida'].includes(name);
            }));
        } catch (e) {
            console.error('Error loading stores', e);
            setStores([]);
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab === 'history' || tab === 'list' || tab === 'upload' || tab === 'ahorro') {
            setActiveTab(tab);
        }
    }, [location.search]);

    useEffect(() => {
        if (status === 'review') {
            loadStores();
        }
    }, [status]);

    const handleRetry = () => {
        setScannedData(null);
        setStatus('idle');
        setErrorMsg('');
    };

    // MANUAL MODAL HANDLERS
    const openManualModal = () => {
        setManualData({ store: '', total: '', date: new Date().toISOString().split('T')[0], items: [] });
        setManualModalOpen(true);
    };

    const handleManualStoreChange = (e) => {
        const value = e.target.value;
        setManualData({ ...manualData, store: value });

        if (value.length > 1) {
            const filtered = patterns.filter(p =>
                p.store_name && p.store_name.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredPatterns(filtered);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectPattern = (pattern) => {
        setManualData({
            ...manualData,
            store: pattern.store_name,
            total: pattern.avg_amount || pattern.last_amount || '',
            // If we had categories in manualData, we would set it here too
        });
        setShowSuggestions(false);
    };

    const handleManualSubmit = async () => {
        if (!manualData.store || !manualData.total) return;

        setStatus('confirming');
        setConfirming(true);
        setManualModalOpen(false);

        try {
            await createManualReceipt({
                store_name: manualData.store,
                date: manualData.date || new Date().toISOString().split('T')[0],
                total: parseNumber(manualData.total),
                items: []
            });
            setStatus('success');
            setTimeout(() => {
                setStatus('idle');
                setActiveTab('list'); // Go to list to see it? or stay? history better.
            }, 1500);
        } catch (e) {
            console.error(e);
            setErrorMsg('Error al crear gasto manual');
            setStatus('error');
        } finally {
            setConfirming(false);
        }
    };

    // --- RENDERERS ---

    const renderIdle = () => (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <div
                className="household-card green"
                style={{
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    cursor: 'pointer'
                }}
                onClick={() => fileInputRef.current.click()}
            >
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>{'\uD83D\uDCF8'}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Subir Foto</div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '8px' }}>La IA analizara el contenido</div>
            </div>

            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileUpload}
            />

            <button
                style={{ marginTop: '20px', padding: '12px 24px', background: 'transparent', border: '1px solid var(--color-text-dim)', color: 'var(--color-text-dim)', borderRadius: '8px', width: '100%' }}
                onClick={openManualModal}
            >
                {'\u2328'} Ingreso Manual
            </button>
        </div>
    );

    // ... Other render methods (Uploading, Review, Success, Error) same as before ... 
    // Copied for brevity but included in full file writing.

    const renderUploading = () => (
        <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <div style={{ fontSize: '3rem', animation: 'spin 1s infinite linear' }}>{'\u23F3'}</div>
            <h3 style={{ marginTop: '20px', color: 'var(--color-text-main)' }}>Analizando boleta...</h3>
            <p style={{ color: 'var(--color-text-dim)' }}>Esto tomara unos segundos</p>
            <div style={{ marginTop: '16px' }}>
                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                        style={{
                            width: '40%',
                            height: '100%',
                            background: 'var(--status-green-main)',
                            animation: 'progress-indeterminate 1.2s infinite linear'
                        }}
                    />
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                    Extrayendo datos...
                </div>
            </div>
        </div>
    );

    const renderConfirming = () => (
        <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <div style={{ fontSize: '3rem', animation: 'spin 1s infinite linear' }}>{'\u23F3'}</div>
            <h3 style={{ marginTop: '20px', color: 'var(--color-text-main)' }}>Guardando cambios...</h3>
            <p style={{ color: 'var(--color-text-dim)' }}>Estamos confirmando la boleta</p>
        </div>
    );

    const handleItemChange = (index, field, value) => {
        const newItems = [...scannedData.items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Auto-calc logic if needed
        if (field === 'line_total' || field === 'qty' || field === 'discount') {
            const t = field === 'line_total' ? Number(value) : Number(newItems[index].line_total);
            const q = field === 'qty' ? Number(value) : Number(newItems[index].qty);
            const d = field === 'discount' ? Number(value) : Number(newItems[index].discount || 0);
            if (q > 0) newItems[index].unit_price = (t + (d || 0)) / q;
        }
        if (field === 'unit_price' || field === 'qty' || field === 'discount') {
            const p = field === 'unit_price' ? Number(value) : Number(newItems[index].unit_price);
            const q = field === 'qty' ? Number(value) : Number(newItems[index].qty);
            const d = field === 'discount' ? Number(value) : Number(newItems[index].discount || 0);
            if (q > 0) newItems[index].line_total = (p * q) - (d || 0);
        }

        // Recalculate global total
        const newTotal = newItems.reduce((sum, item) => sum + (Number(item.line_total) || 0), 0);

        setScannedData({ ...scannedData, items: newItems, total: newTotal });
    };

    const addManualItem = () => {
        const items = Array.isArray(scannedData.items) ? [...scannedData.items] : [];
        items.push({
            id: `manual-${Date.now()}`,
            name_raw: '',
            name_clean: '',
            name_brand: '',
            qty: 1,
            unit_price: 0,
            discount: 0,
            line_total: 0
        });
        setScannedData({ ...scannedData, items });
    };

    const normalizeText = (value) => {
        return (value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const suggestNormalization = (raw) => {
        const text = normalizeText(raw);
        if (!text) return null;
        const aliasMap = readAliasMap();
        const cached = aliasMap[text];
        if (cached?.clean) return { clean: cached.clean, brand: cached.brand || '' };
        const inList = (rule) => rule.match.some((token) => text.includes(token));
        const rule = RECEIPT_ALIASES.find(inList) || RECEIPT_FALLBACKS.find(inList);
        if (!rule) return null;
        return { clean: rule.clean, brand: rule.brand || '' };
    };

    const applyNormalization = (index, cleanName, brandName) => {
        const newItems = [...scannedData.items];
        newItems[index] = { ...newItems[index], name_clean: cleanName, name_brand: brandName };
        setScannedData({ ...scannedData, items: newItems });
        const key = normalizeText(newItems[index].name_raw || '');
        if (key) {
            const aliasMap = readAliasMap();
            aliasMap[key] = { clean: cleanName, brand: brandName || '' };
            writeAliasMap(aliasMap);
        }
    };
    const applyNormalizationBulk = (rawName, cleanName, brandName) => {
        const newItems = scannedData.items.map((item) => {
            if (normalizeText(item.name_raw) !== normalizeText(rawName)) return item;
            return { ...item, name_clean: cleanName, name_brand: brandName };
        });
        setScannedData({ ...scannedData, items: newItems });
        const key = normalizeText(rawName || '');
        if (key) {
            const aliasMap = readAliasMap();
            aliasMap[key] = { clean: cleanName, brand: brandName || '' };
            writeAliasMap(aliasMap);
        }
    };

    useEffect(() => {
        if (!scannedData || !Array.isArray(scannedData.items) || scannedData.items.length === 0) return;
        const aliasMap = readAliasMap();
        if (!aliasMap || Object.keys(aliasMap).length === 0) return;
        let changed = false;
        const nextItems = scannedData.items.map((item) => {
            if (item.name_clean) return item;
            const key = normalizeText(item.name_raw || '');
            const cached = aliasMap[key];
            if (!cached?.clean) return item;
            changed = true;
            return { ...item, name_clean: cached.clean, name_brand: cached.brand || '' };
        });
        if (changed) {
            setScannedData((prev) => (prev ? { ...prev, items: nextItems } : prev));
        }
    }, [scannedData]);

    const renderReview = () => (
        <div style={{ marginTop: '20px' }}>
            <h2 className="section-title" style={{ fontSize: '1rem', textAlign: 'center', marginBottom: '20px' }}>CONFIRMAR DATOS DETECTADOS</h2>

            <div className="spending-card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: 'var(--color-text-dim)' }}>Tienda</span>
                        <input
                            type="text"
                            value={scannedData.merchant || ''}
                            onChange={(e) => setScannedData({ ...scannedData, merchant: e.target.value })}
                            list="store-options"
                            style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '6px' }}
                        />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: 'var(--color-text-dim)' }}>RUT empresa</span>
                        <input
                            type="text"
                            value={scannedData.store_rut || ''}
                            onChange={(e) => setScannedData({ ...scannedData, store_rut: e.target.value })}
                            placeholder="Ej: 76.123.456-7"
                            style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '6px' }}
                        />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: 'var(--color-text-dim)' }}>Tipo de compra</span>
                        <select
                            value={scannedData.receipt_type || ''}
                            onChange={(e) => setScannedData({ ...scannedData, receipt_type: e.target.value })}
                            style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '6px' }}
                        >
                            <option value="">Sin tipo</option>
                            <option value="alimentos">Alimentos</option>
                            <option value="hogar">Hogar</option>
                            <option value="ferreteria">Ferretería</option>
                            <option value="servicios">Servicios</option>
                            <option value="combustible">Combustible</option>
                            <option value="salud">Salud</option>
                            <option value="libreria">Librería</option>
                            <option value="otros">Otros</option>
                        </select>
                    </label>
                    <datalist id="store-options">
                        {stores.map((s) => (
                            <option key={s.id} value={s.name || ''} />
                        ))}
                    </datalist>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: 'var(--color-text-dim)' }}>Fecha</span>
                        <input
                            type="date"
                            value={scannedData.date || ''}
                            onChange={(e) => setScannedData({ ...scannedData, date: e.target.value })}
                            style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '6px' }}
                        />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: 'var(--color-text-dim)' }}>Total</span>
                        <input
                            type="number"
                            value={scannedData.total ?? ''}
                            onChange={(e) => setScannedData({ ...scannedData, total: Number(e.target.value) })}
                            style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '6px' }}
                            placeholder="$"
                        />
                    </label>
                </div>

                {/* ITEMS LIST START */}
                <div style={{ margin: '20px 0', borderTop: '1px dashed var(--border-light)', paddingTop: '12px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>ITEMS</span>
                        <button
                            onClick={addManualItem}
                            style={{ padding: '2px 8px', borderRadius: '999px', border: '1px solid #ddd', background: '#f8fafc', fontSize: '0.75rem' }}
                        >
                            + Agregar item
                        </button>
                    </div>
                    {(!scannedData.items || scannedData.items.length === 0) && (
                        <div style={{ fontStyle: 'italic', color: '#aaa', fontSize: '0.8rem' }}>
                            No se detectaron items. Agrega manualmente si lo necesitas.
                        </div>
                    )}
                    {(!scannedData.items || scannedData.items.length === 0) && scannedData.raw_text && (
                        <button
                            onClick={() => {
                                const parsed = parseRawItems(scannedData.raw_text);
                                setScannedData({ ...scannedData, items: parsed });
                            }}
                            style={{ marginTop: '8px', padding: '4px 8px', borderRadius: '999px', border: '1px solid #ddd', background: '#f8fafc', fontSize: '0.75rem' }}
                        >
                            Reintentar detectar items
                        </button>
                    )}
                    {scannedData.items && scannedData.items.map((item, idx) => {
                        const suggestion = suggestNormalization(item.name_raw);
                        const showSuggestion =
                            suggestion && (!item.name_clean || normalizeText(item.name_clean) !== normalizeText(suggestion.clean));

                        return (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', borderBottom: '1px dashed var(--border-light)', paddingBottom: '10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <input
                                        type="text"
                                        value={item.name_raw}
                                        onChange={(e) => handleItemChange(idx, 'name_raw', e.target.value)}
                                        style={{ width: '100%', border: '1px solid #eee', padding: '6px', borderRadius: '6px' }}
                                    />
                                    {showSuggestion && (
                                        <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--color-text-dim)', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                            <span>
                                                Sugerencia: <strong>{suggestion.clean}</strong>{suggestion.brand ? ` · ${suggestion.brand}` : ''}
                                            </span>
                                            <button
                                                onClick={() => applyNormalization(idx, suggestion.clean, suggestion.brand || '')}
                                                style={{ padding: '2px 8px', borderRadius: '999px', border: '1px solid #ddd', background: '#f8fafc', fontSize: '0.75rem' }}
                                            >
                                                Aplicar
                                            </button>
                                            <button
                                                onClick={() => applyNormalizationBulk(item.name_raw, suggestion.clean, suggestion.brand || '')}
                                                style={{ padding: '2px 8px', borderRadius: '999px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}
                                            >
                                                Aplicar a todos
                                            </button>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <input
                                            type="text"
                                            value={item.name_clean || ''}
                                            onChange={(e) => applyNormalization(idx, e.target.value, item.name_brand || '')}
                                            placeholder="Nombre limpio"
                                            style={{ flex: 1, minWidth: 0, border: '1px solid #eee', padding: '6px', borderRadius: '6px', fontSize: '0.85rem' }}
                                        />
                                        <input
                                            type="text"
                                            value={item.name_brand || ''}
                                            onChange={(e) => applyNormalization(idx, item.name_clean || '', e.target.value)}
                                            placeholder="Marca (opcional)"
                                            style={{ flex: 1, minWidth: 0, border: '1px solid #eee', padding: '6px', borderRadius: '6px', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <input
                                            type="number"
                                            value={item.qty}
                                            onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                                            style={{ width: '64px', border: '1px solid #eee', padding: '6px', textAlign: 'center', fontSize: '0.9rem', borderRadius: '6px' }}
                                        />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>cantidad</span>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                        Precio unitario
                                        <input
                                            type="number"
                                            value={item.unit_price || ''}
                                            onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                                            style={{ width: '100%', border: '1px solid #eee', padding: '6px', borderRadius: '6px', textAlign: 'right' }}
                                            placeholder="$"
                                        />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                        Descuento
                                        <input
                                            type="number"
                                            value={item.discount || ''}
                                            onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                                            style={{ width: '100%', border: '1px solid #eee', padding: '6px', borderRadius: '6px', textAlign: 'right' }}
                                            placeholder="$"
                                        />
                                    </label>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                        Total
                                        <input
                                            type="number"
                                            value={item.line_total || ''}
                                            onChange={(e) => handleItemChange(idx, 'line_total', e.target.value)}
                                            style={{ width: '100%', border: '1px solid #eee', padding: '6px', borderRadius: '6px', textAlign: 'right', fontWeight: 'bold' }}
                                            placeholder="$"
                                        />
                                    </label>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {/* ITEMS LIST END */}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
                    <span style={{ fontWeight: 'bold' }}>TOTAL</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--status-green-main)' }}>
                        ${scannedData.total?.toLocaleString('es-CL') || '0'}
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                <button
                    onClick={handleRetry}
                    disabled={confirming}
                    style={{
                        flex: 1,
                        padding: '16px',
                        background: '#FED7D7',
                        color: '#C53030',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: confirming ? 'not-allowed' : 'pointer',
                        opacity: confirming ? 0.6 : 1
                    }}
                >
                    {'\u274C'} Rechazar
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    style={{
                        flex: 1,
                        padding: '16px',
                        background: confirming ? '#9AE6B4' : 'var(--status-green-main)',
                        color: 'white',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: confirming ? 'not-allowed' : 'pointer',
                        opacity: confirming ? 0.8 : 1
                    }}
                >
                    {confirming ? 'Guardando...' : `${'\u2705'} Confirmar`}
                </button>
            </div>
        </div>
    );

    const renderSuccess = () => (
        <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <div style={{ fontSize: '4rem', color: 'var(--status-green-main)' }}>{'\u2705'}</div>
            <h3 style={{ marginTop: '20px', color: 'var(--color-text-main)' }}>Guardado!</h3>
        </div>
    );

    const renderError = () => (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>{'\uD83D\uDE15'}</div>
            <h3 style={{ color: 'var(--status-red-main)' }}>Algo salio mal</h3>
            <p style={{ color: 'var(--color-text-dim)', marginBottom: '30px' }}>{errorMsg}</p>
            <button
                onClick={handleRetry}
                style={{ padding: '12px 24px', background: 'var(--color-text-main)', color: 'white', border: 'none', borderRadius: '8px' }}
            >
                Intentar de nuevo
            </button>
        </div>
    );

    const subtitleByTab = {
        upload: 'Registro rapido de boletas',
        list: 'Lista de compras',
        history: 'Historial de boletas',
        ahorro: 'Sugerencias de ahorro',
        prices: 'Consulta de precios'
    };
    const subtitle = subtitleByTab[activeTab] || 'Compras';

    return (
        <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', minHeight: 'calc(100vh - var(--topbar-height, 72px) - var(--bottomnav-height, 96px))', backgroundColor: '#fff' }}>
            <PillTabs
                items={[
                    { label: 'Registro', path: '/receipts?tab=upload', icon: '\uD83E\uDDFE' },
                    { label: 'Lista', path: '/receipts?tab=list', icon: '\u2705' },
                    { label: 'Precios', path: '/products', icon: '\uD83C\uDFF7\uFE0F' },
                    { label: 'Tiendas', path: '/stores', icon: '\uD83C\uDFEA' },
                    { label: 'Historial', path: '/receipts?tab=history', icon: '\uD83D\uDD52' },
                    { label: 'Ahorro', path: '/receipts?tab=ahorro', icon: '\uD83D\uDCB0' }
                ]}
            />
            {confirming && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        padding: '20px 24px',
                        borderRadius: '12px',
                        boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
                        textAlign: 'center',
                        minWidth: '220px'
                    }}>
                        <div style={{ fontSize: '2rem', animation: 'spin 1s infinite linear' }}>{'\u23F3'}</div>
                        <div style={{ marginTop: '8px', fontWeight: '700' }}>Confirmando boleta...</div>
                        <div style={{ marginTop: '4px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                            Esto puede tardar unos segundos
                        </div>
                    </div>
                </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <button
                    onClick={() => navigate('/')}
                    style={{ background: 'transparent', fontSize: '1.2rem', padding: '0 10px 0 0', border: 'none' }}
                >
                    {'\u2190'}
                </button>
                <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>Compras</h2>
                    <div className="page-subtitle">{subtitle}</div>
                </div>
            </div>

            {activeTab === 'upload' ? (
                <>
                    {status === 'idle' && renderIdle()}
                    {status === 'uploading' && renderUploading()}
                    {status === 'confirming' && renderConfirming()}
                    {status === 'review' && renderReview()}
                    {status === 'success' && renderSuccess()}
                    {status === 'error' && renderError()}
                </>
            ) : activeTab === 'history' ? (
                <ReceiptHistory />
            ) : (
                <ShoppingList mode={activeTab === 'ahorro' ? 'ahorro' : 'list'} />
            )}

            {/* MANUAL ENTRY MODAL */}
            {manualModalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '360px' }}>
                        <h3 style={{ marginTop: 0 }}>Gasto Manual</h3>

                        <div style={{ marginBottom: '15px', position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Tienda / Concepto</label>
                            <input
                                value={manualData.store}
                                onChange={handleManualStoreChange}
                                onFocus={() => {
                                    if (manualData.store.length > 1 && filteredPatterns.length > 0) setShowSuggestions(true);
                                }}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                placeholder="Ej. Panadería, Lider, Copec..."
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                            {showSuggestions && filteredPatterns.length > 0 && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0,
                                    background: 'white', border: '1px solid #ddd', borderRadius: '8px',
                                    marginTop: '4px', maxHeight: '150px', overflowY: 'auto', zIndex: 10,
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                }}>
                                    {filteredPatterns.map((p, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => selectPattern(p)}
                                            style={{ padding: '8px 12px', borderBottom: '1px solid #eee', cursor: 'pointer' }}
                                        >
                                            <div style={{ fontWeight: '600' }}>{p.store_name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                                Sugerido: ${Math.round(p.avg_amount || 0).toLocaleString('es-CL')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Monto</label>
                                <input
                                    type="number"
                                    value={manualData.total}
                                    onChange={(e) => setManualData({ ...manualData, total: e.target.value })}
                                    placeholder="$"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Fecha</label>
                                <input
                                    type="date"
                                    value={manualData.date}
                                    onChange={(e) => setManualData({ ...manualData, date: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setManualModalOpen(false)}
                                style={{ flex: 1, padding: '12px', background: '#f5f5f5', border: 'none', borderRadius: '8px' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleManualSubmit}
                                style={{ flex: 1, padding: '12px', background: 'var(--status-green-main)', color: 'white', border: 'none', borderRadius: '8px' }}
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Receipts;









