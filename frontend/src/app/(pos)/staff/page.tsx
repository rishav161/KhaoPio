'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, UserPlus, Shield, ToggleLeft, ToggleRight, Trash2, Edit2, 
  Mail, X, Check, Copy, AlertCircle, RefreshCw, ClipboardCheck, 
  Search, ShieldAlert, Calendar
} from 'lucide-react';
import { apiFetch } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';

interface StaffUser {
  id: string;
  name: string;
  email: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'INVITED';
  createdAt: string;
  role: {
    id: string;
    name: string;
  };
}

export default function StaffManagement() {
  const router = useRouter();
  const { user, permissions } = useAuthStore();

  // Permission checks
  const canView = permissions.includes('view:staff');
  const canInvite = permissions.includes('invite:staff');
  const canUpdate = permissions.includes('update:staff');
  const canDelete = permissions.includes('delete:staff');

  // Page states
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'WAITER' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', name: '', role: '' });
  const [editLoading, setEditLoading] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<StaffUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch all staff members
  const fetchStaff = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiFetch('/auth/admin/users');
      setStaffList(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load staff list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchStaff();
    }
  }, [canView]);

  if (!canView) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-50 px-4">
        <div className="max-w-md text-center rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-zinc-900 tracking-tight">Access Restricted</h2>
          <p className="mt-2 text-xs font-semibold text-zinc-500 leading-relaxed">
            You do not have the required permissions (`view:staff`) to view or manage staff accounts. 
            Please contact your system administrator.
          </p>
        </div>
      </div>
    );
  }

  // Handle Invite Form Submission
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setGeneratedInviteLink('');
    setInviteLoading(true);

    try {
      const res = await apiFetch('/auth/invite', {
        method: 'POST',
        body: {
          email: inviteForm.email,
          role: inviteForm.role
        }
      });

      setSuccessMsg(res.message || 'Invitation sent successfully!');
      
      // If Mailgun is bypassed, show manually copyable link
      if (res.invitation?.token) {
        const link = `${window.location.origin}/accept-invite?token=${res.invitation.token}`;
        setGeneratedInviteLink(link);
      }

      setInviteForm({ email: '', role: 'WAITER' });
      fetchStaff();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  // Copy Generated Invite Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedInviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Toggle User Status
  const handleToggleStatus = async (staff: StaffUser) => {
    if (!canUpdate) return;
    setErrorMsg('');
    setSuccessMsg('');
    const newStatus = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiFetch(`/auth/admin/users/${staff.id}`, {
        method: 'PATCH',
        body: { status: newStatus }
      });
      setSuccessMsg(`Successfully toggled ${staff.name}'s status to ${newStatus}.`);
      fetchStaff();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user status.');
    }
  };

  // Handle Edit Action
  const openEditModal = (staff: StaffUser) => {
    setEditForm({
      id: staff.id,
      name: staff.name,
      role: staff.role.name
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setEditLoading(true);

    try {
      await apiFetch(`/auth/admin/users/${editForm.id}`, {
        method: 'PATCH',
        body: {
          name: editForm.name,
          role: editForm.role
        }
      });
      setSuccessMsg('Staff member details updated successfully.');
      setIsEditOpen(false);
      fetchStaff();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to edit staff member.');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Delete Action
  const openDeleteModal = (staff: StaffUser) => {
    setUserToDelete(staff);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setErrorMsg('');
    setSuccessMsg('');
    setDeleteLoading(true);

    try {
      await apiFetch(`/auth/admin/users/${userToDelete.id}`, {
        method: 'DELETE'
      });
      setSuccessMsg(`Permanently removed ${userToDelete.name} from the staff roster.`);
      setIsDeleteOpen(false);
      setUserToDelete(null);
      fetchStaff();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete staff member.');
      setIsDeleteOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter staff by search keyword
  const filteredStaff = staffList.filter(staff => {
    const keyword = searchTerm.toLowerCase();
    return (
      staff.name.toLowerCase().includes(keyword) ||
      (staff.email && staff.email.toLowerCase().includes(keyword)) ||
      staff.role.name.toLowerCase().includes(keyword) ||
      staff.status.toLowerCase().includes(keyword)
    );
  });

  // Badge mapping colors
  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'STORE_MANAGER':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CASHIER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'WAITER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'KITCHEN_CHEF':
        return 'bg-violet-50 text-violet-700 border-violet-200';
      default:
        return 'bg-zinc-50 text-zinc-700 border-zinc-200';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'INVITED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'INACTIVE':
        return 'bg-zinc-100 text-zinc-550 border-zinc-300';
      default:
        return 'bg-zinc-50 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors">
      {/* Title Header */}
      <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Users className="h-6 w-6 text-coral-500" />
            <span>Staff Administration</span>
          </h1>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Provision roles, manage active terminal accounts, and dispatch security invitations.
          </p>
        </div>
        {canInvite && (
          <button
            onClick={() => {
              setErrorMsg('');
              setSuccessMsg('');
              setGeneratedInviteLink('');
              setIsInviteOpen(true);
            }}
            className="flex items-center gap-1.5 self-start rounded-lg bg-coral-500 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-coral-100 dark:shadow-none transition-all cursor-pointer hover:bg-coral-600 active:scale-95"
          >
            <UserPlus className="h-4.5 w-4.5" />
            <span>Invite Staff Member</span>
          </button>
        )}
      </div>

      {/* Banners */}
      {errorMsg && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-3.5 text-xs font-bold text-red-650 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-450 hover:text-red-750 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-250 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 p-3.5 text-xs font-bold text-emerald-700 dark:text-emerald-450">
          <div className="flex items-center gap-2">
            <Check className="h-4.5 w-4.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-450 hover:text-emerald-750 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Manual Invite Link Display Card */}
      {generatedInviteLink && (
        <div className="mb-4 rounded-lg border border-coral-200 dark:border-coral-900 bg-coral-50/20 dark:bg-coral-950/10 p-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <h3 className="text-xs font-black uppercase tracking-wider text-coral-750 dark:text-coral-450 mb-1">
            Manual Onboarding Link Generated
          </h3>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mb-2 font-semibold">
            Mailgun is unconfigured. Share the security invitation link below with the user to setup their terminal password and security PIN.
          </p>
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-coral-250 dark:border-coral-900 rounded-lg p-2 overflow-x-auto">
            <span className="text-[11px] font-mono text-zinc-800 dark:text-zinc-100 break-all select-all flex-1 min-w-0 mr-2">
              {generatedInviteLink}
            </span>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 shrink-0 rounded bg-coral-500 hover:bg-coral-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 transition-colors cursor-pointer"
            >
              {copiedLink ? <ClipboardCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Search and Control Bar */}
      <div className="mb-4 flex items-center gap-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-2 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search staff by name, email, role, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent py-1.5 pr-3 pl-10 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
          />
        </div>
        <button
          onClick={fetchStaff}
          disabled={loading}
          className="rounded-lg p-2 text-zinc-500 dark:text-zinc-450 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          title="Reload Roster"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Staff Roster Grid/Table */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        {loading ? (
          <div className="flex h-full w-full flex-col items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-coral-500 border-t-transparent"></div>
            <p className="mt-3 text-xs font-bold text-zinc-500 dark:text-zinc-400">Querying active staff roster...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-405 dark:text-zinc-500 mb-3">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No Staff Members Found</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Try adjusting your search criteria or invite a new staff member.
            </p>
          </div>
        ) : (
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-950/40 text-[10px] font-black uppercase tracking-wider text-zinc-550 dark:text-zinc-455">
                  <tr>
                    <th scope="col" className="px-4 py-3">Name</th>
                    <th scope="col" className="px-4 py-3">Email</th>
                    <th scope="col" className="px-4 py-3">System Role</th>
                    <th scope="col" className="px-4 py-3">Terminal Status</th>
                    <th scope="col" className="px-4 py-3">Registered On</th>
                    <th scope="col" className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                  {filteredStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-coral-100 dark:bg-coral-950/30 font-black text-coral-600 dark:text-coral-400 uppercase text-xs">
                            {staff.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-zinc-900 dark:text-zinc-100">{staff.name}</div>
                            {staff.id === user?.id && (
                              <span className="inline-flex items-center text-[9px] font-black uppercase tracking-widest text-coral-600 dark:text-coral-450 bg-coral-50 dark:bg-coral-950/20 px-1.5 py-0.5 rounded border border-coral-200 dark:border-coral-900">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-zinc-500 dark:text-zinc-400 font-medium font-mono">
                        {staff.email || 'PIN-only quick log'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black tracking-wide uppercase ${getRoleStyle(staff.role.name)}`}>
                          {staff.role.name.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black tracking-wide uppercase ${getStatusStyle(staff.status)}`}>
                          {staff.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-zinc-500 font-medium font-mono">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                          <span>{new Date(staff.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canUpdate && staff.id !== user?.id && (
                            <button
                              onClick={() => handleToggleStatus(staff)}
                              className="rounded p-1.5 text-zinc-555 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer transition-colors"
                              title={staff.status === 'ACTIVE' ? 'Disable Terminal' : 'Enable Terminal'}
                            >
                              {staff.status === 'ACTIVE' ? (
                                <ToggleRight className="h-5 w-5 text-coral-500" />
                              ) : (
                                <ToggleLeft className="h-5 w-5 text-zinc-400" />
                              )}
                            </button>
                          )}
                          {canUpdate && (
                            <button
                              onClick={() => openEditModal(staff)}
                              className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-blue-600 cursor-pointer transition-colors"
                              title="Edit Member"
                            >
                              <Edit2 className="h-4.5 w-4.5" />
                            </button>
                          )}
                          {canDelete && staff.id !== user?.id && (
                            <button
                              onClick={() => openDeleteModal(staff)}
                              className="rounded p-1.5 text-zinc-555 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
                              title="Remove Member"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-coral-500 via-amber-500 to-yellow-400"></div>
            
            <button
              onClick={() => setIsInviteOpen(false)}
              className="absolute right-4 top-4 rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:text-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
              <UserPlus className="h-5 w-5 text-coral-500" />
              <span>Invite Staff Member</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-semibold">
              Invite a staff member by setting their email address and assigning their default security role.
            </p>

            <form onSubmit={handleInviteSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-550 dark:text-zinc-450 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    placeholder="e.g. staffmember@khaopio.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3 pl-10 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-coral-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-550 dark:text-zinc-450 mb-1.5">
                  Staff Role
                </label>
                <div className="relative">
                  <Shield className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3 pl-10 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition-all focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-coral-500 appearance-none cursor-pointer"
                  >
                    <option value="STORE_MANAGER">Store Manager</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="WAITER">Waiter</option>
                    <option value="KITCHEN_CHEF">Kitchen Chef</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-805 pt-4">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="rounded-lg bg-coral-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-coral-600 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {inviteLoading ? 'Generating Invitation...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-coral-500 via-amber-500 to-yellow-400"></div>

            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute right-4 top-4 rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:text-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
              <Edit2 className="h-5 w-5 text-coral-500" />
              <span>Edit Staff Details</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-semibold">
              Modify the profile details and system privileges for this staff member.
            </p>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-550 dark:text-zinc-450 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-coral-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-550 dark:text-zinc-450 mb-1.5">
                  System Role
                </label>
                <div className="relative">
                  <Shield className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    disabled={editForm.role === 'SUPER_ADMIN'}
                    className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3 pl-10 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition-all focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-coral-500 appearance-none cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
                  >
                    {editForm.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}
                    <option value="STORE_MANAGER">Store Manager</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="WAITER">Waiter</option>
                    <option value="KITCHEN_CHEF">Kitchen Chef</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-805 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-lg bg-coral-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-coral-600 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {editLoading ? 'Updating Profile...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-650"></div>

            <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
              <Trash2 className="h-5 w-5 text-red-500" />
              <span>Remove Staff Member?</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed font-semibold">
              Are you sure you want to permanently remove <strong className="text-zinc-900 dark:text-zinc-50 font-extrabold">{userToDelete.name}</strong> from the system?
              This will revoke all system terminal access privileges. This action is permanent.
            </p>

            <div className="mt-6 flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteOpen(false);
                  setUserToDelete(null);
                }}
                className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-355 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-white hover:bg-red-500 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? 'Removing...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
