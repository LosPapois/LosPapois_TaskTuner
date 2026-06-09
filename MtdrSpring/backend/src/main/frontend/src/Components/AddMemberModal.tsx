import React, { useState, useEffect } from 'react';

interface Member {
  name: string;
  role: string;
  email: string;
  telegramId: string;
}

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (member: Member) => void;
  initialData?: Member | null;
}

const EMPTY_MEMBER: Member = { name: '', role: '', email: '', telegramId: '' };

export default function AddMemberModal({ isOpen, onClose, onSave, initialData }: AddMemberModalProps) {
  const [form, setForm] = useState<Member>(EMPTY_MEMBER);
  const isEditing = !!initialData;

  useEffect(() => {
    setForm(initialData ?? EMPTY_MEMBER);
  }, [initialData, isOpen]);

  function handleChange(field: keyof Member, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="modal-card w-full max-w-md mx-4 p-8">
        <h2 className="heading-page!">
          {isEditing ? 'Edit Member' : 'Add New Member'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="label-form">Full Name</label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              className="input-brand"
            />
          </div>
          <div>
            <label htmlFor="email" className="label-form">Email</label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              className="input-brand"
            />
          </div>
          <div>
            <label htmlFor="role" className="label-form">Role</label>
            <input
              id="role"
              type="text"
              required
              value={form.role}
              onChange={e => handleChange('role', e.target.value)}
              className="input-brand"
            />
          </div>
          <div>
            <label htmlFor="telegramId" className="label-form">Telegram ID</label>
            <input
              id="telegramId"
              type="text"
              required
              value={form.telegramId}
              onChange={e => handleChange('telegramId', e.target.value)}
              className="input-brand"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
            >
              {isEditing ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
