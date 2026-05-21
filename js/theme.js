// ===================== theme.js =====================
import { getCurrentUser, updateUser } from './storage.js';

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';

  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.checked = theme === 'dark';
}

export function initTheme() {
  const user = getCurrentUser();
  const saved = user?.theme || localStorage.getItem('finflow_theme') || 'light';
  applyTheme(saved);
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('finflow_theme', next);

  const user = getCurrentUser();
  if (user) updateUser({ ...user, theme: next });

  return next;
}
