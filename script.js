// Theme toggle
const modeToggle = document.getElementById('mode-toggle'), modeLabel = document.getElementById('mode-label');
modeToggle.addEventListener('change', () => {
  document.body.classList.toggle('light');
  localStorage.setItem('calendar-mode', document.body.classList.contains('light') ? 'light' : 'dark');
  modeLabel.textContent = document.body.classList.contains('light') ? '☀️ Light Mode' : '🌙 Dark Mode';
});
if (localStorage.getItem('calendar-mode') === 'light') {
  document.body.classList.add('light');
  modeToggle.checked = true;
  modeLabel.textContent = '☀️ Light Mode';
}

// Firebase login / signup
let currentUser = null;
let events = {};

document.getElementById("login-btn").onclick = () => {
  const e = document.getElementById("email").value, p = document.getElementById("password").value;
  firebase.auth().signInWithEmailAndPassword(e, p).catch(err => alert(err.message));
};
document.getElementById("signup-btn").onclick = () => {
  const e = document.getElementById("email").value, p = document.getElementById("password").value;
  firebase.auth().createUserWithEmailAndPassword(e, p).catch(err => alert(err.message));
};
document.getElementById("logout-btn").onclick = () => firebase.auth().signOut();

firebase.auth().onAuthStateChanged(user => {
  const authC = document.getElementById("auth-container"), userI = document.getElementById("user-info");
  if (user) {
    currentUser = user;
    authC.classList.add("hidden"); userI.classList.remove("hidden");
    document.getElementById("user-email").textContent = user.email;
    loadEvents(); initCalendar(); schedulePushToken();
  } else {
    currentUser = null;
    authC.classList.remove("hidden"); userI.classList.add("hidden");
    calendar.innerHTML = '';
  }
});

// Calendar & modal handling
const calendar = document.getElementById('calendar');
let currentYear, currentMonth;
const today = new Date();

function generateCalendar(y, m) {
  const first = new Date(y, m, 1), dim = new Date(y, m + 1, 0).getDate(), sd = first.getDay();
  let html = '<div class="calendar-grid">';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => html += `<div class="day-name">${d}</div>`);
  for (let i = 0; i < sd; i++) html += '<div class="day empty"></div>';
  for (let d = 1; d <= dim; d++) {
    const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const evs = events[key] || [];
    const evHTML = evs.map(ev => `<div class="event">${ev.time} – ${ev.title} ${ev.recur ? '('+ev.recur+')':''}</div>`).join('');
    html += `<div class="day" data-date="${key}"><div class="date-number">${d}</div>${evHTML}</div>`;
  }
  html += '</div>';
  calendar.innerHTML = html;
  document.querySelectorAll('.day:not(.empty)').forEach(cell => {
    cell.onclick = () => openModal(cell.getAttribute('data-date'));
  });
}

function updateCalendar() {
  document.getElementById('month-year').textContent = new Date(currentYear, currentMonth).toLocaleString('default',{month:'long',year:'numeric'});
  generateCalendar(currentYear, currentMonth);
}

document.getElementById('prev').onclick = () => { currentMonth--; if (currentMonth<0) {currentMonth=11; currentYear--;} updateCalendar(); };
document.getElementById('next').onclick = () => { currentMonth++; if (currentMonth>11) {currentMonth=0; currentYear++;} updateCalendar(); };

function initCalendar(){
  currentYear = today.getFullYear(); currentMonth = today.getMonth(); updateCalendar();
}

// Modal logic
function openModal(date){
  document.getElementById('selected-date').textContent = date;
  const evs = events[date] || [];
  const last = evs[evs.length-1] || {};
  document.getElementById('event-input').value = last.title || '';
  document.getElementById('event-time').value = last.time || '';
  document.getElementById('event-recur').value = last.recur || 'none';
  document.getElementById('modal').classList.remove('hidden');
}
document.getElementById('cancel-event').onclick = () => document.getElementById('modal').classList.add('hidden');
document.getElementById('save-event').onclick = () => {
  const date = document.getElementById('selected-date').textContent;
  const title = document.getElementById('event-input').value.trim();
  const time = document.getElementById('event-time').value;
  const recur = document.getElementById('event-recur').value;
  if (!title || !time) return alert('Fill both title & time');
  events[date] = events[date] || [];
  events[date].push({ title, time, recur, datetime:`${date}T${time}`, notified:false });
  saveEvents(); updateCalendar(); document.getElementById('modal').classList.add('hidden');
};
document.getElementById('delete-event').onclick = () => {
  const date = document.getElementById('selected-date').textContent;
  delete events[date];
  saveEvents(); updateCalendar(); document.getElementById('modal').classList.add('hidden');
};

// Storage
function saveEvents(){
  if (!currentUser) return;
  localStorage.setItem(`calendarEvents-${currentUser.uid}`, JSON.stringify(events));
}
function loadEvents(){
  if (!currentUser) return;
  const stored = localStorage.getItem(`calendarEvents-${currentUser.uid}`);
  events = stored ? JSON.parse(stored) : {};
}

// Notification scheduling
if ('Notification' in window && Notification.permission!=='granted') Notification.requestPermission();
function checkDue(){
  const now = new Date().toISOString().slice(0,16);
  for (const date in events) events[date].forEach(ev => {
    if (!ev.notified && ev.datetime === now) {
      new Notification('Reminder', { body:`${ev.time} – ${ev.title}` });
      ev.notified = true; saveEvents();
    }
  });
  // handle recurrence: for each event with recur != none, schedule next occurrence
}
setInterval(checkDue,60_000);

// Firebase Cloud Messaging (Push)
function schedulePushToken(){
  // initialize messaging and get token, subscribe user
  const messaging = firebase.messaging();
  messaging.getToken({ vapidKey: 'YOUR_VAPID_KEY' }).then(token => {
    // store token under user in database for server side notifications
    firebase.database().ref(`fcmTokens/${currentUser.uid}/${token}`).set(true);
  });
  messaging.onMessage(payload => alert('Push Notification:\n'+payload.notification.body));
}

// initialize
initCalendar();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').then(()=>console.log('SW registered'));
