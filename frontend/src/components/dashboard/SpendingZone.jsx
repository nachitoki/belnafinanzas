import React, { useState } from 'react';

const SpendingZone = ({ status, label }) => {
    const [showDetails, setShowDetails] = useState(false);

    // Interaction only reveals mock amount for now, strictly following "No numbers default" rule.

    return (
        <div className="spending-card" onClick={() => setShowDetails(!showDetails)}>
            <div className="section-title">Zona de Gasto</div>

            <div className="spending-bar">
                <div className={`spending-bar-fill ${status}`}></div>
            </div>

            <p style={{
                textAlign: 'center',
                fontWeight: '600',
                color: 'var(--color-text-main)',
                fontSize: '1rem'
            }}>
                {label}
            </p>

            {showDetails && (
                <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-dim)' }}>
                    (Tocar para ver detalle)
                </div>
            )}
        </div>
    );
};

export default SpendingZone;
