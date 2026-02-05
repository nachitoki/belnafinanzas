import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import chelenko from '../../assets/mascots/chelenko.png';
import luke from '../../assets/mascots/luke.png';

const USER_KEY = 'user_name';

const TopBar = () => {
    const navigate = useNavigate();
    const barRef = useRef(null);
    const [mounted, setMounted] = useState(false);
    const [name, setName] = useState(() => {
        try {
            return localStorage.getItem(USER_KEY) || 'Carlos';
        } catch (e) {
            return 'Carlos';
        }
    });

    const greeting = useMemo(() => `Hola, ${name}`, [name]);

    const handleSettings = () => {
        navigate('/configuracion');
    };

    useLayoutEffect(() => {
        const applyHeight = () => {
            if (!barRef.current) return;
            const height = barRef.current.getBoundingClientRect().height;
            document.documentElement.style.setProperty('--topbar-height', `${height}px`);
        };
        applyHeight();
        window.addEventListener('resize', applyHeight);
        return () => window.removeEventListener('resize', applyHeight);
    }, []);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div
            ref={barRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.95)',
                borderBottom: '1px solid var(--border-light)',
                boxShadow: '0 6px 14px rgba(15, 23, 42, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}
        >
            <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700'
            }}>
                {name.slice(0, 1).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '1rem' }}>{greeting}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Estado del hogar y flujo diario</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <img src={chelenko} alt="Chelenko" style={{ width: '26px', height: '26px', borderRadius: '50%' }} />
                <img src={luke} alt="Luke" style={{ width: '26px', height: '26px', borderRadius: '50%' }} />
            </div>
            <button
                onClick={handleSettings}
                style={{
                    marginLeft: '6px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-light)',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    fontWeight: '700'
                }}
                aria-label="Configuracion"
            >
                *
            </button>
        </div>
    , document.body);
};

export default TopBar;
