import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import chelenko from '../../assets/mascots/chelenko.png';
import luke from '../../assets/mascots/luke.png';

const PANEL_KEY = 'floating_panel_open';
const SECTION_KEY = 'floating_panel_section';

const FloatingPanel = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(() => {
        try {
            const raw = localStorage.getItem(PANEL_KEY);
            return raw ? raw === 'true' : true;
        } catch (e) {
            return true;
        }
    });
    const [activeSection, setActiveSection] = useState(() => {
        try {
            return localStorage.getItem(SECTION_KEY) || 'Inicio';
        } catch (e) {
            return 'Inicio';
        }
    });

    const sections = useMemo(() => ([
        { title: 'Inicio', items: [{ label: 'Dashboard', path: '/' }] },
        { title: 'Compras', items: [{ label: 'Compras', path: '/receipts' }, { label: 'Productos', path: '/products' }, { label: 'Tiendas', path: '/stores' }] },
        { title: 'Flujo', items: [{ label: 'Ingresos', path: '/incomes' }, { label: 'Compromisos', path: '/commitments' }, { label: 'Eventos', path: '/events' }] },
        { title: 'Alimentacion', items: [{ label: 'Platos', path: '/recipes' }, { label: 'Calendario', path: '/meal-calendar' }, { label: 'Inventario', path: '/inventory' }] },
        { title: 'Bitacora', items: [{ label: 'Bitacora', path: '/bitacora' }] }
    ]), []);

    const handleToggle = () => {
        setOpen((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(PANEL_KEY, String(next));
            } catch (e) {
                // ignore
            }
            return next;
        });
    };

    const handleSection = (title) => {
        setActiveSection(title);
        try {
            localStorage.setItem(SECTION_KEY, title);
        } catch (e) {
            // ignore
        }
    };

    const isActive = (path) => location.pathname === path;
    const currentSection = sections.find((s) => s.title === activeSection) || sections[0];

    if (!open) {
        return (
            <div style={{ position: 'fixed', left: 0, right: 0, bottom: 10, display: 'flex', justifyContent: 'center', zIndex: 200 }}>
                <button
                    onClick={handleToggle}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '999px',
                        border: '1px solid rgba(0,0,0,0.08)',
                        background: 'rgba(255,255,255,0.9)',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                        backdropFilter: 'blur(8px)',
                        cursor: 'pointer',
                        fontWeight: '700'
                    }}
                >
                    Menu
                </button>
            </div>
        );
    }

    return (
        <div
            style={{
                position: 'fixed',
                left: '8px',
                right: '8px',
                bottom: '10px',
                zIndex: 200
            }}
        >
            <div
                style={{
                    background: 'rgba(255,255,255,0.92)',
                    borderRadius: '18px',
                    border: '1px solid rgba(148,163,184,0.25)',
                    boxShadow: '0 18px 30px rgba(15,23,42,0.18)',
                    backdropFilter: 'blur(10px)',
                    padding: '10px 12px'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                    <div style={{ width: '36px', height: '4px', borderRadius: '999px', background: '#E2E8F0' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <img src={chelenko} alt="Chelenko" style={{ width: '26px', height: '26px', borderRadius: '50%' }} />
                    <img src={luke} alt="Luke" style={{ width: '26px', height: '26px', borderRadius: '50%' }} />
                    <div style={{ fontWeight: '700', fontSize: '0.85rem', flex: 1 }}>CBC Family</div>
                    <button
                        onClick={handleToggle}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            fontWeight: '700',
                            color: 'var(--color-text-dim)'
                        }}
                    >
                        Ocultar
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                    {sections.map((section) => (
                        <button
                            key={section.title}
                            onClick={() => handleSection(section.title)}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '999px',
                                border: activeSection === section.title ? '1px solid var(--status-green-main)' : '1px solid rgba(148,163,184,0.4)',
                                background: activeSection === section.title ? 'rgba(46,125,50,0.12)' : 'rgba(248,250,252,0.9)',
                                color: activeSection === section.title ? 'var(--status-green-main)' : 'var(--color-text-main)',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {section.title}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {currentSection.items.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '999px',
                                border: isActive(item.path) ? '1px solid var(--status-green-main)' : '1px solid rgba(148,163,184,0.35)',
                                background: isActive(item.path) ? 'rgba(46,125,50,0.12)' : 'rgba(248,250,252,0.9)',
                                color: isActive(item.path) ? 'var(--status-green-main)' : 'var(--color-text-main)',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FloatingPanel;
