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

// --- 2. VARIABLES DE ESTADO ---
let carrito = [];
let total = 0;
let historialVentas = [];
let recaudacionTotal = 0;

// --- 3. LÓGICA DEL BUSCADOR ---
barra.addEventListener("keyup", () => {
    const busqueda = barra.value.toLowerCase();
    const todosLosProductos = document.querySelectorAll(".producto");
    todosLosProductos.forEach(tarjeta => {
        const nombre = tarjeta.querySelector("h3").innerText.toLowerCase();
        tarjeta.style.display = nombre.includes(busqueda) ? "block" : "none";
    });
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

// Evento para productos iniciales del HTML
botonesAgregar.forEach((boton) => {
    boton.addEventListener("click", (e) => {
        const tarjetaProducto = e.target.closest(".producto");
        const nombre = tarjetaProducto.querySelector("h3").innerText;
        const precioTexto = tarjetaProducto.querySelector(".precio").innerText;
        const precio = parseFloat(precioTexto.replace("$", "").replace(/\./g, "").replace(",", "."));
        agregarAlCarrito(nombre, precio);
    });
});

// --- 5. PROCESAR VENTA E IMPRESIÓN ---
btnMesa.addEventListener("click", () => procesarVenta("PARA LA MESA 🏠"));
btnLlevar.addEventListener("click", () => procesarVenta("PARA LLEVAR 🥡"));

function procesarVenta(tipoPedido) {
    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    const ventaActual = {
        id: historialVentas.length + 1,
        productos: [...carrito],
        totalVenta: total,
        hora: new Date().toLocaleTimeString(),
        tipo: tipoPedido
    };
    historialVentas.push(ventaActual);
    recaudacionTotal += total;

    cantVentasUI.innerText = historialVentas.length;
    recaudacionUI.innerText = `$${recaudacionTotal.toLocaleString('es-AR')}`;

    let filasTicket = "";
    carrito.forEach(p => {
        const subtotalProducto = p.precio * p.cantidad;
        // Formato compacto: Cantidad x Nombre en una línea, precio en la misma o debajo sin espacios
        filasTicket += `
        <div style="display:flex; justify-content:space-between; width: 100%;">
            <span>${p.cantidad} x ${p.nombre}</span>
            <span>$${subtotalProducto.toLocaleString('es-AR')}</span>
        </div>`;
    });

    const win = window.open('', '', 'height=700,width=500');
    win.document.write(`
        <html>
        <head>
            <style>
                @page { size: 58mm auto; margin: 0; }
                body { 
                    width: 48mm; /* Un poco menos de 58mm para evitar cortes laterales */
                    margin: 0; 
                    padding: 2mm; 
                    font-family: 'Courier New', Courier, monospace; /* Fuente de ticket clásica */
                    font-size: 9pt; 
                    line-height: 1.1; /* Interlineado muy bajo para ahorrar papel */
                    color: #000;
                }
                * { box-sizing: border-box; }
                .t { width: 100%; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
                h2 { text-align: center; font-size: 11pt; margin: 2px 0; text-transform: uppercase; }
                .cartel-tipo { 
                    text-align: center; 
                    font-size: 12pt; 
                    font-weight: bold; 
                    border: 1px solid black; 
                    margin: 2px 0;
                }
                .total-line { 
                    text-align: right; 
                    font-size: 12pt; 
                    font-weight: bold; 
                    margin-top: 5px; 
                }
                hr { border: 0; border-top: 1px solid black; margin: 5px 0; }
                .centrado { text-align: center; font-size: 8pt; }
            </style>
        </head>
        <body>
            <div class="t">
                <p class="centrado">*** COPIA CLIENTE ***</p>
                <h2>🥩 PARRILLA EL DUEÑO</h2>
                <hr>
                ${filasTicket}
                <hr>
                <p class="total-line">TOTAL: $${total.toLocaleString('es-AR')}</p>
            </div>

            <div class="t">
                <p class="centrado">*** COPIA COCINA ***</p>
                <div class="cartel-tipo">${tipoPedido}</div>
                <h2>🔥 PEDIDO NUEVO</h2>
                <hr>
                ${filasTicket}
                <hr>
                <p class="centrado">Hora: ${ventaActual.hora}</p>
            </div>
            
            <div style="height: 5mm;"></div> </body>
        </html>
    `);
    win.document.close();
    
    setTimeout(() => { 
        win.print(); 
        win.close(); 
    }, 500);

    limpiarCarrito();
}

// --- 6. HISTORIAL ---
btnVerHistorial.addEventListener("click", () => {
    if (contenedorHistorial.style.display === "none" || contenedorHistorial.style.display === "") {
        dibujarHistorial();
        contenedorHistorial.style.display = "block";
        btnVerHistorial.innerText = "Ocultar Historial";
    } else {
        contenedorHistorial.style.display = "none";
        btnVerHistorial.innerText = "Ver Historial Detallado";
    }
});

function dibujarHistorial() {
    listaVentasUI.innerHTML = "";
    [...historialVentas].reverse().forEach((venta) => {
        const div = document.createElement("div");
        div.classList.add("venta-item");
        let detalles = "";
        venta.productos.forEach(p => detalles += `<div>• ${p.cantidad}x ${p.nombre}</div>`);
        div.innerHTML = `
            <div class="venta-encabezado" style="display:flex; justify-content:space-between; cursor:pointer;">
                <span>Venta #${venta.id} (${venta.tipo})</span>
                <strong>$${venta.totalVenta.toLocaleString('es-AR')}</strong>
            </div>
            <div class="venta-detalle" style="display:none; padding-top: 10px; border-top: 1px solid #555; margin-top: 5px;">
                <strong>Hora:</strong> ${venta.hora}<br>${detalles}
            </div>`;
        div.querySelector(".venta-encabezado").onclick = () => {
            const d = div.querySelector(".venta-detalle");
            d.style.display = d.style.display === "none" ? "block" : "none";
        };
        listaVentasUI.appendChild(div);
    });
}

function limpiarCarrito() {
    carrito = []; total = 0; actualizarTicketVisual();
}

btnNuevo.addEventListener("click", () => {
    if (carrito.length > 0 && confirm("¿Vaciar pedido actual?")) limpiarCarrito();
});

// --- 7. PANEL ADMINISTRADOR ---
btnCrear.addEventListener("click", () => {
    const nombre = inputNombre.value;
    const precio = inputPrecio.value;
    const archivos = inputFoto.files;

    if (!nombre || !precio || archivos.length === 0) {
        alert("Completa todos los campos e imagen.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        crearTarjetaProducto(nombre, precio, e.target.result);
        inputNombre.value = ""; inputPrecio.value = ""; inputFoto.value = "";
    };
    reader.readAsDataURL(archivos[0]);
});

function crearTarjetaProducto(nombre, precio, urlImagen) {
    const nuevaTarjeta = document.createElement("div");
    nuevaTarjeta.classList.add("producto");
    nuevaTarjeta.innerHTML = `
        <div class="foto"><img src="${urlImagen}" style="width: 100%; height: 100%; object-fit: cover;"></div>
        <h3>${nombre}</h3>
        <p class="precio">$${parseInt(precio).toLocaleString('es-AR')}</p>
        <button class="agregar">Agregar</button>`;

    const precioTag = nuevaTarjeta.querySelector(".precio");
    const btnEditar = document.createElement("button");
    btnEditar.innerText = "✏️";
    btnEditar.style.marginLeft = "10px";
    btnEditar.style.cursor = "pointer";
    btnEditar.style.background = "none"; btnEditar.style.border = "none";
    btnEditar.onclick = () => editarPrecio(btnEditar);
    precioTag.appendChild(btnEditar);

    nuevaTarjeta.querySelector(".agregar").onclick = () => {
        const pActual = parseFloat(precioTag.innerText.replace("$", "").replace(/\./g, ""));
        agregarAlCarrito(nombre, pActual);
    };
    contenedorProductos.appendChild(nuevaTarjeta);
}

// --- 8. EDICIÓN DE PRECIOS ---
function editarPrecio(boton) {
    const tarjeta = boton.closest(".producto");
    const nombre = tarjeta.querySelector("h3").innerText;
    const precioHTML = tarjeta.querySelector(".precio");
    const nuevo = prompt(`Nuevo precio para ${nombre}:`);
    if (nuevo && !isNaN(nuevo)) {
        precioHTML.innerHTML = `$${parseFloat(nuevo).toLocaleString('es-AR')}`;
        // Re-agregamos el emoji de editar que se borra al cambiar el innerHTML
        const span = document.createElement("button");
        span.innerText = "✏️";
        span.style.cssText = "margin-left:10px; cursor:pointer; background:none; border:none;";
        span.onclick = () => editarPrecio(span);
        precioHTML.appendChild(span);
    }
}

// Inicializar edición en productos del HTML
document.querySelectorAll(".producto").forEach(tarjeta => {
    const p = tarjeta.querySelector(".precio");
    const b = document.createElement("button");
    b.innerText = "✏️";
    b.style.cssText = "margin-left:10px; cursor:pointer; background:none; border:none;";
    b.onclick = () => editarPrecio(b);
    p.appendChild(b);
});