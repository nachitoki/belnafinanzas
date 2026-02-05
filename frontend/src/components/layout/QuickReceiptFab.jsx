import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const QuickReceiptFab = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleClick = () => {
        navigate('/receipts?tab=upload');
    };

    if (location.pathname === '/receipts') return null;

    return (
        <button
            onClick={handleClick}
            style={{
                position: 'fixed',
                right: '16px',
                bottom: 'calc(var(--bottomnav-height, 96px) + 16px)',
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                border: '1px solid rgba(46,125,50,0.35)',
                background: 'rgba(255,255,255,0.98)',
                boxShadow: '0 10px 20px rgba(15, 23, 42, 0.18)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--status-green-main)',
                fontSize: '1.2rem',
                zIndex: 210
            }}
            aria-label="Registro rapido"
            title="Registro rapido"
        >
            {'\uD83E\uDDFE'}
        </button>
    );
};

export default QuickReceiptFab;
