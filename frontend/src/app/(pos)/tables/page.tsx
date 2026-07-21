'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePOSStore } from '@/store/usePOSStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader } from '@/components/Loader';
import { Plus, Trash2, CalendarDays, Users, Check, X, Armchair, PlusCircle, Clock, Sparkles } from 'lucide-react';
import { useConfirmStore } from '@/store/useConfirmStore';

export default function TablesPage() {
  const {
    tables,
    bookings,
    fetchTables,
    fetchBookings,
    createTable,
    deleteTable,
    createBooking,
    checkInBooking,
    cancelBooking,
  } = usePOSStore();

  const { user } = useAuthStore();
  const confirm = useConfirmStore((state) => state.confirm);
  const showAlert = useConfirmStore((state) => state.alert);

  const [loading, setLoading] = useState(true);

  // Modal / Form States
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [addTableError, setAddTableError] = useState('');

  const [isAddBookingOpen, setIsAddBookingOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [guestsCount, setGuestsCount] = useState('2');
  const [selectedTableId, setSelectedTableId] = useState('');
  const [addBookingError, setAddBookingError] = useState('');

  // Fetch tables and bookings on mount and set polling interval
  useEffect(() => {
    Promise.all([fetchTables(), fetchBookings()]).finally(() => setLoading(false));

    const interval = setInterval(() => {
      fetchTables();
      fetchBookings();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchTables, fetchBookings]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = tables.length;
    const available = tables.filter((t) => t.status === 'AVAILABLE').length;
    const occupied = tables.filter((t) => t.status === 'OCCUPIED').length;
    const reserved = tables.filter((t) => t.status === 'RESERVED').length;
    return { total, available, occupied, reserved };
  }, [tables]);

  // Check capacity compatibility
  const selectedTableCapacity = useMemo(() => {
    if (!selectedTableId) return null;
    const table = tables.find((t) => t.id === selectedTableId);
    return table ? table.capacity : null;
  }, [selectedTableId, tables]);

  const capacityWarning = useMemo(() => {
    if (selectedTableCapacity === null) return false;
    const guests = parseInt(guestsCount, 10);
    return guests > selectedTableCapacity;
  }, [guestsCount, selectedTableCapacity]);

  // Handle Add Table submission
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddTableError('');
    if (!newTableName.trim()) {
      setAddTableError('Table name is required.');
      return;
    }
    const capacity = parseInt(newTableCapacity, 10);
    if (isNaN(capacity) || capacity <= 0) {
      setAddTableError('Capacity must be a positive number.');
      return;
    }

    try {
      await createTable(newTableName.trim(), capacity);
      setNewTableName('');
      setNewTableCapacity('4');
      setIsAddTableOpen(false);
    } catch (err: any) {
      setAddTableError(err.message || 'Failed to create table.');
    }
  };

  // Handle Add Booking submission
  const handleAddBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddBookingError('');
    if (!customerName.trim()) {
      setAddBookingError('Customer name is required.');
      return;
    }
    if (!bookingTime) {
      setAddBookingError('Booking date & time is required.');
      return;
    }
    if (!selectedTableId) {
      setAddBookingError('Please assign a table.');
      return;
    }
    const guests = parseInt(guestsCount, 10);
    if (isNaN(guests) || guests <= 0) {
      setAddBookingError('Guests count must be a positive number.');
      return;
    }

    try {
      await createBooking({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        bookingTime,
        guestsCount: guests,
        tableId: selectedTableId,
      });

      setCustomerName('');
      setCustomerPhone('');
      setBookingTime('');
      setGuestsCount('2');
      setSelectedTableId('');
      setIsAddBookingOpen(false);
    } catch (err: any) {
      setAddBookingError(err.message || 'Failed to create reservation.');
    }
  };

  // Seating and cancellation handlers
  const handleCheckIn = async (bookingId: string) => {
    try {
      await checkInBooking(bookingId);
    } catch (err: any) {
      showAlert('Check-In Error', err.message || 'Failed to check-in reservation.', 'danger');
    }
  };

  const handleCancelBooking = (bookingId: string) => {
    confirm({
      title: 'Cancel Reservation',
      message: 'Are you sure you want to cancel this reservation?',
      type: 'warning',
      confirmText: 'Cancel Reservation',
      onConfirm: async () => {
        try {
          await cancelBooking(bookingId);
        } catch (err: any) {
          showAlert('Cancellation Error', err.message || 'Failed to cancel reservation.', 'danger');
        }
      }
    });
  };

  const handleDeleteTable = (tableId: string, tableName: string) => {
    confirm({
      title: 'Delete Table',
      message: `Are you sure you want to delete table "${tableName}"?`,
      type: 'danger',
      confirmText: 'Delete Table',
      onConfirm: async () => {
        try {
          await deleteTable(tableId);
        } catch (err: any) {
          showAlert('Deletion Error', err.message || 'Failed to delete table.', 'danger');
        }
      }
    });
  };

  if (loading && tables.length === 0) {
    return (
      <Loader
        size="md"
        text="Loading table interface..."
        className="h-full w-full bg-zinc-50 dark:bg-zinc-955 rounded-xl border border-zinc-200 dark:border-zinc-800"
      />
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full w-full gap-3 overflow-y-auto lg:overflow-hidden">
      
      {/* LEFT COLUMN: Tables Dashboard Grid (65% width) */}
      <div className="flex w-full lg:w-[65%] flex-col border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-sm overflow-hidden shrink-0">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 p-3">
          <div className="flex items-center gap-2">
            <Armchair className="h-5 w-5 text-coral-500" />
            <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-855 dark:text-zinc-100">
              Dining Tables Setup
            </h1>
          </div>
          {user?.role === 'SUPER_ADMIN' || user?.role === 'STORE_MANAGER' ? (
            <button
              onClick={() => setIsAddTableOpen(true)}
              className="flex items-center gap-1 rounded bg-coral-500 hover:bg-coral-600 text-white font-black py-1.5 px-3 text-[10px] uppercase shadow-sm tracking-wide transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Table
            </button>
          ) : null}
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-4 gap-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 px-4 py-2.5">
          <div className="text-center">
            <div className="text-[10px] font-black text-zinc-400 uppercase">Total</div>
            <div className="text-base font-black text-zinc-800 dark:text-zinc-100">{stats.total}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-black text-emerald-500 uppercase">Available</div>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-500">{stats.available}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-black text-red-500 uppercase">Occupied</div>
            <div className="text-base font-black text-red-500">{stats.occupied}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-black text-amber-500 uppercase">Reserved</div>
            <div className="text-base font-black text-amber-600 dark:text-amber-500">{stats.reserved}</div>
          </div>
        </div>

        {/* Grid View */}
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-50/30">
          {tables.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-zinc-400 p-8 text-center bg-white dark:bg-zinc-905 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
              <Armchair className="h-12 w-12 stroke-[1.2] text-zinc-300 mb-2 animate-bounce" />
              <p className="text-xs font-black text-zinc-500 dark:text-zinc-400">No dining tables configured</p>
              <p className="text-[10px] text-zinc-400 mt-1 max-w-[220px]">
                Create dining tables using the 'Add Table' button above to begin serving guests.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {tables.map((table) => {
                const isAvailable = table.status === 'AVAILABLE';
                const isOccupied = table.status === 'OCCUPIED';
                const isReserved = table.status === 'RESERVED';

                return (
                  <div
                    key={table.id}
                    className={`relative flex flex-col justify-between rounded-xl border p-3.5 bg-white dark:bg-zinc-900 shadow-xs transition-all select-none ${
                      isAvailable
                        ? 'border-emerald-200 dark:border-emerald-950/40 hover:border-emerald-400 dark:hover:border-emerald-900 hover:shadow-emerald-50/50'
                        : isOccupied
                        ? 'border-red-200 dark:border-red-955/40 hover:border-red-400'
                        : 'border-amber-200 dark:border-amber-955/40 hover:border-amber-400'
                    }`}
                  >
                    {/* Top Section: Status Badging & Delete */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[8px] font-black tracking-wider uppercase border ${
                          isAvailable
                            ? 'bg-emerald-50 dark:bg-emerald-955/20 text-emerald-700 dark:text-emerald-400 border-emerald-250 dark:border-emerald-900'
                            : isOccupied
                            ? 'bg-red-50 dark:bg-red-955/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900'
                            : 'bg-amber-50 dark:bg-amber-955/20 text-amber-700 dark:text-amber-505 border-amber-200 dark:border-amber-900'
                        }`}
                      >
                        {table.status}
                      </span>
                      {(!isOccupied && (user?.role === 'SUPER_ADMIN' || user?.role === 'STORE_MANAGER')) && (
                        <button
                          onClick={() => handleDeleteTable(table.id, table.name)}
                          className="rounded-lg p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
                          title="Delete Table"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Middle Section: Armchair Icon & Name */}
                    <div className="flex flex-col items-center my-3 text-center">
                      <Armchair
                        className={`h-9 w-9 mb-1.5 transition-transform duration-350 ${
                          isAvailable
                            ? 'text-emerald-500'
                            : isOccupied
                            ? 'text-red-500 scale-105 animate-pulse'
                            : 'text-amber-500'
                        }`}
                      />
                      <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                        {table.name}
                      </h3>
                    </div>

                    {/* Bottom Section: Seating Capacity */}
                    <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-extrabold text-zinc-400 border-t border-dashed border-zinc-150 dark:border-zinc-800 pt-2 uppercase">
                      <Users className="h-3 w-3" />
                      <span>Seats {table.capacity} max</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Reservations pane (35% width) */}
      <div className="flex w-full lg:w-[35%] flex-col border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-sm overflow-hidden shrink-0">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 p-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-coral-500" />
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-705 dark:text-zinc-300">
              Active Reservations
            </h2>
          </div>
          <button
            onClick={() => setIsAddBookingOpen(true)}
            className="flex items-center gap-1 rounded bg-zinc-900 dark:bg-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-900 text-white font-black py-1.5 px-2.5 text-[9px] uppercase shadow-sm tracking-wide transition-all cursor-pointer"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            New Book
          </button>
        </div>

        {/* List of active reservations */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-zinc-50/50">
          {bookings.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-zinc-400 p-6 text-center">
              <CalendarDays className="h-10 w-10 stroke-[1.2] text-zinc-300 mb-2" />
              <p className="text-xs font-bold text-zinc-505">No upcoming bookings</p>
              <p className="text-[10px] text-zinc-400 mt-1 max-w-[170px]">
                Reservations scheduled for today onwards will appear in this feed.
              </p>
            </div>
          ) : (
            bookings.map((booking) => {
              const isSeated = booking.status === 'SEATED';
              const isCancelled = booking.status === 'CANCELLED';
              const isConfirmed = booking.status === 'CONFIRMED' || booking.status === 'PENDING';
              
              const bookingDateTime = new Date(booking.bookingTime);

              return (
                <div
                  key={booking.id}
                  className="flex flex-col border border-zinc-200 dark:border-zinc-805 bg-white dark:bg-zinc-900 p-3 rounded-lg shadow-xs hover:shadow-sm transition-all"
                >
                  {/* Top: Customer & Seats */}
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-50 uppercase leading-none">
                        {booking.customerName}
                      </h4>
                      {booking.customerPhone && (
                        <span className="text-[9px] font-semibold text-zinc-450 dark:text-zinc-500">
                          PH: {booking.customerPhone}
                        </span>
                      )}
                    </div>
                    <span className="rounded bg-zinc-100 dark:bg-zinc-955 px-1.5 py-0.5 text-[9px] font-black text-zinc-650 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                      {booking.guestsCount} Guests
                    </span>
                  </div>

                  {/* Mid: Table assigned & Time */}
                  <div className="flex items-center justify-between text-[10px] font-bold text-zinc-505 dark:text-zinc-450 py-1.5 border-t border-dashed border-zinc-150 dark:border-zinc-800">
                    <span className="flex items-center gap-1 text-coral-500 font-extrabold uppercase">
                      <Armchair className="h-3.5 w-3.5" />
                      {booking.table ? booking.table.name : 'Unknown Table'}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3 text-zinc-400" />
                      {bookingDateTime.toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                      {bookingDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Bottom: Action state controllers */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[8px] font-black uppercase ${
                        isSeated
                          ? 'bg-emerald-50 dark:bg-emerald-955/20 text-emerald-700 dark:text-emerald-450 border border-emerald-250 dark:border-emerald-900'
                          : isCancelled
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700'
                          : 'bg-amber-50 dark:bg-amber-955/20 text-amber-700 dark:text-amber-505 border border-amber-250 dark:border-amber-900'
                      }`}
                    >
                      {booking.status}
                    </span>

                    {isConfirmed && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          className="flex items-center gap-0.5 rounded border border-red-200 text-red-500 hover:bg-red-50 px-2 py-1 text-[9px] font-black transition-colors cursor-pointer uppercase"
                        >
                          <X className="h-3 w-3" />
                          Cancel
                        </button>
                        <button
                          onClick={() => handleCheckIn(booking.id)}
                          className="flex items-center gap-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-[9px] font-black shadow-xs transition-colors cursor-pointer uppercase"
                        >
                          <Check className="h-3 w-3 stroke-[2.5]" />
                          Seat
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL 1: ADD TABLE FORM */}
      {isAddTableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xl transition-all duration-200">
            
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-905 dark:text-zinc-50 flex items-center gap-1.5">
                <Armchair className="h-4.5 w-4.5 text-coral-500" />
                <span>Configure Dining Table</span>
              </h3>
              <button
                onClick={() => setIsAddTableOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-4">
              {addTableError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900 p-2.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                  {addTableError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1">
                  Table Identifier / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Table 9"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs font-bold outline-none focus:border-coral-500 text-zinc-900 dark:text-zinc-100"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1">
                  Seat Capacity
                </label>
                <select
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs font-bold outline-none focus:border-coral-500 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="2">2 Seats (Duet)</option>
                  <option value="4">4 Seats (Family)</option>
                  <option value="6">6 Seats (Medium Group)</option>
                  <option value="8">8 Seats (Large Group)</option>
                  <option value="12">12 Seats (Feast Banquet)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddTableOpen(false)}
                  className="flex-1 rounded-lg border border-zinc-250 dark:border-zinc-850 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-350 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-coral-500 hover:bg-coral-600 text-white py-2.5 text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer"
                >
                  Save Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD BOOKING FORM */}
      {isAddBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xl transition-all duration-200">
            
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-905 dark:text-zinc-50 flex items-center gap-1.5">
                <CalendarDays className="h-4.5 w-4.5 text-coral-500" />
                <span>Reserve Dining Table</span>
              </h3>
              <button
                onClick={() => setIsAddBookingOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddBooking} className="space-y-3.5">
              {addBookingError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900 p-2.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                  {addBookingError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[8px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-0.5">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2 text-xs font-bold outline-none focus:border-coral-500 text-zinc-900 dark:text-zinc-100"
                    required
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[8px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-0.5">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +1 555-0199"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2 text-xs font-bold outline-none focus:border-coral-500 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[8px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-0.5">
                    Reservation Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2 text-xs font-bold outline-none focus:border-coral-500 text-zinc-900 dark:text-zinc-100 font-mono"
                    required
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[8px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-0.5">
                    Total Guest Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2 text-xs font-bold outline-none focus:border-coral-500 text-zinc-900 dark:text-zinc-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-0.5">
                  Allocate Dining Table
                </label>
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2 text-xs font-bold outline-none focus:border-coral-500 text-zinc-900 dark:text-zinc-100"
                  required
                >
                  <option value="">-- Choose dining table --</option>
                  {tables.map((table) => {
                    const isOccupied = table.status === 'OCCUPIED';
                    const isReserved = table.status === 'RESERVED';
                    return (
                      <option
                        key={table.id}
                        value={table.id}
                        disabled={isOccupied}
                        className={isOccupied ? 'text-zinc-400' : isReserved ? 'text-amber-500' : 'text-zinc-900'}
                      >
                        {table.name} (Seats {table.capacity} max) {table.status !== 'AVAILABLE' ? `[${table.status}]` : ''}
                      </option>
                    );
                  })}
                </select>

                {capacityWarning && (
                  <p className="mt-1 text-[9px] font-bold text-amber-655 flex items-center gap-1.5 uppercase tracking-wide">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span>Warning: Guest count exceeds table capacity ({selectedTableCapacity} seats)!</span>
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddBookingOpen(false)}
                  className="flex-1 rounded-lg border border-zinc-250 dark:border-zinc-855 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-350 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-coral-500 hover:bg-coral-600 text-white py-2.5 text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer"
                >
                  Secure Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
