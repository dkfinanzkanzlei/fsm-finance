/**
 * FSM Finance – Lead-Sammler (Google Apps Script)
 * Schreibt jede Anfrage aus dem Website-Formular in die Tabelle "FSM Finance Leads"
 * und schickt eine Benachrichtigung per Mail.
 *
 * Einrichtung (einmalig, ca. 3 Minuten):
 *  1. Tabelle "FSM Finance Leads" öffnen → Erweiterungen → Apps Script
 *  2. Vorhandenen Code löschen, diesen Code einfügen, speichern
 *  3. Bereitstellen → Neue Bereitstellung → Typ "Web-App"
 *     Ausführen als: "Ich" · Zugriff: "Jeder" → Bereitstellen → Zugriff erlauben
 *  4. Die Web-App-URL kopieren und in wizard.js bei SHEET_URL eintragen
 *  Nach jeder Code-Änderung: Bereitstellen → Bereitstellungen verwalten → Bearbeiten → Neue Version.
 */
const MAIL_TO = 'info@fsm-finance.de';
const SHEET_ID = '16CPTDyAdRynelqeEQYVJGpnS_mKAQrx42p74l51C7_0'; // Tabelle "FSM Finance Leads"
const COLS = ['Datum', 'Quelle', 'Vorname', 'Nachname', 'Handynummer', 'E-Mail', 'Thema', 'Nachricht', 'Qualifizierung', 'Newsletter', 'Einwilligung'];

function doPost(e) {
  const d = JSON.parse(e.postData.contents || '{}');
  if (d.website) return out({ ok: true }); // Honeypot: Bots füllen das versteckte Feld
  const tel = String(d.tel || '').trim();
  const email = String(d.email || '').trim();
  if (tel.replace(/\D/g, '').length < 8 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return out({ ok: false, error: 'invalid' });

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLS);
    sheet.getRange(1, 1, 1, COLS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  const name = String(d.name || '').trim();
  const i = name.indexOf(' ');
  const vorname = i > 0 ? name.slice(0, i) : name;
  const nachname = i > 0 ? name.slice(i + 1) : '';
  const row = sheet.getLastRow() + 1;
  sheet.getRange(row, 2, 1, COLS.length - 1).setNumberFormat('@'); // sonst wird "+49 …" als Formel gelesen
  sheet.getRange(row, 1, 1, COLS.length).setValues([[
    new Date(), 'Website', vorname, nachname, tel.replace(/^\+/, ''), email,
    d.thema || '', d.nachricht || '', d.qualifizierung || '', d.newsletter ? 'ja' : '', d.datenschutz ? 'ja' : 'nein',
  ]]);

  try {
    const rows = [['Name', name], ['E-Mail', email], ['Telefon', tel], ['Thema', d.thema], ['Nachricht', d.nachricht],
                  ['Qualifizierung', d.qualifizierung], ['Newsletter', d.newsletter ? 'ja' : ''], ['Einwilligung', d.datenschutz ? 'ja' : 'nein']]
      .filter(([, v]) => v);
    MailApp.sendEmail({
      to: MAIL_TO, replyTo: email,
      subject: 'Neue ' + (d.thema ? d.thema + '-Anfrage' : 'Kontaktanfrage') + ' von ' + (name || email),
      htmlBody: '<h2>Kontaktanfrage über fsm-finance.de</h2><table cellpadding="6">' +
        rows.map(([k, v]) => '<tr><td><b>' + esc(k) + '</b></td><td>' + esc(v).replace(/\n/g, '<br>') + '</td></tr>').join('') +
        '</table><p><a href="' + SpreadsheetApp.openById(SHEET_ID).getUrl() + '">Zur Lead-Tabelle</a></p>',
    });
  } catch (err) { console.error('Mail fehlgeschlagen: ' + err); } // Zeile steht trotzdem in der Tabelle
  return out({ ok: true });
}

function doGet() { return out({ ok: true, info: 'FSM Finance Lead-Endpoint' }); }
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
