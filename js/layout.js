/**
 * Mobile app shell — fixed bottom icon navigation.
 */

const layoutConfig = {
  appName: 'Calorie Tracker',
};

const NAV_ITEMS = [
  { href: 'calorie.html', label: 'วันนี้', icon: 'utensils', id: 'calorie' },
  { href: 'dashboard.html', label: 'แดชบอร์ด', icon: 'layout-dashboard', id: 'dashboard' },
  { href: 'history.html', label: 'ประวัติ', icon: 'history', id: 'history' },
];

function getActiveNavId() {
  const file = (location.pathname.split('/').pop() || 'calorie.html').toLowerCase();
  if (file.includes('history')) return 'history';
  if (file.includes('dashboard')) return 'dashboard';
  return 'calorie';
}

function initLayout(options = {}) {
  const activeId = options.activeId || getActiveNavId();
  renderBottomNav(activeId);
  if (window.lucide) {
    lucide.createIcons();
  }
}

function renderBottomNav(activeId) {
  const container = document.getElementById('bottom-nav');
  if (!container) return;

  container.innerHTML = `
    <nav class="app-tabbar" aria-label="เมนูหลัก">
      ${NAV_ITEMS.map((item) => {
        const isActive = item.id === activeId;
        return `
          <a href="${item.href}"
             class="app-tab ${isActive ? 'is-active' : ''}"
             aria-current="${isActive ? 'page' : 'false'}">
            <i data-lucide="${item.icon}" class="app-tab__icon" aria-hidden="true"></i>
            <span class="app-tab__label">${item.label}</span>
          </a>
        `;
      }).join('')}
    </nav>
  `;
}

async function handleSignOut() {
  try {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Error signing out:', error);
    alert('เกิดข้อผิดพลาดในการออกจากระบบ');
  }
}
