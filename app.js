// ═══════════════════════════════════════════════════════════
// FIREBASE
// ═══════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyB07DLdlEqo7fgri6YfGfHeY0oowCbFlDM",
  authDomain: "herva-app.firebaseapp.com",
  projectId: "herva-app",
  storageBucket: "herva-app.firebasestorage.app",
  messagingSenderId: "732261075538",
  appId: "1:732261075538:web:67e824b1e6009b7df1ad8b"
};
try { if (!firebase.apps.length) firebase.initializeApp(firebaseConfig); }
catch (e) { console.error('Firebase:', e); }

const db   = firebase.firestore();
const auth = firebase.auth();
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
let googleToken  = null;
let currentUser  = null;
let selectedFile = null;
let selCatVal    = "Motivasyon";
let filterVal    = "Tümü";
let allCourses   = [];
let searchQ      = "";
let currentQ     = "";
let swipeQuoteIndex = 0;

let favorites   = JSON.parse(localStorage.getItem('fav')        || '[]');
let habits      = JSON.parse(localStorage.getItem('habits')     || '[]');
let moodHist    = JSON.parse(localStorage.getItem('moodHist')   || '[]');
let customMsgs  = JSON.parse(localStorage.getItem('customMsgs') || '[]');
let notifTime   = localStorage.getItem('notifTime')             || '08:00';
let journals    = JSON.parse(localStorage.getItem('journals')   || '{}'); // keyed by date

// ═══════════════════════════════════════════════════════════
// HÜLYA'YA ÖZEL ALINTILER (genişletilmiş)
// ═══════════════════════════════════════════════════════════
const QUOTES = [
  // Oğlundan anneye — kişisel
  "Hülya, seninle gurur duyuyorum. Her anıma dokunmuşsun.",
  "Sabahları güneş doğunca seni düşünüyorum, Hülya.",
  "Verdiğin her emek için teşekkür ederim. Çok değerlisin.",
  "Senin gülüşün odayı aydınlatıyor, bunu hiç unutma.",
  "Bir anneye duyulabilecek en derin minneti hissediyorum.",
  "Bu dünyada olmak için en güzel neden senin varlığın.",
  "Seni seviyorum, bu basit ama her şeyi söylüyor.",
  "En zor anımda bile yanımda hissettiğim tek insansın.",
  "Ellerini tutmak istiyorum ve 'her şey yolunda' demek.",
  "Annemin gözlerinde gördüğüm o sevgi beni her gün güçlendiriyor.",
  // Motivasyon
  "Hülya, bugün ne yapacaksan tam kalbinle yap.",
  "Küçük adımlar bile seni hedefe taşır. Vazgeçme!",
  "Her yeni gün sana yeniden başlama fırsatı sunuyor.",
  "Hissettiğin yorgunluk, ne kadar çok çabaladığının kanıtı.",
  "Bugün zor olan yarın seni daha güçlü yapacak.",
  "Potansiyelin sınırlarından çok daha büyük, Hülya.",
  "Bir adım at. Sonrasını hayat halleder.",
  "Sen durduğunda değil, yavaşladığında bile ilerliyorsun.",
  "Başlamak bitirmenin yarısıdır — bugün bir şey başlat.",
  // Huzur & Farkındalık
  "Bu anı yaşa. Geçmiş geride, gelecek ileride. Şimdi var.",
  "Kendine nazik ol, tıpkı en iyi arkadaşına olduğun gibi.",
  "Nefes al. Her şey yoluna girecek.",
  "Küçük zevkler büyük mutluluklar inşa eder.",
  "Hülya, bugün sadece bir şey yap: kendine iyi bak.",
  "İçindeki sessizliği dinle. Orada tüm cevaplar var.",
  "Bitkinlik zayıflık değil, uzun süre güçlü olmanın işareti.",
  "Sabahın ilk çayını yudumlarken o anın tadını çıkar.",
  "Bugün güneşin doğduğunu gördün. Bu bile bir mucize.",
  // İlişkiler & Sevgi
  "Sevdiğin insanları bugün ara, o ses yeter.",
  "Aile sevgisi en güzel liman, sen o limanın ta kendisisin.",
  "Verebildiğin her gülümseme dünyayı biraz daha iyi yapar.",
  "Sevmek ve sevilmek — işte hayatın özü bu.",
  // Sağlık & Yaşam
  "Bugün bir bardak su fazla iç, biraz yürü, kendini düşün.",
  "Uyku mucizedir, bugün erken yat.",
  "Doğayla geçirdiğin beş dakika ruhunu yeniler.",
  "Bedenin sana bir şeyler anlatmaya çalışıyorsa, dinle.",
  "Hareketten doğan enerji başka hiçbir şeyde yok.",
  // Öz güven
  "Hülya, her şeyin üstesinden gelebilirsin — geçmişin bunu kanıtlıyor.",
  "Başkasının onayına ihtiyacın yok. Sen zaten yeterlisin.",
  "Hatalardan öğrenmek bilgeliğin ilk adımıdır.",
  "Yaşın ne olursa olsun, büyümek için hiç geç değil.",
  "Güzel olan şeylere dikkat et. Onlar her yerde.",
  "Bugün kendin ol; bu dünyanın ihtiyacı olan şey tam da bu.",
  "Sınırlarını zorlamak seni kırmaz, şekillendirir.",
  "Her başarısızlık seni daha zekice bir yola yönlendiriyor.",
  // Şükran
  "Bugün üç şükran bul — küçük olsun, ama gerçek olsun.",
  "Sahip olduklarına odaklan; yokluğa değil.",
  "Hayat mükemmel olmak zorunda değil, güzel olmak için.",
];

function getAllQuotes() { return [...QUOTES, ...customMsgs]; }
function getRandomQuote(excludeIndex) {
  const all = getAllQuotes();
  let idx;
  do { idx = Math.floor(Math.random() * all.length); }
  while (all.length > 1 && idx === excludeIndex);
  swipeQuoteIndex = idx;
  return all[idx];
}

function setQuoteText(q, dir) {
  currentQ = q;
  const el = document.getElementById('quote-text');
  if (!el) return;
  const fromX = dir === 'left' ? '40px' : dir === 'right' ? '-40px' : '0';
  el.style.opacity = '0';
  el.style.transform = `translateX(${fromX})`;
  setTimeout(() => {
    el.textContent = q;
    el.style.transition = 'all 0.3s ease';
    el.style.opacity = '1';
    el.style.transform = 'none';
  }, 150);
  syncFavBtn();
  // Hide swipe hint after first swipe
  localStorage.setItem('swipedOnce', '1');
  const hint = document.getElementById('swipe-hint');
  if (hint && localStorage.getItem('swipedOnce')) hint.style.opacity = '0';
}

function refreshQuote(dir) {
  setQuoteText(getRandomQuote(swipeQuoteIndex), dir || 'up');
}

// ═══════════════════════════════════════════════════════════
// SWIPE GESTURE ON QUOTE CARD
// ═══════════════════════════════════════════════════════════
function initSwipe() {
  const card = document.getElementById('quote-card');
  if (!card) return;
  let startX = 0, startY = 0, dx = 0;

  card.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dx = 0;
  }, { passive: true });

  card.addEventListener('touchmove', e => {
    dx = e.touches[0].clientX - startX;
    const dy = Math.abs(e.touches[0].clientY - startY);
    if (Math.abs(dx) > dy) {
      const el = document.getElementById('quote-text');
      if (el) el.style.transform = `translateX(${dx * 0.25}px)`;
    }
  }, { passive: true });

  card.addEventListener('touchend', () => {
    if (Math.abs(dx) > 60) {
      refreshQuote(dx < 0 ? 'left' : 'right');
      ripple(card, null, true);
    } else {
      const el = document.getElementById('quote-text');
      if (el) { el.style.transition = 'transform 0.2s'; el.style.transform = 'none'; }
    }
  });
}

// ═══════════════════════════════════════════════════════════
// FAVOURITES
// ═══════════════════════════════════════════════════════════
function syncFavBtn() {
  const btn = document.getElementById('fav-btn');
  if (!btn) return;
  const loved = favorites.includes(currentQ);
  btn.classList.toggle('loved', loved);
  const path = document.getElementById('fav-path');
  if (path) path.setAttribute('fill', loved ? 'white' : 'none');
}

function toggleFav() {
  if (!currentQ) return;
  const i = favorites.indexOf(currentQ);
  if (i === -1) {
    favorites.push(currentQ);
    toast("Favorilere eklendi");
    const btn = document.getElementById('fav-btn');
    if (btn) { btn.style.transform = 'scale(1.3)'; setTimeout(() => btn.style.transform = '', 250); }
  } else {
    favorites.splice(i, 1);
    toast("Favorilerden çıkarıldı");
  }
  localStorage.setItem('fav', JSON.stringify(favorites));
  syncFavBtn();
  updateStatsRow();
}

function renderFavs() {
  const list  = document.getElementById('favs-list');
  const empty = document.getElementById('favs-empty');
  if (!list) return;
  if (!favorites.length) {
    if (empty) empty.style.display = 'flex';
    list.innerHTML = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  list.innerHTML = '';
  favorites.forEach((q, i) => {
    const d = document.createElement('div');
    d.className = 'fav-item';
    d.style.animationDelay = (i * 0.04) + 's';
    d.innerHTML = `
      <div class="fav-heart"><svg viewBox="0 0 24 24"><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402C1 3.403 4.068 2 6.5 2 8.763 2 10.824 3.398 12 5.184 13.176 3.398 15.237 2 17.5 2 19.932 2 23 3.404 23 7.191c0 4.105-5.369 8.863-11 14.402z" fill="#E8436A"/></svg></div>
      <p>${esc(q)}</p>
      <button class="fav-del" onclick="removeFav(${i})">&times;</button>`;
    list.appendChild(d);
  });
}

function removeFav(i) {
  favorites.splice(i, 1);
  localStorage.setItem('fav', JSON.stringify(favorites));
  renderFavs();
  updateStatsRow();
  toast("Favorilerden kaldırıldı");
}

// ═══════════════════════════════════════════════════════════
// MOD
// ═══════════════════════════════════════════════════════════
const MOOD_COLORS = { Mutlu:'#F5C518', Huzurlu:'#5CB85C', Normal:'#AAA', Yorgun:'#9B59B6', Stresli:'#E74C3C' };
const MOOD_SVGS = {
  Mutlu:   '<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#FFF0C0" stroke="#F5C518" stroke-width="1.5"/><circle cx="13" cy="15" r="2" fill="#555"/><circle cx="23" cy="15" r="2" fill="#555"/><path d="M11 22c2 4 12 4 14 0" stroke="#555" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>',
  Huzurlu: '<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#DFF5E3" stroke="#5CB85C" stroke-width="1.5"/><circle cx="13" cy="15" r="2" fill="#555"/><circle cx="23" cy="15" r="2" fill="#555"/><path d="M12 22c2 2 10 2 12 0" stroke="#555" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>',
  Normal:  '<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#EEE" stroke="#AAA" stroke-width="1.5"/><circle cx="13" cy="15" r="2" fill="#555"/><circle cx="23" cy="15" r="2" fill="#555"/><path d="M12 23h12" stroke="#555" stroke-width="1.5" stroke-linecap="round"/></svg>',
  Yorgun:  '<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#E8E0F5" stroke="#9B59B6" stroke-width="1.5"/><path d="M10 14q3-1 6 0M20 14q3-1 6 0" stroke="#555" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M12 24c2-2 10-2 12 0" stroke="#555" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>',
  Stresli: '<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#FFE5E5" stroke="#E74C3C" stroke-width="1.5"/><path d="M11 13q2-2 6 0M19 13q2-2 6 0" stroke="#555" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M11 24c2-4 12-4 14 0" stroke="#555" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>'
};

function selectMood(btn) {
  document.querySelectorAll('.mood').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const label = btn.dataset.mood;
  const today = new Date().toLocaleDateString('tr-TR');
  const entry = { label, date: today, time: new Date().toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'}) };
  moodHist = moodHist.filter(m => m.date !== today);
  moodHist.unshift(entry);
  if (moodHist.length > 60) moodHist = moodHist.slice(0, 60);
  localStorage.setItem('moodHist', JSON.stringify(moodHist));
  toast(label + ' kaydedildi');
  renderMoodChart();
  updateStatsRow();
}

function renderMoodChart() {
  const wrap = document.getElementById('mood-chart');
  if (!wrap) return;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('tr-TR'));
  }
  const shortDay = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
  wrap.innerHTML = '';
  days.forEach(date => {
    const entry = moodHist.find(m => m.date === date);
    const color = entry ? (MOOD_COLORS[entry.label] || '#E8436A') : '#F0E8EC';
    const h = entry ? 36 : 8;
    const d = new Date(date.split('.').reverse().join('-'));
    const dayName = shortDay[d.getDay()];
    const col = document.createElement('div');
    col.className = 'mood-bar-wrap';
    col.innerHTML = `
      <div class="mood-bar" style="background:${color};height:${h}px;" title="${entry ? entry.label : 'Veri yok'}"></div>
      <span class="mood-bar-label">${dayName}</span>`;
    wrap.appendChild(col);
  });
}

// ═══════════════════════════════════════════════════════════
// GÜNLÜK NOT (JOURNAL)
// ═══════════════════════════════════════════════════════════
function initJournal() {
  const today = new Date().toLocaleDateString('tr-TR');
  const el = document.getElementById('journal-date');
  if (el) el.textContent = today;
  const inp = document.getElementById('journal-input');
  if (inp) {
    inp.value = journals[today] || '';
    updateJournalChars();
  }
}

function onJournalInput() {
  updateJournalChars();
  // Autosave with debounce
  clearTimeout(window._journalTimer);
  window._journalTimer = setTimeout(saveJournal, 1500);
}

function updateJournalChars() {
  const inp = document.getElementById('journal-input');
  const ch  = document.getElementById('journal-chars');
  if (inp && ch) ch.textContent = inp.value.length + ' karakter';
}

function saveJournal() {
  const inp   = document.getElementById('journal-input');
  const today = new Date().toLocaleDateString('tr-TR');
  if (inp) {
    journals[today] = inp.value;
    localStorage.setItem('journals', JSON.stringify(journals));
    toast("Not kaydedildi");
  }
}

// ═══════════════════════════════════════════════════════════
// STREAK (arka arkaya gün takibi)
// ═══════════════════════════════════════════════════════════
function calcStreak() {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('tr-TR');
    const hasHabit = habits.length > 0 && habits.some(h => h.done);
    const hasMood  = moodHist.some(m => m.date === dateStr);
    if (i === 0 && (hasHabit || hasMood)) { streak++; continue; }
    if (i > 0 && (moodHist.some(m => m.date === dateStr))) { streak++; }
    else if (i > 0) break;
  }
  return streak;
}

function updateStreak() {
  const s = calcStreak();
  const el1 = document.getElementById('streak-num');
  const el2 = document.getElementById('streak-num2');
  if (el1) el1.textContent = s;
  if (el2) el2.textContent = s + ' gün seri';
}

// ═══════════════════════════════════════════════════════════
// STATS ROW
// ═══════════════════════════════════════════════════════════
function updateStatsRow() {
  const fc = document.getElementById('fav-count');
  const dc = document.getElementById('done-count');
  const ms = document.getElementById('mood-stat');
  if (fc) fc.textContent = favorites.length + (favorites.length === 1 ? ' favori' : ' favori');
  const done = habits.filter(h => h.done).length;
  if (dc) dc.textContent = done + ' tamamlandı';
  const todayMood = moodHist[0]?.date === new Date().toLocaleDateString('tr-TR') ? moodHist[0].label : 'Mod yok';
  if (ms) ms.textContent = todayMood;
}

// ═══════════════════════════════════════════════════════════
// ALIIŞKANLIK TAKİBİ
// ═══════════════════════════════════════════════════════════
function addHabit() {
  const inp = document.getElementById('habit-in');
  const txt = inp?.value.trim();
  if (!txt) return toast("Hedef boş olamaz!");
  habits.push({ id: Date.now(), text: txt, done: false });
  localStorage.setItem('habits', JSON.stringify(habits));
  inp.value = '';
  renderHabits();
  updateStatsRow();
  toast("Hedef eklendi!");
}

function toggleHabit(id) {
  const h = habits.find(h => h.id === id);
  if (h) h.done = !h.done;
  localStorage.setItem('habits', JSON.stringify(habits));
  renderHabits();
  updateStatsRow();
  updateStreak();
  const allDone = habits.length > 0 && habits.every(h => h.done);
  if (allDone) launchConfetti();
  else if (h?.done) toast("Tebrikler! Hedef tamamlandı");
}

function deleteHabit(id) {
  habits = habits.filter(h => h.id !== id);
  localStorage.setItem('habits', JSON.stringify(habits));
  renderHabits();
  updateStatsRow();
}

function renderHabits() {
  const list = document.getElementById('habits-list');
  const pw   = document.getElementById('prog-wrap');
  const sw   = document.getElementById('habit-stats-wrap');
  if (!list) return;

  if (!habits.length) {
    list.innerHTML = "<p style='text-align:center;color:var(--muted);padding:24px;'>Henüz hedef yok. Ekleyerek başla!</p>";
    if (pw) pw.innerHTML = '';
    if (sw) sw.innerHTML = '';
    return;
  }

  const done  = habits.filter(h => h.done).length;
  const total = habits.length;
  const pct   = Math.round((done / total) * 100);

  if (pw) pw.innerHTML = `
    <div class="prog-card">
      <div class="prog-label"><span>Bugünkü ilerleme</span><span>${done}/${total}</span></div>
      <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>
      ${pct === 100 ? '<p style="text-align:center;font-size:14px;margin-top:10px;color:var(--rose);font-weight:700;">Tüm hedefleri tamamladın!</p>' : ''}
    </div>`;

  // Habit stats card
  const totalEver = habits.length;
  const streak = calcStreak();
  if (sw) sw.innerHTML = `
    <div class="habit-stats-card" style="margin:0 16px 12px;">
      <div class="hstat"><span class="hstat-num">${done}</span><span class="hstat-lbl">Bugün</span></div>
      <div class="hstat"><span class="hstat-num">${total}</span><span class="hstat-lbl">Toplam</span></div>
      <div class="hstat"><span class="hstat-num">${pct}%</span><span class="hstat-lbl">Başarı</span></div>
      <div class="hstat"><span class="hstat-num">${streak}</span><span class="hstat-lbl">Seri</span></div>
    </div>`;

  list.innerHTML = '';
  habits.forEach((h, idx) => {
    const d = document.createElement('div');
    d.className = 'habit-item' + (h.done ? ' done' : '');
    d.style.animationDelay = (idx * 0.04) + 's';
    d.innerHTML = `
      <button class="h-check" onclick="toggleHabit(${h.id})">
        <svg viewBox="0 0 14 14" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="2 7 6 11 12 3"/></svg>
      </button>
      <span class="h-txt">${esc(h.text)}</span>
      <button class="h-del" onclick="deleteHabit(${h.id})">&times;</button>`;
    list.appendChild(d);
  });
}

// ═══════════════════════════════════════════════════════════
// KONFETI
// ═══════════════════════════════════════════════════════════
function launchConfetti() {
  toast("Tüm hedefleri tamamladın! Bravo Hülya!");
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.classList.add('active');
  const ctx = canvas.getContext('2d');
  const pieces = Array.from({length: 80}, () => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * 100,
    w: 8 + Math.random() * 8,
    h: 4 + Math.random() * 6,
    r: Math.random() * Math.PI * 2,
    dr: (Math.random() - 0.5) * 0.2,
    dx: (Math.random() - 0.5) * 3,
    dy: 2 + Math.random() * 3,
    color: ['#E8436A','#FF7B9C','#FFD700','#5CB85C','#9B59B6','#3498DB'][Math.floor(Math.random()*6)]
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - frame / 120);
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
      p.x += p.dx; p.y += p.dy; p.r += p.dr;
    });
    frame++;
    if (frame < 140) requestAnimationFrame(draw);
    else { canvas.classList.remove('active'); ctx.clearRect(0,0,canvas.width,canvas.height); }
  }
  requestAnimationFrame(draw);
}

// ═══════════════════════════════════════════════════════════
// RIPPLE EFFECT
// ═══════════════════════════════════════════════════════════
function ripple(el, event, center) {
  const r = document.createElement('span');
  r.className = 'ripple';
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  r.style.width = r.style.height = size + 'px';
  if (center) {
    r.style.left = (rect.width/2 - size/2) + 'px';
    r.style.top  = (rect.height/2 - size/2) + 'px';
  } else if (event) {
    r.style.left = (event.clientX - rect.left - size/2) + 'px';
    r.style.top  = (event.clientY - rect.top - size/2) + 'px';
  }
  el.appendChild(r);
  setTimeout(() => r.remove(), 600);
}

function initRipple() {
  document.querySelectorAll('.btn-primary,.btn-sm,.chip,.qc-btn').forEach(el => {
    el.addEventListener('click', e => ripple(el, e));
  });
}

// ═══════════════════════════════════════════════════════════
// SHARE SHEET
// ═══════════════════════════════════════════════════════════
function openShare() {
  const sq = document.getElementById('share-quote-text');
  if (sq) sq.textContent = currentQ;
  document.getElementById('share-sheet')?.classList.add('open');
}
function closeShare() {
  document.getElementById('share-sheet')?.classList.remove('open');
}
function copyQuote() {
  navigator.clipboard.writeText(currentQ).then(() => {
    toast("Kopyalandı!");
    closeShare();
  }).catch(() => toast("Kopyalanamadı."));
}
function nativeShare() {
  if (navigator.share) {
    navigator.share({ title: "Hülya'nın Köşesi", text: currentQ })
      .then(() => closeShare())
      .catch(() => {});
  } else {
    copyQuote();
  }
}

// ═══════════════════════════════════════════════════════════
// DYNAMIC GREETING + NIGHT MODE
// ═══════════════════════════════════════════════════════════
function setGreeting() {
  const h = new Date().getHours();
  const g = document.getElementById('greeting-text');
  const s = document.getElementById('greeting-sub');

  if (h >= 5 && h < 12) {
    if (g) g.textContent = 'Günaydın, Hülya';
    if (s) s.textContent = 'Yeni bir gün, yeni bir fırsat';
  } else if (h >= 12 && h < 17) {
    if (g) g.textContent = 'İyi öğlenler, Hülya';
    if (s) s.textContent = 'Günün tam ortasındasın, devam et!';
  } else if (h >= 17 && h < 21) {
    if (g) g.textContent = 'İyi akşamlar, Hülya';
    if (s) s.textContent = 'Bugünü güzel geçirdin mi?';
  } else {
    if (g) g.textContent = 'İyi geceler, Hülya';
    if (s) s.textContent = 'Dinlen, yarın yeni bir gün';
    // Apply night mode at night
    document.body.classList.add('night-mode');
  }
}

// ═══════════════════════════════════════════════════════════
// GOOGLE AUTH
// ═══════════════════════════════════════════════════════════
function signInGoogle() {
  const p = new firebase.auth.GoogleAuthProvider();
  p.addScope(DRIVE_SCOPE);
  p.setCustomParameters({ access_type: 'offline', prompt: 'consent' });
  auth.signInWithPopup(p).then(r => {
    googleToken = r.credential.accessToken;
    sessionStorage.setItem('gat', googleToken);
    updateAuthUI(r.user);
    toast("Hoş geldin, " + r.user.displayName.split(' ')[0] + "!");
  }).catch(e => toast("Giriş başarısız: " + e.message));
}
function signOut() {
  auth.signOut().then(() => {
    googleToken = null; currentUser = null;
    sessionStorage.removeItem('gat');
    updateAuthUI(null); toast("Çıkış yapıldı.");
  });
}
auth.onAuthStateChanged(u => {
  currentUser = u;
  if (u && !googleToken) googleToken = sessionStorage.getItem('gat');
  updateAuthUI(u);
});
function updateAuthUI(u) {
  const sb  = document.getElementById('signin-btn');
  const ub  = document.getElementById('user-box');
  const ul  = document.getElementById('upload-lbl');
  const naw = document.getElementById('no-auth-warn');
  if (u) {
    if (sb)  sb.style.display  = 'none';
    if (ub)  ub.style.display  = 'flex';
    const av = document.getElementById('user-av');
    if (av && u.photoURL) av.src = u.photoURL;
    if (ul)  ul.style.display  = 'flex';
    if (naw) naw.style.display = 'none';
  } else {
    if (sb)  sb.style.display  = 'flex';
    if (ub)  ub.style.display  = 'none';
    if (ul)  ul.style.display  = 'none';
    if (naw) naw.style.display = 'block';
  }
}

// ═══════════════════════════════════════════════════════════
// DRIVE UPLOAD
// ═══════════════════════════════════════════════════════════
async function uploadToDrive(file) {
  if (!googleToken) throw new Error("Önce Google ile giriş yap!");
  const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${googleToken}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Length': file.size.toString(),
      'X-Upload-Content-Type': file.type
    },
    body: JSON.stringify({ name: file.name, mimeType: file.type })
  });
  if (!initRes.ok) throw new Error("Drive bağlantısı kurulamadı: " + initRes.status);
  const url = initRes.headers.get('location');
  if (!url) throw new Error("Yükleme URL'si alınamadı.");
  return new Promise((res, rej) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) setProg(Math.round(e.loaded/e.total*100), `Yükleniyor %${Math.round(e.loaded/e.total*100)}`);
    };
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        const d = JSON.parse(xhr.responseText);
        res({ fileId: d.id, viewLink: `https://drive.google.com/file/d/${d.id}/view` });
      } else rej(new Error("Yükleme başarısız: " + xhr.status));
    };
    xhr.onerror = () => rej(new Error("Ağ hatası!"));
    xhr.send(file);
  });
}

function handleFile(e) {
  selectedFile = e.target.files[0];
  if (!selectedFile) return;
  const mb = (selectedFile.size/1024/1024).toFixed(1);
  const lt = document.getElementById('upload-lbl-txt');
  if (lt) lt.textContent = `${selectedFile.name} (${mb} MB)`;
  const prev = document.getElementById('media-prev');
  const url = URL.createObjectURL(selectedFile);
  if (prev) {
    if (selectedFile.type.startsWith('video/'))
      prev.innerHTML = `<video controls src="${url}" style="width:100%;border-radius:12px;max-height:200px;"></video>`;
    else if (selectedFile.type.startsWith('audio/'))
      prev.innerHTML = `<audio controls src="${url}" style="width:100%;"></audio>`;
  }
}

function setProg(pct, txt) {
  const w = document.getElementById('prog-bar-wrap');
  const f = document.getElementById('prog-fill');
  const t = document.getElementById('prog-txt');
  if (w) w.style.display = pct >= 0 ? 'block' : 'none';
  if (f) f.style.width = pct + '%';
  if (t) t.textContent = txt;
}

// ═══════════════════════════════════════════════════════════
// AKADEMİ
// ═══════════════════════════════════════════════════════════
async function saveCourse() {
  const name  = document.getElementById('c-name')?.value.trim();
  const notes = document.getElementById('c-notes')?.value.trim();
  const btn   = document.getElementById('save-btn');
  if (!name || !notes) return toast("Ad ve notlar boş olamaz!");
  if (btn) { btn.disabled = true; btn.textContent = "Kaydediliyor..."; }
  try {
    let media = '', driveId = '', mediaType = '';
    if (selectedFile) {
      if (!googleToken) { toast("Video için önce giriş yap!"); if (btn) { btn.disabled=false; btn.textContent="Arşive Kaydet"; } return; }
      setProg(0, "Başlatılıyor...");
      const r = await uploadToDrive(selectedFile);
      setProg(100, "Tamamlandı!");
      media = r.viewLink; driveId = r.fileId; mediaType = selectedFile.type;
      setTimeout(() => setProg(-1,''), 1500);
    }
    await db.collection("academy").add({
      name, notes, category: selCatVal, media, driveId, mediaType,
      date: new Date().toLocaleDateString('tr-TR'),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    toast("Arşive kaydedildi!");
    document.getElementById('c-name').value = '';
    document.getElementById('c-notes').value = '';
    const mp = document.getElementById('media-prev'); if (mp) mp.innerHTML = '';
    const mi = document.getElementById('media-in');   if (mi) mi.value = '';
    const lt = document.getElementById('upload-lbl-txt'); if (lt) lt.textContent = 'Video veya ses ekle';
    selectedFile = null; selCatVal = "Motivasyon";
    document.querySelectorAll('#cat-chips .chip').forEach((c,i) => c.classList.toggle('active',i===0));
  } catch (e) { console.error(e); alert("Hata: " + e.message); setProg(-1,''); }
  finally { if (btn) { btn.disabled=false; btn.textContent="Arşive Kaydet"; } }
}

function loadCourses() {
  db.collection("academy").orderBy("timestamp","desc").onSnapshot(snap => {
    allCourses = [];
    snap.forEach(doc => allCourses.push({ id: doc.id, ...doc.data() }));
    renderCourses();
  }, e => toast("Yükleme hatası: " + e.message));
}

function renderCourses() {
  const list = document.getElementById('course-list');
  if (!list) return;
  list.innerHTML = '';
  const sort = document.getElementById('sort-sel')?.value || 'newest';
  let items = allCourses;
  if (filterVal !== 'Tümü') items = items.filter(c => c.category === filterVal);
  if (searchQ) {
    const q = searchQ.toLowerCase();
    items = items.filter(c => (c.name||'').toLowerCase().includes(q)||(c.notes||'').toLowerCase().includes(q));
  }
  items = [...items].sort((a,b) => {
    if (sort==='oldest')  return (a.timestamp?.seconds||0)-(b.timestamp?.seconds||0);
    if (sort==='alpha')   return (a.name||'').localeCompare(b.name||'','tr');
    if (sort==='alpha-d') return (b.name||'').localeCompare(a.name||'','tr');
    return (b.timestamp?.seconds||0)-(a.timestamp?.seconds||0);
  });
  const rc = document.getElementById('res-count');
  if (rc) rc.textContent = items.length ? items.length + ' kayıt' : '';
  if (!items.length) { list.innerHTML = "<p style='text-align:center;color:var(--muted);padding:24px;'>Bu kategoride henüz kayıt yok.</p>"; return; }
  items.forEach(c => {
    let media = '';
    if (c.media) media = `<a href="${c.media}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:8px 14px;background:var(--rose-light);color:var(--rose);border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;">Drive'da İzle</a>`;
    const d = document.createElement('div');
    d.className = 'course-item';
    d.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <h4 style="font-size:16px;font-weight:700;flex:1;margin-right:8px;">${esc(c.name)}</h4>
        <button class="course-del" onclick="delCourse('${c.id}')">&times;</button>
      </div>
      <div style="margin-bottom:10px;">
        <span class="badge">${esc(c.category||'')}</span>
        <span style="font-size:11px;color:var(--muted);margin-left:6px;">${c.date||''}</span>
      </div>
      <p style="font-size:14px;line-height:1.55;color:var(--text);">${esc(c.notes)}</p>
      ${media}`;
    list.appendChild(d);
  });
}

function selCat(btn) {
  document.querySelectorAll('#cat-chips .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active'); selCatVal = btn.dataset.cat;
}
function selFilter(btn) {
  document.querySelectorAll('#filter-chips .chip').forEach(f => f.classList.remove('active'));
  btn.classList.add('active'); filterVal = btn.dataset.filter; renderCourses();
}
function onSearch() {
  const inp = document.getElementById('search-in');
  const cb  = document.getElementById('clear-btn');
  searchQ = inp?.value.trim() || '';
  if (cb) cb.style.display = searchQ ? 'block' : 'none';
  renderCourses();
}
function clearSearch() {
  const inp = document.getElementById('search-in'); if (inp) inp.value='';
  const cb  = document.getElementById('clear-btn');  if (cb) cb.style.display='none';
  searchQ = ''; renderCourses();
}
async function delCourse(id) {
  if (!confirm("Bu notu silmek istediğine emin misin?")) return;
  try { await db.collection("academy").doc(id).delete(); toast("Not silindi."); }
  catch(e) { toast("Hata: " + e.message); }
}

// ═══════════════════════════════════════════════════════════
// BİLDİRİM SİSTEMİ — SW tabanlı, iOS uyumlu
// ═══════════════════════════════════════════════════════════
let swReg = null;

// SW'ye mesaj gönder
function swPost(msg) {
  if (swReg && swReg.active) {
    swReg.active.postMessage(msg);
    return true;
  }
  // SW henüz hazır değilse navigator.serviceWorker üzerinden dene
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      if (reg.active) reg.active.postMessage(msg);
    }).catch(() => {});
  }
  return false;
}

// İzin iste
async function askPerm() {
  const btn = document.getElementById('perm-btn');
  const msg = document.getElementById('perm-msg');

  // iOS Safari kontrolü
  if (!('Notification' in window)) {
    if (msg) msg.textContent = "Bildirim için Safari'den ana ekrana ekle ve oradan aç!";
    return;
  }

  if (Notification.permission === 'granted') {
    // Zaten izin var, direkt saat kartını göster
    showTimeCard();
    return;
  }

  if (btn) btn.textContent = "İzin isteniyor...";

  let p;
  try { p = await Notification.requestPermission(); }
  catch(e) { p = 'denied'; }

  if (p === 'granted') {
    if (msg) msg.textContent = "✅ Bildirimler açık!";
    showTimeCard();
    toast("Bildirimler açıldı!");
    pushAlarmToSW();
  } else if (p === 'denied') {
    if (msg) msg.textContent = "❌ İzin reddedildi. Ayarlar → Safari → Bildirimler'den açabilirsin.";
    if (btn) { btn.disabled = false; btn.textContent = "Tekrar Dene"; }
  } else {
    if (btn) { btn.disabled = false; btn.textContent = "Bildirimlere İzin Ver"; }
  }
}

// Saat kartını göster
function showTimeCard() {
  const pc = document.getElementById('perm-card');
  const tc = document.getElementById('time-card');
  if (pc) pc.style.display = 'none';
  if (tc) { tc.style.display = 'block'; }
  const ti = document.getElementById('time-in');
  if (ti) ti.value = notifTime;
  updateNextMsg();
  // SW'ye mevcut alarmı gönder
  pushAlarmToSW();
}

// Saati kaydet
function saveTime() {
  const ti = document.getElementById('time-in');
  if (!ti) return;
  notifTime = ti.value;
  localStorage.setItem('notifTime', notifTime);
  updateNextMsg();
  toast("Bildirim saati kaydedildi: " + notifTime + " ✅");
  pushAlarmToSW();
}

// SW'ye alarm bilgisini ilet
function pushAlarmToSW() {
  if (!notifTime) return;
  const [h, m] = notifTime.split(':').map(Number);
  swPost({
    type: 'SET_ALARM',
    hour: h,
    minute: m,
    quotes: getAllQuotes()
  });
}

// "Sonraki bildirim X saat sonra" metni
function updateNextMsg() {
  const el = document.getElementById('next-msg');
  if (!el || !notifTime) return;
  const [h, m] = notifTime.split(':').map(Number);
  const now = new Date(), next = new Date();
  next.setHours(h, m, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const diff = next - now;
  const dh = Math.floor(diff / 3600000);
  const dm = Math.floor((diff % 3600000) / 60000);
  el.textContent = dh > 0
    ? `Sonraki bildirim yaklaşık ${dh} saat ${dm} dakika sonra`
    : `Sonraki bildirim yaklaşık ${dm} dakika sonra`;
}

// Test bildirimi — SW üzerinden gönder
function testNotif() {
  if (Notification.permission !== 'granted') {
    toast("Önce bildirim iznini ver!");
    return;
  }
  const q = getAllQuotes()[Math.floor(Math.random() * getAllQuotes().length)];
  const sent = swPost({ type: 'TEST_NOTIF', quote: q });
  if (!sent) {
    // SW hazır değil, doğrudan dene (Android Chrome'da çalışır)
    try {
      new Notification("Hülya'nın Köşesi 💕", {
        body: q, icon: './icon-192.png'
      });
    } catch(e) {
      toast("Bildirim gönderilemedi. Ana ekrana ekleyip oradan dene.");
      return;
    }
  }
  toast("Test bildirimi gönderildi! 🔔");
}

// ═══════════════════════════════════════════════════════════
// ÖZEL MESAJLAR
// ═══════════════════════════════════════════════════════════
function addMsg() {
  const inp=document.getElementById('msg-in'); const txt=inp?.value.trim();
  if (!txt) return toast("Mesaj boş olamaz!");
  customMsgs.push(txt); localStorage.setItem('customMsgs',JSON.stringify(customMsgs));
  if (inp) inp.value=''; renderMsgs(); toast("Mesaj eklendi!");
}
function removeMsg(i) {
  customMsgs.splice(i,1); localStorage.setItem('customMsgs',JSON.stringify(customMsgs)); renderMsgs();
}
function renderMsgs() {
  const el=document.getElementById('msgs-list'); if (!el) return;
  if (!customMsgs.length) { el.innerHTML='<p style="font-size:14px;color:var(--muted);text-align:center;padding:8px 0;">Henüz özel mesaj yok</p>'; return; }
  el.innerHTML='';
  customMsgs.forEach((m,i) => {
    const d=document.createElement('div'); d.className='msg-item';
    d.innerHTML=`<span>${esc(m)}</span><button class="msg-del" onclick="removeMsg(${i})">&times;</button>`;
    el.appendChild(d);
  });
}

// ═══════════════════════════════════════════════════════════
// NAVIGASYON
// ═══════════════════════════════════════════════════════════
function goTab(id, btn) {
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if (id==='t-favs')  renderFavs();
  if (id==='t-track') renderHabits();
  if (id==='t-notif') {
    renderMsgs();
    // İzin durumuna göre doğru kartı göster
    if (Notification.permission === 'granted') {
      showTimeCard();
    } else {
      // perm-card'ı göster, time-card'ı gizle
      const pc = document.getElementById('perm-card');
      const tc = document.getElementById('time-card');
      if (pc) pc.style.display = 'block';
      if (tc) tc.style.display = 'none';
      // İzin durumuna göre butonu güncelle
      const pb = document.getElementById('perm-btn');
      if (pb) {
        if (Notification.permission === 'denied') {
          pb.textContent = 'İzin Reddedildi — Ayarları Kontrol Et';
          pb.disabled = true;
        } else {
          pb.textContent = 'Bildirimlere İzin Ver';
          pb.disabled = false;
        }
      }
    }
    updateNextMsg();
  }
}

// ═══════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════
function toast(msg) {
  const el = document.getElementById('toast'); if (!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(()=>el.classList.remove('show'), 3000);
}
function esc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ═══════════════════════════════════════════════════════════
// PWA
// ═══════════════════════════════════════════════════════════
let dip=null;
window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault(); dip=e;
  const w=document.getElementById('pwa-btn');
  if (w) w.innerHTML='<button class="btn-primary" style="margin-top:16px;" onclick="installPWA()">Uygulamayı Ana Ekrana Ekle</button>';
});
function installPWA() {
  if (!dip) return;
  dip.prompt();
  dip.userChoice.then(r=>{if(r.outcome==='accepted')toast("Uygulama kuruldu!");dip=null;});
}

// ═══════════════════════════════════════════════════════════
// BAŞLATMA
// ═══════════════════════════════════════════════════════════
window.onload = () => {
  setGreeting();
  initJournal();

  // First quote — after splash
  setTimeout(() => {
    currentQ = getRandomQuote(-1);
    const el = document.getElementById('quote-text');
    if (el) { el.textContent = currentQ; el.style.opacity='1'; el.style.transform='none'; }
    syncFavBtn();

    // Hide swipe hint if already swiped before
    const hint = document.getElementById('swipe-hint');
    if (hint && localStorage.getItem('swipedOnce')) hint.style.opacity='0';
  }, 1800);

  // Restore today's mood button state
  const todayMood = moodHist[0]?.date === new Date().toLocaleDateString('tr-TR') ? moodHist[0].label : null;
  if (todayMood) {
    setTimeout(() => {
      document.querySelectorAll('.mood').forEach(b => { if (b.dataset.mood===todayMood) b.classList.add('active'); });
    }, 200);
  }

  renderMoodChart();
  renderHabits();
  renderMsgs();
  updateStatsRow();
  updateStreak();
  loadCourses();
  initSwipe();

  // Init ripple (after DOM settles)
  setTimeout(initRipple, 2200);

  // Service Worker kayıt
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        swReg = reg;
        reg.update().catch(() => {});
        // SW hazır olunca alarmı gönder
        navigator.serviceWorker.ready.then(() => {
          if (Notification.permission === 'granted' && notifTime) {
            pushAlarmToSW();
          }
        });
      })
      .catch(err => console.log('SW:', err));

    // SW mesajlarını dinle
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data?.type === 'ALARM_ACK') {
        console.log('Alarm SW tarafindan kuruldu:', e.data.hour + ':' + String(e.data.minute).padStart(2,'0'));
      }
    });
  }

  // İzin zaten varsa saat kartı hazır olsun
  if (Notification.permission === 'granted') {
    updateNextMsg();
  }
};
