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
let googleToken   = null;
let currentUser   = null;
let selectedFile  = null;
let selCatVal     = "Motivasyon";
let filterVal     = "Tümü";
let allCourses    = [];
let searchQ       = "";

let favorites   = JSON.parse(localStorage.getItem('fav')       || '[]');
let habits      = JSON.parse(localStorage.getItem('habits')    || '[]');
let moodHist    = JSON.parse(localStorage.getItem('moodHist')  || '[]');
let customMsgs  = JSON.parse(localStorage.getItem('customMsgs')|| '[]');
let notifTime   = localStorage.getItem('notifTime')            || '08:00';
let currentQ    = "";

// ═══════════════════════════════════════════════════════════
// HÜLYA'YA ÖZEL ALINTILER
// ═══════════════════════════════════════════════════════════
const QUOTES = [
  // Oğlundan anneye
  "Hülya, seninle gurur duyuyorum. Her anıma dokunmuşsun.",
  "Sabahları güneş doğunca seni düşünüyorum, Hülya.",
  "Verdiğin her emek için teşekkür ederim. Çok değerlisin.",
  "Senin gülüşün odayı aydınlatıyor, bunu hiç unutma.",
  "Bir anneye duyulabilecek en derin minneti hissediyorum.",
  "Bu dünyada olmak için en güzel neden senin varlığın.",
  // Motivasyon
  "Hülya, bugün ne yapacaksan tam kalbinle yap.",
  "Küçük adımlar bile seni hedefe taşır. Vazgeçme!",
  "Her yeni gün sana yeniden başlama fırsatı sunuyor.",
  "Hissettiğin yorgunluk, ne kadar çok çabaladığının kanıtı.",
  "Bugün zor olan yarın seni daha güçlü yapacak.",
  "Potansiyelin sınırlarından çok daha büyük, Hülya.",
  // Huzur & Farkındalık
  "Bu anı yaşa. Geçmiş geride, gelecek ileride. Şimdi var.",
  "Kendine nazik ol, tıpkı en iyi arkadaşına olduğun gibi.",
  "Nefes al. Her şey yoluna girecek.",
  "Küçük zevkler büyük mutluluklar inşa eder.",
  "Hülya, bugün sadece bir şey yap: kendine iyi bak.",
  "İçindeki sessizliği dinle. Orada tüm cevaplar var.",
  "Bitkinlik zayıflık değil, uzun süre güçlü olmanın işareti.",
  // İlişkiler & Sevgi
  "Sevdiğin insanları bugün ara, o ses yeter.",
  "Aile sevgisi en güzel liman, sen o limanın ta kendisisin.",
  "Verebildiğin her gülümseme dünyayı biraz daha iyi yapar.",
  // Sağlık & Yaşam
  "Bugün bir bardak su fazla iç, biraz yürü, kendini unut.",
  "Uyku mucizedir, bugün erken yat.",
  "Doğayla geçirdiğin beş dakika ruhunu yeniler.",
  // Öz güven
  "Hülya, her şeyin üstesinden gelebilirsin — geçmişin bunu kanıtlıyor.",
  "Başkasının onayına ihtiyacın yok. Sen zaten yetersiz.",
  "Hatalardan öğrenmek bilgeliğin ilk adımıdır.",
  "Yaşın ne olursa olsun, büyümek için hiç geç değil.",
  "Güzel olan şeylere dikkat et. Onlar her yerde.",
  "Bugün kendin ol; bu dünyanın ihtiyacı olan şey tam da bu.",
];

function getAllQuotes() { return [...QUOTES, ...customMsgs]; }

function getRandomQuote() {
  const all = getAllQuotes();
  return all[Math.floor(Math.random() * all.length)];
}

function refreshQuote() {
  const q = getRandomQuote();
  currentQ = q;
  const el = document.getElementById('quote-text');
  if (!el) return;
  el.style.opacity = '0';
  el.style.transform = 'translateY(6px)';
  setTimeout(() => {
    el.textContent = q;
    el.style.transition = 'all 0.35s ease';
    el.style.opacity = '1';
    el.style.transform = 'none';
  }, 160);
  syncFavBtn();
}

function syncFavBtn() {
  const btn = document.getElementById('fav-btn');
  if (!btn) return;
  const loved = favorites.includes(currentQ);
  btn.classList.toggle('loved', loved);
  const path = btn.querySelector('svg path');
  if (path) {
    path.setAttribute('fill', loved ? 'white' : 'none');
    path.setAttribute('stroke', 'white');
  }
}

// ═══════════════════════════════════════════════════════════
// FAVORİLER
// ═══════════════════════════════════════════════════════════
function toggleFav() {
  if (!currentQ) return;
  const i = favorites.indexOf(currentQ);
  if (i === -1) {
    favorites.push(currentQ);
    toast("Favorilere eklendi");
  } else {
    favorites.splice(i, 1);
    toast("Favorilerden çıkarıldı");
  }
  localStorage.setItem('fav', JSON.stringify(favorites));
  syncFavBtn();
}

function renderFavs() {
  const el = document.getElementById('favs-list');
  if (!el) return;
  if (!favorites.length) {
    el.innerHTML = "<p style='text-align:center;color:var(--muted);padding:40px 20px;line-height:1.6;'>Henüz favori yok.<br>Ana sayfada kalp ikonuna dokun.</p>";
    return;
  }
  el.innerHTML = '';
  favorites.forEach((q, i) => {
    const d = document.createElement('div');
    d.className = 'fav-item';
    d.style.animationDelay = (i * 0.04) + 's';
    d.innerHTML = `
      <div class="fav-heart">
        <svg viewBox="0 0 24 24"><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402C1 3.403 4.068 2 6.5 2 8.763 2 10.824 3.398 12 5.184 13.176 3.398 15.237 2 17.5 2 19.932 2 23 3.404 23 7.191c0 4.105-5.369 8.863-11 14.402z" fill="#E8436A"/></svg>
      </div>
      <p>${esc(q)}</p>
      <button class="fav-del" onclick="removeFav(${i})">&times;</button>`;
    el.appendChild(d);
  });
}

function removeFav(i) {
  favorites.splice(i, 1);
  localStorage.setItem('fav', JSON.stringify(favorites));
  renderFavs();
  toast("Favorilerden kaldırıldı");
}

// ═══════════════════════════════════════════════════════════
// MOD
// ═══════════════════════════════════════════════════════════
const MOOD_SVGS = {
  'Mutlu':   '<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#FFF0C0" stroke="#F5C518" stroke-width="1.5"/><circle cx="13" cy="15" r="2" fill="#555"/><circle cx="23" cy="15" r="2" fill="#555"/><path d="M11 22c2 4 12 4 14 0" stroke="#555" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>',
  'Huzurlu': '<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#DFF5E3" stroke="#5CB85C" stroke-width="1.5"/><circle cx="13" cy="15" r="2" fill="#555"/><circle cx="23" cy="15" r="2" fill="#555"/><path d="M12 22c2 2 10 2 12 0" stroke="#555" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>',
  'Normal':  '<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#EEE" stroke="#AAA" stroke-width="1.5"/><circle cx="13" cy="15" r="2" fill="#555"/><circle cx="23" cy="15" r="2" fill="#555"/><path d="M12 23h12" stroke="#555" stroke-width="1.5" stroke-linecap="round"/></svg>',
  'Yorgun':  '<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#E8E0F5" stroke="#9B59B6" stroke-width="1.5"/><path d="M10 14q3-1 6 0M20 14q3-1 6 0" stroke="#555" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M12 24c2-2 10-2 12 0" stroke="#555" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>',
  'Stresli': '<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#FFE5E5" stroke="#E74C3C" stroke-width="1.5"/><path d="M11 13q2-2 6 0M19 13q2-2 6 0" stroke="#555" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M11 24c2-4 12-4 14 0" stroke="#555" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>'
};

function selectMood(btn) {
  document.querySelectorAll('.mood').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const label = btn.dataset.mood;
  const entry = {
    label,
    date: new Date().toLocaleDateString('tr-TR'),
    time: new Date().toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' })
  };
  moodHist = moodHist.filter(m => m.date !== entry.date);
  moodHist.unshift(entry);
  if (moodHist.length > 30) moodHist = moodHist.slice(0, 30);
  localStorage.setItem('moodHist', JSON.stringify(moodHist));
  toast(label + ' kaydedildi');
  renderMoodHist();
}

function renderMoodHist() {
  const el = document.getElementById('mood-hist');
  if (!el) return;
  if (!moodHist.length) {
    el.innerHTML = '<p style="font-size:13px;color:var(--muted);text-align:center;padding:6px 0;">Henüz mod kaydı yok</p>';
    return;
  }
  el.innerHTML = '<p style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:.8px;text-transform:uppercase;margin-bottom:8px;">Son 7 gün</p>' +
    moodHist.slice(0,7).map(m => `
      <div class="mood-row">
        ${MOOD_SVGS[m.label] || ''}
        <span class="mood-lbl">${m.label}</span>
        <span class="mood-date">${m.date}</span>
      </div>`).join('');
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
  toast("Hedef eklendi!");
}

function toggleHabit(id) {
  const h = habits.find(h => h.id === id);
  if (h) h.done = !h.done;
  localStorage.setItem('habits', JSON.stringify(habits));
  renderHabits();
  if (h?.done) toast("Tebrikler! Hedef tamamlandı");
}

function deleteHabit(id) {
  habits = habits.filter(h => h.id !== id);
  localStorage.setItem('habits', JSON.stringify(habits));
  renderHabits();
}

function renderHabits() {
  const list = document.getElementById('habits-list');
  const pw   = document.getElementById('prog-wrap');
  if (!list) return;

  if (!habits.length) {
    list.innerHTML = "<p style='text-align:center;color:var(--muted);padding:24px;'>Henüz hedef yok. Ekleyerek başla!</p>";
    if (pw) pw.innerHTML = '';
    return;
  }

  const done = habits.filter(h => h.done).length;
  const pct  = Math.round((done / habits.length) * 100);

  if (pw) {
    pw.innerHTML = `
      <div class="prog-card">
        <div class="prog-label"><span>Bugünkü ilerleme</span><span>${done}/${habits.length}</span></div>
        <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>
        ${pct === 100 ? '<p style="text-align:center;font-size:14px;margin-top:10px;color:var(--rose);font-weight:700;">Tüm hedefleri tamamladın!</p>' : ''}
      </div>`;
  }

  list.innerHTML = '';
  habits.forEach(h => {
    const d = document.createElement('div');
    d.className = 'habit-item' + (h.done ? ' done' : '');
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
    updateAuthUI(null);
    toast("Çıkış yapıldı.");
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
      if (e.lengthComputable) setProg(Math.round(e.loaded/e.total*100), `Yükleniyor... %${Math.round(e.loaded/e.total*100)}`);
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
  const url = URL.createObjectURL(selectedFile);
  const prev = document.getElementById('media-prev');
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
// AKADEMİ KAYDET / YÜKLE
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
      if (!googleToken) {
        toast("Video için önce giriş yap!");
        if (btn) { btn.disabled = false; btn.textContent = "Arşive Kaydet"; }
        return;
      }
      setProg(0, "Başlatılıyor...");
      const r = await uploadToDrive(selectedFile);
      setProg(100, "Tamamlandı!");
      media = r.viewLink; driveId = r.fileId; mediaType = selectedFile.type;
      setTimeout(() => setProg(-1, ''), 1500);
    }

    await db.collection("academy").add({
      name, notes, category: selCatVal,
      media, driveId, mediaType,
      date: new Date().toLocaleDateString('tr-TR'),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    toast("Arşive kaydedildi!");
    document.getElementById('c-name').value  = '';
    document.getElementById('c-notes').value = '';
    const mp = document.getElementById('media-prev');
    if (mp) mp.innerHTML = '';
    const mi = document.getElementById('media-in');
    if (mi) mi.value = '';
    const lt = document.getElementById('upload-lbl-txt');
    if (lt) lt.textContent = 'Video veya ses ekle';
    selectedFile = null; selCatVal = "Motivasyon";
    document.querySelectorAll('.cat-chip, #cat-chips .chip').forEach((c,i) => c.classList.toggle('active',i===0));

  } catch (e) {
    console.error(e);
    alert("Hata: " + e.message);
    setProg(-1,'');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Arşive Kaydet"; }
  }
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

  if (!items.length) {
    list.innerHTML = "<p style='text-align:center;color:var(--muted);padding:24px;'>Bu kategoride henüz kayıt yok.</p>";
    return;
  }
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
      <p style="font-size:14px;line-height:1.55;color:#333;">${esc(c.notes)}</p>
      ${media}`;
    list.appendChild(d);
  });
}

function selCat(btn) {
  document.querySelectorAll('#cat-chips .chip').forEach(c=>c.classList.remove('active'));
  btn.classList.add('active');
  selCatVal = btn.dataset.cat;
}

function selFilter(btn) {
  document.querySelectorAll('#filter-chips .chip').forEach(f=>f.classList.remove('active'));
  btn.classList.add('active');
  filterVal = btn.dataset.filter;
  renderCourses();
}

function onSearch() {
  const inp = document.getElementById('search-in');
  const cb  = document.getElementById('clear-btn');
  searchQ = inp?.value.trim() || '';
  if (cb) cb.style.display = searchQ ? 'block' : 'none';
  renderCourses();
}

function clearSearch() {
  const inp = document.getElementById('search-in');
  const cb  = document.getElementById('clear-btn');
  if (inp) inp.value = '';
  if (cb)  cb.style.display = 'none';
  searchQ = '';
  renderCourses();
}

async function delCourse(id) {
  if (!confirm("Bu notu silmek istediğine emin misin?")) return;
  try { await db.collection("academy").doc(id).delete(); toast("Not silindi."); }
  catch(e) { toast("Hata: " + e.message); }
}

// ═══════════════════════════════════════════════════════════
// BİLDİRİM SİSTEMİ
// ═══════════════════════════════════════════════════════════
let swReg = null;
let alarmTick = null;

async function askPerm() {
  const btn = document.getElementById('perm-btn');
  const msg = document.getElementById('perm-msg');
  if (!('Notification' in window)) {
    if (msg) msg.textContent = "Bu tarayıcı desteklemiyor. Safari kullan!";
    return;
  }
  if (btn) btn.textContent = "İzin isteniyor...";
  const p = await Notification.requestPermission().catch(()=>'denied');
  if (p === 'granted') {
    if (msg) msg.textContent = "Bildirimler açık!";
    showTimeCard();
    toast("Bildirimler açıldı!");
    startAlarm();
  } else {
    if (msg) msg.textContent = "İzin verilmedi. Ayarlardan açabilirsin.";
    if (btn) btn.textContent = "Bildirimlere İzin Ver";
  }
}

function showTimeCard() {
  const pc = document.getElementById('perm-card');
  const tc = document.getElementById('time-card');
  if (pc) pc.style.display = 'none';
  if (tc) { tc.style.display = 'block'; tc.style.animation = 'cardIn .3s ease'; }
  const ti = document.getElementById('time-in');
  if (ti) ti.value = notifTime;
  updateNextMsg();
}

function saveTime() {
  const ti = document.getElementById('time-in');
  if (!ti) return;
  notifTime = ti.value;
  localStorage.setItem('notifTime', notifTime);
  updateNextMsg();
  toast("Bildirim saati kaydedildi: " + notifTime);
  startAlarm();
}

function updateNextMsg() {
  const el = document.getElementById('next-msg');
  if (!el || !notifTime) return;
  const [h,m] = notifTime.split(':').map(Number);
  const now  = new Date();
  const next = new Date();
  next.setHours(h,m,0,0);
  if (next <= now) next.setDate(next.getDate()+1);
  const diff  = next - now;
  const diffH = Math.floor(diff/3600000);
  const diffM = Math.floor((diff%3600000)/60000);
  el.textContent = diffH > 0
    ? `Sonraki bildirim ${diffH} saat ${diffM} dakika sonra`
    : `Sonraki bildirim ${diffM} dakika sonra`;
}

function testNotif() {
  if (Notification.permission !== 'granted') return toast("Önce bildirim iznini ver!");
  const q = getAllQuotes()[Math.floor(Math.random()*getAllQuotes().length)];
  const n = () => new Notification("Hülya'nın Köşesi", { body: q, icon: './icon-192.png' });
  if (swReg) swReg.showNotification("Hülya'nın Köşesi", { body: q, icon: './icon-192.png' }).catch(n);
  else n();
  toast("Test bildirimi gönderildi!");
}

function startAlarm() {
  if (alarmTick) clearInterval(alarmTick);
  alarmTick = setInterval(() => {
    if (Notification.permission !== 'granted') return;
    const now = new Date();
    const [h,m] = notifTime.split(':').map(Number);
    if (now.getHours()===h && now.getMinutes()===m) {
      const today = now.toLocaleDateString('tr-TR');
      if (localStorage.getItem('lastNotif')===today) return;
      localStorage.setItem('lastNotif', today);
      const q = getAllQuotes()[Math.floor(Math.random()*getAllQuotes().length)];
      const opts = { body: q, icon: './icon-192.png', vibrate: [200,100,200] };
      if (swReg) swReg.showNotification("Hülya'nın Köşesi", opts).catch(() =>
        new Notification("Hülya'nın Köşesi", opts));
      else new Notification("Hülya'nın Köşesi", opts);
    }
    updateNextMsg();
  }, 60000);
}

// ═══════════════════════════════════════════════════════════
// ÖZEL MESAJLAR
// ═══════════════════════════════════════════════════════════
function addMsg() {
  const inp = document.getElementById('msg-in');
  const txt = inp?.value.trim();
  if (!txt) return toast("Mesaj boş olamaz!");
  customMsgs.push(txt);
  localStorage.setItem('customMsgs', JSON.stringify(customMsgs));
  if (inp) inp.value = '';
  renderMsgs();
  toast("Mesaj eklendi!");
}

function removeMsg(i) {
  customMsgs.splice(i,1);
  localStorage.setItem('customMsgs', JSON.stringify(customMsgs));
  renderMsgs();
}

function renderMsgs() {
  const el = document.getElementById('msgs-list');
  if (!el) return;
  if (!customMsgs.length) {
    el.innerHTML = '<p style="font-size:14px;color:var(--muted);text-align:center;padding:8px 0;">Henüz özel mesaj yok</p>';
    return;
  }
  el.innerHTML = '';
  customMsgs.forEach((m,i) => {
    const d = document.createElement('div');
    d.className = 'msg-item';
    d.innerHTML = `<span>${esc(m)}</span><button class="msg-del" onclick="removeMsg(${i})">&times;</button>`;
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
  if (id==='t-notif') { renderMsgs(); if (Notification.permission==='granted') showTimeCard(); }
}

// ═══════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3000);
}

function esc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ═══════════════════════════════════════════════════════════
// PWA
// ═══════════════════════════════════════════════════════════
let dip = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); dip = e;
  const w = document.getElementById('pwa-btn');
  if (w) w.innerHTML = '<button class="btn-primary" style="margin-top:16px;" onclick="installPWA()">Uygulamayı Ana Ekrana Ekle</button>';
});
function installPWA() {
  if (!dip) return;
  dip.prompt();
  dip.userChoice.then(r => { if (r.outcome==='accepted') toast("Uygulama kuruldu!"); dip=null; });
}

// ═══════════════════════════════════════════════════════════
// BAŞLATMA
// ═══════════════════════════════════════════════════════════
window.onload = () => {
  // İlk alıntı — splash bittikten sonra fade-in
  setTimeout(() => {
    currentQ = getRandomQuote();
    const el = document.getElementById('quote-text');
    if (el) { el.textContent = currentQ; el.style.opacity = '1'; el.style.transform = 'none'; }
    syncFavBtn();
  }, 1800);

  // Bugünkü mod
  if (moodHist.length && moodHist[0].date === new Date().toLocaleDateString('tr-TR')) {
    setTimeout(() => {
      document.querySelectorAll('.mood').forEach(b => {
        if (b.dataset.mood === moodHist[0].label) b.classList.add('active');
      });
    }, 200);
  }

  renderMoodHist();
  renderHabits();
  renderMsgs();
  loadCourses();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(r => { swReg = r; })
      .catch(e => console.log('SW:', e.message));
  }

  if (Notification.permission === 'granted' && notifTime) startAlarm();
};
