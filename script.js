/* =========================================================
   PELUQUERÍA ELEGANCE — Reserva de turnos
   HTML + CSS + JS puro (sin frameworks)
   ========================================================= */

/* ---------- CONFIGURACIÓN EDITABLE ---------- */
const CONFIG = {
  nombreNegocio: "Elegance",
  telefonoWhatsApp: "3435451818", // sin + ni espacios
  telefonoVisible: "343 545-1818",
  direccion: "Nogoyá, Entre Ríos",
  instagram: "barretojuan_2",
  intervaloMinutos: 20,
  horarios: {
    // 0 = domingo, 1 = lunes ... 6 = sábado
    // cada día puede tener varios bloques: [{inicio, fin}, ...]
    0: null, // Domingo cerrado
    1: [
      { inicio: "10:00", fin: "12:30" },
      { inicio: "17:00", fin: "21:30" },
    ],
    2: [
      { inicio: "10:00", fin: "12:30" },
      { inicio: "17:00", fin: "21:30" },
    ],
    3: [
      { inicio: "10:00", fin: "12:30" },
      { inicio: "17:00", fin: "21:30" },
    ],
    4: [
      { inicio: "10:00", fin: "12:30" },
      { inicio: "17:00", fin: "21:30" },
    ],
    5: [
      { inicio: "10:00", fin: "12:30" },
      { inicio: "17:00", fin: "21:30" },
    ],
    6: [
      { inicio: "10:00", fin: "12:30" },
      { inicio: "17:00", fin: "21:30" },
    ],
  },
};

/* ---------- SERVICIOS (editables) ---------- */
const SERVICIOS = [
  { id: "corte-hombre", nombre: "Corte Hombre", precio: 6000,  duracion: 20 },
  { id: "corte-mujer",  nombre: "Corte Mujer",  precio: 9000,  duracion: 40 },
  { id: "corte-nino",   nombre: "Corte Niño",   precio: 5000,  duracion: 20 },
  { id: "barba",        nombre: "Barba",        precio: 4000,  duracion: 20 },
  { id: "lavado",       nombre: "Lavado",       precio: 3000,  duracion: 20 },
  { id: "color",        nombre: "Color",        precio: 15000, duracion: 60 },
  { id: "mechas",       nombre: "Mechas",       precio: 18000, duracion: 80 },
  { id: "alisado",      nombre: "Alisado",      precio: 25000, duracion: 100 },
];

/* ---------- STORAGE ---------- */
const STORAGE_KEY = "peluqueria_turnos_v1";
const getTurnos = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const saveTurnos = (t) => localStorage.setItem(STORAGE_KEY, JSON.stringify(t));

/* ---------- ESTADO ---------- */
const state = {
  servicioSel: null, // objeto servicio
  horaSel: null,
};

/* ---------- HELPERS ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const pad = (n) => String(n).padStart(2, "0");

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const parseHora = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const formatMin = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

const formatFechaBonita = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/* Genera todos los slots de un día según los bloques horarios laborales */
function generarSlots(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dia = new Date(y, m - 1, d).getDay();
  const bloques = CONFIG.horarios[dia];
  if (!bloques || bloques.length === 0) return [];
  const slots = [];
  bloques.forEach((b) => {
    const ini = parseHora(b.inicio);
    const fin = parseHora(b.fin);
    for (let t = ini; t < fin; t += CONFIG.intervaloMinutos) {
      slots.push(formatMin(t));
    }
  });
  return slots;
}

/* Devuelve los rangos ocupados (minutos) para una fecha considerando duración */
function ocupadosDelDia(iso) {
  const turnos = getTurnos().filter(
    (t) => t.fecha === iso && t.estado !== "Cancelado"
  );
  return turnos.map((t) => {
    const serv = SERVICIOS.find((s) => s.id === t.servicioId);
    const dur = serv ? serv.duracion : CONFIG.intervaloMinutos;
    const ini = parseHora(t.hora);
    return { ini, fin: ini + dur };
  });
}

/* Verifica si un slot dado se superpone con ocupados */
function slotOcupado(iso, hora, duracion) {
  const ini = parseHora(hora);
  const fin = ini + duracion;
  return ocupadosDelDia(iso).some((r) => ini < r.fin && fin > r.ini);
}

/* =========================================================
   RENDER
   ========================================================= */
function renderServicios() {
  const grid = $("#servicesGrid");
  const sel = $("#servicio");
  grid.innerHTML = "";
  sel.innerHTML = '<option value="">Elegí un servicio</option>';
  SERVICIOS.forEach((s) => {
    // Card
    const card = document.createElement("div");
    card.className = "service-card";
    card.dataset.id = s.id;
    card.innerHTML = `
      <h4>${s.nombre}</h4>
      <div class="service-meta">
        <span>${s.duracion} min</span>
        <span class="service-price">$${s.precio.toLocaleString("es-AR")}</span>
      </div>
    `;
    card.addEventListener("click", () => seleccionarServicio(s.id));
    grid.appendChild(card);

    // Select option
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${s.nombre} — $${s.precio.toLocaleString("es-AR")}`;
    sel.appendChild(opt);
  });
}

function seleccionarServicio(id) {
  state.servicioSel = SERVICIOS.find((s) => s.id === id) || null;
  $$(".service-card").forEach((c) =>
    c.classList.toggle("selected", c.dataset.id === id)
  );
  $("#servicio").value = id;
  state.horaSel = null;
  $("#hora").value = "";
  renderSlots();
  if (state.servicioSel) {
    document.getElementById("reserva").scrollIntoView({ behavior: "smooth" });
  }
}

function renderSlots() {
  const grid = $("#slotsGrid");
  const help = $("#horaHelp");
  const fecha = $("#fecha").value;
  grid.innerHTML = "";

  if (!fecha || !state.servicioSel) {
    help.textContent = "Elegí fecha y servicio para ver los horarios.";
    help.style.display = "block";
    return;
  }

  // No permitir fechas pasadas
  if (fecha < todayISO()) {
    help.textContent = "No se pueden reservar fechas pasadas.";
    help.style.display = "block";
    return;
  }

  const slots = generarSlots(fecha);
  if (slots.length === 0) {
    help.textContent = "Cerrado ese día. Elegí otra fecha.";
    help.style.display = "block";
    return;
  }
  help.style.display = "none";

  const dur = state.servicioSel.duracion;
  const nowMin = new Date().getMinutes() + new Date().getHours() * 60;
  const esHoy = fecha === todayISO();

  slots.forEach((s) => {
    const btn = document.createElement("div");
    btn.className = "slot";
    btn.textContent = s;

    const ocupado = slotOcupado(fecha, s, dur);
    const pasado = esHoy && parseHora(s) <= nowMin;
    // Además: si el slot + duración se pasa del bloque horario actual, marcarlo ocupado
    const [y, m, d] = fecha.split("-").map(Number);
    const dia = new Date(y, m - 1, d).getDay();
    const bloques = CONFIG.horarios[dia] || [];
    const bloque = bloques.find((b) => parseHora(s) >= parseHora(b.inicio) && parseHora(s) < parseHora(b.fin));
    const excede = !bloque || parseHora(s) + dur > parseHora(bloque.fin);

    if (ocupado || pasado || excede) {
      btn.classList.add("taken");
      btn.title = pasado ? "Horario pasado" : excede ? "No hay tiempo suficiente" : "Horario no disponible";
    } else {
      btn.classList.add("free");
      btn.addEventListener("click", () => {
        state.horaSel = s;
        $("#hora").value = s;
        $$(".slot").forEach((x) => x.classList.remove("selected"));
        btn.classList.remove("free");
        btn.classList.add("selected");
      });
    }
    grid.appendChild(btn);
  });
}

/* =========================================================
   MODAL / LOADING
   ========================================================= */
function showModal(html) {
  $("#modalContent").innerHTML = html;
  $("#modal").classList.add("show");
}
function closeModal() {
  $("#modal").classList.remove("show");
}
function showError(msg) {
  showModal(`
    <div class="error-icon">!</div>
    <h3 style="text-align:center">Ups...</h3>
    <p style="text-align:center;color:#666;margin-top:8px">${msg}</p>
    <div class="modal-actions">
      <button class="btn btn-dark" onclick="closeModal()">Entendido</button>
    </div>
  `);
}
function showLoading(on) {
  $("#loading").classList.toggle("show", !!on);
}
window.closeModal = closeModal;

/* =========================================================
   RESERVA
   ========================================================= */
function validarFormulario(data) {
  if (!data.nombre.trim()) return "Ingresá tu nombre.";
  if (!data.apellido.trim()) return "Ingresá tu apellido.";
  if (!/^[\d\s()+-]{6,}$/.test(data.telefono)) return "Teléfono inválido.";
  if (!data.servicioId) return "Elegí un servicio.";
  if (!data.fecha) return "Elegí una fecha.";
  if (data.fecha < todayISO()) return "No se pueden reservar fechas pasadas.";

  const [y, m, d] = data.fecha.split("-").map(Number);
  const dia = new Date(y, m - 1, d).getDay();
  if (!CONFIG.horarios[dia]) return "Estamos cerrados ese día.";

  if (!data.hora) return "Elegí un horario disponible.";
  // Validar que hora coincide con intervalo dentro de algún bloque laboral
  const bloques = CONFIG.horarios[dia] || [];
  const minSlot = parseHora(data.hora);
  const dentroDeBloque = bloques.some(
    (b) => minSlot >= parseHora(b.inicio) && minSlot < parseHora(b.fin)
  );
  if (!dentroDeBloque)
    return "El horario no está dentro de los bloques laborales.";
  const inicioBloque = parseHora(bloques.find((b) => minSlot >= parseHora(b.inicio) && minSlot < parseHora(b.fin)).inicio);
  if ((minSlot - inicioBloque) % CONFIG.intervaloMinutos !== 0)
    return "El horario debe respetar los intervalos de " + CONFIG.intervaloMinutos + " min.";

  const serv = SERVICIOS.find((s) => s.id === data.servicioId);
  if (slotOcupado(data.fecha, data.hora, serv.duracion))
    return "Horario no disponible. Elegí otro.";

  return null;
}

function enviarWhatsApp(turno, serv) {
  const texto =
`*Nuevo turno reservado*

*Cliente:*
${turno.nombre} ${turno.apellido}

*Servicio:*
${serv.nombre}

*Fecha:*
${formatFechaBonita(turno.fecha)}

*Hora:*
${turno.hora}

*Teléfono:*
${turno.telefono}

*Observaciones:*
${turno.observaciones || "Sin observaciones"}`;
  const url = `https://wa.me/${CONFIG.telefonoWhatsApp}?text=${encodeURIComponent(texto)}`;
  window.open(url, "_blank");
}

function confirmarReserva(e) {
  e.preventDefault();

  const data = {
    nombre: $("#nombre").value,
    apellido: $("#apellido").value,
    telefono: $("#telefono").value,
    servicioId: $("#servicio").value,
    fecha: $("#fecha").value,
    hora: $("#hora").value,
    observaciones: $("#observaciones").value,
  };

  const error = validarFormulario(data);
  if (error) { showError(error); return; }

  showLoading(true);

  setTimeout(() => {
    const serv = SERVICIOS.find((s) => s.id === data.servicioId);
    const turno = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nombre: data.nombre.trim(),
      apellido: data.apellido.trim(),
      telefono: data.telefono.trim(),
      servicioId: serv.id,
      servicio: serv.nombre,
      fecha: data.fecha,
      hora: data.hora,
      observaciones: data.observaciones.trim(),
      estado: "Pendiente",
    };

    const turnos = getTurnos();
    turnos.push(turno);
    saveTurnos(turnos);

    showLoading(false);

    showModal(`
      <div class="success-icon">✓</div>
      <h3 style="text-align:center">¡Turno reservado!</h3>
      <p style="text-align:center;color:#666">Te esperamos en ${CONFIG.nombreNegocio}</p>
      <div class="details">
        <p><strong>Nombre:</strong> ${turno.nombre} ${turno.apellido}</p>
        <p><strong>Servicio:</strong> ${turno.servicio}</p>
        <p><strong>Fecha:</strong> ${formatFechaBonita(turno.fecha)}</p>
        <p><strong>Hora:</strong> ${turno.hora}</p>
      </div>
      <div class="modal-actions">
        <button class="btn btn-dark" onclick="closeModal()">Cerrar</button>
        <button class="btn btn-gold" id="waBtn">Enviar por WhatsApp</button>
      </div>
    `);

    document.getElementById("waBtn").addEventListener("click", () => {
      enviarWhatsApp(turno, serv);
    });

    // Enviar automáticamente
    enviarWhatsApp(turno, serv);

    // Reset
    $("#bookingForm").reset();
    state.servicioSel = null;
    state.horaSel = null;
    $$(".service-card").forEach((c) => c.classList.remove("selected"));
    renderSlots();
  }, 600);
}

/* =========================================================
   INIT
   ========================================================= */
function init() {
  // Textos configurables
  $("#brandName").textContent = CONFIG.nombreNegocio;
  $("#direccion").textContent = CONFIG.direccion;
  $("#telefonoLink").textContent = CONFIG.telefonoVisible;
  $("#telefonoLink").href = "tel:" + CONFIG.telefonoWhatsApp;
  $("#year").textContent = new Date().getFullYear();
  $("#waDirect").href = `https://wa.me/${CONFIG.telefonoWhatsApp}?text=${encodeURIComponent(
    "Hola! Quisiera hacer una consulta."
  )}`;
  $("#instaDirect").href = `https://instagram.com/${CONFIG.instagram}`;

  // Fecha mínima
  const fecha = $("#fecha");
  fecha.min = todayISO();
  fecha.value = todayISO();

  renderServicios();
  renderSlots();

  // Eventos
  fecha.addEventListener("change", () => {
    if (fecha.value < todayISO()) {
      showError("No se pueden reservar fechas pasadas.");
      fecha.value = todayISO();
    }
    const [y, m, d] = fecha.value.split("-").map(Number);
    const dia = new Date(y, m - 1, d).getDay();
    if (!CONFIG.horarios[dia]) {
      showError("Los domingos estamos cerrados. Elegí otro día.");
    }
    state.horaSel = null;
    $("#hora").value = "";
    renderSlots();
  });

  $("#servicio").addEventListener("change", (e) => seleccionarServicio(e.target.value));

  $("#bookingForm").addEventListener("submit", confirmarReserva);

  // Cerrar modal clic fuera
  $("#modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") closeModal();
  });
}

document.addEventListener("DOMContentLoaded", init);
