import { useEffect, useState } from 'react';
import {
  getRooms, getBookings, searchBookings, createBooking, cancelBooking, login, getAuditLog,
} from './api';

function App() {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // booking form
  const [roomId, setRoomId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [bookingError, setBookingError] = useState(null);

  const [token, setToken] = useState(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState(null);

  const [view, setView] = useState('bookings'); // 'bookings' | 'activity'
  const [auditLog, setAuditLog] = useState([]);
  const [auditError, setAuditError] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [roomsData, bookingsData] = await Promise.all([getRooms(), getBookings()]);
      setRooms(roomsData);
      setBookings(bookingsData);
      if (!roomId && roomsData.length) setRoomId(String(roomsData[0].id));
      setError(null);
    } catch (err) {
      setError('could not load data - is the api running, and is Supabase configured?');
    } finally {
      setLoading(false);
    }
  }

  async function loadAuditLog() {
    try {
      setAuditLog(await getAuditLog());
      setAuditError(null);
    } catch (err) {
      setAuditError('audit log unavailable - is the audit service running?');
    }
  }

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (view === 'activity') loadAuditLog(); }, [view]);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return loadAll();
    try {
      setBookings(await searchBookings(query));
    } catch {
      setError('search failed');
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const { token } = await login(loginUser, loginPass);
      setToken(token);
      setLoginError(null);
      setLoginUser('');
      setLoginPass('');
    } catch {
      setLoginError('wrong username or password');
    }
  }

  async function handleBook(e) {
    e.preventDefault();
    if (!token || !roomId || !customerName || !startsAt || !endsAt) return;
    try {
      await createBooking({
        room_id: Number(roomId),
        customer_name: customerName,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
      }, token);
      setCustomerName('');
      setStartsAt('');
      setEndsAt('');
      setBookingError(null);
      loadAll();
    } catch (err) {
      setBookingError(err.message);
    }
  }

  async function handleCancel(id) {
    if (!token) return;
    await cancelBooking(id, token);
    loadAll();
  }

  const roomName = (id) => rooms.find((r) => r.id === id)?.name || `room ${id}`;

  return (
    <div className="page">
      <header className="topbar">
        <h1>Book a Room</h1>
        <p className="subtitle">Book Room, bed & breakfasts and more.

Air taxi available · Large selection · Flight + hotel · 24/7 customer service

Services : Stays, Flights, Rental Cars, Taxis, Attractions</p>
        <nav className="view-switch">
          <button className={view === 'bookings' ? 'active' : ''} onClick={() => setView('bookings')}>bookings</button>
          <button className={view === 'activity' ? 'active' : ''} onClick={() => setView('activity')}>activity log</button>
        </nav>
      </header>

      {view === 'activity' ? (
        <section>
          <p className="hint">pulled live from the audit service - a separate service the api calls internally whenever a booking is created or cancelled.</p>
          {auditError && <p className="error">{auditError}</p>}
          <ul className="notes-list">
            {auditLog.map((event) => (
              <li key={event.id} className="note-card">
                <div className="note-head"><strong>{event.action}</strong><span className="tag">{event.actor}</span></div>
                <p className="note-body">{event.note_title} &middot; {event.created_at}</p>
              </li>
            ))}
            {auditLog.length === 0 && !auditError && <p>no activity recorded yet</p>}
          </ul>
        </section>
      ) : (
        <section>
          {!token ? (
            <form className="add-form" onSubmit={handleLogin}>
              <input type="text" placeholder="username (try: demo)" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} />
              <input type="password" placeholder="password (try: demo123)" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} />
              <button type="submit">log in to book a room</button>
              {loginError && <span className="error">{loginError}</span>}
            </form>
          ) : (
            <p className="hint">logged in - you can book and cancel rooms now.</p>
          )}

          <form className="search-row" onSubmit={handleSearch}>
            <input type="text" placeholder="search bookings by customer name..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <button type="submit">search</button>
            {query && <button type="button" className="ghost" onClick={() => { setQuery(''); loadAll(); }}>clear</button>}
          </form>

          {token && (
            <form className="add-form" onSubmit={handleBook}>
              <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} (cap {r.capacity})</option>)}
              </select>
              <input type="text" placeholder="your name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              <button type="submit">book room</button>
              {bookingError && <span className="error">{bookingError}</span>}
            </form>
          )}

          {error && <p className="error">{error}</p>}
          {loading ? <p>loading...</p> : (
            <ul className="notes-list">
              {bookings.map((b) => (
                <li key={b.id} className="note-card">
                  <div className="note-head"><strong>{roomName(b.room_id)}</strong><span className="tag">{b.customer_name}</span></div>
                  <p className="note-body">{new Date(b.starts_at).toLocaleString()} &rarr; {new Date(b.ends_at).toLocaleString()}</p>
                  {token && <button className="delete-btn" onClick={() => handleCancel(b.id)}>cancel</button>}
                </li>
              ))}
              {bookings.length === 0 && <p>nothing booked yet</p>}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export default App;
