import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PillTabs = ({ items }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const containerRef = useRef(null);
    const buttonRefs = useRef({});

    const isActive = (path) => {
        if (path.includes('?')) {
            return `${location.pathname}${location.search}` === path;
        }
        return location.pathname === path;
    };

    useEffect(() => {
        const activeItem = items.find((item) => isActive(item.path));
        if (!activeItem) return;
        const el = buttonRefs.current[activeItem.path];
        if (el && el.scrollIntoView) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [location.pathname, location.search, items]);

    return (
        <div
            ref={containerRef}
            style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                padding: '8px',
                marginBottom: '14px',
                background: '#EEF2F7',
                borderRadius: '14px',
                position: 'sticky',
                top: '8px',
                zIndex: 150,
                boxShadow: '0 4px 10px rgba(15, 23, 42, 0.06)'
            }}
        >
            {items.map((item) => (
                <button
                    key={item.path}
                    ref={(node) => {
                        if (node) {
                            buttonRefs.current[item.path] = node;
                        }
                    }}
                    onClick={() => navigate(item.path)}
                    style={{
                        border: '1px solid #E2E8F0',
                        background: isActive(item.path) ? '#fff' : 'transparent',
                        borderRadius: '999px',
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: isActive(item.path) ? '700' : '600',
                        color: isActive(item.path) ? 'var(--status-green-main)' : 'var(--color-text-dim)',
                        boxShadow: isActive(item.path) ? '0 4px 10px rgba(15, 23, 42, 0.08)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap'
                    }}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                >
                    {item.icon ? <span>{item.icon}</span> : null}
                    {item.label}
                </button>
            ))}
        </div>
    );
};

export default PillTabs;
