// === Theme Switch ===
const modeToggle = document.getElementById('mode-toggle');
const modeLabel = document.getElementById('mode-label');

modeToggle.addEventListener('change', () => {
  document.body.classList.toggle('light');
  const mode = document.body.classList.contains('light') ? 'light' : 'dark';
  modeLabel.textContent = mode === 'light' ? '☀️ Light Mode' : '🌙 Dark Mode';
  localStorage.setItem('calendar-mode', mode);
});

// Load theme
const savedMode = localStorage.getItem('calendar-mode');
if (savedMode === 'light') {
  document.body.classList.add('light');
  modeToggle.checked = true;
  modeLabel.textContent = '☀️ Light Mode';
}

// === Firebase Config ===
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
firebase.initializeApp(firebaseConfig);

// === Firebase Auth Logic ===
let currentUser = null;
let events = {};

document.getElementById("login-btn").addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  firebase.auth().signInWithEmailAndPassword(email, pass).catch(err => alert(err.message));
});

document.getElementById("signup-btn").addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  firebase.auth().createUserWithEmailAndPassword(email, pass).catch(err => alert(err.message));
});

document.getElementById("logout-btn").addEventListener("click", () => {
  firebase.auth().signOut();
});

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    document.getElementById("auth-container").classList.add("hidden");
    document.getElementById("user-info").classList.remove("hidden");
    document.getElementById("user-email").textContent = user.email;
    loadEvents();
    updateCalendar();
  } else {
    currentUser = null;
    document.getElementById("auth-container").classList.remove("hidden");
    document.getElementById("user-info").classList.add("hidden");
    calendar.innerHTML = '';
  }
});

// === Calendar Logic ===
const calendar = document.getElementById('calendar');
let currentYear, currentMonth;
const today = new Date();

function generateCalendar(year, month) {
  const date = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = date.getDay();

  let html = '<div class="calendar-grid">';
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let day of weekdays) html += `<div class="day-name">${day}</div>`;
  for (let i = 0; i < firstDay; i++) html += '<div class="day empty"></div>';

  for (let i = 1; i <= daysInMonth; i++) {
    const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
    const hasEvents = events[dateKey]?.length;
    html += `<div class="day" data-date="${dateKey}">${i}
      ${hasEvents ? `<div class="event">${events[dateKey][0].title}</div>` : ''}
    </div>`;
  }

  html += '</div>';
  calendar.innerHTML = html;

  document.querySelectorAll('.day:not(.empty)').forEach(day => {
    day.addEventListener('click', () => {
      const selectedDate = day.getAttribute('data-date');
      document.getElementById('selected-date').textContent = selectedDate;
      document.getElementById('event-input').value = '';
      document.getElementById('event-time').value = '';
      document.getElementById('modal').classList.remove('hidden');
    });
  });
}

function updateCalendar() {
  const monthYear = new Date(currentYear, currentMonth).toLocaleString('default', {
    month: 'long',
    year: 'numeric'
  });
  document.getElementById('month-year').textContent = monthYear;
  generateCalendar(currentYear, currentMonth);
}

document.getElementById('prev').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  updateCalendar();
});

document.getElementById('next').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  updateCalendar();
});

document.getElementById('cancel-event').addEventListener('click', () => {
  document.getElementById('modal').classList.add('hidden');
});

document.getElementById('save-event').addEventListener('click', () => {
  const date = document.getElementById('selected-date').textContent;
  const title = document.getElementById('event-input').value;
  const time = document.getElementById('event-time').value;

  if (!title || !time) return alert("Please fill in both title and time.");

  const datetime = `${date}T${time}`;
  if (!events[date]) events[date] = [];
  events[date].push({ title, time, datetime, notified: false });

  saveEvents();
  updateCalendar();
  document.getElementById('modal').classList.add('hidden');
});

function saveEvents() {
  if (currentUser) {
    localStorage.setItem(`calendarEvents-${currentUser.uid}`, JSON.stringify(events));
  }
}

function loadEvents() {
  if (currentUser) {
    const stored = localStorage.getItem(`calendarEvents-${currentUser.uid}`);
    if (stored) events = JSON.parse(stored);
    else events = {};
  }
}

// === Notification Feature ===
if ('Notification' in window && Notification.permission !== 'granted') {
  Notification.requestPermission();
}

function checkForNotifications() {
  const nowISO = new Date().toISOString().slice(0, 16);
  for (const date in events) {
    events[date].forEach(ev => {
      if (ev.datetime === nowISO && !ev.notified) {
        new Notification("🔔 Event Reminder", { body: `${ev.time} - ${ev.title}` });
        ev.notified = true;
        saveEvents();
      }
    });
  }
}
setInterval(checkForNotifications, 60 * 1000);

// === Start Calendar ===
currentYear = today.getFullYear();
currentMonth = today.getMonth();

// === Service Worker ===
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('Service Worker registered'));
}
