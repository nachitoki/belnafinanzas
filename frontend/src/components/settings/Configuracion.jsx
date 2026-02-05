import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RoadmapProgress from '../roadmap/RoadmapProgress';
import { loadDistributionMeta, saveDistributionMeta } from '../../utils/distributionMeta';

const Configuracion = () => {
    const navigate = useNavigate();
    const [income, setIncome] = useState('');
    const [commitments, setCommitments] = useState('');
    const savedMeta = loadDistributionMeta();
    const [targetShield, setTargetShield] = useState(savedMeta.blindaje);
    const [step, setStep] = useState(1);
    const [goal, setGoal] = useState('equilibrio');
    const [saveMessage, setSaveMessage] = useState('');

    const parseNumber = (value) => {
        if (value === null || value === undefined) return 0;
        const normalized = String(value).replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(normalized);
        if (Number.isNaN(parsed)) return 0;
        return Math.max(0, Math.round(parsed));
    };

    const suggestion = useMemo(() => {
        const inc = parseNumber(income);
        const com = parseNumber(commitments);
        if (!inc || inc <= 0) {
            return { oxigeno: 55, vida: 30, blindaje: 15, note: 'Usando valores sugeridos por defecto.' };
        }

        const minOx = Math.min(80, Math.max(40, Math.round((com / inc) * 100) + 5));
        let blindaje = Math.min(35, Math.max(5, Number(targetShield) || 15));
        let vida = 100 - minOx - blindaje;

        if (vida < 10) {
            vida = 10;
            blindaje = Math.max(0, 100 - minOx - vida);
        }

        let note = 'Ajuste basado en compromisos reales y tu meta.';
        if (goal === 'ahorro') note = 'Prioridad: subir Blindaje sin tensionar el flujo.';
        if (goal === 'holgura') note = 'Prioridad: dar más espacio a Vida sin perder Blindaje.';

        return {
            oxigeno: minOx,
            vida,
            blindaje,
            note
        };
    }, [income, commitments, targetShield, goal]);

    const handleSaveDistribution = () => {
        const ok = saveDistributionMeta({
            oxigeno: suggestion.oxigeno,
            vida: suggestion.vida,
            blindaje: suggestion.blindaje
        });
        setSaveMessage(ok ? 'Guardado. Se aplicará en Inicio y Flujo.' : 'No se pudo guardar.');
        setTimeout(() => setSaveMessage(''), 2500);
    };

    return (
        <div style={{ padding: '20px 20px 120px', maxWidth: '480px', margin: '0 auto', minHeight: 'calc(100vh - var(--topbar-height, 72px) - var(--bottomnav-height, 96px))' }}>
            <div style={{ marginBottom: '18px', marginTop: '8px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Configuración</h2>
                <p className="page-subtitle">Preferencias y reglas del hogar</p>
            </div>

            <div className="spending-card">
                <div className="section-title">Asistente distribución % ingreso</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginBottom: '10px' }}>
                    Define metas realistas según tu realidad y hacia donde quieres llegar.
                </div>

                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                    {[1, 2, 3].map((n) => (
                        <div
                            key={`step-${n}`}
                            style={{
                                flex: 1,
                                height: '6px',
                                borderRadius: '999px',
                                background: step >= n ? 'var(--status-green-main)' : '#E2E8F0'
                            }}
                        />
                    ))}
                </div>

                {step === 1 && (
                    <div style={{ display: 'grid', gap: '8px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Paso 1: Diagnóstico</div>
                        <input
                            value={income}
                            onChange={(e) => setIncome(e.target.value)}
                            placeholder="Ingreso mensual total"
                            inputMode="numeric"
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                        <input
                            value={commitments}
                            onChange={(e) => setCommitments(e.target.value)}
                            placeholder="Compromisos fijos mensuales"
                            inputMode="numeric"
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                            Usamos estos datos para calcular Oxígeno mínimo garantizado.
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ display: 'grid', gap: '8px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Paso 2: Meta y objetivo</div>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>
                                Meta Blindaje ({targetShield}%)
                            </div>
                            <input
                                type="range"
                                min="5"
                                max="35"
                                value={targetShield}
                                onChange={(e) => setTargetShield(Number(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <select
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                        >
                            <option value="equilibrio">Equilibrio general</option>
                            <option value="ahorro">Aumentar Blindaje</option>
                            <option value="holgura">Más espacio en Vida</option>
                        </select>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                            Este objetivo ajusta el mensaje y la propuesta.
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Paso 3: Propuesta</div>
                        <div style={{ marginTop: '8px', padding: '10px', borderRadius: '10px', background: '#F8FAFC' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Meta actual</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                <span>Oxígeno</span>
                                <strong>{savedMeta.oxigeno}%</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                <span>Vida</span>
                                <strong>{savedMeta.vida}%</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                <span>Blindaje</span>
                                <strong>{savedMeta.blindaje}%</strong>
                            </div>
                        </div>
                        <div style={{ marginTop: '8px', padding: '10px', borderRadius: '10px', background: '#F8FAFC' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Propuesta inicial</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                <span>Oxígeno</span>
                                <strong>{suggestion.oxigeno}%</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                <span>Vida</span>
                                <strong>{suggestion.vida}%</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                <span>Blindaje</span>
                                <strong>{suggestion.blindaje}%</strong>
                            </div>
                            <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                {suggestion.note}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            <button
                                onClick={() => navigate('/')}
                                style={{
                                    flex: 1,
                                    padding: '9px',
                                    background: '#E2E8F0',
                                    color: '#475569',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                Ver Dashboard
                            </button>
                            <button
                                onClick={() => navigate('/bitacora')}
                                style={{
                                    flex: 1,
                                    padding: '9px',
                                    background: '#E2E8F0',
                                    color: '#475569',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                Ir a Bitácora
                            </button>
                        </div>
                    </>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                        onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                        disabled={step === 1}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: '#E2E8F0',
                            color: '#475569',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: step === 1 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Volver
                    </button>
                    {step < 3 ? (
                        <button
                            onClick={() => setStep((prev) => Math.min(3, prev + 1))}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: 'var(--status-green-main)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            Continuar
                        </button>
                    ) : (
                        <button
                            onClick={handleSaveDistribution}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: 'var(--status-green-main)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            Guardar configuración
                        </button>
                    )}
                </div>

                {saveMessage && (
                    <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                        {saveMessage}
                    </div>
                )}
            </div>

            <RoadmapProgress />
        </div>
    );
};

export default Configuracion;
