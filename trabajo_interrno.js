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

// --- 2. LÓGICA DE PRODUCTOS ---
function renderizarProducto(nombre, precio, urlImagen) {
    const div = document.createElement("div");
    div.classList.add("producto");
    div.innerHTML = `
        <div class="foto"><img src="${urlImagen}" style="width:100%;height:150px;object-fit:cover;"></div>
        <h3>${nombre}</h3>
        <p class="precio">$${parseInt(precio).toLocaleString('es-AR')}</p>
        <button class="btn-agregar">Agregar</button>
    `;
    div.querySelector(".btn-agregar").onclick = () => agregarAlCarrito(nombre, precio);
    contenedorProductos.appendChild(div);
}

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

// --- 5. VENTAS e HISTORIAL ---
function procesarVenta(tipo) {
    if (carrito.length === 0) return alert("Carrito vacío");
    const venta = {
        totalVenta: total,
        tipo: tipo,
        fecha: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString(),
        items: [...carrito]
    };
    db.collection("ventas").add(venta);
    imprimirTicket(venta);
    carrito = []; total = 0; actualizarTicketVisual();
}

document.getElementById("btn-mesa").onclick = () => procesarVenta("MESA");
document.getElementById("btn-llevar").onclick = () => procesarVenta("LLEVAR");
document.getElementById("btn-nuevo-pedido").onclick = () => { carrito = []; total = 0; actualizarTicketVisual(); };

// VER HISTORIAL
document.getElementById("btn-ver-historial").onclick = () => {
    const div = document.getElementById("contenedor-historial-visual");
    const lista = document.getElementById("lista-ventas-desplegable");
    div.style.display = div.style.display === "none" ? "block" : "none";
    
    lista.innerHTML = historialVentas.map(v => `
        <div style="border-bottom:1px solid #555; padding:5px;">
            <small>${v.fecha} ${v.hora} - <b>${v.tipo}</b></small><br>
            Total: $${v.totalVenta.toLocaleString('es-AR')}
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
            body { width: 48mm; font-family: 'Courier New', monospace; font-size: 9pt; padding: 2mm; }
            .t { border-bottom: 1px dashed #000; margin-bottom: 5px; padding-bottom: 5px; }
            h2 { text-align: center; margin: 2px 0; }
        </style></head><body>
            <div class="t"><h2>🥩 PARRILLA EL DUEÑO</h2><hr>${filas}<hr><b>TOTAL: $${venta.totalVenta.toLocaleString('es-AR')}</b></div>
            <div class="t"><div style="border:1px solid #000;text-align:center"><b>${venta.tipo}</b></div><h2>🔥 COCINA</h2><hr>${filas}</div>
        </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
}
function renderizarProducto(nombre, precio, urlImagen, id) { // Agregamos 'id'
    const div = document.createElement("div");
    div.classList.add("producto");
    div.innerHTML = `
        <div class="foto" style="position: relative;">
            <img src="${urlImagen}" style="width:100%;height:150px;object-fit:cover;">
            <button class="btn-eliminar-prod" onclick="eliminarProductoBase('${id}')" 
                style="position: absolute; top: 5px; right: 5px; background: rgba(255,0,0,0.7); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">
                🗑️
            </button>
        </div>
        <h3>${nombre}</h3>
        <p class="precio">$${parseInt(precio).toLocaleString('es-AR')}</p>
        <button class="btn-agregar">Agregar</button>
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