// --- CONFIGURACIÓN Y ESTADO ---
const MASTER_KEY = "14042024";
let isAdmin = sessionStorage.getItem('isAdmin') === 'true';

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyCD3qf8CIThV2yij5c7lqSVuGQqP2mrbxc",
    authDomain: "parati2-17ef5.firebaseapp.com",
    databaseURL: "https://parati2-17ef5-default-rtdb.firebaseio.com",
    projectId: "parati2-17ef5",
    storageBucket: "parati2-17ef5.firebasestorage.app",
    messagingSenderId: "781643198877",
    appId: "1:781643198877:web:655abe44a00e4a3daf7f74"
};

// Verificar si la configuración es válida
const isFirebaseConfigured = firebaseConfig.apiKey !== "TU_API_KEY";
let database = null;

if (isFirebaseConfigured) {
    try {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
    } catch (e) {
        console.error("Error al inicializar Firebase:", e);
    }
} else {
    console.warn("Firebase no está configurado. Los cambios solo serán locales.");
}

// --- ELEMENTOS COMUNES ---
const adminTrigger = document.getElementById('admin-trigger');
const mobileMenu = document.getElementById('mobile-menu');
const navLinks = document.querySelector('.nav-links');

// Lógica de Menú Responsive
if (mobileMenu) {
    mobileMenu.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
}

// --- FUNCIONES DE BASE DE DATOS ---
let localDB = JSON.parse(localStorage.getItem('para-ti-vdb') || '{}');

function saveVDB() {
    localStorage.setItem('para-ti-vdb', JSON.stringify(localDB));
}

function getByPath(obj, path) {
    return path.split('/').reduce((prev, curr) => prev && prev[curr], obj);
}

function setByPath(obj, path, value) {
    const parts = path.split('/');
    const last = parts.pop();
    const target = parts.reduce((prev, curr) => {
        if (!prev[curr]) prev[curr] = {};
        return prev[curr];
    }, obj);
    target[last] = value;
}

async function fbGet(path, defaultValue = null) {
    if (database) {
        try {
            const snapshot = await database.ref(path).once('value');
            if (snapshot.exists()) {
                const val = snapshot.val();
                setByPath(localDB, path, val);
                saveVDB();
                return val;
            }
        } catch (e) { console.error("Error Firebase Get:", e); }
    }
    const localVal = getByPath(localDB, path);
    return localVal !== undefined ? localVal : defaultValue;
}

async function fbSet(path, value) {
    setByPath(localDB, path, value);
    saveVDB();
    if (database) {
        try {
            await database.ref(path).set(value);
        } catch (e) { console.error("Error Firebase Set:", e); }
    }
}

function fbOn(path, callback) {
    if (database) {
        database.ref(path).on('value', (snapshot) => {
            const val = snapshot.val();
            if (val !== null) {
                setByPath(localDB, path, val);
                saveVDB();
                callback(val);
            }
        });
    } else {
        const val = getByPath(localDB, path);
        if (val !== undefined) callback(val);
    }
}

// --- ELEMENTOS UI ---
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
const redHeartsGrid = document.getElementById('red-hearts-grid');
const blackHeartsGrid = document.getElementById('black-hearts-grid');
const stickersContainer = document.getElementById('stickers-container');

let currentViewDate = new Date();
let selectedDateKey = "";
let stickers = [];

// --- INICIALIZACIÓN ---
window.addEventListener('DOMContentLoaded', async () => {
    logVisit(); 
    checkAdminUI();
    
    if (calendarGrid) {
        renderCalendarStructure();
        updateCalendarWithData(); 
    }
    loadLetter();
    if (redHeartsGrid || blackHeartsGrid) initHearts();
    if (stickersContainer) initStickers();
    if (document.getElementById('gallery-grid')) initGallery();

    if (isFirebaseConfigured) {
        await updateCalendarWithData(); 
    }
});

function logVisit() {
    if (!database) return;
    try {
        const logData = { date: new Date().toLocaleString(), ua: navigator.userAgent };
        database.ref('visit-logs').push(logData);
    } catch(e) {}
}

function checkAdminUI() {
    const elms = document.querySelectorAll('.letter-actions, .note-inputs, #btn-save-note, .delete-sticker, #sticker-instruction, #nav-logs-container, .delete-photo');
    elms.forEach(el => isAdmin ? el.classList.remove('hidden') : el.classList.add('hidden'));
    if (editableLetter) editableLetter.contentEditable = isAdmin;
    
    if (isAdmin) {
        const btnLogs = document.getElementById('btn-show-logs');
        if (btnLogs) btnLogs.onclick = (e) => { e.preventDefault(); toggleAdminView(true); };
    }
}

async function toggleAdminView(show) {
    const main = document.getElementById('main-content');
    let logsContainer = document.getElementById('admin-logs-view');
    
    if (show) {
        if (!logsContainer && homePage) {
            logsContainer = document.createElement('div');
            logsContainer.id = 'admin-logs-view';
            logsContainer.className = 'hidden';
            homePage.appendChild(logsContainer);
        }
        
        const logsObj = await fbGet('visit-logs', {});
        const logs = Object.values(logsObj || {}).reverse().slice(0, 30);

        let html = `<div class="admin-page-header"><button id="btn-back-home" class="btn btn-secondary">← Volver</button><h2 class="dancing-title">Logs</h2></div>
                    <div class="logs-card">
                        <div class="logs-table-wrapper">
                            <table><thead><tr><th>Fecha</th><th>Disp</th></tr></thead><tbody>`;
        logs.forEach(log => { html += `<tr><td>${log.date}</td><td class="ua-text">${log.ua}</td></tr>`; });
        html += `</tbody></table>
                        </div>
                        <button class="btn btn-primary" onclick="if(confirm('¿Seguro?')){ if(database) database.ref('/').remove(); localStorage.clear(); location.reload();}" style="margin-top:20px">Resetear Todo</button>
                    </div>`;
        logsContainer.innerHTML = html;
        document.getElementById('btn-back-home').onclick = () => toggleAdminView(false);
        
        if(main) main.classList.add('hidden');
        if(logsContainer) logsContainer.classList.remove('hidden');
    } else {
        if(main) main.classList.remove('hidden');
        if(logsContainer) logsContainer.classList.add('hidden');
    }
}

if (adminTrigger) {
    adminTrigger.addEventListener('dblclick', () => {
        if (isAdmin) {
            if(confirm("¿Cerrar modo admin?")) {
                isAdmin = false;
                sessionStorage.removeItem('isAdmin');
                location.reload();
            }
            return;
        }
        const pass = prompt("Llave:");
        if (pass === MASTER_KEY) {
            isAdmin = true;
            sessionStorage.setItem('isAdmin', 'true');
            alert("Modo admin ❤️");
            checkAdminUI();
            if (calendarGrid) renderCalendarStructure();
        }
    });
}

async function loadLetter() {
    if (!editableLetter) return;
    const defaultText = "Hay personas que hacen que el mundo sea un lugar mejor...";
    const s = await fbGet('romantic-letter', defaultText);
    editableLetter.innerHTML = s;
}

if (btnEdit && btnSave) {
    btnEdit.onclick = () => { editableLetter.focus(); btnEdit.classList.add('hidden'); btnSave.classList.remove('hidden'); };
    btnSave.onclick = async () => { 
        await fbSet('romantic-letter', editableLetter.innerHTML); 
        btnEdit.classList.remove('hidden'); btnSave.classList.add('hidden'); 
        alert("Guardado correctamente ❤️"); 
    };
}

// --- CALENDARIO ---
function renderCalendarStructure() {
    if (!calendarGrid) return;
    const year = currentViewDate.getFullYear(), month = currentViewDate.getMonth();
    const now = new Date(), today = now.getDate();
    const isCurrent = (now.getFullYear() === year && now.getMonth() === month);
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    document.getElementById('current-month-year').innerText = `${months[month]} ${year}`;
    const fragment = document.createDocumentFragment();
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(d => { 
        const dv = document.createElement('div'); dv.className = 'calendar-day-head'; dv.innerText = d; fragment.appendChild(dv); 
    });
    const first = new Date(year, month, 1).getDay();
    let offset = first === 0 ? 6 : first - 1;
    for (let i = 0; i < offset; i++) { 
        const dv = document.createElement('div'); dv.className = 'calendar-day empty'; fragment.appendChild(dv); 
    }
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const dv = document.createElement('div'); 
        dv.className = 'calendar-day';
        dv.id = `day-${year}-${month+1}-${d}`;
        if (isCurrent && d === today) dv.classList.add('today');
        dv.innerText = d; 
        dv.onclick = () => openNote(d, `${year}-${month+1}-${d}`);
        fragment.appendChild(dv);
    }
    calendarGrid.innerHTML = '';
    calendarGrid.appendChild(fragment);
    if (daysCountDisplay) daysCountDisplay.innerText = Math.floor((now - new Date('2023-12-22'))/86400000);
    
    prevMonthBtn.onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth()-1); renderCalendarStructure(); updateCalendarWithData(); };
    nextMonthBtn.onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth()+1); renderCalendarStructure(); updateCalendarWithData(); };
}

async function updateCalendarWithData() {
    if (!calendarGrid) return;
    const allNotes = await fbGet('calendar-notes', {});
    document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('has-note'));
    Object.keys(allNotes).forEach(key => {
        const dayKey = key.replace('note-', '');
        const dayEl = document.getElementById(`day-${dayKey}`);
        if (dayEl) dayEl.classList.add('has-note');
    });
}

async function openNote(day, key) {
    selectedDateKey = key;
    document.getElementById('modal-date').innerText = `Día ${day}`;
    const vImg = document.getElementById('view-img'), vMsg = document.getElementById('view-msg');
    vImg.src = ""; vImg.style.display = 'none';
    vMsg.innerText = "Cargando...";
    const data = await fbGet(`calendar-notes/note-${key}`, {});
    vImg.src = data.photo || ""; vImg.style.display = data.photo ? 'block' : 'none';
    vMsg.innerText = data.message || (isAdmin ? "Escribe algo..." : "Sin detalles aún.");
    
    renderRatingDisplay(document.getElementById('view-red-rating'), 'red', data.redRating || 0, key);
    renderRatingDisplay(document.getElementById('view-black-rating'), 'black', data.blackRating || 0, key);
    
    if (isAdmin) {
        notePhotoUrlInput.value = data.photo || ""; 
        noteMessageInput.value = data.message || "";
        document.getElementById('note-red-rating').value = data.redRating || 0;
        document.getElementById('note-black-rating').value = data.blackRating || 0;
        updateStarsVisual(document.querySelector('.red-stars'), data.redRating || 0);
        updateStarsVisual(document.querySelector('.black-stars'), data.blackRating || 0);
    }
    noteModal.classList.remove('hidden');
    checkAdminUI();
}

function updateStarsVisual(container, val) {
    if (!container) return;
    container.querySelectorAll('span').forEach(s => {
        s.style.opacity = parseInt(s.dataset.value) <= val ? '1' : '0.3';
    });
}

function renderRatingDisplay(container, type, val, key) {
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const s = document.createElement('span'); 
        s.innerText = type === 'red' ? '❤️' : '🖤';
        s.style.opacity = i <= val ? '1' : '0.2'; 
        s.style.fontSize = '1.8rem';
        s.style.cursor = isAdmin ? 'pointer' : 'default';
        s.onclick = async () => {
            if (isAdmin) {
                document.getElementById(`note-${type}-rating`).value = i;
                updateStarsVisual(document.querySelector(`.${type}-stars`), i);
                renderRatingDisplay(container, type, i, key);
            }
        };
        container.appendChild(s);
    }
}

if (btnSaveNote) {
    btnSaveNote.onclick = async () => {
        if (!isAdmin) return;
        btnSaveNote.innerText = "Guardando...";
        btnSaveNote.disabled = true;
        const data = { 
            photo: notePhotoUrlInput.value, 
            message: noteMessageInput.value, 
            redRating: parseInt(document.getElementById('note-red-rating').value) || 0, 
            blackRating: parseInt(document.getElementById('note-black-rating').value) || 0 
        };
        await fbSet(`calendar-notes/note-${selectedDateKey}`, data); 
        btnSaveNote.innerText = "Guardar Detalle";
        btnSaveNote.disabled = false;
        noteModal.classList.add('hidden'); 
        updateCalendarWithData();
        alert("¡Guardado correctamente! ❤️");
    };
}
if (btnCloseModal) btnCloseModal.onclick = () => noteModal.classList.add('hidden');

// --- COMPRESIÓN ---
function compressImage(file, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX = 800;
            let w = img.width, h = img.height;
            if (w > h) { if(w > MAX) { h *= MAX/w; w = MAX; } } else { if(h > MAX) { w *= MAX/h; h = MAX; } }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', 0.6));
        };
    };
}

// --- CORAZONES Y STICKERS ---
async function initHearts() {
    if (!redHeartsGrid) return;
    const rState = await fbGet('red-hearts', []);
    const bState = await fbGet('black-hearts', []);
    renderHearts(redHeartsGrid, 'red', rState); 
    renderHearts(blackHeartsGrid, 'black', bState);
}

function renderHearts(container, type, state) {
    container.innerHTML = '';
    const stateArr = Array.isArray(state) ? state : Object.values(state || {});
    for (let i = 0; i < 40; i++) {
        const h = document.createElement('div'); 
        h.className = `heart-item ${stateArr.includes(i) ? 'marked' : 'unmarked'}`;
        h.innerHTML = type === 'red' ? '❤️' : '🖤';
        h.onclick = async () => {
            if (stateArr.includes(i)) return; 
            stateArr.push(i); 
            h.className = 'heart-item marked';
            if (type === 'red') throwHeart(); 
            await fbSet(`${type}-hearts`, stateArr);
        };
        container.appendChild(h);
    }
}

function throwHeart() {
    const h = document.createElement('div'); h.className = 'thrown-heart'; h.innerText = '❤️'; document.body.appendChild(h);
    h.style.left = Math.random()*window.innerWidth+'px'; h.style.top = (Math.random()>0.5?-50:window.innerHeight+50)+'px';
    setTimeout(() => { h.style.left='50%'; h.style.top='50%'; h.style.opacity='0'; }, 100); setTimeout(() => h.remove(), 1200);
}

async function initStickers() {
    if (!stickersContainer) return;
    fbOn('stickers', (data) => {
        stickers = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
        renderStickersList();
    });
    stickersContainer.ondblclick = async (e) => {
        if (e.target !== stickersContainer) return;
        const text = prompt("Mensaje:");
        if (text) {
            const s = { text, x: e.clientX-100, y: e.clientY-75, color: ['','pink','blue','green'][Math.floor(Math.random()*4)] };
            stickers.push(s); 
            await fbSet('stickers', stickers);
        }
    };
}

function renderStickersList() {
    const instr = document.getElementById('sticker-instruction');
    stickersContainer.innerHTML = '';
    if (instr) stickersContainer.appendChild(instr);
    stickers.forEach((s, i) => {
        const div = document.createElement('div'); div.className = `sticker ${s.color}`; div.style.left = s.x+'px'; div.style.top = s.y+'px'; div.innerText = s.text;
        const del = document.createElement('button'); del.className = 'delete-sticker hidden'; del.innerHTML = '×';
        del.onclick = async (e) => { e.stopPropagation(); if (!isAdmin) return; stickers.splice(i, 1); await fbSet('stickers', stickers); };
        div.appendChild(del);
        let isDrag = false, ox, oy;
        div.onmousedown = (e) => { if(e.target===del) return; isDrag=true; ox=e.clientX-div.offsetLeft; oy=e.clientY-div.offsetTop; div.style.zIndex=1000; };
        window.onmousemove = (e) => { if(isDrag) { s.x=e.clientX-ox; s.y=e.clientY-oy; div.style.left=s.x+'px'; div.style.top=s.y+'px'; } };
        window.onmouseup = async () => { if(isDrag) { isDrag=false; div.style.zIndex=10; await fbSet('stickers', stickers); } };
        stickersContainer.appendChild(div);
    });
    checkAdminUI();
}

// --- GALERÍA ---
async function initGallery() {
    const gZone = document.getElementById('gallery-drop-zone'), gFile = document.getElementById('gallery-file-input');
    const lb = document.getElementById('lightbox'), lbc = document.getElementById('close-lightbox');
    if (lb) lbc.onclick = () => lb.classList.add('hidden');
    if (gZone) gZone.onclick = () => gFile.click();
    
    fbOn('gallery', () => renderGallery());

    if (gFile) {
        gFile.onchange = async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;
            const p = gZone.querySelector('p');
            let uploadedCount = 0;
            for (const file of files) {
                p.innerText = `Subiendo ${uploadedCount + 1}/${files.length}...`;
                try {
                    const b64 = await new Promise((resolve) => compressImage(file, resolve));
                    if (database) {
                        await database.ref('gallery').push({ id: Date.now(), url: b64 });
                    }
                    uploadedCount++;
                } catch (err) { console.error("Error subiendo foto:", err); }
            }
            p.innerText = "¡Listo! ✨ Haz clic para subir más";
            setTimeout(() => { p.innerText = "Haz clic para subir una nueva foto ✨"; }, 3000);
            gFile.value = "";
        };
    }
}

async function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    const photosObj = await fbGet('gallery', {});
    const photos = Object.entries(photosObj || {}).map(([key, val]) => ({ ...val, fbKey: key })).reverse();
    grid.innerHTML = photos.length ? '' : '<p style="grid-column: 1/-1; opacity: 0.5; text-align: center;">Álbum vacío. ✨</p>';
    photos.forEach(p => {
        const item = document.createElement('div'); item.className = 'gallery-item';
        item.onclick = () => { document.getElementById('lightbox-img').src = p.url; document.getElementById('lightbox').classList.remove('hidden'); };
        const img = document.createElement('img'); img.src = p.url;
        const del = document.createElement('button'); del.className = 'delete-photo hidden'; del.innerHTML = '×';
        del.onclick = async (e) => { e.stopPropagation(); if(!isAdmin) return; if(confirm("¿Borrar?")) { if(database) await database.ref(`gallery/${p.fbKey}`).remove(); } };
        item.appendChild(img); item.appendChild(del); grid.appendChild(item);
    });
    checkAdminUI();
}
