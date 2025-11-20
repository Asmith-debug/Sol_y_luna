// finanzas.js - Refactorizado para usar la API de reportes

// =========================================================================
// CONFIGURACIÓN Y REFERENCIAS GLOBALES (CONEXIÓN API)
// =========================================================================
const API_FINANZAS_REPORTE = 'http://127.0.0.1:8000/api/finanzas/reporte';

// Función auxiliar para formatear a moneda (ejemplo Chileno: 'es-CL')
const formatCurrency = (amount) => {
    // Asegura que el número se formatee con separadores de miles y decimales
    return `$${(Math.round(amount * 100) / 100).toLocaleString('es-CL')}`;
}

// =========================================================================
// FUNCIÓN 1: CARGAR DATOS FINANCIEROS Y RESUMEN
// =========================================================================
async function cargarDatosFinancieros() {
    const tablaCuerpoResumen = document.getElementById('tablaCuerpoResumen');
    // Asegúrate de que el <tbody> de tu tabla en finanzas.html tiene id="tablaCuerpoResumen"
    if (tablaCuerpoResumen) {
        tablaCuerpoResumen.innerHTML = `<tr><td colspan="5" class="text-center">Cargando datos financieros...</td></tr>`;
    }

    try {
        const response = await fetch(API_FINANZAS_REPORTE, {
            headers: { 'Accept': 'application/json' }
        });
        const data = await response.json();

        if (!response.ok || !data.resumen_general || !data.datos_historicos) {
            throw new Error('Formato de datos de API inválido.');
        }

        // Actualizar Tabla de Resumen y Gráfico
        actualizarTablaResumen(data.resumen_general);
        actualizarGrafico(data.datos_historicos);

    } catch (error) {
        console.error('Error al cargar datos financieros:', error);
        if (tablaCuerpoResumen) {
            tablaCuerpoResumen.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error al cargar datos: ${error.message}</td></tr>`;
        }
        // Puedes actualizar el gráfico con datos vacíos en caso de error
        actualizarGrafico([]);
    }
}

// =========================================================================
// FUNCIÓN 2: ACTUALIZAR TABLA DE RESUMEN (INGRESO VS COSTO)
// =========================================================================
function actualizarTablaResumen(resumen) {
    const {
        ingresos_totales,
        costo_mercaderia_vendida,
        ganancia_bruta,
        gastos_operativos,
        ganancia_neta
    } = resumen;
    
    // Cálculo de márgenes
    const margenBrutoPorc = ingresos_totales > 0 ? ((ganancia_bruta / ingresos_totales) * 100).toFixed(1) : '0.0';
    const margenNetoPorc = ingresos_totales > 0 ? ((ganancia_neta / ingresos_totales) * 100).toFixed(1) : '0.0';
    
    const costosTotales = costo_mercaderia_vendida + gastos_operativos;

    const tablaCuerpoResumen = document.getElementById('tablaCuerpoResumen');
    if (!tablaCuerpoResumen) return;

    // Inyección de filas con datos reales y cálculos
    tablaCuerpoResumen.innerHTML = `
        <tr class="table-primary fw-bold">
            <td>Ingresos por Ventas (Ventas Brutas)</td>
            <td>${formatCurrency(ingresos_totales)}</td>
            <td>${formatCurrency(costo_mercaderia_vendida)}</td>
            <td>${formatCurrency(ganancia_bruta)}</td>
            <td>${margenBrutoPorc}%</td>
        </tr>
        <tr class="table-danger">
            <td>Gastos Operacionales (OPEX)</td>
            <td>-</td>
            <td>${formatCurrency(gastos_operativos)}</td>
            <td>${formatCurrency(-gastos_operativos)}</td>
            <td>-</td>
        </tr>
        <tr class="table-success fw-bold">
            <td>GANANCIA NETA FINAL</td>
            <td>${formatCurrency(ingresos_totales)}</td>
            <td>${formatCurrency(costosTotales)}</td>
            <td>${formatCurrency(ganancia_neta)}</td>
            <td>${margenNetoPorc}%</td>
        </tr>
    `;
}

// =========================================================================
// FUNCIÓN 3: ACTUALIZAR GRÁFICO CON DATOS HISTÓRICOS
// =========================================================================
function actualizarGrafico(historico) {
    const ctx = document.getElementById('ventasGastosChart').getContext('2d');
    
    // Destruir el gráfico anterior si existe
    if (Chart.getChart(ctx)) {
        Chart.getChart(ctx).destroy();
    }
    
    const labels = historico.map(d => d.mes);
    const datosVentas = historico.map(d => d.ventas);
    // Nota: 'gastos' en el contexto del gráfico suelen ser los Gastos Operativos.
    const datosGastos = historico.map(d => d.gastos); 

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Ventas (Ingresos Brutos)',
                    data: datosVentas,
                    backgroundColor: '#2980b9' // Azul
                },
                {
                    label: 'Gastos Operativos',
                    data: datosGastos,
                    backgroundColor: '#e74c3c' // Rojo
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Monto ($)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += formatCurrency(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}


// =========================================================================
// INICIALIZACIÓN
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Asignar un ID al tbody de la tabla de resumen para que el JS lo encuentre.
    const resumenTableBody = document.querySelector('.table-responsive table tbody');
    if (resumenTableBody) {
        resumenTableBody.id = 'tablaCuerpoResumen';
    }

    // El resto de la lógica de finanzas.js (manejo de roles)
    const userType = localStorage.getItem('userType');
    const inventarioLink = document.querySelector("a[href='inventory.html']");
    if (userType === 'user' && inventarioLink) {
        inventarioLink.innerHTML = '<i class="fas fa-boxes me-2"></i> Productos';
        inventarioLink.href = 'productos.html';
        if (window.location.pathname.includes('productos.html')) {
            inventarioLink.classList.add('active');
        }
    }
    
    // ⭐️ Iniciar la carga de datos de finanzas
    cargarDatosFinancieros();
});