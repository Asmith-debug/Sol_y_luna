// =========================================================================
// CONFIGURACIÓN Y REFERENCIAS GLOBALES
// =========================================================================
const API_VENTAS_URL = 'http://127.0.0.1:8000/api/ventas';

let idVentaGlobal = null;
let ventaGlobalData = null; 

// Referencias a los dos cuerpos de tabla
const tablaCuerpoActivas = document.getElementById('tablaCuerpoActivas'); 
const tablaCuerpoHistorial = document.getElementById('tablaCuerpoHistorial'); 

const modalConfirmarDevolucion = new bootstrap.Modal(document.getElementById('modalConfirmarDevolucion'));
const btnConfirmarDevolucionModal = document.getElementById('btnConfirmarDevolucionModal');

// =========================================================================
// FUNCIÓN PRINCIPAL DE CARGA DE DATOS
// =========================================================================
async function cargarDatosDevoluciones() {
    // 1. Mostrar estado de carga en ambas tablas
    tablaCuerpoActivas.innerHTML = `<tr><td colspan="7" class="text-center py-5"><i class="fas fa-sync fa-spin me-2"></i> Cargando ventas activas...</td></tr>`;
    tablaCuerpoHistorial.innerHTML = `<tr><td colspan="7" class="text-center py-5"><i class="fas fa-sync fa-spin me-2"></i> Cargando historial...</td></tr>`;

    try {
        const response = await fetch(API_VENTAS_URL, {
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`Fallo de red: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        const ventasData = Array.isArray(result) ? result : result.data || []; 
        
        // 2. Filtrar los datos en dos conjuntos
        const ventasActivas = ventasData.filter(v => !v.venta_devuelta);
        const ventasDevueltas = ventasData.filter(v => v.venta_devuelta);
        
        // 3. Renderizar ambas tablas
        renderizarTablaActivas(ventasActivas);
        renderizarTablaHistorial(ventasDevueltas);

    } catch (error) {
        console.error('Error al cargar las ventas:', error);
        const errorMessage = `<tr><td colspan="7" class="text-center py-5 text-danger">Error al cargar datos del servidor: ${error.message}</td></tr>`;
        tablaCuerpoActivas.innerHTML = errorMessage;
        tablaCuerpoHistorial.innerHTML = errorMessage;
    }
}

// =========================================================================
// RENDERIZADO DE TABLA 1: VENTAS ACTIVAS
// =========================================================================
function renderizarTablaActivas(ventasActivas) {
    tablaCuerpoActivas.innerHTML = '';
    
    if (ventasActivas.length === 0) {
        tablaCuerpoActivas.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">No hay ventas activas registradas para devolver.</td></tr>`;
        asignarEventosDevolucion([]); 
        return;
    }

    ventasActivas.forEach(venta => {
        const id = venta.id;
        const productoNombre = venta.producto ? venta.producto.producto_nombre : 'Producto Desconocido'; 
        const cantidad = venta.venta_cantidad;
        const precioUnitario = venta.producto ? venta.producto.producto_precio_venta : 0; 
        const totalVenta = cantidad * precioUnitario; 
        const fecha = venta.venta_fecha; 
        const vendedorNombre = venta.usuario ? venta.usuario.usuario_nombre : 'N/A';
        
        const accionBtn = `
            <button class="btn btn-sm btn-danger btn-iniciar-devolucion" 
                data-id-venta="${id}"
                data-producto="${productoNombre}"
                data-cantidad="${cantidad}">
                <i class="fas fa-undo me-1"></i> Devolver
             </button>`;

        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${id}</td>
            <td>${productoNombre}</td>
            <td>${cantidad}</td>
            <td>$${totalVenta.toLocaleString()}</td>
            <td>${fecha}</td>
            <td>${vendedorNombre}</td>
            <td>${accionBtn}</td>
        `;
        tablaCuerpoActivas.appendChild(fila);
    });

    asignarEventosDevolucion(ventasActivas);
}

// =========================================================================
// RENDERIZADO DE TABLA 2: HISTORIAL DE DEVOLUCIONES
// =========================================================================
function renderizarTablaHistorial(ventasDevueltas) {
    tablaCuerpoHistorial.innerHTML = '';
    
    if (ventasDevueltas.length === 0) {
        tablaCuerpoHistorial.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">Aún no se han realizado devoluciones.</td></tr>`;
        return;
    }

    ventasDevueltas.forEach(venta => {
        const id = venta.id;
        const productoNombre = venta.producto ? venta.producto.producto_nombre : 'Producto Desconocido'; 
        const cantidad = venta.venta_cantidad;
        const precioUnitario = venta.producto ? venta.producto.producto_precio_venta : 0; 
        const totalVenta = cantidad * precioUnitario; 
        const fecha = venta.venta_fecha; 
        const vendedorNombre = venta.usuario ? venta.usuario.usuario_nombre : 'N/A';
        
        const estadoBadge = `<span class="badge bg-danger"><i class="fas fa-check me-1"></i> DEVUELTA</span>`;

        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${id}</td>
            <td>${productoNombre}</td>
            <td>${cantidad}</td>
            <td>$${totalVenta.toLocaleString()}</td>
            <td>${fecha}</td>
            <td>${vendedorNombre}</td>
            <td>${estadoBadge}</td>
        `;
        tablaCuerpoHistorial.appendChild(fila);
    });
}

// =========================================================================
// LÓGICA DE EVENTOS Y CONFIRMACIÓN
// =========================================================================
function asignarEventosDevolucion(ventasData) {
    document.querySelectorAll('.btn-iniciar-devolucion').forEach(button => {
        button.addEventListener('click', function() {
            idVentaGlobal = parseInt(this.getAttribute('data-id-venta'));
            ventaGlobalData = ventasData.find(v => v.id === idVentaGlobal);
            
            if (ventaGlobalData) {
                const productoNombre = this.getAttribute('data-producto');
                const cantidad = parseInt(this.getAttribute('data-cantidad'));
                
                document.getElementById('confVentaId').textContent = idVentaGlobal;
                document.getElementById('confProducto').textContent = productoNombre;
                document.getElementById('confCantidad').textContent = cantidad;

                modalConfirmarDevolucion.show();
            } else {
                 alert('Error: Datos de venta no encontrados. Recargue la página.');
            }
        });
    });
}

btnConfirmarDevolucionModal.addEventListener('click', async function() {
    if (idVentaGlobal === null) return;
    
    const idToDevolver = idVentaGlobal;
    const productoParaMensaje = document.getElementById('confProducto').textContent;
    
    modalConfirmarDevolucion.hide();
    
    try {
        const devolverUrl = `${API_VENTAS_URL}/${idToDevolver}/devolver`;
        const response = await fetch(devolverUrl, {
            method: 'POST', 
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (response.ok || response.status === 200) {
            const result = await response.json();
            
            // 🌟 CRÍTICO: Recargar AMBAS tablas
            await cargarDatosDevoluciones();

            alert(`✅ ${result.mensaje || 'Devolución procesada exitosamente.'} Venta ${idToDevolver} marcada como devuelta y stock de ${productoParaMensaje} repuesto.`);
        } else {
            const errorResult = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorResult.error || errorResult.mensaje || `Error del servidor: Código ${response.status}`);
        }

    } catch (error) {
        console.error('Error en la devolución de la venta:', error);
        alert('❌ Falló la operación de devolución. ' + error.message);
    }

    idVentaGlobal = null;
    ventaGlobalData = null;
});

// =========================================================================
// INICIALIZACIÓN
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 🌟 Carga inicial de AMBAS tablas
    cargarDatosDevoluciones();

    // --- Lógica para ocultar enlaces (Se mantiene igual) ---
    const userType = localStorage.getItem('userType');
    const inventarioLink = document.querySelector("a[href='inventory.html']");
    const gestionUsuariosLink = document.querySelector("a[href='gestiondeusuarios.html']");
    const finanzasLink = document.querySelector("a[href='finanzas.html']");
    
    if (userType === 'user') {
        if (inventarioLink) {
            inventarioLink.innerHTML = '<i class="fas fa-boxes me-2"></i> Productos';
            inventarioLink.href = 'productos.html';
        }
        if (gestionUsuariosLink) gestionUsuariosLink.style.display = 'none';
        if (finanzasLink) finanzasLink.style.display = 'none';
    }
});