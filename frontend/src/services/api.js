import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const REQUEST_TIMEOUT_MS = 300000; // 5 minutes to handle Render Cold Starts

const buildFallbackBase = () => {
    if (API_URL.endsWith('/api')) {
        return API_URL.slice(0, -4);
    }
    return null;
};

const postWithFallback = async (path, payload, options = {}) => {
    try {
        return await axios.post(`${API_URL}${path}`, payload, options);
    } catch (error) {
        if (error?.response?.status === 404) {
            const alt = buildFallbackBase();
            if (alt) {
                return await axios.post(`${alt}${path}`, payload, options);
            }
        }
        throw error;
    }
};

export const uploadReceipt = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
        const response = await axios.post(`${API_URL}/receipts`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: REQUEST_TIMEOUT_MS,
        });
        return response.data;
    } catch (error) { throw error; }
};

export const getReceipt = async (id) => {
    try {
        const response = await axios.get(`${API_URL}/receipts/${id}`, {
            timeout: REQUEST_TIMEOUT_MS,
        });
        return response.data;
    } catch (error) { throw error; }
};

export const confirmReceipt = async (receiptId, data) => {
    try {
        const response = await axios.post(`${API_URL}/receipts/${receiptId}/confirm`, data, {
            timeout: REQUEST_TIMEOUT_MS,
        });
        return response.data;
    } catch (error) { throw error; }
};

export const getReceipts = async () => {
    try {
        const response = await axios.get(`${API_URL}/receipts`, {
            timeout: REQUEST_TIMEOUT_MS,
        });
        return response.data;
    } catch (error) { throw error; }
};

export const rejectReceipt = async (receiptId) => {
    try {
        const response = await axios.post(`${API_URL}/receipts/${receiptId}/reject`, null, {
            timeout: REQUEST_TIMEOUT_MS,
        });
        return response.data;
    } catch (error) { throw error; }
};

export const createManualReceipt = async (payload) => {
    try {
        const response = await axios.post(`${API_URL}/receipts/manual`, payload, {
            timeout: REQUEST_TIMEOUT_MS,
        });
        return response.data;
    } catch (error) { throw error; }
};

export const getDashboardSummary = async () => {
    try {
        const response = await axios.get(`${API_URL}/dashboard/summary`, {
            timeout: REQUEST_TIMEOUT_MS,
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        throw error;
    }
};

export const getStores = async () => {
    const response = await axios.get(`${API_URL}/stores`, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const getStoreProducts = async (storeId) => {
    const response = await axios.get(`${API_URL}/stores/${storeId}/products`, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const getProducts = async () => {
    const response = await axios.get(`${API_URL}/products`, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const getProductPrices = async (productId) => {
    const response = await axios.get(`${API_URL}/products/${productId}/prices`, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const updateProduct = async (productId, payload) => {
    const response = await axios.patch(`${API_URL}/products/${productId}`, payload, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const importNotionProducts = async () => {
    const response = await axios.post(`${API_URL}/products/import-notion`, null, {
        timeout: 120000,
    });
    return response.data;
};

export const getIncomes = async () => {
    const response = await axios.get(`${API_URL}/incomes`, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const createIncome = async (payload) => {
    const response = await axios.post(`${API_URL}/incomes`, payload, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const updateIncome = async (incomeId, payload) => {
    const response = await axios.patch(`${API_URL}/incomes/${incomeId}`, payload, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const deleteIncome = async (incomeId) => {
    const response = await axios.delete(`${API_URL}/incomes/${incomeId}`, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const getCommitments = async () => {
    const response = await axios.get(`${API_URL}/commitments`, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const createCommitment = async (payload) => {
    const response = await axios.post(`${API_URL}/commitments`, payload, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const updateCommitment = async (commitmentId, payload) => {
    const response = await axios.patch(`${API_URL}/commitments/${commitmentId}`, payload, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const deleteCommitment = async (commitmentId) => {
    const response = await axios.delete(`${API_URL}/commitments/${commitmentId}`, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const getEvents = async () => {
    const response = await axios.get(`${API_URL}/events`, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const createEvent = async (payload) => {
    const response = await axios.post(`${API_URL}/events`, payload, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const updateEvent = async (eventId, payload) => {
    const response = await axios.patch(`${API_URL}/events/${eventId}`, payload, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const getAlerts = async () => {
    const response = await axios.get(`${API_URL}/alerts`, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const getHorizon = async () => {
    const response = await axios.get(`${API_URL}/horizon`, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const getRecipes = async (limit = 200) => {
    const response = await axios.get(`${API_URL}/recipes`, {
        params: { limit },
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const getShoppingList = async (month) => {
    const response = await axios.get(`${API_URL}/shopping-list`, {
        params: month ? { month } : undefined,
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const getShoppingSuggestions = async (query = '') => {
    const response = await axios.get(`${API_URL}/shopping-list/suggestions`, {
        params: query ? { q: query } : undefined,
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const createShoppingItem = async (payload) => {
    const response = await axios.post(`${API_URL}/shopping-list`, payload, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const addShoppingItem = createShoppingItem;

export const updateShoppingItem = async (itemId, payload) => {
    const response = await axios.patch(`${API_URL}/shopping-list/${itemId}`, payload, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const deleteShoppingItem = async (itemId) => {
    const response = await axios.delete(`${API_URL}/shopping-list/${itemId}`, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};


export const getBitacoraEntry = async (entryId) => {
    const response = await axios.get(`${API_URL}/bitacora/${entryId}`, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const getBitacora = async () => {
    const response = await axios.get(`${API_URL}/bitacora`, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const createBitacora = async (payload) => {
    const response = await axios.post(`${API_URL}/bitacora`, payload, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const updateBitacora = async (entryId, payload) => {
    try {
        const response = await axios.post(`${API_URL}/bitacora/${entryId}/update`, payload, {
            timeout: REQUEST_TIMEOUT_MS,
        });
        return response.data;
    } catch (error) {
        const status = error?.response?.status;
        if (status === 405) {
            const fallback = await axios.patch(`${API_URL}/bitacora/${entryId}`, payload, {
                timeout: REQUEST_TIMEOUT_MS,
            });
            return fallback.data;
        }
        throw error;
    }
};

export const askBitacora = async (payload) => {
    const response = await postWithFallback('/bitacora/ask', payload || {}, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const generateBitacoraObservations = async () => {
    const response = await postWithFallback('/bitacora/auto-observations', {}, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const generateBitacoraPatterns = async () => {
    const response = await postWithFallback('/bitacora/auto-patterns', {}, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const getExpensePatterns = async () => {
    try {
        const response = await axios.get(`${API_URL}/patterns`, {
            timeout: REQUEST_TIMEOUT_MS
        });
        return response.data;
    } catch (error) {
        console.warn('Failed to fetch patterns', error);
        return [];
    }
};
export const simulateBitacoraIdea = async (payload) => {
    const response = await postWithFallback('/bitacora/simulate', payload || {}, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};




export const updateDashboardSettings = async (settings) => {
    try {
        const response = await axios.put(`${API_URL}/dashboard/settings`, settings, {
            timeout: REQUEST_TIMEOUT_MS,
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getMeals = async (startDate, endDate) => {
    try {
        const response = await axios.get(`${API_URL}/meals`, {
            params: { start_date: startDate, end_date: endDate },
            timeout: REQUEST_TIMEOUT_MS,
        });
        return response.data;
    } catch (error) { throw error; }
};

export const saveMeals = async (meals) => {
    try {
        const response = await axios.post(`${API_URL}/meals`, meals, {
            timeout: REQUEST_TIMEOUT_MS,
        });
        return response.data;
    } catch (error) { throw error; }
};

export const interpretTransaction = async (text) => {
    const response = await axios.post(`${API_URL}/advisor/interpret`, { text }, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};

export const confirmTransaction = async (data) => {
    const response = await axios.post(`${API_URL}/advisor/confirm`, data, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
};
