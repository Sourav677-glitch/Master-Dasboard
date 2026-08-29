/*
  MASTER DASHBOARD REGISTRY
  Three sections:
  1. Web Portals Made by Me
  2. Different Websites on Internet
  3. Direct Google Links
*/

const WEB_PORTALS = [
  {
    id: "aam-hwc",
    name: "Daily AAM-HWCs Performance Dashboard",
    description: "Daily district-wise AAM-HWC, spoke and hub telemedicine performance monitoring.",
    icon: "📊",
    url: "https://sourav677-glitch.github.io/AAM-HWCs-Daily-Performance-Dashboard/",
    role: "both"
  },
  {
    id: "aam-uphc",
    name: "Daily AAM-UPHCs Performance Dashboard",
    description: "Daily district-wise AAM-UPHCs, spoke and hub telemedicine performance monitoring.",
    icon: "📊",
    url: "https://sourav677-glitch.github.io/AAM-UPHCs-Daily-Performance-Dashboard/",
    role: "both"
  },
  {
    id: "it-maintenance",
    name: "IT Logistics Maintainance Dashboard",
    description: "IT equipment maintenance, tracking and analytics portal.",
    icon: "💻",
    url: "https://sourav677-glitch.github.io/IT-Dashboard-Tracking/",
    role: "admin"
  },
  {
    id: "apps-script-portal-1",
    name: "Hospital Management Portal",
    description: "Departmental web application hosted on Google Apps Script.",
    icon: "🌐",
    url: "https://script.google.com/macros/s/AKfycbw7a3_R4kvaN-FyJSr4ZzoDKEisG61AMtcCciAA0BNfw6NybMP2O6qTnZKCQykMalel/exec",
    role: "both"
  },
  {
    id: "apps-script-portal-2",
    name: "Logistics Management Portal",
    description: "Departmental web application hosted on Google Apps Script.",
    icon: "🌐",
    url: "https://script.google.com/macros/s/AKfycbziWXWCKEflqb0w3ngqwLxmRczMYEHPJ_znuKHnCHlcXHdr7m4MuM-KOF_A3nHP773V_g/exec",
    role: "both"
  },
  {
    id: "apps-script-portal-3",
    name: "Document Management Portal",
    description: "Departmental web application hosted on Google Apps Script.",
    icon: "🌐",
    url: "https://script.google.com/macros/s/AKfycbwOymmDdM71APcgHVn9ADegRzXIQygONbeWKp1P3-qkCyz5duaS715HMPHDg7-Fo1IWVA/exec",
    role: "both"
  }
];

const INTERNET_WEBSITES = [
  {
    id: "wb-health",
    name: "Health & Family Welfare Department Portal",
    description: "Official Government of West Bengal website.",
    icon: "🏛️",
    url: "https://wbhealth.gov.in/",
    role: "both"
  },
  {
    id: "wb-orders",
    name: "WB Departmental orders Portal",
    description: "Official Health & Family Welfare Department portal.",
    icon: "🏥",
    url: "https://wbxpress.com/circulars/finance/",
    role: "both"
  },
  {
    id: "healthkpi",
    name: "WB Health KPI Portal",
    description: "Official Health & Family Welfare Department portal for monitoring key performance indicators.",
    icon: "🩺",
    url: "https://healthkpi.wbhealth.gov.in/",
    role: "both"
  },
  {
    id: "swasth-bharat",
    name: "Swasth Bharat Portal",
    description: "Swasth Bharat Mission (SBM) portal for monitoring health and wellness centers across India.",
    icon: "🏥",
    url: "https://swasthbharat.mohfw.gov.in/",
    role: "both"
  },
  {
    id: "tele-medicine",
    name: "Tele-Medicine Admin Portal",
    description: "Tele-Medicine platform for remote patient consultation and healthcare services.",
    icon: "🏥",
    url: "https://swasthyaingit.in/#/admin/signin",
    role: "both"
  },
  {
    id: "tele-medicine",
    name: "Tele-Medicine User Portal",
    description: "Tele-Medicine platform for remote patient consultation and healthcare services.",
    icon: "🏥",
    url: "https://swasthyaingit.in/#",
    role: "both"
  },
  {
    id: "attendance-portal",
    name: "Attendance Portal",
    description: "Attendance management platform for tracking employee attendance.",
    icon: "📊",
    url: "https://wbhealth.ezeehrlite.com/?AspxAutoDetectCookieSupport=1",
    role: "both"
  }
];

const GOOGLE_LINKS = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Open Google Gmail directly.",
    icon: "✉️",
    url: "https://mail.google.com/mail/u/0/?tab=rm&ogbl#inbox",
    role: "both"
  },
  {
    id: "drive",
    name: "Google Drive",
    description: "Open Google Drive directly.",
    icon: "📁",
    url: "https://drive.google.com/",
    role: "both"
  },
  {
    id: "sheets",
    name: "Google Sheets",
    description: "Open Google Sheets directly.",
    icon: "📗",
    url: "https://sheets.google.com/",
    role: "both"
  }
];

/* Combined registry used for dashboard counters/search. */
const MASTER_APPS = [
  ...WEB_PORTALS.map(x => ({...x, section: "Web Portals Made by Me", category: "My Web Portals"})),
  ...INTERNET_WEBSITES.map(x => ({...x, section: "Different Websites on Internet", category: "Internet Websites"})),
  ...GOOGLE_LINKS.map(x => ({...x, section: "Direct Google Links", category: "Google Services"}))
];
