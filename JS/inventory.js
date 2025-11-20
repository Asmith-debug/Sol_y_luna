// --- OCULTAR ENLACES DE GESTIÓN DE USUARIOS Y FINANZAS PARA USUARIOS ---
// Este script se ejecuta al cargar la página y oculta los enlaces de gestión de usuarios
document.addEventListener('DOMContentLoaded', () => {
    const userType = localStorage.getItem('userType'); // Obtiene el tipo de usuario

    const gestionUsuariosLink = document.querySelector("a[href='gestiondeusuarios.html']");
    const finanzasLink = document.querySelector("a[href='finanzas.html']");

    if (userType === 'user') {
        // Ocultar Gestión de Usuarios y Finanzas
        if (gestionUsuariosLink) gestionUsuariosLink.style.display = 'none';
        if (finanzasLink) finanzasLink.style.display = 'none';
    }
});

// --- PAGINACIÓN CON ANIMACIÓN PARA TABLA DE INVENTARIO ---
document.addEventListener('DOMContentLoaded', function() {
    const filasPorPagina = 10;
    const tabla = document.querySelector('table');
    const tbody = tabla.querySelector('tbody');
    const filas = Array.from(tbody.querySelectorAll('tr'));
    let paginaActual = 1;
    let totalPaginas = Math.ceil(filas.length / filasPorPagina);

    function mostrarPagina(pagina) {
        filas.forEach(f => f.style.display = 'none');
        const inicio = (pagina - 1) * filasPorPagina;
        const fin = inicio + filasPorPagina;
        filas.slice(inicio, fin).forEach(f => {
            f.style.display = '';
            f.classList.add('fade-in');
        });
        actualizarPaginacion();
    }

    function actualizarPaginacion() {
        const paginacionDiv = document.querySelector('.pagination');
        if (!paginacionDiv) return;
        paginacionDiv.innerHTML = '';
        for (let i = 1; i <= totalPaginas; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === paginaActual ? 'active' : ''}`;
            const a = document.createElement('a');
            a.className = 'page-link';
            a.href = '#';
            a.textContent = i;
            a.onclick = (e) => {
                e.preventDefault();
                paginaActual = i;
                mostrarPagina(paginaActual);
            };
            li.appendChild(a);
            paginacionDiv.appendChild(li);
        }
    }
    
    // Filtro de inventario (simulación)
    const formFiltro = document.getElementById('filtroInventario');
    const limpiarFiltroBtn = document.getElementById('limpiarFiltro');
    const inputFiltro = document.getElementById('filtroGeneral');
    
    if (formFiltro) {
        formFiltro.addEventListener('submit', function(e) {
            e.preventDefault();
            const valor = inputFiltro.value.toLowerCase();
            filas.forEach(fila => {
                const textoFila = fila.textContent.toLowerCase();
                fila.style.display = textoFila.includes(valor) ? '' : 'none';
            });
            actualizarResumenInventario();
        });
    }

    if (limpiarFiltroBtn) {
        limpiarFiltroBtn.addEventListener('click', function() {
            inputFiltro.value = '';
            filas.forEach(fila => fila.style.display = '');
            actualizarResumenInventario();
        });
    }

    mostrarPagina(1);
});

// Modal para ver/editar/desactivar producto
const modalProducto = new bootstrap.Modal(document.getElementById('modalProducto'));
const formProducto = document.getElementById('formProducto');
const modalTitle = document.getElementById('modalProductoLabel');
const btnGuardar = document.getElementById('btnGuardarProducto');

function abrirModalProducto(producto, fila) {
    modalTitle.textContent = producto.id ? 'Editar Producto' : 'Ver Producto';
    document.getElementById('productoID').value = producto.id || '';
    document.getElementById('productoNombre').value = producto.nombre || '';
    document.getElementById('productoCategoria').value = producto.categoria || '';
    document.getElementById('productoColor').value = producto.color || '';
    document.getElementById('productoStock').value = producto.stock || '';
    document.getElementById('productoPrecioVenta').value = producto.precioVenta || '';
    document.getElementById('productoPrecioCompra').value = producto.precioCompra || '';
    document.getElementById('productoProveedor').value = producto.proveedor || '';
    document.getElementById('productoEstado').value = producto.estado || 'Activo';

    // Deshabilita los campos si solo es vista
    const esVista = !producto.id;
    Array.from(formProducto.elements).forEach(el => el.disabled = esVista);
    btnGuardar.style.display = esVista ? 'none' : 'block';

    if (fila) {
        formProducto.dataset.filaIndex = Array.from(fila.parentNode.children).indexOf(fila);
    }
    
    modalProducto.show();
}

function abrirModalDesactivarProducto(fila) {
    const modal = new bootstrap.Modal(document.getElementById('modalConfirmar'));
    document.getElementById('confirmarBody').textContent = '¿Estás seguro de que quieres desactivar este producto?';
    document.getElementById('btnConfirmarModal').onclick = () => desactivarProducto(fila);
    modal.show();
}

function desactivarProducto(fila) {
    const estadoCelda = fila.querySelector('td:nth-child(9) span.badge');
    estadoCelda.textContent = 'Inactivo';
    estadoCelda.classList.remove('bg-success');
    estadoCelda.classList.add('bg-danger');
    actualizarResumenInventario();
    bootstrap.Modal.getInstance(document.getElementById('modalConfirmar')).hide();
    alert('Producto desactivado correctamente.');
}

// Lógica para guardar el producto
formProducto.onsubmit = function(e) {
    e.preventDefault();
    const index = this.dataset.filaIndex;
    if (index === undefined || index === null) {
        alert('No se pudo guardar el producto. Intente de nuevo.');
        return;
    }
    
    const fila = document.querySelector('table tbody').children[index];
    const celdas = fila.children;
    
    celdas[1].textContent = document.getElementById('productoNombre').value;
    celdas[2].textContent = document.getElementById('productoCategoria').value;
    celdas[3].textContent = document.getElementById('productoColor').value;
    celdas[4].textContent = document.getElementById('productoStock').value;
    celdas[5].textContent = `$${parseInt(document.getElementById('productoPrecioVenta').value).toLocaleString()}`;
    celdas[6].textContent = `$${parseInt(document.getElementById('productoPrecioCompra').value).toLocaleString()}`;
    celdas[7].textContent = document.getElementById('productoProveedor').value;
    
    const estado = document.getElementById('productoEstado').value;
    const estadoBadge = celdas[8].querySelector('span.badge');
    estadoBadge.textContent = estado;
    estadoBadge.classList.toggle('bg-success', estado === 'Activo');
    estadoBadge.classList.toggle('bg-danger', estado !== 'Activo');

    modalProducto.hide();
    actualizarResumenInventario();
    alert('Producto actualizado correctamente.');
};

// Event listeners para los botones de la tabla
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('table tbody').addEventListener('click', function(e) {
        const btn = e.target.closest('.btn');
        if (!btn) return;
        const fila = btn.closest('tr');
        if (!fila) return;

        if (btn.classList.contains('btn-info')) {
            // Botón 'Ver'
            const celdas = fila.querySelectorAll('td');
            abrirModalProducto({
                id: celdas[0].textContent,
                nombre: celdas[1].textContent,
                categoria: celdas[2].textContent,
                color: celdas[3].textContent,
                stock: celdas[4].textContent,
                precioVenta: celdas[5].textContent.replace(/\D/g, ''),
                precioCompra: celdas[6].textContent.replace(/\D/g, ''),
                proveedor: celdas[7].textContent,
                estado: celdas[8].textContent.trim()
            });
        } else if (btn.classList.contains('btn-warning')) {
            // Botón 'Editar'
            const celdas = fila.querySelectorAll('td');
            abrirModalProducto({
                id: celdas[0].textContent,
                nombre: celdas[1].textContent,
                categoria: celdas[2].textContent,
                color: celdas[3].textContent,
                stock: celdas[4].textContent,
                precioVenta: celdas[5].textContent.replace(/\D/g, ''),
                precioCompra: celdas[6].textContent.replace(/\D/g, ''),
                proveedor: celdas[7].textContent,
                estado: celdas[8].textContent.trim()
            }, fila);
        } else if (btn.classList.contains('btn-danger')) {
            // Botón 'Desactivar'
            abrirModalDesactivarProducto(fila);
        }
    });
});

// Ordena la tabla por ID descendente al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    const tbody = document.querySelector('table tbody');
    const filas = Array.from(tbody.querySelectorAll('tr'));
    filas.sort((a, b) => parseInt(b.cells[0].textContent) < parseInt(a.cells[0].textContent) ? 1 : -1)
         .forEach(fila => tbody.appendChild(fila));
});

// Actualiza el resumen de inventario
function actualizarResumenInventario() {
    const tbody = document.querySelector('table tbody');
    const total = tbody ? tbody.querySelectorAll('tr').length : 0;
    const activos = tbody ? tbody.querySelectorAll('.badge.bg-success').length : 0;
    const inactivos = total - activos;
    const resumen = document.getElementById('resumenInventario');
    if (resumen) {
        resumen.innerHTML = `<div class="p-2 bg-light rounded shadow-sm text-center"><strong>Total de Productos:</strong> ${total}</div>
                             <div class="p-2 bg-success text-white rounded shadow-sm text-center"><strong>Productos Activos:</strong> ${activos}</div>
                             <div class="p-2 bg-danger text-white rounded shadow-sm text-center"><strong>Productos Inactivos:</strong> ${inactivos}</div>`;
    }
}