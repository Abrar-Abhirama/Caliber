import { useEffect, useState } from "react";

export const PROFILE_KEY = "plant-hub-profile";
export const PROFILE_EVENT = "plant-hub-profile-change";
export const DEFAULT_PROFILE = { name: "Budi", role: "Plant Engineer" };

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Profile just won't persist.
  }
  window.dispatchEvent(new Event(PROFILE_EVENT));
}

// Current display name, kept in sync when the profile is edited.
export function useProfileName() {
  const [name, setName] = useState(() => loadProfile().name);
  useEffect(() => {
    const sync = () => setName(loadProfile().name);
    window.addEventListener(PROFILE_EVENT, sync);
    return () => window.removeEventListener(PROFILE_EVENT, sync);
  }, []);
  return name;
}
