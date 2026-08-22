# Master Dashboard v8 — Premium Glassmorphism + Google Apps Script Login

FILES
-----
index.html                 Login page
dashboard.html             Master dashboard
styles.css                 Premium glassmorphism styling
app.js                     Dashboard logic + login API URL
app-config.js              Portal/website/Google link registry
MASTER-DASHBOARD-APPSCRIPT-Code.gs
                           Google Apps Script authentication backend
MASTER-DASHBOARD-GAS-SETUP.txt
                           Complete setup and password-change guide

LOGIN
-----
The frontend no longer needs the login password in its source.
It sends username/password to the Master Dashboard Apps Script Web App.

Before deployment, edit app.js and replace:
PASTE_YOUR_MASTER_DASHBOARD_APPS_SCRIPT_WEB_APP_URL_HERE
with the /exec URL from your Master Dashboard Apps Script.

PASSWORDS
---------
Change them in MASTER-DASHBOARD-APPSCRIPT-Code.gs, inside MASTER_USERS.

After changing credentials, update the existing Apps Script Web App deployment
with a new version.

PORTALS
-------
The three requested dashboard sections remain:
1. Web Portals Made by Me
2. Different Websites on Internet
3. Direct Links to Google Services


DIRECT LINK FIX
----------------
The uploaded build had the card click handler calling openApplication(),
but the function itself was missing from app.js. Therefore the Open Application
buttons did not launch the configured URLs.

This build adds openApplication(url), validates http/https URLs, opens them in
a new tab, and falls back to the same tab if the browser blocks the popup.

Configured external URLs are left unchanged.


PORTAL OPENING BEHAVIOUR
------------------------
Open Application now opens the selected portal in the CURRENT TAB.
It does not use window.open(), so the Master Dashboard is not left open
in a second tab.

If you want the Master Dashboard to remain available, use the browser's
normal "Open link in new tab" behavior or keep the dashboard in another tab.
