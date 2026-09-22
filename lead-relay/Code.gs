/**
 * Noody Tap — lead relay
 *
 * Receives an exchange-details submission from the tap card and emails it to
 * Scott. Runs in Scott's own Google account: no third party ever holds the
 * contact details of the people he meets.
 *
 * Deploy: see README.md in this folder.
 */

var NOTIFY_EMAIL = 'scott@noody.co.nz';

function doPost(e) {
  try {
    var lead = JSON.parse(e.postData.contents);

    // Minimal validation — the client validates too, but never trust that.
    if (!lead.name || !lead.email) {
      return json({ ok: false, error: 'name and email are required' });
    }

    var interests = (lead.interests || []).join(', ') || '—';
    var subject = 'Noody Tap — ' + lead.name + (lead.company ? ' (' + lead.company + ')' : '');

    var lines = [
      lead.name + ' just exchanged details with you.',
      '',
      'Name:      ' + lead.name,
      'Company:   ' + (lead.company || '—'),
      'Email:     ' + lead.email,
      'Phone:     ' + (lead.phone || '—'),
      'Wants:     ' + interests,
      '',
      'Met via:   ' + (lead.source || 'direct'),
      'Campaign:  ' + ((lead.campaign && lead.campaign.campaign) || '—'),
      'When:      ' + (lead.createdAt || new Date().toISOString()),
      'Page:      ' + (lead.page || '—')
    ];

    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: subject,
      body: lines.join('\n'),
      // Replying goes straight to the person he met.
      replyTo: lead.email,
      name: 'Noody Tap'
    });

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// Health check: open the /exec URL in a browser and you should see {"ok":true}.
function doGet() {
  return json({ ok: true, service: 'noody-tap lead relay' });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
