import { useAuthStore } from '@/store/useAuthStore';

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥)' },
];

export const getCurrencySymbol = (code?: string | null) => {
  if (!code) return '₹'; // Default base currency
  const found = SUPPORTED_CURRENCIES.find(
    (c) => c.code === code.toUpperCase().trim()
  );
  return found ? found.symbol : '₹';
};

export const useCurrencySymbol = () => {
  const user = useAuthStore((state) => state.user);
  return getCurrencySymbol(user?.currency);
};

export const formatCurrency = (amount: number, currencyCode?: string | null) => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toFixed(2)}`;
};
