document.addEventListener('DOMContentLoaded', async () => {

    // =========================================================================
    // CONFIGURACIÓN DE API Y REFERENCIAS
    // =========================================================================
    const BASE_API_URL = 'http://127.0.0.1:8000/api';
    const API_PRODUCTOS = `${BASE_API_URL}/productos`;
    const API_CATEGORIAS = `${BASE_API_URL}/categorias`;
    const API_PROVEEDORES = `${BASE_API_URL}/proveedores`;
    const API_ESTADOS = `${BASE_API_URL}/estados`;

    // Mapas para almacenar las claves foráneas (FKs)
    let categoriasMap = new Map();
    let proveedoresMap = new Map();
    let estadosMap = new Map();
    
    // Referencias al DOM
    const tablaCuerpo = document.querySelector('#tablaProductos tbody');
    const modalProducto = new bootstrap.Modal(document.getElementById('modalProducto'));
    const modalConfirmacion = new bootstrap.Modal(document.getElementById('modalConfirmacion'));
    const formProducto = document.getElementById('formProducto');

    const productoIdInput = document.getElementById('productoId');
    const modalTitle = document.getElementById('modalProductoLabel');
    const btnConfirmarAccion = document.getElementById('btnConfirmarAccion');

    // =========================================================================
    // FUNCIÓN DE UTILIDAD: FETCH GENÉRICO CON MANEJO DE ERRORES
    // =========================================================================
    async function fetchData(url, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        };
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                // Manejo de errores de validación de Laravel (código 422)
                const errorMessage = (response.status === 422) ?
                    (result.errors ? JSON.stringify(result.errors) : 'Error de validación') :
                    result.message || response.statusText;
                throw new Error(errorMessage);
            }
            return result;
        } catch (error) {
            console.error(`Fallo en la operación ${method} para ${url}:`, error);
            // Mostrar un mensaje de error detallado al usuario
            alert(`Fallo en la operación. Detalles: ${error.message}`);
            return null;
        }
    }
    
    // =========================================================================
    // FUNCIÓN 1: CARGAR DATOS BASE (SELECTS)
    // =========================================================================
    async function cargarDatosBase() {
        // Carga y mapeo de Categorías
        const categorias = await fetchData(API_CATEGORIAS);
        categoriasMap.clear();
        const selectCat = document.getElementById('productoCategoria');
        selectCat.innerHTML = '<option value="" disabled selected>Seleccione una Categoría</option>';
        if (categorias) {
            categorias.forEach(c => {
                categoriasMap.set(c.id, c.categoria_nombre);
                selectCat.innerHTML += `<option value="${c.id}">${c.categoria_nombre}</option>`;
            });
        }

        // Carga y mapeo de Proveedores
        const proveedores = await fetchData(API_PROVEEDORES);
        proveedoresMap.clear();
        const selectProv = document.getElementById('productoProveedor');
        selectProv.innerHTML = '<option value="" disabled selected>Seleccione un Proveedor</option>';
        if (proveedores) {
            proveedores.forEach(p => {
                proveedoresMap.set(p.id, p.proveedor_nombre);
                selectProv.innerHTML += `<option value="${p.id}">${p.proveedor_nombre}</option>`;
            });
        }

        // Carga y mapeo de Estados
        const estados = await fetchData(API_ESTADOS);
        estadosMap.clear();
        const selectEst = document.getElementById('productoEstado');
        selectEst.innerHTML = '<option value="" disabled selected>Seleccione un Estado</option>';
        if (estados) {
            estados.forEach(e => {
                estadosMap.set(e.id, e.estado_nombre);
                selectEst.innerHTML += `<option value="${e.id}">${e.estado_nombre}</option>`;
            });
        }
    }
    
    // =========================================================================
    // FUNCIÓN 2: CARGAR PRODUCTOS (READ)
    // =========================================================================
    async function cargarProductos() {
        tablaCuerpo.innerHTML = '<tr><td colspan="9" class="text-center text-info"><i class="fas fa-spinner fa-spin me-2"></i> Cargando productos...</td></tr>';
        
        await cargarDatosBase(); // Asegura que los mapas de FKs y selects estén llenos
        
        const productos = await fetchData(API_PRODUCTOS);
        
        if (!productos || productos.length === 0) {
            tablaCuerpo.innerHTML = '<tr><td colspan="9" class="text-center text-warning">No se encontraron productos en la base de datos.</td></tr>';
            return;
        }

        tablaCuerpo.innerHTML = ''; // Limpia el mensaje de carga

        productos.forEach(producto => {
            const estadoNombre = estadosMap.get(producto.producto_estado) || 'Desconocido';
            const categoriaNombre = categoriasMap.get(producto.producto_categoria) || 'Desconocida';
            const proveedorNombre = proveedoresMap.get(producto.producto_proveedor) || 'Desconocido';

            const esActivo = estadoNombre.toLowerCase() === 'activo';
            const badgeClass = esActivo ? 'bg-success' : 'bg-danger';

            const fila = document.createElement('tr');
            fila.dataset.id = producto.id; // Almacena el ID en la fila
            fila.innerHTML = `
                <td>${producto.id}</td>
                <td>${producto.producto_nombre}</td>
                <td>${categoriaNombre}</td>
                <td>${producto.producto_stock}</td>
                <td>$${parseFloat(producto.producto_precio_venta).toLocaleString('es-CL')}</td>
                <td>$${parseFloat(producto.producto_precio_compra).toLocaleString('es-CL')}</td>
                <td>${proveedorNombre}</td>
                <td><span class="badge ${badgeClass}">${estadoNombre}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning text-white me-1 btn-editar" data-id="${producto.id}"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn btn-sm btn-danger btn-eliminar" data-id="${producto.id}"><i class="fas fa-trash"></i> Eliminar</button>
                </td>
            `;
            tablaCuerpo.appendChild(fila);
        });
    }

    // =========================================================================
    // CRUD: CREATE y UPDATE (Manejo de Modal y Formulario)
    // =========================================================================

    // Abre modal para AGREGAR producto
    document.getElementById('btnAbrirModalAgregar').addEventListener('click', () => {
        modalTitle.textContent = 'Agregar Nuevo Producto';
        productoIdInput.value = ''; // ID vacío para crear
        formProducto.reset();
        modalProducto.show();
    });
    
    // Abre modal para EDITAR producto
    tablaCuerpo.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-editar') || e.target.closest('.btn-editar')) {
            const btn = e.target.closest('.btn-editar');
            const id = btn.dataset.id;
            const producto = await fetchData(`${API_PRODUCTOS}/${id}`);

            if (producto) {
                modalTitle.textContent = 'Editar Producto';
                productoIdInput.value = producto.id;
                document.getElementById('productoNombre').value = producto.producto_nombre;
                document.getElementById('productoCategoria').value = producto.producto_categoria;
                document.getElementById('productoStock').value = producto.producto_stock;
                document.getElementById('productoPrecioVenta').value = producto.producto_precio_venta;
                document.getElementById('productoPrecioCompra').value = producto.producto_precio_compra;
                document.getElementById('productoProveedor').value = producto.producto_proveedor;
                document.getElementById('productoEstado').value = producto.producto_estado;
                
                modalProducto.show();
            }
        }
    });

    // Maneja el envío del formulario (CREATE/UPDATE)
    formProducto.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = productoIdInput.value;
        const data = {
            producto_nombre: document.getElementById('productoNombre').value.trim(),
            producto_categoria: document.getElementById('productoCategoria').value,
            producto_stock: document.getElementById('productoStock').value,
            producto_precio_venta: document.getElementById('productoPrecioVenta').value,
            producto_precio_compra: document.getElementById('productoPrecioCompra').value,
            producto_proveedor: document.getElementById('productoProveedor').value,
            producto_estado: document.getElementById('productoEstado').value,
        };

        const esEdicion = id !== '';
        let result;

        if (esEdicion) {
            // UPDATE (PUT)
            result = await fetchData(`${API_PRODUCTOS}/${id}`, 'PUT', data);
        } else {
            // CREATE (POST)
            result = await fetchData(API_PRODUCTOS, 'POST', data);
        }

        if (result) {
            modalProducto.hide();
            await cargarProductos();
            alert(`Producto "${result.data.producto_nombre}" ${esEdicion ? 'actualizado' : 'agregado'} exitosamente.`);
        }
    });

    // =========================================================================
    // CRUD: DELETE (Eliminar)
    // =========================================================================

    // Abre modal de confirmación
    tablaCuerpo.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-eliminar') || e.target.closest('.btn-eliminar')) {
            const btn = e.target.closest('.btn-eliminar');
            const id = btn.dataset.id;
            
            // Asigna el ID del producto a un atributo del botón de confirmación
            btnConfirmarAccion.dataset.productoId = id; 
            
            const fila = btn.closest('tr');
            const nombreProducto = fila.cells[1].textContent;
            
            document.getElementById('confirmacionMensaje').innerHTML = `¿Está seguro que desea **eliminar** permanentemente el producto **"${nombreProducto}"** (ID: ${id})? Esta acción es irreversible.`;
            modalConfirmacion.show();
        }
    });

    // Ejecuta la acción de eliminación
    btnConfirmarAccion.addEventListener('click', async () => {
        const id = btnConfirmarAccion.dataset.productoId;
        const result = await fetchData(`${API_PRODUCTOS}/${id}`, 'DELETE');

        if (result) {
            modalConfirmacion.hide();
            await cargarProductos();
            alert(`Producto (ID: ${id}) eliminado exitosamente.`);
        }
    });
    
    // =========================================================================
    // FILTRADO Y RECARGA
    // =========================================================================
    
    // Filtrado de tabla (cliente)
    document.querySelector('#formFiltroProductos').addEventListener('submit', (e) => {
        e.preventDefault();
        const filtro = document.getElementById('filtroTexto').value.toLowerCase().trim();
        const filas = tablaCuerpo.querySelectorAll('tr');

        filas.forEach(fila => {
            if (fila.classList.contains('text-center')) return;
            const contenidoFila = Array.from(fila.cells).map(c => c.textContent.toLowerCase()).join(' ');
            const mostrar = contenidoFila.includes(filtro);
            fila.style.display = mostrar ? '' : 'none';
        });
    });

    document.getElementById('limpiarFiltro').addEventListener('click', function() {
        document.getElementById('filtroTexto').value = '';
        tablaCuerpo.querySelectorAll('tr').forEach(tr => tr.style.display = '');
    });

    // =========================================================================
    // INICIALIZACIÓN
    // =========================================================================
    cargarProductos();
});