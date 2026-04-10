// ================================================================
// 1. VARIABLES DE ESTADO Y CONFIGURACIÓN INICIAL
// Uso: Almacenan la información temporal de la sesión actual (carrito, total acumulado, etc.)
// ================================================================
let carrito = [];
let total = 0;
let historialVentas = [];
let recaudacionTotal = 0;

const contenedorProductos = document.getElementById("contenedor-productos");
const listaCarritoUI = document.getElementById("lista-carrito");
const precioTotalUI = document.getElementById("precio-total");

// ================================================================
// 2. SINCRONIZACIÓN CON FIREBASE (TIEMPO REAL)
// Uso: Escucha cambios en la base de datos. Si agregas un producto o haces una venta
// desde otro celular, la pantalla se actualiza sola sin refrescar.
// ================================================================
window.addEventListener("DOMContentLoaded", () => {
    // Escuchar Productos: Trae la lista de comida cargada
    db.collection("productos").orderBy("fecha", "desc").onSnapshot((snapshot) => {
        if (contenedorProductos) {
            contenedorProductos.innerHTML = ""; 
            snapshot.forEach((doc) => {
                const p = doc.data();
                renderizarProducto(p.nombre, p.precio, p.urlImagen, doc.id);
            });
        }
    });

    // --- 1. SINCRONIZACIÓN EN TIEMPO REAL (HISTORIAL ORDENADO) ---

// Escuchar Ventas con Orden Cronológico
// Usamos .orderBy("timestamp", "desc") para que Firebase mande primero lo más nuevo
db.collection("ventas").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
    historialVentas = snapshot.docs.map(doc => doc.data());
    
    // Calculamos la recaudación (esto sigue igual)
    recaudacionTotal = historialVentas.reduce((acc, v) => acc + (v.totalVenta || 0), 0);
    
    const cantVentasUI = document.getElementById("cant-ventas");
    const recTotalUI = document.getElementById("recaudacion-total");
    
    if(cantVentasUI) cantVentasUI.innerText = historialVentas.length;
    if(recTotalUI) recTotalUI.innerText = `$${recaudacionTotal.toLocaleString('es-AR')}`;
});
});

// ================================================================
// 3. BUSCADOR DE PRODUCTOS
// Uso: Filtra visualmente los productos en pantalla según lo que escribas.
// ================================================================
document.getElementById("btn-buscar").onclick = () => {
    const term = document.getElementById("buscar").value.toLowerCase();
    document.querySelectorAll(".producto").forEach(p => {
        const nombre = p.querySelector("h3").innerText.toLowerCase();
        p.style.display = nombre.includes(term) ? "block" : "none";
    });
};

// ================================================================
// 4. LÓGICA DEL CARRITO (TICKET ACTUAL)
// Uso: Gestiona qué productos se están seleccionando antes de confirmar la venta.
// ================================================================
function agregarAlCarrito(nombre, precio) {
    const existe = carrito.find(p => p.nombre === nombre);
    if (existe) { existe.cantidad++; } 
    else { carrito.push({ nombre, precio: parseFloat(precio), cantidad: 1 }); }
    total += parseFloat(precio);
    actualizarTicketVisual();
}

function actualizarTicketVisual() {
    if (!listaCarritoUI) return;
    listaCarritoUI.innerHTML = carrito.length === 0 ? '<p>El carrito está vacío</p>' : "";
    carrito.forEach((p, index) => {
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.innerHTML = `<span>${p.cantidad}x ${p.nombre}</span> 
                        <span>$${(p.precio * p.cantidad).toLocaleString('es-AR')} 
                        <button onclick="eliminar(${index})" style="border:none; background:none; cursor:pointer;">❌</button></span>`;
        listaCarritoUI.appendChild(li);
    });
    precioTotalUI.innerText = `$${total.toLocaleString('es-AR')}`;
}

window.eliminar = function(index) {
    total -= (carrito[index].precio * carrito[index].cantidad);
    carrito.splice(index, 1);
    actualizarTicketVisual();
};

// ================================================================
// 5. GESTIÓN DE PRODUCTOS (ALTAS, BAJAS Y EDICIÓN)
// Uso: Funciones exclusivas del administrador para manejar el catálogo de la tienda.
// ================================================================

// Crear Producto Nuevo (con compresión de imagen en Canvas)
document.getElementById("btn-crear-producto").onclick = () => {
    const nombre = document.getElementById("nuevo-nombre").value; 
    const precio = document.getElementById("nuevo-precio").value;
    const file = document.getElementById("nuevo-foto").files[0];

    if (!nombre || !precio || !file) return alert("Completa los campos");

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = 300;
            canvas.height = (img.height * 300) / img.width;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const fotoLiviana = canvas.toDataURL("image/jpeg", 0.7);

            db.collection("productos").add({
                nombre,
                precio: parseFloat(precio),
                urlImagen: fotoLiviana,
                fecha: new Date()
            }).then(() => {
                alert("¡Producto añadido!");
                document.getElementById("nuevo-nombre").value = "";
                document.getElementById("nuevo-precio").value = "";
            });
        };
    };
    reader.readAsDataURL(file);
};

// Borrar producto de la base de datos
window.eliminarProductoBase = function(id) {
    if (confirm("¿Estás seguro de que quieres eliminar este producto de la tienda?")) {
        db.collection("productos").doc(id).delete()
        .then(() => alert("Producto eliminado correctamente."))
        .catch((error) => alert("No se pudo eliminar el producto."));
    }
};

// Editar precio de un producto existente
window.editarPrecio = function(id, precioActual) {
    const nuevoPrecio = prompt("Ingrese el nuevo precio para el producto:", precioActual);
    if (nuevoPrecio !== null && nuevoPrecio.trim() !== "") {
        const precioNum = parseFloat(nuevoPrecio);
        if (!isNaN(precioNum)) {
            db.collection("productos").doc(id).update({ precio: precioNum })
            .then(() => alert("✅ Precio actualizado correctamente"))
            .catch(() => alert("❌ No se pudo actualizar"));
        } else {
            alert("⚠️ Ingrese un número válido.");
        }
    }
};

// Dibujar el producto en la pantalla principal
function renderizarProducto(nombre, precio, urlImagen, id) { 
    const div = document.createElement("div");
    div.classList.add("producto");
    div.innerHTML = `
        <div class="foto" style="position: relative;">
            <img src="${urlImagen}">
            <button class="btn-eliminar-prod" onclick="eliminarProductoBase('${id}')" 
                style="position: absolute; top: 5px; right: 5px; background: rgba(255,0,0,0.7); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; z-index: 10;">
                🗑️
            </button>
        </div>
        <h3>${nombre}</h3>
        <p class="precio" onclick="editarPrecio('${id}', '${precio}')" style="cursor:pointer;" title="Click para editar precio">
            $${parseFloat(precio).toLocaleString('es-AR')} ✏️
        </p>
        <button class="btn-agregar" style="padding: 10px; width: 100%; cursor: pointer;">Agregar</button>
    `;
    div.querySelector(".btn-agregar").onclick = () => agregarAlCarrito(nombre, precio);
    contenedorProductos.appendChild(div);
}

// ================================================================
// 6. PROCESAMIENTO DE VENTAS
// Uso: Finaliza el pedido, guarda en la nube y dispara el ticket físico.
// ================================================================
function procesarVenta(tipo) {
    if (carrito.length === 0) return alert("El carrito está vacío");

    const ahora = new Date();
    const venta = {
        totalVenta: total,
        tipo: tipo,
        fecha: ahora.toLocaleDateString('es-AR'),
        hora: ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), 
        detalle: carrito.map(p => `${p.cantidad}x ${p.nombre}`).join(", "),
        items: [...carrito],
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection("ventas").add(venta)
    .then(() => {
        imprimirTicket(venta);
        carrito = []; 
        total = 0; 
        actualizarTicketVisual();
    })
    .catch((error) => alert("Error al registrar venta: " + error));
}

document.getElementById("btn-mesa").onclick = () => procesarVenta("MESA");
document.getElementById("btn-llevar").onclick = () => procesarVenta("LLEVAR");
document.getElementById("btn-nuevo-pedido").onclick = () => { 
    if(confirm("¿Vaciar el carrito?")) { carrito = []; total = 0; actualizarTicketVisual(); } 
};

// ================================================================
// 7. HISTORIAL VISUAL Y REPORTES (PDF)
// Uso: Visualiza ventas pasadas y genera documentos de cierre de caja.
// ================================================================
document.getElementById("btn-ver-historial").onclick = () => {
    const div = document.getElementById("contenedor-historial-visual");
    const lista = document.getElementById("lista-ventas-desplegable");
    div.style.display = div.style.display === "none" ? "block" : "none";
    
    // Mostramos lo más nuevo arriba
    const ventasOrdenadas = historialVentas;
    lista.innerHTML = ventasOrdenadas.map(v => `
        <div style="border-bottom:1px solid #555; padding:10px; background: rgba(255,255,255,0.05); margin-bottom:5px; border-radius:5px;">
            <div style="display:flex; justify-content:space-between;">
                <small style="color:#f39c12;">${v.fecha} ${v.hora}</small>
                <b style="color:${v.tipo === 'MESA' ? '#2980b9' : '#27ae60'};">${v.tipo}</b>
            </div>
            <div style="margin-top:5px; font-size: 0.9rem;">${v.detalle || "Sin detalle"}</div>
            <div style="text-align:right; font-weight:bold; margin-top:5px; color:#27ae60;">
                Total: $${v.totalVenta.toLocaleString('es-AR')}
            </div>
        </div>
    `).join("");
};

document.getElementById("btn-descargar-pdf").onclick = () => {
    if (historialVentas.length === 0) return alert("No hay ventas");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Reporte de Ventas Diarias - Parrilla", 14, 20);
    doc.setFontSize(11);
    doc.text(`Fecha: ${new Date().toLocaleDateString()} | Total: $${recaudacionTotal.toLocaleString('es-AR')}`, 14, 30);

    const filas = historialVentas.map(v => [v.fecha + " " + (v.hora || ""), v.tipo, v.detalle, `$${v.totalVenta.toLocaleString('es-AR')}`]);
    doc.autoTable({ startY: 40, head: [['Fecha/Hora', 'Tipo', 'Productos', 'Total']], body: filas });
    doc.save(`Ventas_${new Date().toLocaleDateString()}.pdf`);
};

document.getElementById("btn-borrar-historial").onclick = async () => {
    if (confirm("⚠️ ¿Borrar TODA la caja diaria? Descargá el PDF primero.")) {
        const snapshot = await db.collection("ventas").get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        alert("✅ Caja reiniciada.");
    }
};

// ================================================================
// 8. FUNCIÓN DE IMPRESIÓN (TICKETERA)
// Uso: Crea una ventana temporal con formato de 58mm para imprimir el ticket físico.
// ================================================================
function imprimirTicket(venta) {
    const win = window.open('', '', 'width=500,height=700');
    let filas = "";
    venta.items.forEach(i => {
        filas += `<div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                    <span>${i.cantidad} x ${i.nombre}</span>
                    <span>$${(i.precio * i.cantidad).toLocaleString('es-AR')}</span>
                  </div>`;
    });

    win.document.write(`
        <html><head><style>
            @page { size: 58mm auto; margin: 0; }
            body { width: 48mm; font-family: 'Courier New', monospace; font-size: 11pt; padding: 2mm; font-weight: bold; color: #000; }
            .ticket-border { border-bottom: 1px dashed #000; margin-bottom: 5px; padding-bottom: 5px; }
            .tipo-pedido { border: 1px solid #000; text-align: center; font-size: 18pt; padding: 8px; margin: 5px 0; }
            h2 { text-align: center; margin: 5px 0 2px 0; font-size: 14pt; }
            .fecha-hora { text-align: center; font-size: 9pt; margin-bottom: 8px; display: block; }
            .total-box { display: flex; justify-content: space-between; font-size: 15pt; margin-top: 8px; border-top: 1px solid #000; padding-top: 5px; }
        </style></head>
        <body>
            <div class="ticket-border">
                <div class="tipo-pedido"><b>${venta.tipo}</b></div>
                <h2>🔥 TICKET 🔥</h2>
                <span class="fecha-hora">${venta.fecha} - ${venta.hora}</span>
                <div style="margin-top: 10px;">${filas}</div>
                <div class="total-box"><span>TOTAL:</span><span>$${venta.totalVenta.toLocaleString('es-AR')}</span></div>
            </div>
            <div style="text-align:center; font-size:8pt; margin-top:10px;">*** Gracias por su compra ***</div>
        </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
}