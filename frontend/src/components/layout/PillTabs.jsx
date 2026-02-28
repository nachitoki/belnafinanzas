import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PillTabs = ({ items }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const containerRef = useRef(null);
    const buttonRefs = useRef({});

    const getModifiedPath = (path) => {
        const currentParams = new URLSearchParams(location.search);
        const month = currentParams.get('month');
        if (!month) return path;

        const targetUrl = new URL(path, window.location.origin);
        if (!targetUrl.searchParams.has('month')) {
            targetUrl.searchParams.set('month', month);
        }
        return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
    };

    const isActive = (path) => {
        const currentMonth = new URLSearchParams(location.search).get('month');
        const targetUrl = new URL(path, window.location.origin);
        const targetMonth = targetUrl.searchParams.get('month');

        // If target doesn't specify month, but we have one in state, it's considered a match if path/other params match
        const pathnameMatch = location.pathname === targetUrl.pathname;

        // Tab param match
        const currentTab = new URLSearchParams(location.search).get('tab');
        const targetTab = targetUrl.searchParams.get('tab');
        const tabMatch = currentTab === targetTab;

        return pathnameMatch && tabMatch;
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
                    onClick={() => navigate(getModifiedPath(item.path))}
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
