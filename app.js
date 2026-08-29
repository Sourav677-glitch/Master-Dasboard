const MASTER_SCRIPT_URL='https://script.google.com/macros/s/AKfycbxi1OS8Pp4DQbkR5zaL_UhfQe-2ns7A3NRml4MRFqVc6xr_CKT-lME_nPF3PREq_8A/exec';

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.classList.contains('login-page')) initLogin();
  if (document.body.classList.contains('dashboard-page')) initDashboard();
});

/* ---------------- LOGIN ---------------- */

function initLogin() {
  const u = document.getElementById('username');
  const p = document.getElementById('password');
  const b = document.getElementById('loginBtn');
  const s = document.getElementById('loginStatus');
  const t = document.getElementById('togglePassword');

  if (!u || !p || !b) return;

  // Stop normal browser autocomplete/suggestion behaviour.
  u.setAttribute('autocomplete', 'off');
  u.setAttribute('autocorrect', 'off');
  u.setAttribute('autocapitalize', 'none');
  u.setAttribute('spellcheck', 'false');
  p.setAttribute('autocomplete', 'new-password');

  if (t) {
    t.addEventListener('click', () => {
      const show = p.type === 'password';
      p.type = show ? 'text' : 'password';
      t.textContent = show ? '◉' : '◌';
    });
  }

  async function login() {
    const username = u.value.trim();
    const password = p.value;

    if (!username || !password) {
      if (s) s.textContent = 'Please enter both Username and Password.';
      return;
    }

    if (!/^https?:\/\//i.test(MASTER_SCRIPT_URL)) {
      if (s) s.textContent = 'Login service is not configured.';
      return;
    }

    b.disabled = true;
    b.textContent = 'Authenticating...';
    if (s) s.textContent = '';

    try {
      const result = await loginViaJsonp(username, password);

      if (result && result.status === 'success') {
        sessionStorage.setItem('masterAuth', JSON.stringify({
          username: result.username || username,
          role: result.role || 'user',
          loggedAt: Date.now()
        }));

        window.location.href = 'dashboard.html';
        return;
      }

      if (s) {
        s.textContent = (result && result.message)
          ? result.message
          : 'Invalid username or password.';
      }
    } catch (err) {
      console.error('Master Dashboard login error:', err);
      if (s) {
        s.textContent =
          'Login service unavailable. Check the Master Dashboard Apps Script deployment URL.';
      }
    } finally {
      b.disabled = false;
      b.textContent = '🔐 Login to Master Dashboard';
    }
  }

  b.addEventListener('click', login);

  [u, p].forEach(input => {
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') login();
    });
  });
}

/*
 * JSONP is used because the Master Dashboard may be hosted on GitHub Pages
 * while the authentication endpoint is hosted on Google Apps Script.
 * A normal fetch() can fail because of cross-origin/redirect behaviour.
 */
function loginViaJsonp(username, password) {
  return new Promise((resolve, reject) => {
    const callbackName =
      '__masterLogin_' + Date.now() + '_' + Math.floor(Math.random() * 100000);

    const script = document.createElement('script');
    let finished = false;

    const cleanup = () => {
      finished = true;
      try { delete window[callbackName]; } catch (_) {}
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    const timer = setTimeout(() => {
      if (finished) return;
      cleanup();
      reject(new Error('Authentication request timed out.'));
    }, 15000);

    window[callbackName] = data => {
      if (finished) return;
      clearTimeout(timer);
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      if (finished) return;
      clearTimeout(timer);
      cleanup();
      reject(new Error('Unable to reach Google Apps Script.'));
    };

    const query = new URLSearchParams({
      action: 'login',
      username: username,
      password: password,
      callback: callbackName
    });

    script.src = MASTER_SCRIPT_URL + '?' + query.toString();
    document.head.appendChild(script);
  });
}

/* ---------------- SESSION ---------------- */

function getAuth() {
  try {
    return JSON.parse(sessionStorage.getItem('masterAuth') || 'null');
  } catch (_) {
    return null;
  }
}

function initDashboard() {
  const a = getAuth();

  if (!a) {
    window.location.href = 'index.html';
    return;
  }

  const userName = document.getElementById('userName');
  const userRole = document.getElementById('userRole');
  const accessLevel = document.getElementById('accessLevel');
  const footerYear = document.getElementById('footerYear');

  if (userName) userName.textContent = a.username;
  if (userRole) userRole.textContent = a.role === 'admin' ? 'Administrator' : 'Authorized User';
  if (accessLevel) accessLevel.textContent = a.role === 'admin' ? 'ADMIN' : 'USER';
  if (footerYear) footerYear.textContent = `© ${new Date().getFullYear()} Government of West Bengal`;

  setupCategories();
  renderApps();
  setupClock();

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('masterAuth');
      window.location.href = 'index.html';
    });
  }

  const appSearch = document.getElementById('appSearch');
  if (appSearch) {
    appSearch.addEventListener('input', debounce(() => renderApps(), 120));
    appSearch.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        appSearch.value = '';
        renderApps();
      }
    });
  }

  const categoryFilter = document.getElementById('categoryFilter');
  if (categoryFilter) categoryFilter.addEventListener('change', renderApps);

  const clearFilters = () => {
    if (appSearch) appSearch.value = '';
    if (categoryFilter) categoryFilter.value = 'all';
    renderApps();
    appSearch?.focus();
  };

  const clearBtn = document.getElementById('clearFiltersBtn');
  if (clearBtn) clearBtn.addEventListener('click', clearFilters);

  const noResultsClearBtn = document.getElementById('noResultsClearBtn');
  if (noResultsClearBtn) noResultsClearBtn.addEventListener('click', clearFilters);

  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => refreshDashboard(refreshBtn));
  }
}

function debounce(fn, wait = 120) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

async function refreshDashboard(button) {
  if (button?.dataset.refreshing === 'true') return;
  if (button) {
    button.dataset.refreshing = 'true';
    button.classList.add('is-refreshing');
    button.disabled = true;
  }

  // Registry data is local, so refresh means rebuilding categories/cards and KPIs.
  setupCategories();
  await new Promise(resolve => requestAnimationFrame(resolve));
  renderApps();
  updateRefreshStatus();

  setTimeout(() => {
    if (button) {
      button.dataset.refreshing = 'false';
      button.classList.remove('is-refreshing');
      button.disabled = false;
    }
  }, 500);
}

function updateRefreshStatus() {
  const status = document.getElementById('refreshStatus');
  if (!status) return;
  status.textContent = `Updated ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  status.classList.add('show');
  clearTimeout(updateRefreshStatus._timer);
  updateRefreshStatus._timer = setTimeout(() => status.classList.remove('show'), 2400);
}

/* ---------------- APPLICATIONS ---------------- */

function setupCategories() {
  const select = document.getElementById('categoryFilter');
  if (!select) return;

  const currentValue = select.value || 'all';
  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'My Web Portals', label: 'My Web Portals' },
    { value: 'Internet Websites', label: 'Internet Websites' },
    { value: 'Google Services', label: 'Google Services' }
  ];

  select.innerHTML = categories.map(category =>
    `<option value="${escapeAttr(category.value)}">${escapeHtml(category.label)}</option>`
  ).join('');

  select.value = categories.some(x => x.value === currentValue) ? currentValue : 'all';
}

function getSectionCategory(gridId) {
  return {
    myPortalsGrid: 'My Web Portals',
    internetGrid: 'Internet Websites',
    googleGrid: 'Google Services'
  }[gridId] || 'Other';
}

function getAccessibleItems(list, category) {
  const auth = getAuth();
  if (!auth) return [];

  const query = (document.getElementById('appSearch')?.value || '').toLowerCase().trim();
  const selectedCategory = document.getElementById('categoryFilter')?.value || 'all';
  const normalizedQuery = query.replace(/\s+/g, ' ');

  return list.filter(item => {
    const allowed = item.role === 'both' || item.role === auth.role;
    const categoryOK = selectedCategory === 'all' || selectedCategory === category;
    const haystack = `${item.name || ''} ${item.description || ''} ${category} ${item.section || ''}`
      .toLowerCase()
      .replace(/\s+/g, ' ');

    return allowed && categoryOK && haystack.includes(normalizedQuery);
  });
}

function renderApps() {
  const auth = getAuth();
  if (!auth) return;

  const portalItems = getAccessibleItems(WEB_PORTALS, 'My Web Portals');
  const internetItems = getAccessibleItems(INTERNET_WEBSITES, 'Internet Websites');
  const googleItems = getAccessibleItems(GOOGLE_LINKS, 'Google Services');

  renderSection('myPortalsGrid', portalItems, 'No matching web portals found.');
  renderSection('internetGrid', internetItems, 'No matching websites found.');
  renderSection('googleGrid', googleItems, 'No matching Google services found.');

  const visible = [...portalItems, ...internetItems, ...googleItems];
  const appCount = document.getElementById('appCount');
  const availableCount = document.getElementById('availableCount');
  const quickCount = document.getElementById('quickCount');
  const resultsSummary = document.getElementById('resultsSummary');

  if (appCount) appCount.textContent = visible.length;
  if (availableCount) availableCount.textContent = visible.filter(x => x.url && x.url !== '#').length;
  if (quickCount) quickCount.textContent = portalItems.length;

  updateCount('myPortalsCount', portalItems.length, 'Portal', 'Portals');
  updateCount('internetCount', internetItems.length, 'Website', 'Websites');
  updateCount('googleCount', googleItems.length, 'Link', 'Links');

  const query = (document.getElementById('appSearch')?.value || '').trim();
  const selectedCategory = document.getElementById('categoryFilter')?.value || 'all';
  const isFiltered = Boolean(query) || selectedCategory !== 'all';

  if (resultsSummary) {
    resultsSummary.textContent = isFiltered
      ? `${visible.length} matching ${visible.length === 1 ? 'application' : 'applications'} found`
      : `${visible.length} applications available`;
  }

  const sectionStates = [
    ['myPortalsSection', portalItems.length],
    ['internetSection', internetItems.length],
    ['googleSection', googleItems.length]
  ];

  sectionStates.forEach(([id, count]) => {
    const section = document.getElementById(id);
    if (section) section.hidden = count === 0;
  });

  const noResults = document.getElementById('noResultsState');
  if (noResults) noResults.hidden = visible.length !== 0;
}

function updateCount(id, number, singular, plural) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = `${number} ${number === 1 ? singular : plural}`;
}

function renderSection(gridId, list, emptyText) {
  const g = document.getElementById(gridId);
  if (!g) return;

  if (!list.length) {
    g.innerHTML =
      `<div class="integration-note">${escapeHtml(emptyText)}</div>`;
    return;
  }

  g.innerHTML = list.map(item => `
    <article class="app-card">
      <div class="app-top">
        <div class="app-icon">${escapeHtml(item.icon || '▣')}</div>
        <span class="status-badge">AVAILABLE</span>
      </div>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description)}</p>
      <div class="app-meta">${escapeHtml(item.category || 'Direct Link')}</div>
      <a
        class="open-app"
        href="${escapeAttr(item.url)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open ${item.section === 'Direct Google Links' ? 'Link' : 'Application'} →
      </a>
    </article>
  `).join('');

  // Native target="_blank" links are intentional here.
  // They open the portal in a new tab without navigating the Master Dashboard.

}

/*
 * Kept for compatibility with older cards/configurations.
 * Current portal cards use native <a target="_blank"> links, so this
 * function is not used for normal navigation.
 */
function openApplication(url) {
  if (!url || url === '#') return false;
  return /^https?:\/\//i.test(String(url).trim());
}

/* ---------------- CLOCK ---------------- */

function setupClock() {
  const tick = () => {
    const now = new Date();

    const liveClock = document.getElementById('liveClock');
    const liveDate = document.getElementById('liveDate');

    if (liveClock) {
      liveClock.textContent = now.toLocaleTimeString('en-IN', {
        hour12: true
      });
    }

    if (liveDate) {
      liveDate.textContent = now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    }
  };

  tick();
  setInterval(tick, 1000);
}

/* ---------------- SAFE HTML ---------------- */

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
