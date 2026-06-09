import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChatBubbleOvalLeftIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  TrashIcon,
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
      <div className="app-page-bg min-h-full px-6 py-12">
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

  // Helper for read-only field rows in view mode. Keeps the JSX DRY since
  // every field uses the same label + value structure.
  const Field = ({
    label,
    value,
    icon: Icon,
  }: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }) => (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
        {label}
      </p>
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" aria-hidden="true" />}
        <p className="text-base text-gray-900 font-medium truncate">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-full app-page-bg py-8 px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Page header — same hierarchy as the rest of the app. */}
        <header>
          <h1 className="text-2xl font-bold text-gray-900 m-0">My Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your account details and security settings.
          </p>
        </header>

        {/* Profile Information card */}
        <section className="card-base">
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900 m-0">
              Profile Information
            </h2>
            {!isEditing && (
              <button
                onClick={handleEdit}
                className="px-4 py-2 text-sm font-semibold text-white bg-brand rounded-lg
                           hover:bg-brand-dark transition-colors shadow-sm"
              >
                Edit Profile
              </button>
            )}
          </div>

          {isEditing && draft ? (
            <form id="profile-form" onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={draft.name}
                  onChange={e => handleChange('name', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg
                             text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Role
                </label>
                <select
                  value={draft.role}
                  onChange={e => handleChange('role', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-white
                             text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
                >
                  {ROLE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={draft.email}
                  onChange={e => handleChange('email', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg
                             text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Telegram ID
                </label>
                <input
                  type="text"
                  required
                  value={draft.telegramId}
                  onChange={e => handleChange('telegramId', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg
                             text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3"
                >
                  {error}
                </p>
              )}
            </form>
          ) : (
            // View mode: clean 2-column grid (collapses to 1 col on mobile).
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <Field label="Full Name" value={profile.name} />
              <Field label="Role" value={displayRole(profile.role)} />
              <Field label="Email" value={profile.email || '—'} icon={EnvelopeIcon} />
              <Field label="Telegram" value={profile.telegramId} icon={ChatBubbleOvalLeftIcon} />
            </dl>
          )}

          {/* Password section — only when editing. Inputs use form="profile-form" */}
          {/* so they submit together via handleSave without nesting <form>. */}
          {isEditing && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="text-base font-semibold text-gray-900 mb-1.5 flex items-center gap-2">
                <LockClosedIcon className="h-4 w-4 text-gray-500" aria-hidden="true" />
                Change Password
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Leave both fields empty to keep your current password.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwords.newPass}
                    onChange={e => handlePasswordChange('newPass', e.target.value)}
                    form="profile-form"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg
                               text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwords.confirm}
                    onChange={e => handlePasswordChange('confirm', e.target.value)}
                    form="profile-form"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg
                               text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action buttons for edit mode — sit at the bottom of the same card. */}
          {isEditing && (
            <div className="mt-8 pt-6 border-t border-gray-100 flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg
                           text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="profile-form"
                disabled={saving}
                className="flex-1 px-5 py-2.5 bg-brand text-white rounded-lg
                           text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </section>

        {/* Danger Zone — separate card so it doesn't bleed into the calm */}
        {/* profile section. Visually distinct via red icon + red CTA. */}
        {!isEditing && (
          <section className="card-base">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3 min-w-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900 m-0">
                    Danger Zone
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Permanently delete your account. This action cannot be undone.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={openDeleteModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold
                           text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                <TrashIcon className="h-4 w-4" aria-hidden="true" />
                Delete My Account
              </button>
            </div>
          </section>
        )}
      </div>

      {/* ─── Delete-account confirmation modal ──────────────────────────── */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="modal-card w-full max-w-md overflow-hidden">
            {/* Neutral header with a red icon chip — same calm treatment as */}
            {/* ConfirmDeleteModal so all destructive actions feel coherent. */}
            <div className="px-6 pt-6 pb-2 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 flex-shrink-0">
                <ExclamationTriangleIcon
                  className="h-6 w-6 text-red-600"
                  aria-hidden="true"
                />
              </span>
              <h2
                id="delete-modal-title"
                className="text-xl font-bold text-gray-900"
              >
                Delete account permanently
              </h2>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="text-sm text-gray-700">
                <p className="font-semibold text-gray-900">This action cannot be undone.</p>
                <p className="mt-1 text-gray-600">
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
