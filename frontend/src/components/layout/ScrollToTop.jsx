import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
    const location = useLocation();

    useEffect(() => {
        const container = document.querySelector('.app-scroll');
        if (container) {
            container.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        } else {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
    }, [location.pathname]);

    return null;
};

export default ScrollToTop;
