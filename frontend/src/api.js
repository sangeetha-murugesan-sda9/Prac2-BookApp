
export async function getRooms() {
  const res = await fetch('/api/rooms');
  if (!res.ok) throw new Error('failed to load rooms');
  return res.json();
}

export async function getBookings(roomId) {
  const url = roomId ? `/api/bookings?room_id=${roomId}` : '/api/bookings';
  const res = await fetch(url);
  if (!res.ok) throw new Error('failed to load bookings');
  return res.json();
}

export async function searchBookings(q) {
  const res = await fetch(`/api/bookings/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('search failed');
  return res.json();
}

export async function createBooking(booking, token) {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(booking),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'failed to create booking');
  return data;
}

export async function cancelBooking(id, token) {
  const res = await fetch(`/api/bookings/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error('failed to cancel booking');
}

export async function login(username, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('login failed');
  return res.json();
}

export async function getAuditLog() {
  const res = await fetch('/api/audit-log');
  if (!res.ok) throw new Error('audit log unavailable');
  return res.json();
}
