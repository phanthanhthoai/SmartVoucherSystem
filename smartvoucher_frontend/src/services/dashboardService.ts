import axios from 'axios';
import { API_BASE_URL } from './apiService';
export const DashboardService = {
    getDashboardStats: async () => {
        const response = await axios.get(`${API_BASE_URL}/vouchers/stats/overview`);
        return response.data;

    },

    getRevenueStats: async (startDate: string, endDate: string, groupBy: string) => {
        const response = await axios.get(`${API_BASE_URL}/vouchers/stats/revenue`, { params: { startDate, endDate, groupBy } });
        return response.data;
    }
}
