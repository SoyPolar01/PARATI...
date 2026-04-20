// --- CONFIGURACIÓN Y ESTADO ---
const MASTER_KEY = "14042024";
let isAdmin = false; // El modo admin ahora empieza siempre en false (se pierde al recargar)

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

// --- INICIALIZACIÓN ---
window.addEventListener('DOMContentLoaded', () => {
    logVisit(); // Registrar la visita
    checkAdminUI();
    initCalendar();
    loadLetter();
    
    if (redHeartsGrid || blackHeartsGrid) {
        initHearts();
    } else if (stickersContainer) {
        initStickers();
    }
    
    // Inicializar galería si estamos en esa página
    if (document.getElementById('gallery-grid')) {
        initGallery();
    }
});

// --- SISTEMA DE AUDITORÍA (LOGS) ---
function logVisit() {
    const logs = JSON.parse(localStorage.getItem('visit-logs') || '[]');
    const newLog = {
        date: new Date().toLocaleString(),
        ua: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor
    };
    
    // Solo guardar los últimos 50 registros para no llenar el storage
    logs.unshift(newLog);
    if (logs.length > 50) logs.pop();
    
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
            <h2 class="dancing-title">Historial de Visitas</h2>
        </div>
        <div class="logs-card">
            <div class="logs-table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha y Hora</th>
                            <th>Dispositivo / Navegador</th>
                        </tr>
                    </thead>
                    <tbody>`;
    
    logs.forEach(log => {
        html += `<tr>
            <td>${log.date}</td>
            <td class="ua-text">${log.ua}</td>
        </tr>`;
    });
    
    html += `</tbody></table></div>
        <button class="btn btn-primary" onclick="localStorage.removeItem('visit-logs'); location.reload();" style="margin-top: 20px;">Limpiar Historial</button>
    </div>`;
    
    logsContainer.innerHTML = html;

    // Eventos de la vista de logs
    const btnBack = document.getElementById('btn-back-home');
    if (btnBack) btnBack.onclick = () => toggleAdminView(false);
}

function toggleAdminView(showLogs) {
    const mainContent = document.getElementById('main-content');
    const adminView = document.getElementById('admin-logs-view');
    
    if (showLogs) {
        if (mainContent) mainContent.classList.add('hidden');
        if (adminView) {
            adminView.classList.remove('hidden');
            renderAdminLogs();
        }
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
            alert("Modo administrador activado (se desactivará al recargar) ❤️");
            checkAdminUI();
            if (calendarGrid) initCalendar();
            if (redHeartsGrid || blackHeartsGrid) initHearts();
            if (editableLetter) loadLetter(); 
            if (stickersContainer) initStickers();
            
            const btnShowLogs = document.getElementById('btn-show-logs');
            if (btnShowLogs) btnShowLogs.onclick = (e) => {
                e.preventDefault();
                toggleAdminView(true);
            };
        } else {
            alert("Llave incorrecta.");
        }
    });
}

function checkAdminUI() {
    // Mostrar/ocultar elementos de admin
    const adminElements = document.querySelectorAll('.letter-actions, .note-inputs, #btn-save-note, .delete-sticker, #sticker-instruction, #nav-logs-container, .delete-photo, #gallery-upload-area, #btn-save-gallery-photo');
    adminElements.forEach(el => {
        isAdmin ? el.classList.remove('hidden') : el.classList.add('hidden');
    });
    
    if (editableLetter) {
        editableLetter.contentEditable = isAdmin ? "true" : "false";
    }

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
function initCalendar() {
    if (!calendarGrid) return;
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const now = new Date();
    const today = now.getDate();
    const isCurrentMonth = (now.getFullYear() === year && now.getMonth() === month);

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const monthYearHeader = document.getElementById('current-month-year');
    if (monthYearHeader) {
        monthYearHeader.innerText = `${monthNames[month]} ${year}`;
    }

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
        if (localStorage.getItem(`note-${dateKey}`)) div.classList.add('has-note');
        
        div.innerText = d;
        div.onclick = () => openNote(d, dateKey);
        calendarGrid.appendChild(div);
    }

    if (daysCountDisplay) {
        const startDate = new Date('2023-12-22');
        daysCountDisplay.innerText = Math.floor((now - startDate) / (86400000));
    }
}

// --- SUBIDA DE ARCHIVOS (CALENDARIO) ---
if (dropZone && fileInput) {
    dropZone.onclick = () => { if(isAdmin) fileInput.click(); };
    dropZone.ondragover = (e) => { e.preventDefault(); if(isAdmin) dropZone.classList.add('dragover'); };
    dropZone.ondragleave = () => dropZone.classList.remove('dragover');
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if(isAdmin && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], dropZone, notePhotoUrlInput);
    };
    fileInput.onchange = (e) => {
        if(e.target.files[0]) handleFile(e.target.files[0], dropZone, notePhotoUrlInput);
    };
}

function handleFile(file, zone, targetInput) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const b64 = e.target.result;
        if (targetInput) targetInput.value = b64;
        const previewImg = zone.querySelector('img') || document.createElement('img');
        previewImg.src = b64;
        previewImg.style.maxHeight = "100px";
        previewImg.style.borderRadius = "10px";
        previewImg.style.margin = "0 auto";
        const infoText = zone.querySelector('p');
        if (infoText) infoText.style.display = "none";
        if (!zone.querySelector('img')) zone.appendChild(previewImg);
    };
    reader.readAsDataURL(file);
}

// --- CALIFICACIONES (CORAZONES) ---
function initRatings() {
    document.querySelectorAll('.star-rating span').forEach(star => {
        star.onclick = (e) => {
            if (!isAdmin) return;
            const container = e.target.parentElement;
            const type = container.dataset.type;
            const val = parseInt(e.target.dataset.value);
            const currentVal = parseInt(document.getElementById(`note-${type}-rating`).value || 0);
            
            // Solo permitir aumentar el valor
            if (val > currentVal) {
                document.getElementById(`note-${type}-rating`).value = val;
                updateStarsVisual(container, val);
                if (type === 'red') throwHeart();
            } else if (val < currentVal) {
                alert("¡Estos corazones no se pueden quitar! ❤️");
            }
        };
    });
}

function updateStarsVisual(container, value) {
    container.querySelectorAll('span').forEach(s => {
        s.classList.toggle('selected', parseInt(s.dataset.value) <= parseInt(value));
    });
}

function renderRatingDisplay(container, type, value, dateKey) {
    container.innerHTML = '';
    const emoji = type === 'red' ? '❤️' : '🖤';
    for (let i = 1; i <= 5; i++) {
        const span = document.createElement('span');
        span.innerText = emoji;
        span.style.opacity = i <= value ? '1' : '0.2';
        span.style.fontSize = '1.8rem';
        span.style.cursor = i <= value ? 'default' : 'pointer';
        span.style.transition = 'transform 0.2s';
        
        if (i > value) {
            span.onclick = () => markNoteHeart(dateKey, type, i);
            span.onmouseover = () => span.style.transform = 'scale(1.2)';
            span.onmouseout = () => span.style.transform = 'scale(1)';
        }
        
        container.appendChild(span);
    }
}

function markNoteHeart(dateKey, type, newValue) {
    const data = JSON.parse(localStorage.getItem(`note-${dateKey}`) || '{}');
    const currentVal = type === 'red' ? (data.redRating || 0) : (data.blackRating || 0);
    
    if (newValue > currentVal) {
        if (type === 'red') {
            data.redRating = newValue;
            throwHeart();
        } else {
            data.blackRating = newValue;
        }
        
        localStorage.setItem(`note-${dateKey}`, JSON.stringify(data));
        
        // Actualizar visualización en tiempo real
        const viewContainer = document.getElementById(`view-${type}-rating`);
        if (viewContainer) renderRatingDisplay(viewContainer, type, newValue, dateKey);
        
        // Si el admin está editando, actualizar sus inputs ocultos
        const adminInput = document.getElementById(`note-${type}-rating`);
        if (adminInput) adminInput.value = newValue;
        const adminStars = document.querySelector(`.${type}-stars`);
        if (adminStars) updateStarsVisual(adminStars, newValue);
    }
}

initRatings();

function openNote(day, dateKey) {
    selectedDateKey = dateKey;
    const modalDate = document.getElementById('modal-date');
    if (modalDate) modalDate.innerText = `Detalle del día ${day}`;

    const data = JSON.parse(localStorage.getItem(`note-${dateKey}`) || '{}');
    const viewImg = document.getElementById('view-img');
    const viewMsg = document.getElementById('view-msg');
    const redRatingView = document.getElementById('view-red-rating');
    const blackRatingView = document.getElementById('view-black-rating');
    
    if (viewImg) {
        viewImg.src = data.photo || "";
        viewImg.style.display = data.photo ? 'block' : 'none';
    }
    if (viewMsg) {
        viewMsg.innerText = data.message || (isAdmin ? "No hay mensaje aún. ¡Escribe uno abajo!" : "No hay detalles para este día.");
    }

    if (redRatingView) renderRatingDisplay(redRatingView, 'red', data.redRating || 0, dateKey);
    if (blackRatingView) renderRatingDisplay(blackRatingView, 'black', data.blackRating || 0, dateKey);

    if (isAdmin) {
        if (notePhotoUrlInput) notePhotoUrlInput.value = data.photo || "";
        if (noteMessageInput) noteMessageInput.value = data.message || "";
        document.getElementById('note-red-rating').value = data.redRating || 0;
        document.getElementById('note-black-rating').value = data.blackRating || 0;
        updateStarsVisual(document.querySelector('.red-stars'), data.redRating || 0);
        updateStarsVisual(document.querySelector('.black-stars'), data.blackRating || 0);
        
        if (dropZone) {
            const oldImg = dropZone.querySelector('img');
            if (oldImg) oldImg.remove();
            const infoText = dropZone.querySelector('p');
            if (infoText) infoText.style.display = data.photo ? "none" : "block";
            if (data.photo) {
                const img = document.createElement('img');
                img.src = data.photo;
                img.style.maxHeight = "100px";
                img.style.borderRadius = "10px";
                img.style.margin = "0 auto";
                dropZone.appendChild(img);
            }
        }
    }
    
    if (noteModal) noteModal.classList.remove('hidden');
    checkAdminUI();
}

if (btnSaveNote) {
    btnSaveNote.addEventListener('click', () => {
        if (!isAdmin) return; 
        const data = { 
            photo: notePhotoUrlInput.value, 
            message: noteMessageInput.value,
            redRating: document.getElementById('note-red-rating').value,
            blackRating: document.getElementById('note-black-rating').value
        };
        localStorage.setItem(`note-${selectedDateKey}`, JSON.stringify(data));
        noteModal.classList.add('hidden');
        initCalendar();
    });
}

if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => noteModal.classList.add('hidden'));
}

// --- CORAZONES ---
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
        heart.onclick = () => toggleHeart(type, i, heart);
        container.appendChild(heart);
    }
}

function toggleHeart(type, index, element) {
    const key = `${type}-hearts-state`;
    let state = JSON.parse(localStorage.getItem(key) || '[]');
    if (state.includes(index)) return;
    state.push(index);
    element.classList.add('marked');
    element.classList.remove('unmarked');
    if (type === 'red') throwHeart(); 
    localStorage.setItem(key, JSON.stringify(state));
}

function throwHeart() {
    const h = document.createElement('div');
    h.className = 'thrown-heart';
    h.innerText = '❤️';
    document.body.appendChild(h);
    h.style.left = Math.random() * window.innerWidth + 'px';
    h.style.top = (Math.random() > 0.5 ? -50 : window.innerHeight + 50) + 'px';
    setTimeout(() => {
        h.style.left = '50%';
        h.style.top = '50%';
        h.style.opacity = '0';
    }, 100);
    setTimeout(() => h.remove(), 1200);
}

// --- LÓGICA DE STICKERS (PEGATINAS) ---
function initStickers() {
    if (!stickersContainer) return;
    stickersContainer.innerHTML = '<div class="sticker-instruction" id="sticker-instruction">Haz doble clic en cualquier lugar para añadir un mensaje ✨</div>';
    stickers = JSON.parse(localStorage.getItem('stickers') || '[]');
    stickers.forEach((sticker, index) => renderSticker(sticker, index));
    stickersContainer.ondblclick = (e) => {
        if (e.target !== stickersContainer) return;
        const text = prompt("Escribe tu mensaje:");
        if (text) {
            const colors = ['', 'pink', 'blue', 'green'];
            const newSticker = {
                text: text,
                x: e.clientX - 100,
                y: e.clientY - 75,
                color: colors[Math.floor(Math.random() * colors.length)]
            };
            stickers.push(newSticker);
            localStorage.setItem('stickers', JSON.stringify(stickers));
            renderSticker(newSticker, stickers.length - 1);
        }
    };
    checkAdminUI();
}

function renderSticker(data, index) {
    const div = document.createElement('div');
    div.className = `sticker ${data.color}`;
    div.style.left = data.x + 'px';
    div.style.top = data.y + 'px';
    div.innerText = data.text;
    
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-sticker hidden';
    delBtn.innerHTML = '×';
    delBtn.onclick = (e) => {
        e.stopPropagation();
        if (!isAdmin) return;
        stickers.splice(index, 1);
        localStorage.setItem('stickers', JSON.stringify(stickers));
        initStickers();
    };
    div.appendChild(delBtn);

    let isDragging = false;
    let offsetX, offsetY;

    div.onmousedown = (e) => {
        if (e.target === delBtn) return;
        isDragging = true;
        offsetX = e.clientX - div.offsetLeft;
        offsetY = e.clientY - div.offsetTop;
        div.style.zIndex = 1000;
    };

    window.onmousemove = (e) => {
        if (isDragging) {
            data.x = e.clientX - offsetX;
            data.y = e.clientY - offsetY;
            div.style.left = data.x + 'px';
            div.style.top = data.y + 'px';
        }
    };

    window.onmouseup = () => {
        if (isDragging) {
            isDragging = false;
            div.style.zIndex = 10;
            localStorage.setItem('stickers', JSON.stringify(stickers));
        }
    };
    stickersContainer.appendChild(div);
}

// --- COMPRESIÓN DE IMÁGENES ---
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
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Comprimir como JPEG con calidad 0.7
            const b64 = canvas.toDataURL('image/jpeg', 0.7);
            callback(b64);
        };
    };
}

// Sobrescribir handleFile para usar compresión
function handleFile(file, zone, targetInput) {
    compressImage(file, (b64) => {
        if (targetInput) targetInput.value = b64;
        const previewImg = zone.querySelector('img') || document.createElement('img');
        previewImg.src = b64;
        previewImg.style.maxHeight = "100px";
        previewImg.style.borderRadius = "10px";
        previewImg.style.margin = "0 auto";
        const infoText = zone.querySelector('p');
        if (infoText) infoText.style.display = "none";
        if (!zone.querySelector('img')) zone.appendChild(previewImg);
        
        // Si hay un botón de guardado específico para la galería, mostrarlo
        const btnSaveGallery = document.getElementById('btn-save-gallery-photo');
        if (btnSaveGallery) btnSaveGallery.classList.remove('hidden');
    });
}

// --- LÓGICA DE LA GALERÍA DE FOTOS ---
function initGallery() {
    const galleryGrid = document.getElementById('gallery-grid');
    const galleryDropZone = document.getElementById('gallery-drop-zone');
    const galleryFileInput = document.getElementById('gallery-file-input');
    const galleryPhotoUrlInput = document.getElementById('gallery-photo-url');
    const btnSaveGalleryPhoto = document.getElementById('btn-save-gallery-photo');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeLightbox = document.getElementById('close-lightbox');

    if (!galleryGrid) return;
    renderGallery();

    if (galleryDropZone && galleryFileInput) {
        galleryDropZone.onclick = () => { if(isAdmin) galleryFileInput.click(); };
        galleryFileInput.onchange = (e) => {
            if(e.target.files[0]) handleFile(e.target.files[0], galleryDropZone, galleryPhotoUrlInput);
        };
    }

    if (btnSaveGalleryPhoto) {
        btnSaveGalleryPhoto.onclick = () => {
            if (!isAdmin) return;
            const b64 = galleryPhotoUrlInput.value;
            if (!b64) return alert("Selecciona una foto primero ✨");
            
            const photos = JSON.parse(localStorage.getItem('album-photos') || '[]');
            photos.unshift({ id: Date.now(), url: b64 });
            
            try {
                localStorage.setItem('album-photos', JSON.stringify(photos));
                alert("Foto guardada en el álbum ❤️");
                
                // Limpiar zona de subida
                galleryPhotoUrlInput.value = "";
                const img = galleryDropZone.querySelector('img');
                if (img) img.remove();
                const p = galleryDropZone.querySelector('p');
                if (p) p.style.display = "block";
                btnSaveGalleryPhoto.classList.add('hidden');
                
                renderGallery();
                if (typeof throwHeart === 'function') throwHeart();
            } catch (e) {
                alert("No queda espacio en el navegador para más fotos. Borra algunas o usa fotos más pequeñas.");
            }
        };
    }

    if (closeLightbox) {
        closeLightbox.onclick = () => lightbox.classList.add('hidden');
    }
    if (lightbox) {
        lightbox.onclick = (e) => { if(e.target === lightbox) lightbox.classList.add('hidden'); };
    }
}

function renderGallery() {
    const galleryGrid = document.getElementById('gallery-grid');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    
    if (!galleryGrid) return;
    const photos = JSON.parse(localStorage.getItem('album-photos') || '[]');
    galleryGrid.innerHTML = '';

    if (photos.length === 0) {
        galleryGrid.innerHTML = '<p style="grid-column: 1/-1; opacity: 0.5; text-align: center;">El álbum está vacío. ¡Sube vuestra primera foto! ✨</p>';
    }

    photos.forEach(photo => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.onclick = () => {
            lightboxImg.src = photo.url;
            lightbox.classList.remove('hidden');
        };

        const img = document.createElement('img');
        img.src = photo.url;
        img.alt = "Foto de nosotros";
        
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-photo hidden';
        delBtn.innerHTML = '×';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (!isAdmin) return;
            if (confirm("¿Borrar esta foto del álbum?")) {
                const updatedPhotos = photos.filter(p => p.id !== photo.id);
                localStorage.setItem('album-photos', JSON.stringify(updatedPhotos));
                renderGallery();
            }
        };

        item.appendChild(img);
        item.appendChild(delBtn);
        galleryGrid.appendChild(item);
    });

    checkAdminUI();
}

