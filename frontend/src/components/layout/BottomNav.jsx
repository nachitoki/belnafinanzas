import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';

const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const navRef = useRef(null);
    const [mounted, setMounted] = useState(false);

    useLayoutEffect(() => {
        const applyHeight = () => {
            if (!navRef.current) return;
            const height = navRef.current.getBoundingClientRect().height;
            document.documentElement.style.setProperty('--bottomnav-height', `${height}px`);
        };
        applyHeight();
        window.addEventListener('resize', applyHeight);
        return () => window.removeEventListener('resize', applyHeight);
    }, []);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const primary = [
        { label: 'Inicio', path: '/', icon: '\uD83C\uDFE0' },
        { label: 'Flujo', path: '/incomes', icon: '\uD83D\uDCB8' },
        { label: 'Compras', path: '/receipts?tab=upload', icon: '\uD83E\uDDFE' },
        { label: 'Despensa', path: '/recipes', icon: '\uD83C\uDF72' },
        { label: 'Bitacora', path: '/bitacora', icon: '\uD83E\uDDE0' }
    ];

    const isActive = (path) => location.pathname === path;

    return createPortal(
        <div
            ref={navRef}
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'rgba(255,255,255,0.98)',
                borderTop: '1px solid var(--border-light)',
                boxShadow: '0 -6px 14px rgba(15, 23, 42, 0.08)',
                padding: '8px 10px 12px',
                zIndex: 1000
            }}
        >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {primary.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            color: isActive(item.path) ? 'var(--status-green-main)' : 'var(--color-text-dim)',
                            fontWeight: isActive(item.path) ? '700' : '600',
                            fontSize: '0.7rem'
                        }}
                    >
                        <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isActive(item.path) ? 'rgba(46,125,50,0.12)' : '#F1F5F9',
                            border: isActive(item.path) ? '1px solid rgba(46,125,50,0.4)' : '1px solid #E2E8F0',
                            color: isActive(item.path) ? 'var(--status-green-main)' : 'var(--color-text-dim)',
                            fontWeight: '800'
                        }}>
                            {item.icon}
                        </div>
                        {item.label}
                    </button>
                ))}
            </div>
        </div>
    , document.body);
};

export default BottomNav;
