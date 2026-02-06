import React, { useState, useEffect } from 'react';
import { createManualReceipt, getExpensePatterns } from '../../services/api';

const QuickAddExpense = ({ onExpenseAdded }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [store, setStore] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [patterns, setPatterns] = useState([]);
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        // Load patterns for autocomplete
        const loadPatterns = async () => {
            try {
                const data = await getExpensePatterns();
                setPatterns(data || []);
            } catch (e) {
                console.error("Failed to load patterns", e);
            }
        };
        loadPatterns();
    }, []);

    const handleStoreChange = (e) => {
        const val = e.target.value;
        setStore(val);
        if (val.length > 1) {
            const matches = patterns.filter(p =>
                p.store_name && p.store_name.toLowerCase().includes(val.toLowerCase())
            ).slice(0, 5);
            setSuggestions(matches);
        } else {
            setSuggestions([]);
        }
    };

    const selectSuggestion = (s) => {
        setStore(s.store_name);
        setSuggestions([]);
        // Optional: Auto-fill typical amount? Maybe not, too risky.
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!store || !amount) return;

        setIsSubmitting(true);
        try {
            await createManualReceipt({
                store_name: store,
                total: parseInt(amount),
                date: date,
                category_id: null // Let backend guess or default
            });

            // Reset and close
            setStore('');
            setAmount('');
            setIsOpen(false);
            if (onExpenseAdded) onExpenseAdded();
        } catch (error) {
            console.error(error);
            alert("Error al guardar gasto");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '80px', // Above bottom nav if any, or just float
                    right: '20px',
                    background: 'var(--primary-main)',
                    color: 'white',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    fontSize: '2rem',
                    cursor: 'pointer',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                +
            </button>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            background: 'var(--bg-card)',
            padding: '16px',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 101,
            width: '300px',
            border: '1px solid var(--border-light)'
        }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '1rem' }}>Agregar Gasto Rápido</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        placeholder="¿Dónde compraste?"
                        value={store}
                        onChange={handleStoreChange}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #ccc' }}
                        autoFocus
                    />
                    {suggestions.length > 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: 'white',
                            border: '1px solid #eee',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            zIndex: 10
                        }}>
                            {suggestions.map((s, i) => (
                                <div
                                    key={i}
                                    onClick={() => selectSuggestion(s)}
                                    style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                                >
                                    {s.store_name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <input
                    type="number"
                    placeholder="Monto ($)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #ccc' }}
                />

                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #ccc' }}
                />

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'transparent', cursor: 'pointer' }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: 'var(--primary-main)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {isSubmitting ? '...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default QuickAddExpense;
