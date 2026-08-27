import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

const REMEMBER_KEY = 'pos-remember-me';

// "Keep me signed in" preference lives in sessionStorage (so it doesn't
// itself outlive the tab) and picks which storage the persisted auth
// state is written to: localStorage (survives closing the browser) or
// sessionStorage (cleared when the tab/terminal session ends).
function backingStorage(): Storage {
  const remembered = window.sessionStorage.getItem(REMEMBER_KEY) !== '0';
  return remembered ? window.localStorage : window.sessionStorage;
}

const dynamicStorage: StateStorage = {
  getItem: (name) => (typeof window === 'undefined' ? null : backingStorage().getItem(name)),
  setItem: (name, value) => { if (typeof window !== 'undefined') backingStorage().setItem(name, value); },
  removeItem: (name) => { if (typeof window !== 'undefined') backingStorage().removeItem(name); },
};

export function setRememberMe(remember: boolean) {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
  }
}

const JUST_LOGGED_IN_KEY = 'pos-just-logged-in';

// Set right before redirecting away from a successful login/signup, so the
// dashboard's welcome toast can show once and then consume (clear) the flag —
// never again on a plain page refresh or repeat visit.
export function markJustLoggedIn() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(JUST_LOGGED_IN_KEY, '1');
  }
}

export function consumeJustLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  const flagged = window.sessionStorage.getItem(JUST_LOGGED_IN_KEY) === '1';
  if (flagged) window.sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
  return flagged;
}

export interface User {
  id: string;
  name: string;
  email: string | null;
  role: string;
  restaurantId?: string | null;
  restaurantName?: string | null;
  currency?: string | null;
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
  updateUser: (name: string, restaurantName?: string, currency?: string) => void;
  updateUserRestaurant: (restaurantId: string, restaurantName: string, currency?: string) => void;
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
      
      updateUser: (name, restaurantName, currency) => set((state) => {
        if (!state.user) return {};
        return {
          user: {
            ...state.user,
            name,
            ...(restaurantName !== undefined ? { restaurantName } : {}),
            ...(currency !== undefined ? { currency } : {}),
          }
        };
      }),

      updateUserRestaurant: (restaurantId, restaurantName, currency) => set((state) => {
        if (!state.user) return {};
        return {
          user: {
            ...state.user,
            restaurantId,
            restaurantName,
            ...(currency !== undefined ? { currency } : {}),
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
        // Remove token from both possible backing stores
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('pos-auth-storage');
          window.sessionStorage.removeItem('pos-auth-storage');
          window.sessionStorage.removeItem(REMEMBER_KEY);
        }
      },
    }),
    {
      name: 'pos-auth-storage', // Key for persisted storage (localStorage or sessionStorage)
      storage: createJSONStorage(() => dynamicStorage),
    }
  )
);
