import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStores, getStoreProducts } from '../../services/api';
import { RECEIPT_ALIASES, RECEIPT_FALLBACKS } from '../../data/receipt-aliases';

const Stores = () => {
    const navigate = useNavigate();
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStore, setSelectedStore] = useState(null);
    const [storeProducts, setStoreProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

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
        const inList = (rule) => rule.match.some((token) => text.includes(token));
        const rule = RECEIPT_ALIASES.find(inList) || RECEIPT_FALLBACKS.find(inList);
        if (!rule) return null;
        return { clean: rule.clean, brand: rule.brand || '' };
    };

    const getDisplayName = (product) => {
        const base = product?.name_norm || product?.name || product?.name_raw || '';
        const suggestion = suggestNormalization(base);
        return suggestion?.clean || base || 'Sin nombre';
    };

    const isStoreVisible = (store) => {
        const name = (store?.name || '').trim();
        if (!name) return false;
        const normalized = normalizeText(name);
        return !['sin nombre', 'desconocida', 'tienda desconocida'].includes(normalized);
    };

    const visibleStores = useMemo(() => {
        return (stores || []).filter(isStoreVisible);
    }, [stores]);

    const displayedProducts = useMemo(() => {
        const byName = new Map();
        storeProducts.forEach((product) => {
            const displayName = getDisplayName(product);
            const key = normalizeText(displayName);
            if (!key) return;
            const existing = byName.get(key);
            if (!existing) {
                byName.set(key, { ...product, _displayName: displayName });
                return;
            }
            const existingDate = existing.latest_price?.date || '';
            const currentDate = product.latest_price?.date || '';
            if (currentDate > existingDate) {
                byName.set(key, { ...product, _displayName: displayName });
            }
        });
        return Array.from(byName.values()).sort((a, b) => {
            const nameA = a._displayName || '';
            const nameB = b._displayName || '';
            return nameA.localeCompare(nameB);
        });
    }, [storeProducts]);

    useEffect(() => {
        const fetchStores = async () => {
            try {
                const data = await getStores();
                setStores(data);
            } catch (e) {
                console.error('Error loading stores', e);
                setStores([]);
            } finally {
                setLoading(false);
            }
        };
        fetchStores();
    }, []);

    const handleSelectStore = async (store) => {
        setSelectedStore(store);
        setLoadingProducts(true);
        try {
            const data = await getStoreProducts(store.id);
            setStoreProducts(data);
        } catch (e) {
            console.error('Error loading store products', e);
            setStoreProducts([]);
        } finally {
            setLoadingProducts(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', minHeight: 'calc(100vh - var(--topbar-height, 72px) - var(--bottomnav-height, 96px))' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <button
                    onClick={() => navigate('/')}
                    style={{ background: 'transparent', fontSize: '1.2rem', padding: '0 10px 0 0', border: 'none' }}
                >
                    ←
                </button>
                <div>
                    <h2>Tiendas</h2>
                    <div className="page-subtitle">Tiendas y precios recientes</div>
                </div>
            </div>

            <p style={{ color: 'var(--color-text-dim)', marginBottom: '12px' }}>Memoria de tiendas</p>

            {loading ? (
                <div className="loading-text">Cargando tiendas...</div>
            ) : visibleStores.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aaa' }}>Sin tiendas aún.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {visibleStores.map((store) => (
                        <button
                            key={store.id}
                            onClick={() => handleSelectStore(store)}
                            style={{
                                textAlign: 'left',
                                padding: '12px',
                                borderRadius: '10px',
                                border: selectedStore?.id === store.id ? '2px solid var(--status-green-main)' : '1px solid var(--border-light)',
                                background: 'var(--bg-card)',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{ fontWeight: '700' }}>{store.name || 'Sin nombre'}</div>
                            {store.aliases?.length > 0 && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                    Alias: {store.aliases.join(', ')}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {selectedStore && (
                <div style={{ marginTop: '20px' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)', marginBottom: '8px' }}>
                        Productos en {selectedStore.name}
                    </h3>
                    {loadingProducts ? (
                        <div>Cargando productos...</div>
                    ) : storeProducts.length === 0 ? (
                        <div style={{ color: '#aaa' }}>Sin precios asociados todavía.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {displayedProducts.map((p) => (
                                <div key={p.product_id} className="spending-card" style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                                    <div>
                                        <div style={{ fontWeight: '600' }}>{p._displayName || getDisplayName(p)}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                            Último: {p.latest_price?.date || '—'}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: '700', color: 'var(--status-green-main)' }}>
                                        ${Number(p.latest_price?.total_price || 0).toLocaleString('es-CL')}
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

export default Stores;









