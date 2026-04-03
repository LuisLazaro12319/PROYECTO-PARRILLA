// --- 1. CAPTURA DE ELEMENTOS ---
const barra = document.getElementById("buscar");
const listaCarritoUI = document.getElementById("lista-carrito");
const precioTotalUI = document.getElementById("precio-total");
const btnNuevo = document.getElementById("btn-nuevo-pedido");
const botonesAgregar = document.querySelectorAll(".agregar"); // Solo para los productos iniciales del HTML

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

// --- 3. LÓGICA DEL BUSCADOR (Corregido para detectar productos nuevos) ---
barra.addEventListener("keyup", () => {
    const busqueda = barra.value.toLowerCase();
    // Capturamos la lista actualizada de productos cada vez que se escribe
    const todosLosProductos = document.querySelectorAll(".producto");
    
    todosLosProductos.forEach(tarjeta => {
        const nombre = tarjeta.querySelector("h3").innerText.toLowerCase();
        tarjeta.style.display = nombre.includes(busqueda) ? "block" : "none";
    });
});

// --- 4. LÓGICA DE AGREGAR PRODUCTOS (Para los que ya vienen en el HTML) ---
// Nota: Esta lógica solo aplica a los productos que ya existen en el HTML al cargar la página.
// Los productos nuevos se manejan individualmente en crearTarjetaProducto.
botonesAgregar.forEach((boton) => {
    boton.addEventListener("click", (e) => {
        const tarjetaProducto = e.target.closest(".producto");
        const nombre = tarjetaProducto.querySelector("h3").innerText;
        const precioTexto = tarjetaProducto.querySelector(".precio").innerText;
        // Limpieza de precio para soportar formato $8.500 o $8500
        const precio = parseFloat(precioTexto.replace("$", "").replace(/\./g, "").replace(",", "."));
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
        const subtotalProducto = p.precio * p.cantidad;
        filasTicket += `<div style="display:flex; justify-content:space-between;">
            <span>${p.cantidad}x ${p.nombre}</span>
            <span>$${subtotalProducto.toLocaleString('es-AR')}</span>
        </div>`;
    });

    // D. Impresión de Doble Ticket (Abriendo ventana temporal para impresión limpia)
    const win = window.open('', '', 'height=700,width=500');
    win.document.write(`
        <html><head><style>
            body{font-family:monospace;padding:20px; color: black; background: white;}
            .t{border:1px dashed #000;padding:15px;margin-bottom:50px;width:300px; margin-left: auto; margin-right: auto;}
            h2{text-align:center; margin: 5px 0;}
            .cartel-tipo{text-align:center; font-size:1.2rem; font-weight:bold; border:2px solid black; padding:5px; margin-bottom:10px;}
            hr { border: 0; border-top: 1px dashed black; }
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
    // Pequeña espera para asegurar que el contenido cargó antes de imprimir
    setTimeout(() => { win.print(); win.close(); }, 500);

    limpiarCarrito();
}

// --- 6. HISTORIAL VISUAL ---
// Inicialmente oculto por CSS (display: none)
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
    // Clonamos y damos vuelta el array para mostrar la última venta primero
    const historialInvertido = [...historialVentas].reverse();
    
    historialInvertido.forEach((venta) => {
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
                <strong>Hora:</strong> ${venta.hora}<br>
                ${detalles}
            </div>
        `;
        // Lógica para desplegar/contraer detalle
        div.querySelector(".venta-encabezado").onclick = () => {
            const detalleDiv = div.querySelector(".venta-detalle");
            detalleDiv.style.display = detalleDiv.style.display === "none" ? "block" : "none";
        };
        listaVentasUI.appendChild(div);
    });
}

function limpiarCarrito() {
    carrito = [];
    total = 0;
    actualizarTicketVisual();
}

btnNuevo.addEventListener("click", () => {
    if (carrito.length > 0) {
        if (confirm("¿Vaciar pedido actual?")) limpiarCarrito();
    }
});

// --- 7. PANEL ADMINISTRADOR (Agregar Productos con IMAGEN REAL) ---
const btnCrear = document.getElementById("btn-crear-producto");
const contenedorProductos = document.getElementById("contenedor-productos");

// Elementos del formulario de carga
const inputNombre = document.getElementById("nuevo-nombre");
const inputPrecio = document.getElementById("nuevo-precio");
const inputFoto = document.getElementById("nuevo-foto"); // <input type="file" id="nuevo-foto">

btnCrear.addEventListener("click", () => {
    const nombre = inputNombre.value;
    const precio = inputPrecio.value;
    const archivos = inputFoto.files; // Capturamos los archivos subidos

    // Validaciones básicas
    if (nombre === "" || precio === "") {
        alert("Por favor, completa nombre y precio.");
        return;
    }

    if (archivos.length === 0) {
        alert("Por favor, selecciona una imagen para el producto.");
        return;
    }

    const imagenSubida = archivos[0]; // Tomamos la primera imagen

    // Verificación de que sea una imagen
    if (!imagenSubida.type.startsWith('image/')) {
        alert("El archivo seleccionado debe ser una imagen (jpg, png, etc.).");
        return;
    }

    // --- LÓGICA DE VISUALIZACIÓN DE IMAGEN (FileReader) ---
    // Esta API de JS permite leer el archivo local y convertirlo en una URL usable instantáneamente.
    const reader = new FileReader();
    
    // Definimos qué pasa cuando la lectura termina exitosamente
    reader.onload = function(e) {
        const urlImagenFinal = e.target.result; // Esta es la URL de base64 de la imagen local
        
        // Llamamos a crear la tarjeta pasando la URL generada
        crearTarjetaProducto(nombre, precio, urlImagenFinal);
        
        // Limpiamos los inputs para la próxima carga
        inputNombre.value = "";
        inputPrecio.value = "";
        inputFoto.value = ""; // Limpia el selector de archivos
    };

    // Iniciamos la lectura del archivo
    reader.readAsDataURL(imagenSubida);
});

function crearTarjetaProducto(nombre, precio, urlImagen) {
    const nuevaTarjeta = document.createElement("div");
    nuevaTarjeta.classList.add("producto");

    nuevaTarjeta.innerHTML = `
        <div class="foto">
            <img src="${urlImagen}" alt="${nombre}" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        <h3>${nombre}</h3>
        <p class="precio">$${parseInt(precio).toLocaleString('es-AR')} </p>
        <button class="agregar">Agregar</button>
    `;

    // AGREGAMOS EL BOTÓN DE EDITAR AL PRODUCTO NUEVO
    const precioTag = nuevaTarjeta.querySelector(".precio");
    const btnEditar = document.createElement("button");
    btnEditar.innerText = "✏️";
    btnEditar.style.marginLeft = "10px";
    btnEditar.style.background = "transparent";
    btnEditar.style.border = "none";
    btnEditar.style.cursor = "pointer";
    btnEditar.onclick = () => editarPrecio(btnEditar);
    precioTag.appendChild(btnEditar);

    // Evento de agregar al carrito (ya lo tenías)
    const botonNuevo = nuevaTarjeta.querySelector(".agregar");
    botonNuevo.addEventListener("click", () => {
        // Obtenemos el precio actual por si fue editado recién
        const precioActualizado = parseFloat(precioTag.innerText.replace("$", "").replace(/\./g, ""));
        agregarAlCarrito(nombre, precioActualizado);
    });

    contenedorProductos.appendChild(nuevaTarjeta);
}
// --- 8. FUNCIÓN PARA EDITAR PRECIOS ---
function editarPrecio(boton) {
    const tarjeta = boton.closest(".producto");
    const nombreProducto = tarjeta.querySelector("h3").innerText;
    const precioActualHTML = tarjeta.querySelector(".precio");
    
    // Pedimos el nuevo precio al encargado
    const nuevoPrecio = prompt(`Nuevo precio para ${nombreProducto}:`, "0");

    // Validamos que sea un número válido y no esté vacío
    if (nuevoPrecio !== null && nuevoPrecio !== "" && !isNaN(nuevoPrecio)) {
        const precioFormateado = parseFloat(nuevoPrecio);
        precioActualHTML.innerText = `$${precioFormateado.toLocaleString('es-AR')}`;
        
        // Si usaras LocalStorage, aquí deberías actualizar la base de datos local
        alert("Precio actualizado con éxito");
    } else if (nuevoPrecio !== null) {
        alert("Por favor, ingresá un número válido.");
    }
}

// ASIGNAR EVENTO EDITAR A LOS PRODUCTOS QUE YA EXISTEN EN EL HTML
// (Ejecutar esto al cargar la página)
document.querySelectorAll(".producto").forEach(tarjeta => {
    // Creamos el botón de editar dinámicamente para no tocar tanto el HTML manual
    const btnEditar = document.createElement("button");
    btnEditar.innerText = "✏️";
    btnEditar.style.marginLeft = "10px";
    btnEditar.style.cursor = "pointer";
    btnEditar.style.border = "none";
    btnEditar.style.background = "transparent";
    btnEditar.onclick = () => editarPrecio(btnEditar);
    
    tarjeta.querySelector(".precio").appendChild(btnEditar);
});