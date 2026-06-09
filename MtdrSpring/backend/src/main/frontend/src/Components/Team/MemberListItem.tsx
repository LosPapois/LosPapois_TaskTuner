import React from 'react';
import { UserIcon } from '@heroicons/react/24/outline';
import MemberAvatar, { AvatarTone } from './MemberAvatar';

export interface MemberListItemProps {
  name: string;
  role: string;
  selected: boolean;
  avatarTone?: AvatarTone;
  onSelect: () => void;
  /**
   * When true the row renders as a placeholder for tasks without an assignee:
   *   - dashed border instead of solid (signals "no real person here")
   *   - generic person outline icon instead of a colored letter avatar
   *   - italic, muted text
   * Used by the Sprint developer board to make the "Unassigned" bucket
   * visually distinct from real team members.
   */
  isUnassigned?: boolean;
}

/**
 * Selectable member entry shown in the left column of the Team page.
 * Highlights with a brand-colored border + light brand background when
 * `selected` is true so the chosen member stays obvious as the user
 * scrolls the right-hand detail panel.
 */
function MemberListItem({
  name,
  role,
  selected,
  avatarTone,
  onSelect,
  isUnassigned,
}: MemberListItemProps) {
  if (isUnassigned) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition-colors text-left
          ${
            selected
              ? 'border-brand bg-brand-lighter'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }`}
      >
        <span
          className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-full bg-white border-2 border-dashed border-gray-300"
          aria-hidden="true"
        >
          <UserIcon className="h-5 w-5 text-gray-400" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold italic text-gray-600 truncate">{name}</div>
          <div className="text-xs text-gray-400 truncate">{role}</div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left
        ${
          selected
            ? 'border-brand bg-brand-lighter'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        }`}
    >
      <MemberAvatar name={name} size="md" tone={avatarTone} />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-800 truncate">{name}</div>
        <div className="text-xs text-gray-500 truncate">{role}</div>
      </div>
    </button>
  );
}

export default React.memo(MemberListItem);
