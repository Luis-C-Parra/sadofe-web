const CONFIG = {
    LOGIN_ENDPOINT: 'https://script.google.com/macros/s/AKfycbwBqfRagEUrSM9f9x1WvgLDKByfvfp-VPsDdUjuCNLKiUBcLO1Xb3pYlJ-qDxO_keFY3A/exec',
    DATA_ENDPOINT: 'https://script.google.com/macros/s/AKfycbznONc4J-i6p4yuEfW5hcR8hgnbotrqJZVCrMtACl1YS7sKP7vB2BA39lXBLYBSJ6uUxQ/exec',
    SHEET_ENDPOINT: 'https://script.google.com/macros/s/AKfycbxofTffrlRjyBdZ59WTXYIx1bMX76O9D338PxvN3UJKs5hRYfFyhPeI0FirJALR9fzM/exec',
    PISOS: {
        '1B': { desde: 101, hasta: 110, especiales: [110], camas: 3 },
        '2B': { desde: 201, hasta: 210, especiales: [210], camas: 3 },
        '4B': { desde: 402, hasta: 409, especiales: [], camas: 2 },
        '1C': { desde: 116, hasta: 129, especiales: [], camas: 2, sinCamas: [126] },
        '2C': { desde: 216, hasta: 229, especiales: [], camas: 2 },
        '3C': { desde: 316, hasta: 322, especiales: [], camas: 2 },
        '4C': { desde: 422, hasta: 429, especiales: [], camas: 2 }
    }
};

let userData = {
    nurseName: '',
    otherNurses: '',
    currentFloor: '',
    floorNotes: '',
    camasData: {}
};

let dataPorPiso = {};
let camasParaNovedades = new Set();
let paseOrigen = { piso: '', camaId: '' };
let altaOrigen = { piso: '', camaId: '' };

document.addEventListener('DOMContentLoaded', function() {
    try {
        setupEventListeners();
        configurarLimiteFechas();
        initServiceWorker();
    } catch (e) {
        console.error('Error durante la inicialización:', e);
    } finally {
        showSplashScreen();
    }
});

// Configura el selector de fecha para que solo permita elegir desde hoy hacia atrás
function configurarLimiteFechas() {
    const fechaInput = document.getElementById('fechaSelect');
    if (fechaInput) {
        const hoy = obtenerFechaLocal();
        fechaInput.max = hoy; // Bloquea fechas futuras
        fechaInput.value = hoy; // Se posiciona automáticamente en la fecha actual
    }
}

function showSplashScreen() {
    const splash = document.getElementById('splashScreen');
    const loginScreen = document.getElementById('loginScreen');
    const mainApp = document.getElementById('mainApp');

    if (splash) splash.style.display = 'flex';
    if (loginScreen) loginScreen.style.display = 'none';
    if (mainApp) mainApp.style.display = 'none';

    setTimeout(() => {
        if (splash) {
            splash.classList.add('fade-out');
            setTimeout(() => {
                splash.style.display = 'none';
                if (loginScreen) loginScreen.style.display = 'flex';
            }, 500);
        }
    }, 2000);
}

function setupEventListeners() {
    const dniInput = document.getElementById('dniInput');
    if (dniInput) {
        dniInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') login();
        });
    }

    const notasPiso = document.getElementById('notasPiso');
    if (notasPiso) {
        notasPiso.addEventListener('input', () => {
            if (userData.currentFloor) {
                dataPorPiso[userData.currentFloor] = dataPorPiso[userData.currentFloor] || {};
                dataPorPiso[userData.currentFloor].floorNotes = notasPiso.value;
            }
        });
    }
}

async function login() {
    const dniInput = document.getElementById('dniInput');
    const dni = dniInput ? dniInput.value.trim() : '';
    if (!dni) {
        alert('Ingrese un DNI válido');
        return;
    }
    
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) loadingMessage.style.display = 'block';
    
    try {
        const res = await fetch(`${CONFIG.LOGIN_ENDPOINT}?dni=${dni}`);
        const data = await res.json();
        
        if (data.valido) {
            userData.nurseName = data.nombre.toUpperCase();
            
            if (loadingMessage) loadingMessage.style.display = 'none';
            
            const stepDni = document.getElementById('stepDni');
            if (stepDni) stepDni.style.display = 'none';
            
            const welcomeMsg = document.getElementById('welcomeMessage');
            if (welcomeMsg) welcomeMsg.innerText = `👋 ¡HOLA, ${userData.nurseName}!`;
            
            const otherNursesSec = document.getElementById('otherNursesSection');
            if (otherNursesSec) otherNursesSec.style.display = 'block';
        } else {
            throw new Error('No autorizado');
        }
    } catch (err) {
        if (loadingMessage) loadingMessage.style.display = 'none';
        alert('Error: DNI no válido o sin acceso.');
    }
}

function solicitarAccesoPorWhatsApp() {
    const nombre = prompt("📝 Para solicitar acceso, ingresa tu nombre completo:");
    if (!nombre) return;
    const dni = prompt("🔢 Ahora ingresa tu DNI:");
    if (!dni) return;
    const numeroWhatsApp = '5491124076812';
    const mensaje = `Hola, soy ${nombre.trim()} (DNI: ${dni.trim()}). Quiero solicitar acceso al sistema SADOFE.`;
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

function completeLogin() {
    const otherNurses = document.getElementById('otherNurses');
    userData.otherNurses = otherNurses ? otherNurses.value.trim().toUpperCase() : '';
    
    const loginScreen = document.getElementById('loginScreen');
    const mainApp = document.getElementById('mainApp');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (mainApp) mainApp.style.display = 'block';
    
    const nurseDisplay = document.getElementById('nurseNameDisplay');
    if (nurseDisplay) nurseDisplay.textContent = userData.nurseName;
    
    if (userData.otherNurses) {
        const otherDisplay = document.getElementById('otherNursesDisplay');
        const otherText = document.getElementById('otherNursesText');
        if (otherDisplay) otherDisplay.style.display = 'block';
        if (otherText) otherText.textContent = userData.otherNurses;
    }
}

function handlePisoChange() {
    const pisoSelect = document.getElementById('pisoSelect');
    const piso = pisoSelect ? pisoSelect.value : '';
    if (piso) {
        userData.currentFloor = piso;
        mostrarNumeroPiso(piso);
        
        const fechaInput = document.getElementById('fechaSelect');
        if (fechaInput && !fechaInput.value) {
            fechaInput.value = obtenerFechaLocal();
        }

        loadCamas();
    } else {
        const pisoDisplay = document.getElementById('pisoDisplay');
        if (pisoDisplay) pisoDisplay.style.display = 'none';
        const camasContainer = document.getElementById('camasContainer');
        if (camasContainer) camasContainer.innerHTML = '';
    }
}

function mostrarNumeroPiso(piso) {
    const elNumber = document.getElementById('pisoNumber');
    const elDisplay = document.getElementById('pisoDisplay');
    if (elNumber && elDisplay) {
        elNumber.textContent = piso;
        elDisplay.style.display = 'block';
    }
}

function generarCamas(config) {
    const { desde, hasta, especiales, camas, sinCamas = [] } = config;
    const camasList = [];
    for (let hab = desde; hab <= hasta; hab++) {
        if (sinCamas.includes(hab)) continue;
        const numCamas = especiales.includes(hab) ? camas : 2;
        for (let c = 1; c <= numCamas; c++) {
            camasList.push(`${hab}-${c}`);
        }
    }
    return camasList;
}

async function loadCamas() {
    const pisoSelect = document.getElementById('pisoSelect');
    const piso = pisoSelect ? pisoSelect.value : '';
    if (!piso) {
        alert('Seleccione un piso');
        return;
    }
    userData.currentFloor = piso;
    dataPorPiso[piso] = dataPorPiso[piso] || { floorNotes: '', camasData: {} };

    const fechaInput = document.getElementById('fechaSelect');
    if (fechaInput && !fechaInput.value) {
        fechaInput.value = obtenerFechaLocal();
    }
    const fechaElegida = fechaInput ? fechaInput.value : obtenerFechaLocal();

    const loadingEl = document.getElementById('loadingCamas');
    if (loadingEl) loadingEl.style.display = 'block';
    
    const container = document.getElementById('camasContainer');
    if (container) container.innerHTML = '';

    const remoto = await cargarDesdeSheets(piso, fechaElegida);

    if (loadingEl) loadingEl.style.display = 'none';

    if (remoto && remoto.ok) {
        dataPorPiso[piso].camasData = remoto.camas || {};
        dataPorPiso[piso].floorNotes = remoto.notasPiso || '';
        if (fechaInput && remoto.fecha) fechaInput.value = remoto.fecha;
    } else {
        dataPorPiso[piso].camasData = {};
        dataPorPiso[piso].floorNotes = '';
    }

    const notasPiso = document.getElementById('notasPiso');
    if (notasPiso) notasPiso.value = dataPorPiso[piso].floorNotes || '';
    renderCamas(piso);
}

function renderCamas(piso) {
    const container = document.getElementById('camasContainer');
    if (!container) return;
    container.innerHTML = '';
    const config = CONFIG.PISOS[piso];
    if (!config) return;
    const camas = generarCamas(config);
    camas.forEach(camaId => {
        container.appendChild(createCamaCard(piso, camaId));
    });
}

async function cargarDesdeSheets(piso, fecha) {
    try {
        let url = `${CONFIG.SHEET_ENDPOINT}?action=cargar&piso=${encodeURIComponent(piso)}`;
        if (fecha) url += `&fecha=${encodeURIComponent(fecha)}`;

        const res = await fetch(url);
        const data = await res.json();
        return (data && data.ok) ? data : null;
    } catch (err) {
        console.log('Error al recuperar datos del servidor:', err);
        return null;
    }
}

function createCamaCard(piso, camaId) {
    const data = (dataPorPiso[piso]?.camasData || {})[camaId] || {};
    const card = document.createElement('div');
    card.className = 'cama-card';

    if (data.aislamiento === 'Respiratorio') card.classList.add('aislamiento-respiratorio');
    else if (data.aislamiento === 'Contacto') card.classList.add('aislamiento-contacto');
    else if (data.aislamiento === 'Neutropénico') card.classList.add('aislamiento-neutropenico');
    else if (data.aislamiento === 'Psiquiátrico') card.classList.add('aislamiento-psiquiatrico');

    card.innerHTML = `
        <div class="cama-header">Cama ${camaId}</div>
        <div class="input-group">
            <label style="display:flex; justify-content:space-between; align-items:center;">
                <span>👤 Paciente:</span>
                <button class="btn btn-danger" style="padding: 2px 6px; font-size: 11px; margin:0;" onclick="limpiarCamaUnica('${piso}', '${camaId}')">🗑️ Borrar Cama</button>
            </label>
            <input type="text" value="${data.paciente || ''}" onchange="updateCamaData('${piso}', '${camaId}', 'paciente', this.value.toUpperCase())" style="text-transform:uppercase">
        </div>
        <div class="aislamiento-selector">
            <label>🔒 Aislamiento:</label>
            <select onchange="updateAislamiento('${piso}', '${camaId}', this.value)">
                <option value="Ninguno" ${data.aislamiento === 'Ninguno' ? 'selected' : ''}>Ninguno</option>
                <option value="Respiratorio" ${data.aislamiento === 'Respiratorio' ? 'selected' : ''}>Respiratorio</option>
                <option value="Contacto" ${data.aislamiento === 'Contacto' ? 'selected' : ''}>Contacto</option>
                <option value="Neutropénico" ${data.aislamiento === 'Neutropénico' ? 'selected' : ''}>Neutropénico</option>
                <option value="Psiquiátrico" ${data.aislamiento === 'Psiquiátrico' ? 'selected' : ''}>Psiquiátrico</option>
            </select>
        </div>

        <details>
            <summary style="font-weight: bold; margin: 8px 0; cursor: pointer;">🔧 Sonda</summary>
            <div class="checkbox-group" style="margin-left: 16px;">
                <div class="checkbox-item">
                    <input type="checkbox" ${data.sonda_vesical ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'sonda_vesical', this.checked)">
                    <label>Sonda Vesical</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" ${data.sonda_3vias ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'sonda_3vias', this.checked)">
                    <label>Sonda 3 vías (lavado)</label>
                </div>
                <details style="margin-left: 16px;">
                    <summary style="cursor: pointer;">Sonda Nasogástrica</summary>
                    <div class="checkbox-item">
                        <input type="checkbox" ${data.sonda_ng_debito ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'sonda_ng_debito', this.checked)">
                        <label>Débito</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" ${data.sonda_ng_alimento ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'sonda_ng_alimento', this.checked)">
                        <label>Alimento</label>
                    </div>
                </details>
            </div>
        </details>

        <details>
            <summary style="font-weight: bold; margin: 8px 0; cursor: pointer;">💧 Drenajes</summary>
            <div class="checkbox-group" style="margin-left: 16px;">
                <div class="checkbox-item">
                    <input type="checkbox" ${data.drenaje_pleural ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'drenaje_pleural', this.checked)">
                    <label>Drenaje Pleural</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" ${data.drenaje_aspirativo ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'drenaje_aspirativo', this.checked)">
                    <label>Drenaje Aspirativo</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" ${data.drenaje_percutaneo ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'drenaje_percutaneo', this.checked)">
                    <label>Drenaje Percutáneo</label>
                </div>
            </div>
        </details>

        <details>
            <summary style="font-weight: bold; margin: 8px 0; cursor: pointer;">💉 Acceso Venoso</summary>
            <div class="checkbox-group" style="margin-left: 16px;">
                <div class="checkbox-item">
                    <input type="checkbox" ${data.acceso_periferico ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'acceso_periferico', this.checked)">
                    <label>Acceso Venoso Periférico</label>
                </div>
                <details style="margin-left: 16px;">
                    <summary style="cursor: pointer;">Acceso Venoso Central</summary>
                    <div class="checkbox-item">
                        <input type="checkbox" ${data.avc_yugular ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'avc_yugular', this.checked)">
                        <label>Yugular</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" ${data.avc_femoral ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'avc_femoral', this.checked)">
                        <label>Femoral</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" ${data.avc_subclavia ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'avc_subclavia', this.checked)">
                        <label>Subclavia</label>
                    </div>
                </details>
            </div>
        </details>

        <details>
            <summary style="font-weight: bold; margin: 8px 0; cursor: pointer;">💨 Oxígeno</summary>
            <div class="checkbox-group" style="margin-left: 16px;">
                <div class="checkbox-item">
                    <input type="checkbox" ${data.oxigeno_canula ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'oxigeno_canula', this.checked)">
                    <label>Cánula nasal</label>
                </div>
                <details style="margin-left: 16px;">
                    <summary style="cursor: pointer;">Máscara</summary>
                    <div class="checkbox-item">
                        <input type="checkbox" ${data.oxigeno_reservorio ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'oxigeno_reservorio', this.checked)">
                        <label>Reservorio</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" ${data.oxigeno_venturi ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'oxigeno_venturi', this.checked)">
                        <label>Venturi</label>
                    </div>
                </details>
            </div>
        </details>

        <details>
            <summary style="font-weight: bold; margin: 8px 0; cursor: pointer;">🧠 Estado</summary>
            <div class="checkbox-group" style="margin-left: 16px;">
                <div class="checkbox-item">
                    <input type="checkbox" ${data.estado_lucido ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'estado_lucido', this.checked)">
                    <label>Lúcido</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" ${data.estado_somnoliento ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'estado_somnoliento', this.checked)">
                    <label>Somnoliento</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" ${data.estado_vigil ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'estado_vigil', this.checked)">
                    <label>Vigil</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" ${data.estado_comatoso ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'estado_comatoso', this.checked)">
                    <label>Comatoso</label>
                </div>
            </div>
        </details>

        <div class="checkbox-group">
            <div class="checkbox-item">
                <input type="checkbox" ${data.contencion ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'contencion', this.checked)">
                <label>Contención física</label>
            </div>
            <div class="checkbox-item">
                <input type="checkbox" ${data.rechazo ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'rechazo', this.checked)">
                <label>Rechazo terapéutico</label>
            </div>
            <div class="checkbox-item">
                <input type="checkbox" ${data.deambula ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'deambula', this.checked)">
                <label>Deambula</label>
            </div>
            <div class="checkbox-item">
                <input type="checkbox" ${data.paniales ? 'checked' : ''} onchange="updateCamaData('${piso}', '${camaId}', 'paniales', this.checked)">
                <label>Usa pañales</label>
            </div>
        </div>

        <div class="observaciones">
            <label>📝 Nov:</label>
            <textarea onchange="updateCamaData('${piso}', '${camaId}', 'observaciones', this.value)">${data.observaciones || ''}</textarea>
        </div>

        <div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 4px; justify-content: center;">
            <button class="btn btn-warning" style="padding: 5px 8px; font-size: 10px;" onclick="registrarAlta('${piso}', '${camaId}')">🏥 Alta</button>
            <button class="btn btn-danger" style="padding: 5px 8px; font-size: 10px;" onclick="registrarObito('${piso}', '${camaId}')">⚰️ Óbito</button>
            <button class="btn btn-info" style="padding: 5px 8px; font-size: 10px;" onclick="registrarPase('${piso}', '${camaId}')">🔁 Pase</button>
            <button class="btn" style="padding: 5px 8px; font-size: 10px;" onclick="mandarANovedad('${piso}', '${camaId}')">📤 Mandar a novedad</button>
        </div>
    `;

    return card;
}

function limpiarCamaUnica(piso, camaId) {
    if (confirm(`¿Limpiar todos los datos de la Cama ${camaId}?`)) {
        if (dataPorPiso[piso]?.camasData?.[camaId]) {
            delete dataPorPiso[piso].camasData[camaId];
            renderCamas(piso);
        }
    }
}

function updateCamaData(piso, camaId, field, value) {
    dataPorPiso[piso] = dataPorPiso[piso] || { camasData: {} };
    dataPorPiso[piso].camasData = dataPorPiso[piso].camasData || {};
    if (!dataPorPiso[piso].camasData[camaId]) dataPorPiso[piso].camasData[camaId] = {};
    dataPorPiso[piso].camasData[camaId][field] = value;
}

function updateAislamiento(piso, camaId, value) {
    dataPorPiso[piso] = dataPorPiso[piso] || { camasData: {} };
    dataPorPiso[piso].camasData = dataPorPiso[piso].camasData || {};
    if (!dataPorPiso[piso].camasData[camaId]) dataPorPiso[piso].camasData[camaId] = {};
    dataPorPiso[piso].camasData[camaId].aislamiento = value;

    const container = document.getElementById('camasContainer');
    if (!container) return;
    const card = Array.from(container.children).find(c => {
        const header = c.querySelector('.cama-header')?.textContent || '';
        return header.includes(camaId);
    });
    if (card) {
        card.className = 'cama-card';
        if (value === 'Respiratorio') card.classList.add('aislamiento-respiratorio');
        else if (value === 'Contacto') card.classList.add('aislamiento-contacto');
        else if (value === 'Neutropénico') card.classList.add('aislamiento-neutropenico');
        else if (value === 'Psiquiátrico') card.classList.add('aislamiento-psiquiatrico');
    }
}

function mandarANovedad(piso, camaId) {
    const data = dataPorPiso[piso]?.camasData[camaId] || {};
    if (!data.paciente && !data.observaciones && !Object.values(data).some(v => v === true)) {
        alert('Primero debe ingresar datos en la cama');
        return;
    }

    const [habitacion, cama] = camaId.split('-');
    let texto = `📌 HAB: ${habitacion}-${cama} - ${data.paciente || 'Sin paciente'}: `;
    const detalles = [];

    if (data.aislamiento && data.aislamiento !== 'Ninguno') detalles.push(`Aislamiento: ${data.aislamiento}`);
    if (data.sonda_vesical) detalles.push('Sonda Vesical');
    if (data.sonda_3vias) detalles.push('Sonda 3 vías');
    if (data.sonda_ng_debito) detalles.push('NG Débito');
    if (data.sonda_ng_alimento) detalles.push('NG Alimento');
    if (data.drenaje_pleural) detalles.push('Drenaje Pleural');
    if (data.drenaje_aspirativo) detalles.push('Drenaje Aspirativo');
    if (data.drenaje_percutaneo) detalles.push('Drenaje Percutáneo');
    if (data.acceso_periferico) detalles.push('AVP');
    if (data.acceso_central) detalles.push('AVC');
    if (data.avc_yugular) detalles.push('AVC Yugular');
    if (data.avc_femoral) detalles.push('AVC Femoral');
    if (data.avc_subclavia) detalles.push('AVC Subclavia');
    if (data.oxigeno_canula) detalles.push('O2 Cánula');
    if (data.oxigeno_mascara) detalles.push('O2 Máscara');
    if (data.oxigeno_reservorio) detalles.push('O2 Reservorio');
    if (data.oxigeno_venturi) detalles.push('O2 Venturi');
    if (data.estado_lucido) detalles.push('Lúcido');
    if (data.estado_somnoliento) detalles.push('Somnoliento');
    if (data.estado_vigil) detalles.push('Vigil');
    if (data.estado_comatoso) detalles.push('Comatoso');
    if (data.contencion) detalles.push('Contención');
    if (data.rechazo) detalles.push('Rechazo');
    if (data.deambula) detalles.push('Deambula');
    if (data.paniales) detalles.push('Pañales');
    if (data.observaciones) detalles.push(`Obs: "${data.observaciones}"`);

    texto += detalles.join(', ');

    const notasActuales = document.getElementById('notasPiso').value || '';
    if (notasActuales.includes(texto)) {
        alert('⚠️ Esta información ya fue enviada a "Notas del Piso"');
        return;
    }

    const nuevasNotas = notasActuales ? `${notasActuales}\n${texto}` : texto;
    document.getElementById('notasPiso').value = nuevasNotas;
    dataPorPiso[piso].floorNotes = nuevasNotas;
    camasParaNovedades.add(`${piso}-${camaId}`);

    alert('✅ Enviado a "Notas del Piso"');
}

function registrarAlta(piso, camaId) {
    const data = dataPorPiso[piso]?.camasData?.[camaId] || {};
    if (!data.paciente) {
        alert('Primero debe ingresar el nombre del paciente');
        return;
    }

    altaOrigen = { piso, camaId };

    const elInfo = document.getElementById('altaPacienteInfo');
    if (elInfo) elInfo.innerText = `👤 Paciente: ${data.paciente} (Cama: ${camaId})`;

    const selectTipo = document.getElementById('altaTipoSelect');
    if (selectTipo) selectTipo.value = '';

    const otrosGroup = document.getElementById('altaOtrosGroup');
    if (otrosGroup) otrosGroup.style.display = 'none';

    const otrosInput = document.getElementById('altaOtrosInput');
    if (otrosInput) otrosInput.value = '';

    const modalAlta = document.getElementById('modalAlta');
    if (modalAlta) modalAlta.style.display = 'flex';
}

function cerrarModalAlta() {
    const modalAlta = document.getElementById('modalAlta');
    if (modalAlta) modalAlta.style.display = 'none';
}

function evaluarTipoAlta() {
    const selectTipo = document.getElementById('altaTipoSelect').value;
    const otrosGroup = document.getElementById('altaOtrosGroup');
    if (otrosGroup) {
        otrosGroup.style.display = (selectTipo === 'Otros') ? 'block' : 'none';
    }
}

async function confirmarAlta() {
    const piso = altaOrigen.piso;
    const camaId = altaOrigen.camaId;
    const tipo = document.getElementById('altaTipoSelect').value;
    const otrosDetalle = document.getElementById('altaOtrosInput').value.trim().toUpperCase();

    if (!tipo) {
        alert('Seleccione un tipo de alta');
        return;
    }

    if (tipo === 'Otros' && !otrosDetalle) {
        alert('Por favor especifique el detalle u observación para la opción "Otros"');
        return;
    }

    const data = dataPorPiso[piso]?.camasData?.[camaId];
    if (!data || !data.paciente) {
        alert('Error al recuperar datos del paciente.');
        return;
    }

    let emoji = '✅';
    let motivoTexto = tipo.toUpperCase();

    if (tipo === 'Alta Médica') emoji = '✅';
    else if (tipo === 'Alta Voluntaria') emoji = '⚠️';
    else if (tipo === 'Paciente se dio a la fuga') emoji = '🚨';
    else if (tipo === 'Otros') {
        emoji = '📌';
        motivoTexto = `ALTA (${otrosDetalle})`;
    }

    const textoAlta = `${emoji} HAB: ${camaId} - ${motivoTexto}: ${data.paciente}`;

    const notasOrigen = dataPorPiso[piso].floorNotes || '';
    if (!notasOrigen.includes(textoAlta)) {
        const nuevasNotas = notasOrigen ? `${notasOrigen}\n${textoAlta}` : textoAlta;
        dataPorPiso[piso].floorNotes = nuevasNotas;

        if (userData.currentFloor === piso) {
            document.getElementById('notasPiso').value = nuevasNotas;
        }
    }

    camasParaNovedades.add(`${piso}-${camaId}`);
    delete dataPorPiso[piso].camasData[camaId];

    cerrarModalAlta();

    if (userData.currentFloor === piso) {
        renderCamas(piso);
    }

    camasParaNovedades.add(`${piso}-${camaId}`);
    delete dataPorPiso[piso].camasData[camaId];

    cerrarModalAlta();

    if (userData.currentFloor === piso) {
        renderCamas(piso);
    }

    const fechaActual = document.getElementById('fechaSelect')?.value || obtenerFechaLocal();
    await eliminarCamaDelServidor(piso, fechaActual, camaId);
    await enviarPisoSilencioso(piso);

    await enviarPisoSilencioso(piso);

    alert(`✅ Alta registrada correctamente: ${data.paciente}`);
}

function borrarNotasPiso() {
    const piso = userData.currentFloor;
    if (confirm('¿Borrar todas las novedades de este piso?')) {
        document.getElementById('notasPiso').value = '';
        if (dataPorPiso[piso]) dataPorPiso[piso].floorNotes = '';
    }
}

function obtenerFechaLocal() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

async function enviarDatos() {
    if (!CONFIG.SHEET_ENDPOINT) {
        alert('⚠️ Error de configuración: falta SHEET_ENDPOINT en CONFIG');
        return;
    }
    const piso = userData.currentFloor;
    if (!userData.nurseName || !piso) {
        alert('⚠️ Faltan datos: enfermero o piso no seleccionado');
        return;
    }

    const fechaInput = document.getElementById('fechaSelect');
    const fecha = fechaInput ? fechaInput.value || obtenerFechaLocal() : obtenerFechaLocal();
    if (fechaInput) fechaInput.value = fecha;

    const camasData = dataPorPiso[piso]?.camasData || {};
    const floorNotes = document.getElementById('notasPiso').value || '';

    const payload = {
        action: 'guardar',
        fecha: fecha,
        piso: piso,
        enfermero: userData.nurseName,
        otrosEnfermeros: userData.otherNurses || '',
        notasPiso: floorNotes,
        camas: camasData
    };

    const btn = document.querySelector('.action-buttons .btn-warning');
    const textoOriginal = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '⏳ Guardando...'; btn.disabled = true; }

    try {
        const res = await fetch(CONFIG.SHEET_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        const resultado = await res.json();
        console.log('Respuesta real del servidor:', resultado);
        if (resultado.ok) {
            alert('✅ Datos guardados correctamente en la planilla');
        } else {
            alert('❌ El servidor respondió con un error: ' + resultado.error);
        }
    } catch (err) {
        alert('❌ Error al guardar en la planilla: ' + err.message);
    } finally {
        if (btn) { btn.innerHTML = textoOriginal; btn.disabled = false; }
    }
}

async function enviarPisoSilencioso(piso) {
    if (!CONFIG.SHEET_ENDPOINT || !piso) return;
    const fecha = obtenerFechaLocal();
    const pisoData = dataPorPiso[piso] || {};
    const payload = {
        action: 'guardar',
        fecha: fecha,
        piso: piso,
        enfermero: userData.nurseName || 'SADOFE',
        otrosEnfermeros: userData.otherNurses || '',
        notasPiso: pisoData.floorNotes || '',
        camas: pisoData.camasData || {}
    };

    try {
        await fetch(CONFIG.SHEET_ENDPOINT, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error(`Error en guardado automático para el piso ${piso}:`, err);
    }
}

function borrarCamposPiso() {
    const piso = userData.currentFloor;
    if (!piso) {
        alert('Seleccione un piso primero');
        return;
    }
    if (!confirm('¿Borrar los campos de las camas en pantalla? (Esto NO borra lo ya guardado en la planilla)')) return;

    dataPorPiso[piso] = dataPorPiso[piso] || {};
    dataPorPiso[piso].camasData = {};
    renderCamas(piso);
}

async function registrarObito(piso, camaId) {
    const data = dataPorPiso[piso]?.camasData[camaId] || {};
    if (!data.paciente) {
        alert('Primero debe ingresar el nombre del paciente');
        return;
    }

    const causa = prompt(`⚰️ ${data.paciente}\n\n¿Causa del óbito?\nEj: Paro cardiorrespiratorio, Sepsis, etc.`);
    if (!causa) return;

    const texto = `⚰️ HAB: ${camaId} - ÓBITO: ${data.paciente} - Causa: ${causa}`;
    const notasActuales = document.getElementById('notasPiso').value || '';
    if (!notasActuales.includes(texto)) {
        const nuevasNotas = notasActuales ? `${notasActuales}\n${texto}` : texto;
        document.getElementById('notasPiso').value = nuevasNotas;
        dataPorPiso[piso].floorNotes = nuevasNotas;
    }
    
    camasParaNovedades.add(`${piso}-${camaId}`);
    delete dataPorPiso[piso].camasData[camaId];
    renderCamas(piso);

    camasParaNovedades.add(`${piso}-${camaId}`);
    delete dataPorPiso[piso].camasData[camaId];
    renderCamas(piso);

    const fechaActual = document.getElementById('fechaSelect')?.value || obtenerFechaLocal();
    await eliminarCamaDelServidor(piso, fechaActual, camaId);
    await enviarPisoSilencioso(piso);

    alert('✅ Óbito registrado y cama limpiada');

    await enviarPisoSilencioso(piso);

    alert('✅ Óbito registrado y cama limpiada');
}

function registrarPase(piso, camaId) {
    const data = dataPorPiso[piso]?.camasData?.[camaId] || {};
    if (!data.paciente) {
        alert('Primero debe ingresar el nombre del paciente');
        return;
    }

    paseOrigen = { piso, camaId };

    const elInfo = document.getElementById('pasePacienteInfo');
    if (elInfo) elInfo.innerText = `👤 Paciente: ${data.paciente} (Cama origen: ${camaId})`;
    
    const elPiso = document.getElementById('pasePisoDestino');
    if (elPiso) elPiso.value = '';
    
    const elCama = document.getElementById('paseCamaDestino');
    if (elCama) elCama.innerHTML = '<option value="">Seleccione primero el piso...</option>';
    
    const modalPase = document.getElementById('modalPase');
    if (modalPase) modalPase.style.display = 'flex';
}

function cerrarModalPase() {
    const modalPase = document.getElementById('modalPase');
    if (modalPase) modalPase.style.display = 'none';
}

function actualizarCamasDestinoPase() {
    const pisoDestino = document.getElementById('pasePisoDestino').value;
    const selectCama = document.getElementById('paseCamaDestino');
    if (!selectCama) return;
    selectCama.innerHTML = '';

    if (!pisoDestino) {
        selectCama.innerHTML = '<option value="">Seleccione primero el piso...</option>';
        return;
    }

    const config = CONFIG.PISOS[pisoDestino];
    if (!config) return;

    const camas = generarCamas(config);
    camas.forEach(camaId => {
        if (pisoDestino === paseOrigen.piso && camaId === paseOrigen.camaId) return;

        const pacienteActual = dataPorPiso[pisoDestino]?.camasData?.[camaId]?.paciente;
        const option = document.createElement('option');
        option.value = camaId;
        option.textContent = pacienteActual 
            ? `Cama ${camaId} (⚠️ Ocupada: ${pacienteActual})` 
            : `Cama ${camaId} (Disponible)`;
        selectCama.appendChild(option);
    });
}

async function confirmarPaseInterno() {
    const pisoOrigen = paseOrigen.piso;
    const camaOrigenId = paseOrigen.camaId;
    const pisoDestino = document.getElementById('pasePisoDestino').value;
    const camaDestinoId = document.getElementById('paseCamaDestino').value;

    if (!pisoDestino || !camaDestinoId) {
        alert('Seleccione un piso y una cama de destino.');
        return;
    }

    const datosPaciente = dataPorPiso[pisoOrigen]?.camasData?.[camaOrigenId];
    if (!datosPaciente || !datosPaciente.paciente) {
        alert('Error al recuperar datos del paciente.');
        return;
    }

    dataPorPiso[pisoDestino] = dataPorPiso[pisoDestino] || { floorNotes: '', camasData: {} };
    dataPorPiso[pisoDestino].camasData = dataPorPiso[pisoDestino].camasData || {};
    dataPorPiso[pisoDestino].camasData[camaDestinoId] = JSON.parse(JSON.stringify(datosPaciente));

    const textoPase = `🔁 HAB: ${camaOrigenId} - PASE INTERNO: ${datosPaciente.paciente} → Piso ${pisoDestino}, Cama ${camaDestinoId}`;

    const notasOrigen = dataPorPiso[pisoOrigen].floorNotes || '';
    if (!notasOrigen.includes(textoPase)) {
        const nuevasNotasOrigen = notasOrigen ? `${notasOrigen}\n${textoPase}` : textoPase;
        dataPorPiso[pisoOrigen].floorNotes = nuevasNotasOrigen;

        if (userData.currentFloor === pisoOrigen) {
            document.getElementById('notasPiso').value = nuevasNotasOrigen;
        }
    }

    camasParaNovedades.add(`${pisoOrigen}-${camaOrigenId}`);
    delete dataPorPiso[pisoOrigen].camasData[camaOrigenId];

    cerrarModalPase();

    if (userData.currentFloor === pisoOrigen) {
        renderCamas(pisoOrigen);
    }

    const fechaActual = document.getElementById('fechaSelect')?.value || obtenerFechaLocal();
    await eliminarCamaDelServidor(pisoOrigen, fechaActual, camaOrigenId);
    await enviarPisoSilencioso(pisoOrigen);
    await enviarPisoSilencioso(pisoDestino);

    alert(`✅ Pase interno registrado correctamente:\n${datosPaciente.paciente} trasladado a Cama ${camaDestinoId} (Piso ${pisoDestino})`);
}

function getEnfermerosString() {
    let base = userData.nurseName || 'No especificado';
    if (userData.otherNurses) {
        base += `, ${userData.otherNurses}`;
    }
    return `Enfermeros y/o Enfermeras: ${base}`;
}

function enviarPorWhatsApp() {
    const piso = userData.currentFloor;
    const notasPiso = dataPorPiso[piso]?.floorNotes || '';
    if (!notasPiso) return alert('Sin notas');
    let texto = `📋 *NOVEDADES ENFERMERÍA*\n📅 ${new Date().toLocaleString()}\n🏥 *Piso:* ${piso}\n🧑‍⚕️ *${getEnfermerosString()}*\n\n📌 *NOVEDADES:*\n${notasPiso}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
}

function copiarNovedades() {
    const piso = userData.currentFloor;
    const notasPiso = dataPorPiso[piso]?.floorNotes || '';
    let texto = `📋 NOVEDADES ENFERMERÍA\nFecha: ${new Date().toLocaleString()}\nPiso: ${piso}\n${getEnfermerosString()}\n\nNovedades:\n${notasPiso}`;
    navigator.clipboard.writeText(texto).then(() => alert('Copiado'));
}

function generarImagen() {
    const piso = userData.currentFloor;
    let notasPiso = dataPorPiso[piso]?.floorNotes || '';

    if (!notasPiso.trim()) {
        alert('No hay notas del piso para mostrar.');
        return;
    }

    notasPiso = notasPiso.replace(/^\s+|\s+$/g, '');

    let nombresUnificados = (userData.nurseName || 'No especificado').toUpperCase();
    if (userData.otherNurses) {
        nombresUnificados += ` - ${userData.otherNurses.toUpperCase()}`;
    }

    const resumen = document.getElementById('resumenImagen');
    if (!resumen) return;
    resumen.innerHTML = '';
    
    let contenidoHTML = `
        <div style="background: #0a3d62; color: white; padding: 12px; margin: -16px -16px 12px -16px; text-align: center;">
            <h1 style="margin: 0; font-size: 16px; font-weight: bold;">📋 NOVEDADES DE ENFERMERÍA</h1>
        </div>
        <div style="border-bottom: 1px solid #ddd; margin-bottom: 8px;"></div>
    `;

    contenidoHTML += `
        <div style="margin-bottom: 10px; font-size: 11px; line-height: 1.4; text-align: left;">
            <div style="font-weight: bold; color: #0a3d62; margin-bottom: 4px;">👩‍⚕️👩‍⚕️ ENFERMEROS Y/O ENFERMERAS:</div>
            <div style="background: #f8f9fa; padding: 8px; border-radius: 4px; border-left: 3px solid #0a3d62; font-weight: bold; color: #000;">
                ${nombresUnificados}
            </div>
        </div>
    `;

    contenidoHTML += `
        <div style="border-top: 2px solid #17a2b8; margin-top: 10px; padding-top: 6px;">
            <div style="background: #fff3cd; padding: 12px; border-radius: 8px; border: 1px solid #ffeaa7;">
                <div style="font-size: 12px; font-weight: bold; color: #856404; margin-bottom: 8px; text-align: center;">
                    📝 NOTAS DEL PISO ${piso}
                </div>
                <div style="font-size: 11px; color: #333; line-height: 1.6; white-space: pre-wrap; text-align: left; text-indent: 0; margin: 0; padding: 0;">${notasPiso}</div>
            </div>
        </div>
    `;

    resumen.innerHTML = contenidoHTML;
    resumen.style.display = 'block';
    resumen.style.position = 'absolute';
    resumen.style.left = '-9999px';
    resumen.style.top = '0';
    resumen.style.width = '300px';
    resumen.style.padding = '16px';
    resumen.style.backgroundColor = '#ffffff';
    resumen.style.fontFamily = 'Arial, sans-serif';
    resumen.style.boxSizing = 'border-box';
    resumen.style.zIndex = '-9999';

    setTimeout(() => {
        html2canvas(resumen, {
            scale: 3, 
            width: 300,
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false
        }).then(canvas => {
            resumen.style.display = 'none';
            resumen.style.position = 'static';
            const displayCanvas = document.getElementById('canvasImagen');
            if (!displayCanvas) return;
            
            const optimalWidth = Math.min(300, window.innerWidth - 40);
            displayCanvas.width = canvas.width;
            displayCanvas.height = canvas.height;
            displayCanvas.style.maxWidth = '100%';
            displayCanvas.style.width = optimalWidth + 'px';
            displayCanvas.style.height = 'auto';
            displayCanvas.style.border = '2px solid #0a3d62';
            displayCanvas.style.borderRadius = '8px';
            displayCanvas.style.display = 'block';
            displayCanvas.style.margin = '10px auto';
            displayCanvas.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            
            const ctx = displayCanvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(canvas, 0, 0);
            
            document.getElementById('imagenGenerada').style.display = 'block';
            setTimeout(() => {
                document.getElementById('imagenGenerada').scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 100);
            cerrarModal();
        }).catch(err => {
            console.error('Error:', err);
            resumen.style.display = 'none';
            alert('❌ Error al generar imagen.');
        });
    }, 500);
}

function descargarImagen() {
    const canvas = document.getElementById('canvasImagen');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'novedades.png';
    link.href = canvas.toDataURL();
    link.click();
}

function compartirImagen() {
    const canvas = document.getElementById('canvasImagen');
    if (!canvas) return;
    canvas.toBlob(blob => {
        const file = new File([blob], 'novedades.png', { type: 'image/png' });
        if (navigator.share) navigator.share({ files: [file] });
    });
}

function abrirModalNovedades() {
    const container = document.getElementById('camaSelection');
    if (!container) return;
    container.innerHTML = '';
    const piso = userData.currentFloor;
    if (!piso || !dataPorPiso[piso]) return;
    const config = CONFIG.PISOS[piso];
    const camas = generarCamas(config);
    camas.forEach(camaId => {
        const data = dataPorPiso[piso].camasData[camaId] || {};
        const estaMarcada = camasParaNovedades.has(`${piso}-${camaId}`);

        if (!estaMarcada) return;

        const div = document.createElement('div');
        div.className = 'cama-option';
        div.innerHTML = `
            <input type="checkbox" id="sel-${camaId}" checked>
            <label for="sel-${camaId}">Cama ${camaId} - ${data.paciente || 'Sin paciente'}</label>
        `;
        div.onclick = () => div.querySelector('input').click();
        container.appendChild(div);
    });
    if (container.children.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">No hay camas marcadas</p>';
    }
    document.getElementById('modalNovedades').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modalNovedades').style.display = 'none';
}

async function eliminarCamaDelServidor(piso, fecha, camaId) {
    if (!CONFIG.SHEET_ENDPOINT || !piso || !camaId) return;
    const payload = {
        action: 'eliminarCama',
        piso: piso,
        fecha: fecha || obtenerFechaLocal(),
        cama: camaId
    };
    try {
        await fetch(CONFIG.SHEET_ENDPOINT, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error(`Error al eliminar cama ${camaId} del servidor:`, err);
    }
}

function initServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('SW registrado:', reg))
            .catch(err => console.log('Error al registrar SW:', err));
    }
}