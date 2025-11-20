document.addEventListener('DOMContentLoaded', function () {

    // --- OCULTAR ENLACES DE GESTIÓN DE USUARIOS Y FINANZAS PARA USUARIOS ---
    const userType = localStorage.getItem('userType');
    const gestionUsuariosLink = document.querySelector("a[href='gestiondeusuarios.html']");
    const finanzasLink = document.querySelector("a[href='finanzas.html']");
    const inventarioLink = document.querySelector("a[href='inventory.html']");

    if (userType === 'user') {
        if (gestionUsuariosLink) gestionUsuariosLink.style.display = 'none';
        if (finanzasLink) finanzasLink.style.display = 'none';
        if (inventarioLink) {
            inventarioLink.textContent = 'Productos';
            inventarioLink.href = 'productos.html';
        }
    } else {
        if (gestionUsuariosLink) gestionUsuariosLink.style.display = '';
        if (finanzasLink) finanzasLink.style.display = '';
        if (inventarioLink) {
            inventarioLink.innerHTML = '<i class="fas fa-boxes me-2"></i> Gestión de Inventario';
            inventarioLink.href = 'inventory.html';
        }
    }


    // =========================================================================
    // CONFIGURACIÓN Y REFERENCIAS GLOBALES
    // =========================================================================

    // URLs REALES de la API
    const API_URL_PRODUCTOS = 'http://127.0.0.1:8000/api/productos';
    const API_URL_VENTAS = 'http://127.0.0.1:8000/api/ventas';

    // Lista de productos que contendrá todos los datos reales (global)
    let productosInventario = [];

    // Referencias del DOM
    const formVenta = document.getElementById('formVenta');
    const inputProducto = document.getElementById('productoVendido');
    const inputProductoId = document.getElementById('productoIdVendido');
    const inputCantidad = document.getElementById('cantidad');
    const inputPrecioUnitario = document.getElementById('precioUnitario');
    const inputTotalVenta = document.getElementById('totalVenta');
    const btnAbrirSelector = document.getElementById('btnAbrirSelectorProducto');
    const modalSelector = new bootstrap.Modal(document.getElementById('modalSelectorProducto'));
    const filtroModal = document.getElementById('filtroModalProducto');
    const cuerpoTablaModal = document.getElementById('cuerpoTablaProductosModal');

    // Referencias del DOM para Historial
    const tablaCuerpo = document.querySelector('#tablaVentas tbody');
    const ventasHoySpan = document.getElementById('ventasHoy');
    const transaccionesHoySpan = document.getElementById('transaccionesHoy');


    // =========================================================================
    // FUNCIÓN 1: OBTENER PRODUCTOS DESDE LA API (Carga inicial)
    // =========================================================================
    async function fetchProductosInventario() {
        console.log('Cargando productos desde la API...');
        cuerpoTablaModal.innerHTML = '<tr><td colspan="5" class="text-center text-info">Conectando con el inventario...</td></tr>';

        try {
            const response = await fetch(API_URL_PRODUCTOS);

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} - No se pudo conectar a la API de productos.`);
            }

            const result = await response.json();

            const rawProducts = result.data || result;

            if (!Array.isArray(rawProducts)) {
                throw new Error("La API no devolvió una lista de productos válida.");
            }

            // Mapeo y filtrado de datos (Stock > 0 y Activo=1)
            productosInventario = rawProducts
                .filter(p => {
                    const esActivo = p.producto_estado === 1;
                    const hayStock = parseInt(p.producto_stock) > 0;
                    return esActivo && hayStock;
                })
                .map(p => ({
                    id: p.id,
                    nombre: p.producto_nombre,
                    precioVenta: parseFloat(p.producto_precio_venta),
                    stock: parseInt(p.producto_stock),
                    precioCompra: parseFloat(p.producto_precio_compra) // Necesario para el POST de venta
                }));

            console.log(`Productos ACTIVO/CON STOCK cargados: ${productosInventario.length}`);

            // Lógica de Visualización
            if (productosInventario.length === 0 && rawProducts.length > 0) {
                 cuerpoTablaModal.innerHTML = '<tr><td colspan="5" class="text-center text-warning">No hay productos disponibles para la venta (Stock 0 o Estado Inactivo).</td></tr>';
            } else if (productosInventario.length === 0 && rawProducts.length === 0) {
                 cuerpoTablaModal.innerHTML = '<tr><td colspan="5" class="text-center text-danger">El inventario está vacío. Agregue productos.</td></tr>';
            } else {
                 cargarTablaProductosModal(productosInventario);
            }

        } catch (error) {
            console.error('Error FATAL al cargar productos para la venta:', error);
            cuerpoTablaModal.innerHTML = '<tr><td colspan="5" class="text-center text-danger">ERROR: No se pudo conectar al servidor de productos. Revise la consola (F12).</td></tr>';
            alert('Error al cargar el inventario. Verifique que el backend esté funcionando. ' + error.message);
        }
    }

    // =========================================================================
    // FUNCIÓN 2: CARGAR TABLA DEL MODAL Y FILTRAR
    // =========================================================================
    /**
     * Llena la tabla del modal con los productos filtrados.
     * @param {Array<Object>} productos - Lista de productos a mostrar.
     */
    function cargarTablaProductosModal(productos) {
        cuerpoTablaModal.innerHTML = '';
        if (productos.length === 0) {
             cuerpoTablaModal.innerHTML = '<tr><td colspan="5" class="text-center text-danger">No se encontraron productos que coincidan con la búsqueda o disponibles.</td></tr>';
             return;
        }

        productos.forEach(prod => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${prod.id}</td>
                <td>${prod.nombre}</td>
                <td><span class="badge bg-info">${prod.stock}</span></td>
                <td>$${prod.precioVenta.toLocaleString('es-CL')}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-success btn-seleccionar-producto"
                            data-id="${prod.id}"
                            data-nombre="${prod.nombre}"
                            data-precio="${prod.precioVenta}">
                        Seleccionar
                    </button>
                </td>
            `;
            cuerpoTablaModal.appendChild(fila);
        });

        document.querySelectorAll('.btn-seleccionar-producto').forEach(button => {
            button.addEventListener('click', seleccionarProducto);
        });
    }

    filtroModal.addEventListener('keyup', function() {
        const busqueda = this.value.toLowerCase();
        const productosFiltrados = productosInventario.filter(p =>
            p.nombre.toLowerCase().includes(busqueda) || String(p.id).includes(busqueda)
        );
        cargarTablaProductosModal(productosFiltrados);
    });

    // =========================================================================
    // FUNCIÓN 3: SELECCIONAR PRODUCTO DEL MODAL
    // =========================================================================
    function seleccionarProducto(e) {
        const button = e.target.closest('.btn-seleccionar-producto');
        const id = button.dataset.id;
        const nombre = button.dataset.nombre;
        
        // Buscar el producto en el inventario para obtener el stock
        const productoSeleccionado = productosInventario.find(p => p.id === parseInt(id));

        inputProductoId.value = id;
        inputProducto.value = nombre;
        inputCantidad.value = 1;
        
        // Ajustar el máximo de cantidad al stock disponible
        if(productoSeleccionado) {
            inputCantidad.max = productoSeleccionado.stock;
        }


        calcularTotal();
        modalSelector.hide();
    }

    btnAbrirSelector.addEventListener('click', () => {
        filtroModal.value = '';
        cargarTablaProductosModal(productosInventario);
        modalSelector.show();
    });


    // =========================================================================
    // FUNCIÓN 4: CALCULAR TOTAL Y OBTENER PRECIO
    // =========================================================================
    function calcularTotal() {
        const productoId = parseInt(inputProductoId.value);
        let cantidad = parseInt(inputCantidad.value) || 0;

        const productoSeleccionado = productosInventario.find(p => p.id === productoId);

        let precio = 0;

        if (productoSeleccionado) {
            precio = productoSeleccionado.precioVenta;
            
            // Validación de stock al cambiar la cantidad
            if (cantidad > productoSeleccionado.stock) {
                alert(`Advertencia: Solo quedan ${productoSeleccionado.stock} unidades de este producto. Ajustando cantidad.`);
                cantidad = productoSeleccionado.stock;
                inputCantidad.value = cantidad;
            }
            // Asegurar que la cantidad mínima sea 1 si se ha seleccionado un producto
            if (cantidad === 0 && productoId) {
                 cantidad = 1;
                 inputCantidad.value = 1;
            }
            
        } else {
             // Si no hay producto seleccionado, el precio y el total son 0
             inputPrecioUnitario.value = '0';
             inputTotalVenta.value = '0';
             return;
        }


        inputPrecioUnitario.value = precio.toLocaleString('es-CL');
        const total = precio * cantidad;
        inputTotalVenta.value = total.toLocaleString('es-CL');
    }

    // =========================================================================
    // FUNCIÓN 5: ENVIAR SOLICITUD DE ACTUALIZACIÓN DE STOCK A LA API
    // =========================================================================

    /**
     * Llama a la API de Productos para actualizar el stock en la DB.
     * @param {number} productoId - ID del producto a actualizar.
     * @param {number} nuevoStock - La cantidad total de stock restante.
     */
    async function actualizarStockEnDB(productoId, nuevoStock) {
        const URL_ACTUALIZAR = `${API_URL_PRODUCTOS}/${productoId}`;

        // Solo enviamos el campo de stock para actualizar
        const dataStock = {
            producto_stock: nuevoStock
        };

        console.log(`Intentando actualizar stock del Producto ID ${productoId} a ${nuevoStock}...`);

        try {
            const response = await fetch(URL_ACTUALIZAR, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(dataStock)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error de respuesta al actualizar stock:', errorText);
                throw new Error(`Fallo en la actualización de stock: ${response.statusText}. Revise la consola para el error de Laravel.`);
            }

            console.log(`Stock actualizado exitosamente en la DB para el Producto ID ${productoId}. Nuevo stock: ${nuevoStock}`);
            return true;

        } catch (error) {
            console.error('Error al actualizar stock en la DB:', error);
            alert(`ADVERTENCIA CRÍTICA: La venta se registró, pero FALLÓ la actualización del stock en la base de datos. ${error.message}`);
            return false;
        }
    }


    // =========================================================================
    // FUNCIÓN 6: REGISTRAR VENTA Y DESCONTAR STOCK
    // =========================================================================
    formVenta.addEventListener('submit', async function (e) {
        e.preventDefault();

        const productoId = parseInt(inputProductoId.value);
        const cantidad = parseInt(inputCantidad.value);

        const productoVendido = productosInventario.find(p => p.id === productoId);

        if (!productoVendido) {
            alert('Producto no seleccionado o no válido. Use el botón "Seleccionar".');
            return;
        }

        if (cantidad <= 0 || cantidad > productoVendido.stock) {
            alert(`Error: Cantidad inválida. Stock disponible: ${productoVendido.stock} unidades.`);
            return;
        }

        // 1. PREPARAR DATOS PARA LA VENTA (POST /api/ventas)
        const usuarioId = localStorage.getItem('userId') || 1; 

        const ventaData = {
            venta_producto_id: productoVendido.id,
            venta_cantidad: cantidad,
            venta_fecha: new Date().toISOString().split('T')[0],
            venta_usuario_id: usuarioId,
            venta_precio_unitario: productoVendido.precioVenta,
        };


        try {
            // A. Registrar la venta en la DB
            const responseVenta = await fetch(API_URL_VENTAS, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(ventaData)
            });

            if (!responseVenta.ok) {
                 const errorText = await responseVenta.text();
                 console.error('Error de respuesta al registrar venta:', errorText);
                 throw new Error(`Fallo al registrar la venta: ${responseVenta.statusText}`);
            }

            // 2. Descontar stock
            const nuevoStock = productoVendido.stock - cantidad;

            // 3. Intentar actualizar el stock en la base de datos (CRÍTICO)
            await actualizarStockEnDB(productoVendido.id, nuevoStock);

            // 4. Actualizar stock local y UI
            productoVendido.stock = nuevoStock;

            // 5. Refrescar UI (Historia de ventas y formulario)
            await cargarHistorial();
            formVenta.reset();
            inputProductoId.value = '';
            inputProducto.value = '';
            inputPrecioUnitario.value = '0';
            inputTotalVenta.value = '0';
            alert(`¡Venta completada y registrada en la base de datos!`);

            // 6. Refrescar el modal después de la venta para reflejar el nuevo stock (y filtrar stock 0)
            fetchProductosInventario(); 

        } catch (error) {
            console.error('Error FATAL en el proceso de venta:', error);
            alert('ERROR: No se pudo completar la venta. ' + error.message);
        }
    });


    // =========================================================================
    // FUNCIÓN 7: CARGAR HISTORIAL DE VENTAS DESDE LA API (Con estado de transacción booleano)
    // =========================================================================
    /**
     * Carga las ventas desde la API, aplica filtros y actualiza el resumen.
     * @param {Object} [filtro={}] - Filtros aplicados desde el formulario.
     */
    async function cargarHistorial(filtro = {}) {
        // Colspan 8 para 8 columnas (ID, Prod, P.Unit, Cant, Total, Fecha, Vendedor, Estado)
        tablaCuerpo.innerHTML = '<tr><td colspan="8" class="text-center text-info">Cargando historial de ventas...</td></tr>';
        let ventasDB = [];

        try {
            // A. Obtener datos de la API
            const response = await fetch(API_URL_VENTAS);
            if (!response.ok) {
                 throw new Error(`Error HTTP: ${response.status} - No se pudo obtener el historial de ventas.`);
            }

            const result = await response.json();
            ventasDB = result.data || result;

            if (!Array.isArray(ventasDB)) {
                console.error('Formato de respuesta de la API de ventas inválido:', result);
                throw new Error('Formato de datos de ventas inesperado.');
            }

            // Mapeo la estructura de la DB a una más fácil de usar en el frontend
            let ventasFormateadas = ventasDB
                .filter(venta => venta.producto && venta.usuario) 
                .map(venta => ({
                    id: venta.id,
                    producto: venta.producto.producto_nombre || 'Producto Desconocido',
                    precioUnitario: parseFloat(venta.venta_precio_unitario || venta.producto.producto_precio_venta),
                    cantidad: parseInt(venta.venta_cantidad),
                    fecha: venta.venta_fecha,
                    vendedor: venta.usuario.usuario_nombre || 'Vendedor Desconocido',
                    // 🎯 CAMBIO: Usar 'true' y 'false' en la lógica de estado
                    estado: (venta.venta_devuelta === 1 || venta.venta_devuelta === true) ? 'DEVUELTA' : 'ACTIVA',
                    esDevuelta: (venta.venta_devuelta === 1 || venta.venta_devuelta === true), // Nueva propiedad booleana
                }));

            // B. Aplicar filtros y calcular resumen
            const fechaHoy = new Date().toISOString().split('T')[0];
            let totalVentasHoy = 0;
            let transaccionesHoy = 0;

            const ventasFiltradas = ventasFormateadas.filter(venta => {
                let mostrar = true;

                // 1. Aplicar filtros del formulario
                if (filtro.producto && !venta.producto.toLowerCase().includes(filtro.producto.toLowerCase())) mostrar = false;
                if (filtro.fecha && venta.fecha !== filtro.fecha) mostrar = false;
                if (filtro.vendedor && !venta.vendedor.toLowerCase().includes(filtro.vendedor.toLowerCase())) mostrar = false;

                // 2. Calcular resumen (solo si la venta es de hoy y es ACTIVA/NO devuelta)
                if (venta.fecha === fechaHoy && venta.estado === 'ACTIVA') {
                    const totalVenta = venta.precioUnitario * venta.cantidad;
                    totalVentasHoy += totalVenta;
                    transaccionesHoy += 1;
                }

                return mostrar;
            });


            // C. Renderizar la tabla con los datos filtrados
            tablaCuerpo.innerHTML = '';

            if (ventasFiltradas.length === 0) {
                 tablaCuerpo.innerHTML = '<tr><td colspan="8" class="text-center text-secondary">No se encontraron ventas para el filtro aplicado.</td></tr>';
            } else {
                // Ordena por ID descendente (el más reciente primero)
                ventasFiltradas.sort((a, b) => b.id - a.id).forEach(venta => {
                    const total = venta.precioUnitario * venta.cantidad;
                    
                    // Lógica de Badge y Resalte de Fila
                    let color = 'bg-success'; 
                    let filaClase = '';
                    
                    if (venta.esDevuelta === true) { // 🎯 Usando el literal booleano 'true'
                        color = 'bg-danger';
                        filaClase = 'table-danger';
                    }

                    const estadoBadge = `<span class="badge ${color}">${venta.estado}</span>`;

                    const fila = document.createElement('tr');
                    fila.className = filaClase;
                    fila.innerHTML = `
                        <td>${venta.id}</td>
                        <td>${venta.producto}</td>
                        <td>$${venta.precioUnitario.toLocaleString('es-CL')}</td>
                        <td>${venta.cantidad}</td>
                        <td class="fw-bold">$${total.toLocaleString('es-CL')}</td>
                        <td>${venta.fecha}</td>
                        <td>${venta.vendedor}</td>
                        <td>${estadoBadge}</td> 
                    `;
                    tablaCuerpo.appendChild(fila);
                });
            }

            // D. Actualizar resumen (ventas de hoy ACTIVA)
            if(ventasHoySpan) ventasHoySpan.textContent = `$${totalVentasHoy.toLocaleString('es-CL')}`;
            if(transaccionesHoySpan) transaccionesHoySpan.textContent = transaccionesHoy;


        } catch (error) {
            console.error('Error al cargar historial de ventas desde la DB:', error);
            tablaCuerpo.innerHTML = '<tr><td colspan="8" class="text-center text-danger">ERROR: No se pudo cargar el historial de ventas desde el servidor. Verifique la consola (F12).</td></tr>';
        }
    }


    // =========================================================================
    // EVENT LISTENERS Y CARGA INICIAL
    // =========================================================================

    inputCantidad.addEventListener('change', calcularTotal);
    inputCantidad.addEventListener('keyup', calcularTotal);

    // Evento de Filtro (Llama a la nueva función cargarHistorial)
    document.getElementById('filtroTransacciones').addEventListener('submit', function(e) {
        e.preventDefault();
        const filtro = {
            producto: document.getElementById('filtroProducto').value.trim(),
            fecha: document.getElementById('filtroFecha').value.trim(),
            vendedor: document.getElementById('filtroVendedor').value.trim(),
        };
        cargarHistorial(filtro);
    });

    document.getElementById('limpiarFiltro').addEventListener('click', function() {
        document.getElementById('filtroTransacciones').reset();
        cargarHistorial();
    });


    // --- INICIALIZACIÓN ---
    fetchProductosInventario();
    cargarHistorial(); // Inicia la carga del historial al cargar la página
});