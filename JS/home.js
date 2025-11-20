// home.js - JavaScript para la página principal

document.addEventListener('DOMContentLoaded', function() {
    console.log('Sistema de Gestión - Página Principal Cargada');
    
    // Inicializar funcionalidades
    initializeHome();
    loadDashboardData();
    setupEventListeners();
});

function initializeHome() {
    // Configurar la página principal
    console.log('Inicializando página principal...');
    
    // Marcar el enlace actual como activo en el sidebar
    setActiveNavLink('home.html');
    
    // Configurar animaciones
    setupAnimations();
}

function setActiveNavLink(page) {
    // Remover clase active de todos los enlaces
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Agregar clase active al enlace correspondiente
    const currentLink = document.querySelector(`.sidebar .nav-link[href="${page}"]`);
    if (currentLink) {
        currentLink.classList.add('active');
    }
}

function setupAnimations() {
    // Animación de entrada para las tarjetas
    const actionCards = document.querySelectorAll('.action-card');
    const summaryCards = document.querySelectorAll('.summary-card');
    
    // Observador para animaciones al hacer scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.5 }); // Detecta cuando el 50% del elemento es visible
    
    actionCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(40px)';
        observer.observe(card);
    });
    
    summaryCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(40px)';
        observer.observe(card);
    });
}

function loadDashboardData() {
    // Simulación de carga de datos para las tarjetas de resumen
    setTimeout(() => {
        document.querySelector('.summary-card h3.text-success').textContent = '$1,250,000';
        document.querySelector('.summary-card h3.text-primary').textContent = '250';
        document.querySelector('.summary-card h3.text-warning').textContent = '3';
        document.querySelector('.summary-card h3.text-info').textContent = '1,200';
    }, 500);
}

function setupEventListeners() {
    // Asignar el evento al botón de logout
    const logoutLink = document.querySelector('.logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}
    // Simulación de rol del usuario (esto debería venir del backend o del localStorage)
    const userRole = localStorage.getItem('userRole') || 'admin'; // 'admin' o 'usuario'

document.addEventListener('DOMContentLoaded', () => {
    const userType = localStorage.getItem('userType');
    const gestionUsuariosLink = document.querySelector("a[href='HTML/gestiondeusuarios.html']");
    const finanzasLink = document.querySelector("a[href='HTML/finanzas.html']");
    const inventarioLink = document.querySelector("a[href='HTML/inventory.html']");

    if (userType === 'user') {
        if (gestionUsuariosLink) gestionUsuariosLink.style.display = 'none';
        if (finanzasLink) finanzasLink.style.display = 'none';
        if (inventarioLink) {
            inventarioLink.textContent = 'Productos';
            inventarioLink.href = 'HTML/productos.html';
        }
    } else {
        if (gestionUsuariosLink) gestionUsuariosLink.style.display = '';
        if (finanzasLink) finanzasLink.style.display = '';
        if (inventarioLink) {
            inventarioLink.innerHTML = '<i class="fas fa-boxes me-2"></i> Gestión de Inventario';
            inventarioLink.href = 'inventory.html';
        }
    }
});