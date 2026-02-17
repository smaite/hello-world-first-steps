import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'app_keybinds';

export interface KeyBind {
  key: string;
  path: string;
  label: string;
}

const DEFAULT_KEYBINDS: KeyBind[] = [
  { key: 'a', path: '/exchange', label: 'Exchange' },
  { key: 'd', path: '/dashboard', label: 'Dashboard' },
  { key: 'c', path: '/cash-tracker', label: 'Cash Tracker' },
  { key: 'u', path: '/customers', label: 'Customers' },
  { key: 'r', path: '/reports/daily', label: 'Daily Reports' },
  { key: 't', path: '/reports/transactions', label: 'Transactions' },
  { key: 'e', path: '/expenses', label: 'Expenses' },
  { key: 's', path: '/settings', label: 'Settings' },
];

export const getKeybinds = (): KeyBind[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_KEYBINDS;
};

export const saveKeybinds = (binds: KeyBind[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(binds));
};

export const resetKeybinds = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const useKeybinds = () => {
  const navigate = useNavigate();
  const [keybinds, setKeybinds] = useState<KeyBind[]>(getKeybinds);

  const reload = useCallback(() => {
    setKeybinds(getKeybinds());
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea/select or using modifier keys
      const tag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const match = keybinds.find((kb) => kb.key.toLowerCase() === e.key.toLowerCase());
      if (match) {
        e.preventDefault();
        navigate(match.path);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [keybinds, navigate]);

  return { keybinds, setKeybinds, reload };
};
