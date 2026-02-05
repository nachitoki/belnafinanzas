const STORAGE_KEY = 'income_distribution_meta';
const STORAGE_MONTH_PREFIX = 'income_distribution_meta_';

const DEFAULT_META = { oxigeno: 55, vida: 30, blindaje: 15 };

const isValidMeta = (meta) => {
    if (!meta) return false;
    const oxigeno = Number(meta.oxigeno);
    const vida = Number(meta.vida);
    const blindaje = Number(meta.blindaje);
    if (![oxigeno, vida, blindaje].every((v) => Number.isFinite(v))) return false;
    const sum = oxigeno + vida + blindaje;
    return sum >= 95 && sum <= 105;
};

const getMonthKey = (value) => {
    const date = value instanceof Date ? value : new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

const normalizeMeta = (meta) => ({
    oxigeno: Number(meta.oxigeno),
    vida: Number(meta.vida),
    blindaje: Number(meta.blindaje)
});

const buildDynamicMeta = (base, real) => {
    if (!isValidMeta(real)) return base;
    const blend = (a, b) => Math.round((a * 0.6) + (b * 0.4));
    return {
        oxigeno: blend(base.oxigeno, real.oxigeno),
        vida: blend(base.vida, real.vida),
        blindaje: blend(base.blindaje, real.blindaje)
    };
};

export const loadDistributionMeta = (options = {}) => {
    if (typeof window === 'undefined') return DEFAULT_META;
    try {
        const monthKey = options.monthKey || getMonthKey(options.date || new Date());
        const monthStorageKey = `${STORAGE_MONTH_PREFIX}${monthKey}`;
        const monthRaw = window.localStorage.getItem(monthStorageKey);
        if (monthRaw) {
            const parsedMonth = JSON.parse(monthRaw);
            if (isValidMeta(parsedMonth)) {
                const real = options.realDistribution && isValidMeta(options.realDistribution)
                    ? normalizeMeta(options.realDistribution)
                    : null;
                const shouldRefresh = parsedMonth.source === 'auto'
                    && real
                    && (Math.abs(real.oxigeno - parsedMonth.oxigeno) >= 3
                        || Math.abs(real.vida - parsedMonth.vida) >= 3
                        || Math.abs(real.blindaje - parsedMonth.blindaje) >= 3);
                if (!shouldRefresh) return normalizeMeta(parsedMonth);
            }
        }

        const baseRaw = window.localStorage.getItem(STORAGE_KEY);
        const baseParsed = baseRaw ? JSON.parse(baseRaw) : DEFAULT_META;
        const baseMeta = isValidMeta(baseParsed) ? normalizeMeta(baseParsed) : DEFAULT_META;

        const real = options.realDistribution && isValidMeta(options.realDistribution)
            ? normalizeMeta(options.realDistribution)
            : null;
        if (real) {
            const dynamic = buildDynamicMeta(baseMeta, real);
            window.localStorage.setItem(monthStorageKey, JSON.stringify({
                ...dynamic,
                updatedAt: new Date().toISOString(),
                source: 'auto'
            }));
            return dynamic;
        }
        return baseMeta;
    } catch (err) {
        return DEFAULT_META;
    }
};

export const saveDistributionMeta = (meta, options = {}) => {
    if (typeof window === 'undefined') return false;
    if (!isValidMeta(meta)) return false;
    const monthKey = options.monthKey || getMonthKey(options.date || new Date());
    const monthStorageKey = `${STORAGE_MONTH_PREFIX}${monthKey}`;
    const payload = {
        oxigeno: Number(meta.oxigeno),
        vida: Number(meta.vida),
        blindaje: Number(meta.blindaje),
        updatedAt: new Date().toISOString()
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.localStorage.setItem(monthStorageKey, JSON.stringify({ ...payload, source: 'user' }));
    return true;
};

export const getDistributionMetaLabel = (meta) => {
    if (!meta) return 'Meta sugerida';
    return `Meta actual: Oxigeno ${meta.oxigeno}% - Vida ${meta.vida}% - Blindaje ${meta.blindaje}%`;
};
