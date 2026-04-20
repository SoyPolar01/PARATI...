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

// --- BASE DE DATOS INDEXEDDB (ESPACIO AMPLIADO V2) ---
const DB_NAME = 'ParaTiDB';
const DB_VERSION = 2; // Subimos versión para nueva estructura
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
    const db = await openDB();
    return new Promise((resolve) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || defaultValue);
        request.onerror = () => resolve(defaultValue);
    });
}

async function dbSet(storeName, key, value) {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.put(value, key);
}

async function dbAddPhoto(photoObj) {
    const db = await openDB();
    const transaction = db.transaction(STORE_PHOTOS, 'readwrite');
    const store = transaction.objectStore(STORE_PHOTOS);
    store.add(photoObj);
}

async function dbGetAllPhotos() {
    const db = await openDB();
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_PHOTOS, 'readonly');
        const store = transaction.objectStore(STORE_PHOTOS);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a,b) => b.id - a.id));
    });
}

async function dbDeletePhoto(id) {
    const db = await openDB();
    const transaction = db.transaction(STORE_PHOTOS, 'readwrite');
    const store = transaction.objectStore(STORE_PHOTOS);
    store.delete(id);
}

// --- MIGRACIÓN Y LIMPIEZA ---
async function migrateAndClean() {
    const version = localStorage.getItem('db-version') || '0';
    if (version === '2') return;

    console.log("Optimizando almacenamiento...");
    
    // Migrar fotos del álbum (si estaban en el formato antiguo)
    const oldPhotos = localStorage.getItem('album-photos');
    if (oldPhotos) {
        const photos = JSON.parse(oldPhotos);
        for (const p of photos) {
            await dbAddPhoto(p);
        }
        localStorage.removeItem('album-photos');
    }

    // Migrar notas del calendario
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('note-')) {
            const val = localStorage.getItem(key);
            await dbSet(STORE_DATA, key, JSON.parse(val));
            localStorage.removeItem(key);
            i--; // Ajustar índice tras borrar
        }
    }

    localStorage.setItem('db-version', '2');
}

// --- INICIALIZACIÓN ---
window.addEventListener('DOMContentLoaded', async () => {
    await migrateAndClean();
    logVisit(); 
    checkAdminUI();
    initCalendar();
    loadLetter();
    
    if (redHeartsGrid || blackHeartsGrid) {
        initHearts();
    } else if (stickersContainer) {
        initStickers();
    }
    
    if (document.getElementById('gallery-grid')) {
        initGallery();
    }
});

// --- SISTEMA DE AUDITORÍA (LOGS) ---
function logVisit() {
    const logs = JSON.parse(localStorage.getItem('visit-logs') || '[]');
    const newLog = {
        date: new Date().toLocaleString(),
        ua: navigator.userAgent
    };
    logs.unshift(newLog);
    if (logs.length > 30) logs.pop();
    localStorage.setItem('visit-logs', JSON.stringify(logs));
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
    let html = `
        <div class="admin-page-header">
            <button id="btn-back-home" class="btn btn-secondary">← Volver</button>
            <h2 class="dancing-title">Historial</h2>
        </div>
        <div class="logs-card">
            <div class="logs-table-wrapper">
                <table>
                    <thead><tr><th>Fecha</th><th>Dispositivo</th></tr></thead>
                    <tbody>`;
    logs.forEach(log => {
        html += `<tr><td>${log.date}</td><td class="ua-text">${log.ua}</td></tr>`;
    });
    html += `</tbody></table></div>
        <button class="btn btn-primary" onclick="localStorage.removeItem('visit-logs'); location.reload();" style="margin-top: 20px;">Limpiar</button>
    </div>`;
    logsContainer.innerHTML = html;
    const btnBack = document.getElementById('btn-back-home');
    if (btnBack) btnBack.onclick = () => toggleAdminView(false);
}

function toggleAdminView(showLogs) {
    const mainContent = document.getElementById('main-content');
    const adminView = document.getElementById('admin-logs-view');
    if (showLogs) {
        if (mainContent) mainContent.classList.add('hidden');
        if (adminView) { adminView.classList.remove('hidden'); renderAdminLogs(); }
        window.scrollTo(0,0);
    } else {
        if (mainContent) mainContent.classList.remove('hidden');
        if (adminView) adminView.classList.add('hidden');
    }
}

// --- SISTEMA DE SEGURIDAD (ADMIN) ---
if (adminTrigger) {
    adminTrigger.addEventListener('dblclick', () => {
        const pass = prompt("Introduce la llave maestra:");
        if (pass === MASTER_KEY) {
            isAdmin = true;
            alert("Modo administrador activado ❤️");
            checkAdminUI();
            if (calendarGrid) initCalendar();
            if (redHeartsGrid || blackHeartsGrid) initHearts();
            if (editableLetter) loadLetter(); 
            if (stickersContainer) initStickers();
            const btnShowLogs = document.getElementById('btn-show-logs');
            if (btnShowLogs) btnShowLogs.onclick = (e) => { e.preventDefault(); toggleAdminView(true); };
        } else {
            alert("Llave incorrecta.");
        }
    });
}

function checkAdminUI() {
    const adminElements = document.querySelectorAll('.letter-actions, .note-inputs, #btn-save-note, .delete-sticker, #sticker-instruction, #nav-logs-container, .delete-photo');
    adminElements.forEach(el => {
        isAdmin ? el.classList.remove('hidden') : el.classList.add('hidden');
    });
    if (editableLetter) editableLetter.contentEditable = isAdmin ? "true" : "false";
    if (isAdmin) renderAdminLogs();
}

// --- CARTA ---
if (btnEdit && btnSave) {
    btnEdit.addEventListener('click', () => {
        if (!isAdmin) return;
        editableLetter.contentEditable = "true";
        editableLetter.focus();
        btnEdit.classList.add('hidden');
        btnSave.classList.remove('hidden');
    });
    btnSave.addEventListener('click', () => {
        if (!isAdmin) return;
        editableLetter.contentEditable = "false";
        localStorage.setItem('romantic-letter', editableLetter.innerHTML);
        btnEdit.classList.remove('hidden');
        btnSave.classList.add('hidden');
        alert("Carta guardada ❤️");
    });
}

function loadLetter() {
    if (editableLetter) {
        const saved = localStorage.getItem('romantic-letter');
        if (saved) editableLetter.innerHTML = saved;
    }
}

// --- CALENDARIO ---
async function initCalendar() {
    if (!calendarGrid) return;
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const now = new Date();
    const today = now.getDate();
    const isCurrentMonth = (now.getFullYear() === year && now.getMonth() === month);

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const monthYearHeader = document.getElementById('current-month-year');
    if (monthYearHeader) monthYearHeader.innerText = `${monthNames[month]} ${year}`;

    calendarGrid.innerHTML = '';
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(d => {
        const div = document.createElement('div');
        div.className = 'calendar-day-head';
        div.innerText = d;
        calendarGrid.appendChild(div);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let offset = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < offset; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day empty';
        calendarGrid.appendChild(div);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        const dateKey = `${year}-${month + 1}-${d}`;
        if (isCurrentMonth && d === today) div.classList.add('today');
        
        const noteData = await dbGet(STORE_DATA, `note-${dateKey}`);
        if (noteData) div.classList.add('has-note');
        
        div.innerText = d;
        div.onclick = () => openNote(d, dateKey);
        calendarGrid.appendChild(div);
    }

    if (daysCountDisplay) {
        const startDate = new Date('2023-12-22');
        daysCountDisplay.innerText = Math.floor((now - startDate) / (86400000));
    }
    
    if (prevMonthBtn && nextMonthBtn) {
        prevMonthBtn.onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); initCalendar(); };
        nextMonthBtn.onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); initCalendar(); };
    }
}

// --- SUBIDA Y COMPRESIÓN ---
function compressImage(file, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
                if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.6)); // Bajamos un poco la calidad para asegurar fluidez
        };
    };
}

function handleFile(file, zone, targetInput) {
    compressImage(file, (b64) => {
        if (targetInput) targetInput.value = b64;
        const previewImg = zone.querySelector('img') || document.createElement('img');
        previewImg.src = b64;
        previewImg.style.maxHeight = "100px"; previewImg.style.borderRadius = "10px"; previewImg.style.margin = "0 auto";
        const infoText = zone.querySelector('p');
        if (infoText) infoText.style.display = "none";
        if (!zone.querySelector('img')) zone.appendChild(previewImg);
        const btnSaveGallery = document.getElementById('btn-save-gallery-photo');
        if (btnSaveGallery) btnSaveGallery.classList.remove('hidden');
    });
}

if (dropZone && fileInput) {
    dropZone.onclick = () => { if(isAdmin) fileInput.click(); };
    dropZone.ondragover = (e) => { e.preventDefault(); if(isAdmin) dropZone.classList.add('dragover'); };
    dropZone.ondragleave = () => dropZone.classList.remove('dragover');
    dropZone.ondrop = (e) => {
        e.preventDefault(); dropZone.classList.remove('dragover');
        if(isAdmin && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], dropZone, notePhotoUrlInput);
    };
    fileInput.onchange = (e) => { if(e.target.files[0]) handleFile(e.target.files[0], dropZone, notePhotoUrlInput); };
}

// --- CALIFICACIONES (CORAZONES) ---
function initRatings() {
    document.querySelectorAll('.star-rating span').forEach(star => {
        star.onclick = async (e) => {
            if (!isAdmin) return;
            const container = e.target.parentElement;
            const type = container.dataset.type;
            const val = parseInt(e.target.dataset.value);
            const currentVal = parseInt(document.getElementById(`note-${type}-rating`).value || 0);
            if (val > currentVal) {
                document.getElementById(`note-${type}-rating`).value = val;
                updateStarsVisual(container, val);
                if (type === 'red') throwHeart();
            }
        };
    });
}

function updateStarsVisual(container, value) {
    container.querySelectorAll('span').forEach(s => { s.classList.toggle('selected', parseInt(s.dataset.value) <= value); });
}

function renderRatingDisplay(container, type, value, dateKey) {
    container.innerHTML = '';
    const emoji = type === 'red' ? '❤️' : '🖤';
    for (let i = 1; i <= 5; i++) {
        const span = document.createElement('span');
        span.innerText = emoji;
        span.style.opacity = i <= value ? '1' : '0.2';
        span.style.fontSize = '1.8rem';
        if (i > value) span.onclick = () => markNoteHeart(dateKey, type, i);
        container.appendChild(span);
    }
}

async function markNoteHeart(dateKey, type, newValue) {
    const data = await dbGet(STORE_DATA, `note-${dateKey}`, {});
    const currentVal = type === 'red' ? (data.redRating || 0) : (data.blackRating || 0);
    if (newValue > currentVal) {
        if (type === 'red') { data.redRating = newValue; throwHeart(); } else { data.blackRating = newValue; }
        await dbSet(STORE_DATA, `note-${dateKey}`, data);
        renderGallery(); // Refrescar si es necesario
        initCalendar();
    }
}

initRatings();

async function openNote(day, dateKey) {
    selectedDateKey = dateKey;
    const modalDate = document.getElementById('modal-date');
    if (modalDate) modalDate.innerText = `Día ${day}`;
    const data = await dbGet(STORE_DATA, `note-${dateKey}`, {});
    const viewImg = document.getElementById('view-img');
    const viewMsg = document.getElementById('view-msg');
    const redRatingView = document.getElementById('view-red-rating');
    const blackRatingView = document.getElementById('view-black-rating');
    
    if (viewImg) { viewImg.src = data.photo || ""; viewImg.style.display = data.photo ? 'block' : 'none'; }
    if (viewMsg) viewMsg.innerText = data.message || (isAdmin ? "Escribe algo..." : "Sin detalles.");
    if (redRatingView) renderRatingDisplay(redRatingView, 'red', data.redRating || 0, dateKey);
    if (blackRatingView) renderRatingDisplay(blackRatingView, 'black', data.blackRating || 0, dateKey);

    if (isAdmin) {
        if (notePhotoUrlInput) notePhotoUrlInput.value = data.photo || "";
        if (noteMessageInput) noteMessageInput.value = data.message || "";
        document.getElementById('note-red-rating').value = data.redRating || 0;
        document.getElementById('note-black-rating').value = data.blackRating || 0;
        updateStarsVisual(document.querySelector('.red-stars'), data.redRating || 0);
        updateStarsVisual(document.querySelector('.black-stars'), data.blackRating || 0);
    }
    if (noteModal) noteModal.classList.remove('hidden');
    checkAdminUI();
}

if (btnSaveNote) {
    btnSaveNote.addEventListener('click', async () => {
        if (!isAdmin) return; 
        const data = { 
            photo: notePhotoUrlInput.value, 
            message: noteMessageInput.value,
            redRating: document.getElementById('note-red-rating').value,
            blackRating: document.getElementById('note-black-rating').value
        };
        await dbSet(STORE_DATA, `note-${selectedDateKey}`, data);
        noteModal.classList.add('hidden');
        initCalendar();
    });
}
if (btnCloseModal) btnCloseModal.onclick = () => noteModal.classList.add('hidden');

// --- CORAZONES Y STICKERS ---
function initHearts() {
    if (!redHeartsGrid || !blackHeartsGrid) return;
    const redState = JSON.parse(localStorage.getItem('red-hearts-state') || '[]');
    const blackState = JSON.parse(localStorage.getItem('black-hearts-state') || '[]');
    renderHearts(redHeartsGrid, 'red', redState);
    renderHearts(blackHeartsGrid, 'black', blackState);
}

function renderHearts(container, type, state) {
    container.innerHTML = '';
    for (let i = 0; i < 40; i++) {
        const heart = document.createElement('div');
        heart.className = `heart-item ${state.includes(i) ? 'marked' : 'unmarked'}`;
        heart.innerHTML = type === 'red' ? '❤️' : '🖤';
        heart.onclick = () => {
            if (state.includes(i)) return;
            state.push(i); heart.className = 'heart-item marked';
            if (type === 'red') throwHeart(); 
            localStorage.setItem(`${type}-hearts-state`, JSON.stringify(state));
        };
        container.appendChild(heart);
    }
}

function throwHeart() {
    const h = document.createElement('div');
    h.className = 'thrown-heart'; h.innerText = '❤️'; document.body.appendChild(h);
    h.style.left = Math.random() * window.innerWidth + 'px';
    h.style.top = (Math.random() > 0.5 ? -50 : window.innerHeight + 50) + 'px';
    setTimeout(() => { h.style.left = '50%'; h.style.top = '50%'; h.style.opacity = '0'; }, 100);
    setTimeout(() => h.remove(), 1200);
}

function initStickers() {
    if (!stickersContainer) return;
    stickersContainer.innerHTML = '<div class="sticker-instruction" id="sticker-instruction">Haz doble clic para un mensaje ✨</div>';
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
    const div = document.createElement('div');
    div.className = `sticker ${data.color}`; div.style.left = data.x+'px'; div.style.top = data.y+'px'; div.innerText = data.text;
    const del = document.createElement('button'); del.className = 'delete-sticker hidden'; del.innerHTML = '×';
    del.onclick = (e) => { e.stopPropagation(); if (!isAdmin) return; stickers.splice(index, 1); localStorage.setItem('stickers', JSON.stringify(stickers)); initStickers(); };
    div.appendChild(del);
    let isDrag = false, ox, oy;
    div.onmousedown = (e) => { if(e.target===del) return; isDrag=true; ox=e.clientX-div.offsetLeft; oy=e.clientY-div.offsetTop; div.style.zIndex=1000; };
    window.onmousemove = (e) => { if(isDrag) { data.x=e.clientX-ox; data.y=e.clientY-oy; div.style.left=data.x+'px'; div.style.top=data.y+'px'; } };
    window.onmouseup = () => { if(isDrag) { isDrag=false; div.style.zIndex=10; localStorage.setItem('stickers', JSON.stringify(stickers)); } };
    stickersContainer.appendChild(div);
}

// --- GALERÍA (INDEXEDDB V2) ---
function initGallery() {
    const gZone = document.getElementById('gallery-drop-zone');
    const gFile = document.getElementById('gallery-file-input');
    const gUrl = document.getElementById('gallery-photo-url');
    const gSave = document.getElementById('btn-save-gallery-photo');
    const lb = document.getElementById('lightbox'), lbi = document.getElementById('lightbox-img'), lbc = document.getElementById('close-lightbox');

    if (document.getElementById('gallery-grid')) renderGallery();
    if (gZone && gFile) { gZone.onclick = () => gFile.click(); gFile.onchange = (e) => { if(e.target.files[0]) handleFile(e.target.files[0], gZone, gUrl); }; }
    if (gSave) {
        gSave.onclick = async () => {
            const b64 = gUrl.value; if (!b64) return alert("Selecciona foto ✨");
            await dbAddPhoto({ id: Date.now(), url: b64 });
            alert("¡Guardada! ❤️");
            gUrl.value = ""; const img = gZone.querySelector('img'); if(img) img.remove();
            gZone.querySelector('p').style.display = "block"; gSave.classList.add('hidden');
            renderGallery(); throwHeart();
        };
    }
    if (lbc) lbc.onclick = () => lb.classList.add('hidden');
    if (lb) lb.onclick = (e) => { if(e.target===lb) lb.classList.add('hidden'); };
}

async function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    const lb = document.getElementById('lightbox'), lbi = document.getElementById('lightbox-img');
    if (!grid) return;
    const photos = await dbGetAllPhotos();
    grid.innerHTML = photos.length ? '' : '<p style="grid-column: 1/-1; opacity: 0.5; text-align: center;">Álbum vacío. ✨</p>';
    photos.forEach(p => {
        const item = document.createElement('div'); item.className = 'gallery-item';
        item.onclick = () => { lbi.src = p.url; lb.classList.remove('hidden'); };
        const img = document.createElement('img'); img.src = p.url;
        const del = document.createElement('button'); del.className = 'delete-photo hidden'; del.innerHTML = '×';
        del.onclick = async (e) => { e.stopPropagation(); if(!isAdmin) return; if(confirm("¿Borrar?")) { await dbDeletePhoto(p.id); renderGallery(); } };
        item.appendChild(img); item.appendChild(del); grid.appendChild(item);
    });
    checkAdminUI();
}
