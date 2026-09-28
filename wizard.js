/* FSM Finance – Kontakt-Fragebogen (2 Schritte).
   Sendet an das Google Apps Script (scripts/leads-sheet.gs), das in die Tabelle schreibt und die Mail schickt. */
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbxR6CN4iMDHdDVE-m5AbPWegR051qc4R3psWPU_yvXossba6ctiTGM5EHkUaMnNntT6/exec';
const QUESTIONS = [
  { key: 'situation', q: 'Was beschreibt deine aktuelle berufliche Situation?', options: ['Student/in', 'Berufseinsteiger/in', 'Angestellt', 'Beamter/Beamtin', 'Selbstständig'] },
  { key: 'alter', q: 'Wie alt bist du?', options: ['Unter 20', '20–25', '26–30', '31–35', '36–45', '46–55', 'Über 55'] },
  { key: 'einkommen', q: 'Wie hoch ist dein monatliches Nettoeinkommen?', options: ['Unter 1.500 €', '1.500–3.000 €', '3.000–5.000 €', 'Über 5.000 €'] },
  { key: 'sparen', q: 'Sparst du bereits regelmäßig?', options: ['Ja, jeden Monat', 'Ja, aber unregelmäßig', 'Nein, noch nicht'] },
  { key: 'foerderung', q: 'Nutzt du staatliche Förderungen bereits aus?', options: ['Ja', 'Nein', 'Weiß ich nicht'] },
  { key: 'thema', q: 'Was interessiert dich am meisten?', options: ['Altersvorsorge', 'Arbeitsunfähigkeitsabsicherung', 'Krankenversicherung', 'Versicherungen & Absicherung', 'Immobilien', 'Investment'] },
];
const PHONE = '+49 179 7610625';

const wz = document.getElementById('wizard');
const body = wz.querySelector('.wz-body');
const steps = wz.querySelectorAll('.wz-steps span');
let step = 1, qi = 0, answers = {}, sending = false, busy = false;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function swap(html, dir = 1) {
  busy = true;
  body.classList.add(dir > 0 ? 'out-l' : 'out-r');
  setTimeout(() => { body.innerHTML = html; body.classList.remove('out-l', 'out-r'); busy = false; }, 220);
}
function setStep(n) { step = n; steps.forEach((s, i) => s.classList.toggle('on', i < n)); }

function renderQuestion(dir = 1) {
  setStep(1);
  const q = QUESTIONS[qi];
  swap(`
    <p class="wz-count">Frage ${qi + 1} von ${QUESTIONS.length}</p>
    <h3>${esc(q.q)}</h3>
    <div class="wz-opts">${q.options.map(o => `<button type="button" class="wz-opt${answers[q.key] === o ? ' sel' : ''}" data-k="${q.key}" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
    ${qi > 0 ? '<button type="button" class="wz-back" data-back>← Zurück</button>' : ''}`, dir);
}

function renderData(dir = 1) {
  setStep(2);
  swap(`
    <form class="wz-form" novalidate>
      <h3>Deine Kontaktdaten</h3>
      <div class="two">
        <label>Vorname <input name="vorname" required autocomplete="given-name"></label>
        <label>Nachname <input name="nachname" required autocomplete="family-name"></label>
      </div>
      <div class="two">
        <label>E-Mail <input name="email" type="email" required autocomplete="email"></label>
        <label>Handynummer <input name="tel" type="tel" required autocomplete="tel"></label>
      </div>
      <label>Willst du uns vorab etwas mitgeben? <span class="opt">(optional)</span><textarea name="nachricht" rows="3" placeholder="Zum Beispiel: Worum geht es dir, wann bist du gut erreichbar?"></textarea></label>
      <input name="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
      <label class="chk"><input type="checkbox" name="newsletter"> <span>Schickt mir gelegentlich Tipps rund ums Geld per E-Mail.</span></label>
      <label class="chk"><input type="checkbox" name="datenschutz" required> <span>Ja, FSM Finance darf mich zu meiner Anfrage kontaktieren, telefonisch, per WhatsApp, SMS oder E-Mail. Es gilt die <a href="datenschutz.html" target="_blank">Datenschutzerklärung</a>. *</span></label>
      <p class="err" role="alert"></p>
      <div class="wz-actions">
        <button type="button" class="wz-back" data-back>← Zurück</button>
        <button type="submit" class="btn btn-onnavy">Anfrage abschicken <span class="ic"><i class="ph-light ph-paper-plane-tilt"></i></span></button>
      </div>
      <small>Kostenlos und unverbindlich. Wir melden uns zeitnah bei dir.</small>
    </form>`, dir);
}

function renderDone(vorname) {
  steps.forEach(s => s.classList.add('on'));
  swap(`
    <div class="wz-done">
      <span class="ok"><i class="ph-light ph-check"></i></span>
      <h3>Danke${vorname ? ', ' + esc(vorname) : ''}!</h3>
      <p>Deine Anfrage ist bei uns angekommen. Julius oder Denis melden sich zeitnah bei dir.</p>
      <a class="btn btn-onnavy" href="https://www.instagram.com/fsm.finance/" target="_blank" rel="noopener">Bis dahin: Instagram <span class="ic"><i class="ph-light ph-instagram-logo"></i></span></a>
    </div>`);
}

async function submit(form) {
  if (sending) return;
  const f = new FormData(form), err = form.querySelector('.err');
  const need = ['vorname', 'nachname', 'email', 'tel'].filter(k => !String(f.get(k) || '').trim());
  if (need.length || !f.get('datenschutz')) { err.textContent = 'Bitte alle Pflichtfelder ausfüllen und der Kontaktaufnahme zustimmen.'; return; }
  if (String(f.get('tel')).replace(/\D/g, '').length < 8) { err.textContent = 'Bitte eine gültige Handynummer angeben.'; return; }
  err.textContent = ''; sending = true; form.querySelector('[type=submit]').disabled = true;
  const payload = {
    type: 'kontakt', thema: answers.thema || '',
    name: `${f.get('vorname')} ${f.get('nachname')}`.trim(), email: f.get('email'), tel: f.get('tel'),
    nachricht: f.get('nachricht') || '', newsletter: !!f.get('newsletter'), datenschutz: !!f.get('datenschutz'),
    website: f.get('website') || '',
    qualifizierung: QUESTIONS.map(q => `${q.q} ${answers[q.key] ?? '–'}`).join(' | '),
  };
  let ok = false;
  if (SHEET_URL) {
    // text/plain vermeidet den CORS-Preflight, Apps Script antwortet mit JSON
    try { const r = await fetch(SHEET_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) }); ok = r.ok && (await r.json()).ok; } catch {}
  } else {
    // ponytail: solange keine SHEET_URL eingetragen ist, geht die Anfrage per Mailprogramm raus
    const body = `Name: ${payload.name}\nE-Mail: ${payload.email}\nTelefon: ${payload.tel}\nThema: ${payload.thema}\n\n${payload.nachricht}\n\nQualifizierung: ${payload.qualifizierung}`;
    location.href = `mailto:info@fsm-finance.de?subject=${encodeURIComponent('Anfrage Erstgespräch: ' + payload.thema)}&body=${encodeURIComponent(body)}`;
    ok = true;
  }
  sending = false;
  if (ok) { renderDone(f.get('vorname')); return; }
  form.querySelector('[type=submit]').disabled = false;
  err.textContent = `Deine Anfrage konnte gerade nicht gesendet werden. Bitte versuch es gleich nochmal oder ruf uns an: ${PHONE}.`;
}

body.addEventListener('click', e => {
  if (busy) return;
  const o = e.target.closest('.wz-opt');
  if (o) { busy = true; answers[o.dataset.k] = o.dataset.o; o.classList.add('sel');
    setTimeout(() => { if (qi < QUESTIONS.length - 1) { qi++; renderQuestion(1); } else renderData(1); }, 240); return; }
  if (e.target.closest('[data-back]')) { if (step === 2) { renderQuestion(-1); } else if (qi > 0) { qi--; renderQuestion(-1); } }
});
body.addEventListener('submit', e => { e.preventDefault(); submit(e.target); });
renderQuestion();
