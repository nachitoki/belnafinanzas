import React, { useMemo, useState, useEffect } from 'react';
import { getReceipts, getReceipt, confirmReceipt, rejectReceipt, getStores } from '../../services/api';

const ReceiptHistory = () => {
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saving, setSaving] = useState(false);
    const [apiUnavailable, setApiUnavailable] = useState(false);
    const [authRequired, setAuthRequired] = useState(false);
    const [stores, setStores] = useState([]);
    const [filterStore, setFilterStore] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const cachedRaw = window.localStorage.getItem('receipts_cache_v1');
        if (cachedRaw) {
            try {
                const cached = JSON.parse(cachedRaw);
                if (cached?.data && Array.isArray(cached.data)) {
                    setReceipts(cached.data);
                    setLoading(false);
                }
            } catch (e) {
                console.warn('Invalid receipts cache', e);
            }
        }
        fetchReceipts();
        fetchStores();
    }, []);

    const fetchReceipts = async () => {
        try {
            const data = await getReceipts();
            setReceipts(data);
            window.localStorage.setItem('receipts_cache_v1', JSON.stringify({ ts: Date.now(), data }));
            setApiUnavailable(false);
            setAuthRequired(false);
        } catch (e) {
            console.error("Error fetching list", e);
            const status = e.response?.status;
            if (status === 401 || status === 403) {
                setReceipts([]);
                setAuthRequired(true);
                setApiUnavailable(false);
                return;
            }
            setReceipts([]);
            setApiUnavailable(true);
            setAuthRequired(false);
        } finally {
            setLoading(false);
        }
    };

    const fetchStores = async () => {
        try {
            const data = await getStores();
            setStores(data || []);
        } catch (e) {
            console.error('Error loading stores', e);
            setStores([]);
        }
    };

    const handleEditClick = async (receipt) => {
        setEditingId(receipt.id);
        setEditForm({ ...receipt, items: [] });
        setLoadingDetail(true);

        try {
            // Fetch full details including items
            const detail = await getReceipt(receipt.id);
            const normalizedItems = (detail.items || []).map((item) => {
                const qty = item.qty ?? 1;
                const lineTotal = item.line_total ?? (item.unit_price && qty ? qty * item.unit_price : 0);
                const unitPrice = item.unit_price ?? (qty ? lineTotal / qty : lineTotal);
                return {
                    ...item,
                    qty,
                    unit_price: unitPrice,
                    line_total: lineTotal
                };
            });
            setEditForm({ ...detail, items: normalizedItems });
        } catch (e) {
            console.error("Error fetching detail", e);
            setEditForm({ ...receipt, items: [] });
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleItemChange = (idx, field, value) => {
        const newItems = [...(editForm.items || [])];
        newItems[idx] = { ...newItems[idx], [field]: value };

        // Auto-calc line total if price/qty changes
        if (field === 'qty' || field === 'unit_price' || field === 'discount') {
            const qty = field === 'qty' ? parseNumber(value) : parseNumber(newItems[idx].qty);
            const price = field === 'unit_price' ? parseNumber(value) : parseNumber(newItems[idx].unit_price);
            const discount = field === 'discount' ? parseNumber(value) : parseNumber(newItems[idx].discount || 0);
            newItems[idx].line_total = (qty * price) - (discount || 0);
        }

        let nextTotal = editForm.total;
        if (field === 'qty' || field === 'unit_price' || field === 'line_total') {
            nextTotal = newItems.reduce((acc, item) => {
                const qty = parseNumber(item.qty);
                const unitPrice = parseNumber(item.unit_price);
                const lineTotal = parseNumber(item.line_total);
                return acc + (lineTotal || (qty * unitPrice) || 0);
            }, 0);
        }

        setEditForm({ ...editForm, items: newItems, total: nextTotal });
    };

    const bumpQty = (idx, delta) => {
        const item = (editForm.items || [])[idx];
        if (!item) return;
        const current = parseNumber(item.qty || 0);
        const next = Math.max(0, current + delta);
        handleItemChange(idx, 'qty', next);
    };

    const normalizeDateInput = (value) => {
        if (!value) return '';
        if (value.includes('T')) return value.split('T')[0];
        if (value.includes('-') && value.length === 10) {
            const [a, b, c] = value.split('-');
            if (a.length === 4) return value; // YYYY-MM-DD
            return `${c}-${b}-${a}`; // DD-MM-YYYY -> YYYY-MM-DD
        }
        if (value.includes('/')) {
            const [a, b, c] = value.split('/');
            if (a.length === 4) return value.replace(/\//g, '-');
            return `${c}-${b}-${a}`; // DD/MM/YYYY -> YYYY-MM-DD
        }
        return value;
    };

    const formatDisplayDate = (value) => {
        if (!value) return '';
        const normalized = normalizeDateInput(value);
        if (!normalized || !normalized.includes('-')) return value;
        const [y, m, d] = normalized.split('-');
        if (!y || !m || !d) return value;
        return `${d}-${m}-${y}`;
    };

    const receiptTypeMeta = (type) => {
        const key = (type || '').toLowerCase();
        const map = {
            alimentos: { label: 'Alimentos', bg: '#DCFCE7', color: '#166534' },
            hogar: { label: 'Hogar', bg: '#E0F2FE', color: '#075985' },
            ferreteria: { label: 'Ferretería', bg: '#FEF3C7', color: '#92400E' },
            servicios: { label: 'Servicios', bg: '#EDE9FE', color: '#5B21B6' },
            combustible: { label: 'Combustible', bg: '#FFE4E6', color: '#9F1239' },
            salud: { label: 'Salud', bg: '#DCFCE7', color: '#166534' },
            libreria: { label: 'Librería', bg: '#FEE2E2', color: '#991B1B' },
            otros: { label: 'Otros', bg: '#E2E8F0', color: '#475569' }
        };
        return map[key] || null;
    };

    const parseNumber = (value) => {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number') return value;
        const normalized = String(value).replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(normalized);
        return Number.isNaN(parsed) ? 0 : parsed;
    };

    const normalizeText = (value) => (value || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const filteredReceipts = useMemo(() => {
        const q = normalizeText(search);
        return (receipts || []).filter((receipt) => {
            if (filterStore) {
                const storeName = normalizeText(receipt.store_name || receipt.merchant || '');
                if (storeName != normalizeText(filterStore)) return false;
            }
            if (filterStatus !== 'all') {
                if ((receipt.status || '').toLowerCase() !== filterStatus) return false;
            }
            if (filterType !== 'all') {
                if ((receipt.receipt_type || '').toLowerCase() !== filterType) return false;
            }
            if (q) {
                const hay = [
                    receipt.store_name,
                    receipt.merchant,
                    receipt.store_rut,
                    receipt.receipt_type
                ].map(normalizeText).join(' ');
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [receipts, filterStore, filterStatus, filterType, search]);


    const handleSave = async () => {
        try {
            setSaving(true);
            // Prepare data in the format expected by the backend
            const confirmData = {
                store_name: editForm.store_name || '',
                store_rut: editForm.store_rut || '',
                receipt_type: editForm.receipt_type || '',
                date: normalizeDateInput(editForm.date || ''),
                total: parseNumber(editForm.total),
                items: (editForm.items || []).map(item => ({
                    id: item.id,
                    name_raw: item.name_raw,
                    qty: parseNumber(item.qty) || 1,
                    unit_price: parseNumber(item.unit_price) || 0,
                    discount: parseNumber(item.discount) || 0,
                    line_total: parseNumber(item.line_total) || 0
                }))
            };

            await confirmReceipt(editingId, confirmData);

            // Close edit mode first
            setEditingId(null);
            setEditForm({});

            // Show success feedback
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);

            // Refresh list to show updated data
            await fetchReceipts();
        } catch (e) {
            console.error('Error saving changes:', e);
            const detail = e.response?.data?.detail;
            const errorMsg = typeof detail === 'object' ? JSON.stringify(detail) : (detail || e.message || 'Error desconocido');
            alert('Error al guardar: ' + errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (receiptId) => {
        const receipt = receipts.find(r => r.id === receiptId);
        if (!window.confirm('Eliminar esta boleta?')) return;
        try {
            await rejectReceipt(receiptId);
            await fetchReceipts();
        } catch (e) {
            console.error('Error deleting receipt:', e);
            const errorMsg = e.response?.data?.detail || e.message || 'Error desconocido';
            alert('Error al eliminar: ' + errorMsg);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm({});
    };

    if (loading) return <div className="loading-text">Cargando historial...</div>;

    return (
        <div style={{ paddingBottom: '80px' }}>
            {saving && (
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
                        <div style={{ fontSize: '2rem', animation: 'spin 1s infinite linear' }}>...</div>
                        <div style={{ marginTop: '8px', fontWeight: '700' }}>Guardando cambios...</div>
                        <div style={{ marginTop: '4px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                            Esto puede tardar unos segundos
                        </div>
                    </div>
                </div>
            )}
            {authRequired && (
                <div style={{
                    position: 'sticky',
                    top: '0',
                    background: '#FEE2E2',
                    color: '#991B1B',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    fontSize: '0.85rem'
                }}>
                    Backend exige autenticacion. Configura el entorno en modo desarrollo o agrega token.
                </div>
            )}
            {apiUnavailable && (
                <div style={{
                    position: 'sticky',
                    top: '0',
                    background: '#FEF3C7',
                    color: '#92400E',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    fontSize: '0.85rem'
                }}>
                    Backend no disponible. No se pueden guardar cambios.
                </div>
            )}
            {saveSuccess && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--status-green-main)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    fontWeight: 'bold'
                }}>
                    Cambios guardados exitosamente
                </div>
            )}
            <div className="spending-card" style={{ marginTop: '10px' }}>
                <div style={{ fontWeight: '700', marginBottom: '8px' }}>Filtros</div>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar tienda, RUT o tipo"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <select
                        value={filterStore}
                        onChange={(e) => setFilterStore(e.target.value)}
                        style={{ flex: 1, minWidth: '140px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                    >
                        <option value="">Todas las tiendas</option>
                        {stores.map((s) => (
                            <option key={s.id} value={s.name || ''}>{s.name}</option>
                        ))}
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{ flex: 1, minWidth: '140px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                    >
                        <option value="all">Todos los estados</option>
                        <option value="confirmed">Confirmados</option>
                        <option value="review">Revisar</option>
                    </select>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{ flex: 1, minWidth: '140px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                    >
                        <option value="all">Todos los tipos</option>
                        <option value="alimentos">Alimentos</option>
                        <option value="hogar">Hogar</option>
                        <option value="ferreteria">Ferreter?a</option>
                        <option value="servicios">Servicios</option>
                        <option value="combustible">Combustible</option>
                        <option value="salud">Salud</option>
                        <option value="libreria">Librer?a</option>
                        <option value="otros">Otros</option>
                    </select>
                </div>
                {(filterStore || filterStatus !== 'all' || filterType !== 'all' || search) && (
                    <button
                        onClick={() => {
                            setFilterStore('');
                            setFilterStatus('all');
                            setFilterType('all');
                            setSearch('');
                        }}
                        style={{ marginTop: '8px', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#f8fafc' }}
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            <h3 className="section-title" style={{ textAlign: 'center', marginTop: '20px' }}>ULTIMOS MOVIMIENTOS</h3>

            {filteredReceipts.length === 0 && (
                <p style={{ textAlign: 'center', color: '#aaa' }}>
                    {receipts.length === 0 ? 'Sin movimientos recientes.' : 'Sin resultados con estos filtros.'}
                </p>
            )}

            {filteredReceipts.map(receipt => (
                <div key={receipt.id} className="spending-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {editingId === receipt.id ? (
                        // EDIT MODE
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 'bold' }}>Editando Boleta</span>
                                {editForm.receipt_type && (() => {
                                    const meta = receiptTypeMeta(editForm.receipt_type);
                                    if (!meta) return null;
                                    return (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '2px 8px',
                                            borderRadius: '999px',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            background: meta.bg,
                                            color: meta.color
                                        }}>
                                            {meta.label}
                                        </span>
                                    );
                                })()}
                                {loadingDetail && <span>... Cargando detalle...</span>}
                            </div>

                            {/* Header Fields */}
                            <div style={{ display: 'grid', gap: '10px' }}>
                                <input
                                    value={editForm.store_name || ''}
                                    onChange={e => setEditForm({ ...editForm, store_name: e.target.value })}
                                    placeholder="Tienda"
                                    list="store-options-edit"
                                    style={{ flex: 1, width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                />
                                <datalist id="store-options-edit">
                                    {stores.map((s) => (
                                        <option key={s.id} value={s.name || ''} />
                                    ))}
                                </datalist>
                                <input
                                    value={editForm.store_rut || ''}
                                    onChange={e => setEditForm({ ...editForm, store_rut: e.target.value })}
                                    placeholder="RUT empresa"
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                />
                                <select
                                    value={editForm.receipt_type || ''}
                                    onChange={e => setEditForm({ ...editForm, receipt_type: e.target.value })}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
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
                                <input
                                    value={normalizeDateInput(editForm.date || '')}
                                    type="date"
                                    onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                />
                            </div>
                            {editForm.image_url && (
                                <button
                                    onClick={() => window.open(editForm.image_url, '_blank')}
                                    style={{ padding: '8px 10px', background: '#edf2f7', border: '1px solid #cbd5e0', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    Ver imagen
                                </button>
                            )}

                            {/* Items List */}
                            <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                                <h4 style={{ fontSize: '0.8rem', color: '#666', marginBottom: '8px' }}>DETALLE PRODUCTOS</h4>
                                {(!editForm.items || editForm.items.length === 0) && !loadingDetail && (
                                    <div style={{ fontStyle: 'italic', color: '#aaa', fontSize: '0.8rem' }}>No hay items detectados.</div>
                                )}

                                {editForm.items && editForm.items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
                                        <input
                                            value={item.name_raw}
                                            onChange={e => handleItemChange(idx, 'name_raw', e.target.value)}
                                            style={{ flex: 2, padding: '5px', fontSize: '0.8rem', border: '1px solid #ddd', borderRadius: '4px' }}
                                            placeholder="Producto"
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <button
                                                onClick={() => bumpQty(idx, -1)}
                                                style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #ddd', background: '#f8fafc', cursor: 'pointer' }}
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                value={item.qty}
                                                onChange={e => handleItemChange(idx, 'qty', e.target.value)}
                                                style={{ width: '44px', padding: '5px', fontSize: '0.8rem', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }}
                                                placeholder="#"
                                            />
                                            <button
                                                onClick={() => bumpQty(idx, 1)}
                                                style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #ddd', background: '#f8fafc', cursor: 'pointer' }}
                                            >
                                                +
                                            </button>
                                        </div>
                                        <input
                                            type="number"
                                            value={item.unit_price}
                                            onChange={e => handleItemChange(idx, 'unit_price', e.target.value)}
                                            style={{ width: '70px', padding: '5px', fontSize: '0.8rem', border: '1px solid #ddd', borderRadius: '4px' }}
                                            placeholder="$ unit"
                                        />
                                        <input
                                            type="number"
                                            value={item.discount || ''}
                                            onChange={e => handleItemChange(idx, 'discount', e.target.value)}
                                            style={{ width: '70px', padding: '5px', fontSize: '0.8rem', border: '1px solid #ddd', borderRadius: '4px' }}
                                            placeholder="desc."
                                        />
                                        <div style={{ width: '60px', fontSize: '0.8rem', textAlign: 'right', fontWeight: 'bold' }}>
                                            ${Number(item.line_total || (item.qty * item.unit_price) || 0).toLocaleString('es-CL')}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Total and Actions */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                <span>TOTAL CALCULADO:</span>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>${(editForm.total || 0).toLocaleString('es-CL')}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: saving ? '#9AE6B4' : 'var(--status-green-main)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        opacity: saving ? 0.8 : 1
                                    }}
                                >
                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={saving}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: '#e2e8f0',
                                        color: '#4a5568',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        opacity: saving ? 0.6 : 1
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button onClick={() => handleDelete(receipt.id)} style={{ padding: '10px', background: '#FED7D7', color: '#C53030', border: 'none', borderRadius: '6px' }}>Eliminar</button>
                            </div>
                        </div>
                    ) : (
                        // VIEW MODE
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 'bold' }}>{receipt.store_name || receipt.merchant}</div>
                                {receipt.store_rut && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{receipt.store_rut}</div>
                                )}
                                {receipt.receipt_type && (() => {
                                    const meta = receiptTypeMeta(receipt.receipt_type);
                                    if (!meta) return (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                            {receipt.receipt_type}
                                        </div>
                                    );
                                    return (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            marginTop: '4px',
                                            padding: '2px 8px',
                                            borderRadius: '999px',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            background: meta.bg,
                                            color: meta.color
                                        }}>
                                            {meta.label}
                                        </span>
                                    );
                                })()}
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{formatDisplayDate(receipt.date)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 'bold', color: 'var(--status-green-main)' }}>
                                    ${Number(receipt.total).toLocaleString('es-CL')}
                                </div>
                                <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                    <span style={{
                                        color: receipt.status === 'confirmed' ? 'green' : 'orange',
                                        textTransform: 'capitalize'
                                    }}>
                                    {receipt.status === 'confirmed' ? 'OK' : 'Revisar'}
                                    </span>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <button
                                            onClick={() => handleEditClick(receipt)}
                                            style={{ background: '#E2E8F0', border: 'none', padding: '4px 8px', borderRadius: '999px', fontSize: '0.75rem', cursor: 'pointer' }}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(receipt.id)}
                                            style={{ background: '#FEE2E2', border: 'none', padding: '4px 8px', borderRadius: '999px', fontSize: '0.75rem', cursor: 'pointer', color: '#991B1B' }}
                                            title="Eliminar"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ReceiptHistory;
