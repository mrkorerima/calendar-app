// === Theme Toggle ===
const modeToggle = document.getElementById('mode-toggle');
const modeLabel  = document.getElementById('mode-label');
modeToggle.addEventListener('change', () => {
  document.body.classList.toggle('light');
  const mode = document.body.classList.contains('light') ? 'light' : 'dark';
  modeLabel.textContent = mode === 'light' ? '☀️ Light Mode' : '🌙 Dark Mode';
  localStorage.setItem('calendar-mode', mode);
});
if (localStorage.getItem('calendar-mode') === 'light') {
  document.body.classList.add('light');
  modeToggle.checked = true;
  modeLabel.textContent = '☀️ Light Mode';
}

// === Firebase Auth Setup ===
let currentUser = null;
let events = {};
// Login
document.getElementById("login-btn").addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  firebase.auth().signInWithEmailAndPassword(email, pass)
    .catch(err => alert(err.message));
});
// Signup
document.getElementById("signup-btn").addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  firebase.auth().createUserWithEmailAndPassword(email, pass)
    .catch(err => alert(err.message));
});
// Logout
document.getElementById("logout-btn").addEventListener("click", () => {
  firebase.auth().signOut();
});
// Auth-state listener
firebase.auth().onAuthStateChanged(user => {
  const authContainer = document.getElementById("auth-container");
  const userInfo      = document.getElementById("user-info");
  if (user) {
    currentUser = user;
    authContainer.classList.add("hidden");
    userInfo.classList.remove("hidden");
    document.getElementById("user-email").textContent = user.email;
    loadEvents();
    updateCalendar();
  } else {
    currentUser = null;
    authContainer.classList.remove("hidden");
    userInfo.classList.add("hidden");
    document.getElementById("calendar").innerHTML = '';
  }
});

// === Calendar Rendering ===
const calendar = document.getElementById('calendar');
let currentYear, currentMonth;
const today = new Date();

function generateCalendar(year, month) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = first.getDay();
  let html = '<div class="calendar-grid">';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => html += `<div class="day-name">${d}</div>`);
  for (let i = 0; i < startDay; i++) html += '<div class="day empty"></div>';

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const evList = events[key] || [];
    const evHTML = evList.map(ev => `<div class="event">${ev.time} – ${ev.title}</div>`).join('');
    html += `<div class="day" data-date="${key}">
      <div class="date-number">${day}</div>${evHTML}
    </div>`;
  }
  html += '</div>';
  calendar.innerHTML = html;

  document.querySelectorAll('.day:not(.empty)').forEach(cell => {
    cell.addEventListener('click', () => {
      const d = cell.getAttribute('data-date');
      document.getElementById('selected-date').textContent = d;
      const evs = events[d] || [];
      if (evs.length) {
        const last = evs[evs.length-1];
        document.getElementById('event-input').value = last.title;
        document.getElementById('event-time').value = last.time;
      } else {
        document.getElementById('event-input').value = '';
        document.getElementById('event-time').value = '';
      }
      document.getElementById('modal').classList.remove('hidden');
    });
  });
}

function updateCalendar() {
  document.getElementById('month-year').textContent =
    new Date(currentYear, currentMonth).toLocaleString('default', {month:'long',year:'numeric'});
  generateCalendar(currentYear, currentMonth);
}

// month navigation
document.getElementById('prev').addEventListener('click', () => {
  currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  updateCalendar();
});
document.getElementById('next').addEventListener('click', () => {
  currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  updateCalendar();
});

// modal controls
document.getElementById('cancel-event').addEventListener('click', () =>
  document.getElementById('modal').classList.add('hidden')
);
document.getElementById('save-event').addEventListener('click', () => {
  const date = document.getElementById('selected-date').textContent;
  const title = document.getElementById('event-input').value.trim();
  const time = document.getElementById('event-time').value;
  if (!title || !time) return alert("Please fill in both title and time.");
  const datetime = `${date}T${time}`;
  events[date] = events[date] || [];
  events[date].push({ title, time, datetime, notified: false });
  saveEvents(); updateCalendar();
  document.getElementById('modal').classList.add('hidden');
});
document.getElementById('delete-event').addEventListener('click', () => {
  const date = document.getElementById('selected-date').textContent;
  delete events[date];
  saveEvents(); updateCalendar();
  document.getElementById('modal').classList.add('hidden');
});

// storage per-user
function saveEvents() {
  if (!currentUser) return;
  localStorage.setItem(`calendarEvents-${currentUser.uid}`, JSON.stringify(events));
}
function loadEvents() {
  if (!currentUser) return;
  const v = localStorage.getItem(`calendarEvents-${currentUser.uid}`);
  events = v ? JSON.parse(v) : {};
}

// notification scheduling
if ('Notification' in window && Notification.permission !== 'granted') {
  Notification.requestPermission();
}
function checkNotifications() {
  const now = new Date().toISOString().slice(0,16);
  for (let d in events) {
    events[d].forEach(ev => {
      if (ev.datetime === now && !ev.notified) {
        new Notification("Reminder", { body: `${ev.time} – ${ev.title}` });
        ev.notified = true;
        saveEvents();
      }
    });
  }
}
setInterval(checkNotifications, 60_000);

// initialize
currentYear = today.getFullYear();
currentMonth = today.getMonth();
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('SW Registered'));
}
