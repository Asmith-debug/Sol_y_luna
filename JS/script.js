function handleLogin(event) {
    if (event) event.preventDefault(); // Evita recarga si es submit

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (username === 'Administrador' && password === '12345') {
        localStorage.setItem('userType', 'admin');
        localStorage.setItem('username', username);
        window.location.href = 'home.html';
    } else if (username === 'Usuario' && password === '12345') {
        localStorage.setItem('userType', 'user');
        localStorage.setItem('username', username);
        window.location.href = 'home.html';
    } else {
        alert('Credenciales incorrectas. Por favor, verifique su usuario y contraseña.');
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const userType = localStorage.getItem('userType'); // Obtiene el tipo de usuario

    const gestionUsuariosLink = document.querySelector("a[href='HTML/gestiondeusuarios.html']");
    const finanzasLink = document.querySelector("a[href='HTML/finanzas.html']");
    const inventarioLink = document.querySelector("a[href='HTML/inventory.html']");

    if (userType === 'user') {
        // Ocultar Gestión de Usuarios y Finanzas
        if (gestionUsuariosLink) gestionUsuariosLink.style.display = 'none';
        if (finanzasLink) finanzasLink.style.display = 'none';

        // Cambiar Gestión de Inventario a Productos
        if (inventarioLink) {
            inventarioLink.textContent = 'Productos';
            inventarioLink.href = 'HTML/productos.html'; // Nueva vista para productos
        }
    }
}); 

function logout() {
    localStorage.removeItem('userType');
    localStorage.removeItem('username');
    window.location.href = '../index.html';
}

function checkLogin() {
    const userType = localStorage.getItem('userType');
    if (userType && window.location.pathname.includes('index.html')) {
        window.location.href = 'home.html';
    }
}