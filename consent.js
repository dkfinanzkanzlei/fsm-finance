/* FSM Finance – Cookie-Consent (ohne Fremdbibliothek)
   Tracking-IDs eintragen, sobald vorhanden. Leer = Tool wird nie geladen. */
const TRACKING = {
  ga4: '',        // PRÜFEN: z. B. 'G-XXXXXXXXXX'
  metaPixel: '',  // PRÜFEN: z. B. '1234567890'
};
const KEY = 'fsm-consent-v1';

const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const save = c => { try { localStorage.setItem(KEY, JSON.stringify({ ...c, ts: Date.now() })); } catch {} };

function loadTracking(c) {
  if (c.analytics && TRACKING.ga4 && !window.gtag) {
    const s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + TRACKING.ga4; document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date()); gtag('config', TRACKING.ga4, { anonymize_ip: true });
  }
  if (c.marketing && TRACKING.metaPixel && !window.fbq) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', TRACKING.metaPixel); fbq('track', 'PageView');
  }
}

function banner() {
  const el = document.createElement('div');
  el.className = 'consent'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Cookie-Einstellungen');
  el.innerHTML = `
    <div class="bezel"><div class="consent-in">
      <div class="consent-txt">
        <b>Cookies &amp; Datenschutz</b>
        <p>Wir nutzen technisch notwendige Cookies. Statistik- und Marketing-Cookies setzen wir nur mit deiner Zustimmung. Details in der <a href="datenschutz.html">Datenschutzerklärung</a>.</p>
        <div class="consent-opts">
          <label><input type="checkbox" checked disabled> Notwendig</label>
          <label><input type="checkbox" name="analytics"> Statistik</label>
          <label><input type="checkbox" name="marketing"> Marketing</label>
        </div>
      </div>
      <div class="consent-btns">
        <button class="btn btn-primary simple" data-c="all">Alle akzeptieren</button>
        <button class="btn btn-secondary simple" data-c="sel">Auswahl speichern</button>
        <button class="btn btn-secondary simple" data-c="none">Nur notwendige</button>
      </div>
    </div></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    const q = n => el.querySelector(`[name=${n}]`).checked;
    const c = b.dataset.c === 'all' ? { analytics: true, marketing: true }
            : b.dataset.c === 'sel' ? { analytics: q('analytics'), marketing: q('marketing') }
            : { analytics: false, marketing: false };
    save(c); loadTracking(c);
    el.classList.remove('show'); setTimeout(() => el.remove(), 600);
  });
}

const c = read();
if (c) loadTracking(c); else banner();
document.querySelectorAll('[data-consent-open]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault(); if (!document.querySelector('.consent')) banner();
}));
