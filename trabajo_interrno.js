// --- 1. CAPTURA DE ELEMENTOS ---
const barra = document.getElementById("buscar");
const productos = document.querySelectorAll(".producto");
const listaCarritoUI = document.getElementById("lista-carrito");
const precioTotalUI = document.getElementById("precio-total");
const btnNuevo = document.getElementById("btn-nuevo-pedido");
const botonesAgregar = document.querySelectorAll(".agregar");

// NUEVOS BOTONES DE CONFIRMACIÓN
const btnMesa = document.getElementById("btn-mesa");
const btnLlevar = document.getElementById("btn-llevar");

// Elementos del Dueño e Historial
const btnVerHistorial = document.getElementById("btn-ver-historial");
const cantVentasUI = document.getElementById("cant-ventas");
const recaudacionUI = document.getElementById("recaudacion-total");
const contenedorHistorial = document.getElementById("contenedor-historial-visual");
const listaVentasUI = document.getElementById("lista-ventas-desplegable");

// --- 2. VARIABLES DE ESTADO ---
let carrito = [];
let total = 0;
let historialVentas = [];
let recaudacionTotal = 0;

// --- 3. LÓGICA DEL BUSCADOR ---
barra.addEventListener("keyup", () => {
    const busqueda = barra.value.toLowerCase();
    productos.forEach(tarjeta => {
        const nombre = tarjeta.querySelector("h3").innerText.toLowerCase();
        tarjeta.style.display = nombre.includes(busqueda) ? "block" : "none";
    });
});

// --- 4. LÓGICA DE AGREGAR PRODUCTOS ---
botonesAgregar.forEach((boton) => {
    boton.addEventListener("click", (e) => {
        const tarjetaProducto = e.target.closest(".producto");
        const nombre = tarjetaProducto.querySelector("h3").innerText;
        const precioTexto = tarjetaProducto.querySelector(".precio").innerText;
        const precio = parseFloat(precioTexto.replace("$", "").replace(/\./g, ""));
        agregarAlCarrito(nombre, precio);
    });
});

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
        nuevoItem.innerHTML = `
            <span><strong>${item.cantidad}x</strong> ${item.nombre}</span>
            <div>
                <span>$${(item.precio * item.cantidad).toLocaleString('es-AR')}</span>
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

// --- 5. LÓGICA DE PROCESAR VENTA (Mesa o Llevar) ---

btnMesa.addEventListener("click", () => procesarVenta("PARA LA MESA 🏠"));
btnLlevar.addEventListener("click", () => procesarVenta("PARA LLEVAR 🥡"));

function procesarVenta(tipoPedido) {
    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    // A. Guardar en Historial
    const ventaActual = {
        id: historialVentas.length + 1,
        productos: [...carrito],
        totalVenta: total,
        hora: new Date().toLocaleTimeString(),
        tipo: tipoPedido
    };
    historialVentas.push(ventaActual);
    recaudacionTotal += total;

    // B. Actualizar Panel Dueño
    cantVentasUI.innerText = historialVentas.length;
    recaudacionUI.innerText = `$${recaudacionTotal.toLocaleString('es-AR')}`;

    // C. Generar filas de productos para el ticket
    let filasTicket = "";
    carrito.forEach(p => {
        filasTicket += `<div style="display:flex; justify-content:space-between;">
            <span>${p.cantidad}x ${p.nombre}</span>
            <span>$${(p.precio * p.cantidad).toLocaleString('es-AR')}</span>
        </div>`;
    });

    // D. Impresión de Doble Ticket
    const win = window.open('', '', 'height=700,width=500');
    win.document.write(`
        <html><head><style>
            body{font-family:monospace;padding:20px;}
            .t{border:1px dashed #000;padding:15px;margin-bottom:50px;width:300px;}
            h2{text-align:center; margin: 5px 0;}
            .cartel-tipo{text-align:center; font-size:1.2rem; font-weight:bold; border:2px solid black; padding:5px; margin-bottom:10px;}
        </style></head>
        <body>
            <div class="t">
                <p style="text-align:center">*** COPIA CLIENTE ***</p>
                <h2>🥩 PARRILLA EL DUEÑO</h2>
                <hr>${filasTicket}<hr>
                <p style="text-align:right"><strong>TOTAL: $${total.toLocaleString('es-AR')}</strong></p>
            </div>
            <div class="t">
                <p style="text-align:center">*** COPIA COCINA ***</p>
                <div class="cartel-tipo">${tipoPedido}</div>
                <h2>🔥 PEDIDO NUEVO</h2>
                <hr>${filasTicket}<hr>
                <p style="text-align:center">Hora: ${ventaActual.hora}</p>
            </div>
        </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);

    limpiarCarrito();
}

// --- 6. HISTORIAL VISUAL ---
btnVerHistorial.addEventListener("click", () => {
    if (contenedorHistorial.style.display === "none") {
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
    historialVentas.forEach((venta, i) => {
        const div = document.createElement("div");
        div.classList.add("venta-item");
        let detalles = "";
        venta.productos.forEach(p => detalles += `<div>• ${p.cantidad}x ${p.nombre}</div>`);
        
        div.innerHTML = `
            <div class="venta-encabezado">
                <span>Venta #${venta.id} (${venta.tipo})</span>
                <span>$${venta.totalVenta.toLocaleString('es-AR')}</span>
            </div>
            <div class="venta-detalle">
                <strong>Hora:</strong> ${venta.hora}<br>
                ${detalles}
            </div>
        `;
        div.onclick = () => div.classList.toggle("activa");
        listaVentasUI.appendChild(div);
    });
}

function limpiarCarrito() {
    carrito = [];
    total = 0;
    actualizarTicketVisual();
}

btnNuevo.addEventListener("click", () => {
    if (confirm("¿Vaciar pedido actual?")) limpiarCarrito();
});