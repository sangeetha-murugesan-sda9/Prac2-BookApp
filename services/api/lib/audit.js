// calls out to the audit service whenever a note is created or deleted.

const AUDIT_URL = process.env.AUDIT_SERVICE_URL || 'http://localhost:5000';

async function recordEvent(action, note) {
  try {
    await fetch(`${AUDIT_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        note_id: note.id,
        note_title: note.title,
        actor: note.actor || 'demo',
      }),
    });
  } catch (err) {
    console.log('audit service unreachable, skipping:', err.message);
  }
}

module.exports = { recordEvent };
