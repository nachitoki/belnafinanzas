import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getDashboardSummary, getBitacora } from '../services/api';
import HouseholdStatusCard from './dashboard/HouseholdStatusCard';
import MonthOverview from './dashboard/MonthOverview';
import Horizon from './dashboard/Horizon';
import SpendingZone from './dashboard/SpendingZone';
import PillTabs from './layout/PillTabs';
import Alerts from './dashboard/Alerts';
import QuickAddExpense from './dashboard/QuickAddExpense';

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [projectEntry, setProjectEntry] = useState(null);
    const [projectLoading, setProjectLoading] = useState(true);
    const retryRef = useRef(false);

    // Refs for scrolling
    const statusRef = useRef(null);
    const horizonRef = useRef(null);
    const monthRef = useRef(null);
    const alertsRef = useRef(null);
    const projectRef = useRef(null);

    const fetchData = React.useCallback(async (isRetry = false) => {
        try {
            const result = await getDashboardSummary();
            setData(result);
            window.localStorage.setItem('dashboard_cache_v1', JSON.stringify({ ts: Date.now(), data: result }));
            retryRef.current = false;
        } catch (e) {
            console.error('Dashboard fetch failed', e);
            if (!isRetry && !retryRef.current) {
                retryRef.current = true;
                setTimeout(() => fetchData(true), 2000);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();

        // Load Project logic
        const loadProject = async () => {
            setProjectLoading(true);
            try {
                const data = await getBitacora();
                const projects = Array.isArray(data)
                    ? data.filter((entry) => String(entry.kind || '').toLowerCase() === 'project')
                    : [];
                if (projects.length > 0) {
                    projects.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
                    setProjectEntry(projects[0]);
                } else {
                    setProjectEntry(null);
                }
            } catch (e) {
                console.error('Error loading projects', e);
                setProjectEntry(null);
            } finally {
                setProjectLoading(false);
            }
        };
        loadProject();
    }, [fetchData]);

    // Scroll to tab logic
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        const map = {
            estado: statusRef,
            horizonte: horizonRef,
            mes: monthRef,
            notificaciones: alertsRef,
            proyecto: projectRef
        };
        const targetRef = map[tab];
        if (targetRef && targetRef.current) {
            targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [location.search]);

    const containerStyle = {
        padding: '20px 20px 100px',
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: 'calc(100vh - var(--topbar-height, 72px) - var(--bottomnav-height, 96px))',
        position: 'relative'
    };

    if (loading) {
        return (
            <div style={{ padding: '20px' }}>
                <div className="skeleton" style={{ height: '180px', marginBottom: '20px' }} />
                <div className="skeleton" style={{ height: '120px', marginBottom: '16px' }} />
                <div className="skeleton" style={{ height: '120px', marginBottom: '16px' }} />
                <div className="skeleton" style={{ height: '90px', marginBottom: '16px' }} />
                <div className="skeleton" style={{ height: '90px' }} />
            </div>
        );
    }

    if (!data) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--status-red-main)' }}>Error al cargar datos.</div>;

    const {
        household_status = 'green',
        status_message = '',
        upcoming_items = [],
        spending_zone = { status: 'green', label: 'Cargando...' },
        month_overview = {},
        distribution_real = {},
        food_budget = null
    } = data || {};

    return (
        <div style={containerStyle}>
            <PillTabs
                items={[
                    { label: 'Estado', path: '/?tab=estado', icon: '\u26FD' },
                    { label: 'Horizonte', path: '/?tab=horizonte', icon: '\uD83D\uDCC5' },
                    { label: 'Mes', path: '/?tab=mes', icon: '\uD83D\uDCCA' },
                    { label: 'Notificaciones', path: '/?tab=notificaciones', icon: '\uD83D\uDD14' },
                    { label: 'Proyecto', path: '/?tab=proyecto', icon: '\uD83C\uDFAF' }
                ]}
            />

            {/* Header */}
            <div style={{ marginBottom: '24px', marginTop: '10px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-text-main)' }}>Estado del Hogar</h2>
                <small style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>Semana actual</small>
            </div>

            {/* Components in order */}
            <div ref={monthRef}>
                <div className="spending-card" style={{ marginBottom: '14px' }}>
                    <div className="section-title">Mes</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                        Distribucion + pulso mensual
                    </div>
                </div>
                <MonthOverview
                    data={month_overview}
                    distributionReal={distribution_real}
                    foodBudget={food_budget}
                    projectEntry={projectEntry}
                    onRefresh={fetchData}
                />
            </div>

            <div ref={alertsRef}>
                <Alerts />
            </div>

            <div ref={statusRef}>
                <HouseholdStatusCard
                    status={household_status}
                    message={status_message}
                />
            </div>

            <div ref={horizonRef}>
                <Horizon initialItems={upcoming_items} />
            </div>

            <div className="spending-card" style={{ marginTop: '16px' }} ref={projectRef}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: '700' }}>Proyecto activo</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                            {projectLoading
                                ? 'Cargando proyecto...'
                                : projectEntry
                                    ? 'Proyecto en curso'
                                    : 'Aun no hay proyecto activo'}
                        </div>
                    </div>
                    {projectEntry && (
                        <button
                            onClick={() => navigate(`/bitacora/${projectEntry.id}`)}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-light)',
                                background: '#f7fafc',
                                cursor: 'pointer'
                            }}
                        >
                            Ver detalle
                        </button>
                    )}
                </div>
                {projectEntry && (
                    <div style={{ marginTop: '10px' }}>
                        <div style={{ fontWeight: '700' }}>{projectEntry.text || 'Proyecto'}</div>
                        {projectEntry.meta?.horizon_months && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                Horizonte: {projectEntry.meta.horizon_months} meses
                            </div>
                        )}
                        {projectEntry.meta?.estimated_cost && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                Costo: ${Number(projectEntry.meta.estimated_cost).toLocaleString('es-CL')}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <SpendingZone
                status={spending_zone.status}
                label={spending_zone.label}
            />

            {/* Quick Add Button */}
            <QuickAddExpense onExpenseAdded={fetchData} />

        </div>
    );
};

export default Dashboard;
