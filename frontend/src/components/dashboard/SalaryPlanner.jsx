import React, { useState, useEffect } from 'react';
import {
    DollarSign,
    Map,
    ShieldCheck,
    Home,
    ShoppingCart,
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    AlertCircle,
    TrendingDown,
    Save
} from 'lucide-react';
import { saveSalaryPlan } from '../../services/api';

const SalaryPlanner = () => {
    const [step, setStep] = useState(0);
    const [balance, setBalance] = useState(1732286);
    const [selections, setSelections] = useState({
        salary: 1732286,
        essentials: 1784700,
        matricula: 100000,
        coyhaique: 65000,
        foodBudget: 500000,
        anaIncome: 500000,
    });

    const [activeDecisions, setActiveDecisions] = useState({
        payMatricula: true,
        goCoyhaique: false,
        optimizeFood: false,
        includeAna: false
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const currentBalance = () => {
        let total = selections.salary;
        if (activeDecisions.includeAna) total += selections.anaIncome;
        total -= selections.essentials;
        if (activeDecisions.payMatricula) total -= selections.matricula;
        if (activeDecisions.goCoyhaique) total -= selections.coyhaique;
        // Optimization disabled for now per user feedback (keep 500k)
        if (activeDecisions.optimizeFood) total += 0;
        return total;
    };

    const handleSync = async () => {
        setIsSaving(true);
        try {
            await saveSalaryPlan({
                decisions: activeDecisions,
                summary: {
                    balance: currentBalance(),
                    date: new Date().toISOString(),
                    month: 'Marzo 2026'
                }
            });
            setIsSaved(true);
            setTimeout(() => setStep(s => s + 1), 1500);
        } catch (error) {
            console.error("Error saving plan:", error);
            alert("No pude sincronizar con la Bitácora. Pero tus cálculos están aquí.");
        } finally {
            setIsSaving(false);
        }
    };

    const steps = [
        {
            title: "El Punto de Partida",
            icon: <DollarSign className="w-8 h-8 text-emerald-400" />,
            question: "Carlos, recibimos $1,732,286 líquidos hoy. ¿Es el monto final que quieres distribuir?",
            detail: "Este monto es la base de nuestra operación de marzo.",
            action: (
                <div className="flex flex-col gap-4 mt-6">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                        <span className="text-gray-400">Monto Liquidación</span>
                        <span className="text-xl font-bold text-white">$1,732,286</span>
                    </div>
                </div>
            )
        },
        {
            title: "Lo Sagrado (Inamovibles)",
            icon: <Home className="w-8 h-8 text-blue-400" />,
            question: "Tenemos $1,784,700 en compromisos fijos (Arriendo, Luz, Cencosud, etc.).",
            detail: "¡Ojo! Los fijos hoy superan ligeramente el sueldo base. La IA de Ana nos ayudará a ajustar.",
            action: (
                <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 text-amber-200 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>Déficit base de -$52,414 inicial. Necesitamos el ingreso de Ana o ajustes en otros ítems.</p>
                </div>
            )
        },
        {
            title: "El Escudo Escolar",
            icon: <ShieldCheck className="w-8 h-8 text-purple-400" />,
            question: "¿Pagamos los $100,000 de la matrícula de la academia ahora?",
            detail: "Esto asegura el cupo. La mensualidad empieza recién a fin de marzo.",
            action: (
                <button
                    onClick={() => setActiveDecisions(prev => ({ ...prev, payMatricula: !prev.payMatricula }))}
                    className={`mt-6 w-full p-4 rounded-xl border transition-all flex justify-between items-center ${activeDecisions.payMatricula
                        ? 'bg-purple-500/20 border-purple-500/50 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400'
                        }`}
                >
                    <span>Pagar Matrícula ($100k)</span>
                    {activeDecisions.payMatricula ? <CheckCircle2 className="w-5 h-5 text-purple-400" /> : <div className="w-5 h-5 rounded-full border border-gray-600" />}
                </button>
            )
        },
        {
            title: "La Aventura Familiar",
            icon: <Map className="w-8 h-8 text-orange-400" />,
            question: "¿Planean ir a Coyhaique mañana?",
            detail: "Un mini viaje para despejarse. Estimo $65,000 entre bencina y un almuerzo rico.",
            action: (
                <button
                    onClick={() => setActiveDecisions(prev => ({ ...prev, goCoyhaique: !prev.goCoyhaique }))}
                    className={`mt-6 w-full p-4 rounded-xl border transition-all flex justify-between items-center ${activeDecisions.goCoyhaique
                        ? 'bg-orange-500/20 border-orange-500/50 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400'
                        }`}
                >
                    <span>Viaje Coyhaique (~$65k)</span>
                    {activeDecisions.goCoyhaique ? <CheckCircle2 className="w-5 h-5 text-orange-400" /> : <div className="w-5 h-5 rounded-full border border-gray-600" />}
                </button>
            )
        },
        {
            title: "Optimización de Oxígeno",
            icon: <ShoppingCart className="w-8 h-8 text-emerald-400" />,
            question: "Presupuesto de Supermercado: $500,000",
            detail: "Mantendremos este monto base hasta que definamos el menú del mes. ¿Te parece bien?",
            action: (
                <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Estado</span>
                        <span className="text-emerald-400 font-bold">Bloqueado a 500k</span>
                    </div>
                    <p className="text-xs text-gray-500 italic">No bajaremos a 400k todavía para evitar estrés innecesario.</p>
                </div>
            )
        },
        {
            title: "El Aporte de Ana",
            icon: <DollarSign className="w-8 h-8 text-pink-400" />,
            question: "¿Contabilizamos ya el ingreso extra de Ana por clases?",
            detail: "Sabemos que a veces es variable, pero si es seguro, nos da aire.",
            action: (
                <button
                    onClick={() => setActiveDecisions(prev => ({ ...prev, includeAna: !prev.includeAna }))}
                    className={`mt-6 w-full p-4 rounded-xl border transition-all flex justify-between items-center ${activeDecisions.includeAna
                        ? 'bg-pink-500/20 border-pink-500/50 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400'
                        }`}
                >
                    <span>Incluir Sueldo Ana ($500k)</span>
                    {activeDecisions.includeAna ? <CheckCircle2 className="w-5 h-5 text-pink-400" /> : <div className="w-5 h-5 rounded-full border border-gray-600" />}
                </button>
            )
        },
        {
            title: "Sincronización Final",
            icon: <Save className="w-8 h-8 text-emerald-400" />,
            question: "¿Vaciamos este plan en la Bitácora?",
            detail: "Esto registrará el viaje o la matrícula automáticamente en la App para que no se nos olvide.",
            action: (
                <button
                    disabled={isSaving || isSaved}
                    onClick={handleSync}
                    className={`mt-6 w-full p-4 rounded-xl border transition-all flex justify-center items-center gap-3 ${isSaved
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
                        }`}
                >
                    {isSaving ? "Guardando..." : isSaved ? "Sincronizado ✅" : "Sincronizar y Cerrar"}
                    {!isSaving && !isSaved && <Save className="w-5 h-5" />}
                </button>
            )
        }
    ];

    const currentBal = currentBalance();
    const isNegative = currentBal < 0;

    return (
        <div className="max-w-xl mx-auto p-4 sm:p-6 bg-[#0f1115] min-h-[600px] flex flex-col font-sans text-gray-200">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Día de Pago 💰</h2>
                    <p className="text-gray-400 text-sm">Organizando Marzo para Ana</p>
                </div>
                <div className="text-right">
                    <div className={`text-2xl font-mono font-bold ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>
                        ${currentBal.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Saldo Final Libre</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1 bg-white/5 rounded-full mb-8 overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                />
            </div>

            {/* Step Content */}
            <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="mb-4 p-4 rounded-2xl bg-white/5 border border-white/10 shadow-xl">
                        {steps[step].icon}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{steps[step].title}</h3>
                    <p className="text-lg text-gray-300 mb-2 leading-tight">{steps[step].question}</p>
                    <p className="text-sm text-gray-500 leading-relaxed italic">{steps[step].detail}</p>
                </div>

                {steps[step].action}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex gap-4">
                <button
                    onClick={() => setStep(s => Math.max(0, s - 1))}
                    disabled={step === 0}
                    className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center gap-2 hover:bg-white/10 transition-all disabled:opacity-20"
                >
                    <ChevronLeft className="w-5 h-5" /> Anterior
                </button>
                <button
                    onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : null}
                    className={`flex-1 py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${step === steps.length - 1
                        ? 'bg-emerald-500 text-white cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
                        }`}
                >
                    {step === steps.length - 1 ? 'Listo ✅' : <>Siguiente <ChevronRight className="w-5 h-5" /></>}
                </button>
            </div>

            {/* Footer Info */}
            <div className="mt-6 pt-6 border-t border-white/5 flex justify-center text-[10px] text-gray-600 uppercase tracking-widest text-center">
                Diseñado para reducir ansiedad • Basado en Liquidación Feb 26
            </div>
        </div>
    );
};

export default SalaryPlanner;
