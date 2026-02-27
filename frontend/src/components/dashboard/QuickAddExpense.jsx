import React, { useState, useEffect, useRef } from 'react';
import { interpretTransaction, confirmTransaction } from '../../services/api';

const QuickAddExpense = ({ onExpenseAdded }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [text, setText] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [suggestion, setSuggestion] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef(null);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleInterpret = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;

        setIsThinking(true);
        setSuggestion(null);
        try {
            const res = await interpretTransaction(text);
            setSuggestion(res);
        } catch (error) {
            console.error(error);
            alert("El Asesor no pudo entender. Vuelve a intentar.");
        } finally {
            setIsThinking(false);
        }
    };

    const handleConfirm = async () => {
        if (!suggestion) return;
        setIsSaving(true);
        try {
            // Mapping suggestion to transaction schema
            await confirmTransaction({
                amount: parseInt(suggestion.amount_hint) || 0,
                description: text,
                store_id: suggestion.normalized_description || "Desconocido",
                category_id: suggestion.category_id,
                bucket: suggestion.bucket // Note: handled purely purely by AI classification, very nice
            });

            // Re-fetch dashboard
            setText('');
            setSuggestion(null);
            setIsOpen(false);
            if (onExpenseAdded) onExpenseAdded();
        } catch (error) {
            console.error(error);
            alert("Error al guardar en el motor.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setText('');
        setSuggestion(null);
        setIsOpen(false);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '80px',
                    right: '20px',
                    background: 'var(--primary-main)',
                    color: 'white',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s'
                }}
            >
                ✨
            </button>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: 'var(--bg-card, white)',
                padding: '24px',
                borderRadius: '24px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                width: '100%',
                maxWidth: '400px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                color: 'black'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>Asesor Inteligente ✨</h3>
                    <button onClick={handleCancel} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                {!suggestion ? (
                    <form onSubmit={handleInterpret} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Escribe el gasto como le hablarías a Ana:</p>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Ej: Jumbo 45 lucas pan y leche"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            style={{
                                width: '100%', padding: '16px', borderRadius: '12px',
                                border: '2px solid var(--primary-main)', outline: 'none',
                                fontSize: '1rem', boxSizing: 'border-box'
                            }}
                            disabled={isThinking}
                        />
                        <button
                            type="submit"
                            disabled={isThinking || !text.trim()}
                            style={{
                                padding: '16px', borderRadius: '12px', border: 'none',
                                background: 'var(--primary-main)', color: 'white',
                                cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
                                opacity: (isThinking || !text.trim()) ? 0.7 : 1
                            }}
                        >
                            {isThinking ? 'Pensando...' : 'Analizar'}
                        </button>
                    </form>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', border: '1px solid #eee' }}>
                            <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>Interpretación:</p>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem' }}>{suggestion.normalized_description}</h4>
                            <p style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary-main)' }}>
                                ${parseInt(suggestion.amount_hint || 0).toLocaleString('es-CL')}
                            </p>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                    {suggestion.bucket?.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {suggestion.advice && (
                            <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #ff9800' }}>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#e65100', fontStyle: 'italic' }}>
                                    💡 {suggestion.advice}
                                </p>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setSuggestion(null)}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '2px solid #ccc', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}
                                disabled={isSaving}
                            >
                                Corregir
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isSaving}
                                style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: '#4caf50', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
                            >
                                {isSaving ? 'Guardando...' : 'Confirmar 👍'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuickAddExpense;
