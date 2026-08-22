/**
 * MASTER DASHBOARD AUTHENTICATION
 *
 * CHANGE PASSWORDS HERE.
 */

const MASTER_USERS = [
  { username: 'Admin', password: 'Wbnhm@1994', role: 'admin' },
  { username: 'User',  password: 'User@1234', role: 'user' }
];

function doGet(e) {
  const p = (e && e.parameter) ? e.parameter : {};
  const action = String(p.action || '').trim();

  if (action === 'login') {
    const username = String(p.username || '').trim();
    const password = String(p.password || '');
    const callback = String(p.callback || '').trim();

    const found = MASTER_USERS.find(
      u => u.username === username && u.password === password
    );

    const result = found
      ? {
          status: 'success',
          username: found.username,
          role: found.role
        }
      : {
          status: 'fail',
          message: 'Invalid credentials'
        };

    // JSONP is required for the GitHub Pages frontend.
    if (callback && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callback)) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(result) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return json_(result);
  }

  return json_({
    status: 'online',
    app: 'Master Dashboard Authentication'
  });
}

function doPost(e) {
  return doGet(e);
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
