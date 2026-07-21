import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string | null;
  role: string;
  restaurantId?: string | null;
  restaurantName?: string | null;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon: string | null;
  path: string;
  order: number;
  subItems?: SidebarItem[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  permissions: string[];
  sidebarItems: SidebarItem[];
  
  // Actions
  setAuth: (user: User, token: string, permissions: string[]) => void;
  setSidebarItems: (items: SidebarItem[]) => void;
  updateUser: (name: string, restaurantName?: string) => void;
  updateUserRestaurant: (restaurantId: string, restaurantName: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      permissions: [],
      sidebarItems: [],
      
      setAuth: (user, token, permissions) => set({
        user,
        token,
        permissions,
      }),
      
      setSidebarItems: (sidebarItems) => set({ sidebarItems }),
      
      updateUser: (name, restaurantName) => set((state) => {
        if (!state.user) return {};
        return {
          user: {
            ...state.user,
            name,
            ...(restaurantName !== undefined ? { restaurantName } : {}),
          }
        };
      }),

      updateUserRestaurant: (restaurantId, restaurantName) => set((state) => {
        if (!state.user) return {};
        return {
          user: {
            ...state.user,
            restaurantId,
            restaurantName,
          }
        };
      }),
      
      logout: () => {
        set({
          user: null,
          token: null,
          permissions: [],
          sidebarItems: [],
        });
        // Remove token from potential storage/headers
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pos-auth-storage');
        }
      },
    }),
    {
      name: 'pos-auth-storage', // Key for localStorage persistence
    }
  )
);
