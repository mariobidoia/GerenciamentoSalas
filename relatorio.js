
        document.addEventListener('DOMContentLoaded', () => {

            // --- CONFIGURAÇÃO E DADOS ---
            const API_BASE_URL = 'https://gerenciadorambientes.azurewebsites.net/api'; // 'https://localhost:7001/api'; //'https://gerenciadorambientes.azurewebsites.net/api'; //'https://gerenciadorambientes.azurewebsites.net/api';  'https://localhost:7001/api'; // CONFIRME SUA URL DA API

            // Copiado/Adaptado de script.js
            const sectors = [
                { id: 'salas', name: 'Salas', icon: '📚', rooms: [
                    { id: 'sala_01', name: 'Sala 01', posts: 32 }, { id: 'sala_02', name: 'Sala 02', posts: 32 },
                    { id: 'sala_03', name: 'Sala 03', posts: 32 }, { id: 'sala_04', name: 'Sala 04', posts: 32 },
                    { id: 'sala_05', name: 'Sala 05', posts: 32 }, { id: 'sala_06', name: 'Sala 06 - Unid 2', posts: 32 },
                    { id: 'sala_07', name: 'Sala 07 - Unid 2', posts: 16 }, { id: 'sala_08', name: 'Sala 08 - Unid 2', posts: 16 },
                ]},
                { id: 'laboratorios', name: 'Laboratórios', icon: '🖥️', rooms: [
                    { id: 'lab_info_01', name: 'Informática 01', posts: 20 }, { id: 'lab_info_02', name: 'Informática 02', posts: 20 },
                    { id: 'lab_hidraulica', name: 'Hidráulica', posts: 16 }, { id: 'lab_pneumatica', name: 'Pneumática', posts: 16 },
                    { id: 'carrinho_notebook_01', name: 'Notebooks 01 💻', posts: 20 }, { id: 'carrinho_notebook_02', name: 'Notebooks 02 💻', posts: 20 },
                ]},
                { id: 'usinagem', name: 'Usinagem', icon: '⚙️', rooms: [
                    { id: 'ajustagem', name: 'Ajustagem', posts: 12 }, { id: 'fresagem', name: 'Fresagem', posts: 16 },
                    { id: 'metrologia', name: 'Metrologia', posts: 15 }, { id: 'tornearia', name: 'Tornearia', posts: 12 },
                    { id: 'soldagem', name: 'Soldagem', posts: 10 }, { id: 'serralheria', name: 'Serralheria', posts: 12 },
                    { id: 'centro_cnc', name: 'Centro CNC 🖥️', posts: 16 }, { id: 'torno_cnc', name: 'Torno CNC 🖥️', posts: 16 },
                ]},
                { id: 'eletroeletronica', name: 'Eletroeletrônica', icon: '⚡️', rooms: [
                    { id: 'eletronica_01', name: 'Eletrônica 01 🖥️', posts: 16 }, { id: 'eletronica_02', name: 'Eletrônica 02 🖥️', posts: 16 },
                    { id: 'automacao', name: 'Automação', posts: 16 }, { id: 'clp', name: 'CLP 🖥️', posts: 16 },
                    { id: 'predial_01', name: 'Instalações Predial 01', posts: 16 }, { id: 'predial_02', name: 'Instalações Predial 02', posts: 16 },
                ]},
                { id: 'alimentos', name: 'Plantas Alimentos', icon: '🥣', rooms: [
                    { id: 'panificacao', name: 'Panificação', posts: 16 }, { id: 'biscoitos', name: 'Biscoitos', posts: 16 },
                    { id: 'leites', name: 'Leites', posts: 16 }, { id: 'carnes', name: 'Carnes', posts: 16 },
                    { id: 'chocolates', name: 'Chocolates', posts: 16 }, { id: 'lab_didatico', name: 'Lab. Didático', posts: 16 },
                ]},
                { id: 'mecanica', name: 'Mecânica', icon: '🔧', rooms: [
                    { id: 'mec_suspensao', name: 'Mecânica de Suspensão', posts: 16 }, { id: 'mec_transmissao', name: 'Mecânica de Transmissão', posts: 16 },
                    { id: 'mec_motor', name: 'Mecanica de Motor', posts: 16 }, { id: 'injecao', name: 'Eletronica Injeção', posts: 16 },
                ]}
            ];
            const periods = [
                { id: 'manha_antes', name: 'M. Antes Int.', group: 'Manhã ☀️' }, { id: 'manha_apos', name: 'M. Após Int.', group: 'Manhã ☀️' }, { id: 'manha_todo', name: 'Manhã Toda', group: 'Manhã ☀️' },
                { id: 'tarde_antes', name: 'T. Antes Int.', group: 'Tarde 🌇' }, { id: 'tarde_apos', name: 'T. Após Int.', group: 'Tarde 🌇' }, { id: 'tarde_todo', name: 'Tarde Toda', group: 'Tarde 🌇' },
                { id: 'noite_antes', name: 'N. Antes Int.', group: 'Noite 🌙' }, { id: 'noite_apos', name: 'N. Após Int.', group: 'Noite 🌙' }, { id: 'noite_todo', name: 'Noite Toda', group: 'Noite 🌙' },
            ];

            let allSchedules = {};
            let allRecurring = [];
            let currentMonthDate = new Date();

            // REFERÊNCIAS DO DOM
            const prevMonthBtn = document.getElementById('prev-month-btn');
            const nextMonthBtn = document.getElementById('next-month-btn');
            const monthYearDisplay = document.getElementById('month-year-display');
            const calendarGrid = document.getElementById('calendar-grid');
            const loadingState = document.getElementById('loading-state');
            const errorState = document.getElementById('error-state');
            const printReportBtn = document.getElementById('print-report-btn');

            // --- FUNÇÕES DE UTILIDADE ---
            const formatDate = (date) => date.toISOString().split('T')[0];
            const getToken = () => localStorage.getItem('jwt_token');
            const getRoomNameById = (roomId) => sectors.flatMap(s => s.rooms).find(r => r.id === roomId)?.name || roomId;
            const getPeriodNameById = (periodId) => periods.find(p => p.id === periodId)?.name || periodId;

            async function apiFetch(endpoint, options = {}) {
                const token = getToken();
                 if (!token) {
                     errorState.innerHTML = `<p class="text-red-400 font-bold text-lg">Não autenticado.</p><p class="text-gray-400 mt-2">Faça login no sistema principal primeiro.</p><a href="index.html" class="mt-4 inline-block bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded text-sm">Ir para Login</a>`;
                     errorState.style.display = 'block'; loadingState.style.display = 'none'; calendarGrid.style.display = 'none';
                     throw new Error('Token não encontrado.');
                 }
                const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers };
                try {
                    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
                    if (response.status === 401) { localStorage.removeItem('jwt_token'); throw new Error('Sessão expirada. Faça login novamente.'); }
                    if (!response.ok) { const et = await response.text(); throw new Error(`Falha (${response.status}): ${et || 'Erro desconhecido'}`); }
                    if (response.status === 204) return null;
                    const text = await response.text(); return text ? JSON.parse(text) : null;
                } catch (err) { console.error(`Erro API (${endpoint}):`, err); throw err; }
            }

            // Função adaptada para buscar apenas agendamentos CONFIRMADOS (não bloqueados)
            function getConfirmedBookingForDate(roomId, date, periodId) {
                const dateKey = formatDate(date);
                const currentDate = new Date(dateKey + 'T12:00:00Z'); // Use UTC
                const dayOfWeek = currentDate.getUTCDay();

                // 1. Verifica agendamento único (NÃO bloqueado)
                const dayScheduleData = allSchedules[dateKey]?.[roomId]?.[periodId];
                if (dayScheduleData && !dayScheduleData.isBlocked) {
                    return { prof: dayScheduleData.prof, turma: dayScheduleData.turma, periodName: getPeriodNameById(periodId), periodId: periodId }; // Inclui periodId
                }

                // 2. Verifica agendamento recorrente
                const recurring = allRecurring.find(r => {
                    if (r.roomId !== roomId || r.period !== periodId) return false;
                    const startDate = new Date(r.startDate.split('T')[0] + 'T12:00:00Z');
                    const endDate = new Date(r.endDate.split('T')[0] + 'T12:00:00Z');
                    if (currentDate < startDate || currentDate > endDate) return false;
                    if (r.type === 'weekly') return r.daysOfWeek.includes(dayOfWeek);
                    if (r.type === 'daily') return !r.weekdaysOnly || (dayOfWeek >= 1 && dayOfWeek <= 5);
                    return false;
                });

                if (recurring) {
                    return { prof: recurring.prof, turma: recurring.turma, periodName: getPeriodNameById(periodId), periodId: periodId }; // Inclui periodId
                }
                return null;
            }

            // --- LÓGICA DO RELATÓRIO ---

            async function loadReportData() {
                loadingState.style.display = 'block';
                errorState.style.display = 'none';
                calendarGrid.style.display = 'none';
                if (monthYearDisplay) monthYearDisplay.textContent = 'Carregando Dados...';

                try {
                    const [schedulesData, recurringData] = await Promise.all([
                        apiFetch('/Data/schedules'),
                        apiFetch('/Data/recurring-schedules')
                    ]);
                    allSchedules = schedulesData || {};
                    allRecurring = recurringData || [];
                    renderCalendar(currentMonthDate.getUTCFullYear(), currentMonthDate.getUTCMonth()); // Use UTC
                } catch (error) {
                    console.error("Erro ao carregar dados:", error);
                    loadingState.style.display = 'none';
                    errorState.style.display = 'block';
                    const errorMsgElement = errorState.querySelector('p:last-child');
                    if (errorMsgElement) errorMsgElement.textContent = `Detalhes: ${error.message}`;
                    if (monthYearDisplay) monthYearDisplay.textContent = 'Erro';
                }
            }

            function renderCalendar(year, month) {
                 if (!calendarGrid || !monthYearDisplay) return;

                 loadingState.style.display = 'none';
                 errorState.style.display = 'none';
                 calendarGrid.style.display = 'grid'; // Usa 'grid'

                currentMonthDate = new Date(Date.UTC(year, month, 1));
                monthYearDisplay.textContent = currentMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

                const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
                const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0));
                const daysInMonth = lastDayOfMonth.getUTCDate();
                const startDayOfWeek = firstDayOfMonth.getUTCDay();
                const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

                calendarGrid.className = 'grid grid-cols-7 text-center'; // Aplica classes Tailwind
                let html = '';

                weekdays.forEach(day => { html += `<div class="font-semibold p-2 weekday-header text-sm">${day}</div>`; });
                for (let i = 0; i < startDayOfWeek; i++) { html += `<div class="calendar-day-cell other-month"></div>`; }

                for (let day = 1; day <= daysInMonth; day++) {
                    const currentDate = new Date(Date.UTC(year, month, day, 12));
                    // Conteúdo interno da célula agora em um div separado para permitir scroll
                    let dayCellInnerHtml = `<div class="font-bold text-sm mb-1">${day}</div><div>`; // Div container para bookings
                    let bookingsHtml = '';

                    // Ordena agendamentos por período antes de renderizar
                    const dailyBookings = [];
                    for (const sector of sectors) {
                        for (const room of sector.rooms) {
                            for (const period of periods) {
                                const booking = getConfirmedBookingForDate(room.id, currentDate, period.id);
                                if (booking) {
                                     dailyBookings.push({ ...booking, roomName: getRoomNameById(room.id) });
                                }
                            }
                        }
                    }
                    dailyBookings.sort((a, b) => {
                        const order = { 'manha': 1, 'tarde': 2, 'noite': 3 };
                        const turnA = a.periodId.split('_')[0];
                        const turnB = b.periodId.split('_')[0];
                        return (order[turnA] || 9) - (order[turnB] || 9);
                    });

                    // Itera sobre os agendamentos ORDENADOS
                    for(const booking of dailyBookings) {
                        let colorClass = '';
                        if (booking.periodId.startsWith('manha_')) colorClass = 'booking-manha';
                        else if (booking.periodId.startsWith('tarde_')) colorClass = 'booking-tarde';
                        else if (booking.periodId.startsWith('noite_')) colorClass = 'booking-noite';

                        bookingsHtml += `
                            <div class="booking-entry ${colorClass}">
                                <strong>${booking.roomName}</strong> (${booking.periodName})<br>
                                <span class="text-gray-400">${booking.prof || '?'} - ${booking.turma || '?'}</span>
                            </div>
                        `;
                    }

                    dayCellInnerHtml += bookingsHtml + '</div>'; // Fecha div container de bookings
                    // Adiciona a célula principal ao HTML
                    html += `<div class="calendar-day-cell bg-gray-900">${dayCellInnerHtml}</div>`;
                }

                const totalCells = startDayOfWeek + daysInMonth;
                const remainingCells = 7 - (totalCells % 7);
                if (remainingCells < 7) { for (let i = 0; i < remainingCells; i++) { html += `<div class="calendar-day-cell other-month"></div>`; } }

                calendarGrid.innerHTML = html;
            }

            // Função para mudar o mês
            function changeMonth(amount) {
                currentMonthDate.setUTCMonth(currentMonthDate.getUTCMonth() + amount);
                renderCalendar(currentMonthDate.getUTCFullYear(), currentMonthDate.getUTCMonth());
            }

            // --- EVENT LISTENERS ---
            if (prevMonthBtn) prevMonthBtn.onclick = () => changeMonth(-1);
            if (nextMonthBtn) nextMonthBtn.onclick = () => changeMonth(1);

            // Listener para o botão Imprimir
            if (printReportBtn) {
                 printReportBtn.onclick = () => {
                     window.print(); // Chama a função de impressão do navegador
                 };
            }

            // --- INICIALIZAÇÃO ---
            loadReportData();

        }); // Fim DOMContentLoaded
    