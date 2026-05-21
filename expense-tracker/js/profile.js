// ===================== profile.js =====================
import { updateUser } from './storage.js';

export function loadProfileForm(user) {
  document.getElementById('profileName').value = user.name || '';
  document.getElementById('profileEmail').value = user.email || '';
  document.getElementById('profileCurrency').value = user.currency || '₹';
}

export function updateAvatarUIs(user) {
  const initial = (user.name || 'U').charAt(0).toUpperCase();
  const avatar = user.avatar || '';

  // Sidebar
  const sidebarImg = document.getElementById('sidebarAvatarImg');
  const sidebarInitial = document.getElementById('sidebarAvatarInitial');
  if (avatar) { sidebarImg.src = avatar; sidebarImg.style.display = 'block'; sidebarInitial.style.display = 'none'; }
  else { sidebarImg.style.display = 'none'; sidebarInitial.style.display = 'flex'; sidebarInitial.textContent = initial; }

  // Header
  const headerImg = document.getElementById('headerAvatarImg');
  const headerInitial = document.getElementById('headerAvatarInitial');
  if (avatar) { headerImg.src = avatar; headerImg.style.display = 'block'; headerInitial.style.display = 'none'; }
  else { headerImg.style.display = 'none'; headerInitial.style.display = 'flex'; headerInitial.textContent = initial; }

  // Profile section
  const profileImg = document.getElementById('profileAvatarImg');
  const profileInitial = document.getElementById('profileAvatarInitial');
  if (avatar) { profileImg.src = avatar; profileImg.style.display = 'block'; profileInitial.style.display = 'none'; }
  else { profileImg.style.display = 'none'; profileInitial.style.display = 'flex'; profileInitial.textContent = initial; }

  document.getElementById('sidebarName').textContent = user.name || 'User';
}

export function handleAvatarUpload(file, user, onUpdate) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const updated = { ...user, avatar: e.target.result };
    updateUser(updated);
    onUpdate(updated);
  };
  reader.readAsDataURL(file);
}

// ===================== PROFILE SAVE =====================

// profile.js

profileForm.addEventListener('submit', (e) => {
  e.preventDefault();

  user.name = profileName.value.trim();
  user.email = profileEmail.value.trim();

  // SAVE CURRENCY
  user.currency = profileCurrency.value;

  updateUser(user);

  // REFRESH FULL APP
  window.location.reload();
});
