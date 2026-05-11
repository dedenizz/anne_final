// ═══════════════════════════════════════════════════════════
// SERVICE WORKER — Hülya'nın Köşesi v4
// ═══════════════════════════════════════════════════════════
const CACHE = 'hulya-v4';
const ASSETS = ['./', './index.html', './style.css', './app.js', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())).catch(()=>{}); return r; })
      .catch(() => caches.match(e.request))
  );
});

// ── Bildirime tıklama ─────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const win = list.find(c => c.url.includes('index.html') || c.url.endsWith('/'));
      if (win) return win.focus();
      return clients.openWindow('./');
    })
  );
});

// ── Push (sunucu push — opsiyonel) ───────────────────────
self.addEventListener('push', e => {
  let d = { title: "Hülya'nın Köşesi", body: 'Bugün seni düşünüyorum.' };
  try { if (e.data) d = e.data.json(); } catch(_) {}
  e.waitUntil(showNotif(d.body));
});

// ── Alarm durumu ──────────────────────────────────────────
let alarmH = null, alarmM = null, alarmQuotes = [], alarmTimer = null;

function showNotif(body) {
  return self.registration.showNotification("Hülya'nın Köşesi 💕", {
    body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'hulya-daily',
    renotify: true,
  });
}

function getRandomQuote() {
  if (!alarmQuotes.length) return "Hülya, bugün da güzel bir gün olacak.";
  return alarmQuotes[Math.floor(Math.random() * alarmQuotes.length)];
}

// IndexedDB — SW'de localStorage yok
function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('hulya-alarm', 1);
    r.onupgradeneeded = e => e.target.result.createObjectStore('kv');
    r.onsuccess = e => res(e.target.result);
    r.onerror   = e => rej(e.target.error);
  });
}
function dbGet(key) {
  return openDB().then(db => new Promise((res, rej) => {
    const r = db.transaction('kv','readonly').objectStore('kv').get(key);
    r.onsuccess = () => res(r.result);
    r.onerror   = e => rej(e.target.error);
  }));
}
function dbSet(key, val) {
  return openDB().then(db => new Promise((res, rej) => {
    const r = db.transaction('kv','readwrite').objectStore('kv').put(val, key);
    r.onsuccess = () => res();
    r.onerror   = e => rej(e.target.error);
  }));
}

async function checkAndFire() {
  if (alarmH === null) { schedule(); return; }
  const now = new Date();
  if (now.getHours() === alarmH && now.getMinutes() === alarmM) {
    const todayKey = `sent_${now.toISOString().slice(0,10)}`;
    const sent = await dbGet(todayKey).catch(() => null);
    if (!sent) {
      await dbSet(todayKey, true).catch(()=>{});
      await showNotif(getRandomQuote()).catch(()=>{});
    }
  }
  schedule();
}

function schedule() {
  if (alarmTimer) clearTimeout(alarmTimer);
  alarmTimer = setTimeout(checkAndFire, 30000); // 30 saniyede bir kontrol
}

// ── Mesajlar (app.js → SW) ────────────────────────────────
self.addEventListener('message', e => {
  if (!e.data) return;
  const { type, hour, minute, quotes, quote } = e.data;

  if (type === 'SET_ALARM') {
    alarmH = hour;
    alarmM = minute;
    if (quotes && quotes.length) alarmQuotes = quotes;
    schedule();
    e.source && e.source.postMessage({ type: 'ALARM_ACK', hour, minute });
  }

  if (type === 'TEST_NOTIF') {
    self.registration.showNotification("Hülya'nın Köşesi 💕", {
      body: quote || getRandomQuote(),
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'hulya-test',
    }).catch(() => {});
  }

  if (type === 'UPDATE_QUOTES') {
    if (quotes && quotes.length) alarmQuotes = quotes;
  }
});

// Başlangıçta döngüyü çalıştır
schedule();
