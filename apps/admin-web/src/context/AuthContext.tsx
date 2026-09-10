   import { createContext, useContext, useState, ReactNode } from 'react';
   import apiClient from '../lib/apiClient';

   interface Admin {
     admin_id: number;
     username: string;
     role: string;
   }

   interface AuthContextType {
     admin: Admin | null;
     login: (username: string, password: string) => Promise<void>;
     logout: () => void;
   }

   const AuthContext = createContext<AuthContextType | undefined>(undefined);

   export function AuthProvider({ children }: { children: ReactNode }) {
     const [admin, setAdmin] = useState<Admin | null>(() => {
       const stored = localStorage.getItem('admin');
       return stored ? JSON.parse(stored) : null;
     });

     async function login(username: string, password: string) {
       const res = await apiClient.post('/auth/login', { username, password });
       localStorage.setItem('token', res.data.token);
       localStorage.setItem('admin', JSON.stringify(res.data.admin));
       setAdmin(res.data.admin);
     }

     function logout() {
       localStorage.removeItem('token');
       localStorage.removeItem('admin');
       setAdmin(null);
     }

     return (
       <AuthContext.Provider value={{ admin, login, logout }}>
         {children}
       </AuthContext.Provider>
     );
   }

   export function useAuth() {
     const context = useContext(AuthContext);
     if (!context) throw new Error('useAuth must be used within AuthProvider');
     return context;
   }