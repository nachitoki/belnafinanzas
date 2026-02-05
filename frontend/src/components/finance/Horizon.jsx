import React from 'react';
import { useNavigate } from 'react-router-dom';
import HorizonCard from '../dashboard/Horizon';
import PillTabs from '../layout/PillTabs';

const FinanceHorizon = () => {
    const navigate = useNavigate();

    return (
        <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', minHeight: 'calc(100vh - var(--topbar-height, 72px) - var(--bottomnav-height, 96px))' }}>
            <PillTabs
                items={[
                    { label: 'Ingresos', path: '/incomes?tab=ingresos', icon: '\u2B06\uFE0F' },
                    { label: 'Compromisos', path: '/commitments?tab=compromisos', icon: '\uD83D\uDCC4' },
                    { label: 'Eventos', path: '/events?tab=eventos', icon: '\uD83D\uDCC6' },
                    { label: 'Horizonte', path: '/horizon', icon: '\u23F3' },
                    { label: 'Distribución', path: '/incomes?tab=distribucion', icon: '\uD83C\uDF69' }
                ]}
            />
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <button
                    onClick={() => navigate('/incomes')}
                    style={{ background: 'transparent', fontSize: '1.2rem', padding: '0 10px 0 0', border: 'none' }}
                >
                    {'\u2190'}
                </button>
                <div>
                    <h2>Horizonte</h2>
                    <div className="page-subtitle">Provisiones y próximos 30–60 días</div>
                </div>
            </div>

            <HorizonCard />
        </div>
    );
};

export default FinanceHorizon;
