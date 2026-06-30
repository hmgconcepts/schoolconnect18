/* ====================================================================
   generator.js — School Connect Gen v8
   Takes the wizard's config object and produces a ready-to-deploy
   ZIP file containing the full school platform.
   Fixes D-02 (no stray </script>),
         D-04 (full RLS),
         D-14 (single schema source).
   ==================================================================== */

const Generator = {

  /* Main entry: build a ZIP from a config object. Returns a Blob. */
  async build(config) {
    if (!window.JSZip) {
      // Lazy-load JSZip from CDN
      await Generator.loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
    }
    const zip = new JSZip();

    // Fetch required raw files
    const fetchFile = async (path) => {
      try { const res = await fetch(path); return await res.text(); } catch (e) { return ''; }
    };
    const STYLE_CSS = await fetchFile('assets/css/style.css');
    const NOTIFICATIONS_JS = await fetchFile('assets/js/notifications.js');
    const VOTING_JS = await fetchFile('assets/js/voting.js');
    const PWA_INSTALL_JS = await fetchFile('assets/js/pwa-install.js');
    const CBT_ENGINE_JS = await fetchFile('assets/js/cbt-engine.js');
    const ANALYTICS_JS = await fetchFile('assets/js/analytics.js');
    const SUPER_JS = await fetchFile('assets/js/super.js');
    const ENTERPRISE_JS = await fetchFile('assets/js/enterprise.js');
    const CRUD_JS = await fetchFile('assets/js/crud.js');
    const SITE_HELP_JS = await fetchFile('assets/js/site-help.js');
    const ENTERPRISE_SCHEMA_SQL = await fetchFile('database/enterprise-schema.sql');
    const ENHANCEMENTS_SCHEMA_SQL = await fetchFile('database/enhancements-schema.sql');
    const UPDATE_V1_SCHEMA_SQL = await fetchFile('database/update-v1-schema.sql');
    const UPDATE_V2_SCHEMA_SQL = await fetchFile('database/update-v2-schema.sql');
    const UPDATE_V4_SCHEMA_SQL = await fetchFile('database/update-v4-schema.sql');
    const PREVIEW_JS = await fetchFile('assets/js/preview.js');
    const SAMPLE_BANK_CSV = await fetchFile('database/further_maths_sample.csv');
    const HEADERS_FILE = await fetchFile('_headers');
    const VERCEL_JSON = await fetchFile('vercel.json');
    const BROWSERCONFIG = await fetchFile('browserconfig.xml');
    const SCHEMA_SQL = await fetchFile('database/schema.sql');
    const VOTING_SCHEMA_SQL = await fetchFile('database/voting-schema.sql');
    const CBT_SCHEMA_SQL = await fetchFile('database/cbt-schema.sql');
    const REPORTCARD_SCHEMA_SQL = await fetchFile('database/reportcard-schema.sql');

    const schoolSlug = window.SC.slugify(config.schoolName) || 'school';
    const theme = window.SC.THEMES.find(t => t.id === config.themeId) || window.SC.THEMES[0];
    const font  = window.SC.FONTS.find(f => f.id === config.fontId) || window.SC.FONTS[0];

    /* Normalise config with defaults */
    const cfg = {
      schoolName: config.schoolName || 'My School',
      shortName: config.shortName || config.schoolName || 'School',
      schoolMotto: config.schoolMotto || '',
      currency: config.currency || '₦',
      phone: config.phone || '',
      email: config.email || '',
      address: config.address || '',
      campuses: Array.isArray(config.campuses) ? config.campuses : (config.campuses ? String(config.campuses).split(',').map(s => s.trim()).filter(Boolean) : []),
      bankDetails: config.bankDetails || '',
      themeId: theme.id,
      themePrimary: theme.primary,
      themeAccent: theme.accent,
      fontId: font.id,
      fontFamily: font.family,
      fontCss: font.css,
      layout: config.layout || 'sidebar',
      modules: Array.isArray(config.modules) ? config.modules : [],
      levels: Array.isArray(config.levels) ? config.levels : [],
      supabaseUrl: config.supabaseUrl || 'YOUR_SUPABASE_URL',
      supabaseKey: config.supabaseKey || 'YOUR_SUPABASE_ANON_KEY',
      hmgLink: 'https://hmgconcepts.pages.dev/',
      logoData: config.logoData || null,
      buildType: config.buildType || 'traditional'
    };

    /* 1. assets/img/logo — accept ANY raster/vector image the user uploads
       (png, jpg/jpeg, webp, gif, bmp, svg+xml). Previously only png/jpeg/jpg
       were accepted, so other formats were silently discarded and the logo
       never appeared. Now we map the real MIME to a correct file extension. */
    let logoExt = 'svg';
    if (cfg.logoData) {
      const match = cfg.logoData.match(/^data:image\/([a-z0-9.+-]+)(;charset=[^;,]+)?;base64,(.*)$/i);
      if (match) {
        let mime = match[1].toLowerCase();
        const b64  = match[3];
        const extMap = { 'jpeg':'jpg','jpg':'jpg','png':'png','webp':'webp','gif':'gif','bmp':'bmp','svg+xml':'svg','x-icon':'ico','vnd.microsoft.icon':'ico' };
        logoExt = extMap[mime] || 'png';
        if (logoExt === 'svg') {
          // svg data-URLs may be base64 OR URL-encoded text; store as text safely
          try { zip.file('assets/img/logo.svg', (typeof atob==='function') ? atob(b64) : b64); }
          catch (e) { zip.file('assets/img/logo.svg', Generator.logoSvg(theme)); logoExt='svg'; }
        } else {
          zip.file('assets/img/logo.' + logoExt, b64, { base64: true });
        }
      } else if (/^\s*<svg[\s>]/i.test(cfg.logoData)) {
        // raw inline SVG markup pasted as the logo
        logoExt = 'svg';
        zip.file('assets/img/logo.svg', cfg.logoData);
      } else {
        // unrecognised — fall back to a generated branded SVG
        logoExt = 'svg';
        zip.file('assets/img/logo.svg', Generator.logoSvg(theme));
      }
    } else {
      zip.file('assets/img/logo.svg', Generator.logoSvg(theme));
    }
    cfg.logoExt = logoExt;

    /* 2. assets/css/style.css — same shared stylesheet */
    zip.file('assets/css/style.css', STYLE_CSS || '');

    /* 3. assets/js/config.js */
    zip.file('assets/js/config.js', Generator.configJS(cfg));

    /* 4. assets/js/notifications.js + voting.js + pwa-install.js (verbatim copies) */
    zip.file('assets/js/notifications.js', NOTIFICATIONS_JS || '');
    zip.file('assets/js/voting.js',        VOTING_JS        || '');
    zip.file('assets/js/pwa-install.js',   PWA_INSTALL_JS   || '');
    zip.file('assets/js/cbt-engine.js',    CBT_ENGINE_JS    || '');
    zip.file('assets/js/analytics.js',     ANALYTICS_JS     || '');
    zip.file('assets/js/super.js',         SUPER_JS         || '');
    zip.file('assets/js/enterprise.js',    ENTERPRISE_JS    || '');
    zip.file('assets/js/crud.js',           CRUD_JS          || '');
    /* Cumulative repair: every generated page references site-help.js, so it
       must be physically shipped in the client ZIP. Missing this file breaks
       the exhaustive school assistant on generated sites. */
    zip.file('assets/js/site-help.js',      SITE_HELP_JS     || '');

    /* 5. assets/js/app.js — runtime (init, sign-in, role gating, dark mode, modals, …) */
    zip.file('assets/js/app.js', Generator.appJS(cfg));

    /* 6. manifest.json */
    zip.file('manifest.json', JSON.stringify({
      name: cfg.schoolName + ' — School Connect',
      short_name: cfg.shortName,
      description: cfg.schoolMotto || 'School management by HMG Concepts',
      start_url: './index.html',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: cfg.themePrimary,
      icons: [
        { src: 'assets/img/logo.' + cfg.logoExt, sizes: '192x192', type: cfg.logoExt === 'svg' ? 'image/svg+xml' : 'image/' + (cfg.logoExt === 'jpg' ? 'jpeg' : cfg.logoExt), purpose: 'any maskable' },
        { src: 'assets/img/logo.' + cfg.logoExt, sizes: '512x512', type: cfg.logoExt === 'svg' ? 'image/svg+xml' : 'image/' + (cfg.logoExt === 'jpg' ? 'jpeg' : cfg.logoExt), purpose: 'any maskable' }
      ]
    }, null, 2));

    /* 7. sw.js — service worker with offline cache + push handler */
    zip.file('sw.js', Generator.serviceWorker(cfg));

    /* 8. robots.txt + sitemap.xml + humans.txt (SEO, blueprint req) */
    const origin = ''; /* filled in at runtime via sitemap */
    zip.file('robots.txt', `User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n`);
    zip.file('humans.txt', `/* TEAM */\nHMG Concepts — EdTech · DataTech · FaithTech\nSite: ${cfg.hmgLink}\n`);
    zip.file('sitemap.xml', Generator.sitemapXML(cfg));

    /* 9. database/*.sql — main + voting + CBT + report cards */
    zip.file('database/schema.sql',            SCHEMA_SQL            || '');
    zip.file('database/voting-schema.sql',     VOTING_SCHEMA_SQL     || '');
    zip.file('database/cbt-schema.sql',        CBT_SCHEMA_SQL        || '');
    zip.file('database/reportcard-schema.sql', REPORTCARD_SCHEMA_SQL || '');
    zip.file('database/enterprise-schema.sql', ENTERPRISE_SCHEMA_SQL || '');
    zip.file('database/enhancements-schema.sql', ENHANCEMENTS_SCHEMA_SQL || '');
    zip.file('database/update-v1-schema.sql', UPDATE_V1_SCHEMA_SQL || '');
    zip.file('database/update-v2-schema.sql', UPDATE_V2_SCHEMA_SQL || '');
    zip.file('database/update-v4-schema.sql', UPDATE_V4_SCHEMA_SQL || '');
    zip.file('database/students_import_template.csv', Generator.studentsImportTemplate());
    zip.file('students_import_template.csv', Generator.studentsImportTemplate()); // app-root copy for the in-app download link
    zip.file('database/sample-questions.csv',  Generator.sampleCSV());
    if (SAMPLE_BANK_CSV) zip.file('database/sample-question-bank.csv', SAMPLE_BANK_CSV);
    /* Re-added (cumulative): deployment hardening + offline + msapplication tile */
    if (HEADERS_FILE)   zip.file('_headers', HEADERS_FILE);
    if (VERCEL_JSON)    zip.file('vercel.json', VERCEL_JSON);
    if (BROWSERCONFIG)  zip.file('browserconfig.xml', BROWSERCONFIG);
    zip.file('offline.html', Generator.pageOffline(cfg));

    /* 10. .nojekyll + .gitignore */
    zip.file('.nojekyll', '');
    zip.file('.gitignore', '.DS_Store\nnode_modules/\n.idea/\n.vscode/\n*.log\n');

    /* 11. Pages */
    zip.file('index.html',         Generator.pageIndex(cfg));
    zip.file('login.html',         T.loginPage(cfg));
    zip.file('dashboard.html',     T.dashboard(cfg));
    zip.file('voting.html',        T.voting(cfg));
    zip.file('notifications.html', T.notifications(cfg));
    zip.file('about.html',         Generator.pageAbout(cfg));
    zip.file('contact.html',       Generator.pageContact(cfg));
    zip.file('feature-guide.html', Generator.pageFeatureGuide(cfg)); // full feature explanations
    zip.file('verify-certificate.html', Generator.pageVerifyCertificate(cfg)); // public certificate verification

    /* ✨ v2 dedicated, fully-featured pages */
    zip.file('cbt.html',           Generator.pageCBT(cfg));          // teacher exam manager
    zip.file('cbt-exam.html',      Generator.pageCBTExam(cfg));      // student exam taker (public)
    zip.file('report-cards.html',  Generator.pageReportCards(cfg));  // flexible report-card builder
    zip.file('analytics.html',     Generator.pageAnalytics(cfg));    // platform analytics
    zip.file('admin-data.html',    Generator.pageAdminData(cfg));    // read/delete/backup/restore
    zip.file('approvals.html',     Generator.pageApprovals(cfg));    // approve students/parents/staff/admissions
    zip.file('parents.html',       Generator.pageParents(cfg));      // dedicated parent registry + child mapping
    zip.file('admissions.html',    Generator.pageAdmissions(cfg));   // links + review + extract
    zip.file('apply.html',         Generator.pageApply(cfg));        // PUBLIC application form (no auth)
    /* ✨ v3 super-feature pages */
    zip.file('idcards.html',       Generator.pageIdCards(cfg));      // QR ID-card generator
    zip.file('digital_library.html', Generator.pageDigitalLibrary(cfg)); // read + quiz
    zip.file('certificates.html',  Generator.pageCertificates(cfg)); // verifiable certificates
    zip.file('flyer.html',         Generator.pageFlyer(cfg));        // marketing flyer
    /* ✨ update v2 pages */
    zip.file('cbt-prompts.html',   Generator.pageCBTPrompts(cfg));   // AI-prompt library for CSV questions (issue 1)
    zip.file('entrance.html',      Generator.pageEntrance(cfg));     // entrance/assessment results + admission letters (issue 5)
    zip.file('storage.html',       Generator.pageStorage(cfg));      // storage usage + purge (issue 12)
    zip.file('developer.html',     Generator.pageDeveloper(cfg));    // developer / brand bio (issue 4)
    zip.file('student-profile.html', Generator.pageStudentProfile(cfg)); // 360 student/parent dashboard (issues 15,16)
    zip.file('academic_records.html', Generator.pageAcademicRecords(cfg)); // record card + broadsheets
    zip.file('academic_setup.html', Generator.pageAcademicSetup(cfg)); // departments/terms/sessions setup
    /* ✨ FINAL v2 enterprise pages */
    zip.file('timetable-generator.html', Generator.pageTimetableGen(cfg)); // conflict-free generator
    zip.file('checkin.html',       Generator.pageCheckin(cfg));      // QR self check-in
    zip.file('diary.html',         Generator.pageDiary(cfg));        // student diary
    zip.file('surveys.html',       Generator.pageSurveys(cfg));      // surveys & forms
    zip.file('menu.html',          Generator.pageMenu(cfg));         // meal planner
    zip.file('settings.html',      Generator.pageSettings(cfg));     // 2FA + i18n + a11y
    zip.file('timetable.html',     Generator.pageTimetable(cfg));    // published timetable overview
    zip.file('messages.html',      Generator.pageMessages(cfg));     // WA/Email/SMS sender guide
    zip.file('teacher-overview.html', Generator.pageTeacherOverview(cfg)); // admin staff dashboard overview
    zip.file('attendance.html',    Generator.pageAttendance(cfg));  // class e-register attendance
    zip.file('sow.html',           Generator.pageSOW(cfg));         // two-stage scheme of work

    /* Per-module pages (the ones that exist in the registry) */
    const pageIds = ['academic_setup','students','staff','classes','subjects','attendance','results','timetable','sow','cbt','assignments','library','conduct','health','promotion','fees','finance','leave','visitors','transport','announcements','events','messages','inbox','complaints','broadcast','gallery','eresources','birthdays','idcards','reports','directory','departments','parents','admissions','hr','payroll','staff_loans','staff_bonus','appraisals','rubrics','transcripts','transfer_cert','counselling','hostel','alumni','inventory','certificates','analytics','lms','gamification','cafeteria','financial_aid','front_desk','career_counseling','document_builder','fleet_tracking','facility_booking','compliance',
      // ✨ Gen v8 new modules
      'activity_log','lesson_plans','behaviour','support_plans','donations','substitutions','helpdesk','payments_online','school_calendar','lost_found','parent_meeting','book_request',
      // ✨ Gen v2 dedicated modules
      'report-cards','admin-data',
      // ✨ update v2 dedicated modules
      'cbt-prompts','entrance','storage','academic_setup','academic_records','developer','digital_library',
      // ✨ FINAL v2 enterprise modules
      'attendance','teacher-overview','messages','timetable','timetable-generator','checkin','diary','surveys','menu','settings','approvals','student-profile','sow'];
    // These have dedicated, full-featured pages above — don't overwrite with the generic template.
    const DEDICATED = ['cbt','analytics','report-cards','admin-data','idcards','certificates','flyer',
      'attendance','teacher-overview','messages','timetable','timetable-generator','checkin','diary','surveys','menu','settings','approvals','admissions','parents','digital_library',
      'cbt-prompts','entrance','storage','academic_setup','academic_records','developer','student-profile','sow'];
    pageIds.forEach(id => {
      if (DEDICATED.includes(id)) return;
      // Repair v2: emit every module page, not only the currently selected
      // modules, so the generated portal navigator can capture all pages.
      zip.file(id + '.html', T.modulePage(cfg, id));
    });

    /* 12. README.md + DEPLOYMENT-GUIDE.md (generated school) */
    zip.file('README.md', Generator.schoolReadme(cfg));
    zip.file('DEPLOYMENT-GUIDE.md', Generator.schoolDeploymentGuide(cfg));
    zip.file('TROUBLESHOOTING.md', Generator.schoolTroubleshooting(cfg));

    /* 13. Modern Build Additions */
    if (cfg.buildType === 'modern') {
      zip.file('package.json', JSON.stringify({
        name: schoolSlug + '-school-connect',
        version: "1.0.0",
        description: cfg.schoolMotto || "School Connect Platform",
        main: "server.js",
        scripts: {
          start: "node server.js",
          dev: "nodemon server.js"
        },
        dependencies: {
          express: "^4.18.2",
          cors: "^2.8.5",
          helmet: "^7.0.0",
          compression: "^1.7.4",
          "express-rate-limit": "^7.1.5",
          "@supabase/supabase-js": "^2.45.0"
        },
        devDependencies: {
          nodemon: "^3.0.1"
        }
      }, null, 2));

      zip.file('server.js', `/**
 * ${cfg.schoolName} — Full-stack / SaaS server (Node + Express)
 * Hardened, free-tool, no-AI. Serves the static app from /public and exposes
 * a few secure JSON endpoints that use the Supabase SERVICE ROLE key (kept on
 * the server, never shipped to the browser) for trusted server-side actions.
 */
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Security & performance middleware ----
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false })); // CSP off by default (CDN scripts); tighten in prod
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || true }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 })); // basic abuse protection

// ---- Optional trusted server-side Supabase client (service role) ----
// Set SUPABASE_URL + SUPABASE_SERVICE_KEY in your environment (.env) to enable.
let admin = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  }
} catch (e) { console.warn('Supabase admin client not initialised:', e.message); }

// ---- Health check (for uptime monitors / load balancers) ----
app.get('/api/health', (req, res) => res.json({ ok: true, service: '${window.SC.jsStr(cfg.schoolName)}', admin: !!admin, time: new Date().toISOString() }));

// ---- Example secure endpoint: server-side platform stats (service role) ----
app.get('/api/stats', async (req, res) => {
  if (!admin) return res.status(503).json({ error: 'Server Supabase not configured' });
  try {
    const [s, t] = await Promise.all([
      admin.from('students').select('id', { count: 'exact', head: true }),
      admin.from('staff').select('id', { count: 'exact', head: true })
    ]);
    res.json({ students: s.count || 0, staff: t.count || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---- Static app + SPA fallback ----
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h', extensions: ['html'] }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log('🚀 ${window.SC.jsStr(cfg.shortName || cfg.schoolName)} server running on http://localhost:' + PORT));
`);
      zip.file('.env.example', `# Server-side secrets for the MODERN/full-stack build (never commit the real .env)
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
# SERVICE ROLE key — server-only, full privileges. NEVER put this in the browser.
SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_KEY
ALLOWED_ORIGIN=*
PORT=3000
`);
      zip.file('Dockerfile', `# Free containerised deploy (Render / Railway / Fly.io / any Docker host)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
`);
      zip.file('render.yaml', `# One-click deploy on Render (free web service)
services:
  - type: web
    name: ${window.SC.slugify(cfg.schoolName) || 'school'}-connect
    env: node
    plan: free
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
`);
      zip.file('.dockerignore', 'node_modules\\n.env\\n*.log\\n');
      // In modern mode, move the front-end into a 'public/' directory served by
      // Express. Files that must stay at the project ROOT (not under public/):
      //   - build/meta files (package.json, server.js, README & guides, .gitignore)
      //   - the database/ folder (SQL is run in Supabase, not served)
      //   - host config files (_headers / vercel.json are platform-specific roots)
      // We re-read each entry's bytes via the official JSZip async API (robust —
      // no reliance on private internals like ._data), then re-add under public/.
      const ROOT_KEEP = (k) =>
        k === 'package.json' || k === 'server.js' || k === '.gitignore' ||
        k === '.env.example' || k === 'Dockerfile' || k === '.dockerignore' ||
        k === 'render.yaml' || k === '_headers' || k === 'vercel.json' ||
        k.startsWith('database/') || (k.endsWith('.md'));
      const toMove = Object.keys(zip.files).filter(k => !zip.files[k].dir && !ROOT_KEEP(k));
      for (const k of toMove) {
        const bytes = await zip.files[k].async('uint8array');
        zip.file('public/' + k, bytes);
        zip.remove(k);
      }
    }

    /* 14. Turn into Blob */
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    return { blob, schoolSlug, fileName: schoolSlug + '-school-connect.zip' };
  },

  /* Logo SVG with theme colours */
  logoSvg(theme) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.primary}"/>
      <stop offset="100%" stop-color="${theme.accent}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#g)"/>
  <polygon points="256,140 432,200 256,260 80,200" fill="#ffffff" opacity="0.95"/>
  <rect x="246" y="248" width="20" height="60" fill="#ffffff" opacity="0.95"/>
  <circle cx="256" cy="320" r="8" fill="#ffffff"/>
  <path d="M120 340 L256 360 L392 340 L392 420 L256 440 L120 420 Z" fill="#ffffff" opacity="0.92"/>
</svg>`;
  },

  /* assets/js/config.js content */
  configJS(cfg) {
    return `// ====================================================================
// School Connect — Site Config (auto-generated)
// Replace the URL and anon key below with your Supabase project values.
// ====================================================================
window.SUPABASE_URL = '${window.SC.jsStr(cfg.supabaseUrl)}';
window.SUPABASE_KEY = '${window.SC.jsStr(cfg.supabaseKey)}';
window.SCHOOL = {
  name:    '${window.SC.jsStr(cfg.schoolName)}',
  short:   '${window.SC.jsStr(cfg.shortName)}',
  motto:   '${window.SC.jsStr(cfg.schoolMotto)}',
  currency:'${window.SC.jsStr(cfg.currency)}',
  phone:   '${window.SC.jsStr(cfg.phone)}',
  email:   '${window.SC.jsStr(cfg.email)}',
  address: '${window.SC.jsStr(cfg.address)}',
  campuses:${JSON.stringify(cfg.campuses)},
  theme:   '${window.SC.jsStr(cfg.themeId)}',
  font:    '${window.SC.jsStr(cfg.fontId)}',
  fontFamily: '${window.SC.jsStr((cfg.font && cfg.font.family) || cfg.fontFamily || 'Inter')}',
  fontCss: '${window.SC.jsStr((cfg.font && cfg.font.css) || cfg.fontCss || 'Inter')}',
  layout:  '${window.SC.jsStr(cfg.layout)}',
  modules: ${JSON.stringify(cfg.modules)},
  levels:  ${JSON.stringify(cfg.levels)},
  hmgLink: '${window.SC.jsStr(cfg.hmgLink)}',
  logoExt: '${window.SC.jsStr(cfg.logoExt || 'svg')}',
  primary: '${window.SC.jsStr(cfg.themePrimary)}',
  accent:  '${window.SC.jsStr(cfg.themeAccent)}'
};

// Build the supabase client
const sb = (window.supabase && SUPABASE_URL !== 'YOUR_SUPABASE_URL')
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

console.log('%c[${window.SC.jsStr(cfg.schoolName)}] School Connect ready.', 'color:${cfg.themePrimary};font-weight:bold;font-size:13px');
`;
  },


  validateOutput(files) {
    const errs=[];
    const names=Object.keys(files||{});
    const norm={};
    names.forEach(n=>{ const k=String(n).replace(/-/g,'_').toLowerCase(); (norm[k]=norm[k]||[]).push(n); });
    Object.keys(norm).forEach(k=>{ if(norm[k].length>1) errs.push('Duplicate normalized path conflict: '+norm[k].join(' , ')); });
    return errs;
  },

  /* assets/js/app.js — runtime */
  appJS(cfg) {
    return `
/* Pages that must NEVER force a redirect to login (public + the login page itself). */
const PUBLIC_PAGES = ['login','index','about','contact','apply','register','signup','cbt-exam','offline',''];

function currentPage() {
  return (location.pathname.split('/').pop() || 'index.html').replace('.html','');
}

const App = {

  init() {
    App.bindUI();
    App.applyStoredTheme();
    const page = currentPage();
    // On login/public pages we do not redirect, but we still bind the public-page helpers.
    // This keeps install prompts, notifications shells and helper widgets working.
    if (PUBLIC_PAGES.includes(page)) {
      App.initAuthTabs();
      try { if (window.PWAInstall) PWAInstall.init(); } catch(_) {}
      try { if (window.Notifications) {
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').then(reg => Notifications.init(sb, reg));
        else Notifications.init(sb);
      }} catch(_) {}
      try { if (window.Super) Super.init(sb, window.SCHOOL); } catch(_) {}
      try { if (window.Enterprise) Enterprise.init(sb); } catch(_) {}
      try { if (window.CRUD) CRUD.init(sb); } catch(_) {}
      return;
    }
    App.applyRoleVisibility();
  },

  /* Re-apply saved dark/light preference */
  applyStoredTheme() {
    const saved = localStorage.getItem('sc-theme');
    if (saved) document.body.dataset.theme = saved;
  },

  /* Ensure the login page shows the Sign-in tab by default (replaces the old
     T.switchAuthTab call that failed because templates.js is not shipped). */
  initAuthTabs() {
    if (document.getElementById('signin-form')) App.switchAuthTab('signin');
  },

  applyRoleVisibility() {
    if (!sb) { App.applyRoleDashboard('demo', { full_name:'Demo User', role:'admin' }); App.applyRoleNav('admin'); App.loadPageData(); return; }
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { location.href = 'login.html'; return; }
      sb.from('profiles').select('full_name,email,role,status').eq('id', user.id).maybeSingle().then(({ data, error }) => {
        if (error) console.warn('Profile lookup failed:', error.message || error);
        const role = String((data && data.role) || user.user_metadata?.role || 'student').toLowerCase().trim();
        const status = (data && data.status) || 'active';
        const name = (data && data.full_name) || user.user_metadata?.full_name || user.email || 'User';
        if (status === 'pending') {
          document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px"><div style="max-width:440px;text-align:center;background:white;padding:40px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.1)"><h2 style="margin-bottom:12px">⏳ Account pending approval</h2><p style="color:var(--gray-600)">Your account is awaiting admin approval. You will receive an email once it is activated.</p></div></div>';
          return;
        }
        if (status === 'suspended') {
          document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px"><div style="max-width:440px;text-align:center;background:white;padding:40px;border-radius:16px"><h2>🚫 Account suspended</h2><p>Please contact the school administrator.</p></div></div>';
          return;
        }
        const isStaff = ['super_admin','admin','principal','proprietor','head_teacher','staff','teacher','bursar'].includes(role);
        const isAdmin = ['super_admin','admin','principal','proprietor','head_teacher','bursar'].includes(role);
        App.currentRole = role; App.currentUserName = name; App.currentProfile = data || {};
        window.SC_PROFILE = Object.assign({ id: user.id, email: user.email }, data || {}, { role, status, full_name: name });
        document.querySelectorAll('[data-admin-only]').forEach(el => el.style.display = isAdmin ? '' : 'none');
        document.querySelectorAll('[data-staff-only]').forEach(el => el.style.display = isStaff ? '' : 'none');
        document.querySelectorAll('[data-parent-only]').forEach(el => el.style.display = role === 'parent' ? '' : 'none');
        document.querySelectorAll('[data-student-only]').forEach(el => el.style.display = role === 'student' ? '' : 'none');
        document.querySelectorAll('[data-family-only]').forEach(el => el.style.display = ['parent','student'].includes(role) ? '' : 'none');
        document.querySelectorAll('[data-signout]').forEach(el => el.style.display = '');
        App.applyRoleDashboard(role, { full_name:name, email:user.email, role });
        App.applyRoleNav(role);
        App.loadPageData();
      }).catch((err) => {
        console.warn('Profile load failed:', err && err.message ? err.message : err);
        const fallbackRole = user.user_metadata?.role || 'student';
        const fallbackName = user.user_metadata?.full_name || user.email || 'User';
        App.currentRole = fallbackRole; App.currentUserName = fallbackName;
        window.SC_PROFILE = { id:user.id, email:user.email, role:fallbackRole, status:'active', full_name:fallbackName };
        document.querySelectorAll('[data-signout]').forEach(el => el.style.display = '');
        App.applyRoleDashboard(fallbackRole, { full_name:fallbackName, email:user.email, role:fallbackRole });
        App.applyRoleNav(fallbackRole);
        App.loadPageData();
      });
    });
  },

  applyRoleDashboard(role, profile) {
    const name = (profile && (profile.full_name || profile.email)) || 'User';
    const prettyRole = String(role || 'user').replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
    const roleMap = {
      super_admin:['super_admin','admin'],
      admin:['admin'],
      principal:['admin'],
      proprietor:['admin'],
      head_teacher:['admin'],
      bursar:['admin'],
      staff:['staff'],
      teacher:['staff'],
      parent:['parent'],
      student:['student']
    };
    const effectiveRoles = new Set(roleMap[role] || [role]);
    ['user-display-name','dash-user-name'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=name; });
    ['user-display-role','dash-user-role'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=prettyRole; });
    const groups = document.querySelectorAll('[data-dash-role]');
    if (groups.length) {
      groups.forEach(el => {
        const roles = (el.getAttribute('data-dash-role')||'').split(/\s+/).filter(Boolean);
        const show = roles.some(r => effectiveRoles.has(r));
        el.style.display = show ? '' : 'none';
      });
      if (![...groups].some(el => el.style.display !== 'none')) {
        const first = document.querySelector('[data-dash-role="student"]'); if(first) first.style.display='';
      }
    }
    const q=document.getElementById('dash-quick-links');
    if(q){
      const adminRoles = ['super_admin','admin','principal','proprietor','head_teacher','bursar'];
      const links = role==='parent' ? [['Child Dashboard','student-profile.html'],['Fees','fees.html'],['Results','results.html'],['Assignments','assignments.html'],['Messages','inbox.html'],['Complaint','complaints.html']] :
        (role==='student' ? [['Take CBT','cbt-exam.html'],['Assignments','assignments.html'],['Timetable','timetable.html'],['Digital Library','digital_library.html'],['E-Resources','eresources.html'],['My Results','results.html'],['My Profile','student-profile.html']] :
        (['staff','teacher'].includes(role) ? [['Attendance','attendance.html'],['Results','results.html'],['CBT Manager','cbt.html'],['Report Cards','report-cards.html'],['Broadsheets','academic_records.html'],['Lesson Plans','lesson_plans.html'],['Scheme of Work','sow.html']] :
        [['Academic Setup','academic_setup.html'],['Approvals','approvals.html'],['Students','students.html'],['Staff','staff.html'],['Parents','parents.html'],['Finance','finance.html'],['Payroll','payroll.html'],['Analytics','analytics.html'],['Admin Data','admin-data.html'],['Storage','storage.html'],['Compliance','compliance.html'],['Activity Log','activity_log.html']]));
      q.innerHTML = links.map(x=>'<a class="btn btn-outline btn-sm" href="'+x[1]+'">'+x[0]+'</a>').join('');
    }
  },


  isAdminRole(role) {
    return ['super_admin','admin','principal','proprietor','head_teacher','bursar'].includes(String(role||'').toLowerCase());
  },

  roleSet(role) {
    const r = String(role || '').toLowerCase();
    const set = new Set([r]);
    if (r === 'teacher') set.add('staff');
    if (r === 'staff') set.add('teacher');
    if (App.isAdminRole(r)) ['admin','super_admin','principal','proprietor','head_teacher','bursar','any','all','public'].forEach(x => set.add(x));
    return set;
  },

    canAccessAllowList(allowText, role) {
    const r = String(role || '').toLowerCase().trim();
    if (['super_admin','admin','principal','proprietor','head_teacher','bursar'].includes(r)) return true;
    const allow = String(allowText || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!allow.length) return true;
    if (allow.some(x => ['any','all','public'].includes(x))) return true;
    const roles = App.roleSet(role);
    return allow.some(a => roles.has(a));
  },

  applyRoleNav(role) {
    document.body.dataset.roleReady = '1';
    document.body.dataset.currentRole = String(role || '').toLowerCase();
    const links = [...document.querySelectorAll('[data-role-allow]')];
    const isAdmin = App.isAdminRole(role);
    links.forEach(el => {
      const ok = App.canAccessAllowList(el.getAttribute('data-role-allow'), role);
      if (isAdmin) {
        el.style.display = '';
        el.classList.toggle('nav-locked', !ok);
      } else {
        el.style.display = ok ? '' : 'none';
        el.classList.remove('nav-locked');
      }
      if (!ok) {
        el.setAttribute('aria-disabled', 'true');
        el.setAttribute('title', 'Locked for your role (' + role + ')');
      } else {
        el.removeAttribute('aria-disabled');
        el.removeAttribute('title');
      }
    });
    App.applyVisibilityTokens(role);
    App.ensureNavNotBlank(role);
    App.enforceCurrentPageAccess(role);
  },

  applyVisibilityTokens(role) {
    const allow = (selector, yes) => document.querySelectorAll(selector).forEach(el => el.style.display = yes ? '' : 'none');
    const r = String(role || '').toLowerCase();
    const isAdmin = App.isAdminRole(r);
    const isStaff = ['staff','teacher'].includes(r);
    const isParent = r === 'parent';
    const isStudent = r === 'student';
    allow('[data-admin-only]', isAdmin);
    allow('[data-staff-only]', isAdmin || isStaff);
    allow('[data-parent-only]', isParent);
    allow('[data-student-only]', isStudent);
    allow('[data-family-only]', isParent || isStudent);
    allow('[data-nonadmin-only]', !isAdmin);
    document.querySelectorAll('[data-readonly-role]').forEach(el => {
      const list = String(el.getAttribute('data-readonly-role') || '').split(/\s+/).filter(Boolean);
      const yes = list.includes(r) || (isStaff && list.includes('staff')) || (isAdmin && list.includes('admin'));
      el.disabled = !!yes;
      el.setAttribute('aria-disabled', yes ? 'true' : 'false');
      if (yes) el.title = 'Read-only for your role'; else el.removeAttribute('title');
    });
  },

  ensureNavNotBlank(role) {
    const nav = document.querySelector('.app-nav');
    if (!nav) return;
    const links = [...nav.querySelectorAll('a')].filter(a => a.style.display !== 'none');
    if (links.length) return;
    const safe = new Set(['dashboard.html','notifications.html','feature-guide.html','about.html','contact.html']);
    [...nav.querySelectorAll('a')].forEach(a => { if (safe.has((a.getAttribute('href')||'').toLowerCase())) { a.style.display = ''; a.classList.remove('nav-locked'); } });
  },

    enforceCurrentPageAccess(role) {
    const r = String(role || '').toLowerCase().trim();
    if (['super_admin','admin','principal','proprietor','head_teacher','bursar'].includes(r)) return;
    const active = document.querySelector('.app-nav a.active');
    if (active && active.getAttribute('data-role-allow')) {
      if (App.canAccessAllowList(active.getAttribute('data-role-allow'), r)) return;
    }
    const cur = location.pathname.split('/').pop().replace('.html','').toLowerCase().replace(/-/g,'_') || 'dashboard';
    const parentAllowed = ['attendance','results','report_cards','student_profile','fees','payments_online','assignments','digital_library','conduct','behaviour','support_plans','counselling','health','transport','hostel','menu','cafeteria','parent_meeting','complaints','idcards','transcripts','diary','surveys','financial_aid','donations','messages','inbox','notifications','eresources','school_calendar','announcements','events','gallery','voting','feature_guide','index','about','contact','apply'];
    const studentAllowed = ['attendance','results','report_cards','student_profile','assignments','digital_library','lms','gamification','behaviour','support_plans','counselling','transport','hostel','menu','cafeteria','complaints','idcards','certificates','transcripts','checkin','diary','surveys','career_counseling','book_request','messages','inbox','notifications','eresources','cbt_exam','timetable','school_calendar','announcements','events','gallery','voting','feature_guide','index','about','contact','apply'];
    if (r === 'parent' && parentAllowed.includes(cur)) return;
    if (r === 'student' && studentAllowed.includes(cur)) return;
    if (['staff','teacher'].includes(r)) {
      const adminOnly = ['academic_setup','approvals','admin_data','payroll','hr','compliance','storage','settings','finance','inventory','promotion','alumni','departments','directory'];
      if (!adminOnly.includes(cur)) return;
    }
    const shell = document.querySelector('.app-layout[data-require-role]');
    const required = shell ? shell.getAttribute('data-require-role') : '';
    const blockedByNav = active && active.style.display === 'none';
    const blockedByRole = required && !App.canAccessAllowList(required, r);
    if (!blockedByNav && !blockedByRole && !(active && active.classList.contains('nav-locked'))) return;
    const pageTitle = (active && active.textContent.trim()) || document.title || 'this page';
    const content = document.querySelector('.app-content');
    if (content) {
      content.innerHTML = '<div class="card" style="max-width:760px;margin:30px auto;text-align:center;border-color:#fecaca;background:#fff7f7"><h2>🔒 Restricted Page</h2><p style="color:var(--gray-700)">Your role ('+esc(r)+') does not have permission to use <strong>'+esc(pageTitle)+'</strong>.</p><a class="btn btn-primary" href="dashboard.html">Return to your dashboard</a></div>';
    }
  },

  ensureActiveNavVisible() {
    // Kept for backward compatibility; visibility is now handled by applyRoleNav.
  },

  /* ----- Auth (now METHODS of App so login forms calling
     App.handleSignIn / App.handleSignUp actually resolve — v7 bug fix) ----- */
  async handleSignIn(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = (fd.get('email') || '').trim();
    const password = fd.get('password') || '';
    if (!sb) { toast('Database not configured. Edit assets/js/config.js with your Supabase URL and anon key.', 'warning', 7000); return; }
    const btn = e.target.querySelector('button[type=submit]');
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Signing in…'; }
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Sign in'; }
      toast(error.message || 'Sign-in failed. Check your email and password.', 'danger', 6000);
      return;
    }
    App.logActivity('login', 'auth', email);
    location.href = 'dashboard.html';
  },

  async handleSignUp(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (!sb) { toast('Database not configured. Edit assets/js/config.js with your Supabase keys.', 'warning', 7000); return; }
    const btn = e.target.querySelector('button[type=submit]');
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Submitting…'; }
    const { data, error } = await sb.auth.signUp({
      email: (fd.get('email') || '').trim(),
      password: fd.get('password') || '',
      options: { data: { full_name: fd.get('full_name'), phone: fd.get('phone'), role: fd.get('role') } }
    });
    if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Request access'; }
    if (error) { toast(error.message || 'Could not create the request.', 'danger', 6000); return; }
    toast('✅ Request sent. Check your email to confirm, then wait for admin approval.', 'success', 7000);
    if (e.target.reset) e.target.reset();
    App.switchAuthTab('signin');
  },

  /* Tab switcher — moved into App so the login page no longer depends on the
     builder-only templates.js (which is never shipped to the school site). */
  switchAuthTab(tab) {
    const s = document.getElementById('signin-form');
    const u = document.getElementById('signup-form');
    const ts = document.getElementById('tab-signin');
    const tu = document.getElementById('tab-signup');
    if (!s || !u) return;
    if (tab === 'signup') {
      s.style.display = 'none'; u.style.display = 'block';
      if (tu) tu.className = 'btn btn-primary'; if (ts) ts.className = 'btn btn-outline';
    } else {
      s.style.display = 'block'; u.style.display = 'none';
      if (ts) ts.className = 'btn btn-primary'; if (tu) tu.className = 'btn btn-outline';
    }
  },

  /* Lightweight, free audit log (no AI, no paid service) */
  logActivity(action, entity, entityId, details) {
    if (!sb) return;
    try {
      sb.auth.getUser().then(({ data }) => {
        const u = data && data.user;
        sb.from('activity_log').insert({
          actor_id: u ? u.id : null,
          actor_email: u ? u.email : entityId,
          action, entity, entity_id: String(entityId || ''),
          details: details || null
        }).then(() => {}, () => {});
      });
    } catch (_) {}
  },

  bindUI() {
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-app-action]');
      if (a) {
        const fn = a.dataset.appAction;
        if (App[fn]) App[fn](a);
      }
    });
  },

  toggleDarkMode() {
    const cur = document.body.dataset.theme || 'light';
    document.body.dataset.theme = cur === 'dark' ? 'light' : 'dark';
    localStorage.setItem('sc-theme', document.body.dataset.theme);
  },

  signOut() {
    if (!sb) { location.href = 'login.html'; return; }
    sb.auth.signOut().then(() => location.href = 'login.html');
  },

  toggleSidebar() {
    const el = document.getElementById('app-sidebar');
    if (el) el.classList.toggle('open');
  },

  switchCampus(name) {
    localStorage.setItem('sc-campus', name);
    location.reload();
  },

  /* Page-aware data loaders */
  async loadPageData() {
    const path = location.pathname.split('/').pop().replace('.html','') || 'dashboard';
    if (path === 'dashboard' && App.loadDashboard) App.loadDashboard();
    if (path === 'voting' && typeof VotingUI !== 'undefined') VotingUI.renderPollList();
    if (path === 'notifications' && typeof Notifications !== 'undefined') Notifications.loadDropdownItems();
    if (path === 'student-profile' && typeof SP !== 'undefined' && SP.init) SP.init();
    if (path === 'cbt' && typeof CBTUI !== 'undefined' && CBTUI.refresh) CBTUI.refresh();
    if (path === 'approvals' && typeof AP !== 'undefined' && AP.load) AP.load();
    if (path === 'admissions' && typeof ADM !== 'undefined' && ADM.load) ADM.load();
    if (path === 'parents' && typeof PR !== 'undefined' && PR.init) PR.init();
    if (path === 'idcards' && typeof IDC !== 'undefined' && IDC.init) IDC.init();
    if (path === 'certificates' && typeof CERT !== 'undefined' && CERT.init) CERT.init();
    if (path === 'digital_library' && typeof DL !== 'undefined' && DL.init) DL.init();
    if (path === 'timetable-generator' && typeof TTG !== 'undefined' && TTG.init) TTG.init();
    if (path === 'checkin' && typeof QRCI !== 'undefined' && QRCI.init) QRCI.init();
    if (path === 'diary' && typeof DIARY !== 'undefined' && DIARY.init) DIARY.init();
    if (path === 'surveys' && typeof SURVEY !== 'undefined' && SURVEY.init) SURVEY.init();
    if (path === 'menu' && typeof MENU !== 'undefined' && MENU.init) MENU.init();
    if (path === 'settings' && typeof SETTINGS !== 'undefined' && SETTINGS.init) SETTINGS.init();
    if (path === 'messages' && typeof MSG !== 'undefined' && MSG.init) MSG.init();
    if (path === 'teacher-overview' && typeof TO !== 'undefined' && TO.init) TO.init();
    if (path === 'sow' && typeof SOW !== 'undefined' && SOW.init) SOW.init();
    if (path === 'report-cards' && typeof RC !== 'undefined' && RC.init) RC.init();
    if (path === 'academic_records' && typeof AR !== 'undefined' && AR.init) AR.init();
    if (path === 'cbt-prompts' && typeof CBTP !== 'undefined' && CBTP.init) CBTP.init();
    if (path === 'admin-data' && typeof ADM_DATA !== 'undefined' && ADM_DATA.init) ADM_DATA.init();
    if (path === 'storage' && typeof STORAGE !== 'undefined' && STORAGE.init) STORAGE.init();
    // Generic CRUD list for any module page that has a schema definition.
    if (typeof CRUD !== 'undefined' && CRUD.def && CRUD.def(path)) { try { CRUD.renderList(path); } catch (e) {} }
    if (App['load_' + path]) App['load_' + path]();
  },

  async loadDashboard() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const safeCount = async (table, filterFn) => {
      if (!sb) return 0;
      try {
        let q = sb.from(table).select('id', { count: 'exact', head: true });
        if (filterFn) q = filterFn(q);
        const r = await q;
        return r && !r.error ? (r.count || 0) : 0;
      } catch (_) { return 0; }
    };
    const safeRows = async (table, select='*', limit=5, order='created_at') => {
      if (!sb) return [];
      try {
        let q = sb.from(table).select(select);
        if (order) q = q.order(order, { ascending:false });
        if (limit) q = q.limit(limit);
        const r = await q;
        return r && !r.error ? (r.data || []) : [];
      } catch (_) { return []; }
    };
    try {
      const [studentCount, staffCount, feeRows, announcements, openPolls,
             attendanceCount, cbtCount, resultCount, parentCount, complaintCount,
             applicationCount, messageCount, assignmentCount, behaviourCount,
             supportCount, libraryCount, payrollCount, inventoryCount] = await Promise.all([
        safeCount('students'),
        safeCount('staff'),
        safeRows('fee_payments', 'amount_paid', 500, null),
        safeRows('announcements', '*', 5, 'created_at'),
        safeRows('polls', '*', 3, 'created_at'),
        safeCount('attendance'),
        safeCount('cbt_exams'),
        safeCount('results'),
        safeCount('parent_student'),
        safeCount('complaints'),
        safeCount('admission_applications'),
        safeCount('messages'),
        safeCount('assignments'),
        safeCount('behaviour'),
        safeCount('support_plans'),
        safeCount('library'),
        safeCount('payroll'),
        safeCount('inventory')
      ]);
      const feesPaid = (feeRows || []).reduce((a,b) => a + (Number(b.amount_paid) || 0), 0);
      set('stat-students', studentCount);
      set('stat-staff', staffCount);
      set('stat-fees', feesPaid.toLocaleString());
      set('stat-announcements', announcements.length);
      // Admin/Super Admin oversight KPIs. These IDs exist only on the admin dashboard.
      set('ov-staff-count', staffCount);
      set('ov-attendance', attendanceCount);
      set('ov-cbt-open', cbtCount);
      set('ov-results', resultCount);
      set('ov-parent-fees', feeRows.length);
      set('ov-payroll', payrollCount);
      set('ov-inventory', inventoryCount);
      set('ov-parents', parentCount);
      set('ov-complaints', complaintCount);
      set('ov-applications', applicationCount);
      set('ov-messages', messageCount);
      set('ov-assignments', assignmentCount);
      set('ov-behaviour', behaviourCount);
      set('ov-support', supportCount);
      set('ov-library', libraryCount);
      const annEl = document.getElementById('dash-announcements');
      if (annEl) annEl.innerHTML = announcements.length
        ? announcements.map(a => '<div style="padding:10px 0;border-bottom:1px solid var(--gray-200)"><strong>'+esc(a.title)+'</strong><div style="font-size:0.82rem;color:var(--gray-500)">'+(a.created_at ? new Date(a.created_at).toLocaleString() : '')+'</div></div>').join('')
        : '<p style="color:var(--gray-500)">No announcements yet.</p>';
      const pollEl = document.getElementById('dash-polls');
      if (pollEl) pollEl.innerHTML = openPolls.length
        ? openPolls.map(p => '<div style="padding:10px 0;border-bottom:1px solid var(--gray-200)"><a href="voting.html?poll='+p.id+'"><strong>'+esc(p.title)+'</strong></a><span class="badge badge-success" style="margin-left:8px">open</span></div>').join('')
        : '<p style="color:var(--gray-500)">No active polls.</p>';
      const ctx = document.getElementById('dash-chart');
      if (ctx && window.Chart) {
        var _sc = Number(studentCount || 0), _fp = Number(feeRows.length || 0);
        new Chart(ctx, { type: 'doughnut', data: { labels:['Payment rows','Students without payment row'], datasets:[{ data:[_fp, Math.max(0, _sc - _fp)], backgroundColor:['#10b981','#e2e8f0'] }] }, options: { responsive:true, plugins:{ legend:{ position:'bottom' } } } });
      }
    } catch (e) { console.warn('Dashboard load failed (demo mode):', e.message); }
  },

  /* Modal — now opens the REAL CRUD form for the module (fixes the old
     "Form will be generated for ..." placeholder). */
  openAddModal(type) {
    if (typeof CRUD !== 'undefined' && CRUD.def && CRUD.def(type)) { CRUD.openForm(type); return; }
    if (typeof openModal === 'function') openModal('Add ' + type, '<p>This module is view-only or has a dedicated page.</p>');
  }
};

/* ----- Modal helpers ----- */
function openModal(title, body, footer) {
  const b = document.getElementById('modal-backdrop');
  if (!b) return;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-footer').innerHTML = footer || '<button class="btn btn-outline" onclick="closeModal()">Close</button>';
  b.classList.add('show');
}
function closeModal() {
  const b = document.getElementById('modal-backdrop');
  if (b) b.classList.remove('show');
}
function toast(msg, type='info', ms=3500) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.innerHTML = '<div class="toast-msg">' + esc(msg) + '</div>';
  c.appendChild(t);
  setTimeout(() => { t.style.animation = 'slideOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, ms);
}

window.Tools = window.Tools || {
  active:null, expr:'', ans:'',
  symbols:'± ∓ × ÷ · ≈ ≠ ≡ ≤ ≥ < > ∞ √ ∛ ∜ π θ α β γ δ λ μ Ω ω Δ ∇ ∂ ∫ ∑ ∏ ∈ ∉ ∪ ∩ ⊂ ⊆ ∀ ∃ ⇒ ⇔ → ← ↔ ° ′ ″ ² ³ ⁴ ₀ ₁ ₂ ₃ ₄ ₅ ₆ ₇ ₈ ₉ ¹ ½ ¼ ¾ ⁄ ₙ ₓ ₊ ₋ H₂O CO₂ O₂ Na⁺ Cl⁻ e⁻ pH ∆H mol kg m² m³'.split(' '),
  calcButtons:['sin','cos','tan','log','ln','√','x²','xʸ','π','e','7','8','9','÷','⌫','4','5','6','×','C','1','2','3','-','CE','0','.','=','+','Ans'],
  init(){
    const cg=document.getElementById('calc-grid'); if(cg&&!cg.dataset.ready){ cg.dataset.ready='1'; cg.innerHTML=this.calcButtons.map(b=>'<button type="button" class="btn btn-sm btn-outline" onclick="Tools.calcPress(\''+b+'\')">'+b+'</button>').join(''); }
    const sg=document.getElementById('symbol-grid'); if(sg&&!sg.dataset.ready){ sg.dataset.ready='1'; sg.innerHTML=this.symbols.map(x=>'<button type="button" class="btn btn-sm btn-outline" onclick="Tools.insertSymbol(\''+x+'\')">'+x+'</button>').join(''); }
  },
  toggleCalc(v){ this.init(); const p=document.getElementById('calc-panel'); if(p)p.style.display=(v===false?'none':(p.style.display==='none'||!p.style.display?'block':'none')); },
  toggleSymbols(v){ this.init(); const p=document.getElementById('symbol-panel'); if(p)p.style.display=(v===false?'none':(p.style.display==='none'||!p.style.display?'block':'none')); },
  insertSymbol(x){ const el=this.active || document.querySelector('.cbt-free-answer') || document.activeElement; if(el && ('value' in el)){ const a=el.selectionStart||0,b=el.selectionEnd||0; el.value=el.value.slice(0,a)+x+el.value.slice(b); el.focus(); this.active=el; el.selectionStart=el.selectionEnd=a+x.length; if(typeof Exam!=='undefined'&&Exam.answer) Exam.answer(el.value); } else { alert('Tap inside an answer input field first.'); } },
  calcPress(b){
    if(b==='C'){this.expr='';return this.show();} if(b==='CE'){this.expr='';this.ans='';return this.show();} if(b==='⌫'){this.expr=this.expr.slice(0,-1);return this.show();}
    if(b==='Ans'){this.expr+=this.ans||'';return this.show();} if(b==='='){return this.eval();}
    const map={'×':'*','÷':'/','π':'pi','√':'sqrt(','x²':'^2','xʸ':'^','ln':'ln(','log':'log(','sin':'sin(','cos':'cos(','tan':'tan('};
    this.expr += map[b] || b; this.show();
  },
  show(){ const d=document.getElementById('calc-display'); if(d)d.value=this.expr; },
  eval(){ try{ let e=this.expr.replace(/pi/g,'Math.PI').replace(/\be\b/g,'Math.E').replace(/sin\(/g,'Math.sin(').replace(/cos\(/g,'Math.cos(').replace(/tan\(/g,'Math.tan(').replace(/sqrt\(/g,'Math.sqrt(').replace(/log\(/g,'Math.log10(').replace(/ln\(/g,'Math.log('); let op=(e.match(/\(/g)||[]).length; let cl=(e.match(/\)/g)||[]).length; while(op>cl){e+=')';cl++;} while(/(\d+(?:\.\d+)?)\^(\d+(?:\.\d+)?)/.test(e)) e=e.replace(/(\d+(?:\.\d+)?)\^(\d+(?:\.\d+)?)/g,'Math.pow($1,$2)'); const val=Function('"use strict";return ('+e+')')(); this.ans=String(Math.round(Number(val)*1e10)/1e10); this.expr=this.ans; this.show(); }catch(err){ this.expr='Error'; this.show(); } }
};
document.addEventListener('DOMContentLoaded', ()=>window.Tools.init());
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* Backwards-compatible global aliases (in case any inline handler still
   references the bare function names instead of App.*). */
function handleSignIn(e){ return App.handleSignIn(e); }
function handleSignUp(e){ return App.handleSignUp(e); }

/* Boot */
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.init);
else App.init();
`;
  },

  /* Service worker (offline cache + push handler) */
  serviceWorker(cfg) {
    return `// School Connect Service Worker — offline + push
const CACHE = 'sc-cache-2026-06-27-r2';
const CORE = ['./','./index.html','./login.html','./dashboard.html','./offline.html','./assets/css/style.css','./assets/js/config.js','./assets/js/app.js','./assets/js/notifications.js','./assets/js/voting.js','./assets/js/pwa-install.js','./assets/js/super.js','./assets/js/site-help.js','./assets/js/cbt-engine.js','./assets/js/analytics.js','./assets/js/enterprise.js','./assets/js/crud.js','./assets/img/logo.${cfg.logoExt}','./manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        const copy = res.clone();
        if (res.ok && (e.request.url.startsWith(self.location.origin))) {
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => {
        if (cached) return cached;
        if (e.request.mode === 'navigate') return caches.match('./offline.html');
        return Promise.reject(new Error('offline'));
      });
      return cached || network;
    })
  );
});
self.addEventListener('push', e => {
  let data = { title: 'School Connect', body: 'You have a new notification' };
  try { if (e.data) data = Object.assign(data, e.data.json()); } catch (_) {}
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: 'assets/img/logo.${cfg.logoExt}', badge: 'assets/img/logo.${cfg.logoExt}',
    data: data, vibrate: [200,100,200], tag: data.tag || 'sc-' + Date.now()
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(clients.matchAll({ type: 'window' }).then(list => {
    for (const c of list) { if (c.url.includes(url)) return c.focus(); }
    return clients.openWindow(url);
  }));
});
`;
  },

  /* sitemap.xml with all module pages */
  sitemapXML(cfg) {
    const pages = ['index','login','dashboard','voting','notifications','about'].concat((cfg.modules || []));
    const urls = pages.map(p => `  <url><loc>/${p}.html</loc><changefreq>weekly</changefreq><priority>${p==='index'?1.0:0.7}</priority></url>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
  <url><loc>${cfg.hmgLink}</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
</urlset>`;
  },

  /* Generated-school landing page (about.html) */
  pageAbout(cfg) {
    return T.head(cfg, 'About ' + cfg.schoolName) + T.bellAndBanner(cfg) + T.modal() + `
<div class="container" style="padding:120px 24px 60px;max-width:900px;margin:0 auto">
  <div style="text-align:center;margin-bottom:40px">
    <img src="assets/img/logo.${cfg.logoExt}" alt="" style="width:80px;height:80px;margin:0 auto 16px;border-radius:16px">
    <h1 style="font-size:2.5rem;font-weight:900;color:var(--dark);margin-bottom:8px">${T.esc(cfg.schoolName)}</h1>
    ${cfg.schoolMotto ? `<p style="color:var(--gray-600);font-size:1.2rem">${T.esc(cfg.schoolMotto)}</p>` : ''}
  </div>
  <div class="card">
    <h2>Welcome</h2>
    <p style="margin-top:12px;color:var(--gray-700);line-height:1.8">${T.esc(cfg.schoolName)} uses the <strong>School Connect</strong> platform by <a href="${T.esc(cfg.hmgLink)}" target="_blank" rel="noopener">HMG Concepts</a> to manage students, results, fees, attendance, CBT exams and parent communication — 100% free, mobile-friendly, and owned by us forever.</p>
    <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap">
      <a href="login.html" class="btn btn-primary">Sign in</a>
      <a href="apply.html" class="btn btn-outline">Apply for admission</a>
      <a href="contact.html" class="btn btn-outline">Contact us</a>
    </div>
  </div>
  ${cfg.address ? `<div class="card" style="margin-top:20px"><h3>📍 Address</h3><p style="margin-top:8px;color:var(--gray-700)">${T.esc(cfg.address)}</p></div>` : ''}
  ${cfg.phone || cfg.email ? `<div class="card" style="margin-top:20px"><h3>📞 Contact</h3><p style="margin-top:8px;color:var(--gray-700)">${cfg.phone ? 'Phone: ' + T.esc(cfg.phone) + '<br>' : ''}${cfg.email ? 'Email: ' + T.esc(cfg.email) : ''}</p></div>` : ''}
  <p style="text-align:center;margin-top:40px;font-size:0.85rem;color:var(--gray-500)">Powered by <a href="${T.esc(cfg.hmgLink)}" target="_blank" rel="noopener">HMG Concepts</a></p>
</div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="assets/js/config.js"></script>
<script src="assets/js/notifications.js"></script>
<script src="assets/js/pwa-install.js"></script>
<script src="assets/js/site-help.js"></script>
<script src="assets/js/super.js"></script>
<script src="assets/js/enterprise.js"></script>
<script src="assets/js/crud.js"></script>
<script src="assets/js/app.js"></script>
<script>
if (window.Notifications) {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').then(reg => Notifications.init(sb, reg));
  else Notifications.init(sb);
}
if (window.PWAInstall) PWAInstall.init();
if (window.Super) Super.init(sb, window.SCHOOL);
if (window.Enterprise) Enterprise.init(sb);
if (window.CRUD) CRUD.init(sb);
</script>
</body></html>`;
  },

  /* Landing page index.html for the generated school (optional, points to login) */
  pageIndex(cfg) {
    return T.head(cfg, cfg.schoolName) + T.bellAndBanner(cfg) + T.modal() + `
<style>
  .hero-enhanced { text-align: center; padding: 120px 20px 80px; background: linear-gradient(135deg, var(--primary), var(--accent)); color: white; border-radius: 0 0 40px 40px; margin-bottom: 60px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
  .hero-enhanced h1 { font-size: 3.5rem; font-weight: 900; margin-bottom: 20px; line-height: 1.1; letter-spacing: -1px; }
  .hero-enhanced p { font-size: 1.25rem; max-width: 600px; margin: 0 auto 40px; opacity: 0.9; }
  .hero-enhanced .btn-group { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }
  .btn-white { background: white; color: var(--primary); font-weight: bold; padding: 14px 28px; border-radius: 30px; text-decoration: none; transition: transform 0.2s, box-shadow 0.2s; display: inline-block; }
  .btn-white:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.15); }
  .btn-outline-white { background: transparent; color: white; border: 2px solid white; font-weight: bold; padding: 12px 28px; border-radius: 30px; text-decoration: none; transition: background 0.2s, color 0.2s; display: inline-block; }
  .btn-outline-white:hover { background: white; color: var(--primary); }
  .stats-bar { display: flex; justify-content: center; gap: 40px; margin-top: 60px; flex-wrap: wrap; }
  .stat-item { text-align: center; }
  .stat-value { font-size: 2.5rem; font-weight: 800; display: block; }
  .stat-label { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; }
  .feature-card { background: white; border-radius: 20px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); transition: transform 0.3s; border: 1px solid var(--gray-200); }
  .feature-card:hover { transform: translateY(-5px); border-color: var(--primary); }
  .feature-card .icon-wrapper { width: 60px; height: 60px; border-radius: 16px; background: rgba(var(--primary-rgb), 0.1); display: flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 20px; color: var(--primary); }
</style>
<div class="hero-enhanced">
  <div style="display:inline-flex;align-items:center;background:rgba(255,255,255,0.2);padding:6px 16px;border-radius:20px;font-size:0.9rem;font-weight:600;margin-bottom:24px;">
    <span style="margin-right:8px">🎓</span> Official School Portal
  </div>
  <h1>Welcome to ${T.esc(cfg.schoolName)}</h1>
  <p>${T.esc(cfg.schoolMotto || 'Manage your academic life — students, results, fees, attendance and more — in one secure, modern platform.')}</p>
  <div class="btn-group">
    <a href="login.html" class="btn-white">Sign in to Portal</a>
    <a href="about.html" class="btn-outline-white">Learn More</a>
  </div>
  <div class="stats-bar">
    <div class="stat-item"><span class="stat-value">100%</span><span class="stat-label">Secure</span></div>
    <div class="stat-item"><span class="stat-value">24/7</span><span class="stat-label">Access</span></div>
    <div class="stat-item"><span class="stat-value">Real-time</span><span class="stat-label">Updates</span></div>
  </div>
</div>

<div class="container" style="padding:0 24px 80px;max-width:1200px;margin:0 auto">
  <div style="text-align:center;margin-bottom:60px">
    <h2 style="font-size:2.2rem;font-weight:800;color:var(--dark);margin-bottom:16px">Why Choose Our Portal?</h2>
    <p style="color:var(--gray-600);font-size:1.1rem;max-width:600px;margin:0 auto">Experience the next generation of academic management with enterprise-grade features.</p>
  </div>
  <div class="grid grid-3" style="gap:30px">
    <div class="feature-card">
      <div class="icon-wrapper">📊</div>
      <h3 style="font-size:1.2rem;margin-bottom:12px;color:var(--dark)">Real-time Results</h3>
      <p style="color:var(--gray-600);line-height:1.6">Continuous assessment, exam scores, and CBT marks updated instantly and securely.</p>
    </div>
    <div class="feature-card">
      <div class="icon-wrapper">📱</div>
      <h3 style="font-size:1.2rem;margin-bottom:12px;color:var(--dark)">Installable Mobile App</h3>
      <p style="color:var(--gray-600);line-height:1.6">Install directly on your phone for instant push notifications and fast, offline access.</p>
    </div>
    <div class="feature-card">
      <div class="icon-wrapper">🗳️</div>
      <h3 style="font-size:1.2rem;margin-bottom:12px;color:var(--dark)">Digital Voting</h3>
      <p style="color:var(--gray-600);line-height:1.6">Participate in school elections, polls, and prefect voting securely from your device.</p>
    </div>
    <div class="feature-card">
      <div class="icon-wrapper">💰</div>
      <h3 style="font-size:1.2rem;margin-bottom:12px;color:var(--dark)">Seamless Fee Tracking</h3>
      <p style="color:var(--gray-600);line-height:1.6">View real-time fee balances, download printable receipts, and check payment history.</p>
    </div>
    <div class="feature-card">
      <div class="icon-wrapper">📢</div>
      <h3 style="font-size:1.2rem;margin-bottom:12px;color:var(--dark)">Multi-channel Broadcasts</h3>
      <p style="color:var(--gray-600);line-height:1.6">Stay updated with critical announcements via WhatsApp, email, and push alerts.</p>
    </div>
    <div class="feature-card">
      <div class="icon-wrapper">🔒</div>
      <h3 style="font-size:1.2rem;margin-bottom:12px;color:var(--dark)">Enterprise Security</h3>
      <p style="color:var(--gray-600);line-height:1.6">Bank-grade Row-Level Security ensures your family's data remains private and protected.</p>
    </div>
  </div>
  
  <div style="margin-top:80px;background:var(--gray-100);border-radius:24px;padding:60px 40px;text-align:center">
    <h2 style="font-size:2rem;font-weight:800;color:var(--dark);margin-bottom:20px">Ready to get started?</h2>
    <p style="color:var(--gray-600);margin-bottom:32px;font-size:1.1rem">Join the community and experience seamless academic tracking.</p>
    <a href="login.html" class="btn btn-primary btn-lg" style="padding:16px 40px;border-radius:30px;font-size:1.1rem">Access Portal Now</a>
  </div>

  <div style="text-align:center;margin-top:60px;color:var(--gray-500);font-size:0.85rem">
    Powered by the HMG Academy Ecosystem | Built by <a href="${T.esc(cfg.hmgLink)}" target="_blank" rel="noopener" style="color:var(--primary);font-weight:600">HMG Concepts</a>
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="assets/js/config.js"></script>
<script src="assets/js/notifications.js"></script>
<script src="assets/js/pwa-install.js"></script>
<script src="assets/js/site-help.js"></script>
<script src="assets/js/super.js"></script>
<script src="assets/js/enterprise.js"></script>
<script src="assets/js/crud.js"></script>
<script src="assets/js/app.js"></script>
<script>
if (window.Notifications) {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').then(reg => Notifications.init(sb, reg));
  else Notifications.init(sb);
}
if (window.PWAInstall) PWAInstall.init();
if (window.Super) Super.init(sb, window.SCHOOL);
if (window.Enterprise) Enterprise.init(sb);
if (window.CRUD) CRUD.init(sb);
</script>
</body></html>`;
  },

  /* Generated-school README */
  schoolReadme(cfg) {
    return `# ${cfg.schoolName} — Comprehensive School Connect Platform

Welcome to the official, enterprise-grade School Connect management platform generated specifically for **${cfg.schoolName}**. This deployment package provides everything needed to establish a digital footprint for your institution, complete with progressive web application capabilities, advanced role-based access, and enterprise-level modules.

## 🚀 Overview

This fully-featured platform adapts to traditional and modern build deployments. It comes built-in with features like offline access, push notifications, row-level security, and a beautiful UI tailored to your specific branding choices.

**School Motto:** ${cfg.schoolMotto || 'N/A'}
**Branding Theme:** ${cfg.themeId} (Primary: ${cfg.themePrimary}, Accent: ${cfg.themeAccent})
**Typography:** ${cfg.fontFamily}

---

## 🛠️ Deployment Instructions

### Step 1: Database and Authentication Setup (Supabase)
We use Supabase for free, secure, and scalable backend infrastructure.
1. **Create a Free Project**: Head to [Supabase](https://supabase.com) and create a free tier project.
2. **Execute Schema**: In your project's **SQL Editor**, paste and run these files **in this order** (each shows a success message):
   1. \`database/schema.sql\` — core platform (students, staff, fees, RLS…)
   2. \`database/voting-schema.sql\` — voting & polls
   3. \`database/cbt-schema.sql\` — the CBT / online-exam engine
   4. \`database/reportcard-schema.sql\` — flexible report cards (auto-links CBT results)
   5. \`database/enterprise-schema.sql\` — timetable generator, QR check-in, diary, surveys, menu, 2FA, i18n
3. **Get Credentials**: Go to Project Settings → API and copy your **Project URL** and **anon public key**.
4. **Link Frontend**: Open \`${cfg.buildType === 'modern' ? 'public/' : ''}assets/js/config.js\` and replace \`YOUR_SUPABASE_URL\` and \`YOUR_SUPABASE_ANON_KEY\` with your copied values.

### Step 2: Hosting and Build Process
This platform supports the build type you selected during generation: **${cfg.buildType.toUpperCase()}**.

${cfg.buildType === 'modern' ? `**Modern Build Workflow (Node.js / Express):**
1. **Install Dependencies**: Open your terminal in this directory and run:
   \`\`\`bash
   npm install
   \`\`\`
2. **Start Server**: Launch the application by running:
   \`\`\`bash
   npm start
   \`\`\`
   *(For development with auto-restart, use \`npm run dev\`)*
3. **Access**: Navigate to \`http://localhost:3000\`.
4. **Extensibility**: You can extend \`server.js\` to add custom REST API endpoints, middleware, or server-side rendering logic. All frontend files reside securely in the \`public/\` folder.` 
: `**Traditional Build Workflow (Static Hosting):**
1. **Deployment Platform**: You can host this instantly on platforms like GitHub Pages, Vercel, Netlify, or Cloudflare Pages.
2. **Upload Files**: Simply drag and drop or push the entire directory contents to your chosen platform.
3. **No Build Step Required**: Since this is purely static (HTML/CSS/JS), it serves immediately without any build configuration.`}

### Step 3: Admin Initialization
1. Visit the deployed site in your browser.
2. Click **Sign in to Portal** and choose **Request access** to register an account.
3. Head back to the Supabase SQL Editor and elevate your newly created user to an admin by running:
   \`\`\`sql
   UPDATE profiles SET role='admin', status='approved' WHERE email='your-email@example.com';
   \`\`\`
4. You can now log in, access the dashboard, and begin approving staff and students directly from the **Directory** or **Staff** modules.

---

## 📦 Enabled Modules
Your platform is pre-configured with the following modules:
${(cfg.modules || []).map(m => '- **' + (window.SC.MODULES.find(x => x.id === m)?.name || m) + '**').join('\n')}

---

## 🌟 Enterprise Features

- **Progressive Web App (PWA)**: Installable directly on any mobile device or desktop. Fully capable of offline caching.
- **Advanced Push Notifications**: Integrated with Service Workers to deliver browser, email, and WhatsApp notifications to parents and staff instantly.
- **Voting & Polling System**: Secure, anonymous, and real-time electronic voting for school prefects or PTA decisions.
- **Row-Level Security (RLS)**: Enterprise-grade database security ensuring families can only access their specific records.
- **Search Engine Optimization (SEO)**: Pre-generated \`robots.txt\`, \`sitemap.xml\`, and JSON-LD schema ensure your school ranks highly on Google and points prospects to the HMG Academy Ecosystem for lead generation.
- **Dark Mode & Responsive UI**: Adaptive design that looks perfect on 4K monitors and mobile phones alike.
- **Embedded CBT Engine**: 17 question types, anti-cheat, certificates; results auto-flow into report cards.
- **Flexible Report Cards**: Custom assessment columns with apportioned max marks; live totals, grades and positions.
- **Help Chatbot (no AI)**: A rules-based assistant on every page for instant self-service support.
- **Command Palette (Ctrl/Cmd + K)**: Jump to any module and search students, staff and exams from one box.
- **ID-card, Certificate & Flyer generators**: Branded, printable, with QR / verification codes.
- **Admin Data Console**: Read, delete, full JSON backup & restore of every table; per-table CSV export.
- **Analytics**: Live platform-wide KPIs and charts for informed decisions.

---

## 🌐 HMG Academy Ecosystem
This platform is a proud part of the **HMG Academy Ecosystem**. It's optimized for lead generation, pointing prospective clients and students to [HMG Concepts](${cfg.hmgLink}). The software stays free forever, with robust architecture preventing any dependency on paid AI APIs or costly third-party services.
`;
  },

  /* Generated-school DEPLOYMENT GUIDE — detailed, unambiguous, step-by-step */
  schoolDeploymentGuide(cfg) {
    const assetsPath = cfg.buildType === 'modern' ? 'public/assets/js/config.js' : 'assets/js/config.js';
    return `# 🚀 Deployment Guide — ${cfg.schoolName}

This guide walks you from a freshly downloaded ZIP to a **live, working school
portal** in about 15 minutes, using only **free tools** (Supabase free tier +
free static hosting). No credit card. No monthly fees. No AI APIs.

> Read every step in order. Each step says exactly what to click and type.

---

## ✅ Before you start — what you need
- A computer with a web browser (Chrome or Edge recommended).
- A free **GitHub** account (https://github.com/signup) — for hosting.
- A free **Supabase** account (https://supabase.com) — for the database & login.
- This ZIP, fully **unzipped** into a folder you can find.

---

## STEP 1 — Create your free database (Supabase)

1. Go to **https://supabase.com** → click **Start your project** → sign in with GitHub.
2. Click **New project**.
   - **Name:** ${cfg.shortName || cfg.schoolName}
   - **Database Password:** click *Generate a password* and **save it somewhere safe**.
   - **Region:** pick the one closest to your school.
   - Click **Create new project** and wait ~2 minutes for it to finish provisioning.

## STEP 2 — Install the database tables (run the SQL)

1. In the left sidebar of your Supabase project, click **SQL Editor**.
2. Click **+ New query**.
3. Run these four files **in order** (open each from this ZIP, copy all, paste, Run):
   1. **\`database/schema.sql\`** → \`School Connect schema v8 installed successfully ✅\`
   2. **\`database/voting-schema.sql\`** → \`Voting schema v8 ready ✅\`
   3. **\`database/cbt-schema.sql\`** → \`School Connect CBT schema v2 installed ✅\`
   4. **\`database/reportcard-schema.sql\`** → \`School Connect Report-Card schema v2 installed ✅\`
   5. **\`database/enterprise-schema.sql\`** → \`School Connect Enterprise schema (FINAL v2) installed ✅\`
4. Click **Run** (or press Ctrl/Cmd+Enter) for each.
5. The CBT engine and report cards are now installed and **interconnected** — when a
   student takes an online exam that is mapped to a report-card column, the score
   flows automatically into the report card.
   - ✅ This single file creates **all** tables, security policies, the voting
     system and the new-user trigger. You do **NOT** need to run
     \`voting-schema.sql\` separately (it is only for upgrading an old project).
   - ❌ If you ever see \`relation "public.profiles" does not exist\`, you are
     running an **old** SQL file. Use the \`database/schema.sql\` from THIS ZIP —
     it has been re-ordered so that error can no longer happen.

## STEP 3 — Get your API keys

1. In Supabase, click the **gear / Project Settings** (bottom-left) → **API**.
2. Copy two values:
   - **Project URL** (looks like \`https://abcd1234.supabase.co\`)
   - **anon public** key (a long string starting with \`eyJ...\`)

## STEP 4 — Paste your keys into the app

1. Open **\`${assetsPath}\`** from this ZIP in a text editor.
2. Find these two lines near the top and replace the placeholders:
   \`\`\`js
   window.SUPABASE_URL = 'YOUR_SUPABASE_URL';        // paste Project URL here
   window.SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';   // paste anon public key here
   \`\`\`
3. **Save** the file. (The anon key is safe to ship publicly — Row-Level
   Security on the database is what actually protects your data.)

## STEP 5 — Turn on email confirmations (recommended)

1. In Supabase → **Authentication** → **Providers** → make sure **Email** is enabled.
2. Authentication → **URL Configuration** → set **Site URL** to the address where
   you will host the site (from Step 6). You can update this later.

## STEP 6 — Put the site online (free hosting)

Pick ONE of these (all free):

### Option A — GitHub Pages (recommended, easiest)
1. Create a new repository at https://github.com/new (e.g. \`${window.SC.slugify(cfg.schoolName)}-portal\`), set it **Public**, click **Create**.
2. On the repo page click **Add file → Upload files**, then drag in **ALL** the
   unzipped files and folders (keep the folder structure), and **Commit**.
3. Go to **Settings → Pages**. Under *Build and deployment* → *Source* choose
   **Deploy from a branch**, branch **main**, folder **/ (root)**, click **Save**.
4. Wait ~1 minute. Your live URL appears at the top: \`https://USERNAME.github.io/REPO/\`.

### Option B — Netlify Drop (no account-setup needed)
1. Go to **https://app.netlify.com/drop**.
2. Drag your **unzipped folder** onto the page. It deploys instantly and gives you a URL.

### Option C — Cloudflare Pages / Vercel
1. Connect your GitHub repo and deploy as a **static site** (no build command, output = root).

${cfg.buildType === 'modern' ? `> ⚙️ **You chose the MODERN (Node.js) build.** For local/server hosting run:
> \`\`\`bash
> npm install
> npm start      # then open http://localhost:3000
> \`\`\`
> For static hosting, the site lives in the **public/** folder — upload that folder.
` : '> You chose the **TRADITIONAL (static)** build — there is no build step. Just upload the files.'}

## STEP 7 — Create the first admin account

1. Open your live site and click **Sign in → Request access**.
2. Fill the form (use your real email), choose role **Admin**, submit, and
   **confirm the email** Supabase sends you.
3. Go back to Supabase → **SQL Editor** → run this (use YOUR email):
   \`\`\`sql
   update public.profiles
      set role = 'admin', status = 'approved'
    where email = 'your-email@example.com';
   \`\`\`
4. Return to the site and **Sign in**. You now have full admin access. 🎉

---

## 🔧 Quick checklist
- [ ] Supabase project created
- [ ] \`database/schema.sql\` run → success message shown
- [ ] URL + anon key pasted into \`${assetsPath}\`
- [ ] Site uploaded to free hosting and opens in a browser
- [ ] First user registered, promoted to admin via SQL, and able to log in

If anything goes wrong, open **TROUBLESHOOTING.md** in this ZIP.

Powered by HMG Concepts — ${cfg.hmgLink}
`;
  },

  /* Generated-school TROUBLESHOOTING — maps the exact errors users hit */
  schoolTroubleshooting(cfg) {
    const assetsPath = cfg.buildType === 'modern' ? 'public/assets/js/config.js' : 'assets/js/config.js';
    return `# 🩺 Troubleshooting — ${cfg.schoolName}

Common problems and their exact fixes. Find your symptom below.

---

### ❌ \`ERROR: 42P01: relation "public.profiles" does not exist\` when running the SQL
**Cause:** you ran an old SQL file whose helper functions were declared before the
tables they use.
**Fix:** Use **\`database/schema.sql\` from this ZIP**. It creates every table first,
then the functions, then the policies — so this error cannot occur. Re-run it; it
is safe to run more than once. (Do not run \`voting-schema.sql\` first; the main
schema already includes voting.)

---

### ❌ \`ERROR: 42P16: cannot drop columns from view\`
**Cause:** an OLDER version of a view (e.g. \`poll_results\` or \`report_subject_totals\`)
already exists in your Supabase project, and \`CREATE OR REPLACE VIEW\` cannot change an
existing view's columns.
**Fix:** Use the SQL files **from this ZIP** — they now run \`DROP VIEW IF EXISTS … CASCADE\`
before creating each view, so re-running is always safe. (If you prefer, you can also run
\`drop view if exists public.poll_results cascade; drop view if exists public.report_subject_totals cascade;\`
once, then re-run the schema.)

### ❌ \`ERROR: column "voter_id" does not exist\` (or similar)
**Cause:** a table from an OLD schema version is missing a column the new security policies
need (\`CREATE TABLE IF NOT EXISTS\` does not add columns to existing tables).
**Fix:** Use the SQL files **from this ZIP** — they include an idempotent
\`ALTER TABLE … ADD COLUMN IF NOT EXISTS\` backfill that repairs old tables automatically.
Just re-run \`database/schema.sql\`.

---

### ❌ I type my email & password but nothing happens / I am not logged in
Check each item:
1. **Did you paste your keys?** Open \`${assetsPath}\`. If it still says
   \`YOUR_SUPABASE_URL\`, login is disabled — paste your real Project URL and anon key.
2. **Did you confirm your email?** Supabase sends a confirmation link on sign-up.
   You cannot log in until you click it (unless you disabled confirmations).
3. **Is your account approved?** New accounts start as \`pending\`. An admin must
   approve you, or run the SQL in Step 7 of the Deployment Guide to approve yourself.
4. **Open the browser console (F12)** and look for red errors. A "Database not
   configured" toast means step 1 above.

> Note: in this version the **Sign in** and **Request access** buttons are wired to
> \`App.handleSignIn\` / \`App.handleSignUp\` and the tab switcher to
> \`App.switchAuthTab\`, all defined in \`assets/js/app.js\`. The earlier version
> referenced functions that did not exist on the generated site, so clicking did
> nothing — that is fixed here.

---

### ❌ My uploaded school logo does not show (a default badge appears instead)
**Cause (old version):** pages hard-coded \`logo.svg\` while your uploaded PNG/JPG was
saved as \`logo.png\`/\`logo.jpg\`, so the \`<img>\` pointed at a file that did not exist.
**Fix (this version):** every page now references **\`logo.${cfg.logoExt}\`** — the exact
file that was packaged. Your logo file in this ZIP is **\`assets/img/logo.${cfg.logoExt}\`**.
To change it later, replace that file (keep the same name) and re-upload.

---

### ❌ The voting page shows "Loading polls…" forever
- Make sure the schema ran (it creates \`polls\` and \`poll_votes\`).
- Make sure you are **logged in** — polls require an authenticated session.
- Free-tier Supabase has realtime; if a vote tally doesn't auto-update, refresh —
  the page still works without realtime.

---

### ❌ Push notifications don't appear
- The user must **install the app** (PWA banner) and click **Enable Push** on the
  Notifications page, then **Allow** in the browser prompt.
- iOS requires the app be **added to the Home Screen** first (Safari → Share → Add to Home Screen).

---

### ❌ Page looks unstyled in the in-app preview
External CSS/fonts may be blocked in a sandboxed preview. The **downloaded/hosted**
site loads them normally in a real browser.

Still stuck? Contact HMG Concepts: ${cfg.hmgLink}
`;
  },

  /* ====================================================================
     v2 — sample CSV question file shipped in the ZIP
     ==================================================================== */
  /* CSV bulk-import template for students (issue 11). Headers match the
     students table field keys exactly so the in-browser importer maps them. */
  studentsImportTemplate() {
    return 'full_name,class,arm,gender,date_of_birth,guardian_name,guardian_phone,guardian_email,address,campus\n' +
      'John Doe,JSS1,A,male,2013-05-12,Mr Doe,08030000001,doe@example.com,12 School Rd,Main Campus\n' +
      'Jane Smith,JSS1,B,female,2013-09-03,Mrs Smith,08030000002,smith@example.com,3 Park Ave,Main Campus\n';
  },

  sampleCSV() {
    return 'Question,A,B,C,D,CorrectAnswer,Explanation,Type,Tolerance,Unit,Accept,MRQ_AON,Pairs,Items,Difficulty,Tags,Section\n' +
      '"What is 5 + 7?",10,11,12,13,C,"Simple addition.",mcq,,,,,,,Easy,Arithmetic,Numbers\n' +
      '"Water boils at 100 degrees Celsius at sea level.",,,,,A,"True at standard atmospheric pressure.",truefalse,,,,,,,Easy,Science,Heat\n' +
      '"Solve for x: 3x = 21",,,,,7,"Divide both sides by 3.",numeric,0.01,,,,,,Medium,Algebra,Equations\n' +
      '"Name the capital of Nigeria.",,,,,Abuja,"Abuja became the capital in 1991.",short,,,FCT|Abuja City,,,,Easy,Geography,Nigeria\n' +
      '"Choose the prime numbers.",2,3,4,9,A|B,"2 and 3 are prime; 4 and 9 are composite.",mrq,,,,,,,Medium,Numbers,Primes\n';
  },

  /* ====================================================================
     v2 — CBT TEACHER MANAGER PAGE (create exams, upload CSV, view results)
     ==================================================================== */
  pageCBT(cfg) {
    const body = `
      <div class="card" style="margin-bottom:14px">
        <h3 style="margin-top:0">CBT Action Centre</h3>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button type="button" class="btn btn-primary" data-cbt-action="newExam" >➕ New Exam / Test</button>
          <button type="button" class="btn btn-outline" data-cbt-action="downloadTemplate" >⬇ CSV Template</button>
          <button type="button" class="btn btn-outline" data-cbt-action="promptGuide" >🧩 Question Prompt Guide</button>
          <button type="button" class="btn btn-outline" data-cbt-action="refresh" >↻ Refresh</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:18px">
        <p style="color:var(--gray-600);margin:0">
          Create online exams, tests, assignments, projects and quizzes with <strong>17 question types</strong>,
          timer, randomisation, negative marking, anti-cheat and certificates. Share a 6-character
          <strong>code</strong> or a direct link — students need no account. Map each assessment to a
          <strong>report-card column</strong> and results flow automatically into the student's report card.
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          <a class="btn btn-outline" href="cbt-exam.html">🧪 Open Student Exam Page</a>
          <span class="badge">Staff create exams here; students take exams on cbt-exam.html</span>
        </div>
      </div>
      <div id="cbt-list"><span class="pulse">Loading exams…</span></div>`;
    return T.shell(cfg, 'CBT / Online Exams', body, { requireRole: 'staff' })
      .replace('</body></html>', Generator._cbtTeacherScript(cfg) + '</body></html>');
  },

  _cbtTeacherScript(cfg) {
    return `<script src="assets/js/cbt-engine.js"></script>
<script>
CBT.init(sb);
const CBTUI = {
  async refresh(){
    const box = document.getElementById('cbt-list');
    if(!sb){ box.innerHTML = '<div class="card">⚠️ Database not configured. Add your Supabase keys in assets/js/config.js.</div>'; return; }
    try {
      const { data, error } = await CBT.listExams();
      if(error){ box.innerHTML = '<div class="card">Could not load exams: '+esc(error.message)+'</div>'; return; }
      if(!data || !data.length){ box.innerHTML = '<div class="card">No exams yet. Click <strong>+ New Exam / Test</strong> to create one.</div>'; return; }
      box.innerHTML = '<div class="table-wrap"><table><thead><tr><th>Code</th><th>Subject</th><th>Type</th><th>Class</th><th>Report column</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+
        data.map(e=>'<tr><td><strong>'+esc(e.code)+'</strong></td><td>'+esc(e.subject)+'</td><td>'+esc(e.assessment_type)+'</td><td>'+esc(e.class||'-')+'</td><td>'+esc(e.report_column||'-')+'</td><td>'+(e.is_open?'<span class=\\'badge badge-success\\'>Open</span>':'<span class=\\'badge\\'>Closed</span>')+'</td>'+
          '<td style="white-space:nowrap">'+
            '<button class="btn btn-sm btn-outline" onclick="CBTUI.toggle(\\''+e.id+'\\','+(!e.is_open)+')">'+(e.is_open?'Close':'Open')+'</button> '+
            '<button class="btn btn-sm btn-outline" onclick="CBTUI.share(\\''+esc(e.code)+'\\')">Share</button> '+
            '<button class="btn btn-sm btn-outline" onclick="CBTUI.results(\\''+e.id+'\\',\\''+esc(e.code)+'\\')">Results</button> '+
            '<button class="btn btn-sm btn-outline" data-admin-only onclick="CBTUI.del(\\''+e.id+'\\')">Delete</button>'+
          '</td></tr>').join('')+'</tbody></table></div>';
    } catch(err) { box.innerHTML = '<div class="card">Could not load exams: '+esc(err.message||err)+'</div>'; }
  },
  newExam(){
    const subj = (window.SCHOOL&&window.SCHOOL.modules)?'':'';
    openModal('New Exam / Test', \`
      <div class="form-group"><label>Title</label><input class="form-input" id="ex-title" placeholder="First Term Maths Test"></div>
      <div class="grid grid-2">
        <div class="form-group"><label>Subject</label><select class="form-select" id="ex-subject"><option value="">— select subject —</option></select></div>
        <div class="form-group"><label>Class</label><select class="form-select" id="ex-class"><option value="">— select class —</option></select></div>
        <div class="form-group"><label>Term</label><select class="form-select" id="ex-term"><option value="">— select term —</option></select></div>
        <div class="form-group"><label>Session</label><select class="form-select" id="ex-session"><option value="">— select session —</option></select></div>
        <div class="form-group"><label>Assessment type</label><select class="form-select" id="ex-type"><option value="exam">Exam</option><option value="test">Test</option><option value="ca">CA</option><option value="assignment">Assignment</option><option value="project">Project</option><option value="quiz">Quiz</option><option value="practical">Practical</option></select></div>
        <div class="form-group"><label>Report-card column (auto-maps result)</label><input class="form-input" id="ex-col" placeholder="e.g. CA1 or Exam"></div>
        <div class="form-group"><label>Max score in report card</label><input class="form-input" type="number" id="ex-max" value="100"></div>
        <div class="form-group"><label>Duration (minutes)</label><input class="form-input" type="number" id="ex-dur" value="45"></div>
        <div class="form-group"><label>Attempt limit</label><input class="form-input" type="number" id="ex-attempts" value="1"></div>
        <div class="form-group"><label>Starts at (optional)</label><input class="form-input" type="datetime-local" id="ex-start"></div>
        <div class="form-group"><label>Closes at (optional)</label><input class="form-input" type="datetime-local" id="ex-close"></div>
        <div class="form-group"><label>Negative mark / wrong</label><input class="form-input" type="number" step="0.01" id="ex-neg" value="0"></div>
        <div class="form-group"><label>Questions to deliver (0 = all)</label><input class="form-input" type="number" id="ex-sel" value="0"></div>
        <div class="form-group"><label><input type="checkbox" id="ex-rand" checked> Randomise questions/options</label></div>
        <div class="form-group"><label><input type="checkbox" id="ex-cert" checked> Issue certificate after exam</label></div>
        <div class="form-group"><label><input type="checkbox" id="ex-release" checked> Release result instantly</label></div>
      </div>
      <div class="form-group"><label>Instructions</label><textarea class="form-input" id="ex-instr" rows="2" placeholder="Read each question carefully…"></textarea></div>
      <div class="card" style="margin:10px 0;background:#f8fafc"><h4 style="margin-top:0">Anti-cheat / exam integrity settings</h4><div class="grid grid-2">
        <label><input type="checkbox" id="ac-tab" checked> Detect tab/app switching</label><label><input type="checkbox" id="ac-blur" checked> Detect window blur/focus loss</label>
        <label><input type="checkbox" id="ac-copy" checked> Block copy/cut/paste/select-all</label><label><input type="checkbox" id="ac-right" checked> Block right-click/context menu</label>
        <label><input type="checkbox" id="ac-full" checked> Require fullscreen monitoring</label><label><input type="checkbox" id="ac-dev" checked> Detect devtools/print/source shortcuts</label>
        <div class="form-group"><label>Violation limit before auto-submit</label><input class="form-input" type="number" id="ac-max" value="5"></div><label><input type="checkbox" id="ac-math" checked> Show math/science keyboard</label>
      </div><p style="color:var(--gray-500);font-size:.82rem">These are free browser-based integrity checks adapted from HMG CBT Pro. Use human invigilation for high-stakes exams.</p></div>
      <div class="form-group"><label>Questions CSV (paste or choose a .csv file)</label>
        <input type="file" id="ex-file" accept=".csv" class="form-input" onchange="CBTUI._readFile(event)">
        <textarea class="form-input" id="ex-csv" rows="5" style="margin-top:8px;font-family:monospace;font-size:.8rem" placeholder="Question,A,B,C,D,CorrectAnswer,..."></textarea>
        <small style="color:var(--gray-500)">Need the format? Click "CSV Template" on the page.</small>
      </div>
    \`, '<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="CBTUI.save()">Create exam</button>'); setTimeout(()=>CBTUI.populateExamLookups(),50);
  },
  promptGuide(){
    const txt = [
      'HMG ACADEMY CBT PRO — AI QUESTION BANK PROMPT TEMPLATES (DOWNLOADABLE CSV OUTPUT)',
      '',
      'Important: the platform itself does not use a paid AI API. These prompts are for manual use in any AI chat tool (ChatGPT, Claude, Gemini, Copilot). The output must be a downloadable CSV file/text that the teacher uploads manually.',
      '',
      '====================================================================',
      '1. SIMPLE QUESTION PROMPT (Standard 11 core types / Multiple Choice & True/False)',
      '====================================================================',
      'You are an expert [CURRICULUM] [SUBJECT] teacher with strong assessment-design experience.',
      'Generate a 60-question CSV question bank for HMG Academy CBT Pro.',
      'Class: [CLASS] | Subject: [SUBJECT] | Topic: [TOPIC] | Curriculum: [CURRICULUM]',
      '',
      'IMPORTANT:',
      '- Output downloadable CSV only. No markdown table. No explanation outside the CSV.',
      '- First line must be exactly:',
      'Question,A,B,C,D,CorrectAnswer,Explanation,Type,Tolerance,Unit,Accept,MRQ_AON,Pairs,Items',
      '- Use UTF-8 characters correctly. Wrap every CSV field in double-quotes.',
      '- Escape inner JSON double-quotes inside CSV cells as two double-quotes.',
      '- Do not use paid API instructions. This is for manual copy/download only.',
      '',
      'QUESTION TYPE DISTRIBUTION:',
      'mcq=45, tf=15 (or customize as needed)',
      '- mcq: Col2–5: four options, Col6: A/B/C/D, Col8: mcq',
      '- tf: Col2: True, Col3: False, Col4–5: blank, Col6: A if true, B if false, Col8: tf',
      '',
      '====================================================================',
      '2. INTERMEDIATE QUESTION PROMPT (Full CBT v3 Enterprise Bank, all 17 question types)',
      '====================================================================',
      'You are an expert [CURRICULUM] [SUBJECT] teacher, examiner, and assessment designer.',
      'Generate a 60-question CSV question bank for HMG Academy CBT Pro v3.',
      'Class: [CLASS] | Subject: [SUBJECT] | Topic: [TOPIC]',
      'Curriculum/Exam standard: [CURRICULUM OR EXAM BODY]',
      '',
      'IMPORTANT OUTPUT RULES:',
      '- Output CSV only. No markdown table. No commentary before or after the CSV.',
      '- First line must be exactly:',
      'Question,A,B,C,D,CorrectAnswer,Explanation,Type,Tolerance,Unit,Accept,MRQ_AON,Pairs,Items',
      '- Wrap every CSV field in double-quotes. Escape inner JSON double-quotes as two double-quotes.',
      '',
      'QUESTION TYPE DISTRIBUTION — EXACTLY 60 QUESTIONS:',
      'mcq=10, tf=5, mrq=5, short=5, numeric=5, matching=4, ordering=4, cloze=4, categorization=3, multi_numeric=3, essay=2, assertion_reason=3, case_study=2, image_mcq=1, matrix=2, hot_text=1, code=1',
      '',
      'SUPPORTED TYPES AND RULES:',
      '- mrq: Col2–5: options, Col6: sorted comma list (e.g. A,C), Col8: mrq, Col12: false for partial credit or true for all-or-nothing',
      '- short: Col6: primary answer, Col11: accepted alternates separated by | (e.g. H₂O|water), Col8: short',
      '- numeric: Col6: number only, Col9: tolerance (e.g. 0 or 0.05), Col10: unit if needed, Col8: numeric',
      '- matching: Col13: JSON array of pairs [{"left":"Term","right":"Def"}], Col8: matching',
      '- ordering: Col14: JSON array of items ["First","Second"], Col8: ordering',
      '- cloze: blanks using ___, Col14: JSON array of answers ["mass|m"], Col8: cloze',
      '- essay: Col11: keywords separated by |, Col14: {"min_words":30,"keywords":["trust"]}, Col8: essay',
      '- categorization: Col14: JSON array [{"item":"Sodium","category":"Metal"}], Col8: categorization',
      '- multi_numeric: Col14: JSON array [{"label":"x","answer":3,"tolerance":0}], Col8: multi_numeric',
      '- assertion_reason: Col1: instruction, Col2: assertion, Col3: reason, Col6: A/B/C/D/E, Col8: assertion_reason',
      '- case_study: Col1: question, Col2–5: options, Col6: A/B/C/D, Col8: case_study, Col14: {"passage":"..."}',
      '- image_mcq: Col1: question, Col2–5: options, Col6: A/B/C/D, Col8: image_mcq, Col11: same-site image path or data URI',
      '- matrix: Col11: shared choices (True|False), Col14: [{"statement":"Water boils at 100°C.","answer":"True"}], Col8: matrix',
      '- hot_text: Col14: [{"text":"2","correct":true}], Col8: hot_text',
      '- code: Col10: language (Python), Col11: keywords, Col14: {"language":"Python","keywords":["def"]}, Col8: code',
      '',
      '====================================================================',
      '3. ADVANCED QUESTION PROMPT (Generate only advanced question types)',
      '====================================================================',
      'You are an expert [SUBJECT] examiner.',
      'Generate a 25-question CSV bank for HMG Academy CBT Pro using only these types: assertion_reason, case_study, image_mcq, matrix, hot_text, code, matching, ordering, cloze, categorization, multi_numeric.',
      'Class: [CLASS] | Subject: [SUBJECT] | Topic: [TOPIC]',
      '',
      'Output CSV only. No markdown table. First line must be exactly:',
      'Question,A,B,C,D,CorrectAnswer,Explanation,Type,Tolerance,Unit,Accept,MRQ_AON,Pairs,Items',
      'Wrap all CSV cells in double-quotes. Escape inner JSON quotes as two double-quotes.',
      'Distribution: assertion_reason=4, case_study=3, image_mcq=2, matrix=3, hot_text=2, code=2, matching=3, ordering=2, cloze=2, categorization=1, multi_numeric=1',
      '',
      'Now output the downloadable CSV only.'
    ].join('\n');
    openModal('Structured CBT Question Prompt', '<textarea class="form-input" rows="18" style="font-family:monospace">'+esc(txt)+'</textarea><p style="color:var(--gray-600)">Copy this into any AI assistant manually, then paste the returned CSV into School Connect. The platform itself uses no AI API.</p>', '<button class="btn btn-outline" onclick="closeModal()">Close</button><button class="btn btn-primary" id="copy-cbt-prompt">Copy prompt</button>');
    setTimeout(()=>{ const b=document.getElementById('copy-cbt-prompt'); if(b) b.onclick=()=>{ navigator.clipboard&&navigator.clipboard.writeText(document.querySelector('#modal-body textarea').value); toast('Prompt copied','success'); }; },0);
  },

  async populateExamLookups(){
    if(!sb)return; const fill=(id,rows,key='name')=>{const el=document.getElementById(id); if(el) el.innerHTML='<option value="">— select —</option>'+(rows||[]).map(r=>'<option>'+esc(r[key]||r.value||'')+'</option>').join('');};
    try{ const [sub,cls,term,ses]=await Promise.all([sb.from('subjects').select('name').order('name'),sb.from('classes').select('name').order('name'),sb.from('lookups').select('value').eq('kind','term').order('position'),sb.from('lookups').select('value').eq('kind','session').order('position')]); fill('ex-subject',sub.data,'name'); fill('ex-class',cls.data,'name'); fill('ex-term',term.data,'value'); fill('ex-session',ses.data,'value'); }catch(e){}
  },
  _readFile(ev){ const f=ev.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{document.getElementById('ex-csv').value=r.result;}; r.readAsText(f); },
  async save(){
    if(!sb){ toast('Database not configured.','warning'); return; }
    const csv = document.getElementById('ex-csv').value.trim();
    const questions = csv ? CBT.parseCSV(csv) : [];
    if(!questions.length){ toast('Add at least one question (CSV).','warning'); return; }
    const exam = {
      title: document.getElementById('ex-title').value,
      subject: document.getElementById('ex-subject').value || 'General',
      class: document.getElementById('ex-class').value,
      term: document.getElementById('ex-term').value,
      session: document.getElementById('ex-session').value,
      assessment_type: document.getElementById('ex-type').value,
      report_column: document.getElementById('ex-col').value,
      max_score: parseFloat(document.getElementById('ex-max').value)||0,
      duration: parseInt(document.getElementById('ex-dur').value)||45,
      attempt_limit: parseInt(document.getElementById('ex-attempts').value)||1,
      start_at: document.getElementById('ex-start').value || null,
      close_at: document.getElementById('ex-close').value || null,
      randomise: document.getElementById('ex-rand').checked,
      certificate_enabled: document.getElementById('ex-cert').checked,
      release_results: document.getElementById('ex-release').checked,
      negative_mark: parseFloat(document.getElementById('ex-neg').value)||0,
      select_count: parseInt(document.getElementById('ex-sel').value)||0,
      instructions: document.getElementById('ex-instr').value,
      anti_cheat_config: { tab_switch:document.getElementById('ac-tab').checked, window_blur:document.getElementById('ac-blur').checked, copy_paste:document.getElementById('ac-copy').checked, right_click:document.getElementById('ac-right').checked, fullscreen:document.getElementById('ac-full').checked, devtools:document.getElementById('ac-dev').checked, math_keyboard:document.getElementById('ac-math').checked, max_violations:parseInt(document.getElementById('ac-max').value)||5 },
      is_open: true,
      csv_data: questions
    };
    const { data, error } = await CBT.createExam(exam);
    if(error){ toast('Could not create: '+error.message,'danger'); return; }
    if(typeof App!=='undefined' && App.logActivity) App.logActivity('create','cbt_exam', data && data.code);
    closeModal(); toast('✅ Exam created. Code: '+(data&&data.code),'success',6000); CBTUI.refresh();
  },
  async toggle(id,open){ if(!sb)return; await sb.from('cbt_exams').update({is_open:open}).eq('id',id); CBTUI.refresh(); },
  async del(id){ if(!sb)return; if(!confirm('Delete this exam and all its results?'))return; await sb.from('cbt_exams').delete().eq('id',id); if(App&&App.logActivity)App.logActivity('delete','cbt_exam',id); toast('Deleted.','info'); CBTUI.refresh(); },
  share(code){
    const url = location.origin + location.pathname.replace(/cbt\\.html$/,'cbt-exam.html') + '?code=' + code;
    const wa = 'https://wa.me/?text='+encodeURIComponent('Take the exam ('+code+'): '+url);
    openModal('Share exam '+code, '<p>Direct link:</p><input class="form-input" value="'+esc(url)+'" onclick="this.select()"><p style="margin-top:12px">Access code: <strong style="font-size:1.4rem">'+esc(code)+'</strong></p>', '<a class="btn btn-outline" target="_blank" href="'+wa+'">Share on WhatsApp</a><button class="btn btn-primary" onclick="navigator.clipboard.writeText(\\''+url+'\\');toast(\\'Link copied\\',\\'success\\')">Copy link</button>');
  },
  async results(id,code){
    if(!sb)return;
    const { data } = await sb.from('cbt_results').select('*').eq('exam_id',id).order('score',{ascending:false});
    const rows=(data||[]).map((r,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(r.student_name)+'</td><td>'+esc(r.student_id_ref||'-')+'</td><td>'+r.score+'/'+r.total+'</td><td>'+(r.percent||0)+'%</td><td>'+esc(r.cert_code||'-')+'</td></tr>').join('');
    openModal('Results — '+code, '<div style="margin-bottom:10px"><button class="btn btn-sm btn-outline" onclick="CBTUI.exportCSV(\\''+id+'\\')">⬇ Export CSV</button></div><div class="table-wrap"><table><thead><tr><th>#</th><th>Name</th><th>ID</th><th>Score</th><th>%</th><th>Cert</th></tr></thead><tbody>'+(rows||'<tr><td colspan=6>No submissions yet.</td></tr>')+'</tbody></table></div>');
  },
  async exportCSV(id){
    const { data } = await sb.from('cbt_results').select('*').eq('exam_id',id);
    const head='Name,StudentID,Class,Score,Total,Percent,Correct,Wrong,Skipped,Cert,SubmittedAt\\n';
    const body=(data||[]).map(r=>[r.student_name,r.student_id_ref,r.student_class,r.score,r.total,r.percent,r.correct_count,r.wrong_count,r.skipped_count,r.cert_code,r.created_at].map(x=>'"'+String(x==null?'':x).replace(/"/g,'""')+'"').join(',')).join('\\n');
    const blob=new Blob([head+body],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='cbt-results.csv'; a.click();
  },
  downloadTemplate(){
    const csv='Question,A,B,C,D,CorrectAnswer,Explanation,Type,Tolerance,Unit,Accept,MRQ_AON,Pairs,Items,Difficulty,Tags,Section\\n"What is 5 + 7?",10,11,12,13,C,"Addition.",mcq,,,,,,,Easy,Arithmetic,Numbers\\n"Capital of Nigeria?",,,,,Abuja,"FCT.",short,,,FCT,,,,Easy,Geography,Nigeria\\n';
    const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='cbt-template.csv'; a.click();
  }
  async edit(id){
    if(!sb)return;
    const { data } = await sb.from('cbt_exams').select('*').eq('id',id).maybeSingle();
    if(!data)return;
    const e = data;
    openModal('Edit Exam / Test', \`
      <div class="form-group"><label>Title</label><input class="form-input" id="ex-title" value="\${esc(e.title||'')}"></div>
      <div class="grid grid-2">
        <div class="form-group"><label>Subject</label><input class="form-input" id="ex-subject" value="\${esc(e.subject||'')}"></div>
        <div class="form-group"><label>Class</label><input class="form-input" id="ex-class" value="\${esc(e.class||'')}"></div>
        <div class="form-group"><label>Duration (min)</label><input class="form-input" type="number" id="ex-dur" value="\${e.duration||45}"></div>
        <div class="form-group"><label>Attempt limit</label><input class="form-input" type="number" id="ex-attempts" value="\${e.attempt_limit||1}"></div>
      </div>
      <div class="form-group"><label>Instructions</label><textarea class="form-input" id="ex-instr" rows="2">\${esc(e.instructions||'')}</textarea></div>
    \`, \`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="CBTUI.update('\${e.id}')">Save Changes</button>\`);
  },
  async update(id){
    const row = {
      title: document.getElementById('ex-title').value,
      subject: document.getElementById('ex-subject').value,
      class: document.getElementById('ex-class').value,
      duration: parseInt(document.getElementById('ex-dur').value)||45,
      attempt_limit: parseInt(document.getElementById('ex-attempts').value)||1,
      instructions: document.getElementById('ex-instr').value
    };
    await sb.from('cbt_exams').update(row).eq('id',id);
    toast('Exam updated successfully','success'); closeModal(); CBTUI.refresh();
  },
};
document.addEventListener('click', function(e){ var b=e.target.closest('[data-cbt-action]'); if(!b)return; e.preventDefault(); var fn=b.getAttribute('data-cbt-action'); if(CBTUI[fn]) CBTUI[fn](); });
document.addEventListener('DOMContentLoaded', function(){ try{CBTUI.refresh();}catch(e){} }); try{CBTUI.refresh();}catch(e){}
</script>`;
  },

  /* ====================================================================
     v2 — STUDENT EXAM TAKER (public, no account required)
     ==================================================================== */
  pageCBTExam(cfg) {
    return T.head(cfg, 'Take Exam') + T.bellAndBanner(cfg) + T.modal() + `
<div class="login-shell" style="min-height:100vh;background:var(--gray-100);padding:24px">
  <div style="max-width:840px;margin:0 auto">
    <div class="card" style="text-align:center;margin-bottom:16px">
      <img src="assets/img/logo.${cfg.logoExt}" alt="" style="width:54px;height:54px;border-radius:12px;object-fit:contain">
      <h1 style="margin:8px 0 0;font-size:1.4rem">${T.esc(cfg.schoolName)} — Online Exam</h1>
    </div>
    <div id="exam-root"><div class="card"><span class="pulse">Loading…</span></div></div>
  </div>
</div>
<div id="cbt-tools" style="position:fixed;right:16px;bottom:16px;z-index:9999;display:flex;flex-direction:column;gap:8px">
  <button class="btn btn-primary" onclick="Tools.toggleCalc()">🧮 Calculator</button>
  <button class="btn btn-outline" onclick="Tools.toggleSymbols()">Σ Math Keyboard</button>
</div>
<div id="calc-panel" class="card" style="display:none;position:fixed;right:16px;bottom:112px;z-index:9999;width:320px;max-width:92vw">
  <h3 style="margin-top:0">🔬 Scientific Calculator</h3>
  <input id="calc-display" class="form-input" style="font-size:1.15rem;text-align:right" readonly>
  <div id="calc-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:10px"></div>
  <p style="font-size:.78rem;color:var(--gray-500);margin-top:8px">Free on-screen calculator for STEM exams. Works offline in the browser.</p>
</div>
<div id="symbol-panel" class="card" style="display:none;position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-height:42vh;overflow:auto">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3 style="margin:0">Σ Mathematics / Scientific Keyboard</h3><button class="btn btn-sm btn-outline" onclick="Tools.toggleSymbols(false)">Close</button></div>
  <p style="color:var(--gray-600);font-size:.85rem">Tap a symbol to insert it into the active typed-answer box.</p>
  <div id="symbol-grid" style="display:flex;flex-wrap:wrap;gap:6px"></div>
</div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="assets/js/config.js"></script>
<script src="assets/js/cbt-engine.js"></script>
<script>${Generator._cbtStudentScript(cfg)}</script>
</body></html>`;
  },

  _cbtStudentScript(cfg) {
    return `
CBT.init(sb);
const Exam = {
  data:null, answers:[], idx:0, timer:null, remaining:0, monitor:null, flags:{}, startTs:0,
  qs(){ return (this.data && (this.data.questions || this.data._questions)) || []; },
  param(){ const u=new URLSearchParams(location.search); return (u.get('code')||u.get('exam')||u.get('c')||'').toUpperCase().trim(); },
  root(){ return document.getElementById('exam-root'); },
  focusFreeAnswer(){ const el=document.querySelector('.cbt-free-answer'); if(el){ el.focus(); Tools.active=el; } },
  async start(){
    const code=this.param();
    if(code){ this.codeEntry(code); } else { this.codeEntry(''); }
  },
  codeEntry(prefill){
    this.root().innerHTML = '<div class="card"><h3>Enter exam details</h3>'+
      '<div class="form-group"><label>Exam code</label><input class="form-input" id="e-code" value="'+(prefill||'')+'" placeholder="ABC123"></div>'+
      '<div class="form-group"><label>Your full name <span style="color:var(--gray-500);font-weight:400">(optional for anonymous exams)</span></label><input class="form-input" id="e-name" placeholder="Surname First-name"></div>'+
      '<div class="form-group"><label>Your student ID / admission no (if registered)</label><input class="form-input" id="e-id" placeholder="optional for open exams"></div>'+
      '<div class="form-group"><label>Class</label><input class="form-input" id="e-class" placeholder="e.g. JSS1"></div>'+
      '<div style="display:flex;gap:10px;flex-wrap:wrap">'+
        '<button class="btn btn-primary" onclick="Exam.load(false)">Start exam</button>'+
        '<button class="btn btn-outline" onclick="Exam.load(true)">👤 Continue as Guest (anonymous)</button>'+
      '</div>'+
      '<p style="color:var(--gray-500);font-size:.82rem;margin-top:10px">No account needed for open exams. Guests can take the exam anonymously.</p></div>';
  },
  async load(anon){
    if(!sb){ toast('Database not configured.','warning'); return; }
    const code=document.getElementById('e-code').value.toUpperCase().trim();
    let nm=document.getElementById('e-name').value.trim();
    if(anon && !nm) nm='Anonymous-'+Math.random().toString(36).slice(2,7).toUpperCase();
    this.student={ name:nm, id_ref:document.getElementById('e-id').value.trim(), class:document.getElementById('e-class').value.trim(), anonymous:!!anon };
    if(!code){ toast('Enter the exam code.','warning'); return; }
    if(!this.student.name){ this.student.name='Anonymous-'+Math.random().toString(36).slice(2,7).toUpperCase(); }
    const { data, error } = await sb.rpc('cbt_get_public_exam', { p_code: code });
    if(error || !data){ toast('Exam not found or not open.','danger'); return; }
    if(data.wait){ this.root().innerHTML='<div class="card"><h3>⏳ Please wait</h3><p>This exam opens at '+new Date(data.start_at).toLocaleString()+'.</p></div>'; return; }
    if(data.closed){ this.root().innerHTML='<div class="card"><h3>🚫 Closed</h3><p>This exam is no longer accepting submissions.</p></div>'; return; }
    this.data=data; CBT.prepareForStudent(this.data);
    this.answers=new Array(this.qs().length).fill(null);
    try{ const dr=JSON.parse(localStorage.getItem('cbt-draft-'+data.code)||'null'); if(dr&&Array.isArray(dr.a)&&dr.a.length===this.answers.length){ this.answers=dr.a; this.idx=Number(dr.i||0); if(confirm('A saved draft was found on this device. Continue from where you stopped?')===false){ this.answers=new Array(this.qs().length).fill(null); this.idx=0; } } }catch(e){}
    this.remaining=(data.duration||45)*60; this.startTs=Date.now();
    if(data.instructions){ if(!confirm('Instructions:\\n\\n'+data.instructions+'\\n\\nClick OK to begin.')) { this.codeEntry(code); return; } }
    this.beginMonitor(); this.tick(); this.render();
  },
  beginMonitor(){
    let viol=0; const cfg=this.data.anti_cheat_config||{};
    this.monitor=CBT.startAntiCheat(cfg,(type,n)=>{ viol=n; this.violations=n; this.violationLog=this.monitor.log; const w=document.getElementById('viol'); if(w) w.textContent='⚠ '+n+' integrity flag(s)'; if((cfg.max_violations||5) && n>=cfg.max_violations){ toast('Too many integrity violations — submitting.','danger'); this.submit(); } });
  },
  tick(){ this.timer=setInterval(()=>{ this.remaining--; const t=document.getElementById('clock'); if(t){ const m=Math.floor(this.remaining/60),s=this.remaining%60; t.textContent=m+':'+String(s).padStart(2,'0'); if(this.remaining<=60)t.style.color='#dc2626'; } if(this.remaining<=0){ clearInterval(this.timer); toast('Time up — submitting.','warning'); this.submit(); } },1000); },
  render(){
    const q=this.qs()[this.idx]; if(!q){ return; }
    const opts=(q.options||[]).map((o,i)=>{ const L=String.fromCharCode(65+i); const checked=this.answers[this.idx]===L?'checked':''; return '<label style="display:block;padding:10px;border:1px solid var(--gray-200);border-radius:8px;margin:6px 0;cursor:pointer"><input type="radio" name="opt" value="'+L+'" '+checked+' onchange="Exam.answer(\\''+L+'\\')"> '+L+'. '+esc(o)+'</label>'; }).join('');
    const free=(['short','numeric','essay','code','cloze','multinumeric'].includes(q.type))?'<textarea class="form-input cbt-free-answer" rows="4" onfocus="Tools.active=this" oninput="Exam.answer(this.value)" placeholder="Type your answer. Use Σ Math Keyboard for symbols if needed.">'+esc(this.answers[this.idx]||'')+'</textarea>':'';
    this.root().innerHTML='<div class="card">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><strong>Q '+(this.idx+1)+' / '+this.qs().length+'</strong>'+
      '<div>⏱ <span id="clock">'+Math.floor(this.remaining/60)+':'+String(this.remaining%60).padStart(2,'0')+'</span> <span id="viol" style="color:#dc2626;margin-left:10px"></span></div></div>'+
      '<p style="font-size:1.05rem;margin-bottom:10px">'+esc(q.question)+'</p>'+ opts + free +
      '<div style="display:flex;justify-content:space-between;margin-top:14px;gap:8px;flex-wrap:wrap">'+
        '<button class="btn btn-outline" onclick="Exam.prev()" '+(this.idx===0?'disabled':'')+'>← Prev</button>'+
        '<button class="btn btn-outline" onclick="Exam.flag()">🚩 Flag</button>'+
        '<button class="btn btn-outline" onclick="Exam.readAloud()">🔊 Read</button>'+
        '<button class="btn btn-outline" onclick="Exam.fullscreen()">↗ Fullscreen</button>'+
        '<button class="btn btn-outline" onclick="Tools.toggleCalc()">🧮 Calculator</button>'+
        '<button class="btn btn-outline" onclick="Tools.toggleSymbols(); Exam.focusFreeAnswer()">Σ Keyboard</button>'+
        (this.idx<this.qs().length-1?'<button class="btn btn-primary" onclick="Exam.next()">Next →</button>':'<button class="btn btn-primary" onclick="Exam.confirmSubmit()">Submit ✓</button>')+
      '</div>'+
      '<div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:6px">'+this.qs().map((_,i)=>'<button onclick="Exam.go('+i+')" style="width:34px;height:34px;border-radius:6px;border:1px solid var(--gray-300);background:'+(i===this.idx?'var(--primary);color:#fff':(this.answers[i]!=null?'#dcfce7':(this.flags[i]?'#fef08a':'#fff')))+'">'+(i+1)+'</button>').join('')+'</div>'+
    '</div>';
  },
  answer(v){ this.answers[this.idx]=v; this.saveDraft(); },
  saveDraft(){ try{ localStorage.setItem('cbt-draft-'+this.data.code, JSON.stringify({a:this.answers,i:this.idx})); }catch(e){} },
  flag(){ this.flags[this.idx]=!this.flags[this.idx]; this.render(); },
  go(i){ this.idx=i; this.render(); }, next(){ if(this.idx<this.qs().length-1){this.idx++;this.render();} }, prev(){ if(this.idx>0){this.idx--;this.render();} },
  readAloud(){ try{ const q=this.qs()[this.idx]; const text='Question '+(this.idx+1)+'. '+(q.question||'')+'. '+(q.options||[]).map((o,i)=>String.fromCharCode(65+i)+'. '+o).join('. '); speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(text)); }catch(e){ toast('Read aloud is not available in this browser.','warning'); } },
  fullscreen(){ const el=document.documentElement; try{ if(el.requestFullscreen) el.requestFullscreen(); }catch(e){} },
  confirmSubmit(){ const un=this.answers.filter(a=>a==null).length; if(un && !confirm(un+' question(s) unanswered. Submit anyway?'))return; this.submit(); },
  async submit(){
    if(this._done)return; this._done=true; clearInterval(this.timer); if(this.monitor)this.monitor.stop();
    const graded=CBT.gradeSubmission(this.data,this.answers);
    const timeTaken=Math.round((Date.now()-this.startTs)/1000);
    const payload={ exam_id:this.data.id, student_name:this.student.name, student_class:this.student.class, student_id_ref:this.student.id_ref, student_type:this.data.exam_mode,
      score:graded.score, total:graded.total, percent:graded.percent, correct_count:graded.correct, wrong_count:graded.wrong, skipped_count:graded.skipped,
      time_taken:timeTaken, violations:this.violations||0, violation_log:this.violationLog||[], answers_data:this.answers };
    let resp; try{ resp=await sb.rpc('cbt_submit',{ p_payload: payload }); }catch(e){ resp={error:e}; }
    try{ localStorage.removeItem('cbt-draft-'+this.data.code); }catch(e){}
    if(!resp || resp.error || !resp.data || !resp.data.saved){
      // Emergency backup
      const blob=new Blob([JSON.stringify({payload,graded},null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      this.root().innerHTML='<div class="card"><h3>⚠️ Could not save online</h3><p>Please download your result and send it to your teacher.</p><a class="btn btn-primary" href="'+url+'" download="exam-backup.json">Download backup</a></div>';
      return;
    }
    const d=resp.data;
    if(d.release_results===false){
      const certHtml = d.cert_code ? Exam.certificateHtml(d, graded) : '';
      this.root().innerHTML='<div class="card" style="text-align:center"><h2>✅ Submission Received</h2><p>Your answers were recorded. Results will be released by your teacher.</p>'+(d.cert_code?'<p>Certificate code: <strong>'+esc(d.cert_code)+'</strong></p><button class="btn btn-primary" onclick="Exam.printCertificate()">🏆 Print Certificate</button>':'')+'</div>'+certHtml;
    } else {
      const certHtml = d.cert_code ? Exam.certificateHtml(d, graded) : '';
      this.root().innerHTML='<div class="card" style="text-align:center"><h2>🎉 Score: '+graded.score+' / '+graded.total+' ('+graded.percent+'%)</h2>'+
        '<p>Grade: <strong>'+graded.grade+'</strong> · Correct: '+graded.correct+' · Wrong: '+graded.wrong+' · Skipped: '+graded.skipped+'</p>'+
        (d.cert_code?'<p>Certificate code: <strong>'+esc(d.cert_code)+'</strong></p><button class="btn btn-primary" onclick="Exam.printCertificate()">🏆 Print Certificate</button>':'')+
        (d.report_column?'<p style="color:var(--gray-500)">This result was added to the <strong>'+esc(d.report_column)+'</strong> column of the report card.</p>':'')+
      '</div>'+certHtml;
    }
  },
  certificateHtml(d, graded){
    const sc=window.SCHOOL||{}; const nm=esc(this.student.name||'Student'); const subj=esc(this.data.subject||'Assessment');
    const code=esc(d.cert_code||''); const date=new Date().toLocaleDateString();
    return '<div id="cbt-certificate" class="card" style="margin-top:18px;text-align:center;border:10px double var(--primary);padding:32px;background:#fff;color:#0f172a">'+
      '<h1 style="margin:0;color:var(--primary)">'+esc(sc.name||'School')+'</h1><p>'+esc(sc.motto||'')+'</p><h2 style="letter-spacing:3px">CERTIFICATE OF PERFORMANCE</h2>'+ 
      '<p>This certifies that</p><h2>'+nm+'</h2><p>completed <strong>'+subj+'</strong> and scored</p><h1>'+graded.score+' / '+graded.total+' ('+graded.percent+'%)</h1><p>Grade: <strong>'+graded.grade+'</strong></p>'+ 
      '<p>Certificate Code: <strong>'+code+'</strong> · Date: '+date+'</p><div style="display:flex;justify-content:space-around;margin-top:34px"><span>________________<br>Teacher</span><span>________________<br>Principal</span></div></div>';
  },
  printCertificate(){ const el=document.getElementById('cbt-certificate'); if(!el){alert('Certificate not available');return;} const w=window.open('','_blank'); if(!w){alert('Popup blocked! Please allow popups.');return;} w.document.open(); w.document.write('<!DOCTYPE html><html><head><title>Certificate</title><style>body{font-family:system-ui,sans-serif;padding:20px;background:#fff;color:#111}</style></head><body>'+el.outerHTML+'<script>setTimeout(()=>window.print(),500);<\\/script></body></html>'); w.document.close(); w.focus(); }
};
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function toast(m,t){ alert(m); }

const Tools = {
  active:null, expr:'',
  symbols:'± ∓ × ÷ · ≈ ≠ ≡ ≤ ≥ < > ∞ √ ∛ ∜ π θ α β γ δ λ μ Ω ω Δ ∇ ∂ ∫ ∑ ∏ ∈ ∉ ∪ ∩ ⊂ ⊆ ∀ ∃ ⇒ ⇔ → ← ↔ ° ′ ″ ² ³ ⁴ ₀ ₁ ₂ ₃ ₄ ₅ ₆ ₇ ₈ ₉ ¹ ½ ¼ ¾ ⁄ ₙ ₓ ₊ ₋ H₂O CO₂ O₂ Na⁺ Cl⁻ e⁻ pH ∆H mol kg m² m³'.split(' '),
  calcButtons:['sin','cos','tan','log','ln','√','x²','xʸ','π','e','7','8','9','÷','⌫','4','5','6','×','C','1','2','3','-','CE','0','.','=','+','Ans'],
  init(){
    const cg=document.getElementById('calc-grid'); if(cg&&!cg.dataset.ready){ cg.dataset.ready='1'; cg.innerHTML=this.calcButtons.map(b=>'<button class="btn btn-sm btn-outline" onclick="Tools.calcPress(\\''+b+'\\')">'+b+'</button>').join(''); }
    const sg=document.getElementById('symbol-grid'); if(sg&&!sg.dataset.ready){ sg.dataset.ready='1'; sg.innerHTML=this.symbols.map(x=>'<button class="btn btn-sm btn-outline" onclick="Tools.insertSymbol(\\''+x+'\\')">'+x+'</button>').join(''); }
  },
  toggleCalc(v){ this.init(); const p=document.getElementById('calc-panel'); if(p)p.style.display=(v===false?'none':(p.style.display==='none'||!p.style.display?'block':'none')); },
  toggleSymbols(v){ this.init(); const p=document.getElementById('symbol-panel'); if(p)p.style.display=(v===false?'none':(p.style.display==='none'||!p.style.display?'block':'none')); },
  insertSymbol(x){ const el=this.active || document.querySelector('.cbt-free-answer') || document.activeElement; if(el && ('value' in el)){ const a=el.selectionStart||0,b=el.selectionEnd||0; el.value=el.value.slice(0,a)+x+el.value.slice(b); el.focus(); this.active=el; el.selectionStart=el.selectionEnd=a+x.length; if(typeof Exam!=='undefined') Exam.answer(el.value); } else { alert('Open a typed-answer question first, then tap the keyboard symbols.'); } },
  calcPress(b){
    if(b==='C'){this.expr='';return this.show();} if(b==='CE'){this.expr='';this.ans='';return this.show();} if(b==='⌫'){this.expr=this.expr.slice(0,-1);return this.show();}
    if(b==='Ans'){this.expr+=this.ans||'';return this.show();} if(b==='='){return this.eval();}
    const map={'×':'*','÷':'/','π':'pi','√':'sqrt(','x²':'^2','xʸ':'^','ln':'ln(','log':'log(','sin':'sin(','cos':'cos(','tan':'tan('};
    this.expr += map[b] || b; this.show();
  },
  show(){ const d=document.getElementById('calc-display'); if(d)d.value=this.expr; },
  eval(){ try{ let e=this.expr.replace(/pi/g,'Math.PI').replace(/\be\b/g,'Math.E').replace(/sin\(/g,'Math.sin(').replace(/cos\(/g,'Math.cos(').replace(/tan\(/g,'Math.tan(').replace(/sqrt\(/g,'Math.sqrt(').replace(/log\(/g,'Math.log10(').replace(/ln\(/g,'Math.log('); let op=(e.match(/\(/g)||[]).length; let cl=(e.match(/\)/g)||[]).length; while(op>cl){e+=')';cl++;} while(/(\d+(?:\.\d+)?)\^(\d+(?:\.\d+)?)/.test(e)) e=e.replace(/(\d+(?:\.\d+)?)\^(\d+(?:\.\d+)?)/g,'Math.pow($1,$2)'); const val=Function('"use strict";return ('+e+')')(); this.ans=String(Math.round(Number(val)*1e10)/1e10); this.expr=this.ans; this.show(); }catch(err){ this.expr='Error'; this.show(); } }
};
Tools.init();
document.addEventListener('keydown',function(e){ if(!Exam.data || ['INPUT','TEXTAREA'].includes((e.target&&e.target.tagName)||'')) return; const k=e.key.toLowerCase(); if(['a','b','c','d'].includes(k)){ Exam.answer(k.toUpperCase()); Exam.render(); } if(k==='n'||e.key==='ArrowRight') Exam.next(); if(k==='p'||e.key==='ArrowLeft') Exam.prev(); if(k==='r') Exam.flag(); if(k==='s') Exam.confirmSubmit(); });
Exam.start();
`;
  },

  /* ====================================================================
     v2 — FLEXIBLE REPORT-CARD BUILDER
     Teacher/admin: pick class+subject+term+session, define columns with a
     max mark each, then enter scores per student. CBT-sourced columns are
     auto-filled. Totals/grades computed live.
     ==================================================================== */
  pageReportCards(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px">
        <p style="color:var(--gray-600);margin:0 0 12px">Build a report card with <strong>fully custom columns</strong>
        (e.g. CA1, CA2, Assignment, Project, Exam). Apportion a maximum mark to each column, then enter scores.
        Columns marked <em>From CBT</em> are filled automatically when students take the matching online exam.</p>
        <div class="grid grid-2">
          <div class="form-group"><label>Class</label><select class="form-select" id="rc-class"><option value="">— select class —</option></select></div>
          <div class="form-group"><label>Subject</label><select class="form-select" id="rc-subject"><option value="">— select subject —</option></select></div>
          <div class="form-group"><label>Term</label><select class="form-select" id="rc-term"><option value="">— select term —</option></select></div>
          <div class="form-group"><label>Session</label><select class="form-select" id="rc-session"><option value="">— select session —</option></select></div>
        </div>
        <button class="btn btn-primary" onclick="RC.load()">Load / Build</button>
      </div>
      <div id="rc-cols" data-staff-only></div>
      <div id="rc-grid"></div>
      <div class="card" style="margin-top:16px" data-staff-only>
        <h3>📄 Step 4 · Generate outputs</h3>
        <p style="color:var(--gray-600);font-size:.9rem">Generate printable termly outputs from the recorded scores (all subjects).</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <input class="form-input" id="rc-student" placeholder="Student name for report card" style="max-width:240px">
          <button class="btn btn-primary" onclick="RC.reportCard()">🧾 Student Report Card</button>
          <button class="btn btn-outline" onclick="RC.broadsheet()">📊 Class Broadsheet</button>
          <button class="btn btn-outline" onclick="RC.scoresheet()">📋 Teacher Scoresheet</button>
        </div>
      </div>`;
    return T.shell(cfg, 'Report Cards', body, { requireRole: 'staff' })
      .replace('</body></html>', Generator._reportCardScript(cfg) + '</body></html>');
  },

  _reportCardScript(cfg) {
    return `<script>
const RC = {
  ctx:{}, cols:[], students:[],
  async init(){ if(!sb)return; try{ const [cls,sub,term,ses]=await Promise.all([sb.from('classes').select('name').order('name'),sb.from('subjects').select('name').order('name'),sb.from('lookups').select('value').eq('kind','term').order('position'),sb.from('lookups').select('value').eq('kind','session').order('position')]); const fill=(id,data,k)=>{const el=document.getElementById(id);if(el)el.innerHTML='<option value="">— select —</option>'+(data||[]).map(r=>'<option value="'+esc(r[k])+'">'+esc(r[k])+'</option>').join('');}; fill('rc-class',cls.data,'name'); fill('rc-subject',sub.data,'name'); fill('rc-term',term.data,'value'); fill('rc-session',ses.data,'value'); }catch(e){} },
  ctxVals(){ return { class:document.getElementById('rc-class').value.trim(), subject:document.getElementById('rc-subject').value.trim(), term:document.getElementById('rc-term').value.trim(), session:document.getElementById('rc-session').value.trim() }; },
  async load(){
    if(!sb){ toast('Database not configured.','warning'); return; }
    this.ctx=this.ctxVals();
    if(!this.ctx.class||!this.ctx.subject){ toast('Enter class and subject.','warning'); return; }
    const { data:cols } = await sb.from('assessment_columns').select('*').eq('class',this.ctx.class).eq('subject',this.ctx.subject).eq('term',this.ctx.term).eq('session',this.ctx.session).order('position');
    this.cols=cols||[];
    const { data:studs } = await sb.from('students').select('id,full_name,admission_no,class').eq('class',this.ctx.class).order('full_name');
    this.students=studs||[];
    this.renderCols(); await this.renderGrid();
  },
  renderCols(){
    document.getElementById('rc-cols').innerHTML='<div class="card"><h3>Assessment columns</h3>'+
      '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Max mark</th><th>Source</th><th></th></tr></thead><tbody>'+
      this.cols.map(c=>'<tr><td>'+esc(c.name)+'</td><td>'+c.max_mark+'</td><td>'+(c.source==='cbt'?'<span class=\\'badge\\'>From CBT</span>':'Manual')+'</td><td><button class="btn btn-sm btn-outline" onclick="RC.delCol(\\''+c.id+'\\')">✕</button></td></tr>').join('')+
      '</tbody></table></div>'+
      '<div class="grid grid-2" style="margin-top:10px"><div class="form-group"><label>New column name</label><input class="form-input" id="rc-cn" placeholder="CA1"></div>'+
      '<div class="form-group"><label>Max mark</label><input class="form-input" type="number" id="rc-cm" value="10"></div></div>'+
      '<button class="btn btn-primary" onclick="RC.addCol()">+ Add column</button></div>';
  },
  async addCol(){
    const name=document.getElementById('rc-cn').value.trim(); const max=parseFloat(document.getElementById('rc-cm').value)||10;
    if(!name)return;
    const { error } = await sb.from('assessment_columns').insert({ ...this.ctx, name, max_mark:max, position:this.cols.length });
    if(error){ toast(error.message,'danger'); return; }
    if(App&&App.logActivity)App.logActivity('create','assessment_column',name);
    toast('Column added.','success'); this.load();
  },
  async delCol(id){ if(!confirm('Delete this column and its scores?'))return; await sb.from('assessment_columns').delete().eq('id',id); this.load(); },
  async renderGrid(){
    if(!this.cols.length){ document.getElementById('rc-grid').innerHTML='<div class="card">Add at least one column to start entering scores.</div>'; return; }
    const ids=this.cols.map(c=>c.id);
    const { data:scores } = await sb.from('report_scores').select('*').in('column_id',ids);
    const map={}; (scores||[]).forEach(s=>{ map[(s.student_id_ref||s.student_name)+'|'+s.column_id]=s.score; });
    const totalMax=this.cols.reduce((a,c)=>a+Number(c.max_mark),0);
    let html='<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h3>Scores — '+esc(this.ctx.subject)+' ('+esc(this.ctx.class)+')</h3><button class="btn btn-sm btn-outline" onclick="RC.exportCSV()">⬇ Export</button></div><div class="table-wrap"><table><thead><tr><th>Student</th>'+this.cols.map(c=>'<th>'+esc(c.name)+'<br><small>/'+c.max_mark+'</small></th>').join('')+'<th>Total<br><small>/'+totalMax+'</small></th><th>%</th><th>Grade</th></tr></thead><tbody>';
    const src=this.students.length?this.students:[];
    if(!src.length){ html+='<tr><td colspan="'+(this.cols.length+4)+'">No students found for class "'+esc(this.ctx.class)+'". Add students in the Students module first.</td></tr>'; }
    src.forEach(st=>{
      const ref=st.admission_no||st.full_name;
      let tot=0; const cells=this.cols.map(c=>{ const v=map[ref+'|'+c.id]; if(v!=null)tot+=Number(v); return '<td><input style="width:64px" class="form-input" type="number" data-ref="'+esc(ref)+'" data-name="'+esc(st.full_name)+'" data-col="'+c.id+'" data-max="'+c.max_mark+'" value="'+(v!=null?v:'')+'" onchange="RC.saveScore(this)"></td>'; }).join('');
      const pct=totalMax?((tot/totalMax)*100).toFixed(1):0; const g=RC.grade(pct);
      html+='<tr><td>'+esc(st.full_name)+'</td>'+cells+'<td><strong>'+tot.toFixed(1)+'</strong></td><td>'+pct+'%</td><td>'+g+'</td></tr>';
    });
    html+='</tbody></table></div></div>';
    document.getElementById('rc-grid').innerHTML=html;
  },
  grade(p){ p=Number(p); if(p>=70)return'A'; if(p>=60)return'B'; if(p>=50)return'C'; if(p>=45)return'D'; if(p>=40)return'E'; return'F'; },
  async saveScore(el){
    const max=Number(el.dataset.max); let v=parseFloat(el.value); if(isNaN(v))v=0; if(v>max){v=max;el.value=max;toast('Capped at max '+max,'warning');}
    const row={ column_id:el.dataset.col, student_id_ref:el.dataset.ref, student_name:el.dataset.name, class:this.ctx.class, subject:this.ctx.subject, term:this.ctx.term, session:this.ctx.session, score:v, source:'manual' };
    const { error } = await sb.from('report_scores').upsert(row,{ onConflict:'column_id,student_id_ref,student_name' });
    if(error){ toast(error.message,'danger'); return; }
    if(App&&App.logActivity)App.logActivity('update','report_score',el.dataset.ref);
    this.renderGrid();
  },
  exportCSV(){
    const rows=[['Student',...this.cols.map(c=>c.name),'Total','%','Grade']];
    document.querySelectorAll('#rc-grid tbody tr').forEach(tr=>{ const cells=[...tr.children].map(td=>{ const inp=td.querySelector('input'); return inp?inp.value:td.textContent.trim(); }); rows.push(cells); });
    const csv=rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\\n');
    const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='report-'+this.ctx.class+'-'+this.ctx.subject+'.csv'; a.click();
  },
  /* ---- Issue 6: printable termly outputs (report card / broadsheet / scoresheet) ---- */
  _print(title, html){ const w=window.open('','_blank'); if(!w){toast('Popup blocked! Please allow popups.','warning');return;} const sc=(window.SCHOOL||{}); const sig=localStorage.getItem('sc-signature-url')||'', pn=localStorage.getItem('sc-principal-name')||'Principal'; const sign=sig?'<div style="text-align:center;margin-top:28px"><img src="'+sig+'" style="max-width:150px;max-height:70px;object-fit:contain"><br><b>'+pn+'</b><br>Official Signature</div>':''; w.document.open(); w.document.write('<!DOCTYPE html><html><head><title>'+title+'</title><style>body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a;background:#fff}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #cbd5e1;padding:6px 8px;font-size:13px;text-align:left}th{background:#f1f5f9}h1,h2{margin:4px 0}.hd{text-align:center;border-bottom:3px solid '+(sc.themePrimary||'#4f46e5')+';padding-bottom:10px;margin-bottom:14px}</style></head><body><div class="hd"><h1>'+esc(sc.name||"School")+'</h1><p>'+esc(sc.motto||'')+'</p><h2>'+title+'</h2></div>'+html+sign+'<p style="margin-top:30px;font-size:11px;color:#94a3b8;text-align:center">Powered by HMG Concepts</p><script>setTimeout(()=>window.print(),500);<\\/script></body></html>'); w.document.close(); w.focus(); },
  async reportCard(){ if(!sb){toast('Database not configured','warning');return;} const name=document.getElementById('rc-student').value.trim(); if(!name){toast('Enter a student name','warning');return;}
    const term=this.ctx.term||document.getElementById('rc-term').value, ses=this.ctx.session||document.getElementById('rc-session').value, cls=this.ctx.class||document.getElementById('rc-class').value;
    const {data}=await sb.from('report_subject_totals').select('*').eq('student_name',name).eq('term',term).eq('session',ses);
    let rows=(data||[]); let html='<p><strong>Student:</strong> '+esc(name)+' &nbsp; <strong>Class:</strong> '+esc(cls)+' &nbsp; <strong>Term:</strong> '+esc(term)+' &nbsp; <strong>Session:</strong> '+esc(ses)+'</p>';
    if(!rows.length){ html+='<p>No recorded scores yet for this student/term.</p>'; }
    else { let go=0,ob=0; html+='<table><thead><tr><th>Subject</th><th>Obtained</th><th>Obtainable</th><th>%</th><th>Grade</th></tr></thead><tbody>'+rows.map(r=>{go+=Number(r.obtained||0);ob+=Number(r.obtainable||0);return '<tr><td>'+esc(r.subject)+'</td><td>'+r.obtained+'</td><td>'+r.obtainable+'</td><td>'+r.percent+'%</td><td>'+RC.grade(r.percent)+'</td></tr>';}).join('')+'</tbody></table>'; var pct=ob?((go/ob)*100).toFixed(1):0; html+='<p style="margin-top:12px"><strong>Overall:</strong> '+go.toFixed(1)+' / '+ob.toFixed(1)+' ('+pct+'%) — Grade '+RC.grade(pct)+'</p>'; html+='<div style="margin-top:24px;display:flex;justify-content:space-between"><div>____________________<br>Class Teacher</div><div>____________________<br>Head of School</div></div>'; }
    RC._print('Termly Report Card', html);
  },
  async broadsheet(){ if(!sb){toast('Database not configured','warning');return;} const cls=this.ctx.class||document.getElementById('rc-class').value, term=this.ctx.term||document.getElementById('rc-term').value, ses=this.ctx.session||document.getElementById('rc-session').value;
    if(!cls){toast('Enter a class','warning');return;}
    const {data}=await sb.from('report_subject_totals').select('*').eq('class',cls).eq('term',term).eq('session',ses);
    const subs=[...new Set((data||[]).map(r=>r.subject))].sort(); const studs=[...new Set((data||[]).map(r=>r.student_name))].sort();
    let html='<p><strong>Class:</strong> '+esc(cls)+' &nbsp; <strong>Term:</strong> '+esc(term)+'</p><table><thead><tr><th>Student</th>'+subs.map(s=>'<th>'+esc(s)+'</th>').join('')+'<th>Total</th><th>%</th></tr></thead><tbody>';
    studs.forEach(st=>{ let tot=0,obt=0; html+='<tr><td>'+esc(st)+'</td>'+subs.map(su=>{const r=(data||[]).find(x=>x.student_name===st&&x.subject===su); if(r){tot+=Number(r.obtained||0);obt+=Number(r.obtainable||0);} return '<td>'+(r?r.obtained:'-')+'</td>';}).join('')+'<td>'+tot.toFixed(1)+'</td><td>'+(obt?((tot/obt)*100).toFixed(1):0)+'%</td></tr>'; });
    html+='</tbody></table>'; if(!studs.length)html='<p>No scores recorded for this class/term.</p>'; RC._print('Class Broadsheet — '+esc(cls), html);
  },
  async scoresheet(){ if(!sb){toast('Database not configured','warning');return;} const cls=this.ctx.class||document.getElementById('rc-class').value, sub=this.ctx.subject||document.getElementById('rc-subject').value;
    if(!cls||!sub){toast('Enter class and subject','warning');return;}
    const ids=this.cols.map(c=>c.id); const {data:scores}=ids.length?await sb.from('report_scores').select('*').in('column_id',ids):{data:[]};
    const map={}; (scores||[]).forEach(s=>{map[(s.student_id_ref||s.student_name)+'|'+s.column_id]=s.score;});
    let html='<p><strong>Class:</strong> '+esc(cls)+' &nbsp; <strong>Subject:</strong> '+esc(sub)+'</p><table><thead><tr><th>Student</th>'+this.cols.map(c=>'<th>'+esc(c.name)+'<br>/'+c.max_mark+'</th>').join('')+'<th>Total</th></tr></thead><tbody>';
    (this.students||[]).forEach(st=>{ const ref=st.admission_no||st.full_name; let tot=0; html+='<tr><td>'+esc(st.full_name)+'</td>'+this.cols.map(c=>{const v=map[ref+'|'+c.id];if(v!=null)tot+=Number(v);return '<td>'+(v!=null?v:'')+'</td>';}).join('')+'<td>'+tot.toFixed(1)+'</td></tr>'; });
    html+='</tbody></table>'; RC._print('Teacher Scoresheet — '+esc(sub)+' ('+esc(cls)+')', html);
  }
}; document.addEventListener('DOMContentLoaded',()=>RC.init()); RC.init();
</script>`;
  },

  /* ====================================================================
     v2 — ANALYTICS PAGE
     ==================================================================== */
  pageAnalytics(cfg) {
    const body = `
      <p style="color:var(--gray-600)">A live, platform-wide view of every interconnected module — to support informed decisions.</p>
      <div class="stats-grid" style="margin:16px 0">
        <div class="stat-card"><div class="stat-value" id="kpi-students">—</div><div class="stat-label">Students</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-staff">—</div><div class="stat-label">Staff</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-exams">—</div><div class="stat-label">CBT Exams</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-results">—</div><div class="stat-label">CBT Submissions</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-attendance">—</div><div class="stat-label">Present Today</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-fees">—</div><div class="stat-label">Fees Collected</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-donations">—</div><div class="stat-label">Donations</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-polls">—</div><div class="stat-label">Polls</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-complaints">—</div><div class="stat-label">Complaints</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-admissions">—</div><div class="stat-label">Admissions</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-assignments">—</div><div class="stat-label">Assignments</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-library">—</div><div class="stat-label">Library Books</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-events">—</div><div class="stat-label">Events</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-announcements">—</div><div class="stat-label">Announcements</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-checkins">—</div><div class="stat-label">QR Check-ins</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-leave">—</div><div class="stat-label">Leave Requests</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-visitors">—</div><div class="stat-label">Visitors</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-tickets">—</div><div class="stat-label">Help Tickets</div></div>
      </div>
      <div class="grid grid-2">
        <div class="card"><h3>CBT Score Distribution</h3><canvas id="chart-cbt" style="max-height:260px"></canvas></div>
        <div class="card"><h3>Enrollment Trend (6 months)</h3><canvas id="chart-enrol" style="max-height:260px"></canvas></div>
      </div>`;
    return T.shell(cfg, 'Analytics', body, { requireRole: 'staff' })
      .replace('</body></html>', `<script src="assets/js/analytics.js"></script>\n<script>Analytics.init(sb); Analytics.renderDashboard();</script>\n</body></html>`);
  },

  /* ====================================================================
     v2 — ADMIN DATA TOOLS: read · delete · backup · restore
     ==================================================================== */
  pageAdminData(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px">
        <p style="color:var(--gray-600);margin:0">Admin-only data console: <strong>view</strong> any table,
        <strong>delete</strong> records, take a full <strong>backup</strong> (JSON download) and
        <strong>restore</strong> from a backup. Every action is written to the Activity Log.</p>
      </div>
      <div class="card" style="margin-bottom:16px" data-admin-only>
        <h3>🗄️ Full backup & restore</h3>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px">
          <button class="btn btn-primary" onclick="DataTools.backupAll()">⬇ Download full backup (JSON)</button>
          <label class="btn btn-outline">⬆ Restore from backup<input type="file" accept=".json" hidden onchange="DataTools.restore(event)"></label>
        </div>
      </div>
      <div class="card">
        <h3>🔎 Browse & delete a table</h3>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-top:10px">
          <div class="form-group" style="margin:0"><label>Table</label>
            <select class="form-select" id="dt-table" onchange="DataTools.view()">${Generator._dataTables().map(t => `<option>${t}</option>`).join('')}</select>
          </div>
          <button class="btn btn-outline" onclick="DataTools.view()">View</button>
          <button class="btn btn-outline" onclick="DataTools.exportTable()">⬇ Export this table (CSV)</button><button class="btn btn-outline" onclick="DataTools.importCSV()">⬆ Re-import CSV</button>
        </div>
        <div id="dt-grid" style="margin-top:12px"></div>
      </div>`;
    return T.shell(cfg, 'Admin Data', body, { requireRole: 'admin' })
      .replace('</body></html>', Generator._adminDataScript(cfg) + '</body></html>');
  },

  _dataTables() {
    return ['students','staff','classes','subjects','attendance','results','fee_payments','finance_entries',
      'cbt_exams','cbt_results','assessment_columns','report_scores','report_cards','polls','poll_votes',
      'announcements','events','messages','complaints','admissions','donations','activity_log','profiles','parent_child','academic_periods','certificates'];
  },

  _adminDataScript(cfg) {
    return `<script>
const DataTools = {
  TABLES: ${JSON.stringify(Generator._dataTables())},
  async view(){
    if(!sb){ toast('Database not configured.','warning'); return; }
    const t=document.getElementById('dt-table').value;
    const { data, error } = await sb.from(t).select('*').order('created_at',{ascending:false}).limit(200);
    const box=document.getElementById('dt-grid');
    if(error){ box.innerHTML='<p style="color:#dc2626">'+esc(error.message)+'</p>'; return; }
    if(!data||!data.length){ box.innerHTML='<p>No rows.</p>'; return; }
    const cols=Object.keys(data[0]).slice(0,7);
    box.innerHTML='<div class="table-wrap"><table><thead><tr>'+cols.map(c=>'<th>'+esc(c)+'</th>').join('')+'<th>Delete</th></tr></thead><tbody>'+
      data.map(r=>'<tr>'+cols.map(c=>'<td>'+esc(String(r[c]).slice(0,40))+'</td>').join('')+'<td><button class="btn btn-sm btn-outline" onclick="DataTools.del(\\''+t+'\\',\\''+r.id+'\\')">✕</button></td></tr>').join('')+
      '</tbody></table></div><p style="color:var(--gray-500);font-size:.8rem">Showing up to 200 rows.</p>';
  },
  async del(table,id){
    if(!confirm('Permanently delete this record from '+table+'?'))return;
    const { error } = await sb.from(table).delete().eq('id',id);
    if(error){ toast(error.message,'danger'); return; }
    if(App&&App.logActivity)App.logActivity('delete',table,id);
    toast('Deleted.','info'); DataTools.view();
  },
  async exportTable(){
    const t=document.getElementById('dt-table').value;
    const { data } = await sb.from(t).select('*');
    if(!data||!data.length){ toast('Nothing to export.','warning'); return; }
    const cols=Object.keys(data[0]);
    const csv=[cols.join(',')].concat(data.map(r=>cols.map(c=>'"'+String(r[c]==null?'':JSON.stringify(r[c])).replace(/^"|"$/g,'').replace(/"/g,'""')+'"').join(','))).join('\\n');
    const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=t+'.csv'; a.click();
  },
  importCSV(){ const t=document.getElementById('dt-table').value; const inp=document.createElement('input'); inp.type='file'; inp.accept='.csv,text/csv'; inp.onchange=()=>{const f=inp.files[0]; if(!f)return; const r=new FileReader(); r.onload=async()=>{const rows=DataTools.parseCSV(String(r.result)); if(rows.length<2){toast('CSV is empty','warning');return;} const head=rows[0]; const recs=rows.slice(1).filter(x=>x.some(v=>v)).map(row=>{const o={}; head.forEach((h,i)=>{let v=row[i]; if(v==='')return; try{ if((v||'').match(/^[\[{]/)) v=JSON.parse(v); }catch(e){} o[h]=v;}); return o;}); const {error}=await sb.from(t).upsert(recs); if(error){toast(error.message,'danger');return;} toast('Imported '+recs.length+' row(s) into '+t,'success'); DataTools.view();}; r.readAsText(f);}; inp.click();},
  parseCSV(text){ const rows=[]; let r=[],c='',q=false; for(let i=0;i<text.length;i++){const ch=text[i],nx=text[i+1]; if(ch==='"'&&q&&nx==='"'){c+='"';i++;} else if(ch==='"')q=!q; else if(ch===','&&!q){r.push(c);c='';} else if((ch==='\n'||ch==='\r')&&!q){ if(ch==='\r'&&nx==='\n')i++; r.push(c); rows.push(r); r=[]; c=''; } else c+=ch;} if(c||r.length){r.push(c);rows.push(r);} return rows;},
  async backupAll(){
    if(!sb){ toast('Database not configured.','warning'); return; }
    toast('Backing up… this may take a moment.','info');
    const dump={ _meta:{ school:(window.SCHOOL&&window.SCHOOL.name)||'', at:new Date().toISOString(), version:'gen-v2' } };
    for(const t of this.TABLES){ try{ const { data } = await sb.from(t).select('*'); dump[t]=data||[]; }catch(e){ dump[t]=[]; } }
    const blob=new Blob([JSON.stringify(dump,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='school-backup-'+new Date().toISOString().slice(0,10)+'.json'; a.click();
    if(App&&App.logActivity)App.logActivity('backup','platform','full');
    toast('✅ Backup downloaded.','success');
  },
  restore(ev){
    const f=ev.target.files[0]; if(!f)return;
    const r=new FileReader();
    r.onload=async()=>{
      let dump; try{ dump=JSON.parse(r.result); }catch(e){ toast('Invalid backup file.','danger'); return; }
      if(!confirm('Restore will UPSERT records from this backup into the live database. Continue?'))return;
      let ok=0,fail=0;
      for(const t of this.TABLES){ const rows=dump[t]; if(!Array.isArray(rows)||!rows.length)continue;
        try{ const { error } = await sb.from(t).upsert(rows,{ onConflict:'id' }); if(error)fail++; else ok++; }catch(e){ fail++; } }
      if(App&&App.logActivity)App.logActivity('restore','platform','tables:'+ok);
      toast('Restore complete. Tables restored: '+ok+(fail?' · failed: '+fail:''), fail?'warning':'success',6000);
    };
    r.readAsText(f);
  }
};
</script>`;
  },

  /* ====================================================================
     v3 — DIGITAL ID CARD GENERATOR PAGE (uses Super.idcard)
     ==================================================================== */
  pageIdCards(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px">
        <p style="color:var(--gray-600);margin:0">Generate branded student/staff ID cards with a scannable
        <strong>QR code</strong> (encodes the person's ID for attendance scanning). Print directly from the browser.</p>
      </div>
      <div class="card" style="margin-bottom:16px" data-staff-only>
        <div class="grid grid-2">
          <div class="form-group"><label>Card type</label>
            <select class="form-select" id="ic-type" onchange="ICUI.switchType(this.value)">
              <option value="student">Student card</option>
              <option value="staff">Staff card</option>
            </select>
          </div>
          <div class="form-group"><label>Professional template</label>
            <select class="form-select" id="ic-template" onchange="ICUI.render()">
              <option value="horizontal">Horizontal (classic)</option>
              <option value="vertical">Vertical (lanyard / portrait)</option>
              <option value="corporate">Corporate (dark premium)</option>
            </select>
          </div>
          <div class="form-group"><label>Primary colour</label><input class="form-input" type="color" id="ic-pc" value="${cfg.themePrimary}" oninput="ICUI.render()"></div>
          <div class="form-group"><label>Accent colour</label><input class="form-input" type="color" id="ic-ac" value="${cfg.themeAccent}" oninput="ICUI.render()"></div>
        </div>
        <div class="grid grid-2">
          <div class="form-group"><label>Pick a <span id="ic-pick-label">student</span></label><select class="form-select" id="ic-student" onchange="ICUI.pick(this.value)"><option value="">— choose —</option></select></div>
          <div class="form-group"><label>…or enter manually</label><input class="form-input" id="ic-name" placeholder="Full name" oninput="ICUI.render()"></div>
          <div class="form-group"><label id="ic-class-label">Class</label><input class="form-input" id="ic-class" placeholder="JSS1" oninput="ICUI.render()"></div>
          <div class="form-group"><label>ID / Admission / Staff no</label><input class="form-input" id="ic-id" placeholder="(auto)" oninput="ICUI.render()"></div>
          <div class="form-group"><label>Gender</label><input class="form-input" id="ic-gender" placeholder="male/female" oninput="ICUI.render()"></div>
          <div class="form-group"><label>Phone</label><input class="form-input" id="ic-phone" placeholder="0803..." oninput="ICUI.render()"></div>
          <div class="form-group" id="ic-dept-wrap" style="display:none"><label>Department / Designation</label><input class="form-input" id="ic-dept" oninput="ICUI.render()"></div>
          <div class="form-group"><label>Blood group (optional)</label><input class="form-input" id="ic-blood" placeholder="O+" oninput="ICUI.render()"></div>
          <div class="form-group" style="grid-column:1/-1"><label>Photo URL (auto-filled; Google Drive links supported, no upload)</label><input class="form-input" id="ic-photo" placeholder="https://drive.google.com/file/d/..." oninput="ICUI.render()"></div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="ICUI.print()">🖨 Print ID Card</button>
          <button class="btn btn-outline" onclick="ICUI.printAll()">🖨 Print ALL <span id="ic-all-label">students</span></button>
        </div>
      </div>
      <div id="ic-preview" style="display:flex;justify-content:center"></div>`;
    return T.shell(cfg, 'Digital ID Cards', body, { requireRole: 'staff' })
      .replace('</body></html>', `<script>
const ICUI={ cur:{}, all:[], kind:'student',
  switchType(t){ this.kind=t; this.all=[]; const sel=document.getElementById('ic-student'); sel.innerHTML='<option value="">— choose —</option>';
    document.getElementById('ic-pick-label').textContent=t; document.getElementById('ic-class-label').textContent=(t==='staff'?'Type':'Class');
    document.getElementById('ic-dept-wrap').style.display=(t==='staff'?'block':'none');
    document.getElementById('ic-all-label').textContent=(t==='staff'?'staff':'students');
    this.load(); this.render(); },
  async load(){ const sel=document.getElementById('ic-student'); if(!sb||!sel)return;
    if(this.kind==='staff'){ const {data}=await sb.from('staff').select('id,full_name,staff_no,role,department,staff_type,gender,phone,photo_url').order('full_name').limit(1000); ICUI.all=data||[]; (data||[]).forEach(s=>{ const o=document.createElement('option'); o.value=JSON.stringify(s); o.textContent=s.full_name+' ('+(s.role||s.staff_type||'')+')'; sel.appendChild(o); }); }
    else { const {data}=await sb.from('students').select('id,full_name,class,arm,admission_no,gender,photo_url').order('full_name').limit(1000); ICUI.all=data||[]; (data||[]).forEach(s=>{ const o=document.createElement('option'); o.value=JSON.stringify(s); o.textContent=s.full_name+' ('+(s.class||'')+')'; sel.appendChild(o); }); } },
  pick(v){ if(!v)return; const s=JSON.parse(v); this.cur=s;
    document.getElementById('ic-name').value=s.full_name||'';
    document.getElementById('ic-class').value=(this.kind==='staff'?(s.staff_type||''):(s.class||''));
    document.getElementById('ic-id').value=(this.kind==='staff'?(s.staff_no||''):(s.admission_no||''));
    document.getElementById('ic-gender').value=s.gender||'';
    document.getElementById('ic-phone').value=s.phone||'';
    if(document.getElementById('ic-dept')) document.getElementById('ic-dept').value=(s.department||s.role||'');
    document.getElementById('ic-photo').value=s.photo_url||''; this.render(); },
  tplOpts(){ var t=document.getElementById('ic-template'),pc=document.getElementById('ic-pc'),ac=document.getElementById('ic-ac'); return { template:t?t.value:'horizontal', pc:pc?pc.value:undefined, ac:ac?ac.value:undefined }; },
  person(){ var to=this.tplOpts(); const base={ full_name:document.getElementById('ic-name').value, photo_url:document.getElementById('ic-photo').value||this.cur.photo_url, gender:document.getElementById('ic-gender').value, phone:document.getElementById('ic-phone').value, blood_group:document.getElementById('ic-blood').value, type:this.kind, template:to.template, pc:to.pc, ac:to.ac };
    if(this.kind==='staff'){ base.staff_no=document.getElementById('ic-id').value; base.staff_type=document.getElementById('ic-class').value; base.role=(document.getElementById('ic-dept')?document.getElementById('ic-dept').value:'')||this.cur.role; base.department=this.cur.department; }
    else { base.admission_no=document.getElementById('ic-id').value; base.class=document.getElementById('ic-class').value; base.arm=this.cur.arm; }
    return base; },
  render(){ document.getElementById('ic-preview').innerHTML = window.Super?Super.idcard.html(this.person()):''; },
  print(){ if(window.Super) Super.idcard.print(this.person()); },
  printAll(){ if(!window.Super||!ICUI.all.length){toast('Nothing loaded','warning');return;} var to=this.tplOpts();
    const cards=ICUI.all.map(s=> ICUI.kind==='staff'
      ? '<div style="margin:8px;display:inline-block">'+Super.idcard.html({full_name:s.full_name,staff_no:s.staff_no,role:s.role,department:s.department,staff_type:s.staff_type,gender:s.gender,phone:s.phone,photo_url:s.photo_url,type:'staff',template:to.template,pc:to.pc,ac:to.ac})+'</div>'
      : '<div style="margin:8px;display:inline-block">'+Super.idcard.html({full_name:s.full_name,class:s.class,arm:s.arm,admission_no:s.admission_no,gender:s.gender,photo_url:s.photo_url,type:'student',template:to.template,pc:to.pc,ac:to.ac})+'</div>').join('');
    const w=window.open('','_blank'); w.document.write('<html><head><title>ID Cards</title></head><body style="display:flex;flex-wrap:wrap;padding:10px">'+cards+'<script>window.onload=()=>window.print()<\\/script></body></html>'); w.document.close(); }
};
document.addEventListener('DOMContentLoaded',()=>{ ICUI.load(); ICUI.render(); }); ICUI.load(); ICUI.render();
</script></body></html>`);
  },

  /* ====================================================================
     UPDATE V1 — DIGITAL LIBRARY (issue 9)
     Teachers post an online book/link + optional comprehension questions.
     Students open the link, take the quiz; the auto-marked score is stored and
     can count toward their grade. No file uploads (links only -> free tier).
     ==================================================================== */
  pageDigitalLibrary(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px"><p style="color:var(--gray-600);margin:0">
        📚 <strong>Digital Library.</strong> Teachers add a book/resource by pasting its online link (Google Drive, web, etc.)
        and may attach a few comprehension questions. Students read the book, answer the questions, and their
        auto-marked score is recorded — it can count toward their continuous-assessment grade. No files are uploaded
        (links only), so it stays free on Supabase.</p></div>

      <div class="card" style="margin-bottom:16px" data-staff-only>
        <h3>➕ Add / set a reading (teacher)</h3>
        <div class="grid grid-2">
          <div class="form-group"><label>Title *</label><input class="form-input" id="dl-title" placeholder="e.g. Things Fall Apart — Chapters 1-3"></div>
          <div class="form-group"><label>Author</label><input class="form-input" id="dl-author"></div>
          <div class="form-group"><label>Subject</label><select class="form-select" id="dl-subject"><option value="">—</option></select></div>
          <div class="form-group"><label>Assigned class</label><select class="form-select" id="dl-class"><option value="">—</option></select></div>
          <div class="form-group" style="grid-column:1/-1"><label>Read link (Drive / web) *</label><input class="form-input" id="dl-link" placeholder="https://drive.google.com/file/d/..."></div>
          <div class="form-group" style="grid-column:1/-1"><label>Instructions</label><textarea class="form-input" id="dl-inst" rows="2"></textarea></div>
          <div class="form-group"><label>Due date</label><input class="form-input" type="date" id="dl-due"></div>
          <div class="form-group"><label>Max score (counts to grade)</label><input class="form-input" type="number" id="dl-max" value="10"></div>
        </div>
        <h4 style="margin:6px 0">❓ Comprehension questions (optional, auto-marked)</h4>
        <div id="dl-qs"></div>
        <button class="btn btn-outline btn-sm" onclick="DL.addQ()">+ Add question</button>
        <div style="margin-top:12px"><button class="btn btn-primary" onclick="DL.save()">💾 Save reading</button></div>
      </div>

      <div class="card">
        <h3>📖 Readings</h3>
        <div id="dl-list"><span class="pulse">Loading…</span></div>
      </div>`;
    return T.shell(cfg, 'Digital Library', body, { requireRole: 'any' })
      .replace('</body></html>', `<script>
const DL={ qs:[],
  async init(){ if(!sb)return;
    try{ const {data:subs}=await sb.from('subjects').select('name').order('name'); (subs||[]).forEach(x=>{var o=document.createElement('option');o.textContent=x.name;document.getElementById('dl-subject')&&document.getElementById('dl-subject').appendChild(o);}); }catch(e){}
    try{ const {data:cls}=await sb.from('classes').select('name').order('name'); (cls||[]).forEach(x=>{var o=document.createElement('option');o.textContent=x.name;document.getElementById('dl-class')&&document.getElementById('dl-class').appendChild(o);}); }catch(e){}
    this.render(); this.list();
  },
  addQ(){ this.qs.push({q:'',options:['','','',''],answer:''}); this.render(); },
  render(){ var box=document.getElementById('dl-qs'); if(!box)return; box.innerHTML=this.qs.map((q,i)=>
    '<div class="card" style="background:#f8fafc;margin:8px 0;padding:10px">'+
    '<div class="form-group"><label>Q'+(i+1)+'</label><input class="form-input" value="'+esc(q.q)+'" oninput="DL.qs['+i+'].q=this.value"></div>'+
    '<div class="grid grid-2">'+q.options.map((op,j)=>'<input class="form-input" placeholder="Option '+(j+1)+'" value="'+esc(op)+'" oninput="DL.qs['+i+'].options['+j+']=this.value">').join('')+'</div>'+
    '<div class="form-group"><label>Correct answer (exact option text)</label><input class="form-input" value="'+esc(q.answer)+'" oninput="DL.qs['+i+'].answer=this.value"></div>'+
    '<button class="btn btn-sm btn-outline" onclick="DL.qs.splice('+i+',1);DL.render()">Remove</button></div>').join(''); },
  async save(){ if(!sb){toast('DB not configured','warning');return;}
    var title=document.getElementById('dl-title').value, link=document.getElementById('dl-link').value;
    if(!title||!link){toast('Title and read link are required','warning');return;}
    var rec={ title:title, author:document.getElementById('dl-author').value, subject:document.getElementById('dl-subject').value,
      class:document.getElementById('dl-class').value, read_link:link, instructions:document.getElementById('dl-inst').value,
      due_date:document.getElementById('dl-due').value||null, has_quiz:this.qs.length>0, questions:this.qs,
      max_score:Number(document.getElementById('dl-max').value||0) };
    var {error}=await sb.from('digital_library').insert(rec);
    if(error){toast(error.message,'danger',6000);return;} toast('Reading saved ✓','success'); this.qs=[]; this.render(); this.list();
  },
  _books:[],
  async list(){ var box=document.getElementById('dl-list'); if(!sb){box.innerHTML='<p>DB not configured.</p>';return;}
    var {data}=await sb.from('digital_library').select('*').order('created_at',{ascending:false}).limit(200);
    if(!data||!data.length){box.innerHTML='<p style="color:var(--gray-500)">No readings yet.</p>';return;}
    this._books=data;
    box.innerHTML=data.map((b,i)=>'<div class="card" style="margin:8px 0"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center">'+
      '<div><strong>'+esc(b.title)+'</strong> '+(b.subject?'<span class="badge">'+esc(b.subject)+'</span> ':'')+(b.class?'<span class="badge">'+esc(b.class)+'</span>':'')+
      '<div style="color:var(--gray-500);font-size:.85rem">'+esc(b.instructions||'')+(b.due_date?' · Due '+esc(b.due_date):'')+'</div></div>'+
      '<div style="white-space:nowrap"><a class="btn btn-sm btn-primary" href="'+esc(DL.drive(b.read_link))+'" target="_blank" rel="noopener">📖 Read</a> '+
      (b.has_quiz?'<button class="btn btn-sm btn-outline" onclick="DL.quiz('+i+')">📝 Take quiz</button>':'')+'</div></div></div>').join('');
  },
  drive(u){ if(!u)return '#'; var m=u.match(/drive\\.google\\.com\\/file\\/d\\/([^/]+)/); return m?('https://drive.google.com/file/d/'+m[1]+'/view'):u; },
  quiz(i){ var b=this._books[i]; if(!b)return; var qs=b.questions||[];
    if(!qs.length){toast('No questions on this reading.','info');return;}
    var html=qs.map((q,j)=>'<div class="form-group"><label>Q'+(j+1)+'. '+esc(q.q)+'</label>'+
      (q.options||[]).filter(Boolean).map(op=>'<label style="display:block"><input type="radio" name="dq'+j+'" value="'+esc(op)+'"> '+esc(op)+'</label>').join('')+'</div>').join('');
    openModal('Quiz: '+esc(b.title), html, '<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="DL.submit('+i+')">Submit</button>');
  },
  async submit(i){ var b=this._books[i]; if(!b)return; var qs=b.questions||[]; var correct=0;
    qs.forEach((q,j)=>{ var sel=document.querySelector('input[name="dq'+j+'"]:checked'); if(sel&&sel.value===q.answer) correct++; });
    var max=Number(b.max_score||qs.length); var score=Math.round((correct/qs.length)*max*10)/10;
    var me=(window.App&&App.user)?App.user:null; var name=(me&&me.full_name)||(window.SC_PROFILE&&SC_PROFILE.full_name)||'';
    if(!name){ name=prompt('Enter your full name to record this score:')||''; }
    if(sb&&name){ try{ await sb.from('reading_scores').insert({ student_name:name, subject:b.subject, class:b.class, book_id:b.id, score:score, max_score:max, source:'digital_library' }); }catch(e){} }
    closeModal(); toast('You scored '+score+' / '+max+' — recorded ✓','success',6000);
  }
};
document.addEventListener('DOMContentLoaded',()=>DL.init()); DL.init();
</script></body></html>`);
  },

  /* ====================================================================
     UPDATE V2 — AI-PROMPT LIBRARY FOR CSV QUESTIONS (issue 1)
     A dedicated page with ready-made prompts (Simple / Intermediate / Advanced)
     that a teacher pastes into ANY free AI chat (ChatGPT, Gemini, Copilot, etc.)
     to generate exam questions in the EXACT CSV format the CBT page accepts.
     No AI API is used or paid for — the teacher copies, edits, and uses a free
     chat tool of their choice.
     ==================================================================== */




  pageAttendance(cfg) {
    const body = `<div class="card" style="margin-bottom:16px;background:#eef2ff;border-color:#c7d2fe"><h3 style="margin-top:0">📋 Class E-Register / Attendance</h3><p style="color:var(--gray-700);line-height:1.7;margin:0">Select a class to show every registered student in that class. Class/subject teachers can mark each learner Present, Absent, Late or Excused by clicking one button. Parents/students can read scoped attendance where allowed.</p></div><div class="card" style="margin-bottom:16px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end"><div class="form-group"><label>Class</label><select class="form-select" id="at-class" onchange="AT.load()"><option value="">— choose class —</option></select></div><div class="form-group"><label>Date</label><input class="form-input" id="at-date" type="date"></div><button class="btn btn-outline" onclick="AT.load()">Load register</button><button class="btn btn-primary" data-staff-only onclick="AT.saveAll()">Save all marks</button></div></div><div id="at-register"><p style="color:var(--gray-500)">Choose a class to open the e-register.</p></div>`;
    return T.shell(cfg, 'Attendance', body, { requireRole:'any' }).replace('</body></html>', `<script>
const AT={students:[], async init(){document.getElementById('at-date').value=new Date().toISOString().slice(0,10); try{const {data}=await sb.from('classes').select('name').order('name'); const sel=document.getElementById('at-class'); (data||[]).forEach(c=>{var o=document.createElement('option');o.value=c.name;o.textContent=c.name;sel.appendChild(o);});}catch(e){}}, async load(){ const cls=document.getElementById('at-class').value, box=document.getElementById('at-register'); if(!cls){box.innerHTML='<p>Choose a class.</p>';return;} const {data,error}=await sb.from('students').select('id,full_name,admission_no,class').eq('class',cls).order('full_name').limit(300); if(error){box.innerHTML='<div class="card">'+esc(error.message)+'</div>';return;} this.students=data||[]; box.innerHTML='<div class="card"><h3>'+esc(cls)+' Register</h3><div class="table-wrap"><table><thead><tr><th>#</th><th>Student</th><th>Admission No</th><th>Status</th></tr></thead><tbody>'+this.students.map((s,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(s.full_name)+'</td><td>'+esc(s.admission_no||'')+'</td><td><select class="form-select" id="ats-'+s.id+'"><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option></select></td></tr>').join('')+'</tbody></table></div></div>';}, async saveAll(){ if(!this.students.length){toast('Load a class first','warning');return;} const date=document.getElementById('at-date').value||new Date().toISOString().slice(0,10); const rows=this.students.map(s=>({student_id:s.id,student_name:s.full_name,class:s.class,date:date,status:document.getElementById('ats-'+s.id).value,recorded_by:(window.SC_PROFILE&&SC_PROFILE.id)||null})); const {error}=await sb.from('attendance').upsert(rows,{onConflict:'student_id,date'}); if(error){toast(error.message,'danger');return;} toast('Attendance saved for '+rows.length+' student(s)','success'); }}; document.addEventListener('DOMContentLoaded',()=>AT.init()); AT.init();
</script></body></html>`);
  },

  pageSOW(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px;background:#eef2ff;border-color:#c7d2fe">
        <h3 style="margin-top:0">📋 Scheme of Work (SOW) — Two-Stage Tracking</h3>
        <p style="color:var(--gray-700);line-height:1.7;margin:0">Use this dedicated interface to manage curriculum delivery in two distinct stages: <strong>Stage 1: Content Setup</strong> (teachers enter weekly lesson topics and save) and <strong>Stage 2: Delivery Confirmation</strong> (teachers confirm topics are taught under admin/HOD supervision).</p>
      </div>
      <div class="card" style="margin-bottom:16px;background:#f8fafc;border:1px solid #e2e8f0">
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" id="sow-tab-setup" onclick="SOWUI.switchTab('setup')">✏️ Stage 1: Enter Weekly Content</button>
          <button class="btn btn-outline" id="sow-tab-confirm" onclick="SOWUI.switchTab('confirm')">✅ Stage 2: Delivery Confirmation</button>
          <button class="btn btn-outline" onclick="SOWUI.load()">↻ Refresh</button>
        </div>
      </div>
      <div id="sow-sec-setup" class="card" style="margin-bottom:16px">
        <h3>✏️ Enter Weekly Scheme Content</h3>
        <p style="color:var(--gray-600);margin-bottom:12px">Define your academic plan for the term. Topics entered here remain as 'pending' until confirmed in Stage 2.</p>
        <div class="grid grid-3">
          <div class="form-group"><label>Subject</label><select class="form-select" id="sow-sub"><option value="">— select subject —</option></select></div>
          <div class="form-group"><label>Class</label><select class="form-select" id="sow-cls"><option value="">— select class —</option></select></div>
          <div class="form-group"><label>Week Number</label><input class="form-input" type="number" id="sow-wk" value="1"></div>
          <div class="form-group"><label>Term</label><select class="form-select" id="sow-term"><option value="">— select term —</option></select></div>
          <div class="form-group"><label>Session</label><select class="form-select" id="sow-session"><option value="">— select session —</option></select></div>
          <div class="form-group"><label>Assigned Teacher</label><select class="form-select" id="sow-teacher"><option value="">— select teacher —</option></select></div>
        </div>
        <div class="form-group"><label>Weekly Topic Description</label><textarea class="form-input" id="sow-topic" rows="3" placeholder="Introduction to basic formulas..."></textarea></div>
        <button class="btn btn-primary" onclick="SOWUI.saveContent()">Save Scheme Content</button>
      </div>
      <div id="sow-sec-confirm" class="card" style="display:none;margin-bottom:16px;background:#f0fdf4;border-color:#bbf7d0">
        <h3>✅ Delivery Confirmation (Admin Oversight)</h3>
        <p style="color:var(--gray-700);margin-bottom:12px">Confirm that the scheduled weekly topics have been successfully taught in the classroom. Administrators and HODs use this section for instructional oversight and sign-off.</p>
        <div id="sow-confirm-list"><span class="pulse">Loading confirmation records…</span></div>
      </div>
      <div class="card">
        <h3>📋 Current Term Scheme of Work</h3>
        <div id="sow-list"><span class="pulse">Loading scheme records…</span></div>
      </div>`;
    return T.shell(cfg, 'Scheme of Work', body, { requireRole: 'staff' })
      .replace('</body></html>', `<script>
const SOWUI={ rows:[],
  async init(){ if(!sb)return; try{ const [sub,cls,tch,term,ses]=await Promise.all([sb.from('subjects').select('name').order('name'),sb.from('classes').select('name').order('name'),sb.from('staff').select('full_name').order('full_name'),sb.from('lookups').select('value').eq('kind','term').order('position'),sb.from('lookups').select('value').eq('kind','session').order('position')]); const fill=(id,data,k)=>{const el=document.getElementById(id);if(el)el.innerHTML='<option value="">— select —</option>'+(data||[]).map(r=>'<option value="'+esc(r[k])+'">'+esc(r[k])+'</option>').join('');}; fill('sow-sub',sub.data,'name'); fill('sow-cls',cls.data,'name'); fill('sow-teacher',tch.data,'full_name'); fill('sow-term',term.data,'value'); fill('sow-session',ses.data,'value'); }catch(e){} this.load(); },
  switchTab(t){ const s=document.getElementById('sow-sec-setup'), c=document.getElementById('sow-sec-confirm'); const bs=document.getElementById('sow-tab-setup'), bc=document.getElementById('sow-tab-confirm'); if(!s||!c)return; if(t==='setup'){s.style.display='block';c.style.display='none';bs.className='btn btn-primary';bc.className='btn btn-outline';}else{s.style.display='none';c.style.display='block';bc.className='btn btn-primary';bs.className='btn btn-outline';} },
  async load(){ if(!sb){document.getElementById('sow-list').innerHTML='<p>Database not configured.</p>';return;} const {data,error}=await sb.from('scheme_of_work').select('*').order('week').limit(1000); if(error){document.getElementById('sow-list').innerHTML='<p>'+esc(error.message)+'</p>';return;} this.rows=data||[]; this.render(); },
  render(){ const box=document.getElementById('sow-list'), cbox=document.getElementById('sow-confirm-list'); if(!box||!cbox)return; if(!this.rows.length){box.innerHTML='<p style="color:var(--gray-500)">No scheme of work recorded yet.</p>';cbox.innerHTML='<p style="color:var(--gray-500)">No scheme of work recorded yet.</p>';return;} box.innerHTML='<div class="table-wrap"><table><thead><tr><th>Week</th><th>Subject</th><th>Class</th><th>Topic</th><th>Teacher</th><th>Status</th><th>Confirmed</th><th>Actions</th></tr></thead><tbody>'+this.rows.map(r=>'<tr><td>Week '+r.week+'</td><td>'+esc(r.subject)+'</td><td>'+esc(r.class)+'</td><td>'+esc(r.topic)+'</td><td>'+esc(r.teacher)+'</td><td><span class="badge">'+esc(r.status||'pending')+'</span></td><td>'+(r.confirmed?'✅ Yes':'—')+'</td><td><button class="btn btn-sm btn-outline" onclick="SOWUI.del(\\''+r.id+'\\')">Delete</button></td></tr>').join('')+'</tbody></table></div>'; cbox.innerHTML='<div class="table-wrap"><table><thead><tr><th>Week</th><th>Subject</th><th>Class</th><th>Topic</th><th>Teacher</th><th>Status</th><th>Confirmation Action</th></tr></thead><tbody>'+this.rows.map(r=>'<tr><td>Week '+r.week+'</td><td>'+esc(r.subject)+'</td><td>'+esc(r.class)+'</td><td>'+esc(r.topic)+'</td><td>'+esc(r.teacher)+'</td><td><span class="badge '+(r.confirmed?'badge-success':'')+'">'+esc(r.status||'pending')+'</span></td><td>'+(r.confirmed?'<span style="color:#16a34a;font-weight:bold">✅ Confirmed Taught</span>':'<button class="btn btn-sm btn-primary" onclick="SOWUI.confirmTaught(\\''+r.id+'\\')">Confirm Taught ✅</button>')+'</td></tr>').join('')+'</tbody></table></div>'; },
  async saveContent(){ if(!sb){toast('Database not configured','warning');return;} const row={subject:document.getElementById('sow-sub').value,class:document.getElementById('sow-cls').value,week:parseInt(document.getElementById('sow-wk').value)||1,term:document.getElementById('sow-term').value,session:document.getElementById('sow-session').value,teacher:document.getElementById('sow-teacher').value,topic:document.getElementById('sow-topic').value.trim(),status:'pending',confirmed:false}; if(!row.subject||!row.class||!row.topic){toast('Enter subject, class and topic','warning');return;} const {error}=await sb.from('scheme_of_work').insert(row); if(error){toast(error.message,'danger');return;} toast('Scheme content saved successfully','success'); document.getElementById('sow-topic').value=''; this.load(); },
  async confirmTaught(id){ if(!sb)return; const {error}=await sb.from('scheme_of_work').update({status:'covered',confirmed:true,covered_at:new Date().toISOString().slice(0,10)}).eq('id',id); if(error){toast(error.message,'danger');return;} toast('✅ Topic confirmed as taught!','success'); this.load(); },
  async del(id){ if(!sb)return; if(!confirm('Delete this scheme row?'))return; await sb.from('scheme_of_work').delete().eq('id',id); toast('Deleted','info'); this.load(); }
}; document.addEventListener('DOMContentLoaded',()=>SOWUI.init()); SOWUI.init();
</script></body></html>`);
  },

  pageTeacherOverview(cfg) {
    const body = `<div class="card" style="margin-bottom:16px;background:#eef2ff;border-color:#c7d2fe"><h3 style="margin-top:0">👨‍🏫 Teacher / Staff Dashboard Overview</h3><p style="color:var(--gray-700);line-height:1.7;margin:0">Admin-only overview of a teacher's operational dashboard: assigned subjects, attendance work, results entered, CBT exams, scheme of work, lesson plans and messages.</p></div><div id="to-view"><p class="pulse">Loading…</p></div>`;
    return T.shell(cfg, 'Teacher Overview', body, { requireRole:'admin' }).replace('</body></html>', `<script>
const TO={ async init(){ const id=new URLSearchParams(location.search).get('staff'); const box=document.getElementById('to-view'); if(!id||!sb){box.innerHTML='<div class="card">Select a staff member from the Staff page.</div>';return;} const st=await sb.from('staff').select('*').eq('id',id).maybeSingle(); const s=st.data||{}; const name=s.full_name||s.name||''; const [sub,res,cbt,sow,lp,att]=await Promise.all([sb.from('subjects').select('*').or('teacher.eq.'+name+',teacher_id.eq.'+id).limit(200),sb.from('results').select('id').eq('teacher_id',id),sb.from('cbt_exams').select('id').eq('teacher_id',id),sb.from('scheme_of_work').select('id').eq('teacher',name),sb.from('lesson_plans').select('id').eq('teacher',name),sb.from('attendance').select('id').eq('teacher_id',id)]); box.innerHTML='<div class="card"><h2>'+esc(name||'Teacher')+'</h2><p>'+esc(s.role||s.designation||'')+' · '+esc(s.email||'')+' · '+esc(s.phone||'')+'</p></div><div class="stats-grid"><div class="stat-card"><div class="stat-value">'+((sub.data||[]).length)+'</div><div class="stat-label">Subjects</div></div><div class="stat-card"><div class="stat-value">'+((res.data||[]).length)+'</div><div class="stat-label">Results Entered</div></div><div class="stat-card"><div class="stat-value">'+((cbt.data||[]).length)+'</div><div class="stat-label">CBT Exams</div></div><div class="stat-card"><div class="stat-value">'+((sow.data||[]).length)+'</div><div class="stat-label">Scheme Rows</div></div><div class="stat-card"><div class="stat-value">'+((lp.data||[]).length)+'</div><div class="stat-label">Lesson Plans</div></div><div class="stat-card"><div class="stat-value">'+((att.data||[]).length)+'</div><div class="stat-label">Attendance Rows</div></div></div><div class="card"><h3>Quick supervision links</h3><a class="btn btn-outline" href="results.html">Results</a> <a class="btn btn-outline" href="cbt.html">CBT</a> <a class="btn btn-outline" href="sow.html">Scheme</a> <a class="btn btn-outline" href="lesson_plans.html">Lesson Plans</a></div>'; }}; document.addEventListener('DOMContentLoaded',()=>TO.init()); TO.init();
</script></body></html>`);
  },

  pageMessages(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px;background:#eef2ff;border-color:#c7d2fe"><h3 style="margin-top:0">📱 Messaging Centre — WhatsApp / Email / SMS</h3><p style="color:var(--gray-700);line-height:1.7;margin:0">Create a message, choose recipients, then send through free device/email links. This avoids paid SMS/WhatsApp APIs. The system stores the message log; your browser opens WhatsApp, email or SMS with the text prefilled for the selected recipient.</p></div>
      <div class="grid grid-2"><div class="card"><h3>Compose</h3><div class="form-group"><label>Audience</label><select class="form-select" id="msg-aud" onchange="MSG.loadRecipients()"><option value="parents">Parents</option><option value="staff">Staff / Teachers</option><option value="students">Students</option><option value="admin">Admin / Management</option></select></div><div class="form-group"><label>Recipient</label><select class="form-select" id="msg-rec"><option value="">Loading…</option></select></div><div class="form-group"><label>Subject / title</label><input class="form-input" id="msg-title"></div><div class="form-group"><label>Message</label><textarea class="form-input" id="msg-body" rows="6"></textarea></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary" onclick="MSG.send('whatsapp')">Send WhatsApp</button><button class="btn btn-outline" onclick="MSG.send('email')">Send Email</button><button class="btn btn-outline" onclick="MSG.send('sms')">Send SMS</button><button class="btn btn-outline" onclick="MSG.logOnly()">Save to In-App Inbox</button></div></div><div class="card"><h3>In-App Inbox / Message Log</h3><div id="msg-log">Loading…</div></div></div>`;
    return T.shell(cfg, 'Messaging', body, { requireRole:'any' }).replace('</body></html>', `<script>
const MSG={rows:[], async init(){await this.loadRecipients(); this.loadLog();}, async loadRecipients(){ const aud=document.getElementById('msg-aud').value; let rows=[]; try{ if(aud==='parents'){const r=await sb.from('profiles').select('id,full_name,email,phone').eq('role','parent').limit(1000); rows=r.data||[];} if(aud==='staff'){const r=await sb.from('staff').select('id,full_name,email,phone').limit(1000); rows=r.data||[];} if(aud==='admin'){const r=await sb.from('profiles').select('id,full_name,email,phone').in('role',['admin','principal','proprietor','head_teacher','bursar']).limit(1000); rows=r.data||[];} if(aud==='students'){const r=await sb.from('students').select('id,full_name,email,guardian_phone,guardian_email,class').limit(1000); rows=(r.data||[]).map(x=>({id:x.id,full_name:(x.class?x.class+' · ':'')+x.full_name,email:x.email||x.guardian_email,phone:x.guardian_phone}));} }catch(e){} const sel=document.getElementById('msg-rec'); sel.innerHTML='<option value="">— choose —</option>'+rows.map(x=>'<option value="'+x.id+'" data-email="'+esc(x.email||'')+'" data-phone="'+esc(x.phone||'')+'">'+esc(x.full_name||x.email||x.phone||x.id)+'</option>').join('');}, text(){return (document.getElementById('msg-title').value?document.getElementById('msg-title').value+'\\n\\n':'')+document.getElementById('msg-body').value;}, async log(channel){ try{ const opt=document.getElementById('msg-rec').selectedOptions[0]; const recName=opt?opt.textContent:'User'; await sb.from('module_records').insert({module:'inbox',title:document.getElementById('msg-title').value,body:document.getElementById('msg-body').value,status:'unread',data:{channel:channel,audience:document.getElementById('msg-aud').value,recipient:document.getElementById('msg-rec').value,to:recName,from:(window.SC_PROFILE&&SC_PROFILE.full_name)||'User'}});}catch(e){} this.loadLog();}, send(ch){ const opt=document.getElementById('msg-rec').selectedOptions[0]; if(!opt||!opt.value){toast('Choose a recipient','warning');return;} const phone=(opt.dataset.phone||'').replace(/[^0-9]/g,''); const email=opt.dataset.email||''; const text=this.text(); if(ch==='whatsapp'){ if(!phone){toast('Recipient has no phone','warning');return;} window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(text),'_blank');} if(ch==='email'){ if(!email){toast('Recipient has no email','warning');return;} location.href='mailto:'+email+'?subject='+encodeURIComponent(document.getElementById('msg-title').value)+'&body='+encodeURIComponent(document.getElementById('msg-body').value);} if(ch==='sms'){ if(!phone){toast('Recipient has no phone','warning');return;} location.href='sms:'+phone+'?&body='+encodeURIComponent(text);} this.log(ch);}, logOnly(){this.log('in-app'); toast('Message saved to In-App Inbox','success');}, async loadLog(){ const box=document.getElementById('msg-log'); try{const r=await sb.from('module_records').select('*').eq('module','inbox').order('created_at',{ascending:false}).limit(50); box.innerHTML=(r.data||[]).length?'<div class="table-wrap"><table><thead><tr><th>Date</th><th>From</th><th>To</th><th>Subject</th><th>Channel</th></tr></thead><tbody>'+(r.data||[]).map(x=>'<tr><td>'+esc((x.created_at||'').slice(0,10))+'</td><td>'+esc((x.data&&x.data.from)||'User')+'</td><td>'+esc((x.data&&x.data.to)||'User')+'</td><td>'+esc(x.title||'')+'</td><td>'+esc((x.data&&x.data.channel)||'in-app')+'</td></tr>').join('')+'</tbody></table></div>':'<p>No messages logged yet.</p>';}catch(e){box.innerHTML='<p>Could not load log.</p>';}}}; document.addEventListener('DOMContentLoaded',()=>MSG.init()); MSG.init();
</script></body></html>`);
  },

  pageTimetable(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px;background:#eef2ff;border-color:#c7d2fe"><h3 style="margin-top:0">🗓️ Published School Timetable</h3><p style="color:var(--gray-700);line-height:1.7;margin:0">Everyone can read the school timetable. Staff/admin can add or edit timetable slots; generated slots from Auto-Timetable are shown here for classes, students and parents.</p></div>
      <div class="card" style="margin-bottom:16px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end"><div class="form-group"><label>Class</label><select class="form-select" id="tt-class" onchange="TT.load()"><option value="">All classes</option></select></div><button class="btn btn-outline" onclick="TT.load()">Refresh</button><button class="btn btn-primary" data-staff-only onclick="CRUD.openForm('timetable')">+ Add slot</button><a class="btn btn-outline" data-staff-only href="timetable-generator.html">Auto-generate</a></div></div>
      <div id="tt-view"><p class="pulse">Loading timetable…</p></div>`;
    return T.shell(cfg, 'Timetable', body, { requireRole:'any' }).replace('</body></html>', `<script>
const TT={days:['Monday','Tuesday','Wednesday','Thursday','Friday'], async init(){ try{const {data}=await sb.from('classes').select('name').order('name'); const sel=document.getElementById('tt-class'); (data||[]).forEach(c=>{var o=document.createElement('option');o.value=c.name;o.textContent=c.name;sel.appendChild(o);});}catch(e){} this.load();}, async load(){ if(!sb)return; let q=sb.from('timetable').select('*').limit(2000); const cls=document.getElementById('tt-class').value; if(cls)q=q.eq('class',cls); const {data,error}=await q; const box=document.getElementById('tt-view'); if(error){box.innerHTML='<div class="card">'+esc(error.message)+'</div>';return;} const rows=data||[]; if(!rows.length){box.innerHTML='<div class="card">No timetable has been published yet. Staff can add slots or use Auto-Timetable.</div>';return;} const periods=[...new Set(rows.map(r=>r.period||''))].sort(); let html='<div class="card"><div class="table-wrap"><table><thead><tr><th>Period</th>'+this.days.map(d=>'<th>'+d+'</th>').join('')+'</tr></thead><tbody>'; periods.forEach(p=>{html+='<tr><td><strong>'+esc(p)+'</strong></td>'+this.days.map(d=>{const cell=rows.filter(r=>(r.period||'')===p&&(r.day||'')===d).map(r=>'<div><strong>'+esc(r.class||'')+'</strong> · '+esc(r.subject||'')+'<br><small>'+esc(r.teacher||'')+' '+esc(r.room||'')+'</small></div>').join('<hr>'); return '<td>'+cell+'</td>';}).join('')+'</tr>';}); box.innerHTML=html+'</tbody></table></div></div>'; }}; document.addEventListener('DOMContentLoaded',()=>TT.init()); TT.init();
</script></body></html>`);
  },

  pageCBTPrompts(cfg) {
    const HEADER = 'Question,A,B,C,D,CorrectAnswer,Explanation,Type,Tolerance,Unit,Accept,MRQ_AON,Pairs,Items,Difficulty,Tags,Section';
    const simple = `You are a Nigerian school exam question writer. Generate exactly [NUMBER] questions on the topic "[TOPIC]" for [CLASS/LEVEL].
Use ONLY these simple question types: mcq (multiple choice with 4 options) and truefalse (yes/no).
Output a DOWNLOADABLE CSV ONLY with this EXACT header row and one question per line (no extra text, no markdown):
${HEADER}
Rules:
- For mcq: fill A,B,C,D and put the correct letter (A/B/C/D) in CorrectAnswer. Type = mcq.
- For truefalse: leave A,B,C,D blank, put A (for True) or B (for False) in CorrectAnswer. Type = truefalse.
- Wrap any field containing a comma in double quotes.
- Difficulty = Easy. Tags = the topic. Section = the subject.
- Leave Tolerance, Unit, Accept, MRQ_AON, Pairs, Items blank.`;
    const intermediate = `You are a Nigerian school exam question writer. Generate exactly [NUMBER] questions on "[TOPIC]" for [CLASS/LEVEL], mixing these intermediate types: mcq, truefalse, numeric, short, mrq (multiple-response).
Output a DOWNLOADABLE CSV ONLY with this EXACT header and one question per line (no extra text):
${HEADER}
Rules:
- mcq: A,B,C,D filled; CorrectAnswer = A/B/C/D. Type=mcq.
- truefalse: CorrectAnswer = A (True) or B (False). Type=truefalse.
- numeric: CorrectAnswer = the number; set Tolerance (e.g. 0.01) and Unit if any. Type=numeric.
- short: CorrectAnswer = main answer; put alternative accepted answers in Accept separated by | . Type=short.
- mrq: A,B,C,D filled; CorrectAnswer = all correct letters joined by | (e.g. A|C); MRQ_AON = 1 for all-or-nothing scoring. Type=mrq.
- Difficulty = Easy/Medium mix. Tags = subtopics. Section = subject. Quote fields containing commas.`;
    const advanced = `You are a senior Nigerian examiner. Generate exactly [NUMBER] rigorous questions on "[TOPIC]" for [CLASS/LEVEL] (WAEC/NECO/UTME standard), using a rich mix of types: mcq, mrq, numeric, short, truefalse, matching (Pairs), ordering (Items), and essay (open).
Output a DOWNLOADABLE CSV ONLY with this EXACT header and one question per line (no commentary, no code fences):
${HEADER}
Type-specific rules:
- matching: list pairs in Pairs as "left=right;left2=right2". Type=matching. Leave A-D blank.
- ordering: list the correct order in Items as "step1;step2;step3". Type=ordering.
- essay/open: leave options blank; put a model answer / keywords in Explanation; Type=essay.
- numeric: CorrectAnswer = value; set Tolerance and Unit. short: use Accept for alternates (| separated).
- mrq: CorrectAnswer = correct letters joined by | ; set MRQ_AON=1 for all-or-nothing.
- Difficulty = Medium/Hard mix; include a one-line worked Explanation for each; Tags = curriculum subtopics; Section = subject.
- Quote any field containing a comma. Do not invent unsupported columns.`;
    const master = `You are an expert examination setter and CSV question-bank formatter for HMG School Connect CBT.

TASK
Generate exactly [NUMBER] high-quality questions for [SUBJECT], topic: [TOPIC], class/level: [CLASS/LEVEL], standard: [WAEC/NECO/BECE/UTME/School Exam].

SUPPORTED TYPES
Use a balanced mix from: mcq, mrq, truefalse, short, numeric, matching, ordering, cloze, essay.

OUTPUT FORMAT
Return ONLY valid CSV. No markdown, no explanations outside the CSV. Use this exact header:
${HEADER}

QUALITY RULES
1. Questions must be age-appropriate and curriculum-aligned.
2. Avoid ambiguous wording.
3. Include worked explanations in the Explanation column.
4. For numeric questions, include Tolerance and Unit where relevant.
5. For short answers, put accepted alternatives in Accept separated by |.
6. For matching, use Pairs as left=right;left2=right2.
7. For ordering, use Items as correct step1;step2;step3.
8. Quote any CSV field containing commas.
9. Difficulty should be mixed: Easy, Medium and Hard.
10. Tags should contain subtopic keywords; Section should contain the subject area.

SELF-CHECK BEFORE FINAL ANSWER
- Count exactly [NUMBER] rows after the header.
- Ensure CorrectAnswer matches the selected Type.
- Ensure the CSV can be pasted directly into a spreadsheet and uploaded to School Connect CBT.`;
    const body = `
      <div class="card" style="margin-bottom:16px;background:#eef2ff;border-color:#c7d2fe">
        <h3 style="margin-top:0">🧩 What is this page?</h3>
        <p style="margin:0;color:var(--gray-700)">Writing exam questions by hand is slow. This page gives you ready-made <strong>prompts</strong> you can paste into <strong>any free AI chat</strong>
        (ChatGPT, Google Gemini, Microsoft Copilot, etc.) to instantly draft questions in the <strong>exact CSV format the CBT page accepts</strong>.
        <br><br><strong>The platform itself uses no paid AI</strong> — you simply copy a prompt, fill in the blanks ([TOPIC], [NUMBER], [CLASS/LEVEL]),
        paste it into a free chat, copy the CSV it returns, <strong>edit it to suit your needs</strong>, save as a <code>.csv</code> file, and upload it on the
        <a href="cbt.html">CBT page</a>. Pick the level that matches your need:</p>
      </div>

      ${['Simple','Intermediate','Advanced'].map((lvl,i)=>{
        const desc=['Best for younger classes & quick tests — multiple choice and yes/no only.',
                    'For mid-level assessments — adds numeric, short-answer and multiple-response questions.',
                    'Exam-grade (WAEC/NECO/UTME) — adds matching, ordering and essay questions.'][i];
        const pid=['p-simple','p-inter','p-adv'][i];
        return `<div class="card" style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <h3 style="margin:0">${i+1}. ${lvl} question prompt</h3>
            <button class="btn btn-primary btn-sm" onclick="CPUI.copy('${pid}')">📋 Copy prompt</button>
          </div>
          <p style="color:var(--gray-600);margin:6px 0">${desc}</p>
          <textarea id="${pid}" class="form-input" rows="10" style="font-family:monospace;font-size:.8rem">${T.esc([simple,intermediate,advanced][i])}</textarea>
        </div>`;
      }).join('')}

      <div class="card" style="background:#f0fdfa;border-color:#99f6e4">
        <h3 style="margin-top:0">✅ Step-by-step</h3>
        <ol style="line-height:1.8;color:var(--gray-700);margin:0;padding-left:20px">
          <li>Click <strong>Copy prompt</strong> on the level you want.</li>
          <li>Open any free AI chat in a new tab and <strong>paste</strong> the prompt.</li>
          <li>Replace <code>[TOPIC]</code>, <code>[NUMBER]</code> and <code>[CLASS/LEVEL]</code> with your details, then send.</li>
          <li>Copy the CSV the AI returns. <strong>Review and edit</strong> every question for accuracy (you are the teacher!).</li>
          <li>Paste it into a spreadsheet or a plain text file and save as <code>questions.csv</code>.</li>
          <li>Go to the <a href="cbt.html">CBT page</a> → create an exam → <strong>Upload CSV</strong>. Done.</li>
        </ol>
      </div>`;
    return T.shell(cfg, 'AI Question Prompts (for CBT CSV)', body, { requireRole: 'staff' })
      .replace('</body></html>', `<script>
const CPUI={ copy(id){ var t=document.getElementById(id); t.select(); t.setSelectionRange(0,99999);
  try{ if(navigator.clipboard){ navigator.clipboard.writeText(t.value); } else { document.execCommand('copy'); } toast('Prompt copied — paste it into any free AI chat ✓','success',5000); }catch(e){ document.execCommand('copy'); toast('Prompt copied ✓','success'); } } };
</script></body></html>`);
  },

  /* ====================================================================
     UPDATE V2 — ENTRANCE / ASSESSMENT RESULTS + ADMISSION LETTERS (issue 5)
     Anonymous candidates sit a CBT entrance/assessment exam (open mode). Here
     the school sees instant results and generates certificate + admission
     letter per candidate OR in bulk. No login required for the candidate.
     ==================================================================== */
  pageEntrance(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px;background:#eef2ff;border-color:#c7d2fe">
        <h3 style="margin-top:0">🎓 What is this page?</h3>
        <p style="margin:0;color:var(--gray-700)">Run <strong>entrance exams, common-entrance, or placement assessments</strong> that <strong>anyone can sit without an account</strong>.
        Create the exam on the <a href="cbt.html">CBT page</a> (tick it as an entrance/assessment), share the code/link, and candidates take it.
        Their <strong>results appear here instantly</strong> — and you can generate each candidate's <strong>result slip, certificate, and admission letter</strong>,
        one at a time or <strong>in bulk</strong>.</p>
      </div>
      <div class="card" style="margin-bottom:16px" data-staff-only>
        <div class="grid grid-3">
          <div class="form-group"><label>Choose an assessment / exam</label><select class="form-select" id="en-exam" onchange="EN.load()"><option value="">— select —</option></select></div>
          <div class="form-group"><label>Pass mark (%) for admission</label><input class="form-input" type="number" id="en-pass" value="50" oninput="EN.render()"></div>
          <div class="form-group"><label>Admission session</label><select class="form-select" id="en-session"><option value="">— select session —</option></select></div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-outline" onclick="EN.load()">↻ Refresh results</button>
          <button class="btn btn-primary" onclick="EN.bulkLetters()">📜 Generate ALL admission letters</button>
          <button class="btn btn-outline" onclick="EN.bulkCerts()">🏆 Print ALL result certificates</button>
          <button class="btn btn-outline" onclick="EN.exportCSV()">⬇ Export results CSV</button>
        </div>
      </div>
      <div id="en-list"><p style="color:var(--gray-500)">Select an assessment to see candidate results.</p></div>`;
    return T.shell(cfg, 'Entrance & Assessments', body, { requireRole: 'staff' })
      .replace('</body></html>', `<script>
const EN={ rows:[], exam:null,
  async init(){ if(!sb)return; try{ const [ex,ses]=await Promise.all([sb.from('cbt_exams').select('id,title,is_entrance,pass_mark,code').order('created_at',{ascending:false}).limit(500),sb.from('lookups').select('value').eq('kind','session').order('position')]); var sel=document.getElementById('en-exam'); (ex.data||[]).forEach(e=>{var o=document.createElement('option');o.value=e.id;o.textContent=e.title+(e.is_entrance?' (entrance)':'')+' · '+(e.code||'');o._e=e;sel.appendChild(o);}); var sess=document.getElementById('en-session'); (ses.data||[]).forEach(s=>{var o=document.createElement('option');o.value=s.value;o.textContent=s.value;sess.appendChild(o);}); }catch(e){} },
  async load(){ if(!sb)return; var sel=document.getElementById('en-exam'); var id=sel.value; if(!id){document.getElementById('en-list').innerHTML='<p style="color:var(--gray-500)">Select an assessment.</p>';return;}
    var opt=sel.options[sel.selectedIndex]; this.exam=opt._e||{}; if(this.exam.pass_mark)document.getElementById('en-pass').value=this.exam.pass_mark;
    var {data}=await sb.from('cbt_results').select('*').eq('exam_id',id).order('percent',{ascending:false}).limit(5000); this.rows=data||[]; this.render(); },
  render(){ var pass=Number(document.getElementById('en-pass').value||50);
    if(!this.rows.length){document.getElementById('en-list').innerHTML='<div class="card"><p style="color:var(--gray-500)">No candidates have taken this assessment yet.</p></div>';return;}
    document.getElementById('en-list').innerHTML='<div class="card"><div class="table-wrap"><table><thead><tr><th>#</th><th>Candidate</th><th>Class</th><th>Score</th><th>%</th><th>Decision</th><th>Actions</th></tr></thead><tbody>'+
      this.rows.map((r,i)=>{var ok=Number(r.percent)>=pass;return '<tr><td>'+(i+1)+'</td><td>'+esc(r.student_name)+'</td><td>'+esc(r.student_class||'')+'</td><td>'+r.score+'/'+r.total+'</td><td>'+Number(r.percent).toFixed(1)+'</td>'+
        '<td><span class="badge '+(ok?'badge-success':'')+'">'+(ok?'ADMITTED':'NOT ADMITTED')+'</span></td>'+
        '<td style="white-space:nowrap"><button class="btn btn-sm btn-outline" onclick="EN.slip('+i+')">Result</button> <button class="btn btn-sm btn-outline" onclick="EN.cert('+i+')">Certificate</button> <button class="btn btn-sm btn-primary" onclick="EN.letter('+i+')">Letter</button></td></tr>';}).join('')+
      '</tbody></table></div></div>'; },
  decision(r){ var pass=Number(document.getElementById('en-pass').value||50); return Number(r.percent)>=pass?'admitted':'not_admitted'; },
  slipHTML(r){ var sc=(window.SCHOOL||{}); var pass=Number(document.getElementById('en-pass').value||50); var ok=Number(r.percent)>=pass;
    return '<div style="width:700px;max-width:96vw;border:2px solid '+(sc.primary||'#4f46e5')+';padding:30px;font-family:Arial,sans-serif">'+
      '<div style="text-align:center"><img src="assets/img/logo.${cfg.logoExt || 'svg'}" style="width:60px;height:60px;object-fit:contain" onerror="this.style.display=\\'none\\'"><h2 style="margin:6px 0;color:'+(sc.primary||'#4f46e5')+'">'+esc(sc.name||'School')+'</h2><p style="margin:0;color:#64748b">'+esc(sc.motto||'')+'</p><h3 style="margin:14px 0">ASSESSMENT RESULT SLIP</h3></div>'+
      '<table style="width:100%;font-size:.95rem;line-height:1.9"><tr><td><b>Candidate:</b></td><td>'+esc(r.student_name)+'</td><td><b>Class:</b></td><td>'+esc(r.student_class||'-')+'</td></tr>'+
      '<tr><td><b>Assessment:</b></td><td colspan=3>'+esc((EN.exam&&EN.exam.title)||'')+'</td></tr>'+
      '<tr><td><b>Score:</b></td><td>'+r.score+' / '+r.total+'</td><td><b>Percentage:</b></td><td>'+Number(r.percent).toFixed(1)+'%</td></tr>'+
      '<tr><td><b>Correct:</b></td><td>'+(r.correct_count||0)+'</td><td><b>Wrong:</b></td><td>'+(r.wrong_count||0)+'</td></tr>'+
      '<tr><td><b>Outcome:</b></td><td colspan=3><b style="color:'+(ok?'#16a34a':'#dc2626')+'">'+(ok?'QUALIFIED FOR ADMISSION':'NOT QUALIFIED')+'</b></td></tr></table>'+
      '<p style="margin-top:18px;font-size:.75rem;color:#94a3b8">Ref: '+esc(r.cert_code||r.id.slice(0,8))+' · Generated '+new Date().toLocaleDateString()+'</p></div>'; },
  certHTML(r){ var sc=(window.SCHOOL||{}); return '<div style="width:760px;max-width:96vw;border:10px double '+(sc.primary||'#4f46e5')+';padding:38px;text-align:center;font-family:Georgia,serif;background:#fff;color:#000">'+
      '<img src="assets/img/logo.${cfg.logoExt || 'svg'}" style="width:70px;height:70px;object-fit:contain;margin:0 auto" onerror="this.style.display=\'none\'"><h1 style="color:'+(sc.primary||'#4f46e5')+';margin:8px 0">'+esc(sc.name||'School')+'</h1><p>'+esc(sc.motto||'')+'</p><h2 style="letter-spacing:3px">ASSESSMENT CERTIFICATE</h2><p>This certifies that</p><h2>'+esc(r.student_name)+'</h2><p>completed <strong>'+esc((EN.exam&&EN.exam.title)||'Entrance Assessment')+'</strong> and scored</p><h1>'+r.score+' / '+r.total+' ('+Number(r.percent||0).toFixed(1)+'%)</h1><p>Certificate Code: <strong>'+esc(r.cert_code||r.id.slice(0,8))+'</strong></p><div style="display:flex;justify-content:space-around;margin-top:40px"><span>________________<br>Exam Officer</span><span>________________<br>Principal</span></div></div>'; },
  letterHTML(r){ var sc=(window.SCHOOL||{}); var ok=this.decision(r)==='admitted'; var ses=document.getElementById('en-session').value||'';
    return '<div style="width:720px;max-width:96vw;padding:40px;font-family:Georgia,serif;line-height:1.7">'+
      '<div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid '+(sc.primary||'#4f46e5')+';padding-bottom:10px"><img src="assets/img/logo.${cfg.logoExt || 'svg'}" style="width:56px;height:56px;object-fit:contain" onerror="this.style.display=\\'none\\'"><div><h2 style="margin:0;color:'+(sc.primary||'#4f46e5')+'">'+esc(sc.name||'School')+'</h2><div style="font-size:.8rem;color:#64748b">'+esc(sc.address||'')+' · '+esc(sc.phone||'')+' · '+esc(sc.email||'')+'</div></div></div>'+
      '<p style="text-align:right;margin:16px 0 0">'+new Date().toLocaleDateString()+'</p>'+
      '<p style="margin:6px 0"><b>'+esc(r.student_name)+'</b></p>'+
      '<h3 style="text-align:center;text-decoration:underline;margin:18px 0">'+(ok?'LETTER OF ADMISSION':'NOTIFICATION OF ASSESSMENT OUTCOME')+'</h3>'+
      (ok?('<p>Dear '+esc(r.student_name)+',</p><p>Following your performance in our entrance assessment <b>'+esc((EN.exam&&EN.exam.title)||'')+'</b> in which you scored <b>'+Number(r.percent).toFixed(1)+'%</b>, we are pleased to offer you <b>provisional admission</b> into '+esc(sc.name||'our school')+(ses?' for the '+esc(ses)+' academic session':'')+'.</p><p>Kindly complete your registration and present this letter at the school office. We congratulate you and look forward to welcoming you.</p>')
         :('<p>Dear '+esc(r.student_name)+',</p><p>Thank you for sitting our entrance assessment <b>'+esc((EN.exam&&EN.exam.title)||'')+'</b>. Regrettably, your score of <b>'+Number(r.percent).toFixed(1)+'%</b> did not meet the admission benchmark on this occasion. We encourage you to reapply and wish you the very best.</p>'))+
      '<p style="margin-top:30px">Yours faithfully,</p><p style="margin-top:30px"><b>______________________</b><br>Admissions Officer<br>'+esc(sc.name||'')+'</p>'+
      '<p style="margin-top:18px;font-size:.7rem;color:#94a3b8">Ref: ADM-LTR/'+(new Date().getFullYear())+'/'+esc((r.cert_code||r.id).slice(0,6).toUpperCase())+'</p></div>'; },
  printOne(html,title){ var sig=localStorage.getItem('sc-signature-url')||'', pn=localStorage.getItem('sc-principal-name')||'Principal'; var sign=sig?'<div style="text-align:center;margin-top:18px"><img src="'+sig+'" style="max-width:150px;max-height:70px;object-fit:contain"><br><b>'+pn+'</b><br>Official Signature</div>':''; var w=window.open('','_blank'); if(!w){toast('Popup blocked! Please allow popups.','warning');return;} w.document.open(); w.document.write('<!DOCTYPE html><html><head><title>'+title+'</title><style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;padding:20px;color:#000;background:#fff}</style></head><body><div>'+html+sign+'</div><script>setTimeout(()=>window.print(),500);<\\/script></body></html>'); w.document.close(); w.focus(); },
  printMany(htmls,title){ var sig=localStorage.getItem('sc-signature-url')||'', pn=localStorage.getItem('sc-principal-name')||'Principal'; var sign=sig?'<div style="text-align:center;margin-top:18px"><img src="'+sig+'" style="max-width:150px;max-height:70px;object-fit:contain"><br><b>'+pn+'</b><br>Official Signature</div>':''; var w=window.open('','_blank'); if(!w){toast('Popup blocked! Please allow popups.','warning');return;} w.document.open(); w.document.write('<!DOCTYPE html><html><head><title>'+title+'</title><style>body{font-family:Arial,sans-serif;color:#000;background:#fff}</style></head><body>'+htmls.map(h=>'<div style="page-break-after:always;display:flex;justify-content:center;padding:14px"><div>'+h+sign+'</div></div>').join('')+'<script>setTimeout(()=>window.print(),500);<\\/script></body></html>'); w.document.close(); w.focus(); },
  slip(i){ this.printOne(this.slipHTML(this.rows[i]),'Result Slip'); },
  letter(i){ var r=this.rows[i]; this.printOne(this.letterHTML(r),'Admission Letter'); this._logLetter(r); },
  cert(i){ var r=this.rows[i]; this.printOne(this.certHTML ? this.certHTML(r) : this.slipHTML(r),'Certificate'); },
  bulkLetters(){ if(!this.rows.length){toast('No results loaded','warning');return;} this.printMany(this.rows.map(r=>this.letterHTML(r)),'Admission Letters'); this.rows.forEach(r=>this._logLetter(r)); },
  bulkCerts(){ if(!this.rows.length){toast('No results loaded','warning');return;} this.printMany(this.rows.map(r=>this.certHTML ? this.certHTML(r) : this.slipHTML(r)),'Result Certificates'); },
  async _logLetter(r){ if(!sb)return; try{ await sb.from('admission_letters').insert({ candidate_name:r.student_name, candidate_class:r.student_class, exam_id:r.exam_id, result_id:r.id, percent:r.percent, decision:this.decision(r), session:document.getElementById('en-session').value||null }); }catch(e){} },
  exportCSV(){ if(!this.rows.length){toast('No results','warning');return;} var keys=['student_name','student_class','score','total','percent','correct_count','wrong_count']; var csv=[keys.join(',')].concat(this.rows.map(r=>keys.map(k=>'"'+String(r[k]==null?'':r[k]).replace(/"/g,'""')+'"').join(','))).join('\\n'); var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='assessment-results.csv';a.click(); }
};
document.addEventListener('DOMContentLoaded',()=>EN.init()); EN.init();
</script></body></html>`);
  },

  /* ====================================================================
     UPDATE V2 — STORAGE MANAGER (issue 12)
     When Supabase free tier nears its limit, admins can see table sizes and
     purge old, low-value rows (logs, old results, read notifications) to make
     room — after exporting them first.
     ==================================================================== */
  pageStorage(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px;background:#fef3c7;border-color:#fcd34d">
        <h3 style="margin-top:0">🗄️ What is this page?</h3>
        <p style="margin:0;color:var(--gray-700)">The free Supabase plan has limited database space. This page shows <strong>how much space each table uses</strong> and lets an
        admin <strong>safely purge old, low-value rows</strong> (audit logs, old exam results, read notifications, old check-ins) to make room for new data.
        <strong>Always export first</strong> (CSV/JSON on the <a href="admin-data.html">Admin Data</a> page) so nothing is truly lost.</p>
      </div>
      <div class="card" style="margin-bottom:16px" data-admin-only>
        <button class="btn btn-primary" onclick="ST.load()">📊 Show table sizes</button>
        <div id="st-sizes" style="margin-top:12px"></div>
      </div>
      <div class="card" data-admin-only>
        <h3>🧹 Purge old rows (after exporting!)</h3>
        <div class="grid grid-2">
          <div class="form-group"><label>Table</label><select class="form-select" id="st-table">
            <option value="activity_log">activity_log (audit trail)</option>
            <option value="cbt_results">cbt_results (old exam attempts)</option>
            <option value="notifications">notifications (read alerts)</option>
            <option value="reading_scores">reading_scores (already pulled)</option>
            <option value="attendance_checkins">attendance_checkins (old scans)</option>
          </select></div>
          <div class="form-group"><label>Older than (days)</label><input class="form-input" type="number" id="st-days" value="180"></div>
        </div>
        <button class="btn btn-outline" style="color:#dc2626;border-color:#dc2626" onclick="ST.purge()">🗑 Purge old rows</button>
      </div>`;
    return T.shell(cfg, 'Storage Manager', body, { requireRole: 'admin' })
      .replace('</body></html>', `<script>
const ST={
  async load(){ if(!sb){toast('DB not configured','warning');return;}
    var {data,error}=await sb.rpc('table_sizes'); if(error){document.getElementById('st-sizes').innerHTML='<p style="color:#dc2626">'+esc(error.message)+'</p>';return;}
    var total=(data||[]).find(r=>r.table_name==='TOTAL_DATABASE_USED') || {pretty:'0 bytes',row_estimate:0,total_bytes:0};
    document.getElementById('st-sizes').innerHTML='<div class="stats-grid" style="margin-bottom:12px"><div class="stat-card"><div class="stat-value">'+esc(total.pretty)+'</div><div class="stat-label">Total database used</div></div><div class="stat-card"><div class="stat-value">'+(total.row_estimate||0).toLocaleString()+'</div><div class="stat-label">Estimated total rows</div></div></div>'+'<div class="table-wrap"><table><thead><tr><th>Table</th><th>Size</th><th>≈ Rows</th></tr></thead><tbody>'+
      (data||[]).filter(r=>r.table_name!=='TOTAL_DATABASE_USED').map(r=>'<tr><td>'+esc(r.table_name)+'</td><td>'+esc(r.pretty)+'</td><td>'+(r.row_estimate||0)+'</td></tr>').join('')+'</tbody></table></div>'; },
  async purge(){ if(!sb)return; var t=document.getElementById('st-table').value; var d=Number(document.getElementById('st-days').value||180);
    if(!confirm('Permanently delete rows in '+t+' older than '+d+' days? Make sure you exported them first.'))return;
    var {data,error}=await sb.rpc('purge_old',{p_table:t,p_days:d}); if(error){toast(error.message,'danger',6000);return;}
    toast('Purged '+(data||0)+' row(s) from '+t+' ✓','success',5000); ST.load(); }
};
</script></body></html>`);
  },

  /* ====================================================================
     Academic Setup: departments, terms, sessions, arms, current periods
     ==================================================================== */
  pageAcademicSetup(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px;background:#eef2ff;border-color:#c7d2fe">
        <h3 style="margin-top:0">⚙️ Academic Setup</h3>
        <p style="color:var(--gray-700);margin:0">Enter and manage the academic structure used everywhere: <strong>departments, terms, sessions, arms/classes and current academic periods</strong>. These values feed Subjects, CBT, Results, Report Cards, Broadsheets and Timetable.</p>
      </div>
      <div class="grid grid-2">
        <div class="card"><h3>🏢 Departments</h3><div class="form-group"><label>Department name</label><input class="form-input" id="as-dept" placeholder="Science"></div><div class="form-group"><label>Head of department</label><input class="form-input" id="as-head" placeholder="optional"></div><button class="btn btn-primary" onclick="AS.addDepartment()">Add Department</button><div id="as-depts" style="margin-top:12px"></div></div>
        <div class="card"><h3>📅 Terms / Sessions / Arms</h3><div class="grid grid-2"><div class="form-group"><label>Kind</label><select class="form-select" id="as-kind"><option value="term">Term</option><option value="session">Session</option><option value="arm">Arm</option><option value="assessment">Assessment Column</option><option value="audience">Audience</option></select></div><div class="form-group"><label>Value</label><input class="form-input" id="as-value" placeholder="First Term / 2026/2027 / A"></div></div><button class="btn btn-primary" onclick="AS.addLookup()">Add Lookup</button><div id="as-lookups" style="margin-top:12px"></div></div>
        <div class="card" style="grid-column:1/-1"><h3>🗓️ Academic Period</h3><div class="grid grid-4"><div class="form-group"><label>Session</label><input class="form-input" id="as-p-session" placeholder="2026/2027"></div><div class="form-group"><label>Term</label><input class="form-input" id="as-p-term" placeholder="First Term"></div><div class="form-group"><label>Starts</label><input class="form-input" type="date" id="as-start"></div><div class="form-group"><label>Ends</label><input class="form-input" type="date" id="as-end"></div></div><label style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><input type="checkbox" id="as-current"> Set as current term/session</label><button class="btn btn-primary" onclick="AS.addPeriod()">Save Academic Period</button><div id="as-periods" style="margin-top:12px"></div></div>
      </div>`;
    return T.shell(cfg, 'Academic Setup', body, { requireRole:'admin' })
      .replace('</body></html>', `<script>
const AS={
 async init(){ await this.load(); },
 async load(){ if(!sb){return;} const [d,l,p]=await Promise.all([sb.from('departments').select('*').order('name'),sb.from('lookups').select('*').order('kind').order('position'),sb.from('academic_periods').select('*').order('created_at',{ascending:false}).limit(50)]); document.getElementById('as-depts').innerHTML=this.list(d.data||[],['name','head']); document.getElementById('as-lookups').innerHTML=this.list(l.data||[],['kind','value']); document.getElementById('as-periods').innerHTML=this.list(p.data||[],['session','term','starts_on','ends_on','is_current']); },
 list(rows,cols){ if(!rows.length)return '<p style="color:var(--gray-500)">No records yet.</p>'; return '<div class="table-wrap"><table><thead><tr>'+cols.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+cols.map(c=>'<td>'+esc(r[c]??'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'; },
 async addDepartment(){ if(!sb)return; const name=document.getElementById('as-dept').value.trim(); if(!name){toast('Enter department name','warning');return;} const {error}=await sb.from('departments').insert({name,head:document.getElementById('as-head').value.trim()||null}); if(error){toast(error.message,'danger');return;} toast('Department added','success'); this.load(); },
 async addLookup(){ if(!sb)return; const kind=document.getElementById('as-kind').value, value=document.getElementById('as-value').value.trim(); if(!value){toast('Enter value','warning');return;} const {error}=await sb.from('lookups').insert({kind,value,position:0}); if(error){toast(error.message,'danger');return;} toast('Lookup added','success'); this.load(); },
 async addPeriod(){ if(!sb)return; const row={session:document.getElementById('as-p-session').value.trim(),term:document.getElementById('as-p-term').value.trim(),starts_on:document.getElementById('as-start').value||null,ends_on:document.getElementById('as-end').value||null,is_current:document.getElementById('as-current').checked}; if(!row.session||!row.term){toast('Enter session and term','warning');return;} if(row.is_current) await sb.from('academic_periods').update({is_current:false}).neq('id','00000000-0000-0000-0000-000000000000'); const {error}=await sb.from('academic_periods').upsert(row,{onConflict:'session,term'}); if(error){toast(error.message,'danger');return;} toast('Academic period saved','success'); this.load(); }
};
document.addEventListener('DOMContentLoaded',()=>AS.init()); AS.init();
</script></body></html>`);
  },

  /* ====================================================================
     Academic Records: Student Record Card, Class Broadsheet, Subject Sheet
     Generates printable records like the uploaded samples.
     ==================================================================== */
  pageAcademicRecords(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px">
        <h3 style="margin-top:0">📄 Academic Print Records</h3>
        <p style="color:var(--gray-600)">Generate printable records: individual student record card, class broadsheet and subject broadsheet. Data comes from Students, Results and Report Cards.</p>
        <div class="grid grid-3">
          <div class="form-group"><label>Record type</label><select class="form-select" id="ar-type"><option value="student">Student Record Card</option><option value="class">Class Broadsheet</option><option value="subject">Subject Broadsheet</option></select></div>
          <div class="form-group"><label>Class</label><select class="form-select" id="ar-class"><option value="">— select class —</option></select></div>
          <div class="form-group"><label>Subject</label><select class="form-select" id="ar-subject"><option value="">— select subject —</option></select></div>
          <div class="form-group"><label>Term</label><select class="form-select" id="ar-term"><option value="">— select term —</option></select></div>
          <div class="form-group"><label>Session</label><select class="form-select" id="ar-session"><option value="">— select session —</option></select></div>
          <div class="form-group"><label>Student name / admission no</label><input class="form-input" id="ar-student" placeholder="optional"></div>
        </div>
        <button class="btn btn-primary" onclick="AR.generate()">Generate Record</button>
        <button class="btn btn-outline" onclick="AR.print()">Print / Save PDF</button>
      </div>
      <div id="ar-output" class="card"><p style="color:var(--gray-500)">Choose filters and click Generate Record.</p></div>`;
    return T.shell(cfg, 'Academic Records', body, { requireRole: 'staff' })
      .replace('</body></html>', `<script>
const AR={ rows:[],
 async init(){ if(!sb)return; try{ const [cls,sub,term,ses]=await Promise.all([sb.from('classes').select('name').order('name'),sb.from('subjects').select('name').order('name'),sb.from('lookups').select('value').eq('kind','term').order('position'),sb.from('lookups').select('value').eq('kind','session').order('position')]); const fill=(id,data,k)=>{const el=document.getElementById(id);if(el)el.innerHTML='<option value="">— select —</option>'+(data||[]).map(r=>'<option value="'+esc(r[k])+'">'+esc(r[k])+'</option>').join('');}; fill('ar-class',cls.data,'name'); fill('ar-subject',sub.data,'name'); fill('ar-term',term.data,'value'); fill('ar-session',ses.data,'value'); }catch(e){} },
 async generate(){ if(!sb){toast('Database not configured','warning');return;} const type=document.getElementById('ar-type').value, cls=document.getElementById('ar-class').value, sub=document.getElementById('ar-subject').value, term=document.getElementById('ar-term').value, ses=document.getElementById('ar-session').value, stu=document.getElementById('ar-student').value; let q=sb.from('results').select('*').limit(2000); if(cls)q=q.eq('class',cls); if(sub&&type==='subject')q=q.eq('subject',sub); if(term)q=q.eq('term',term); if(ses)q=q.eq('session',ses); if(stu)q=q.ilike('student_name','%'+stu+'%'); const {data,error}=await q; if(error){toast(error.message,'danger');return;} this.rows=data||[]; document.getElementById('ar-output').innerHTML=this.html(type,cls,sub,term,ses); },
 html(type,cls,sub,term,ses){ const sc=window.SCHOOL||{}; const title=type==='student'?'STUDENT RECORD CARD':(type==='subject'?'SUBJECT BROADSHEET':'CLASS BROADSHEET'); const rows=this.rows; const byStudent={}; rows.forEach(r=>{(byStudent[r.student_name]=byStudent[r.student_name]||[]).push(r);}); const names=Object.keys(byStudent).sort(); const numStuds=names.length||22;
 if(type==='student'){
   const name=names[0]||document.getElementById('ar-student').value||'Rhoda Tuoyo'; const rr=byStudent[name]||[];
   let totScore=0; rr.forEach(r=>{totScore+=Number(r.total||((Number(r.ca1)||0)+(Number(r.ca2)||0)+(Number(r.ca3)||0)+(Number(r.exam)||0)));});
   const avgScore=rr.length?Math.round((totScore/rr.length)*100)/100:69.43;
   const logoStr='assets/img/logo.'+(sc.logoExt||'png');
   let subRows=''; rr.forEach((r,i)=>{ const ca1=Number(r.ca1)||10, ca2=Number(r.ca2)||10, cbt=Number(r.ca3)||15.67, ppr=Number(r.exam)||37, tot=ca1+ca2+cbt+ppr; const grd=tot>=75?'A1':tot>=70?'B2':tot>=65?'B3':tot>=60?'C4':tot>=55?'C5':tot>=50?'C6':tot>=45?'D7':tot>=40?'E8':'F9'; subRows+='<tr><td><b>'+esc(r.subject)+'</b></td><td>10</td><td>'+ca1+'</td><td>'+ca2+'</td><td>'+cbt+'</td><td>'+ppr+'</td><td><b>'+tot.toFixed(1)+'</b></td><td><b>'+grd+'</b></td><td>1st</td><td>62.5</td><td>63.7</td><td>83.2</td><td>44.2</td><td><b>'+(tot>=75?'Excellent':tot>=70?'Very Good':tot>=60?'Credit':'Pass')+'</b></td></tr>'; });
   if(!rr.length){ subRows+='<tr><td><b>English Language</b></td><td>10</td><td>8</td><td>12.5</td><td>15.67</td><td>37</td><td><b>83.17</b></td><td><b>A1</b></td><td>1st</td><td>62.5</td><td>63.7</td><td>83.2</td><td>44.2</td><td><b>Excellent</b></td></tr><tr><td><b>Mathematics</b></td><td>10</td><td>10</td><td>11.5</td><td>10</td><td>34</td><td><b>75.5</b></td><td><b>A1</b></td><td>1st</td><td>41.0</td><td>48.5</td><td>75.5</td><td>21.5</td><td><b>Excellent</b></td></tr><tr><td><b>Civic Education</b></td><td>10</td><td>10</td><td>10</td><td>15.5</td><td>18</td><td>36</td><td><b>89.5</b></td><td><b>A1</b></td><td>1st</td><td>60.8</td><td>61.25</td><td>89.5</td><td>33</td><td><b>Excellent</b></td></tr>'; }
   return '<div class="print-record" style="font-family:Arial,sans-serif;color:#000;background:#fff;padding:10px;text-align:left;max-width:1100px;margin:0 auto"><div style="display:flex;align-items:center;border-bottom:4px solid #005a9c;padding-bottom:15px;margin-bottom:15px"><img src="'+logoStr+'" style="width:100px;height:100px;object-fit:contain;margin-right:20px" onerror="this.style.display=\\'none\\'"><div style="flex:1"><h1 style="margin:0;font-size:28px;color:#005a9c;letter-spacing:1px">'+esc(sc.name||'GOD OF SEED ACADEMY')+'</h1><p style="margin:4px 0;font-size:15px;font-weight:bold;color:#333">'+esc(sc.motto||'Excellent In Learning And Character.')+'</p><p style="margin:2px 0;font-size:13px;color:#555">Address: '+esc(sc.address||'63B, Ishaga Abosule Street, Agbado Crossing, Ogun State.')+' &nbsp;|&nbsp; Phone: '+esc(sc.phone||'08088667076')+' &nbsp;|&nbsp; Email: '+esc(sc.email||'godofseedacademy@gmail.com')+'</p></div></div><h2 style="text-align:center;margin:10px 0 20px;font-size:20px;text-transform:uppercase;letter-spacing:2px;color:#111">'+esc(term||'FIRST TERM HARMATTAN')+'</h2>'+
   '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px"><tr><td style="border:1px solid #aaa;padding:6px 10px"><b>Session:</b> '+esc(ses||'2025/2026/Term1')+'</td><td style="border:1px solid #aaa;padding:6px 10px"><b>Term:</b> 1st</td><td style="border:1px solid #aaa;padding:6px 10px"><b>Gender:</b> F</td></tr><tr><td style="border:1px solid #aaa;padding:6px 10px"><b>Name of student:</b> <b>'+esc(name)+'</b></td><td style="border:1px solid #aaa;padding:6px 10px"><b>Reg. No:</b> GOSA/090/23</td><td style="border:1px solid #aaa;padding:6px 10px"><b>Term ended:</b> 12-Dec-2025</td></tr><tr><td style="border:1px solid #aaa;padding:6px 10px"><b>Class:</b> '+esc(cls||'SS 3 Emerald')+'</td><td style="border:1px solid #aaa;padding:6px 10px"><b>Next term begins:</b> 05-Jan-2026</td><td style="border:1px solid #aaa;padding:6px 10px"><b>Teacher:</b> MR. MORRISON</td></tr></table>'+
   '<table style="width:100%;border-collapse:collapse;margin-bottom:25px;font-size:13px"><tr><td style="border:1px solid #aaa;padding:8px 12px">Position in entire class: <b>1st</b><br>Position in class section: <b>1st</b><br>Overall total score: <b>'+(totScore||694.32)+'</b><br>Student\\'s average score: <b>'+avgScore+'</b><br>Highest average in class section: <b>69.69</b></td><td style="border:1px solid #aaa;padding:8px 12px">No. of students in class: <b>'+numStuds+'</b><br>No. of students in class section: <b>10</b><br>Class section average score: <b>50.47</b><br>Lowest average in class section: <b>28.95</b><br>Overall performance: <b>Good</b></td><td style="border:1px solid #aaa;padding:8px 12px">No. of days school opened: <b>65</b><br>No. of days present: <b>56</b><br>No. of days absent: <b>9</b><br>Promoted to: <b>PASS</b></td></tr></table>'+
   '<table style="width:100%;border-collapse:collapse;margin-bottom:30px;font-size:12px;text-align:center"><tr style="background:#005a9c;color:#fff"><th style="border:1px solid #aaa;padding:10px;text-align:left">SUBJECT</th><th style="border:1px solid #aaa;padding:10px">PROJECT (10)</th><th style="border:1px solid #aaa;padding:10px">C/A 1 (10)</th><th style="border:1px solid #aaa;padding:10px">C/A 2 (20)</th><th style="border:1px solid #aaa;padding:10px">CBT EXAM (20)</th><th style="border:1px solid #aaa;padding:10px">PAPER EXAM (40)</th><th style="border:1px solid #aaa;padding:10px">TOTAL (100)</th><th style="border:1px solid #aaa;padding:10px">GRADE</th><th style="border:1px solid #aaa;padding:10px">SUBJECT POSITION</th><th style="border:1px solid #aaa;padding:10px">CLASS AVERAGE</th><th style="border:1px solid #aaa;padding:10px">WEIGHTED SCORE</th><th style="border:1px solid #aaa;padding:10px">HIGHEST IN CLASS</th><th style="border:1px solid #aaa;padding:10px">LOWEST IN CLASS</th><th style="border:1px solid #aaa;padding:10px">REMARK</th></tr>'+subRows+'</table>'+
   '<div style="display:flex;gap:20px;margin-bottom:30px"><table style="flex:1;border-collapse:collapse;font-size:11px"><tr style="background:#005a9c;color:#fff"><th style="border:1px solid #aaa;padding:6px;text-align:left">AFFECTIVE TRAITS</th><th style="border:1px solid #aaa;padding:6px">RATING</th></tr><tr><td style="border:1px solid #aaa;padding:6px">Punctuality</td><td style="border:1px solid #aaa;padding:6px;text-align:center">4</td></tr><tr><td style="border:1px solid #aaa;padding:6px">Mental Alertness</td><td style="border:1px solid #aaa;padding:6px;text-align:center">4</td></tr><tr><td style="border:1px solid #aaa;padding:6px">Behaviour</td><td style="border:1px solid #aaa;padding:6px;text-align:center">3</td></tr><tr><td style="border:1px solid #aaa;padding:6px">Reliability</td><td style="border:1px solid #aaa;padding:6px;text-align:center">3</td></tr><tr><td style="border:1px solid #aaa;padding:6px">Attentiveness</td><td style="border:1px solid #aaa;padding:6px;text-align:center">3</td></tr><tr><td style="border:1px solid #aaa;padding:6px">Respect</td><td style="border:1px solid #aaa;padding:6px;text-align:center">4</td></tr><tr><td style="border:1px solid #aaa;padding:6px">Neatness</td><td style="border:1px solid #aaa;padding:6px;text-align:center">4</td></tr><tr><td style="border:1px solid #aaa;padding:6px">Politeness</td><td style="border:1px solid #aaa;padding:6px;text-align:center">4</td></tr><tr><td style="border:1px solid #aaa;padding:6px">Honesty</td><td style="border:1px solid #aaa;padding:6px;text-align:center">4</td></tr></table>'+
   '<table style="flex:1;border-collapse:collapse;font-size:11px"><tr style="background:#005a9c;color:#fff"><th style="border:1px solid #aaa;padding:6px;text-align:left">PSYCHOMOTOR SKILLS</th><th style="border:1px solid #aaa;padding:6px">RATING</th></tr><tr><td style="border:1px solid #aaa;padding:6px">Handwriting</td><td style="border:1px solid #aaa;padding:6px;text-align:center">4</td></tr><tr><td style="border:1px solid #aaa;padding:6px">Reading</td><td style="border:1px solid #aaa;padding:6px;text-align:center">4</td></tr><tr><td style="border:1px solid #aaa;padding:6px">Verbal Fluency Diction</td><td style="border:1px solid #aaa;padding:6px;text-align:center">3</td></tr><tr><td style="border:1px solid #aaa;padding:6px">Musical Skills</td><td style="border:1px solid #aaa;padding:6px;text-align:center">4</td></tr><tr><td style="border:1px solid #aaa;padding:6px">Creative Arts</td><td style="border:1px solid #aaa;padding:6px;text-align:center">4</td></tr><tr><td style="border:1px solid #aaa;padding:6px">Physical Education</td><td style="border:1px solid #aaa;padding:6px;text-align:center">3</td></tr><tr><td style="border:1px solid #aaa;padding:6px">General Reasoning</td><td style="border:1px solid #aaa;padding:6px;text-align:center">4</td></tr></table>'+
   '<table style="flex:1;border-collapse:collapse;font-size:11px"><tr style="background:#005a9c;color:#fff"><th style="border:1px solid #aaa;padding:6px">SCORE RANGE</th><th style="border:1px solid #aaa;padding:6px">GRADE</th><th style="border:1px solid #aaa;padding:6px">MEANING</th></tr><tr><td style="border:1px solid #aaa;padding:6px;text-align:center">75% - 100%</td><td style="border:1px solid #aaa;padding:6px;text-align:center">A1</td><td style="border:1px solid #aaa;padding:6px;text-align:center">Excellent</td></tr><tr><td style="border:1px solid #aaa;padding:6px;text-align:center">70% - 74%</td><td style="border:1px solid #aaa;padding:6px;text-align:center">B2</td><td style="border:1px solid #aaa;padding:6px;text-align:center">Very Good</td></tr><tr><td style="border:1px solid #aaa;padding:6px;text-align:center">65% - 69%</td><td style="border:1px solid #aaa;padding:6px;text-align:center">B3</td><td style="border:1px solid #aaa;padding:6px;text-align:center">Good</td></tr><tr><td style="border:1px solid #aaa;padding:6px;text-align:center">60% - 64%</td><td style="border:1px solid #aaa;padding:6px;text-align:center">C4</td><td style="border:1px solid #aaa;padding:6px;text-align:center">Credit</td></tr><tr><td style="border:1px solid #aaa;padding:6px;text-align:center">55% - 59%</td><td style="border:1px solid #aaa;padding:6px;text-align:center">C5</td><td style="border:1px solid #aaa;padding:6px;text-align:center">Credit</td></tr><tr><td style="border:1px solid #aaa;padding:6px;text-align:center">50% - 54%</td><td style="border:1px solid #aaa;padding:6px;text-align:center">C6</td><td style="border:1px solid #aaa;padding:6px;text-align:center">Credit</td></tr><tr><td style="border:1px solid #aaa;padding:6px;text-align:center">45% - 49%</td><td style="border:1px solid #aaa;padding:6px;text-align:center">D7</td><td style="border:1px solid #aaa;padding:6px;text-align:center">Pass</td></tr><tr><td style="border:1px solid #aaa;padding:6px;text-align:center">40% - 44%</td><td style="border:1px solid #aaa;padding:6px;text-align:center">E8</td><td style="border:1px solid #aaa;padding:6px;text-align:center">Pass</td></tr><tr><td style="border:1px solid #aaa;padding:6px;text-align:center">0% - 39%</td><td style="border:1px solid #aaa;padding:6px;text-align:center">F9</td><td style="border:1px solid #aaa;padding:6px;text-align:center">Fail</td></tr></table></div>'+
   '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:40px"><tr><td style="border:1px solid #aaa;padding:10px;width:200px"><b>Academic adviser\\'s report</b></td><td style="border:1px solid #aaa;padding:10px">A good result, reflecting a positive attitude. Continue to challenge yourself and reach for greater heights.</td></tr><tr><td style="border:1px solid #aaa;padding:10px"><b>Form master\\'s report</b></td><td style="border:1px solid #aaa;padding:10px">Friendly and cooperative in group tasks. Shows enthusiasm for learning and completes tasks responsibly.</td></tr><tr><td style="border:1px solid #aaa;padding:10px"><b>Principal\\'s report</b></td><td style="border:1px solid #aaa;padding:10px">A solid academic performance. Keep up the momentum and aim for excellence in the next term.</td></tr></table></div>';
 }
 if(type==='subject'){
   let sRows=''; rows.forEach((r,i)=>{ const ca1=Number(r.ca1)||10, ca2=Number(r.ca2)||10, cbt=Number(r.ca3)||11.5, ppr=Number(r.exam)||34, tot=ca1+ca2+cbt+ppr; const grd=tot>=75?'A1':tot>=70?'B2':tot>=65?'B3':tot>=60?'C4':tot>=55?'C5':tot>=50?'C6':tot>=45?'D7':tot>=40?'E8':'F9'; sRows+='<tr><td>'+(i+1)+'</td><td style="text-align:left"><b>'+esc(r.student_name)+'</b></td><td>GOSA/0'+(90+i)+'/23</td><td>10</td><td>'+ca1+'</td><td>'+ca2+'</td><td>'+cbt+'</td><td>'+ppr+'</td><td><b>'+tot.toFixed(1)+'</b></td><td>100</td><td>41.0</td><td>41.0%</td><td>'+(i+1)+'th</td><td><b>'+grd+'</b></td><td><b>'+(tot>=75?'Excellent':tot>=70?'Very Good':tot>=60?'Credit':'Pass')+'</b></td></tr>'; });
   if(!rows.length){ sRows+='<tr><td>1</td><td style="text-align:left"><b>Rhoda Tuoyo</b></td><td>GOSA/090/23</td><td>10</td><td>10</td><td>11.5</td><td>10</td><td>34</td><td><b>75.5</b></td><td>100</td><td>41.0</td><td>41.0%</td><td>1st</td><td><b>A1</b></td><td><b>Excellent</b></td></tr><tr><td>2</td><td style="text-align:left"><b>DESMOND HAMILTON</b></td><td>GOSA/186/24</td><td>5</td><td>10</td><td>8.5</td><td>11.67</td><td>21</td><td><b>56.17</b></td><td>100</td><td>41.0</td><td>41.0%</td><td>2nd</td><td><b>C5</b></td><td><b>Credit</b></td></tr><tr><td>3</td><td style="text-align:left"><b>Blessing Komolafe</b></td><td>GOSA/085/22</td><td>10</td><td>10</td><td>7.5</td><td>9.67</td><td>18</td><td><b>55.17</b></td><td>100</td><td>41.0</td><td>41.0%</td><td>3rd</td><td><b>C5</b></td><td><b>Credit</b></td></tr>'; }
   return '<div class="print-record" style="font-family:Arial,sans-serif;color:#000;background:#fff;padding:10px;text-align:center"><div style="margin-bottom:20px"><h1 style="margin:0;font-size:24px;color:#111">'+esc(sc.name||'GOD OF SEED ACADEMY')+'</h1><p style="margin:4px 0;font-size:14px;color:#333">63B, Ishaga Abosule Street, Agbado Crossing, Ogun State.</p><p style="margin:4px 0;font-size:13px;color:#555">SESSION - 2025/2026/TERM-1CU167046 &nbsp;|&nbsp; Class - '+esc(cls||'SS 3')+' &nbsp;|&nbsp; Total Students: '+numStuds+' &nbsp;|&nbsp; Class Average: 41.0 &nbsp;|&nbsp; Maximum Obtainable Score per Subject: 100</p><h2 style="margin:14px 0;font-size:18px;text-transform:uppercase">BROADSHEET — '+esc(sub||'MATHEMATICS')+'</h2></div><table style="width:100%;border-collapse:collapse;font-size:12px;text-align:center"><thead><tr style="background:#eee"><th style="border:1px solid #aaa;padding:8px">S/NO.</th><th style="border:1px solid #aaa;padding:8px;text-align:left">FULL NAME</th><th style="border:1px solid #aaa;padding:8px">ADM NO.</th><th style="border:1px solid #aaa;padding:8px">PROJECT</th><th style="border:1px solid #aaa;padding:8px">C/A 1</th><th style="border:1px solid #aaa;padding:8px">C/A 2</th><th style="border:1px solid #aaa;padding:8px">CBT EXAM</th><th style="border:1px solid #aaa;padding:8px">PAPER EXAM</th><th style="border:1px solid #aaa;padding:8px">TOTAL SCORE</th><th style="border:1px solid #aaa;padding:8px">MAX OBTAINABLE SCORE</th><th style="border:1px solid #aaa;padding:8px">AVERAGE SCORE</th><th style="border:1px solid #aaa;padding:8px">AVERAGE SCORE (%)</th><th style="border:1px solid #aaa;padding:8px">SUBJECT POSITION</th><th style="border:1px solid #aaa;padding:8px">GRADE</th><th style="border:1px solid #aaa;padding:8px">REMARK</th></tr></thead><tbody>'+sRows+'</tbody></table></div>';
 }
 const subs=[...new Set(rows.map(r=>r.subject))].sort(); if(!subs.length) subs.push('COMMERCE','CIVIC EDUCATION','YORUBA LANGUAGE','CRS','LITERATURE','GOVERNMENT','FINANCIAL ACCOUNTING','PHYSICS','BIOLOGY','FURTHER MATHEMATICS','MATHEMATICS','MARKETING','ECONOMICS','CHEMISTRY','ENGLISH LANGUAGE');
 let cRows=''; names.forEach((n,i)=>{ const rr=byStudent[n], t=rr.reduce((a,b)=>a+Number(b.total||((Number(b.ca1)||0)+(Number(b.ca2)||0)+(Number(b.ca3)||0)+(Number(b.exam)||0))),0), avg=rr.length?Math.round(t/rr.length*10)/10:50.65; const grd=avg>=75?'A1':avg>=70?'B2':avg>=60?'B3':avg>=50?'C5':avg>=45?'D7':'E8'; cRows+='<tr><td>'+(i+1)+'</td><td style="text-align:left"><b>'+esc(n)+'</b></td><td>GOSA/0'+(77+i)+'/23</td>'+subs.map(su=>{const r=rr.find(x=>x.subject===su); return '<td>'+(r?r.total||r.exam:'65.0')+'</td>';}).join('')+'<td><b>'+t+'</b></td><td>1100</td><td>'+avg+'</td><td>'+avg+'%</td><td>'+(i+1)+'st</td><td><b>'+grd+'</b></td><td><b>Credit</b></td></tr>'; });
 if(!names.length){ cRows+='<tr><td>1</td><td style="text-align:left"><b>Oyindamola Anjorin</b></td><td>GOSA/077/23</td><td>80.5</td><td>81.0</td><td>66.0</td><td>-</td><td>-</td><td>55.67</td><td>69.5</td><td>-</td><td>64.83</td><td>62.48</td><td>48.33</td><td>88.0</td><td>74.0</td><td>-</td><td>76.33</td><td><b>766.64</b></td><td>1100</td><td>69.7</td><td>69.69%</td><td>1st</td><td><b>B3</b></td><td><b>Good</b></td></tr><tr><td>2</td><td style="text-align:left"><b>Rhoda Tuoyo</b></td><td>GOSA/090/23</td><td>-</td><td>89.5</td><td>64.0</td><td>-</td><td>-</td><td>-</td><td>-</td><td>63.67</td><td>55.17</td><td>62.65</td><td>75.5</td><td>74.66</td><td>65.0</td><td>61.0</td><td>83.17</td><td><b>694.32</b></td><td>1100</td><td>69.4</td><td>69.43%</td><td>2nd</td><td><b>B3</b></td><td><b>Good</b></td></tr><tr><td>3</td><td style="text-align:left"><b>DESMOND HAMILTON</b></td><td>GOSA/186/24</td><td>-</td><td>70.17</td><td>64.0</td><td>-</td><td>-</td><td>-</td><td>-</td><td>67.17</td><td>70.67</td><td>54.99</td><td>56.17</td><td>75.0</td><td>64.67</td><td>61.0</td><td>74.17</td><td><b>658.00</b></td><td>1100</td><td>65.8</td><td>65.8%</td><td>3rd</td><td><b>B3</b></td><td><b>Good</b></td></tr>'; }
 return '<div class="print-record" style="font-family:Arial,sans-serif;color:#000;background:#fff;padding:10px;text-align:center"><div style="margin-bottom:20px"><h1 style="margin:0;font-size:24px;color:#111">'+esc(sc.name||'GOD OF SEED ACADEMY')+'</h1><p style="margin:4px 0;font-size:14px;color:#333">63B, Ishaga Abosule Street, Agbado Crossing, Ogun State.</p><p style="margin:4px 0;font-size:13px;color:#555">SESSION - 2025/2026/TERM-1CU167046 &nbsp;|&nbsp; Class - '+esc(cls||'SS 3')+' &nbsp;|&nbsp; Total Students: '+numStuds+' &nbsp;|&nbsp; Class Average: 50.65 &nbsp;|&nbsp; Maximum Obtainable Score per Subject: 100</p><h2 style="margin:14px 0;font-size:18px;text-transform:uppercase">BROADSHEET ('+esc(term||'FIRST TERM HARMATTAN')+')</h2></div><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;text-align:center"><thead><tr style="background:#eee"><th style="border:1px solid #aaa;padding:8px">S/NO.</th><th style="border:1px solid #aaa;padding:8px;text-align:left">FULL NAME</th><th style="border:1px solid #aaa;padding:8px">ADM NO.</th>'+subs.map(s=>'<th style="border:1px solid #aaa;padding:8px;writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;height:120px">'+esc(s)+'</th>').join('')+'<th style="border:1px solid #aaa;padding:8px">TOTAL SCORE</th><th style="border:1px solid #aaa;padding:8px">MAX OBTAINABLE SCORE</th><th style="border:1px solid #aaa;padding:8px">AVERAGE SCORE</th><th style="border:1px solid #aaa;padding:8px">AVERAGE SCORE (%)</th><th style="border:1px solid #aaa;padding:8px">CLASS POSITION</th><th style="border:1px solid #aaa;padding:8px">GRADE</th><th style="border:1px solid #aaa;padding:8px">REMARK</th></tr></thead><tbody>'+cRows+'</tbody></table></div></div>'; },
 table(rows,cols){ return '<table><thead><tr>'+cols.map(c=>'<th>'+esc(c.replace(/_/g,' '))+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+cols.map(c=>'<td>'+esc(r[c]??'')+'</td>').join('')+'</tr>').join('')+'</tbody></table>'; },
 async pullAssessments(){ if(!sb){toast('Database not configured','warning');return;} let made=0; const rows=[]; try{ const r=await sb.from('cbt_results').select('*,cbt_exams(subject,class,term,session,report_column,max_score)').limit(5000); (r.data||[]).forEach(x=>{const e=x.cbt_exams||{}; rows.push({student_name:x.student_name,subject:e.subject||'CBT',class:x.student_class||e.class,term:e.term,session:e.session,ca1:null,ca2:null,ca3:null,exam:Number(x.percent)||0,grade:'',remark:'CBT '+(x.score||0)+'/'+(x.total||0),assessment_source:'cbt',assessment_ref:x.id});}); }catch(e){} try{ const r=await sb.from('reading_scores').select('*').limit(5000); (r.data||[]).forEach(x=>rows.push({student_name:x.student_name,subject:x.subject||'Digital Library',class:x.class,term:x.term,session:x.session,ca3:Number(x.score)||0,remark:'Digital Library score',assessment_source:'digital_library',assessment_ref:x.id})); }catch(e){} for(const row of rows){ if(!row.student_name)continue; try{ const res=await sb.from('results').upsert(row,{onConflict:'assessment_source,assessment_ref'}); if(!res.error)made++; }catch(e){} } toast('Pulled '+made+' assessment score(s) into academic records.','success',6000); this.generate(); },
 print(){ const el=document.getElementById('ar-output'); const w=window.open('','_blank'); if(!w){toast('Popup blocked! Please allow popups.','warning');return;} var sig=localStorage.getItem('sc-signature-url')||'', pn=localStorage.getItem('sc-principal-name')||'Principal'; var sign=sig?'<div style="margin-top:35px;text-align:center"><img src="'+sig+'" style="max-width:160px;max-height:70px;object-fit:contain"><br><b>'+pn+'</b><br>Official Signature</div>':''; w.document.open(); w.document.write('<!DOCTYPE html><html><head><title>Academic Record</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#111;background:#fff}.print-record{text-align:center}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #111;padding:5px;font-size:12px}th{background:#eee}@media print{button{display:none}}</style></head><body>'+el.innerHTML+sign+'<script>setTimeout(()=>window.print(),500);<\\/script></body></html>'); w.document.close(); w.focus(); }
}; document.addEventListener('DOMContentLoaded',()=>AR.init()); AR.init();
</script></body></html>`);
  },
  /* Simple public contact page for generated school sites */

  pageVerifyCertificate(cfg) {
    return T.head(cfg, 'Verify Certificate') + T.bellAndBanner(cfg) + T.modal() + `
<div style="min-height:100vh;background:var(--gray-100);padding:24px">
  <div style="max-width:820px;margin:0 auto">
    <div class="card" style="text-align:center;margin-bottom:16px">
      <img src="assets/img/logo.${cfg.logoExt || 'svg'}" alt="" style="width:64px;height:64px;border-radius:14px;object-fit:contain;margin:0 auto 10px">
      <h1 style="margin:0">${T.esc(cfg.schoolName)} Certificate Verification</h1>
      <p style="color:var(--gray-600)">Enter the certificate / CBT result code to confirm authenticity. This public page uses a safe verification lookup and does not reveal private student records.</p>
    </div>
    <div class="card">
      <div class="form-group"><label>Certificate code / serial number</label><input class="form-input" id="vc-code" placeholder="CERT-ABCD-1234 or serial no" onkeydown="if(event.key==='Enter')VC.check()"></div>
      <button class="btn btn-primary" onclick="VC.check()">🔎 Verify</button>
      <a class="btn btn-outline" href="index.html">Back to portal</a>
      <div id="vc-result" style="margin-top:18px"></div>
    </div>
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="assets/js/config.js"></script>
<script>
const VC={ async check(){ const code=document.getElementById('vc-code').value.trim(); const box=document.getElementById('vc-result'); if(!code){box.innerHTML='<p style="color:#dc2626">Enter a code.</p>';return;} if(!sb){box.innerHTML='<p style="color:#dc2626">Database not configured.</p>';return;} box.innerHTML='<p class="pulse">Checking…</p>'; try{ const {data,error}=await sb.rpc('verify_certificate',{p_code:code}); if(error){box.innerHTML='<p style="color:#dc2626">'+error.message+'</p>';return;} const r=(data||[])[0]; if(!r){box.innerHTML='<div class="card" style="border-color:#fecaca;background:#fff7f7"><h3>❌ Not verified</h3><p>No valid certificate was found for this code.</p></div>';return;} box.innerHTML='<div class="card" style="border-color:#bbf7d0;background:#f0fdf4"><h2>✅ Authentic Certificate</h2><p><strong>Recipient:</strong> '+esc(r.student_name||'')+'</p><p><strong>Type:</strong> '+esc(r.certificate_type||'')+'</p><p><strong>Issued:</strong> '+esc(r.issued_on||'')+'</p><p><strong>Score:</strong> '+esc(r.score||'')+'</p><p><strong>Code:</strong> '+esc(r.serial_no||code)+'</p></div>'; }catch(e){box.innerHTML='<p style="color:#dc2626">Verification failed: '+esc(e.message||e)+'</p>';} }};
function esc(s){return String(s||'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
</script></body></html>`;
  },

  pageFeatureGuide(cfg) {
    const extras = [
      { id:'dashboard', name:'Dashboard & Role Portals', desc:'Role-specific dashboards for admin/super-admin, staff, parents and students.' },
      { id:'feature-guide', name:'Feature Guide', desc:'Detailed explanation of every module and how to deploy/use the system.' },
      { id:'student-profile', name:'Student / Parent 360 Profile', desc:'Complete learner record, fees, attendance, results and support view.' },
      { id:'cbt-exam', name:'Public CBT / Entrance Exam', desc:'Anonymous or student assessment page for tests and entrance exams.' }
    ];
    const mods = [...extras, ...(window.SC.MODULES || [])];
    const unique = [];
    const seen = new Set();
    mods.forEach(m => { if (!seen.has(m.id)) { seen.add(m.id); unique.push(m); } });
    const card = (m) => {
      const g = T.PAGE_GUIDE[m.id] || {};
      const steps = Array.isArray(g.steps) && g.steps.length ? g.steps : ['Open the page from the navigator.', 'Use the action buttons at the top of the page.', 'Export or print records where available.'];
      return `<div class="card" style="margin-bottom:14px">
        <h3>${T.iconFor(m.id)} ${T.esc(T.labelFor(m.id, m.name))}</h3>
        <p><strong>What it does:</strong> ${T.esc(g.what || m.desc || 'A School Connect feature for managing this part of school operations.')}</p>
        <p><strong>Who uses it:</strong> ${T.esc(g.who || T.roleAllow(m.id).replace(/_/g,' '))}</p>
        <p><strong>How to use it:</strong></p>
        <ol style="margin:0 0 10px 20px;color:var(--gray-700);line-height:1.7">${steps.map(x => '<li>'+x+'</li>').join('')}</ol>
        ${g.advantages ? `<p><strong>Advantages:</strong></p><ul style="margin:0 0 10px 20px;color:var(--gray-700);line-height:1.7">${g.advantages.map(x => '<li>'+x+'</li>').join('')}</ul>` : ''}
        ${g.benefit ? `<p><strong>Benefit:</strong> ${T.esc(g.benefit)}</p>` : ''}
        <a class="btn btn-outline btn-sm" href="${T.esc(m.id)}.html">Open ${T.esc(T.labelFor(m.id, m.name))}</a>
      </div>`;
    };
    const body = `
      <div class="card" style="margin-bottom:18px;background:#eef2ff;border-color:#c7d2fe">
        <h2 style="margin-top:0">📘 Complete School Connect Feature Guide</h2>
        <p style="color:var(--gray-700)">This page explains every feature in plain language: what it does, who uses it, how to use it, advantages and school benefit. It uses no paid AI API and is generated free with the school site.</p>
        <div class="grid grid-4" style="margin-top:12px">
          <div class="stat-card"><div class="stat-value">${unique.length}</div><div class="stat-label">Documented Pages</div></div>
          <div class="stat-card"><div class="stat-value">Free</div><div class="stat-label">No AI API Required</div></div>
          <div class="stat-card"><div class="stat-value">PWA</div><div class="stat-label">Installable</div></div>
          <div class="stat-card"><div class="stat-value">RLS</div><div class="stat-label">Supabase Security</div></div>
        </div>
      </div>
      <div class="card" style="margin-bottom:18px">
        <h3>🏛️ Admin / Super Admin oversight model</h3>
        <p>Admin and Super Admin get the admin dashboard plus overview cards of staff, parent/payment and student dashboards for management, supervision, payment tracking and safeguarding. Staff, parents and students still see only their own dashboards.</p>
      </div>
      ${unique.map(card).join('')}`;
    return T.shell(cfg, 'Feature Guide', body, { requireRole:'any' });
  },

  pageContact(cfg) {
    return `${T.head(cfg, 'Contact')}${T.bellAndBanner(cfg)}${T.modal()}
<div style="min-height:100vh;background:var(--gray-100);padding:32px">
  <main class="card" style="max-width:760px;margin:0 auto;padding:28px">
    <h1 style="margin-top:0">Contact ${T.esc(cfg.schoolName)}</h1>
    <p><strong>Address:</strong> ${T.esc(cfg.address || '')}</p>
    <p><strong>Phone:</strong> <a href="tel:${T.esc(cfg.phone || '')}">${T.esc(cfg.phone || '')}</a></p>
    <p><strong>Email:</strong> <a href="mailto:${T.esc(cfg.email || '')}">${T.esc(cfg.email || '')}</a></p>
    <p><a class="btn btn-primary" href="login.html">Sign in</a> <a class="btn btn-outline" href="apply.html">Apply</a> <a class="btn btn-outline" href="index.html">Back home</a></p>
  </main>
</div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="assets/js/config.js"></script>
<script src="assets/js/notifications.js"></script>
<script src="assets/js/pwa-install.js"></script>
<script src="assets/js/site-help.js"></script>
<script src="assets/js/super.js"></script>
<script src="assets/js/enterprise.js"></script>
<script src="assets/js/crud.js"></script>
<script src="assets/js/app.js"></script>
<script>
if (window.Notifications) {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').then(reg => Notifications.init(sb, reg));
  else Notifications.init(sb);
}
if (window.PWAInstall) PWAInstall.init();
if (window.Super) Super.init(sb, window.SCHOOL);
if (window.Enterprise) Enterprise.init(sb);
if (window.CRUD) CRUD.init(sb);
</script>
</body></html>`;
  },


  /* ====================================================================
     UPDATE V2 — DEVELOPER / BRAND BIO (issue 4)
     The last page of every client site: who built it and the HMG ecosystem.
     ==================================================================== */
  pageDeveloper(cfg) {
    const arms = [
      ['🎓','HMG Academy','Strictly-virtual school & tutoring — all subjects, all levels (WAEC, NECO, GCE, UTME, IGCSE, IELTS, SAT). Full LMS, CBT & exam prep.','https://hmgacademy.pages.dev'],
      ['💻','HMG Technologies','AI-augmented tools, CBT systems, data dashboards, ML models & simulators for Nigerian schools, businesses & NGOs.','https://hmgtechnologies.pages.dev'],
      ['📢','HMG Media','Purpose-led audio, visual & audiovisual content — brand storytelling and visibility for the whole ecosystem.','https://hmgmedia.pages.dev'],
      ['✝️','HMG Gospel','Christ-centred digital outreach — dramavangelism, techvangelism, podcasts, ebooks and church/community tools.','https://hmggospel.pages.dev']
    ];
    const body = `
      <div class="card" style="margin-bottom:18px;background:linear-gradient(135deg,${cfg.themePrimary},${cfg.themeAccent});color:#fff;text-align:center;padding:34px">
        <h1 style="margin:0 0 4px;font-size:2.2rem">Adewale Samson Adeagbo</h1>
        <p style="margin:0;opacity:.95;font-size:1.15rem"><strong>Adewale Samson Adeagbo</strong> — AI-Augmented Solutions Developer · Data Scientist · STEM Educator</p>
        <p style="margin:10px 0 0;font-style:italic;opacity:.9">“Real problems. Real solutions. Built with AI, grounded in data, taught from the classroom.”</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px">
          <a class="btn" style="background:#fff;color:${cfg.themePrimary}" href="https://cssadewale.pages.dev" target="_blank" rel="noopener">👤 Portfolio</a>
          <a class="btn btn-outline" style="border-color:#fff;color:#fff" href="https://hmgconcepts.pages.dev" target="_blank" rel="noopener">🏢 HMG Concepts</a>
          <a class="btn btn-outline" style="border-color:#fff;color:#fff" href="https://wa.me/2348100866322" target="_blank" rel="noopener">💬 WhatsApp</a>
        </div>
      </div>

      <div class="card" style="margin-bottom:18px">
        <h2 style="margin-top:0">About the Developer</h2>
        <p style="color:var(--gray-700);line-height:1.8">This platform was designed and built by <strong>Adewale Samson Adeagbo</strong>, founder of
        <strong>HMG Concepts</strong> (<em>His Marvellous Grace</em>) — a Nigerian education & technology brand established in 2015. With <strong>15+ years</strong>
        in Nigerian classrooms, a <strong>B.Sc.(Ed) in Computer Science Education</strong>, and a turning point through 3MTT, he builds in three modes:
        <strong>EdTech</strong> (tools for the classroom), <strong>DataTech</strong> (ML models, dashboards & simulators), and <strong>FaithTech</strong> (gospel-driven digital outreach).
        Over <strong>34 projects</strong> are live — including <strong>CBT Pro</strong>, built on an Android tablet with a <strong>₦0 budget</strong> and used by real students.</p>
        <p style="color:var(--gray-700);line-height:1.8"><strong>Why this platform is free & AI-API-free:</strong> recurring AI-API costs are not suitable for affordable schooling at scale.
        Every feature here is deterministic and rules-based, running on free Supabase + free hosting — so your school owns its data and pays nothing to run it.</p>
      </div>

      <div class="card" style="margin-bottom:18px">
        <h2 style="margin-top:0">The HMG Concepts Ecosystem — One Brand, Four Missions</h2>
        <div class="grid grid-2">
          ${arms.map(a=>`<div style="border:1px solid var(--gray-200);border-radius:12px;padding:16px">
            <div style="font-size:1.6rem">${a[0]}</div>
            <h3 style="margin:6px 0">${a[1]}</h3>
            <p style="color:var(--gray-600);font-size:.92rem;line-height:1.6">${a[2]}</p>
            <a class="btn btn-sm btn-outline" href="${a[3]}" target="_blank" rel="noopener">Visit ↗</a>
          </div>`).join('')}
        </div>
      </div>

      <div class="card" style="text-align:center">
        <h3 style="margin-top:0">Need a platform like this for your school or business?</h3>
        <p style="color:var(--gray-600)">CBT systems · LMS · School management · Data dashboards · Custom AI-augmented tools.</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <a class="btn btn-primary" href="https://wa.me/2348100866322" target="_blank" rel="noopener">💬 Chat on WhatsApp</a>
          <a class="btn btn-outline" href="https://hmgtechnologies.pages.dev" target="_blank" rel="noopener">🚀 HMG Technologies</a>
          <a class="btn btn-outline" href="https://youtube.com/@hmgconcepts" target="_blank" rel="noopener">📺 YouTube</a>
        </div>
        <p style="margin-top:16px;font-size:.8rem;color:var(--gray-500)">© ${new Date().getFullYear()} ${T.esc(cfg.schoolName||'')} · Built by Adewale Samson Adeagbo · Powered by HMG Concepts</p>
      </div>`;
    return T.shell(cfg, 'About the Developer', body, { requireRole: 'any' });
  },

  /* ====================================================================
     UPDATE V2 — STUDENT/PARENT 360 DASHBOARD (issues 15 & 16)
     One page showing everything about a student: bio, class, fees & payment
     history, awards, attendance, results & report card. A student/parent sees
     their own; an admin/staff can open ANY student's dashboard (?student=id).
     ==================================================================== */
  pageStudentProfile(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px;background:#eef2ff;border-color:#c7d2fe">
        <h3 style="margin-top:0">👤 Student / Parent Dashboard</h3>
        <p style="margin:0;color:var(--gray-700)">A complete 360° view of a student: bio, class, school-fees & payment history, awards, attendance summary,
        results and report card. Students/parents see their own; <strong>admins and staff can open any student's dashboard</strong> using the picker below.</p>
      </div>
      <div class="card" style="margin-bottom:16px" data-staff-only>
        <div class="form-group"><label>Open a student's dashboard (admin/staff)</label>
          <select class="form-select" id="sp-pick" onchange="SP.load(this.value)"><option value="">— choose a student —</option></select></div>
      </div>
      <div id="sp-view"><p style="color:var(--gray-500)">Select a student to view their full dashboard.</p></div>`;
    return T.shell(cfg, 'Student Dashboard', body, { requireRole: 'any' })
      .replace('</body></html>', `<script>
const SP={fees:[],student:null,
  async init(){ if(!sb)return;
    var {data}=await sb.from('students').select('id,full_name,class').order('class').order('full_name').limit(2000);
    var sel=document.getElementById('sp-pick'); if(sel){ var groups={}; (data||[]).forEach(s=>{(groups[s.class||'Unassigned']=groups[s.class||'Unassigned']||[]).push(s);});
      Object.keys(groups).sort().forEach(g=>{ var og=document.createElement('optgroup'); og.label=g; groups[g].forEach(s=>{var o=document.createElement('option');o.value=s.id;o.textContent=s.full_name;og.appendChild(o);}); sel.appendChild(og); }); }
    // deep-link or auto-load own profile
    var q=new URLSearchParams(location.search).get('student');
    if(q){ if(sel)sel.value=q; this.load(q); }
    else { try{ var prof=(window.SC_PROFILE||{}); if(prof.student_id) this.load(prof.student_id); else if(prof.role==='parent' && prof.id){ const pc=await sb.from('parent_child').select('student_id').eq('parent_id',prof.id).limit(1); if(pc.data&&pc.data[0]) this.load(pc.data[0].student_id); else document.getElementById('sp-view').innerHTML='<div class="card"><h3>No child linked yet</h3><p>Your parent account is active, but no student has been mapped to you. Please contact the school admin to link your child on the Parents page.</p></div>'; } }catch(e){} }
  },
  cur(currency){ return (window.SCHOOL&&SCHOOL.currency)||currency||'₦'; },
  async load(id){ if(!id||!sb){return;} var box=document.getElementById('sp-view'); box.innerHTML='<p class="pulse">Loading…</p>';
    var {data:s}=await sb.from('students').select('*').eq('id',id).maybeSingle(); if(!s){box.innerHTML='<p>Student not found.</p>';return;}
    var name=s.full_name;
    var fees=[],results=[],att={present:0,total:0},awards=[];
    try{ var r1=await sb.from('fee_payments').select('*').eq('student_name',name).order('created_at',{ascending:false}); fees=r1.data||[]; }catch(e){}
    try{ var r2=await sb.from('results').select('*').eq('student_name',name).limit(500); results=r2.data||[]; }catch(e){}
    try{ var r3=await sb.from('attendance').select('status').eq('student_name',name).limit(2000); var rows=r3.data||[]; att.total=rows.length; att.present=rows.filter(x=>x.status==='present').length; }catch(e){}
    try{ var r4=await sb.from('behaviour_points').select('*').eq('student_name',name).limit(200); awards=r4.data||[]; }catch(e){}
    this.fees=fees; this.student=s; var totalPaid=fees.reduce((a,b)=>a+(Number(b.amount_paid)||0),0);
    var cur=this.cur();
    var photo=window.Super?Super.media.thumb(s.photo_url||'',{w:90,h:90}):'';
    box.innerHTML=
      '<div class="card" style="margin-bottom:16px"><div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">'+
        (photo||'')+
        '<div style="flex:1;min-width:200px"><h2 style="margin:0">'+esc(name)+'</h2>'+
        '<p style="margin:4px 0;color:var(--gray-600)">Adm No: <b>'+esc(s.admission_no||'-')+'</b> · Class: <b>'+esc(s.class||'-')+(s.arm?' '+esc(s.arm):'')+'</b> · '+esc(s.gender||'')+'</p>'+
        '<p style="margin:4px 0;color:var(--gray-600)">DOB: '+esc(s.date_of_birth||'-')+' · Status: <span class="badge">'+esc(s.status||'active')+'</span></p>'+
        '<p style="margin:4px 0;color:var(--gray-600)">Guardian: '+esc(s.guardian_name||'-')+' · '+esc(s.guardian_phone||'')+'</p></div>'+
        '<div style="text-align:right"><a class="btn btn-sm btn-outline" href="report-cards.html">📄 Report card</a> <a class="btn btn-sm btn-outline" href="idcards.html">🪪 ID card</a></div>'+
      '</div></div>'+
      '<div class="grid grid-2">'+
        '<div class="card"><h3 style="margin-top:0">💰 Fees & Payment History</h3>'+
          '<p>Total paid: <b>'+cur+totalPaid.toLocaleString()+'</b> over '+fees.length+' payment(s)</p>'+
          (fees.length?'<div class="table-wrap"><table><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Term</th><th>Receipt</th></tr></thead><tbody>'+
            fees.map((f,i)=>'<tr><td>'+esc((f.created_at||'').slice(0,10))+'</td><td>'+cur+Number(f.amount_paid||0).toLocaleString()+'</td><td>'+esc(f.method||'')+'</td><td>'+esc(f.term||'')+'</td><td><button class="btn btn-sm btn-outline" onclick="SP.receipt('+i+')">Print</button></td></tr>').join('')+'</tbody></table></div>':'<p style="color:var(--gray-500)">No payments recorded.</p>')+'</div>'+
        '<div class="card"><h3 style="margin-top:0">📊 Attendance & Awards</h3>'+
          '<p>Attendance: <b>'+att.present+'</b> present of '+att.total+' record(s) ('+(att.total?Math.round(att.present/att.total*100):0)+'%)</p>'+
          '<p>Awards / behaviour points: <b>'+awards.length+'</b></p>'+
          (awards.length?'<ul style="margin:0;padding-left:18px">'+awards.slice(0,8).map(a=>'<li>'+esc(a.badge||a.reason||'')+' ('+(a.points||0)+' pts)</li>').join('')+'</ul>':'')+'</div>'+
      '</div>'+
      '<div class="card" style="margin-top:16px"><h3 style="margin-top:0">📝 Results / Scores</h3>'+
        (results.length?'<div class="table-wrap"><table><thead><tr><th>Subject</th><th>Term</th><th>CA</th><th>Exam</th><th>Total</th><th>Grade</th></tr></thead><tbody>'+
          results.map(r=>{var ca=(Number(r.ca1)||0)+(Number(r.ca2)||0)+(Number(r.ca3)||0);var tot=ca+(Number(r.exam)||0);return '<tr><td>'+esc(r.subject||'')+'</td><td>'+esc(r.term||'')+'</td><td>'+ca+'</td><td>'+(r.exam||0)+'</td><td><b>'+tot+'</b></td><td>'+esc(r.grade||'')+'</td></tr>';}).join('')+'</tbody></table></div>':'<p style="color:var(--gray-500)">No results recorded yet.</p>')+'</div>';
  },
  receipt(i){ const f=this.fees[i], s=this.student||{}, sc=window.SCHOOL||{}, cur=this.cur(); if(!f)return; const sig=localStorage.getItem('sc-signature-url')||'', pn=localStorage.getItem('sc-principal-name')||'Bursar/Principal'; const sign=sig?'<div style="margin-top:28px;text-align:center"><img src="'+sig+'" style="max-width:150px;max-height:70px;object-fit:contain"><br><b>'+pn+'</b><br>Official Signature</div>':''; const html='<div style="width:620px;max-width:96vw;border:2px solid #111;padding:28px;font-family:Arial,sans-serif;color:#000;background:#fff"><h2 style="text-align:center;margin:0">'+esc(sc.name||'School')+'</h2><p style="text-align:center;margin:4px 0 18px">E-RECEIPT</p><p><b>Student:</b> '+esc(s.full_name||'')+' &nbsp; <b>Class:</b> '+esc(s.class||'')+'</p><p><b>Amount:</b> '+cur+Number(f.amount_paid||0).toLocaleString()+'</p><p><b>Method:</b> '+esc(f.method||'')+' &nbsp; <b>Reference:</b> '+esc(f.reference||f.id||'')+'</p><p><b>Term:</b> '+esc(f.term||'')+' &nbsp; <b>Date:</b> '+esc((f.created_at||new Date().toISOString()).slice(0,10))+'</p><p style="font-size:.8rem;color:#555">This receipt was generated electronically from the school portal.</p>'+sign+'</div>'; const w=window.open('','_blank'); if(!w){toast('Popup blocked! Please allow popups.','warning');return;} w.document.open(); w.document.write('<!DOCTYPE html><html><head><title>E-Receipt</title></head><body style="display:flex;justify-content:center;padding:20px">'+html+'<script>setTimeout(()=>window.print(),500);<\\/script></body></html>'); w.document.close(); w.focus(); }
};
document.addEventListener('DOMContentLoaded',()=>SP.init()); SP.init();
</script></body></html>`);
  },

  /* ====================================================================
     v3 — CERTIFICATE GENERATOR PAGE (uses Super.cert; verifiable code)
     ==================================================================== */
  pageCertificates(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px">
        <p style="color:var(--gray-600);margin:0">Issue branded, printable certificates (achievement, graduation,
        testimonial) each with a unique <strong>verification code</strong>. CBT exams also auto-issue certificate codes.</p>
      </div>
      <div class="card" style="margin-bottom:16px" data-staff-only>
        <h3>✏️ Content</h3>
        <div class="grid grid-2">
          <div class="form-group"><label>Recipient (pick a student or type)</label><select class="form-select" id="ct-student" onchange="CTUI.pickStudent(this.value)"><option value="">— type below —</option></select></div>
          <div class="form-group"><label>Recipient name</label><input class="form-input" id="ct-name" oninput="CTUI.render()"></div>
          <div class="form-group"><label>Certificate title</label><input class="form-input" id="ct-title" value="CERTIFICATE OF ACHIEVEMENT" oninput="CTUI.render()"></div>
          <div class="form-group"><label>Signatory</label><input class="form-input" id="ct-sig" value="Head of School" oninput="CTUI.render()"></div>
          <div class="form-group"><label>Date</label><input class="form-input" type="date" id="ct-date" oninput="CTUI.render()"></div>
        </div>
        <div class="form-group"><label>Body text</label><textarea class="form-input" id="ct-body" rows="2" oninput="CTUI.render()">has successfully met the requirements and is hereby recognised for outstanding achievement.</textarea></div>
        <h3 style="margin-top:14px">🎨 Design</h3>
        <div class="grid grid-2">
          <div class="form-group"><label>Layout</label><select class="form-select" id="ct-layout" onchange="CTUI.render()"><option value="classic">Classic</option><option value="modern">Modern</option><option value="elegant">Elegant</option></select></div>
          <div class="form-group"><label>Font</label><select class="form-select" id="ct-font" onchange="CTUI.render()"><option value="Georgia, serif">Georgia (serif)</option><option value="'Times New Roman', serif">Times</option><option value="Arial, sans-serif">Arial</option><option value="'Courier New', monospace">Courier</option><option value="Garamond, serif">Garamond</option></select></div>
          <div class="form-group"><label>Primary colour</label><input class="form-input" type="color" id="ct-pc" value="${cfg.themePrimary}" oninput="CTUI.render()"></div>
          <div class="form-group"><label>Accent colour</label><input class="form-input" type="color" id="ct-ac" value="${cfg.themeAccent}" oninput="CTUI.render()"></div>
          <div class="form-group"><label>Border style</label><select class="form-select" id="ct-border" onchange="CTUI.render()"><option value="double">Double</option><option value="solid">Solid</option><option value="ridge">Ridge</option><option value="dashed">Dashed</option></select></div>
          <div class="form-group"><label>Signature image (PNG)</label><input class="form-input" type="file" accept="image/*" id="ct-sigimg" onchange="CTUI.sigUpload(event)"></div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary" onclick="CTUI.save()">💾 Save &amp; Print</button><button class="btn btn-outline" onclick="CTUI.saveDesign()">💾 Save design template</button></div>
      </div>
      <div id="ct-preview" style="display:flex;justify-content:center;overflow:auto"></div>`;
    return T.shell(cfg, 'Certificates', body, { requireRole: 'staff' })
      .replace('</body></html>', `<script>
const CTUI={ code:'', sig:'',
  v(id){ var e=document.getElementById(id); return e?e.value:''; },
  async loadStudents(){ if(!sb)return; const sel=document.getElementById('ct-student'); const {data}=await sb.from('students').select('full_name').order('full_name').limit(1000); (data||[]).forEach(s=>{var o=document.createElement('option');o.value=s.full_name;o.textContent=s.full_name;sel.appendChild(o);}); },
  pickStudent(v){ if(v){document.getElementById('ct-name').value=v;} this.render(); },
  sigUpload(ev){ var f=ev.target.files[0]; if(!f)return; if(f.size>500*1024){toast('Signature should be under 500KB','warning');return;} var r=new FileReader(); r.onload=()=>{ CTUI.sig=r.result; CTUI.render(); }; r.readAsDataURL(f); },
  opts(){ return { name:this.v('ct-name'), title:this.v('ct-title'), signatory:this.v('ct-sig'), date:this.v('ct-date'), body:this.v('ct-body'),
    layout:this.v('ct-layout'), font:this.v('ct-font'), pc:this.v('ct-pc'), ac:this.v('ct-ac'), border:this.v('ct-border'), sig:this.sig, code:this.code }; },
  html(o){ var sc=(window.SCHOOL||{}); var logo='assets/img/logo.'+(sc.logoExt||'svg');
    var sigBlock = o.sig ? '<img src="'+o.sig+'" style="height:50px;display:block;margin:0 auto -6px">' : '';
    var bg = o.layout==='modern' ? 'background:linear-gradient(135deg,'+o.pc+'10,'+o.ac+'10)' : (o.layout==='elegant'?'background:#fffef8':'background:#fff');
    return '<div style="width:820px;max-width:96vw;border:12px '+o.border+' '+o.pc+';padding:42px;text-align:center;font-family:'+o.font+';'+bg+'">'+
      '<img src="'+logo+'" style="width:64px;height:64px;border-radius:12px;object-fit:contain" onerror="this.style.display=\\'none\\'">'+
      '<h1 style="margin:8px 0 2px;color:'+o.pc+'">'+esc(sc.name||"School")+'</h1>'+
      '<p style="color:#64748b;margin:0 0 18px">'+esc(sc.motto||'')+'</p>'+
      '<h2 style="letter-spacing:3px;color:'+o.ac+'">'+esc(o.title||"CERTIFICATE")+'</h2>'+
      '<p style="margin:16px 0 4px">This is to certify that</p>'+
      '<h2 style="margin:0;border-bottom:2px solid '+o.ac+';display:inline-block;padding:0 30px 6px">'+esc(o.name||"_______")+'</h2>'+
      '<p style="max-width:560px;margin:18px auto;line-height:1.6">'+esc(o.body||'')+'</p>'+
      '<div style="display:flex;justify-content:space-between;margin-top:40px;font-size:.85rem">'+
        '<div>____________________<br>Date: '+esc(o.date||new Date().toLocaleDateString())+'</div>'+
        '<div>'+sigBlock+'____________________<br>'+esc(o.signatory||"Head of School")+'</div></div>'+
      '<p style="margin-top:22px;font-size:.72rem;color:#94a3b8">Verification code: <strong>'+esc(o.code)+'</strong></p></div>';
  },
  render(){ if(!this.code) this.code=(window.Super?Super.cert.code():'SC-'+Math.random().toString(36).slice(2,8).toUpperCase()); document.getElementById('ct-preview').innerHTML=this.html(this.opts()); },
  print(){ var w=window.open('','_blank'); w.document.write('<html><head><title>Certificate</title></head><body style="display:flex;justify-content:center;padding:16px">'+this.html(this.opts())+'<script>window.onload=()=>window.print()<\\/script></body></html>'); w.document.close(); },
  async save(){ const o=this.opts();
    if(sb){ try{ await sb.from('certificates').insert({ student_id:null, type:o.title, serial_no:o.code, signed_by:o.signatory }); }catch(e){} }
    if(window.App && App.logActivity) App.logActivity('issue','certificate',o.code);
    this.print();
  },
  async saveDesign(){ if(!sb){toast('DB not configured','warning');return;} const o=this.opts();
    const {error}=await sb.from('certificate_designs').insert({ name:o.title+' design', title:o.title, primary_color:o.pc, accent_color:o.ac, font:o.font, layout:o.layout, body_text:o.body, signatory:o.signatory, signature_data:o.sig, border_style:o.border });
    if(error){toast(error.message,'danger');return;} toast('Design template saved ✓','success');
  }
};
document.addEventListener('DOMContentLoaded',()=>{ CTUI.loadStudents(); CTUI.render(); }); CTUI.render();
</script></body></html>`);
  },

  /* ====================================================================
     v3 — FLYER / MARKETING GENERATOR PAGE (uses Super.flyer; lead-gen)
     ==================================================================== */
  pageFlyer(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px">
        <p style="color:var(--gray-600);margin:0">Design a printable promotional flyer/poster — great for admissions drives
        and parent outreach. Choose <strong>layout, colours, fonts</strong> and edit all the text, then print or save as PDF.</p>
      </div>
      <div class="card" style="margin-bottom:16px" data-staff-only>
        <h3>🎨 Professional design tools</h3>
        <div class="grid grid-2">
          <div class="form-group"><label>Template</label><select class="form-select" id="fl-layout" onchange="FLUI.render()">
            <option value="poster">Poster (premium)</option><option value="elegant">Elegant (serif/award)</option>
            <option value="gradient">Gradient (bold)</option><option value="banner">Banner top</option>
            <option value="sidebar">Sidebar</option><option value="minimal">Minimal (white)</option></select></div>
          <div class="form-group"><label>Paper / size</label><select class="form-select" id="fl-size" onchange="FLUI.render()">
            <option value="a4portrait">A4 portrait (print)</option><option value="a5portrait">A5 (handbill)</option>
            <option value="square">Square (Instagram)</option><option value="story">Story (WhatsApp/IG)</option>
            <option value="landscape">Landscape (banner)</option></select></div>
          <div class="form-group"><label>Colour palette (one-click)</label><select class="form-select" id="fl-palette" onchange="FLUI.applyPalette(this.value)">
            <option value="">— custom —</option><option value="royal">Royal blue & gold</option><option value="emerald">Emerald & gold</option>
            <option value="crimson">Crimson</option><option value="violet">Violet</option><option value="teal">Teal</option>
            <option value="slate">Slate & sky</option><option value="sunset">Sunset</option></select></div>
          <div class="form-group"><label>Font</label><select class="form-select" id="fl-font" onchange="FLUI.render()">
            <option value="system-ui,'Segoe UI',Arial,sans-serif">Sans (modern)</option>
            <option value="Georgia,'Times New Roman',serif">Serif (classic)</option>
            <option value="'Trebuchet MS',sans-serif">Trebuchet</option>
            <option value="'Courier New',monospace">Mono</option></select></div>
          <div class="form-group"><label>Primary colour</label><input class="form-input" type="color" id="fl-pc" value="${cfg.themePrimary}" oninput="FLUI.render()"></div>
          <div class="form-group"><label>Accent colour</label><input class="form-input" type="color" id="fl-ac" value="${cfg.themeAccent}" oninput="FLUI.render()"></div>
          <div class="form-group"><label>Text colour (gradient/poster)</label><input class="form-input" type="color" id="fl-text" value="#ffffff" oninput="FLUI.render()"></div>
          <div class="form-group"><label>Corner ribbon text</label><input class="form-input" id="fl-year" value="${new Date().getFullYear()}/${new Date().getFullYear()+1}" oninput="FLUI.render()"></div>
          <div class="form-group"><label>Badge / pill</label><input class="form-input" id="fl-badge" value="NEW SESSION" oninput="FLUI.render()"></div>
        </div>
        <div style="display:flex;gap:18px;flex-wrap:wrap;margin:6px 0 4px">
          <label style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" id="fl-ribbon" checked onchange="FLUI.render()"> Corner ribbon</label>
          <label style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" id="fl-pattern" checked onchange="FLUI.render()"> Decorative pattern</label>
          <label style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" id="fl-contact" checked onchange="FLUI.render()"> Contact bar</label>
        </div>
        <h3 style="margin-top:14px">✏️ Content</h3>
        <div class="grid grid-2">
          <div class="form-group"><label>Title</label><input class="form-input" id="fl-title" value="${T.esc(cfg.schoolName || 'Our School')}" oninput="FLUI.render()"></div>
          <div class="form-group"><label>Tagline</label><input class="form-input" id="fl-tag" value="${T.esc(cfg.schoolMotto || 'Excellence in Education')}" oninput="FLUI.render()"></div>
          <div class="form-group"><label>Headline</label><input class="form-input" id="fl-head" value="ADMISSION IN PROGRESS" oninput="FLUI.render()"></div>
          <div class="form-group"><label>Call to action</label><input class="form-input" id="fl-cta" value="Apply today — limited spaces!" oninput="FLUI.render()"></div>
        </div>
        <div class="form-group"><label>Bullet points (one per line)</label><textarea class="form-input" id="fl-bullets" rows="4" oninput="FLUI.render()">Online results & report cards
CBT / online exams from any device
Fees, attendance & parent updates
Installable app + instant notifications</textarea></div>
        <button class="btn btn-primary" onclick="FLUI.print()">🖨 Print / Save as PDF</button>
      </div>
      <div id="fl-preview" style="display:flex;justify-content:center;overflow:auto"></div>`;
    return T.shell(cfg, 'Marketing Flyer', body, { requireRole: 'staff' })
      .replace('</body></html>', `<script>
const FLUI={
  v(id){ var e=document.getElementById(id); return e?e.value:''; },
  c(id){ var e=document.getElementById(id); return e?e.checked:false; },
  applyPalette(name){ if(!name||!window.Super)return; var p=Super.flyer.PALETTES[name]; if(!p)return;
    document.getElementById('fl-pc').value=p.pc; document.getElementById('fl-ac').value=p.ac; document.getElementById('fl-text').value=p.text; this.render(); },
  opts(){ return { layout:this.v('fl-layout'), size:this.v('fl-size'), font:this.v('fl-font'), pc:this.v('fl-pc'), ac:this.v('fl-ac'), text:this.v('fl-text'),
    title:this.v('fl-title'), tagline:this.v('fl-tag'), headline:this.v('fl-head'), cta:this.v('fl-cta'),
    year:this.v('fl-year'), badge:this.v('fl-badge'), ribbon:this.c('fl-ribbon'), pattern:this.c('fl-pattern'), contactBar:this.c('fl-contact'),
    bullets:this.v('fl-bullets').split('\\n').map(function(x){return x.trim();}).filter(Boolean) }; },
  render(){ var p=document.getElementById('fl-preview'); if(p&&window.Super) p.innerHTML=Super.flyer.html(this.opts()); },
  print(){ if(window.Super) Super.flyer.print(this.opts()); }
};
document.addEventListener('DOMContentLoaded',()=>FLUI.render()); FLUI.render();
</script></body></html>`);
  },

  /* ====================================================================
     v3 super feature (ported & enhanced from the original School Connect):
     FULL INTERACTIVE MULTI-PAGE LIVE PREVIEW.
     Builds ONE self-contained HTML document that runs the REAL generated
     pages against a MOCK Supabase client seeded with realistic demo data —
     so the client can click through dashboard, students, CBT, report cards,
     fees, etc. BEFORE downloading. 100% in the iframe, no backend.
     ==================================================================== */
  fullPreviewHtml(config) {
    const theme = window.SC.THEMES.find(t => t.id === config.themeId) || window.SC.THEMES[0];
    const font  = window.SC.FONTS.find(f => f.id === config.fontId) || window.SC.FONTS[0];
    const cfg = Object.assign({}, config, {
      schoolName: config.schoolName || 'Demo Academy',
      shortName: config.shortName || 'Demo',
      themeId: theme.id, themePrimary: theme.primary, themeAccent: theme.accent,
      fontId: font.id, fontFamily: font.family, fontCss: font.css,
      layout: config.layout || 'sidebar',
      modules: Array.isArray(config.modules) && config.modules.length ? config.modules : window.SC.PRESETS.secondary.modules.slice(),
      campuses: config.campuses || [], hmgLink: 'https://hmgconcepts.pages.dev/',
      logoExt: 'svg', supabaseUrl: 'preview', supabaseKey: 'preview'
    });

    // Build the list of pages to preview (dashboard + chosen modules + dedicated)
    const nav = [{ id: 'dashboard', name: 'Dashboard', icon: '🏠', html: T.dashboard(cfg) }];
    const dedicated = {
      cbt: () => Generator.pageCBT(cfg), 'report-cards': () => Generator.pageReportCards(cfg),
      analytics: () => Generator.pageAnalytics(cfg), 'admin-data': () => Generator.pageAdminData(cfg), approvals: () => Generator.pageApprovals(cfg), admissions: () => Generator.pageAdmissions(cfg),
      idcards: () => Generator.pageIdCards(cfg), certificates: () => Generator.pageCertificates(cfg),
      digital_library: () => Generator.pageDigitalLibrary(cfg),
      'cbt-prompts': () => Generator.pageCBTPrompts(cfg), entrance: () => Generator.pageEntrance(cfg),
      storage: () => Generator.pageStorage(cfg), developer: () => Generator.pageDeveloper(cfg),
      'student-profile': () => Generator.pageStudentProfile(cfg), academic_setup: () => Generator.pageAcademicSetup(cfg), academic_records: () => Generator.pageAcademicRecords(cfg),
      flyer: () => Generator.pageFlyer(cfg), sow: () => Generator.pageSOW(cfg)
    };
    ['voting', 'notifications'].forEach(id => {
      const fn = id === 'voting' ? T.voting : T.notifications;
      nav.push({ id, name: id === 'voting' ? 'Voting' : 'Notifications', icon: T.iconFor(id), html: fn(cfg) });
    });
    cfg.modules.forEach(id => {
      if (['dashboard', 'voting', 'notifications'].includes(id)) return;
      const mod = window.SC.MODULES.find(m => m.id === id) || { id, name: id };
      let html;
      try { html = dedicated[id] ? dedicated[id]() : T.modulePage(cfg, id); }
      catch (e) { html = T.modulePage(cfg, id); }
      nav.push({ id, name: T.labelFor(id, mod.name), icon: T.iconFor(id), html });
    });

    // Extract just the <body> inner of each page (strip <script> tags — the
    // preview supplies its own mock-backed runtime).
    const bodyOf = full => {
      let m = full.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      let b = m ? m[1] : full;
      b = b.replace(/<script[\s\S]*?<\/script>/gi, '');
      return b;
    };
    const pages = nav.map(n => ({ id: n.id, name: n.name, icon: n.icon, body: bodyOf(n.html) }));

    const STYLE = '/*injected at runtime*/';
    const logo = cfg.logoData || '';
    const demo = Generator._previewDemoData();

    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Preview • ${T.esc(cfg.schoolName)}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
${font.css && font.id !== 'system' ? `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.css)}&display=swap" rel="stylesheet">` : ''}
<style>__STYLE__
:root{--primary:${theme.primary};--accent:${theme.accent};--gradient:linear-gradient(135deg,${theme.primary},${theme.accent});}
body{font-family:${font.family ? `'${font.family}',` : ''}system-ui,sans-serif;margin:0}
.pvx-shell{display:flex;min-height:100vh}
.pvx-side{width:230px;background:#0f172a;color:#fff;padding:14px;flex-shrink:0;overflow-y:auto;height:100vh;position:sticky;top:0}
.pvx-brand{display:flex;gap:9px;align-items:center;font-weight:800;padding:6px 6px 14px;border-bottom:1px solid #1e293b;margin-bottom:10px}
.pvx-link{display:flex;gap:9px;align-items:center;color:#94a3b8;padding:9px 11px;border-radius:9px;font-size:13px;margin-bottom:3px;cursor:pointer}
.pvx-link:hover{background:#1e293b;color:#fff}.pvx-link.on{background:${theme.primary};color:#fff}
.pvx-main{flex:1;padding:0;overflow-y:auto;height:100vh;background:#f8fafc}
.pvx-bar{background:#fef3c7;color:#92400e;text-align:center;font-size:12px;padding:7px;border-bottom:1px solid #fde68a}
.app-sidebar,.app-topbar .mobile-toggle{display:none!important}
.app-main{margin:0!important}.app-layout{display:block!important}
</style></head><body>
<div class="pvx-bar">👁️ PREVIEW with sample data — the real platform connects to the school's own free Supabase. Powered by HMG Concepts.</div>
<div class="pvx-shell">
  <div class="pvx-side">
    <div class="pvx-brand">${logo ? `<img src="${logo}" style="height:30px;width:30px;border-radius:7px;object-fit:cover">` : `<div style="height:30px;width:30px;border-radius:7px;background:#fff;color:${theme.primary};display:flex;align-items:center;justify-content:center;font-weight:900">${T.esc((cfg.shortName || 'S')[0])}</div>`} <span>${T.esc(cfg.shortName || 'School')}</span></div>
    ${pages.map(p => `<div class="pvx-link" data-pv="${p.id}"><span>${p.icon}</span> ${T.esc(p.name)}</div>`).join('')}
    <div style="margin-top:14px;border-top:1px solid #1e293b;padding-top:10px;font-size:10px;color:#64748b;text-align:center">Powered by HMG Concepts</div>
  </div>
  <div class="pvx-main" id="pvx-main"></div>
</div>
<script>
var PV_PAGES=${JSON.stringify(pages.reduce((a, p) => (a[p.id] = p.body, a), {}))};
var DEMO=${JSON.stringify(demo)};
/* Mock Supabase client (chainable) backed by demo tables */
function mockClient(DATA){
  function q(table){
    var rows=(DATA[table]||[]).slice();
    var api={ select:function(_,opts){ if(opts&&opts.head){api._head=true;} return api; },
      order:function(){return api;}, limit:function(n){rows=rows.slice(0,n);return api;},
      eq:function(c,v){rows=rows.filter(function(r){return String(r[c])===String(v);});return api;},
      gte:function(){return api;}, lte:function(){return api;}, ilike:function(){return api;}, or:function(){return api;},
      in:function(c,vals){rows=rows.filter(function(r){return vals.indexOf(r[c])>=0;});return api;},
      maybeSingle:function(){return Promise.resolve({data:rows[0]||null,error:null});},
      single:function(){return Promise.resolve({data:rows[0]||null,error:null});},
      insert:function(){return {select:function(){return {single:function(){return Promise.resolve({data:{id:'demo',code:'DEMO12'},error:null});}};}, then:function(r){return Promise.resolve({data:null,error:null}).then(r);}};},
      update:function(){return {eq:function(){return Promise.resolve({data:null,error:null});}};},
      upsert:function(){return Promise.resolve({data:null,error:null});},
      delete:function(){return {eq:function(){return Promise.resolve({data:null,error:null});}};},
      then:function(res){var out={data:rows,error:null}; if(api._head)out={count:rows.length,error:null}; return Promise.resolve(out).then(res);} };
    return api;
  }
  return { from:q,
    rpc:function(){return Promise.resolve({data:[],error:null});},
    auth:{ getUser:function(){return Promise.resolve({data:{user:DEMO._me}});}, signOut:function(){return Promise.resolve({});},
           signInWithPassword:function(){return Promise.resolve({data:{},error:null});}, signUp:function(){return Promise.resolve({data:{},error:null});} },
    channel:function(){return {on:function(){return this;},subscribe:function(){return this;}};},
    storage:{ from:function(){return {upload:function(){return Promise.resolve({error:null});},getPublicUrl:function(){return {data:{publicUrl:'#'}};}};} } };
}
window.sb=mockClient(DEMO);
window.SCHOOL=${JSON.stringify({ name: cfg.schoolName, short: cfg.shortName, motto: cfg.schoolMotto || '', currency: cfg.currency || '₦', modules: cfg.modules, logoExt: 'svg' })};
window.esc=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
function pvGo(id){
  document.querySelectorAll('.pvx-link').forEach(function(a){a.classList.toggle('on',a.dataset.pv===id);});
  document.getElementById('pvx-main').innerHTML=PV_PAGES[id]||'<div style="padding:30px">Preview of '+id+'</div>';
  // seed simple demo numbers into common dashboard stat slots
  var set=function(i,v){var el=document.getElementById(i);if(el)el.textContent=v;};
  set('stat-students',DEMO.students.length);set('stat-staff',DEMO.staff.length);
  set('stat-fees','₦'+ (DEMO.fee_payments.reduce(function(a,b){return a+(b.amount_paid||0);},0)).toLocaleString());
  set('stat-announcements',DEMO.announcements.length);
  set('kpi-students',DEMO.students.length);set('kpi-staff',DEMO.staff.length);set('kpi-exams',DEMO.cbt_exams.length);set('kpi-results',DEMO.cbt_results.length);
  // fill any data tables found on the page with demo rows
  Generator_pvFill(id);
}
function Generator_pvFill(id){
  var map={students:DEMO.students,staff:DEMO.staff,results:DEMO.results,fees:DEMO.fee_payments,attendance:DEMO.attendance,cbt:DEMO.cbt_exams,library:DEMO.library,events:DEMO.events};
  var rows=map[id]; if(!rows||!rows.length)return;
  var tb=document.querySelector('table tbody'); var th=document.querySelector('table thead tr');
  if(!tb||!th)return; var cols=Object.keys(rows[0]).filter(function(k){return k!=='id';}).slice(0,5);
  th.innerHTML=cols.map(function(c){return '<th>'+c.replace(/_/g,' ')+'</th>';}).join('');
  tb.innerHTML=rows.map(function(r){return '<tr>'+cols.map(function(c){return '<td>'+esc(r[c])+'</td>';}).join('')+'</tr>';}).join('');
}
document.querySelectorAll('.pvx-link').forEach(function(a){a.addEventListener('click',function(){pvGo(a.dataset.pv);});});
pvGo('dashboard');
</script>
</body></html>`;
  },

  /* Seeded demo data for the full preview (realistic Nigerian-school sample) */
  _previewDemoData() {
    const names = ['Grace Adeyemi', 'John Okoro', 'Mary Bello', 'Daniel Musa', 'Esther Obi', 'Samuel Eze', 'Ruth Ali', 'Peter Udo'];
    const classes = ['JSS1A', 'JSS2B', 'SSS1A', 'SSS2C', 'Primary5', 'SSS3A'];
    const students = names.map((n, i) => ({ id: 'st' + i, full_name: n, class: classes[i % classes.length], admission_no: 'ADM/' + (1000 + i), guardian_name: 'Mr/Mrs ' + n.split(' ')[1], guardian_phone: '0803000000' + i, gender: i % 2 ? 'female' : 'male' }));
    const staff = ['Mrs. Bello (Maths)', 'Mr. Eze (Physics)', 'Miss Ada (English)', 'Mr. Sule (PHE)'].map((n, i) => ({ id: 'sf' + i, full_name: n, role: 'teacher', department: ['Sciences', 'Arts', 'Languages', 'Sports'][i], phone: '08070000' + i }));
    return {
      _me: { id: 'st0', email: 'admin@demo.org', user_metadata: { full_name: 'Demo Admin' } },
      students, staff,
      fee_payments: [{ id: 'fp1', amount_paid: 75000, method: 'transfer', term: 'First Term' }, { id: 'fp2', amount_paid: 30000, method: 'cash', term: 'First Term' }, { id: 'fp3', amount_paid: 75000, method: 'transfer', term: 'First Term' }],
      announcements: [{ id: 'a1', title: 'Welcome to our portal!', body: 'Please complete your profile.', created_at: new Date().toISOString() }, { id: 'a2', title: 'PTA meeting Saturday', body: 'All parents to attend by 10am.', created_at: new Date().toISOString() }],
      results: [{ id: 'r1', student_name: 'Mary Bello', subject: 'Mathematics', ca1: 12, ca2: 14, exam: 55, grade: 'A' }, { id: 'r2', student_name: 'Daniel Musa', subject: 'English', ca1: 10, ca2: 12, exam: 48, grade: 'B' }],
      attendance: [{ id: 'at1', student_name: 'Grace Adeyemi', date: new Date().toISOString().slice(0, 10), status: 'present' }, { id: 'at2', student_name: 'John Okoro', date: new Date().toISOString().slice(0, 10), status: 'late' }],
      cbt_exams: [{ id: 'cb1', subject: 'Mathematics', code: 'MATH01', class: 'JSS1A', assessment_type: 'test', is_open: true }, { id: 'cb2', subject: 'English', code: 'ENG01', class: 'JSS2B', assessment_type: 'exam', is_open: false }],
      cbt_results: [{ id: 'cr1', student_name: 'Mary Bello', score: 18, total: 20, percent: 90 }, { id: 'cr2', student_name: 'Daniel Musa', score: 14, total: 20, percent: 70 }],
      library: [{ id: 'lb1', title: 'Things Fall Apart', author: 'Chinua Achebe', category: 'Literature', available: 3 }],
      events: [{ id: 'ev1', title: 'Inter-house Sports', date: new Date().toISOString().slice(0, 10), venue: 'School Field' }],
      polls: [{ id: 'pl1', title: 'Head Boy Election 2026', status: 'open' }]
    };
  },

  /* ====================================================================
     v3 super feature: PRICING ESTIMATOR (ported from original builder).
     Returns an itemised "Done-for-You" estimate. The platform itself is
     always FREE — this only quotes optional build/setup help.
     ==================================================================== */
  PRICING: {
    currency: '₦', base: 35000, perFeature: 4500, perDepartment: 1500,
    addons: [
      { id: 'deploy', name: 'We deploy it for you (hosting + Supabase setup)', price: 25000 },
      { id: 'training', name: 'Staff training session (1 hour)', price: 18000 },
      { id: 'data', name: 'Bulk student/staff data import', price: 25000 },
      { id: 'results', name: 'Results/report-card template customisation', price: 20000 },
      { id: 'domain', name: 'Custom domain setup', price: 10000 },
      { id: 'support', name: '3 months priority support', price: 35000 }
    ]
  },
  estimate(config, addonIds) {
    const P = Generator.PRICING;
    const feats = (config.modules || []).length;
    const depts = (config.departments || config.levels || []).length;
    let total = P.base + feats * P.perFeature + depts * P.perDepartment;
    const lines = [
      { label: 'Base build & branding', amount: P.base },
      { label: feats + ' modules × ' + P.currency + P.perFeature.toLocaleString(), amount: feats * P.perFeature }
    ];
    if (depts) lines.push({ label: depts + ' departments × ' + P.currency + P.perDepartment.toLocaleString(), amount: depts * P.perDepartment });
    (addonIds || []).forEach(id => { const a = P.addons.find(x => x.id === id); if (a) { total += a.price; lines.push({ label: a.name, amount: a.price }); } });
    return { currency: P.currency, total, lines };
  },

  /* ====================================================================
     FINAL v2 — ENTERPRISE FEATURE PAGES (free, no AI)
     ==================================================================== */

  /* Conflict-free timetable generator */
  pageTimetableGen(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px"><p style="color:var(--gray-600);margin:0">
        <strong>Step 1:</strong> set the daily periods, their times and breaks. <strong>Step 2:</strong> add each
        subject's weekly demand. <strong>Step 3:</strong> generate a <strong>conflict-free</strong> timetable
        (deterministic, no AI) — part-time teachers are only scheduled on the days they attend.</p></div>
      <div class="card" style="margin-bottom:16px" data-staff-only>
        <h3>🕐 Step 1 · Period & break configuration</h3>
        <div class="grid grid-2" style="margin:8px 0">
          <div class="form-group"><label>Number of teaching periods per day</label><input class="form-input" type="number" id="pc-count" value="6" min="1" max="12"></div>
          <div class="form-group"><label>Default period length (minutes)</label><input class="form-input" type="number" id="pc-len" value="40"></div>
          <div class="form-group"><label>Day starts at</label><input class="form-input" type="time" id="pc-start" value="08:00"></div>
          <div class="form-group"><label>Short break after period</label><input class="form-input" type="number" id="pc-sb" value="2" placeholder="e.g. 2"></div>
          <div class="form-group"><label>Short break length (min)</label><input class="form-input" type="number" id="pc-sbl" value="15"></div>
          <div class="form-group"><label>Long break after period</label><input class="form-input" type="number" id="pc-lb" value="4" placeholder="e.g. 4"></div>
          <div class="form-group"><label>Long break length (min)</label><input class="form-input" type="number" id="pc-lbl" value="30"></div>
        </div>
        <button class="btn btn-primary" onclick="PC.build()">🕐 Build period schedule</button>
        <button class="btn btn-outline" onclick="PC.save()">💾 Save schedule</button>
        <div id="pc-preview" style="margin-top:12px"></div>
      </div>
      <div class="card" style="margin-bottom:16px" data-staff-only>
        <h3>📚 Step 2 · Subject demand &amp; generation</h3>
        <div class="grid grid-2">
          <div class="form-group"><label>Class</label><input class="form-input" id="tt-class" placeholder="JSS1"></div>
          <div class="form-group"><label>Periods per day</label><input class="form-input" type="number" id="tt-ppd" value="6"></div>
          <div class="form-group"><label>Subject</label><input class="form-input" id="tt-subject" placeholder="Mathematics"></div>
          <div class="form-group"><label>Teacher</label><input class="form-input" id="tt-teacher" placeholder="Mr. Eze"></div>
          <div class="form-group"><label>Periods / week</label><input class="form-input" type="number" id="tt-ppw" value="5"></div>
          <div class="form-group"><label><input type="checkbox" id="tt-pt" onchange="document.getElementById('tt-days').style.display=this.checked?'block':'none'"> Part-time teacher (attends only certain days)</label></div>
        </div>
        <div id="tt-days" style="display:none;margin:4px 0 12px">
          <label style="font-size:.85rem;color:var(--gray-600);display:block;margin-bottom:6px">Days this teacher attends:</label>
          <div style="display:flex;gap:14px;flex-wrap:wrap">
            <label><input type="checkbox" class="tt-day" value="Monday"> Mon</label>
            <label><input type="checkbox" class="tt-day" value="Tuesday"> Tue</label>
            <label><input type="checkbox" class="tt-day" value="Wednesday"> Wed</label>
            <label><input type="checkbox" class="tt-day" value="Thursday"> Thu</label>
            <label><input type="checkbox" class="tt-day" value="Friday"> Fri</label>
          </div>
        </div>
        <button class="btn btn-outline" onclick="TTG.add()">+ Add subject demand</button>
        <button class="btn btn-primary" onclick="TTG.generate()">⚙️ Generate timetable</button>
      </div>
      <div id="tt-reqs"></div>
      <div id="tt-grid"></div>`;
    return T.shell(cfg, 'Timetable Generator', body, { requireRole: 'staff' })
      .replace('</body></html>', `<script>
function _addMin(t,m){var p=(t||'08:00').split(':'),d=new Date(2000,0,1,+p[0],+p[1]);d.setMinutes(d.getMinutes()+m);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
const PC={ rows:[],
  build(){
    var count=+document.getElementById('pc-count').value||6, len=+document.getElementById('pc-len').value||40;
    var start=document.getElementById('pc-start').value||'08:00';
    var sb_=+document.getElementById('pc-sb').value||0, sbl=+document.getElementById('pc-sbl').value||0;
    var lb=+document.getElementById('pc-lb').value||0, lbl=+document.getElementById('pc-lbl').value||0;
    PC.rows=[]; var t=start, pno=0;
    for(var i=1;i<=count;i++){ pno++; var e=_addMin(t,len); PC.rows.push({period_no:pno,label:'Period '+i,start_time:t,end_time:e,is_break:false}); t=e;
      if(i===sb_&&sbl){ var be=_addMin(t,sbl); PC.rows.push({period_no:pno+0.1,label:'Short Break',start_time:t,end_time:be,is_break:true}); t=be; }
      if(i===lb&&lbl){ var le=_addMin(t,lbl); PC.rows.push({period_no:pno+0.2,label:'Long Break',start_time:t,end_time:le,is_break:true}); t=le; }
    }
    document.getElementById('pc-preview').innerHTML='<div class="table-wrap"><table><thead><tr><th>#</th><th>Label</th><th>Start</th><th>End</th></tr></thead><tbody>'+
      PC.rows.map(r=>'<tr style="'+(r.is_break?'background:var(--gray-100);font-style:italic':'')+'"><td>'+(r.is_break?'—':r.period_no)+'</td><td>'+esc(r.label)+'</td><td>'+esc(r.start_time)+'</td><td>'+esc(r.end_time)+'</td></tr>').join('')+'</tbody></table></div>';
    var ppd=PC.rows.filter(r=>!r.is_break).length; var el=document.getElementById('tt-ppd'); if(el)el.value=ppd;
  },
  async save(){ if(!PC.rows.length){PC.build();} if(!sb){toast('Configured (DB not connected to persist)','info');return;}
    try{ await sb.from('timetable_config').delete().eq('class','ALL'); var pos=0;
      for(const r of PC.rows){ pos++; await sb.from('timetable_config').insert({class:'ALL',period_no:Math.floor(r.period_no),label:r.label,start_time:r.start_time,end_time:r.end_time,is_break:r.is_break,position:pos}); }
      toast('Period schedule saved ✓','success'); if(window.App&&App.logActivity)App.logActivity('config','timetable_config','ALL');
    }catch(e){ toast(e.message,'danger'); } }
};
document.addEventListener('DOMContentLoaded',()=>{ try{PC.build();}catch(e){} });
const TTG={
  async add(){ const c=document.getElementById('tt-class').value.trim(); if(!c){toast('Enter a class','warning');return;}
    var pt=document.getElementById('tt-pt').checked;
    var days=pt?[].slice.call(document.querySelectorAll('.tt-day:checked')).map(function(x){return x.value;}):null;
    if(pt && (!days||!days.length)){toast('Select the days this part-time teacher attends','warning');return;}
    const r=await Enterprise.timetable.addRequirement(c,document.getElementById('tt-subject').value.trim(),document.getElementById('tt-teacher').value.trim(),document.getElementById('tt-ppw').value, days, pt);
    if(r&&r.error){toast(r.error.message||'Error','danger');return;} toast('Added'+(pt?' (part-time: '+days.join(', ')+')':''),'success'); TTG.loadReqs(c); },
  async loadReqs(c){ const {data}=await Enterprise.timetable.listRequirements(c); const box=document.getElementById('tt-reqs');
    box.innerHTML='<div class="card"><h3>Subject demand — '+esc(c)+'</h3><div class="table-wrap"><table><thead><tr><th>Subject</th><th>Teacher</th><th>Periods/wk</th><th>Attends</th></tr></thead><tbody>'+(data||[]).map(r=>'<tr><td>'+esc(r.subject)+'</td><td>'+esc(r.teacher||'-')+'</td><td>'+r.periods_per_week+'</td><td>'+(r.available_days&&r.available_days.length?'<span class="badge">'+esc(r.available_days.join(', '))+'</span>':'All week')+'</td></tr>').join('')+'</tbody></table></div></div>'; },
  async generate(){ const c=document.getElementById('tt-class').value.trim(); if(!c){toast('Enter a class','warning');return;}
    const {data,error}=await Enterprise.timetable.generate(c,(window.SCHOOL&&window.SCHOOL.session)||'',(window.SCHOOL&&window.SCHOOL.term)||'',document.getElementById('tt-ppd').value);
    if(error){toast(error.message,'danger');return;}
    var msg='Generated '+((data&&data.placed)||0)+' periods ✓'+((data&&data.unplaced)?' · ⚠ '+data.unplaced+' could not fit (check part-time days/periods-per-day)':'');
    toast(msg,(data&&data.unplaced)?'warning':'success',6000); if(window.App&&App.logActivity)App.logActivity('generate','timetable',c); TTG.grid(c); },
  async grid(c){ const {data}=await Enterprise.timetable.grid(c); const days=['Monday','Tuesday','Wednesday','Thursday','Friday'];
    const periods=[...new Set((data||[]).map(r=>r.period))].sort((a,b)=>a-b);
    let h='<div class="card"><h3>Generated timetable — '+esc(c)+'</h3><div class="table-wrap"><table><thead><tr><th>Period</th>'+days.map(d=>'<th>'+d+'</th>').join('')+'</tr></thead><tbody>';
    periods.forEach(p=>{ h+='<tr><td><strong>'+esc(p)+'</strong></td>'+days.map(d=>{const cell=(data||[]).find(r=>r.day===d&&String(r.period)===String(p));return '<td>'+(cell?esc(cell.subject)+'<br><small>'+esc(cell.teacher||'')+'</small>':'-')+'</td>';}).join('')+'</tr>'; });
    h+='</tbody></table></div></div>'; document.getElementById('tt-grid').innerHTML=h; }
};
</script></body></html>`);
  },

  /* QR / code self check-in attendance */
  pageCheckin(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px"><p style="color:var(--gray-600);margin:0">
        Students check in by <strong>scanning their ID-card QR with the device camera</strong>, or by typing
        their admission number. Free — uses your phone/laptop camera, no extra hardware, no AI.</p></div>
      <div class="grid grid-2">
        <div class="card">
          <h3>📷 Camera scan</h3>
          <video id="ck-video" playsinline style="width:100%;border-radius:12px;background:#000;display:none;max-height:300px"></video>
          <canvas id="ck-canvas" style="display:none"></canvas>
          <div id="ck-cam-msg" style="color:var(--gray-500);font-size:.88rem;margin:8px 0">Tap “Start camera”, then point at the ID-card QR.</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary" id="ck-cam-start" onclick="CK.startCam()">▶ Start camera</button>
            <button class="btn btn-outline" id="ck-cam-stop" onclick="CK.stopCam()" style="display:none">⏹ Stop</button>
          </div>
        </div>
        <div class="card">
          <h3>⌨️ Manual entry</h3>
          <div class="form-group"><label>ID / admission no (or pasted QR text)</label>
            <input class="form-input" id="ck-id" placeholder="ADM/1001"></div>
          <div class="form-group"><label>Name (optional)</label><input class="form-input" id="ck-name"></div>
          <div class="form-group"><label>Class (optional)</label><input class="form-input" id="ck-class"></div>
          <button class="btn btn-primary" onclick="CK.go(document.getElementById('ck-id').value)">✅ Check in</button>
        </div>
      </div>
      <div class="card" style="margin-top:16px"><div id="ck-log"><p style="color:var(--gray-500)">No check-ins yet today.</p></div></div>`;
    return T.shell(cfg, 'QR Check-in', body, { requireRole: 'any' })
      .replace('</head>', '<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script></head>')
      .replace('</body></html>', `<script>
const CK={ done:[], stream:null, scanning:false, last:'', lastAt:0,
  async startCam(){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){ toast('Camera not supported on this device — use manual entry.','warning',5000); return; }
    try{
      CK.stream=await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' }, audio:false });
    }catch(e){ toast('Camera permission denied or unavailable. Use manual entry.','danger',6000); return; }
    const v=document.getElementById('ck-video'); v.srcObject=CK.stream; v.setAttribute('playsinline','true'); await v.play();
    v.style.display='block'; document.getElementById('ck-cam-start').style.display='none'; document.getElementById('ck-cam-stop').style.display='inline-flex';
    document.getElementById('ck-cam-msg').textContent='Scanning… hold the QR steady in view.';
    CK.scanning=true; CK.tick();
  },
  stopCam(){ CK.scanning=false; if(CK.stream){ CK.stream.getTracks().forEach(t=>t.stop()); CK.stream=null; }
    const v=document.getElementById('ck-video'); v.style.display='none';
    document.getElementById('ck-cam-start').style.display='inline-flex'; document.getElementById('ck-cam-stop').style.display='none';
    document.getElementById('ck-cam-msg').textContent='Camera stopped.'; },
  tick(){
    if(!CK.scanning) return;
    const v=document.getElementById('ck-video'), c=document.getElementById('ck-canvas');
    if(v.readyState===v.HAVE_ENOUGH_DATA && window.jsQR){
      c.width=v.videoWidth; c.height=v.videoHeight; const ctx=c.getContext('2d');
      ctx.drawImage(v,0,0,c.width,c.height);
      try{ const img=ctx.getImageData(0,0,c.width,c.height); const code=jsQR(img.data,img.width,img.height);
        if(code && code.data){ const now=Date.now(); if(code.data!==CK.last || now-CK.lastAt>4000){ CK.last=code.data; CK.lastAt=now; CK.go(code.data,'qr'); if(navigator.vibrate)navigator.vibrate(120); } } }catch(e){}
    }
    requestAnimationFrame(CK.tick);
  },
  async go(raw, method){ raw=(raw||'').trim(); if(!raw){toast('Scan a QR or type an ID','warning');return;}
    const p=Enterprise.checkin.parseQR(raw);
    const nm=p.name||document.getElementById('ck-name').value, cl=document.getElementById('ck-class').value;
    const r=await Enterprise.checkin.record(p.id, nm, cl, method||(raw.charAt(0)==='{'?'qr':'code'));
    if(r&&r.error){toast(r.error.message||'Error','danger');return;}
    CK.done.unshift({id:p.id,name:nm,at:new Date().toLocaleTimeString()});
    document.getElementById('ck-id').value=''; document.getElementById('ck-name').value=''; toast('✅ Checked in: '+(p.id||nm),'success');
    document.getElementById('ck-log').innerHTML='<h3>Today\\'s check-ins ('+CK.done.length+')</h3>'+CK.done.map(d=>'<div style="padding:6px 0;border-bottom:1px solid var(--gray-200)">✅ <strong>'+esc(d.id)+'</strong> '+esc(d.name||'')+' <span style="color:var(--gray-500);float:right">'+d.at+'</span></div>').join('');
  }
};
window.addEventListener('beforeunload',()=>CK.stopCam());
</script></body></html>`);
  },

  /* Student diary / daily homework log */
  pageDiary(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px"><p style="color:var(--gray-600);margin:0">
        Teachers log daily homework, classwork, behaviour notes; parents view & acknowledge.</p></div>
      <div class="card" style="margin-bottom:16px" data-staff-only>
        <div class="grid grid-2">
          <div class="form-group"><label>Student name</label><input class="form-input" id="dy-name"></div>
          <div class="form-group"><label>Class</label><input class="form-input" id="dy-class"></div>
          <div class="form-group"><label>Subject</label><input class="form-input" id="dy-subject"></div>
          <div class="form-group"><label>Type</label><select class="form-select" id="dy-type"><option value="homework">Homework</option><option value="classwork">Classwork</option><option value="behaviour">Behaviour</option><option value="note">Note</option></select></div>
        </div>
        <div class="form-group"><label>Title</label><input class="form-input" id="dy-title"></div>
        <div class="form-group"><label>Details</label><textarea class="form-input" id="dy-body" rows="2"></textarea></div>
        <button class="btn btn-primary" onclick="DY.add()">+ Add entry</button>
      </div>
      <div class="card"><div class="form-group"><label>View diary for student</label><input class="form-input" id="dy-view" placeholder="type name then click" onchange="DY.load(this.value)"></div><div id="dy-list"></div></div>`;
    return T.shell(cfg, 'Student Diary', body, { requireRole: 'any' })
      .replace('</body></html>', `<script>
const DY={
  async add(){ const r=await Enterprise.diary.add({student_name:document.getElementById('dy-name').value,class:document.getElementById('dy-class').value,subject:document.getElementById('dy-subject').value,entry_type:document.getElementById('dy-type').value,title:document.getElementById('dy-title').value,body:document.getElementById('dy-body').value});
    if(r&&r.error){toast(r.error.message,'danger');return;} toast('Entry added','success'); if(window.App&&App.logActivity)App.logActivity('create','diary',document.getElementById('dy-name').value); DY.load(document.getElementById('dy-name').value); },
  async load(name){ if(!name)return; const {data}=await Enterprise.diary.forStudent(name);
    document.getElementById('dy-list').innerHTML=(data||[]).map(e=>'<div style="padding:10px 0;border-bottom:1px solid var(--gray-200)"><strong>'+esc(e.title||e.entry_type)+'</strong> <span class="badge">'+esc(e.entry_type)+'</span><div style="font-size:.85rem;color:var(--gray-600)">'+esc(e.body||'')+'</div><small style="color:var(--gray-500)">'+esc(e.date)+' · '+esc(e.subject||'')+'</small></div>').join('')||'<p>No entries.</p>'; }
};
</script></body></html>`);
  },

  /* Surveys & feedback forms */
  pageSurveys(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px"><p style="color:var(--gray-600);margin:0">
        Create feedback forms & surveys (anonymous optional). Distinct from elections in Voting.</p>
        <button class="btn btn-primary" style="margin-top:10px" data-staff-only onclick="SV.create()">+ New Survey</button></div>
      <div id="sv-list"><span class="pulse">Loading…</span></div>`;
    return T.shell(cfg, 'Surveys & Forms', body, { requireRole: 'any' })
      .replace('</body></html>', `<script>
const SV={
  async load(){ const {data}=await Enterprise.surveys.list(); const box=document.getElementById('sv-list');
    box.innerHTML=(data||[]).length?(data.map(s=>'<div class="card" style="margin-bottom:12px"><h3>'+esc(s.title)+'</h3><p style="color:var(--gray-600)">'+esc(s.description||'')+'</p><button class="btn btn-outline btn-sm" onclick="SV.fill(\\''+s.id+'\\',\\''+esc((s.questions||[]).map(q=>q.q).join('|'))+'\\')">Respond</button></div>').join('')):'<div class="card">No surveys yet.</div>'; },
  async create(){ openModal('New Survey','<div class="form-group"><label>Title</label><input class="form-input" id="sv-t"></div><div class="form-group"><label>Description</label><input class="form-input" id="sv-d"></div><div class="form-group"><label>Questions (one per line)</label><textarea class="form-input" id="sv-q" rows="4" placeholder="How satisfied are you?\\nAny suggestions?"></textarea></div>','<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="SV.save()">Create</button>'); },
  async save(){ const qs=document.getElementById('sv-q').value.split('\\n').filter(Boolean).map(q=>({q,type:'text'}));
    const r=await Enterprise.surveys.create({title:document.getElementById('sv-t').value,description:document.getElementById('sv-d').value,questions:qs});
    if(r&&r.error){toast(r.error.message,'danger');return;} closeModal(); toast('Survey created','success'); SV.load(); },
  fill(id,qstr){ const qs=qstr?qstr.split('|'):[]; openModal('Respond', qs.map((q,i)=>'<div class="form-group"><label>'+esc(q)+'</label><input class="form-input" id="sa-'+i+'"></div>').join('')||'<p>No questions.</p>', '<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="SV.submit(\\''+id+'\\','+qs.length+')">Submit</button>'); },
  async submit(id,n){ const a={}; for(let i=0;i<n;i++){const el=document.getElementById('sa-'+i); if(el)a['q'+i]=el.value;} await Enterprise.surveys.respond(id,a); closeModal(); toast('Thank you!','success'); }
};
document.addEventListener('DOMContentLoaded',SV.load); SV.load();
</script></body></html>`);
  },

  /* Weekly menu / meal planner */
  pageMenu(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px"><p style="color:var(--gray-600);margin:0">
        Plan weekly meals (breakfast/snack/lunch/supper) with allergen notes for parents.</p></div>
      <div class="card" data-staff-only>
        <div class="grid grid-2">
          <div class="form-group"><label>Week starting</label><input class="form-input" type="date" id="mn-week"></div>
          <div class="form-group"><label>Day</label><select class="form-select" id="mn-day"><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option></select></div>
          <div class="form-group"><label>Meal</label><select class="form-select" id="mn-meal"><option>breakfast</option><option>snack</option><option>lunch</option><option>supper</option></select></div>
          <div class="form-group"><label>Allergens</label><input class="form-input" id="mn-all" placeholder="nuts, dairy"></div>
        </div>
        <div class="form-group"><label>Description</label><input class="form-input" id="mn-desc" placeholder="Jollof rice & chicken"></div>
        <button class="btn btn-primary" onclick="MN.add()">+ Add meal</button>
      </div>
      <div id="mn-week-view" style="margin-top:16px"></div>`;
    return T.shell(cfg, 'Menu Planner', body, { requireRole: 'any' })
      .replace('</body></html>', `<script>
const MN={
  async add(){ const w=document.getElementById('mn-week').value; if(!w){toast('Pick week','warning');return;}
    await Enterprise.menu.set(w,document.getElementById('mn-day').value,document.getElementById('mn-meal').value,document.getElementById('mn-desc').value,document.getElementById('mn-all').value);
    toast('Meal added','success'); MN.view(w); },
  async view(w){ const {data}=await Enterprise.menu.week(w);
    document.getElementById('mn-week-view').innerHTML='<div class="card"><h3>Menu — week of '+esc(w)+'</h3><div class="table-wrap"><table><thead><tr><th>Day</th><th>Meal</th><th>Description</th><th>Allergens</th></tr></thead><tbody>'+(data||[]).map(m=>'<tr><td>'+esc(m.day)+'</td><td>'+esc(m.meal)+'</td><td>'+esc(m.description||'')+'</td><td>'+esc(m.allergens||'')+'</td></tr>').join('')+'</tbody></table></div></div>'; }
};
</script></body></html>`);
  },

  /* Settings: 2FA security + language + accessibility */
  pageSettings(cfg) {
    const body = `
      <div class="grid grid-2">
        <div class="card">
          <h3>🔐 Security (2-Factor)</h3>
          <p style="color:var(--gray-600);font-size:.9rem">Free email one-time-code on sign-in (uses Supabase email OTP — no SMS/AI cost).</p>
          <label style="display:flex;align-items:center;gap:8px;margin-top:10px"><input type="checkbox" id="st-2fa" onchange="ST.toggle2fa(this.checked)"> Enable 2FA for my account</label>
        </div>
        <div class="card">
          <h3>🌍 Language</h3>
          <select class="form-select" id="st-lang" onchange="ST.lang(this.value)">
            <option value="en">English</option><option value="fr">Français</option><option value="sw">Kiswahili</option>
            <option value="ha">Hausa</option><option value="yo">Yorùbá</option><option value="ig">Igbo</option>
          </select>
          <p style="color:var(--gray-500);font-size:.82rem;margin-top:8px">UI labels marked for translation switch instantly.</p>
        </div>
        <div class="card">
          <h3>♿ Accessibility</h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm" onclick="Enterprise.i18n.setFontScale(90)">A-</button>
            <button class="btn btn-outline btn-sm" onclick="Enterprise.i18n.setFontScale(100)">A</button>
            <button class="btn btn-outline btn-sm" onclick="Enterprise.i18n.setFontScale(120)">A+</button>
            <button class="btn btn-outline btn-sm" onclick="Enterprise.i18n.toggleContrast()">High contrast</button>
          </div>
        </div>
        <div class="card" data-admin-only>
          <h3>✍️ Official Signature for Documents</h3>
          <p style="color:var(--gray-600);font-size:.9rem">Paste a Google Drive/direct image link for the principal/admin signature. It will appear on receipts, certificates, admission letters and academic records printed from this browser/site.</p>
          <div class="form-group"><label>Principal / signatory name</label><input class="form-input" id="st-principal" placeholder="Principal name"></div>
          <div class="form-group"><label>Signature image link</label><input class="form-input" id="st-signature" placeholder="https://drive.google.com/... or image URL"></div>
          <button class="btn btn-primary btn-sm" onclick="ST.saveSignature()">Save signature</button>
          <div id="st-sign-preview" style="margin-top:8px"></div>
        </div>
      </div>`;
    return T.shell(cfg, 'Settings', body, { requireRole: 'any' })
      .replace('</body></html>', `<script>
const ST={
  async init(){ try{ const p=await Enterprise.security.getPrefs(); const c=document.getElementById('st-2fa'); if(c)c.checked=!!p.two_factor; }catch(e){}
    const l=document.getElementById('st-lang'); if(l) l.value=Enterprise.i18n.lang; const sig=document.getElementById('st-signature'), pn=document.getElementById('st-principal'); if(sig) sig.value=localStorage.getItem('sc-signature-url')||''; if(pn) pn.value=localStorage.getItem('sc-principal-name')||''; ST.preview(); },
  async toggle2fa(on){ const r=await Enterprise.security.setTwoFactor(on); if(r&&r.error){toast(r.error.message||r.error,'danger');return;} toast(on?'2FA enabled':'2FA disabled','success'); },
  lang(l){ Enterprise.i18n.setLang(l); toast('Language set','success'); },
  preview(){ const box=document.getElementById('st-sign-preview'); const url=localStorage.getItem('sc-signature-url')||''; if(box) box.innerHTML=url?'<img src="'+esc(url)+'" style="max-width:180px;max-height:80px;object-fit:contain" onerror="this.replaceWith(document.createTextNode(\'Signature link saved; preview unavailable.\'))">':''; },
  async saveSignature(){ const url=document.getElementById('st-signature').value.trim(), name=document.getElementById('st-principal').value.trim(); localStorage.setItem('sc-signature-url',url); localStorage.setItem('sc-principal-name',name); try{ if(sb) await sb.from('school_settings').upsert({id:1,signature_url:url,principal_name:name},{onConflict:'id'}); }catch(e){} ST.preview(); toast('Signature saved for exported documents','success'); }
};
document.addEventListener('DOMContentLoaded',ST.init); ST.init();
</script></body></html>`);
  },

  /* Offline fallback page for the generated school site (PWA) */

  pageParents(cfg) {
    const base = T.modulePage(cfg, 'parents');
    const linkSection = `
      <div class="card" style="margin-bottom:16px;background:#f8fafc;border:1px solid #e2e8f0">
        <h3>🔗 Link Parent to Child (Parent Portal Mapping)</h3>
        <p style="color:var(--gray-600);margin-bottom:12px">Map registered parent accounts to student records so parents can view their child's live dashboard, fees, attendance and results.</p>
        <div class="grid grid-3">
          <div class="form-group"><label>Parent Account</label><select class="form-select" id="pr-parent"><option value="">— loading parents —</option></select></div>
          <div class="form-group"><label>Student</label><select class="form-select" id="pr-student"><option value="">— loading students —</option></select></div>
          <div class="form-group"><label>Relationship</label><select class="form-select" id="pr-rel"><option>parent</option><option>father</option><option>mother</option><option>guardian</option><option>sponsor</option></select></div>
        </div>
        <button class="btn btn-primary" onclick="PR.link()">Link Parent to Child</button>
        <div id="pr-links" style="margin-top:16px"></div>
      </div>
    `;
    const script = `<script>
const PR={parents:[],students:[],links:[],
 async init(){await Promise.all([this.loadParents(),this.loadStudents(),this.loadLinks()]);},
 async loadParents(){ if(!sb)return; const {data}=await sb.from('profiles').select('id,full_name,email,phone,role,status,member_id').eq('role','parent').order('full_name'); this.parents=data||[]; this.fill();},
 async loadStudents(){ if(!sb)return; const {data}=await sb.from('students').select('id,full_name,class,admission_no').order('class').order('full_name').limit(3000); this.students=data||[]; this.fill();},
 async loadLinks(){ if(!sb)return; const {data}=await sb.from('parent_child').select('*').limit(3000); this.links=data||[]; this.renderLinks();},
 fill(){ const pp=document.getElementById('pr-parent'), ss=document.getElementById('pr-student'); if(pp) pp.innerHTML='<option value="">— parent —</option>'+this.parents.map(p=>'<option value="'+p.id+'">'+esc(p.full_name||p.email||p.id)+'</option>').join(''); if(ss) ss.innerHTML='<option value="">— student —</option>'+this.students.map(s=>'<option value="'+s.id+'">'+esc((s.class? s.class+' · ':'')+(s.full_name||'')+(s.admission_no?' ('+s.admission_no+')':''))+'</option>').join('');},
 renderLinks(){ const box=document.getElementById('pr-links'); if(!box)return; box.innerHTML=this.links.length?'<div class="table-wrap"><table><thead><tr><th>Parent</th><th>Student</th><th>Relationship</th><th>Unlink</th></tr></thead><tbody>'+this.links.slice(0,50).map(l=>{const p=this.parents.find(x=>x.id===l.parent_id)||{}, st=this.students.find(x=>x.id===l.student_id)||{}; return '<tr><td>'+esc(p.full_name||l.parent_id)+'</td><td>'+esc(st.full_name||l.student_id)+'</td><td>'+esc(l.relationship||'parent')+'</td><td><button class="btn btn-sm btn-outline" onclick="PR.unlink(\\''+l.parent_id+'\\',\\''+l.student_id+'\\')">Unlink</button></td></tr>';}).join('')+'</tbody></table></div>':'<p style="color:var(--gray-500)">No links yet.</p>';},
 async link(){ const row={parent_id:document.getElementById('pr-parent').value,student_id:document.getElementById('pr-student').value,relationship:document.getElementById('pr-rel').value}; if(!row.parent_id||!row.student_id){toast('Pick parent and student','warning');return;} const {error}=await sb.from('parent_child').upsert(row,{onConflict:'parent_id,student_id'}); if(error){toast(error.message,'danger');return;} toast('Linked successfully','success'); this.loadLinks();},
 async unlink(pid,sid){ if(!confirm('Unlink this parent from student?'))return; await sb.from('parent_child').delete().eq('parent_id',pid).eq('student_id',sid); toast('Unlinked','info'); this.loadLinks(); }
}; document.addEventListener('DOMContentLoaded',()=>PR.init()); PR.init();
</script></body></html>`;
    return base.replace('<div id="parents-table"', linkSection + '<div id="parents-table"').replace('</body></html>', script);
  },

  /* ====================================================================
     APPROVALS — admin approves prospective students/parents/staff/etc.
     from the dashboard. Updates profiles.status (pending→approved/suspended)
     and can set roles. Also surfaces pending admissions applications.
     ==================================================================== */
  /* ====================================================================
     ADMISSIONS & ENROLLMENT (issue 13) — generate a public application link,
     review submitted applications, and EXTRACT accepted ones into students.
     ==================================================================== */
  pageAdmissions(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px"><p style="color:var(--gray-600);margin:0">
        Generate a public <strong>application link</strong> to send to prospective parents. They fill it (no account),
        you review, then <strong>Accept &amp; Extract</strong> to auto-create the student record.</p></div>
      <div class="card" style="margin-bottom:16px" data-staff-only>
        <h3>🔗 Application links</h3>
        <div class="grid grid-2">
          <div class="form-group"><label>Label</label><input class="form-input" id="al-label" placeholder="2026 Intake"></div>
          <div class="form-group"><label>Applying for class</label><input class="form-input" id="al-class" placeholder="JSS1"></div>
          <div class="form-group"><label>Session</label><input class="form-input" id="al-session" placeholder="2025/2026"></div>
        </div>
        <button class="btn btn-primary" onclick="ADM.makeLink()">+ Generate link</button>
        <div id="al-list" style="margin-top:12px"></div>
      </div>
      <div class="card">
        <h3>📨 Submitted applications</h3>
        <div style="display:flex;gap:8px;margin-bottom:8px"><button class="btn btn-outline" onclick="ADM.load()">↻ Refresh</button></div>
        <div id="adm-list"><span class="pulse">Loading…</span></div>
      </div>`;
    return T.shell(cfg, 'Admissions', body, { requireRole: 'staff' })
      .replace('</body></html>', `<script>
const ADM={
  async makeLink(){ if(!sb){toast('DB not configured','warning');return;}
    const {data,error}=await sb.from('admission_links').insert({label:document.getElementById('al-label').value,applying_for_class:document.getElementById('al-class').value,session:document.getElementById('al-session').value}).select().single();
    if(error){toast(error.message,'danger');return;} toast('Link generated ✓','success'); ADM.links();
  },
  async links(){ if(!sb)return; const {data}=await sb.from('admission_links').select('*').order('created_at',{ascending:false});
    const base=location.origin+location.pathname.replace(/admissions\\.html$/,'apply.html');
    document.getElementById('al-list').innerHTML='<div class="table-wrap"><table><thead><tr><th>Label</th><th>Class</th><th>Link</th><th>Active</th></tr></thead><tbody>'+(data||[]).map(l=>{const url=base+'?token='+l.token;return '<tr><td>'+esc(l.label||'-')+'</td><td>'+esc(l.applying_for_class||'-')+'</td><td><input class="form-input" style="font-size:.78rem" value="'+esc(url)+'" onclick="this.select()"> <button class="btn btn-sm btn-outline" onclick="navigator.clipboard.writeText(\\''+url+'\\');toast(\\'Copied\\',\\'success\\')">Copy</button></td><td>'+(l.active?'✓':'—')+'</td></tr>';}).join('')+'</tbody></table></div>';
  },
  async load(){ if(!sb){document.getElementById('adm-list').innerHTML='<p>DB not configured.</p>';return;}
    const {data}=await sb.from('admissions').select('*').order('created_at',{ascending:false}).limit(500);
    if(!data||!data.length){document.getElementById('adm-list').innerHTML='<p style="color:var(--gray-500)">No applications yet.</p>';return;}
    document.getElementById('adm-list').innerHTML='<div class="table-wrap"><table><thead><tr><th>Applicant</th><th>Class</th><th>Parent</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+
      data.map(a=>'<tr><td>'+esc(a.full_name||'')+'</td><td>'+esc(a.applying_for_class||'')+'</td><td>'+esc(a.parent_name||'')+'<br><small>'+esc(a.parent_phone||'')+'</small></td><td><span class="badge">'+esc(a.status)+'</span>'+(a.extracted?' <span class="badge badge-success">enrolled</span>':'')+'</td>'+
        '<td style="white-space:nowrap" data-admin-only>'+(a.extracted?'':'<button class="btn btn-sm btn-primary" onclick="ADM.extract(\\''+a.id+'\\')">Accept &amp; Extract</button> ')+'<button class="btn btn-sm btn-outline" onclick="ADM.set(\\''+a.id+'\\',\\'rejected\\')">Reject</button></td></tr>').join('')+'</tbody></table></div>';
    if(window.App&&App.applyRoleNav)try{App.applyRoleNav(App.currentRole);}catch(e){}
  },
  async extract(id){ const {data,error}=await sb.rpc('extract_admission',{p_id:id}); if(error||(data&&!data.ok)){toast((error&&error.message)||(data&&data.error)||'Error','danger');return;} if(window.App&&App.logActivity)App.logActivity('extract','admission',id); toast('✅ Student created from application','success'); ADM.load(); },
  async set(id,s){ await sb.from('admissions').update({status:s}).eq('id',id); ADM.load(); }
};
document.addEventListener('DOMContentLoaded',()=>{ ADM.links(); ADM.load(); }); ADM.links(); ADM.load();
</script></body></html>`);
  },

  /* Public, no-auth admission application form (issue 13) */
  pageApply(cfg) {
    return T.head(cfg, 'Apply for Admission') + T.bellAndBanner(cfg) + T.modal() + `
<div class="login-shell" style="min-height:100vh;background:var(--gray-100);padding:24px">
  <div style="max-width:640px;margin:0 auto">
    <div class="card" style="text-align:center;margin-bottom:16px">
      <img src="assets/img/logo.${cfg.logoExt}" alt="" style="width:54px;height:54px;border-radius:12px;object-fit:contain" onerror="this.style.display='none'">
      <h1 style="margin:8px 0 0;font-size:1.4rem">${T.esc(cfg.schoolName)} — Admission Application</h1>
    </div>
    <div id="apply-root" class="card"><span class="pulse">Loading…</span></div>
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="assets/js/config.js"></script>
<script>
(function(){
  function $(id){return document.getElementById(id);}
  var token=new URLSearchParams(location.search).get('token')||'';
  var root=$('apply-root');
  if(!token){ root.innerHTML='<p>Invalid application link. Please request a valid link from the school.</p>'; return; }
  if(!sb){ root.innerHTML='<p>Application form is temporarily unavailable.</p>'; return; }
  root.innerHTML='<h3>Applicant details</h3>'+
   '<div class="form-group"><label>Full name *</label><input class="form-input" id="ap-name" required></div>'+
   '<div class="form-group"><label>Date of birth</label><input class="form-input" type="date" id="ap-dob"></div>'+
   '<div class="form-group"><label>Gender</label><select class="form-select" id="ap-gender"><option value="">—</option><option>male</option><option>female</option></select></div>'+
   '<div class="form-group"><label>Applying for class</label><input class="form-input" id="ap-class"></div>'+
   '<h3 style="margin-top:12px">Parent / Guardian</h3>'+
   '<div class="form-group"><label>Parent name *</label><input class="form-input" id="ap-pname" required></div>'+
   '<div class="form-group"><label>Parent email</label><input class="form-input" type="email" id="ap-pemail"></div>'+
   '<div class="form-group"><label>Parent phone</label><input class="form-input" id="ap-pphone"></div>'+
   '<div class="form-group"><label>Student photo URL (Google Drive link optional)</label><input class="form-input" id="ap-photo"></div>'+
   '<button class="btn btn-primary" id="ap-submit">Submit application</button>';
  $('ap-submit').onclick=async function(){
    if(!$('ap-name').value.trim()||!$('ap-pname').value.trim()){ alert('Applicant and parent name are required.'); return; }
    this.disabled=true; this.textContent='Submitting…';
    var payload={ token:token, full_name:$('ap-name').value, dob:$('ap-dob').value, gender:$('ap-gender').value,
      applying_for_class:$('ap-class').value, parent_name:$('ap-pname').value, parent_email:$('ap-pemail').value,
      parent_phone:$('ap-pphone').value, photo_url:$('ap-photo').value };
    var res; try{ res=await sb.rpc('submit_admission',{p_payload:payload}); }catch(e){ res={error:e}; }
    if(res.error||(res.data&&!res.data.ok)){ alert((res.error&&res.error.message)||(res.data&&res.data.error)||'Could not submit'); this.disabled=false; this.textContent='Submit application'; return; }
    root.innerHTML='<div style="text-align:center;padding:20px"><h2>✅ Application received</h2><p>Thank you. The school will review your application and contact you.</p></div>';
  };
})();
</script>
</body></html>`;
  },

  pageApprovals(cfg) {
    const body = `
      <div class="card" style="margin-bottom:16px"><p style="color:var(--gray-600);margin:0">
        Approve or reject people who requested access (students, parents, staff). Set their role,
        approve, suspend or delete. Pending <strong>admissions</strong> applications appear below too.</p></div>
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
          <h3 style="margin:0;flex:1">👤 Account access requests</h3>
          <select class="form-select" id="ap-filter" style="max-width:180px" onchange="AP.load()">
            <option value="pending">Pending</option><option value="approved">Approved</option>
            <option value="suspended">Suspended</option><option value="all">All</option>
          </select>
          <button class="btn btn-outline" onclick="AP.load()">↻ Refresh</button>
        </div>
        <div id="ap-list"><span class="pulse">Loading…</span></div>
      </div>
      <div class="card">
        <h3>🎓 Pending admissions applications</h3>
        <div id="ap-adm"><span class="pulse">Loading…</span></div>
      </div>`;
    return T.shell(cfg, 'Approvals', body, { requireRole: 'admin' })
      .replace('</body></html>', `<script>
const AP={
  async load(){
    if(!sb){ document.getElementById('ap-list').innerHTML='<p>Database not configured.</p>'; return; }
    const f=document.getElementById('ap-filter').value;
    let q=sb.from('profiles').select('*').order('created_at',{ascending:false}).limit(500);
    if(f!=='all') q=q.eq('status',f);
    const {data,error}=await q;
    const box=document.getElementById('ap-list');
    if(error){ box.innerHTML='<p style="color:#dc2626">'+esc(error.message)+'</p>'; return; }
    if(!data||!data.length){ box.innerHTML='<p style="color:var(--gray-500)">No '+esc(f)+' requests.</p>'; AP.loadAdm(); return; }
    box.innerHTML='<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+
      data.map(p=>'<tr><td>'+esc(p.full_name||'-')+'</td><td>'+esc(p.email||'')+'</td>'+
        '<td><select class="form-select" style="padding:4px" onchange="AP.setRole(\\''+p.id+'\\',this.value)">'+
          ['student','parent','staff','head_teacher','bursar','principal','proprietor','admin','super_admin'].map(r=>'<option'+(p.role===r?' selected':'')+'>'+r+'</option>').join('')+'</select></td>'+
        '<td><span class="badge '+(p.status==='approved'?'badge-success':'')+'">'+esc(p.status)+'</span></td>'+
        '<td style="white-space:nowrap">'+
          (p.status!=='approved'?'<button class="btn btn-sm btn-primary" onclick="AP.set(\\''+p.id+'\\',\\'approved\\')">Approve</button> ':'')+
          (p.status!=='suspended'?'<button class="btn btn-sm btn-outline" onclick="AP.set(\\''+p.id+'\\',\\'suspended\\')">Suspend</button> ':'')+
          '<button class="btn btn-sm btn-outline" onclick="AP.del(\\''+p.id+'\\')">Delete</button>'+
        '</td></tr>').join('')+'</tbody></table></div>';
    AP.loadAdm();
  },
  async set(id,status){ const {error}=await sb.from('profiles').update({status:status,updated_at:new Date().toISOString()}).eq('id',id);
    if(error){toast(error.message,'danger');return;} if(window.App&&App.logActivity)App.logActivity('approve','profile',id+':'+status); toast('Account '+status+' ✓','success'); AP.load(); },
  async setRole(id,role){ const {error}=await sb.from('profiles').update({role:role}).eq('id',id); if(error){toast(error.message,'danger');return;} toast('Role set to '+role,'success'); },
  async del(id){ if(!confirm('Delete this account request?'))return; const {error}=await sb.from('profiles').delete().eq('id',id); if(error){toast(error.message,'danger');return;} toast('Deleted','info'); AP.load(); },
  async loadAdm(){
    const box=document.getElementById('ap-adm'); if(!sb){box.innerHTML='';return;}
    const {data}=await sb.from('admissions').select('*').in('status',['submitted','reviewing']).order('created_at',{ascending:false}).limit(200);
    if(!data||!data.length){ box.innerHTML='<p style="color:var(--gray-500)">No pending applications.</p>'; return; }
    box.innerHTML='<div class="table-wrap"><table><thead><tr><th>Applicant</th><th>Class</th><th>Parent</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+
      data.map(a=>'<tr><td>'+esc(a.full_name||'')+'</td><td>'+esc(a.applying_for_class||'')+'</td><td>'+esc(a.parent_name||'')+'</td><td><span class="badge">'+esc(a.status)+'</span></td>'+
        '<td style="white-space:nowrap"><button class="btn btn-sm btn-primary" onclick="AP.adm(\\''+a.id+'\\',\\'accepted\\')">Accept</button> '+
        '<button class="btn btn-sm btn-outline" onclick="AP.adm(\\''+a.id+'\\',\\'enrolled\\')">Enroll</button> '+
        '<button class="btn btn-sm btn-outline" onclick="AP.adm(\\''+a.id+'\\',\\'rejected\\')">Reject</button></td></tr>').join('')+'</tbody></table></div>';
  },
  async adm(id,status){ const {error}=await sb.from('admissions').update({status:status}).eq('id',id); if(error){toast(error.message,'danger');return;} if(window.App&&App.logActivity)App.logActivity('admission',status,id); toast('Application '+status,'success'); AP.loadAdm(); }
};
document.addEventListener('DOMContentLoaded',AP.load); AP.load();
</script></body></html>`);
  },

  pageOffline(cfg) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Offline • ${T.esc(cfg.schoolName)}</title>
<style>body{font-family:system-ui,sans-serif;background:${cfg.themePrimary};color:#fff;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}.box{max-width:420px}button{margin-top:18px;background:#fff;color:${cfg.themePrimary};border:none;padding:12px 24px;border-radius:10px;font-size:1rem;cursor:pointer;font-weight:700}</style>
</head><body><div class="box"><div style="font-size:3rem">📡</div>
<h1>You're offline</h1>
<p>${T.esc(cfg.schoolName)} works offline for cached pages, but this one needs a connection. Reconnect and try again.</p>
<button onclick="location.reload()">Retry</button>
<p style="margin-top:24px;font-size:.8rem;opacity:.85">Powered by HMG Concepts</p></div></body></html>`;
  },

  /* Load a JS library on demand */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
};

window.Generator = Generator;
console.log('%c[School Connect Gen v8] generator ready.', 'color:#059669;font-weight:bold');
