import { useCallback, useEffect, useRef, useState } from "react";
import { IconBook, IconChevronUpDown, IconTrash, IconUser } from "./icons.jsx";
import { useDismiss } from "./useDismiss.js";
import { DEFAULT_PROFILE, loadProfile, saveProfile } from "../../services/profile.js";

const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

function EditProfileDialog({ profile, onSave, onClose }) {
  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-dialog-title"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ name: name.trim() || DEFAULT_PROFILE.name, role: role.trim() });
        }}
      >
        <h2 id="profile-dialog-title" className="dialog-title">Edit profile</h2>
        <div className="dialog-avatar">
          <span className="avatar lg">{initials(name || DEFAULT_PROFILE.name)}</span>
        </div>
        <label className="field">
          <span className="field-label">Display name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
        </label>
        <label className="field">
          <span className="field-label">Role</span>
          <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={40} placeholder="e.g. Plant Engineer" />
        </label>
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProfileMenu({ onOpenKnowledge, onClearChats, hasChats }) {
  const [profile, setProfile] = useState(loadProfile);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const save = (next) => {
    setProfile(next);
    setEditing(false);
    saveProfile(next);
  };

  const pick = (fn) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className="profile" ref={ref}>
      {open && (
        <div className="picker-menu profile-menu" role="menu" aria-label="Account">
          <div className="profile-menu-head">
            <span className="avatar">{initials(profile.name)}</span>
            <span className="profile-text">
              <span className="profile-name">{profile.name}</span>
              {profile.role && <span className="profile-role">{profile.role}</span>}
            </span>
          </div>
          <div className="menu-sep" />
          <button type="button" role="menuitem" className="menu-item" onClick={pick(() => setEditing(true))}>
            <IconUser width={18} height={18} />
            Edit profile
          </button>
          <button type="button" role="menuitem" className="menu-item" onClick={pick(onOpenKnowledge)}>
            <IconBook width={18} height={18} />
            Knowledge Base
          </button>
          <div className="menu-sep" />
          <button
            type="button"
            role="menuitem"
            className="menu-item danger"
            disabled={!hasChats}
            onClick={pick(() => {
              if (window.confirm("Delete all chats? This can't be undone.")) onClearChats();
            })}
          >
            <IconTrash width={18} height={18} />
            Clear chat history
          </button>
        </div>
      )}

      <button
        type="button"
        className="profile-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="avatar">{initials(profile.name)}</span>
        <span className="profile-text">
          <span className="profile-name">{profile.name}</span>
          {profile.role && <span className="profile-role">{profile.role}</span>}
        </span>
        <IconChevronUpDown width={16} height={16} />
      </button>

      {editing && <EditProfileDialog profile={profile} onSave={save} onClose={() => setEditing(false)} />}
    </div>
  );
}
