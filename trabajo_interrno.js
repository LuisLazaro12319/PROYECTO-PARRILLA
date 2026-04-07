// --- VARIABLES DE ESTADO ---
let carrito = [];
let total = 0;
let historialVentas = [];
let recaudacionTotal = 0;

// --- ELEMENTOS UI ---
const contenedorProductos = document.getElementById("contenedor-productos");
const listaCarritoUI = document.getElementById("lista-carrito");
const precioTotalUI = document.getElementById("precio-total");

// --- 1. SINCRONIZACIÓN EN TIEMPO REAL ---
window.addEventListener("DOMContentLoaded", () => {
    // Escuchar Productos
    // Dentro del window.addEventListener("DOMContentLoaded", () => { ...
db.collection("productos").orderBy("fecha", "desc").onSnapshot((snapshot) => {
    if (contenedorProductos) {
        contenedorProductos.innerHTML = ""; 
        snapshot.forEach((doc) => {
            const p = doc.data();
            // Le pasamos el ID del documento como cuarto parámetro
            renderizarProducto(p.nombre, p.precio, p.urlImagen, doc.id);
        });
    }
});

    // Escuchar Ventas
    db.collection("ventas").onSnapshot((snapshot) => {
        historialVentas = snapshot.docs.map(doc => doc.data());
        recaudacionTotal = historialVentas.reduce((acc, v) => acc + (v.totalVenta || 0), 0);
        
        const cantVentasUI = document.getElementById("cant-ventas");
        const recTotalUI = document.getElementById("recaudacion-total");
        
        if(cantVentasUI) cantVentasUI.innerText = historialVentas.length;
        if(recTotalUI) recTotalUI.innerText = `$${recaudacionTotal.toLocaleString('es-AR')}`;
    });
});



// BUSCADOR (Para que el botón de buscar funcione)
document.getElementById("btn-buscar").onclick = () => {
    const term = document.getElementById("buscar").value.toLowerCase();
    document.querySelectorAll(".producto").forEach(p => {
        const nombre = p.querySelector("h3").innerText.toLowerCase();
        p.style.display = nombre.includes(term) ? "block" : "none";
    });
};

// --- 3. CARRITO ---
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

// --- 4. GUARDAR PRODUCTO NUEVO ---
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

// --- 5. VENTAS e HISTORIAL (CORREGIDO) ---
function procesarVenta(tipo) {
    if (carrito.length === 0) return alert("El carrito está vacío");

    // Creamos un texto amigable con los productos para el historial rápido
    const detalleTexto = carrito.map(p => `${p.cantidad}x ${p.nombre}`).join(", ");

    const venta = {
        totalVenta: total,
        tipo: tipo,
        fecha: new Date().toLocaleDateString('es-AR'),
        hora: new Date().toLocaleTimeString('es-AR'),
        detalle: detalleTexto, // Guardamos el texto ya armado
        items: [...carrito],    // Guardamos los objetos por si los necesitas para otra cosa
        timestamp: firebase.firestore.FieldValue.serverTimestamp() // Para ordenar por tiempo real
    };

    // 1. Guardamos en Firebase (Esto disparará el contador automáticamente gracias al Snapshot del inicio)
    db.collection("ventas").add(venta)
    .then(() => {
        console.log("Venta registrada en la nube");
        // 2. Disparamos la impresión
        imprimirTicket(venta);
        // 3. Vaciamos todo para el siguiente cliente
        carrito = []; 
        total = 0; 
        actualizarTicketVisual();
    })
    .catch((error) => {
        alert("Error al registrar venta: " + error);
    });
}

// Botones de acción principal
document.getElementById("btn-mesa").onclick = () => procesarVenta("MESA");
document.getElementById("btn-llevar").onclick = () => procesarVenta("LLEVAR");

// Botón para cancelar pedido actual (Limpiar)
document.getElementById("btn-nuevo-pedido").onclick = () => {
    if(confirm("¿Vaciar el carrito actual?")) {
        carrito = []; 
        total = 0; 
        actualizarTicketVisual();
    }
};

// VER HISTORIAL (Mejorado para mostrar productos)
document.getElementById("btn-ver-historial").onclick = () => {
    const div = document.getElementById("contenedor-historial-visual");
    const lista = document.getElementById("lista-ventas-desplegable");
    
    // Toggle de visibilidad
    div.style.display = div.style.display === "none" ? "block" : "none";
    
    // Ordenamos las ventas de la más nueva a la más vieja
    const ventasOrdenadas = [...historialVentas].reverse();

    lista.innerHTML = ventasOrdenadas.map(v => `
        <div style="border-bottom:1px solid #555; padding:10px; background: rgba(255,255,255,0.05); margin-bottom:5px; border-radius:5px;">
            <div style="display:flex; justify-content:space-between;">
                <small style="color:#f39c12;">${v.fecha} ${v.hora}</small>
                <b style="color:${v.tipo === 'MESA' ? '#2980b9' : '#27ae60'};">${v.tipo}</b>
            </div>
            <div style="margin-top:5px; font-size: 0.9rem;">
                ${v.detalle || "Sin detalle"}
            </div>
            <div style="text-align:right; font-weight:bold; margin-top:5px; color:#27ae60;">
                Total: $${v.totalVenta.toLocaleString('es-AR')}
            </div>
        </div>
    `).join("");
};
// --- 6. IMPRESIÓN ---
function imprimirTicket(venta) {
    const win = window.open('', '', 'width=500,height=700');
    let filas = "";
    venta.items.forEach(i => {
        filas += `<div style="display:flex;justify-content:space-between">
                    <span>${i.cantidad} x ${i.nombre}</span>
                    <span>$${(i.precio * i.cantidad).toLocaleString('es-AR')}</span>
                  </div>`;
    });

    win.document.write(`
        <html><head><style>
            @page { size: 58mm auto; margin: 0; }
            body { width: 48mm; font-family: 'Courier New', monospace; font-size: 12pt; padding: 2mm;font-weight: bold; }
            .t { border-bottom: 1px dashed #000; margin-bottom: 5px; padding-bottom: 5px; }
            h2 { text-align: center; margin: 2px 0; font-size: 13pt; }
        </style></head><body>
            
            <div class="t"><div style="border:1px solid #000; text-align:center; font-size: 20pt; padding: 10px; margin: 5px 0;">
    <b>${venta.tipo}</b></div><h2>🔥TICKET</h2><hr>${filas}</div>
        </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
}
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
        <h3 >${nombre}</h3>
        <p class="precio" onclick="editarPrecio('${id}', '${precio}')" style="cursor:pointer;" title="Click para editar precio">
    $${parseInt(precio).toLocaleString('es-AR')} ✏️
</p>
        <button class="btn-agregar" style="padding: 10px; width: 100%; cursor: pointer;">Agregar</button>
    `;
    div.querySelector(".btn-agregar").onclick = () => agregarAlCarrito(nombre, precio);
    contenedorProductos.appendChild(div);
}
// --- FUNCIÓN PARA BORRAR PRODUCTO DE LA NUBE ---
window.eliminarProductoBase = function(id) {
    if (confirm("¿Estás seguro de que quieres eliminar este producto de la tienda?")) {
        db.collection("productos").doc(id).delete()
        .then(() => {
            alert("Producto eliminado correctamente.");
        })
        .catch((error) => {
            console.error("Error al eliminar: ", error);
            alert("No se pudo eliminar el producto.");
        });
    }
};
window.editarPrecio = function(id, precioActual) {
    // 1. Pedimos el nuevo precio al usuario
    const nuevoPrecio = prompt("Ingrese el nuevo precio para el producto:", precioActual);

    // 2. Validamos que no sea nulo, que no esté vacío y que sea un número
    if (nuevoPrecio !== null && nuevoPrecio.trim() !== "") {
        const precioNum = parseFloat(nuevoPrecio);

        if (!isNaN(precioNum)) {
            // 3. Actualizamos en Firebase
            db.collection("productos").doc(id).update({
                precio: precioNum
            })
            .then(() => {
                alert("✅ Precio actualizado correctamente");
            })
            .catch((error) => {
                console.error("Error al actualizar: ", error);
                alert("❌ No se pudo actualizar el precio");
            });
        } else {
            alert("⚠️ Por favor, ingrese un número válido.");
        }
    }
};
// --- FUNCIÓN: GENERAR PDF ---
document.getElementById("btn-descargar-pdf").onclick = () => {
    if (historialVentas.length === 0) return alert("No hay ventas para exportar");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Título del PDF
    doc.setFontSize(18);
    doc.text("Reporte de Ventas Diarias - Parrilla", 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Fecha del reporte: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Recaudación Total: $${recaudacionTotal.toLocaleString('es-AR')}`, 14, 37);

    // Armamos la tabla
    const filas = historialVentas.map(v => [
        v.fecha + " " + (v.hora || ""),
        v.tipo,
        v.detalle || "Sin detalle",
        `$${v.totalVenta.toLocaleString('es-AR')}`
    ]);

    doc.autoTable({
        startY: 45,
        head: [['Fecha/Hora', 'Tipo', 'Productos', 'Total']],
        body: filas,
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] } // Gris oscuro tipo tu panel
    });

    doc.save(`Ventas_${new Date().toLocaleDateString()}.pdf`);
};

// --- FUNCIÓN: BORRAR HISTORIAL (REINICIAR DÍA) ---
document.getElementById("btn-borrar-historial").onclick = async () => {
    const confirmacion = confirm("⚠️ ¿Estás seguro? Esto borrará TODAS las ventas del historial y pondrá la caja en $0. ¡Asegurate de haber descargado el PDF antes!");
    
    if (confirmacion) {
        try {
            // Firebase no deja borrar colecciones enteras de un tiro en la web, hay que borrar doc por doc
            const snapshot = await db.collection("ventas").get();
            const batch = db.batch();

            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            alert("✅ Historial borrado. Caja reiniciada.");
        } catch (error) {
            console.error("Error al borrar historial: ", error);
            alert("No se pudo borrar el historial.");
        }
    }
};