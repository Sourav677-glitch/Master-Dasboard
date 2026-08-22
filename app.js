const MASTER_SCRIPT_URL='https://script.google.com/macros/s/AKfycbzfwVo-1Mbj0vJRfd1XD-qJrCN6HUl2aU9B4MjJgEZgZ8yiw6nMRScs2iPumITySC1m/exec';

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
  if (userRole) {
    userRole.textContent =
      a.role === 'admin' ? 'Administrator' : 'Authorized User';
  }
  if (accessLevel) {
    accessLevel.textContent = a.role === 'admin' ? 'ADMIN' : 'USER';
  }
  if (footerYear) {
    footerYear.textContent =
      `© ${new Date().getFullYear()} Government of West Bengal`;
  }

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
  if (appSearch) appSearch.addEventListener('input', renderApps);

  const categoryFilter = document.getElementById('categoryFilter');
  if (categoryFilter) categoryFilter.addEventListener('change', renderApps);

  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', renderApps);
}

/* ---------------- APPLICATIONS ---------------- */

function setupCategories() {
  const s = document.getElementById('categoryFilter');
  if (!s || typeof MASTER_APPS === 'undefined') return;

  const existing = new Set(
    Array.from(s.options).map(option => option.value)
  );

  const cats = [...new Set(
    MASTER_APPS.map(a => a.category).filter(Boolean)
  )].sort();

  cats.forEach(category => {
    if (existing.has(category)) return;

    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    s.appendChild(option);
  });
}

function renderApps() {
  const a = getAuth();
  if (!a) return;

  const q = (
    document.getElementById('appSearch')?.value || ''
  ).toLowerCase().trim();

  const c = document.getElementById('categoryFilter')?.value || 'all';

  const filterList = list => list.filter(item => {
    const allowed = item.role === 'both' || item.role === a.role;
    const categoryOK = c === 'all' || item.category === c;
    const haystack = `${item.name} ${item.description} ${item.category || ''}`
      .toLowerCase();

    return allowed && categoryOK && haystack.includes(q);
  });

  renderSection(
    'myPortalsGrid',
    filterList(WEB_PORTALS),
    'No web portals match your search.'
  );

  renderSection(
    'internetGrid',
    filterList(INTERNET_WEBSITES),
    'No websites match your search.'
  );

  renderSection(
    'googleGrid',
    filterList(GOOGLE_LINKS),
    'No Google links match your search.'
  );

  const visible = [
    ...filterList(WEB_PORTALS),
    ...filterList(INTERNET_WEBSITES),
    ...filterList(GOOGLE_LINKS)
  ];

  const appCount = document.getElementById('appCount');
  const availableCount = document.getElementById('availableCount');
  const quickCount = document.getElementById('quickCount');

  if (appCount) appCount.textContent = visible.length;
  if (availableCount) {
    availableCount.textContent =
      visible.filter(x => x.url && x.url !== '#').length;
  }
  if (quickCount) {
    quickCount.textContent =
      WEB_PORTALS.filter(x => x.role === 'both' || x.role === a.role).length;
  }

  updateCount(
    'myPortalsCount',
    filterList(WEB_PORTALS).length,
    'Portal',
    'Portals'
  );

  updateCount(
    'internetCount',
    filterList(INTERNET_WEBSITES).length,
    'Website',
    'Websites'
  );

  updateCount(
    'googleCount',
    filterList(GOOGLE_LINKS).length,
    'Link',
    'Links'
  );

  ['myPortalsSection', 'internetSection', 'googleSection'].forEach(id => {
    const section = document.getElementById(id);
    if (!section) return;

    const grid = section.querySelector('.app-grid');
    section.style.display =
      grid && grid.children.length ? 'block' : 'none';
  });
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
