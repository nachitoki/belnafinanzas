import React from 'react';
import { useNavigate } from 'react-router-dom';

const QuickActions = () => {
    const navigate = useNavigate();

    const footerStyle = {
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        backgroundColor: 'var(--bg-card)',
        borderTop: '1px solid var(--border-light)',
        padding: '12px 0 24px',
        display: 'flex',
        justifyContent: 'space-around',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
        zIndex: 100
    };

    const actionStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px',
        cursor: 'pointer',
        width: '80px',
        borderRadius: '8px',
        transition: 'background 0.2s'
    };

    const iconStyle = {
        fontSize: '1.5rem',
        marginBottom: '4px'
    };

    const labelStyle = {
        fontSize: '0.75rem',
        color: 'var(--color-text-dim)',
        fontWeight: '600'
    };

    return (
        <div style={footerStyle}>
            <div style={actionStyle} onClick={() => navigate('/receipts?tab=upload')}>
                <span style={iconStyle}>🛒</span>
                <span style={labelStyle}>Compras</span>
            </div>
            <div style={actionStyle} onClick={() => navigate('/incomes')}>
                <span style={iconStyle}>💵</span>
                <span style={labelStyle}>Ingresos</span>
            </div>
            <div style={actionStyle} onClick={() => navigate('/products')}>
                <span style={iconStyle}>📦</span>
                <span style={labelStyle}>Productos</span>
            </div>
            <div style={actionStyle} onClick={() => navigate('/commitments')}>
                <span style={iconStyle}>📅</span>
                <span style={labelStyle}>Compromisos</span>
            </div>
            <div style={actionStyle} onClick={() => navigate('/events')}>
                <span style={iconStyle}>🗓️</span>
                <span style={labelStyle}>Eventos</span>
            </div>
            <div style={actionStyle} onClick={() => navigate('/recipes')}>
                <span style={iconStyle}>🍽️</span>
                <span style={labelStyle}>Platos</span>
            </div>
        </div>
    );
};

export default QuickActions;
