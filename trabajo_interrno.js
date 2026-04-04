// --- 1. CAPTURA DE ELEMENTOS ---
const barra = document.getElementById("buscar");
const listaCarritoUI = document.getElementById("lista-carrito");
const precioTotalUI = document.getElementById("precio-total");
const btnNuevo = document.getElementById("btn-nuevo-pedido");
const botonesAgregar = document.querySelectorAll(".agregar");

const btnMesa = document.getElementById("btn-mesa");
const btnLlevar = document.getElementById("btn-llevar");

const btnVerHistorial = document.getElementById("btn-ver-historial");
const cantVentasUI = document.getElementById("cant-ventas");
const recaudacionUI = document.getElementById("recaudacion-total");
const contenedorHistorial = document.getElementById("contenedor-historial-visual");
const listaVentasUI = document.getElementById("lista-ventas-desplegable");

const btnCrear = document.getElementById("btn-crear-producto");
const contenedorProductos = document.getElementById("contenedor-productos");
const inputNombre = document.getElementById("nuevo-nombre");
const inputPrecio = document.getElementById("nuevo-precio");
const inputFoto = document.getElementById("nuevo-foto");

// --- 2. VARIABLES DE ESTADO (Cargando desde LocalStorage) ---
let carrito = [];
let total = 0;

// Si hay historial guardado lo carga, sino empieza vacío
let historialVentas = JSON.parse(localStorage.getItem("historial_parrilla")) || [];
let recaudacionTotal = historialVentas.reduce((acc, venta) => acc + venta.totalVenta, 0);

// Si hay productos creados por el usuario los carga
let productosPersonalizados = JSON.parse(localStorage.getItem("productos_parrilla")) || [];

// --- 3. INICIALIZACIÓN ---
window.addEventListener("DOMContentLoaded", () => {
    // Actualizar números del panel administrador al empezar
    actualizarPanelAdmin();
    // Dibujar productos guardados
    productosPersonalizados.forEach(p => crearTarjetaProducto(p.nombre, p.precio, p.urlImagen, false));
    // Poner el buscador a escuchar
    vincularBuscador();
    // Poner lápiz de edición a productos base del HTML
    vincularEdicionBase();
});

// --- 4. LÓGICA DEL CARRITO ---
function agregarAlCarrito(nombre, precio) {
    const productoExistente = carrito.find(item => item.nombre === nombre);
    if (productoExistente) {
        productoExistente.cantidad += 1;
    } else {
        carrito.push({ id: Date.now(), nombre, precio, cantidad: 1 });
    }
    total += precio;
    actualizarTicketVisual();
}

function actualizarTicketVisual() {
    listaCarritoUI.innerHTML = "";
    if (carrito.length === 0) {
        listaCarritoUI.innerHTML = '<p id="carrito-vacio">El carrito está vacío</p>';
    }
    carrito.forEach(item => {
        const nuevoItem = document.createElement("li");
        nuevoItem.classList.add("item-carrito");
        const subtotal = item.precio * item.cantidad;
        nuevoItem.innerHTML = `
            <span><strong>${item.cantidad}x</strong> ${item.nombre}</span>
            <div>
                <span>$${subtotal.toLocaleString('es-AR')}</span>
                <button class="btn-borrar" onclick="eliminarDelCarrito(${item.id})">❌</button>
            </div>`;
        listaCarritoUI.appendChild(nuevoItem);
    });
    precioTotalUI.innerText = `$${total.toLocaleString('es-AR')}`;
}

function eliminarDelCarrito(idABuscar) {
    const indice = carrito.findIndex(item => item.id === idABuscar);
    if (indice !== -1) {
        total -= (carrito[indice].precio * carrito[indice].cantidad);
        carrito.splice(indice, 1);
    }
    actualizarTicketVisual();
}

// --- 5. PROCESAR VENTA E IMPRESIÓN ---
btnMesa.addEventListener("click", () => procesarVenta("PARA LA MESA 🏠"));
btnLlevar.addEventListener("click", () => procesarVenta("PARA LLEVAR 🥡"));

function procesarVenta(tipoPedido) {
    if (carrito.length === 0) return alert("El carrito está vacío.");

    const ventaActual = {
        id: historialVentas.length + 1,
        productos: [...carrito],
        totalVenta: total,
        hora: new Date().toLocaleTimeString(),
        tipo: tipoPedido
    };

    // GUARDAR EN HISTORIAL Y LOCALSTORAGE
    historialVentas.push(ventaActual);
    localStorage.setItem("historial_parrilla", JSON.stringify(historialVentas));
    
    recaudacionTotal += total;
    actualizarPanelAdmin();

    // Lógica de impresión (Modo ahorro papel)
    let filasTicket = "";
    carrito.forEach(p => {
        filasTicket += `<div style="display:flex; justify-content:space-between; width: 100%;">
            <span>${p.cantidad} x ${p.nombre}</span>
            <span>$${(p.precio * p.cantidad).toLocaleString('es-AR')}</span>
        </div>`;
    });

    imprimirTicket(filasTicket, tipoPedido, ventaActual.hora);
    limpiarCarrito();
}

function imprimirTicket(filas, tipo, hora) {
    const win = window.open('', '', 'height=700,width=500');
    win.document.write(`<html><head><style>
        @page { size: 58mm auto; margin: 0; }
        body { width: 48mm; margin: 0; padding: 2mm; font-family: 'Courier New', monospace; font-size: 9pt; line-height: 1.1; }
        .t { width: 100%; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
        h2 { text-align: center; font-size: 11pt; margin: 2px 0; }
        .cartel { text-align: center; font-size: 12pt; font-weight: bold; border: 1px solid #000; }
        hr { border: 0; border-top: 1px solid #000; margin: 5px 0; }
    </style></head><body>
        <div class="t"><p style="text-align:center">*** CLIENTE ***</p><h2>🥩 EL DUEÑO</h2><hr>${filas}<hr><b>TOTAL: $${total.toLocaleString('es-AR')}</b></div>
        <div class="t"><p style="text-align:center">*** COCINA ***</p><div class="cartel">${tipo}</div><h2>🔥 NUEVO</h2><hr>${filas}<hr><p style="text-align:center">Hora: ${hora}</p></div>
    </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
}

// --- 6. PANEL ADMINISTRADOR (Productos Personalizados) ---
btnCrear.addEventListener("click", () => {
    const nombre = inputNombre.value;
    const precio = inputPrecio.value;
    const archivos = inputFoto.files;

    if (!nombre || !precio || archivos.length === 0) return alert("Completa los datos.");

    const reader = new FileReader();
    reader.onload = (e) => {
        const urlImagen = e.target.result;
        crearTarjetaProducto(nombre, precio, urlImagen, true);
        inputNombre.value = ""; inputPrecio.value = ""; inputFoto.value = "";
    };
    reader.readAsDataURL(archivos[0]);
});

function crearTarjetaProducto(nombre, precio, urlImagen, esNuevo = false) {
    if (esNuevo) {
        productosPersonalizados.push({ nombre, precio, urlImagen });
        localStorage.setItem("productos_parrilla", JSON.stringify(productosPersonalizados));
    }

    const div = document.createElement("div");
    div.classList.add("producto");
    div.innerHTML = `
        <div class="foto"><img src="${urlImagen}" style="width:100%; height:100%; object-fit:cover;"></div>
        <h3>${nombre}</h3>
        <p class="precio">$${parseInt(precio).toLocaleString('es-AR')}</p>
        <button class="agregar">Agregar</button>`;

    // Agregar botón editar
    const pTag = div.querySelector(".precio");
    const btnE = document.createElement("button");
    btnE.innerText = "✏️";
    btnE.style.cssText = "margin-left:10px; cursor:pointer; background:none; border:none;";
    btnE.onclick = () => editarPrecio(btnE);
    pTag.appendChild(btnE);

    div.querySelector(".agregar").onclick = () => {
        const pActual = parseFloat(pTag.innerText.replace("$", "").replace(/\./g, ""));
        agregarAlCarrito(nombre, pActual);
    };

    contenedorProductos.appendChild(div);
}

// --- 7. FUNCIONES AUXILIARES ---
function actualizarPanelAdmin() {
    cantVentasUI.innerText = historialVentas.length;
    recaudacionUI.innerText = `$${recaudacionTotal.toLocaleString('es-AR')}`;
}

function limpiarCarrito() { carrito = []; total = 0; actualizarTicketVisual(); }

function vincularBuscador() {
    barra.addEventListener("keyup", () => {
        const b = barra.value.toLowerCase();
        document.querySelectorAll(".producto").forEach(t => {
            t.style.display = t.querySelector("h3").innerText.toLowerCase().includes(b) ? "block" : "none";
        });
    });
}

function editarPrecio(boton) {
    const pTag = boton.closest(".precio");
    const nuevo = prompt("Nuevo precio:");
    if (nuevo && !isNaN(nuevo)) {
        pTag.innerHTML = `$${parseFloat(nuevo).toLocaleString('es-AR')}`;
        const btnE = document.createElement("button");
        btnE.innerText = "✏️";
        btnE.style.cssText = "margin-left:10px; cursor:pointer; background:none; border:none;";
        btnE.onclick = () => editarPrecio(btnE);
        pTag.appendChild(btnE);
    }
}

function vincularEdicionBase() {
    document.querySelectorAll(".producto").forEach(t => {
        const p = t.querySelector(".precio");
        if (!p.querySelector("button")) {
            const b = document.createElement("button");
            b.innerText = "✏️";
            b.style.cssText = "margin-left:10px; cursor:pointer; background:none; border:none;";
            b.onclick = () => editarPrecio(b);
            p.appendChild(b);
        }
        // Vincular botón agregar de productos estáticos
        t.querySelector(".agregar").onclick = () => {
            const nom = t.querySelector("h3").innerText;
            const pre = parseFloat(p.innerText.replace("$", "").replace(/\./g, "").replace(",", "."));
            agregarAlCarrito(nom, pre);
        };
    });
}

// Botón para ver historial
btnVerHistorial.addEventListener("click", () => {
    if (contenedorHistorial.style.display === "none" || contenedorHistorial.style.display === "") {
        listaVentasUI.innerHTML = "";
        [...historialVentas].reverse().forEach(v => {
            const div = document.createElement("div");
            div.className = "venta-item";
            div.innerHTML = `<div style="display:flex; justify-content:space-between">
                <span>#${v.id} - ${v.hora}</span><b>$${v.totalVenta.toLocaleString('es-AR')}</b>
            </div>`;
            listaVentasUI.appendChild(div);
        });
        contenedorHistorial.style.display = "block";
        btnVerHistorial.innerText = "Ocultar Historial";
    } else {
        contenedorHistorial.style.display = "none";
        btnVerHistorial.innerText = "Ver Historial Detallado";
    }
});

// BOTÓN PARA REINICIAR DÍA (OPCIONAL - BORRA HISTORIAL)
const btnReiniciar = document.createElement("button");
btnReiniciar.innerText = "Reiniciar Caja (Cierre)";
btnReiniciar.style.cssText = "background: red; color: white; margin-top: 10px; padding: 10px; width: 100%; border-radius: 8px;";
btnReiniciar.onclick = () => {
    if(confirm("¿Seguro que quieres borrar todas las ventas del día?")) {
        localStorage.removeItem("historial_parrilla");
        location.reload();
    }
};
document.querySelector(".caja-diaria").appendChild(btnReiniciar);