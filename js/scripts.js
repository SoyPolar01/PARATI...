// --- CONFIGURACIÓN Y ESTADO ---
const MASTER_KEY = "14042024";
let isAdmin = false;

// --- ELEMENTOS COMUNES ---
const adminTrigger = document.getElementById('admin-trigger');

// --- PÁGINA DE INICIO (INDEX.HTML) ---
const homePage = document.getElementById('home-page');
const editableLetter = document.getElementById('editable-letter');
const btnEdit = document.getElementById('btn-edit-letter');
const btnSave = document.getElementById('btn-save-letter');
const calendarGrid = document.getElementById('calendar-grid');
const daysCountDisplay = document.getElementById('days-count');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const noteModal = document.getElementById('note-modal');
const btnSaveNote = document.getElementById('btn-save-note');
const btnCloseModal = document.getElementById('btn-close-modal');
const notePhotoUrlInput = document.getElementById('note-photo-url');
const noteMessageInput = document.getElementById('note-message');
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');

let currentViewDate = new Date();

// --- PÁGINA DE CORAZONES (RECUERDOS.HTML) ---
const redHeartsGrid = document.getElementById('red-hearts-grid');
const blackHeartsGrid = document.getElementById('black-hearts-grid');

let selectedDateKey = "";

// --- PÁGINA DE MENSAJES (MENSAJES.HTML) ---
const stickersContainer = document.getElementById('stickers-container');
let stickers = JSON.parse(localStorage.getItem('stickers') || '[]');

// --- BASE DE DATOS INDEXEDDB V3 (BLOBS PARA MÁXIMA EFICIENCIA) ---
const DB_NAME = 'ParaTiDB_V3';
const DB_VERSION = 1;
const STORE_DATA = 'data';
const STORE_PHOTOS = 'photos';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_DATA)) db.createObjectStore(STORE_DATA);
            if (!db.objectStoreNames.contains(STORE_PHOTOS)) db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function dbGet(storeName, key, defaultValue = null) {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result || defaultValue);
            request.onerror = () => resolve(defaultValue);
        });
    } catch (e) { return defaultValue; }
}

async function dbSet(storeName, key, value) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) { console.error(e); }
}

async function dbAddPhoto(photoObj) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_PHOTOS, 'readwrite');
            const store = transaction.objectStore(STORE_PHOTOS);
            const request = store.add(photoObj);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (e) { throw e; }
}

async function dbGetAllPhotos() {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const transaction = db.transaction(STORE_PHOTOS, 'readonly');
            const store = transaction.objectStore(STORE_PHOTOS);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result.sort((a,b) => b.id - a.id));
            request.onerror = () => resolve([]);
        });
    } catch (e) { return []; }
}

async function dbDeletePhoto(id) {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const transaction = db.transaction(STORE_PHOTOS, 'readwrite');
            const store = transaction.objectStore(STORE_PHOTOS);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
        });
    } catch (e) { console.error(e); }
}

// --- INICIALIZACIÓN ---
window.addEventListener('DOMContentLoaded', async () => {
    logVisit(); 
    checkAdminUI();
    await initCalendar();
    loadLetter();
    if (redHeartsGrid || blackHeartsGrid) initHearts();
    if (stickersContainer) initStickers();
    if (document.getElementById('gallery-grid')) initGallery();
});

// --- SISTEMA DE AUDITORÍA (LOGS) ---
function logVisit() {
    try {
        const logs = JSON.parse(localStorage.getItem('visit-logs') || '[]');
        logs.unshift({ date: new Date().toLocaleString(), ua: navigator.userAgent });
        if (logs.length > 20) logs.pop();
        localStorage.setItem('visit-logs', JSON.stringify(logs));
    } catch(e) {}
}

function renderAdminLogs() {
    let logsContainer = document.getElementById('admin-logs-view');
    if (!logsContainer && homePage) {
        logsContainer = document.createElement('div');
        logsContainer.id = 'admin-logs-view';
        logsContainer.className = 'hidden';
        homePage.appendChild(logsContainer);
    }
    if (!logsContainer) return;
    const logs = JSON.parse(localStorage.getItem('visit-logs') || '[]');
    let html = `<div class="admin-page-header"><button id="btn-back-home" class="btn btn-secondary">← Volver</button><h2 class="dancing-title">Logs</h2></div>
                <div class="logs-card"><table><thead><tr><th>Fecha</th><th>Disp</th></tr></thead><tbody>`;
    logs.forEach(log => { html += `<tr><td>${log.date}</td><td class="ua-text">${log.ua}</td></tr>`; });
    html += `</tbody></table><button class="btn btn-primary" onclick="localStorage.clear(); location.reload();" style="margin-top:20px">Resetear Todo</button></div>`;
    logsContainer.innerHTML = html;
    document.getElementById('btn-back-home').onclick = () => toggleAdminView(false);
}

function toggleAdminView(show) {
    const main = document.getElementById('main-content');
    const admin = document.getElementById('admin-logs-view');
    if (show) { if(main) main.classList.add('hidden'); if(admin) { admin.classList.remove('hidden'); renderAdminLogs(); } }
    else { if(main) main.classList.remove('hidden'); if(admin) admin.classList.add('hidden'); }
}

if (adminTrigger) {
    adminTrigger.addEventListener('dblclick', () => {
        const pass = prompt("Llave:");
        if (pass === MASTER_KEY) {
            isAdmin = true;
            alert("Modo admin ❤️");
            checkAdminUI();
            initCalendar();
            const btnLogs = document.getElementById('btn-show-logs');
            if (btnLogs) btnLogs.onclick = (e) => { e.preventDefault(); toggleAdminView(true); };
        }
    });
}

function checkAdminUI() {
    const elms = document.querySelectorAll('.letter-actions, .note-inputs, #btn-save-note, .delete-sticker, #sticker-instruction, #nav-logs-container, .delete-photo');
    elms.forEach(el => isAdmin ? el.classList.remove('hidden') : el.classList.add('hidden'));
    if (editableLetter) editableLetter.contentEditable = isAdmin;
}

function loadLetter() {
    if (editableLetter) {
        const s = localStorage.getItem('romantic-letter');
        if (s) editableLetter.innerHTML = s;
    }
}

if (btnEdit && btnSave) {
    btnEdit.onclick = () => { editableLetter.focus(); btnEdit.classList.add('hidden'); btnSave.classList.remove('hidden'); };
    btnSave.onclick = () => { localStorage.setItem('romantic-letter', editableLetter.innerHTML); btnEdit.classList.remove('hidden'); btnSave.classList.add('hidden'); alert("Guardado"); };
}

// --- CALENDARIO ---
async function initCalendar() {
    if (!calendarGrid) return;
    const year = currentViewDate.getFullYear(), month = currentViewDate.getMonth();
    const now = new Date(), today = now.getDate();
    const isCurrent = (now.getFullYear() === year && now.getMonth() === month);
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById('current-month-year').innerText = `${months[month]} ${year}`;
    calendarGrid.innerHTML = '';
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(d => { const dv = document.createElement('div'); dv.className = 'calendar-day-head'; dv.innerText = d; calendarGrid.appendChild(dv); });
    const first = new Date(year, month, 1).getDay();
    let offset = first === 0 ? 6 : first - 1;
    for (let i = 0; i < offset; i++) { const dv = document.createElement('div'); dv.className = 'calendar-day empty'; calendarGrid.appendChild(dv); }
    for (let d = 1; d <= new Date(year, month+1, 0).getDate(); d++) {
        const dv = document.createElement('div'); dv.className = 'calendar-day';
        const key = `${year}-${month+1}-${d}`;
        if (isCurrent && d === today) dv.classList.add('today');
        const data = await dbGet(STORE_DATA, `note-${key}`);
        if (data) dv.classList.add('has-note');
        dv.innerText = d; dv.onclick = () => openNote(d, key);
        calendarGrid.appendChild(dv);
    }
    if (daysCountDisplay) daysCountDisplay.innerText = Math.floor((now - new Date('2023-12-22'))/86400000);
    prevMonthBtn.onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth()-1); initCalendar(); };
    nextMonthBtn.onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth()+1); initCalendar(); };
}

async function openNote(day, key) {
    selectedDateKey = key;
    document.getElementById('modal-date').innerText = `Día ${day}`;
    const data = await dbGet(STORE_DATA, `note-${key}`, {});
    const vImg = document.getElementById('view-img'), vMsg = document.getElementById('view-msg');
    vImg.src = data.photo || ""; vImg.style.display = data.photo ? 'block' : 'none';
    vMsg.innerText = data.message || (isAdmin ? "Escribe algo..." : "Sin detalles.");
    renderRatingDisplay(document.getElementById('view-red-rating'), 'red', data.redRating || 0, key);
    renderRatingDisplay(document.getElementById('view-black-rating'), 'black', data.blackRating || 0, key);
    if (isAdmin) {
        notePhotoUrlInput.value = data.photo || ""; noteMessageInput.value = data.message || "";
        document.getElementById('note-red-rating').value = data.redRating || 0;
        document.getElementById('note-black-rating').value = data.blackRating || 0;
        updateStarsVisual(document.querySelector('.red-stars'), data.redRating || 0);
        updateStarsVisual(document.querySelector('.black-stars'), data.blackRating || 0);
    }
    noteModal.classList.remove('hidden');
    checkAdminUI();
}

function renderRatingDisplay(container, type, val, key) {
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const s = document.createElement('span'); s.innerText = type === 'red' ? '❤️' : '🖤';
        s.style.opacity = i <= val ? '1' : '0.2'; s.style.fontSize = '1.8rem';
        if (i > val) s.onclick = async () => {
            const data = await dbGet(STORE_DATA, `note-${key}`, {});
            if (type === 'red') { data.redRating = i; throwHeart(); } else { data.blackRating = i; }
            await dbSet(STORE_DATA, `note-${key}`, data); openNote(key.split('-')[2], key); initCalendar();
        };
        container.appendChild(s);
    }
}

if (btnSaveNote) {
    btnSaveNote.onclick = async () => {
        if (!isAdmin) return;
        const data = { photo: notePhotoUrlInput.value, message: noteMessageInput.value, redRating: document.getElementById('note-red-rating').value, blackRating: document.getElementById('note-black-rating').value };
        await dbSet(STORE_DATA, `note-${selectedDateKey}`, data); noteModal.classList.add('hidden'); initCalendar();
    };
}
if (btnCloseModal) btnCloseModal.onclick = () => noteModal.classList.add('hidden');

// --- COMPRESIÓN ---
function compressImage(file, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
        const img = new Image(); img.src = e.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX = 800; let w = img.width, h = img.height;
            if (w > h) { if(w > MAX) { h *= MAX/w; w = MAX; } } else { if(h > MAX) { w *= MAX/h; h = MAX; } }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', 0.6));
        };
    };
}

function handleFile(file, zone, targetInput) {
    const p = zone.querySelector('p'); p.innerText = "Procesando...";
    compressImage(file, (b64) => {
        targetInput.value = b64;
        const prev = zone.querySelector('img') || document.createElement('img');
        prev.src = b64; prev.style.maxHeight = "100px"; prev.style.borderRadius = "10px";
        if (!zone.querySelector('img')) zone.appendChild(prev);
        p.style.display = "none";
        const btn = document.getElementById('btn-save-gallery-photo');
        if (btn) btn.classList.remove('hidden');
    });
}

if (dropZone && fileInput) {
    dropZone.onclick = () => { if(isAdmin) fileInput.click(); };
    fileInput.onchange = (e) => { if(e.target.files[0]) handleFile(e.target.files[0], dropZone, notePhotoUrlInput); };
}

// --- CORAZONES Y STICKERS ---
function initHearts() {
    if (!redHeartsGrid) return;
    const rState = JSON.parse(localStorage.getItem('red-hearts-state') || '[]');
    const bState = JSON.parse(localStorage.getItem('black-hearts-state') || '[]');
    renderHearts(redHeartsGrid, 'red', rState); renderHearts(blackHeartsGrid, 'black', bState);
}
function renderHearts(container, type, state) {
    container.innerHTML = '';
    for (let i = 0; i < 40; i++) {
        const h = document.createElement('div'); h.className = `heart-item ${state.includes(i) ? 'marked' : 'unmarked'}`;
        h.innerHTML = type === 'red' ? '❤️' : '🖤';
        h.onclick = () => {
            if (state.includes(i)) return; state.push(i); h.className = 'heart-item marked';
            if (type === 'red') throwHeart(); localStorage.setItem(`${type}-hearts-state`, JSON.stringify(state));
        };
        container.appendChild(h);
    }
}
function throwHeart() {
    const h = document.createElement('div'); h.className = 'thrown-heart'; h.innerText = '❤️'; document.body.appendChild(h);
    h.style.left = Math.random()*window.innerWidth+'px'; h.style.top = (Math.random()>0.5?-50:window.innerHeight+50)+'px';
    setTimeout(() => { h.style.left='50%'; h.style.top='50%'; h.style.opacity='0'; }, 100); setTimeout(() => h.remove(), 1200);
}
function initStickers() {
    if (!stickersContainer) return;
    stickersContainer.innerHTML = '<div class="sticker-instruction">Doble clic para añadir ✨</div>';
    stickers.forEach((s, i) => renderSticker(s, i));
    stickersContainer.ondblclick = (e) => {
        if (e.target !== stickersContainer) return;
        const text = prompt("Mensaje:");
        if (text) {
            const s = { text, x: e.clientX-100, y: e.clientY-75, color: ['','pink','blue','green'][Math.floor(Math.random()*4)] };
            stickers.push(s); localStorage.setItem('stickers', JSON.stringify(stickers)); renderSticker(s, stickers.length-1);
        }
    };
    checkAdminUI();
}
function renderSticker(data, index) {
    const div = document.createElement('div'); div.className = `sticker ${data.color}`; div.style.left = data.x+'px'; div.style.top = data.y+'px'; div.innerText = data.text;
    const del = document.createElement('button'); del.className = 'delete-sticker hidden'; del.innerHTML = '×';
    del.onclick = (e) => { e.stopPropagation(); if (!isAdmin) return; stickers.splice(index, 1); localStorage.setItem('stickers', JSON.stringify(stickers)); initStickers(); };
    div.appendChild(del);
    let isDrag = false, ox, oy;
    div.onmousedown = (e) => { if(e.target===del) return; isDrag=true; ox=e.clientX-div.offsetLeft; oy=e.clientY-div.offsetTop; div.style.zIndex=1000; };
    window.onmousemove = (e) => { if(isDrag) { data.x=e.clientX-ox; data.y=e.clientY-oy; div.style.left=data.x+'px'; div.style.top=data.y+'px'; } };
    window.onmouseup = () => { if(isDrag) { isDrag=false; div.style.zIndex=10; localStorage.setItem('stickers', JSON.stringify(stickers)); } };
    stickersContainer.appendChild(div);
}

// --- GALERÍA V3 ---
function initGallery() {
    const gZone = document.getElementById('gallery-drop-zone'), gFile = document.getElementById('gallery-file-input');
    const gUrl = document.getElementById('gallery-photo-url'), gSave = document.getElementById('btn-save-gallery-photo');
    const lb = document.getElementById('lightbox'), lbi = document.getElementById('lightbox-img'), lbc = document.getElementById('close-lightbox');
    if (document.getElementById('gallery-grid')) renderGallery();
    if (gZone) gZone.onclick = () => gFile.click();
    if (gFile) gFile.onchange = (e) => { if(e.target.files[0]) handleFile(e.target.files[0], gZone, gUrl); };
    if (gSave) gSave.onclick = async () => {
        const b64 = gUrl.value; if (!b64) return alert("Elige foto");
        try {
            await dbAddPhoto({ id: Date.now(), url: b64 });
            alert("¡Foto guardada! ❤️");
            gUrl.value = ""; if(gZone.querySelector('img')) gZone.querySelector('img').remove();
            gZone.querySelector('p').style.display = "block"; gZone.querySelector('p').innerText = "Haz clic para subir otra ✨";
            gSave.classList.add('hidden'); renderGallery(); throwHeart();
        } catch (err) { alert("Error al guardar: " + err); }
    };
    if (lbc) lbc.onclick = () => lb.classList.add('hidden');
    if (lb) lb.onclick = (e) => { if(e.target===lb) lb.classList.add('hidden'); };
}

async function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    const photos = await dbGetAllPhotos();
    grid.innerHTML = photos.length ? '' : '<p style="grid-column: 1/-1; opacity: 0.5; text-align: center;">Álbum vacío. ✨</p>';
    photos.forEach(p => {
        const item = document.createElement('div'); item.className = 'gallery-item';
        item.onclick = () => { document.getElementById('lightbox-img').src = p.url; document.getElementById('lightbox').classList.remove('hidden'); };
        const img = document.createElement('img'); img.src = p.url;
        const del = document.createElement('button'); del.className = 'delete-photo hidden'; del.innerHTML = '×';
        del.onclick = async (e) => { e.stopPropagation(); if(!isAdmin) return; if(confirm("¿Borrar?")) { await dbDeletePhoto(p.id); renderGallery(); } };
        item.appendChild(img); item.appendChild(del); grid.appendChild(item);
    });
    checkAdminUI();
}
