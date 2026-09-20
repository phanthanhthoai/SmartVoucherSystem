import api from '@/services/apiService';
import React, { createContext, useState, useEffect, useContext } from 'react';

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => void;
    fetchMe?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // 2. Tách logic ra thành một hàm độc lập
    const fetchMe = async () => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const res = await api.get('/users/me/'); // Gọi API
                setUser(res.data); // Cập nhật RAM
            } catch (error) {
                console.error("Lỗi lấy thông tin:", error);
            }
        }
        setLoading(false);
    };

    // 3. Lúc mới F5 vào web thì vẫn tự động gọi nó 1 lần
    useEffect(() => {
        fetchMe();
    }, []);

    const logout = () => {
        const role = user?.role || "";
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        if (role === "admin") {
            window.location.href = '/admin/login';
        } else {
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout, fetchMe }}>
            {!loading && children} {/* Chỉ hiển thị web khi đã check xong ai đang đăng nhập */}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth phải nằm trong AuthProvider");
    return context;
};