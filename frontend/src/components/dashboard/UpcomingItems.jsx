import React from 'react';

const UpcomingItems = ({ items }) => {

    if (!items || items.length === 0) {
        return (
            <div className="upcoming-container">
                <div className="section-title">Próximo en el horizonte</div>
                <div style={{ color: 'var(--color-text-dim)', fontStyle: 'italic', fontSize: 'var(--text-small-size)' }}>
                    Nada pendiente...
                </div>
            </div>
        );
    }

    // Sort priority: Red > Yellow > Green
    const priority = { red: 3, yellow: 2, green: 1 };
    const sortedItems = [...items].sort((a, b) => (priority[b.status] || 0) - (priority[a.status] || 0));

    return (
        <div className="upcoming-container">
            <div className="section-title">Próximo en el horizonte</div>
            {sortedItems.map((item, idx) => (
                <div key={idx} className={`upcoming-item ${item.status}`}>
                    {/* Icon Placeholder circle */}
                    <div className="item-icon-circle">
                        {item.type === 'utility' ? '💡' : item.type === 'internet' ? '🌐' : '📅'}
                    </div>

                    <div style={{ flex: 1, fontWeight: '500' }}>{item.label}</div>

                    <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        opacity: 0.8
                    }}>
                        {item.status === 'green' ? 'Ok' : item.status === 'yellow' ? 'Se acerca' : 'Revisar'}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default UpcomingItems;
