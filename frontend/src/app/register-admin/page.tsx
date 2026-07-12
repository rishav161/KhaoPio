'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  KeyRound, Mail, User, ShieldAlert, CheckCircle2, 
  Eye, EyeOff, UtensilsCrossed, ChevronRight, ChevronLeft, Check
} from 'lucide-react';
import { apiFetch } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';

const SEED_TEMPLATE_ITEMS = [
  { name: 'Classic Cheese Burger', price: 6.99, category: 'Burgers', image: '🍔', description: 'Flame-grilled beef patty, melted cheddar, lettuce, tomato, house sauce', code: 'B01' },
  { name: 'Double BBQ Bacon Burger', price: 8.99, category: 'Burgers', image: '🥓', description: 'Double beef patty, crispy bacon, cheddar, crispy onions, smoky BBQ sauce', code: 'B02' },
  { name: 'Spicy Crispy Chicken Burger', price: 7.49, category: 'Burgers', image: '🍗', description: 'Crispy fried chicken breast, spicy mayo, pickles, shredded lettuce', code: 'B03' },
  { name: 'Classic Margherita Pizza', price: 10.99, category: 'Pizzas', image: '🍕', description: 'San Marzano tomato sauce, fresh mozzarella, fresh basil, olive oil', code: 'P01' },
  { name: 'Pepperoni Supreme Pizza', price: 12.99, category: 'Pizzas', image: '🍕', description: 'Double pepperoni, mozzarella cheese, spicy marinara sauce', code: 'P02' },
  { name: 'Truffle Mushroom Pizza', price: 13.49, category: 'Pizzas', image: '🍄', description: 'Cremini mushrooms, white truffle oil, fontina, fresh arugula', code: 'P03' },
  { name: 'Golden French Fries', price: 3.49, category: 'Sides', image: '🍟', description: 'Crispy golden fries, sea salt, served with ketchup', code: 'S01' },
  { name: 'Garlic Bread with Cheese', price: 4.99, category: 'Sides', image: '🥖', description: 'Toasted baguette with garlic butter, mozzarella, herbs', code: 'S02' },
  { name: 'Mozzarella Sticks', price: 5.49, category: 'Sides', image: '🧀', description: 'Crispy breaded mozzarella cheese sticks, marinara dipping sauce', code: 'S03' },
  { name: 'Iced Caramel Macchiato', price: 4.49, category: 'Drinks', image: '☕', description: 'Espresso, vanilla syrup, cold milk, caramel drizzle', code: 'D01' },
  { name: 'Lemon Mint Cooler', price: 3.29, category: 'Drinks', image: '🥤', description: 'Freshly squeezed lemon juice, crushed mint leaves, club soda', code: 'D02' },
  { name: 'Coca Cola Zero', price: 1.99, category: 'Drinks', image: '🥤', description: 'Chilled canned Coca-Cola Zero Sugar', code: 'D03' },
  { name: 'Chocolate Fudge Brownie', price: 5.49, category: 'Desserts', image: '🍫', description: 'Warm, gooey chocolate fudge brownie with chocolate drizzle', code: 'E01' },
  { name: 'New York Blueberry Cheesecake', price: 6.99, category: 'Desserts', image: '🍰', description: 'Rich, creamy classic cheesecake topped with sweet blueberry compote', code: 'E02' }
];

export default function RegisterAdmin() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const token = useAuthStore((state) => state.token);

  // Redirect if already logged in
  useEffect(() => {
    if (token) {
      router.push('/billing');
    }
  }, [token, router]);

  // Setup step
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form fields
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [restaurantName, setRestaurantName] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [debugOtp, setDebugOtp] = useState('');
  
  // Selected seed template codes
  const [selectedCodes, setSelectedCodes] = useState<string[]>(
    SEED_TEMPLATE_ITEMS.map((item) => item.code)
  );
  
  // Customizable item prices mapping
  const [itemPrices, setItemPrices] = useState<Record<string, string>>(
    SEED_TEMPLATE_ITEMS.reduce((acc, item) => {
      acc[item.code] = item.price.toString();
      return acc;
    }, {} as Record<string, string>)
  );

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validate Step 1 credentials & request OTP
  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError('Please fill in all account fields.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/auth/register-init', {
        method: 'POST',
        body: { email: form.email },
      });

      setDebugOtp(response.otp || '');
      setStep(2);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Error sending verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Validate Step 2 OTP verification code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otpInput || otpInput.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/auth/register-verify-otp', {
        method: 'POST',
        body: { email: form.email, otp: otpInput },
      });

      setStep(3);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Incorrect verification code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle template item select state
  const toggleItemSelection = (code: string) => {
    if (selectedCodes.includes(code)) {
      setSelectedCodes(selectedCodes.filter((c) => c !== code));
    } else {
      setSelectedCodes([...selectedCodes, code]);
    }
  };

  // Update customized price
  const updateItemPrice = (code: string, priceStr: string) => {
    setItemPrices({
      ...itemPrices,
      [code]: priceStr.replace(/[^0-9.]/g, ''),
    });
  };

  // Handle final signup submit
  const handleSubmit = async () => {
    setError('');

    if (!restaurantName.trim()) {
      setError('Please enter your Restaurant Name.');
      return;
    }

    setLoading(true);
    try {
      // Build selected menu items payload
      const bootstrappedMenuItems = SEED_TEMPLATE_ITEMS.filter((item) =>
        selectedCodes.includes(item.code)
      ).map((item) => ({
        ...item,
        price: parseFloat(itemPrices[item.code]) || item.price,
      }));

      const response = await apiFetch('/auth/register-admin', {
        method: 'POST',
        body: {
          name: form.name,
          email: form.email,
          password: form.password,
          restaurantName: restaurantName.trim(),
          menuItems: bootstrappedMenuItems,
        },
      });

      // Save credentials in Zustand store
      setAuth(response.user, response.token, response.permissions);
      setSuccess(true);
      
      // Fetch dynamic navigation menu
      const sidebarItems = await apiFetch('/navigation');
      useAuthStore.getState().setSidebarItems(sidebarItems);

      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Super Admin already registered or database is inaccessible.');
    } finally {
      setLoading(false);
    }
  };

  // Group templates by category
  const categories = ['Burgers', 'Pizzas', 'Sides', 'Drinks', 'Desserts'];

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center overflow-y-auto bg-zinc-50 dark:bg-zinc-950 px-4 py-8 font-sans antialiased text-zinc-900 dark:text-zinc-150 transition-colors duration-200">
      {/* Dynamic Coral Gradients */}
      <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-coral-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] translate-x-1/2 translate-y-1/2 rounded-full bg-amber-500/5 blur-[120px] pointer-events-none"></div>

      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-2xl transition-all duration-300">
        
        {/* Glow Line effect */}
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-coral-500 via-amber-500 to-yellow-400"></div>



        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-coral-50 dark:bg-coral-950/30 text-coral-500 mb-3">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-zinc-50">KhaoPio Onboarding</h1>
          <p className="mt-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Set up your administrative system control credentials and create your restaurant profile.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 text-xs font-bold text-red-650 dark:text-red-400">
            <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8 animate-bounce" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Onboarding Complete!</h2>
            <p className="mt-1 text-xs text-zinc-500 font-semibold">Creating your workspace & redirecting...</p>
          </div>
        ) : step === 1 ? (
          /* STEP 1: Account credentials */
          <form onSubmit={handleNextStep} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="e.g. Rahul Sen"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3 pl-10 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-coral-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  placeholder="e.g. admin@yourrestaurant.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3 pl-10 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-coral-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-10 pl-10 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-coral-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 hover:text-zinc-650 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-10 pl-10 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-coral-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 hover:text-zinc-650 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 cursor-pointer rounded-lg bg-coral-500 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-coral-600 active:scale-[0.98] shadow-md shadow-coral-100 dark:shadow-none mt-4"
            >
              <span>{loading ? 'Sending Code...' : 'Continue to OTP Verification'}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </form>
        ) : step === 2 ? (
          /* STEP 2: OTP Verification Code */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center py-2">
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                A 6-digit verification code has been dispatched to
              </p>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                {form.email}
              </p>
            </div>

            {debugOtp && (
              <div className="bg-coral-50/30 dark:bg-coral-950/20 border border-coral-200 dark:border-coral-900 rounded-lg p-3 text-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-coral-500 block mb-1">
                  Debug OTP Code (Copy/Paste)
                </span>
                <span className="text-2xl font-black tracking-widest text-coral-600 dark:text-coral-400 font-mono">
                  {debugOtp}
                </span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 text-center">
                Enter 6-Digit OTP Code
              </label>
              <input
                type="text"
                placeholder="••••••"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full text-center tracking-[0.75em] font-mono text-xl rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-3 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-coral-500"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center justify-center gap-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer rounded-lg bg-coral-500 hover:bg-coral-600 py-3 text-xs font-black uppercase tracking-wider text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-md shadow-coral-100 dark:shadow-none"
              >
                <span>{loading ? 'Verifying OTP...' : 'Verify Code'}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        ) : (
          /* STEP 3: Restaurant Name & Menu bootstrapping template selection */
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Restaurant Name
              </label>
              <input
                type="text"
                placeholder="e.g. Spicy Affair"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 px-3.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-coral-500"
                required
              />
            </div>

            {/* Menu Template Selection */}
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-coral-500">
                  Select Quick-Start Food Menu Templates
                </h3>
                <span className="text-[10px] font-bold text-zinc-400">
                  {selectedCodes.length} of {SEED_TEMPLATE_ITEMS.length} selected
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-4 font-semibold">
                Pick food items to populate your restaurant menu immediately. You can modify prices below or toggle item imports.
              </p>

              {/* Categorized Menu Scrollbox */}
              <div className="max-h-72 overflow-y-auto space-y-4 pr-1">
                {categories.map((category) => {
                  const categoryItems = SEED_TEMPLATE_ITEMS.filter(
                    (item) => item.category === category
                  );

                  return (
                    <div key={category} className="space-y-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-l-2 border-coral-500 pl-2">
                        {category}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {categoryItems.map((item) => {
                          const isSelected = selectedCodes.includes(item.code);
                          return (
                            <div 
                              key={item.code}
                              onClick={() => toggleItemSelection(item.code)}
                              className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                                isSelected
                                  ? 'bg-coral-50/20 dark:bg-coral-950/10 border-coral-400'
                                  : 'bg-zinc-50/50 dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/40 dark:hover:bg-zinc-900/50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-all ${
                                  isSelected 
                                    ? 'bg-coral-500 border-coral-500 text-white' 
                                    : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950'
                                }`}>
                                  {isSelected && <Check className="h-3.5 w-3.5" />}
                                </span>
                                <span className="text-sm shrink-0">{item.image}</span>
                                <div className="min-w-0">
                                  <div className={`text-xs font-black truncate leading-tight ${isSelected ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-500'}`}>
                                    {item.name}
                                  </div>
                                  <span className="text-[9px] font-black tracking-wider text-zinc-400 font-mono">
                                    {item.code}
                                  </span>
                                </div>
                              </div>

                              {/* Price customization input */}
                              <div 
                                className="flex items-center gap-1 shrink-0"
                                onClick={(e) => e.stopPropagation()} // Prevent toggling selection
                              >
                                <span className="text-[10px] font-black text-zinc-400 font-mono">$</span>
                                <input
                                  type="text"
                                  value={itemPrices[item.code]}
                                  onChange={(e) => updateItemPrice(item.code, e.target.value)}
                                  className="w-12 text-center rounded border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-0.5 text-xs font-extrabold text-zinc-800 dark:text-zinc-100 outline-none focus:border-coral-500"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Back and Submit Actions */}
            <div className="flex gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center justify-center gap-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
              
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer rounded-lg bg-coral-500 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-coral-600 active:scale-[0.98] disabled:opacity-50 shadow-md shadow-coral-100 dark:shadow-none"
              >
                <span>{loading ? 'Creating Workspace...' : 'Complete Onboarding & Setup'}</span>
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step < 3 && (
          <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-5 text-center">
            <Link
              href="/login"
              className="text-xs font-bold text-coral-500 hover:text-coral-600 transition-colors"
            >
              System already active? Log In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
