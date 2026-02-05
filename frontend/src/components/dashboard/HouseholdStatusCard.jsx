import React from 'react';

// Import images directly to ensure Vite bundles them correctly
import dogCalm from '../../assets/mascots/dog/dog_calm.webp';
import dogAlertSoft from '../../assets/mascots/dog/dog_alert_soft.webp';
import dogAlert from '../../assets/mascots/dog/dog_alert.webp';

const getMascotImage = (status) => {
    if (status === 'green') return dogCalm;
    if (status === 'yellow') return dogAlertSoft;
    if (status === 'red') return dogAlert;
    return dogCalm;
};

const getStatusIcon = (status) => {
    if (status === 'green') return '\u2714';
    if (status === 'yellow') return '\u26A0';
    if (status === 'red') return '\u2757';
    return '';
};

const HouseholdStatusCard = ({ status, message }) => {
    // status: 'green' | 'yellow' | 'red'
    const mascotImage = getMascotImage(status);

    return (
        <div className={`household-card ${status || 'green'}`}>
            <div className="household-icon">{getStatusIcon(status)}</div>
            <div className="household-message">{message}</div>

            {/* Mascot Slot with Real Image */}
            <div className="mascot-slot">
                <img
                    src={mascotImage}
                    alt={`Mascot status: ${status}`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
            </div>
        </div>
    );
};

export default HouseholdStatusCard;
