// Espera a que el DOM esté completamente cargado antes de ejecutar el script
document.addEventListener('DOMContentLoaded', async () => {

    // =========================================================================
    // CONFIGURACIÓN Y REFERENCIAS GLOBALES (CORREGIDO EL SELECTOR)
    // =========================================================================
    const API_URL = 'http://127.0.0.1:8000/api/categorias';

    // 🌟 CRÍTICO: Aseguramos que el DOM esté listo antes de seleccionar el elemento
    // Referencias al DOM para la tabla
    const tablaCuerpo = document.querySelector('#tablaCategorias tbody');

    // Referencias al DOM para el modal y el formulario de AGREGAR (USANDO 'formCategoria')
    const formCategoria = document.querySelector('#formCategoria');
    const modalAgregarCategoria = new bootstrap.Modal(document.getElementById('modalAgregarCategoria'));

    // NUEVAS REFERENCIAS para la edición
    const modalEditarCategoria = new bootstrap.Modal(document.getElementById('modalEditarCategoria'));
    const formEditarCategoria = document.querySelector('#formEditarCategoria');
    const inputIdEditar = document.getElementById('categoriaIdEditar');
    const inputNombreEditar = document.getElementById('categoriaNombreEditar');

    // =========================================================================
    // FUNCIÓN 1: CARGAR CATEGORÍAS (LISTADO)
    // =========================================================================
    async function cargarCategorias() {
        if (!tablaCuerpo) {
             console.error("Error: Elemento #tablaCategorias tbody no encontrado en el DOM.");
             return; 
        }
        
        tablaCuerpo.innerHTML = '<tr><td colspan="3" class="text-center">Cargando categorías...</td></tr>';

        try {
            const response = await fetch(API_URL);

            if (!response.ok) {
                throw new Error(`Error en la petición: ${response.statusText}`);
            }

            const categorias = await response.json();

            tablaCuerpo.innerHTML = '';

            if (categorias.length === 0) {
                tablaCuerpo.innerHTML = '<tr><td colspan="3" class="text-center">No hay categorías registradas.</td></tr>';
                return;
            }

            categorias.forEach(categoria => {
                const fila = tablaCuerpo.insertRow();
                fila.innerHTML = `
                    <td>${categoria.id}</td>
                    <td>${categoria.categoria_nombre}</td>
                    <td>
                        <button class="btn btn-sm btn-info editar-btn" data-id="${categoria.id}" data-nombre="${categoria.categoria_nombre}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger eliminar-btn" data-id="${categoria.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
            });
        } catch (error) {
            console.error('Error al cargar categorías:', error);
            tablaCuerpo.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error al cargar datos.</td></tr>';
        }
    }

    // =========================================================================
    // FUNCIÓN 2: GESTIONAR ERRORES DE VALIDACIÓN DE LARAVEL (422)
    // =========================================================================
    function parseLaravelErrors(result) {
        let errorMessage = 'Error de validación:';
        if (result.errors) {
            // Une todos los mensajes de error en una sola cadena
            errorMessage += '\n' + Object.values(result.errors).flat().join('\n');
        }
        return errorMessage;
    }

    // =========================================================================
    // FUNCIÓN 3: CREAR/GUARDAR CATEGORÍA (MÉTODO POST)
    // =========================================================================
    // 🌟 CORRECCIÓN: Usando la variable 'formCategoria'
    formCategoria.addEventListener('submit', async (e) => {
        e.preventDefault();

        // El HTML solo tiene un campo llamado 'categoriaNombre' y 'categoriaDescripcion'.
        // Tu modelo Laravel solo acepta 'categoria_nombre'.
        const nombre = document.getElementById('categoriaNombre').value;
        const data = {
            categoria_nombre: nombre
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                const errorMessage = (response.status === 422) ?
                    parseLaravelErrors(result) :
                    'Error al guardar. Mensaje: ' + (result.mensaje || result.message || response.statusText);
                throw new Error(errorMessage);
            }

            // Éxito
            modalAgregarCategoria.hide();
            formCategoria.reset(); // 🌟 CORRECCIÓN: Usando la variable 'formCategoria'
            await cargarCategorias();
            alert('Categoría "' + result.data.categoria_nombre + '" creada exitosamente.');

        } catch (error) {
            console.error('Error en el envío del formulario:', error);
            alert('Falló la operación. ' + error.message);
        }
    });

    // =========================================================================
    // FUNCIÓN 4: ELIMINAR CATEGORÍA (MÉTODO DELETE)
    // =========================================================================
    tablaCuerpo.addEventListener('click', async (e) => {
        const btn = e.target.closest('.eliminar-btn');

        if (btn) {
            const id = btn.dataset.id;
            const nombre = e.target.closest('tr').children[1].textContent;
            const confirmar = confirm(`¿Estás seguro de que quieres eliminar la categoría "${nombre}" (ID: ${id})?`);

            if (!confirmar) return;

            try {
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    const result = await response.json();
                    throw new Error(result.mensaje || result.message || response.statusText);
                }

                // Éxito
                await cargarCategorias();
                alert(`Categoría ID ${id} eliminada exitosamente.`);

            } catch (error) {
                console.error('Error al eliminar categoría:', error);
                alert('Falló la eliminación. ' + error.message);
            }
        }
    });

    // =========================================================================
    // FUNCIÓN 5: CARGAR MODAL DE EDICIÓN (PRE-LLENADO)
    // =========================================================================
    tablaCuerpo.addEventListener('click', (e) => {
        const btn = e.target.closest('.editar-btn');

        if (btn) {
            const id = btn.dataset.id;
            const nombre = btn.dataset.nombre;

            // Llenar el formulario del modal de edición
            inputIdEditar.value = id;
            inputNombreEditar.value = nombre;
            
            modalEditarCategoria.show();
        }
    });

    // =========================================================================
    // FUNCIÓN 6: ACTUALIZAR CATEGORÍA (MÉTODO PUT)
    // =========================================================================
    formEditarCategoria.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = inputIdEditar.value;
        const nombre = inputNombreEditar.value;
        const data = {
            categoria_nombre: nombre
        };

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                const errorMessage = (response.status === 422) ?
                    parseLaravelErrors(result) :
                    'Error al actualizar. Mensaje: ' + (result.mensaje || result.message || response.statusText);
                throw new Error(errorMessage);
            }

            // Éxito
            modalEditarCategoria.hide();
            await cargarCategorias();
            alert('Categoría "' + result.data.categoria_nombre + '" actualizada exitosamente.');

        } catch (error) {
            console.error('Error en la actualización:', error);
            alert('Falló la operación. ' + error.message);
        }
    });


    // Llama a la función para cargar las categorías al cargar la página
    cargarCategorias();
});