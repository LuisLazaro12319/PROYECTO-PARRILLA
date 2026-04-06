// --- VARIABLES DE ESTADO ---
let carrito = [];
let total = 0;
let historialVentas = [];
let recaudacionTotal = 0;

// --- ELEMENTOS UI ---
const contenedorProductos = document.getElementById("contenedor-productos");
const listaCarritoUI = document.getElementById("lista-carrito");
const precioTotalUI = document.getElementById("precio-total");

// --- SINCRONIZACIÓN EN TIEMPO REAL CON FIREBASE ---
window.addEventListener("DOMContentLoaded", () => {
    // Escuchar Productos
    db.collection("productos").orderBy("fecha", "desc").onSnapshot((snapshot) => {
        contenedorProductos.innerHTML = ""; 
        snapshot.forEach((doc) => {
            const p = doc.data();
            renderizarProducto(p.nombre, p.precio, p.urlImagen);
        });
    });

    // Escuchar Ventas (Recaudación)
    db.collection("ventas").onSnapshot((snapshot) => {
        historialVentas = snapshot.docs.map(doc => doc.data());
        recaudacionTotal = historialVentas.reduce((acc, v) => acc + v.totalVenta, 0);
        document.getElementById("cant-ventas").innerText = historialVentas.length;
        document.getElementById("recaudacion-total").innerText = `$${recaudacionTotal.toLocaleString('es-AR')}`;
    });
});

// --- RENDERIZAR Y AGREGAR ---
function renderizarProducto(nombre, precio, urlImagen) {
    const div = document.createElement("div");
    div.classList.add("producto");
    div.innerHTML = `
        <div class="foto"><img src="${urlImagen}" style="width:100%;height:100%;object-fit:cover;"></div>
        <h3>${nombre}</h3>
        <p class="precio">$${parseInt(precio).toLocaleString('es-AR')}</p>
        <button class="btn-agregar">Agregar</button>
    `;
    div.querySelector(".btn-agregar").onclick = () => agregarAlCarrito(nombre, precio);
    contenedorProductos.appendChild(div);
}

function agregarAlCarrito(nombre, precio) {
    const existe = carrito.find(p => p.nombre === nombre);
    if (existe) { existe.cantidad++; } 
    else { carrito.push({ nombre, precio, cantidad: 1 }); }
    total += parseFloat(precio);
    actualizarTicketVisual();
}

function actualizarTicketVisual() {
    listaCarritoUI.innerHTML = "";
    carrito.forEach((p, index) => {
        const li = document.createElement("li");
        li.innerHTML = `${p.cantidad}x ${p.nombre} - $${(p.precio * p.cantidad).toLocaleString('es-AR')} 
                        <button onclick="eliminar(${index})">❌</button>`;
        listaCarritoUI.appendChild(li);
    });
    precioTotalUI.innerText = `$${total.toLocaleString('es-AR')}`;
}

// --- GUARDAR PRODUCTO (CON OPTIMIZACIÓN DE IMAGEN) ---
document.getElementById("btn-crear-producto").addEventListener("click", () => {
    const nombre = document.getElementById("nuevo-nombre").value;
    const precio = document.getElementById("nuevo-precio").value;
    const file = document.getElementById("nuevo-foto").files[0];

    if (!nombre || !precio || !file) return alert("Completa los campos");

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
            // Achicamos la foto para que no pese nada y no laguee
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
            });
            alert("Producto guardado en la nube!");
        };
    };
    reader.readAsDataURL(file);
});

// --- PROCESAR VENTA ---
function procesarVenta(tipo) {
    if (carrito.length === 0) return;

    const venta = {
        totalVenta: total,
        tipo: tipo,
        fecha: new Date(),
        hora: new Date().toLocaleTimeString(),
        items: [...carrito]
    };

    db.collection("ventas").add(venta);
    imprimirTicket(venta);
    carrito = []; total = 0; actualizarTicketVisual();
}

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
            body { width: 48mm; font-family: 'Courier New', monospace; font-size: 9pt; line-height: 1.1; padding: 2mm; }
            .t { border-bottom: 1px dashed #000; margin-bottom: 5px; padding-bottom: 5px; }
            h2 { text-align: center; font-size: 11pt; margin: 2px 0; }
        </style></head><body>
            <div class="t"><h2>🥩 PARRILLA EL DUEÑO</h2><hr>${filas}<hr><b>TOTAL: $${venta.totalVenta.toLocaleString('es-AR')}</b></div>
            <div class="t"><div style="border:1px solid #000;text-align:center"><b>${venta.tipo}</b></div><h2>🔥 COCINA</h2><hr>${filas}</div>
        </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
}

// Vincular botones de pedido
document.getElementById("btn-mesa").onclick = () => procesarVenta("MESA");
document.getElementById("btn-llevar").onclick = () => procesarVenta("LLEVAR");