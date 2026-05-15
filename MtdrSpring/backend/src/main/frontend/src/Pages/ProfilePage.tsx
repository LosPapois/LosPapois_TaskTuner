import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChatBubbleOvalLeftIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  TrashIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  clearStorageByPattern,
  getFromStorage,
  saveToStorage,
  STORAGE_KEYS,
} from '../Utils/storage';
import { API_CONFIG } from '../config';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shape of the object stored in STORAGE_KEYS.USER by useLogin — the login
 * endpoint returns exactly this (plus the auth token, which only fetchAuth
 * cares about).
 */
interface SessionUser {
  userId: number;
  nameUser: string;
  mail: string;
  role: string;
  idTelegram: string;
  token?: string;
}

/** Display-friendly view used by the form + read view. */
interface ProfileData {
  name: string;
  role: string;
  email: string;
  telegramId: string;
}

interface PasswordData {
  newPass: string;
  confirm: string;
}

const EMPTY_PASSWORD: PasswordData = { newPass: '', confirm: '' };

/** Backend CHECK constraint allows only these two role values. */
const ROLE_OPTIONS = [
  { value: 'manager',   label: 'Manager'   },
  { value: 'developer', label: 'Developer' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Convert the session user shape into the display profile shape. */
function userToProfile(u: SessionUser): ProfileData {
  return {
    name: u.nameUser,
    // Raw backend value ('manager' | 'developer') so the form's <select>
    // matches an option. Capitalization for read-mode happens in render.
    role: u.role || 'developer',
    email: u.mail ?? '',
    telegramId: u.idTelegram,
  };
}

/** Title-case a role for display ('manager' → 'Manager'). */
function displayRole(role: string): string {
  if (!role) return 'Member';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const navigate = useNavigate();

  // Seed from the cache filled by useLogin — the user object lands there
  // verbatim from POST /api/auth/login.
  const [user, setUser] = useState<SessionUser | null>(() =>
    getFromStorage<SessionUser>(STORAGE_KEYS.USER)
  );

  const [profile, setProfile] = useState<ProfileData | null>(() =>
    user ? userToProfile(user) : null
  );

  const [draft, setDraft] = useState<ProfileData | null>(profile);
  const [isEditing, setIsEditing] = useState(false);
  const [passwords, setPasswords] = useState<PasswordData>(EMPTY_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete-account flow state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Background refresh: pull the freshest user from the backend so this page
  // reflects edits made elsewhere (Telegram bot, admin tooling, etc.).
  // The token isn't part of the GET response, so we preserve it from cache.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/users-tt/${user.userId}`)
      .then(r => (r.ok ? r.json() : null))
      .then((fresh: SessionUser | null) => {
        if (cancelled || !fresh) return;
        const merged: SessionUser = { ...user, ...fresh, token: user.token };
        setUser(merged);
        setProfile(userToProfile(merged));
        saveToStorage(STORAGE_KEYS.USER, merged);
      })
      .catch(() => {
        /* Keep cached profile on failure — no UI noise. */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  // ─── Empty / unauthenticated state ────────────────────────────────────────

  if (!user || !profile) {
    return (
      <div className="bg-gray-50 min-h-full px-6 py-12">
        <p className="text-center text-gray-500">
          Sign in to view your profile.
        </p>
      </div>
    );
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleEdit = () => {
    setDraft(profile);
    setPasswords(EMPTY_PASSWORD);
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(profile);
    setPasswords(EMPTY_PASSWORD);
    setError(null);
    setIsEditing(false);
  };

  const handleChange = (field: keyof ProfileData, value: string) => {
    setDraft(prev => (prev ? { ...prev, [field]: value } : null));
  };

  const handlePasswordChange = (field: keyof PasswordData, value: string) => {
    setPasswords(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;

    // Password is optional. If user typed something, both fields must match.
    // If both empty, password is left untouched (backend skips when null/empty).
    const wantsPasswordChange =
      passwords.newPass.length > 0 || passwords.confirm.length > 0;
    if (wantsPasswordChange && passwords.newPass !== passwords.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // PUT body mirrors the UserTT entity. `password` is included only when
      // the user actually wants to change it — backend leaves the existing
      // hash alone when this field is null/empty.
      const body: Record<string, unknown> = {
        userId:     user.userId,
        nameUser:   draft.name,
        mail:       draft.email,
        idTelegram: draft.telegramId,
        role:       draft.role,
      };
      if (wantsPasswordChange) {
        body.password = passwords.newPass;
      }

      const res = await fetch(`/api/users-tt/${user.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`PUT /api/users-tt/${user.userId} → ${res.status}`);

      const updated = (await res.json()) as SessionUser;
      const merged: SessionUser = { ...user, ...updated, token: user.token };
      setUser(merged);
      setProfile(userToProfile(merged));
      saveToStorage(STORAGE_KEYS.USER, merged);
      setPasswords(EMPTY_PASSWORD);
      setIsEditing(false);
    } catch (err) {
      console.error('[ProfilePage] save failed', err);
      setError('Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete account handlers ──────────────────────────────────────────────

  const openDeleteModal = () => {
    setDeleteEmail('');
    setDeletePassword('');
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setShowDeleteModal(false);
    setDeleteEmail('');
    setDeletePassword('');
    setDeleteError(null);
  };

  // Confirm is enabled only when the typed email matches the account's email
  // exactly (case-insensitive) AND a password has been typed. This is the
  // "notorious verification" — a typo means the button stays disabled.
  const emailMatches =
    deleteEmail.trim().toLowerCase() === (user?.mail ?? '').toLowerCase();
  const canConfirmDelete =
    emailMatches && deletePassword.length > 0 && !deleting;

  const handleDeleteAccount = async () => {
    if (!user || !canConfirmDelete) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      // Re-verify password by re-authenticating. Bypasses the global fetch
      // wrapper's Bearer header since /api/auth/* is excluded from the
      // backend's security filter anyway.
      const verifyRes = await fetch(API_CONFIG.auth.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mail: deleteEmail.trim(), password: deletePassword }),
      });
      if (!verifyRes.ok) {
        setDeleteError('Incorrect email or password.');
        setDeleting(false);
        return;
      }

      const delRes = await fetch(`/api/users-tt/${user.userId}`, {
        method: 'DELETE',
      });
      if (!delRes.ok) {
        throw new Error(`DELETE /api/users-tt/${user.userId} → ${delRes.status}`);
      }

      // Wipe the entire app cache so the next user starting from this browser
      // doesn't see ghost data from the deleted session.
      clearStorageByPattern(/^task_tuner_/);
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('[ProfilePage] delete failed', err);
      setDeleteError('Could not delete your account. Please try again.');
      setDeleting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm shadow-gray-200/60 border border-gray-200 overflow-hidden">
        {/* Header banner */}
        <div className="bg-brand-dark px-8 py-10 flex items-center gap-6">
          <div className="bg-white rounded-full p-3">
            <UserCircleIcon className="h-16 w-16 text-brand" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
            <p className="text-brand-lighter text-sm mt-1">{displayRole(profile.role)}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Profile Information
            </h2>
            {!isEditing && (
              <button
                onClick={handleEdit}
                className="px-5 py-2 border-2 border-brand text-brand rounded-full font-medium hover:bg-brand-lighter transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          {isEditing && draft ? (
            <form id="profile-form" onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={draft.name}
                  onChange={e => handleChange('name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={draft.role}
                  onChange={e => handleChange('role', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {ROLE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={draft.email}
                  onChange={e => handleChange('email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telegram ID
                </label>
                <input
                  type="text"
                  required
                  value={draft.telegramId}
                  onChange={e => handleChange('telegramId', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3"
                >
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 px-5 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-5 py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="text-lg text-gray-900 font-medium">{profile.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="text-lg text-gray-900 font-medium">{displayRole(profile.role)}</p>
              </div>
              <div className="flex items-center gap-2">
                <EnvelopeIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-lg text-gray-900 font-medium">
                    {profile.email || '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ChatBubbleOvalLeftIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm text-gray-500">Telegram</p>
                  <p className="text-lg text-gray-900 font-medium">
                    {profile.telegramId}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Delete account — destructive action, only shown when not editing */}
          {!isEditing && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={openDeleteModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                <TrashIcon className="h-5 w-5" aria-hidden="true" />
                Delete My Account
              </button>
            </div>
          )}

          {/* Password section — fields live inside the same form as profile */}
          {/* (no nested <form>!), so they submit together via handleSave. */}
          {/* Leaving both empty keeps the existing password untouched. */}
          {isEditing && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <LockClosedIcon className="h-5 w-5" />
                Change Password
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Leave both fields empty to keep your current password.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwords.newPass}
                    onChange={e => handlePasswordChange('newPass', e.target.value)}
                    form="profile-form"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwords.confirm}
                    onChange={e => handlePasswordChange('confirm', e.target.value)}
                    form="profile-form"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Delete-account confirmation modal ──────────────────────────── */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
              <ExclamationTriangleIcon
                className="h-7 w-7 text-white"
                aria-hidden="true"
              />
              <h2
                id="delete-modal-title"
                className="text-xl font-bold text-white"
              >
                Delete account permanently
              </h2>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                <p className="font-semibold">This action cannot be undone.</p>
                <p className="mt-1">
                  Your account, profile, and access to all projects will be
                  removed immediately.
                </p>
              </div>

              <p className="text-sm text-gray-700">
                To confirm, type your email and password below.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type your email
                </label>
                <input
                  type="email"
                  value={deleteEmail}
                  onChange={e => setDeleteEmail(e.target.value)}
                  disabled={deleting}
                  placeholder={user.mail || 'your@email.com'}
                  autoComplete="off"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                {deleteEmail.length > 0 && !emailMatches && (
                  <p className="mt-1 text-xs text-red-600">
                    Email does not match the account email.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  disabled={deleting}
                  autoComplete="current-password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {deleteError && (
                <p
                  role="alert"
                  className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3"
                >
                  {deleteError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={!canConfirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting…' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
