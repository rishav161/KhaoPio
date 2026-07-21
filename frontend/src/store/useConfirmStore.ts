import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string; // If omitted, acts as an Alert (only one button)
  type?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmStore {
  isOpen: boolean;
  options: ConfirmOptions | null;
  confirm: (options: ConfirmOptions) => void;
  alert: (title: string, message: string, type?: 'danger' | 'warning' | 'info' | 'success') => void;
  close: () => void;
}

export const useConfirmStore = create<ConfirmStore>((set) => ({
  isOpen: false,
  options: null,
  confirm: (options) => set({ isOpen: true, options }),
  alert: (title, message, type = 'info') => set({
    isOpen: true,
    options: {
      title,
      message,
      confirmText: 'OK',
      type,
      onConfirm: () => {}
    }
  }),
  close: () => set({ isOpen: false, options: null }),
}));
