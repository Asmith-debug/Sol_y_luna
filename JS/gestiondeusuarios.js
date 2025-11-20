document.addEventListener('DOMContentLoaded', async () => {

    // =========================================================================
    // CONFIGURACIÓN DE API Y REFERENCIAS
    // =========================================================================
    const BASE_API_URL = 'http://127.0.0.1:8000/api';
    const API_USUARIOS = `${BASE_API_URL}/usuarios`;
    const API_ROLES = `${BASE_API_URL}/roles`;

    // Mapas para almacenar los roles
    let rolesMap = new Map();
    
    // Referencias al DOM
    const tablaCuerpo = document.querySelector('#tablaUsuarios tbody');
    const modalUsuario = new bootstrap.Modal(document.getElementById('modalUsuario'));
    const modalConfirmacion = new bootstrap.Modal(document.getElementById('modalConfirmacion'));
    const formUsuario = document.getElementById('formUsuario');
    
    const usuarioIdInput = document.getElementById('usuarioId');
    const usuarioPasswordInput = document.getElementById('usuarioPassword');
    const passwordHint = document.getElementById('passwordHint');
    const modalTitle = document.getElementById('modalUsuarioLabel');
    const btnConfirmarAccion = document.getElementById('btnConfirmarAccion');

    // =========================================================================
    // FUNCIÓN DE UTILIDAD: FETCH GENÉRICO Y ERRORES
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
                // Intenta obtener mensajes de error específicos de Laravel (código 422)
                const errorMessage = (response.status === 422) ?
                    (result.errors ? JSON.stringify(result.errors) : 'Error de validación') :
                    result.message || response.statusText;
                throw new Error(errorMessage);
            }
            return result;
        } catch (error) {
            console.error(`Fallo en la operación ${method} para ${url}:`, error);
            alert(`Fallo en la operación. Detalles: ${error.message}`);
            return null;
        }
    }
    
    // =========================================================================
    // FUNCIÓN 1: CARGAR DATOS BASE (ROLES)
    // =========================================================================
    async function cargarRoles() {
        // Carga y mapeo de Roles
        const roles = await fetchData(API_ROLES);
        rolesMap.clear();
        const selectRol = document.getElementById('usuarioRol');
        selectRol.innerHTML = '<option value="" disabled selected>Seleccione un Rol</option>';
        if (roles) {
            // Asumiendo que el campo de nombre del rol es 'rol_nombre' y el ID es 'id'
            roles.forEach(r => {
                rolesMap.set(r.id, r.rol_nombre);
                selectRol.innerHTML += `<option value="${r.id}">${r.rol_nombre}</option>`;
            });
        }
    }
    
    // =========================================================================
    // FUNCIÓN 2: CARGAR USUARIOS (READ)
    // =========================================================================
    async function cargarUsuarios() {
        tablaCuerpo.innerHTML = '<tr><td colspan="5" class="text-center text-info"><i class="fas fa-spinner fa-spin me-2"></i> Cargando usuarios...</td></tr>';
        
        await cargarRoles(); // Asegura que el mapa de roles esté lleno
        
        const usuarios = await fetchData(API_USUARIOS);
        
        if (!usuarios || usuarios.length === 0) {
            tablaCuerpo.innerHTML = '<tr><td colspan="5" class="text-center text-warning">No se encontraron usuarios en la base de datos.</td></tr>';
            return;
        }

        tablaCuerpo.innerHTML = ''; // Limpia el mensaje de carga

        usuarios.forEach(usuario => {
            const rolNombre = rolesMap.get(usuario.usuario_rol_id) || 'Desconocido';
            // Nota: Laravel puede devolver las fechas de creación/actualización. Usaremos un placeholder.
            const ultimoAcceso = usuario.updated_at ? new Date(usuario.updated_at).toLocaleString() : 'Nunca'; 

            const fila = document.createElement('tr');
            fila.dataset.id = usuario.id; // Almacena el ID en la fila
            fila.innerHTML = `
                <td>${usuario.id}</td>
                <td>${usuario.usuario_nombre}</td>
                <td><span class="badge bg-secondary">${rolNombre}</span></td>
                <td>${ultimoAcceso}</td>
                <td>
                    <button class="btn btn-sm btn-warning text-white me-1 btn-editar" data-id="${usuario.id}"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn btn-sm btn-danger btn-eliminar" data-id="${usuario.id}"><i class="fas fa-trash"></i> Eliminar</button>
                </td>
            `;
            tablaCuerpo.appendChild(fila);
        });
    }

    // =========================================================================
    // CRUD: CREATE y UPDATE (Manejo de Modal y Formulario)
    // =========================================================================

    // Abre modal para AGREGAR usuario
    document.getElementById('btnAbrirModalAgregar').addEventListener('click', () => {
        modalTitle.textContent = 'Agregar Nuevo Usuario';
        usuarioIdInput.value = ''; // ID vacío para crear
        formUsuario.reset();
        
        // Muestra y requiere el campo de contraseña
        usuarioPasswordInput.setAttribute('required', 'required');
        usuarioPasswordInput.value = '';
        passwordHint.textContent = 'Debe ser ingresada para nuevos usuarios.';
        
        modalUsuario.show();
    });
    
    // Abre modal para EDITAR usuario
    tablaCuerpo.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-editar') || e.target.closest('.btn-editar')) {
            const btn = e.target.closest('.btn-editar');
            const id = btn.dataset.id;
            const usuario = await fetchData(`${API_USUARIOS}/${id}`);

            if (usuario) {
                modalTitle.textContent = 'Editar Usuario';
                usuarioIdInput.value = usuario.id;
                document.getElementById('usuarioNombre').value = usuario.usuario_nombre;
                document.getElementById('usuarioRol').value = usuario.usuario_rol_id;
                
                // Oculta/No requiere la contraseña, solo se pide si se edita
                usuarioPasswordInput.removeAttribute('required');
                usuarioPasswordInput.value = ''; // Limpiar campo
                passwordHint.textContent = 'Dejar en blanco si no desea cambiar la contraseña.';
                
                modalUsuario.show();
            }
        }
    });

    // Maneja el envío del formulario (CREATE/UPDATE)
    formUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = usuarioIdInput.value;
        const password = usuarioPasswordInput.value.trim();

        const data = {
            usuario_nombre: document.getElementById('usuarioNombre').value.trim(),
            usuario_rol_id: document.getElementById('usuarioRol').value,
        };

        // Solo agregar la contraseña si existe o si es una creación
        if (password.length > 0 || id === '') {
             // En Laravel, si se envía la contraseña, debe ser hasheada en el backend.
            data.usuario_password = password; 
        }

        const esEdicion = id !== '';
        let result;

        if (esEdicion) {
            // UPDATE (PUT)
            result = await fetchData(`${API_USUARIOS}/${id}`, 'PUT', data);
        } else {
            // CREATE (POST)
            // Asegura que la contraseña se envíe para un nuevo usuario (ya validado por el 'required')
            result = await fetchData(API_USUARIOS, 'POST', data);
        }

        if (result) {
            modalUsuario.hide();
            await cargarUsuarios();
            alert(`Usuario "${result.data.usuario_nombre}" ${esEdicion ? 'actualizado' : 'agregado'} exitosamente.`);
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
            
            // Asigna el ID del usuario a un atributo del botón de confirmación
            btnConfirmarAccion.dataset.usuarioId = id; 
            
            const fila = btn.closest('tr');
            const nombreUsuario = fila.cells[1].textContent;
            
            document.getElementById('confirmacionMensaje').innerHTML = `¿Está seguro que desea **eliminar** permanentemente al usuario **"${nombreUsuario}"** (ID: ${id})? Esta acción es irreversible.`;
            modalConfirmacion.show();
        }
    });

    // Ejecuta la acción de eliminación
    btnConfirmarAccion.addEventListener('click', async () => {
        const id = btnConfirmarAccion.dataset.usuarioId;
        const result = await fetchData(`${API_USUARIOS}/${id}`, 'DELETE');

        if (result) {
            modalConfirmacion.hide();
            await cargarUsuarios();
            alert(`Usuario (ID: ${id}) eliminado exitosamente.`);
        }
    });
    
    // =========================================================================
    // FILTRADO Y RECARGA
    // =========================================================================
    
    // Filtrado de tabla (cliente)
    document.querySelector('#formFiltroUsuarios').addEventListener('submit', (e) => {
        e.preventDefault();
        const filtro = document.getElementById('filtroTexto').value.toLowerCase().trim();
        const filas = tablaCuerpo.querySelectorAll('tr');

        filas.forEach(fila => {
            if (fila.classList.contains('text-center')) return; // Saltar el mensaje de "No hay usuarios"
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
    cargarUsuarios();
});