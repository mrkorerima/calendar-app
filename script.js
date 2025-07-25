firebase.auth().onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    document.getElementById("auth-container").classList.add("hidden");
    document.getElementById("user-info").classList.remove("hidden");
    document.getElementById("user-email").textContent = user.email;

    loadEvents(); // user-specific events
    updateCalendar();
  } else {
    currentUser = null;
    document.getElementById("auth-container").classList.remove("hidden");
    document.getElementById("user-info").classList.add("hidden");
    calendar.innerHTML = ''; // hide calendar
  }
});

let currentUser = null;

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

const calendar = document.getElementById('calendar');
let events = {};

function saveEvents() {
  localStorage.setItem('calendarEvents', JSON.stringify(events));
}

function loadEvents() {
  const stored = localStorage.getItem('calendarEvents');
  if (stored) {
    events = JSON.parse(stored);
  }
}

function generateCalendar(year, month) {
  const date = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = date.getDay();

  let html = '<div class="calendar-grid">';
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let day of weekdays) {
    html += `<div class="day-name">${day}</div>`;
  }

  for (let i = 0; i < firstDay; i++) {
    html += '<div class="day empty"></div>';
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const dayDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const eventText = events[dayDate]?.map(ev => `${ev.time} - ${ev.title}`).join('<br>') || '';

    html += `
      <div class="day" data-date="${dayDate}">
        <div class="date-number">${i}</div>
        <div class="event">${eventText}</div>
      </div>`;
  }

  html += '</div>';
  calendar.innerHTML = html;

  // Event listeners for modal
  document.querySelectorAll('.day').forEach(day => {
    const date = day.getAttribute('data-date');
    if (!date) return;

    day.addEventListener('click', () => {
      document.getElementById('modal').classList.remove('hidden');
      document.getElementById('selected-date').textContent = date;
      document.getElementById('event-input').value = '';
      document.getElementById('event-time').value = '';

      if (events[date] && events[date].length > 0) {
        const lastEvent = events[date][events[date].length - 1];
        document.getElementById('event-input').value = lastEvent.title;
        document.getElementById('event-time').value = lastEvent.time;
      }
    });
  });
}

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

function updateCalendar() {
  const monthYear = new Date(currentYear, currentMonth).toLocaleString('default', {
    month: 'long',
    year: 'numeric'
  });
  document.getElementById('month-year').textContent = monthYear;
  generateCalendar(currentYear, currentMonth);
}

// Modal controls
document.getElementById('save-event').addEventListener('click', () => {
  const date = document.getElementById('selected-date').textContent;
  const title = document.getElementById('event-input').value;
  const time = document.getElementById('event-time').value;

  if (title && time) {
    events[date] = [{ title, time }];
    saveEvents();
    updateCalendar();
    document.getElementById('modal').classList.add('hidden');
  }
});

document.getElementById('delete-event').addEventListener('click', () => {
  const date = document.getElementById('selected-date').textContent;
  delete events[date];
  saveEvents();
  updateCalendar();
  document.getElementById('modal').classList.add('hidden');
});

document.getElementById('cancel-event').addEventListener('click', () => {
  document.getElementById('modal').classList.add('hidden');
});

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

// Dark/light mode
const modeToggle = document.getElementById('mode-toggle');
const modeLabel = document.getElementById('mode-label');

modeToggle.addEventListener('change', () => {
  document.body.classList.toggle('light');
  const mode = document.body.classList.contains('light') ? 'light' : 'dark';
  modeLabel.textContent = mode === 'light' ? '☀️ Light Mode' : '🌙 Dark Mode';
  localStorage.setItem('calendar-mode', mode);
});

const savedMode = localStorage.getItem('calendar-mode');
if (savedMode === 'light') {
  document.body.classList.add('light');
  modeToggle.checked = true;
  modeLabel.textContent = '☀️ Light Mode';
}

// Load and start
loadEvents();
updateCalendar();
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('Service Worker Registered'));
}
