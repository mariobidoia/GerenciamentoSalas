document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÃO DA API ---
    const API_BASE_URL = 'https://gerenciadorambientes.azurewebsites.net/api';

    // --- DADOS E ESTADO DA APLICAÇÃO ---
    const sectors = [
        { id: 'salas', name: 'Salas', icon: '📚', rooms: [
            { id: 'sala_01', name: 'Sala 01', posts: 32 }, { id: 'sala_02', name: 'Sala 02', posts: 32 },
            { id: 'sala_03', name: 'Sala 03', posts: 32 }, { id: 'sala_04', name: 'Sala 04', posts: 32 },
            { id: 'sala_05', name: 'Sala 05', posts: 32 }, { id: 'sala_06', name: 'Sala 06 - Unid 2', posts: 32 },
            { id: 'sala_07', name: 'Sala 07 - Unid 2', posts: 16 }, { id: 'sala_08', name: 'Sala 08 - Unid 2', posts: 16 },
        ]},
        { id: 'laboratorios', name: 'Laboratórios', icon: '🖥️', rooms: [
            { id: 'lab_info_01', name: 'Informática 01', posts: 20 },
            { id: 'lab_info_02', name: 'Informática 02', posts: 20 },
            { id: 'lab_hidraulica', name: 'Hidráulica', posts: 16 },
            { id: 'lab_pneumatica', name: 'Pneumática', posts: 16 },
            { id: 'carrinho_notebook_01', name: 'Notebooks 01 💻', posts: 20 },
            { id: 'carrinho_notebook_02', name: 'Notebooks 02 💻', posts: 20 },
        ]},
        { id: 'usinagem', name: 'Usinagem', icon: '⚙️', rooms: [
            { id: 'ajustagem', name: 'Ajustagem', posts: 12 }, { id: 'fresagem', name: 'Fresagem', posts: 16 },
            { id: 'metrologia', name: 'Metrologia', posts: 15 }, { id: 'tornearia', name: 'Tornearia', posts: 12 },
            { id: 'soldagem', name: 'Soldagem', posts: 10 }, { id: 'serralheria', name: 'Serralheria', posts: 12 },
            { id: 'centro_cnc', name: 'Centro CNC 🖥️', posts: 16 }, { id: 'torno_cnc', name: 'Torno CNC 🖥️', posts: 16 },
        ]},
        { id: 'eletroeletronica', name: 'Eletroeletrônica', icon: '⚡️', rooms: [
            { id: 'eletronica_01', name: 'Eletrônica 01 🖥️', posts: 16 },
            { id: 'eletronica_02', name: 'Eletrônica 02 🖥️', posts: 16 },
            { id: 'automacao', name: 'Automação', posts: 16 },
            { id: 'clp', name: 'CLP 🖥️', posts: 16 },
            { id: 'predial_01', name: 'Instalações Predial 01', posts: 16 },
            { id: 'predial_02', name: 'Instalações Predial 02', posts: 16 },
        ]},
        { id: 'alimentos', name: 'Plantas Alimentos', icon: '🥣', rooms: [
            { id: 'panificacao', name: 'Panificação', posts: 16 }, { id: 'biscoitos', name: 'Biscoitos', posts: 16 },
            { id: 'leites', name: 'Leites', posts: 16 }, { id: 'carnes', name: 'Carnes', posts: 16 },
            { id: 'chocolates', name: 'Chocolates', posts: 16 }, { id: 'lab_didatico', name: 'Lab. Didático', posts: 16 },
        ]},
        { id: 'mecanica', name: 'Mecânica', icon: '🔧', rooms: [
            { id: 'mec_suspensao', name: 'Mecânica de Suspensão', posts: 16 },
            { id: 'mec_transmissao', name: 'Mecânica de Transmissão', posts: 16 },
            { id: 'mec_motor', name: 'Mecanica de Motor', posts: 16 },
            { id: 'injecao', name: 'Eletronica Injeção', posts: 16 },
        ]}
    ];

    const periods = [
        { id: 'manha_antes', name: 'Antes do Intervalo', group: 'Manhã ☀️' },
        { id: 'manha_apos', name: 'Após o Intervalo', group: 'Manhã ☀️' },
        { id: 'manha_todo', name: 'Período Todo', group: 'Manhã ☀️' },
        { id: 'tarde_antes', name: 'Antes do Intervalo', group: 'Tarde 🌇' },
        { id: 'tarde_apos', name: 'Após o Intervalo', group: 'Tarde 🌇' },
        { id: 'tarde_todo', name: 'Período Todo', group: 'Tarde 🌇' },
        { id: 'noite_antes', name: 'Antes do Intervalo', group: 'Noite 🌙' },
        { id: 'noite_apos', name: 'Após o Intervalo', group: 'Noite 🌙' },
        { id: 'noite_todo', name: 'Período Todo', group: 'Noite 🌙' },
    ];
    let schedules = {};
    let pendingRequests = [];
    let recurringSchedules = [];
    let allUsers = [];
    let state = {
        currentUserRole: null, currentUserName: '', currentUserId: null, selectedRoomId: null, currentDate: new Date(), viewMode: 'daily',
    };

    // --- REFERÊNCIAS DO DOM ---
    const loginScreen = document.getElementById('login-screen');
    const mainContent = document.getElementById('main-content');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const roleFlag = document.getElementById('role-flag');
    const dashboard = document.getElementById('dashboard');
    const scheduleModal = document.getElementById('schedule-modal');
    const modalContent = document.getElementById('modal-content');
    const requestModal = document.getElementById('request-modal');
    const notificationsModal = document.getElementById('notifications-modal');
    const notificationsBellContainer = document.getElementById('notifications-bell-container');
    const notificationsBell = document.getElementById('notifications-bell');
    const changePasswordModal = document.getElementById('change-password-modal');
    const changePasswordForm = document.getElementById('change-password-form');
    const changePasswordError = document.getElementById('change-password-error');
    const myAllSchedulesBtn = document.getElementById('my-all-schedules-btn');
    const myAllSchedulesModal = document.getElementById('my-all-schedules-modal');
    
    // --- FUNÇÕES DE UTILIDADE ---
    const formatDate = (date) => date.toISOString().split('T')[0];
    const getStartOfWeek = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -7 : 0);
        return new Date(d.setDate(diff));
    };
    const getToken = () => localStorage.getItem('jwt_token');

    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    const getRoomNameById = (roomId) => {
        return sectors.flatMap(s => s.rooms).find(r => r.id === roomId)?.name || roomId;
    };
    
    // --- LÓGICA DE OBTENÇÃO DE DADOS ---
    const getBookingForDate = (roomId, date, periodId) => {
        const dateKey = formatDate(date);
        const daySchedule = schedules[dateKey]?.[roomId]?.[periodId];
        if (daySchedule) return daySchedule;

        const recurring = recurringSchedules.find(r => {
            if (r.roomId !== roomId || r.period !== periodId) return false;
            const currentDate = new Date(dateKey + 'T12:00:00');
            const startDate = new Date(r.startDate.split('T')[0] + 'T12:00:00');
            const endDate = new Date(r.endDate.split('T')[0] + 'T12:00:00');

            if (currentDate < startDate || currentDate > endDate) return false;

            if (r.type === 'weekly') {
                return r.daysOfWeek.includes(date.getDay());
            }
            if (r.type === 'daily') {
                if (r.weekdaysOnly) {
                    const day = date.getDay();
                    return day >= 1 && day <= 5;
                }
                return true;
            }
            return false;
        });
        if (recurring) return { ...recurring, isRecurring: true };
        return null;
    };

    const hasAnyActivityForDay = (roomId, date) => {
        const dateKey = formatDate(date);

        // Verifica agendamentos diretos
        if (schedules[dateKey] && schedules[dateKey][roomId] && Object.keys(schedules[dateKey][roomId]).length > 0) {
            return true;
        }

        // Verifica agendamentos recorrentes
        const isRecurringBooked = recurringSchedules.some(r => {
            if (r.roomId !== roomId) return false;
            const currentDateOnly = new Date(dateKey + 'T12:00:00Z');
            const startDate = new Date(r.startDate.split('T')[0] + 'T12:00:00Z');
            const endDate = new Date(r.endDate.split('T')[0] + 'T12:00:00Z');
            
            if (currentDateOnly < startDate || currentDateOnly > endDate) return false;
            
            if (r.type === 'weekly') return r.daysOfWeek.includes(date.getUTCDay());
            if (r.type === 'daily') {
                if (r.weekdaysOnly) return date.getUTCDay() >= 1 && date.getUTCDay() <= 5;
                return true;
            }
            return false;
        });
        if (isRecurringBooked) return true;

        // Verifica solicitações pendentes
        const isPending = pendingRequests.some(r => {
            if (r.roomId !== roomId) return false;
            if (r.isRecurring) {
                const currentDateOnly = new Date(dateKey + 'T12:00:00Z');
                const startDate = new Date(r.startDate.split('T')[0] + 'T12:00:00Z');
                const endDate = new Date(r.endDate.split('T')[0] + 'T12:00:00Z');
                if (currentDateOnly < startDate || currentDateOnly > endDate) return false;
                if (r.type === 'weekly') return r.daysOfWeek.includes(date.getUTCDay());
                if (r.type === 'daily') {
                    if (r.weekdaysOnly) return date.getUTCDay() >= 1 && date.getUTCDay() <= 5;
                    return true;
                }
            } else {
                return r.date && r.date.startsWith(dateKey);
            }
            return false;
        });
        if (isPending) return true;

        return false;
    };

    // --- FUNÇÕES DE RENDERIZAÇÃO (VIEWS) ---
    const renderDashboard = () => {
        const currentDate = new Date();

        dashboard.innerHTML = sectors.map(sector => {
            const roomsHtml = sector.rooms.map(room => {
                const hasBooking = hasAnyActivityForDay(room.id, currentDate);

                const statusHtml = hasBooking
                    ? `<span class="text-xs text-red-400 flex items-center justify-end"><span class="w-2 h-2 rounded bg-red-400 mr-2"></span>Ocupado</span>`
                    : `<span class="text-xs text-green-400 flex items-center justify-end"><span class="w-2 h-2 rounded bg-green-400 mr-2"></span>Disponível</span>`;

                return `
                    <li class="bg-gray-800 rounded-lg p-3 cursor-pointer hover:bg-cyan-700 transition-colors" data-room-id="${room.id}">
                        <div class="grid grid-cols-2 items-center gap-2">
                            <div>
                            <div class="font-medium text-sm col-span-2 text-left">${room.name} </div>
                            <div class="font-small text-xs col-span-2 text-left">   ${room.posts} 👤 </div>
                            </div>                          
                            <div class="col-span-1">${statusHtml}</div>
                        </div>
                    </li>
                `;
            }).join('');

            return `
                <div class="bg-gray-800 rounded-lg p-4 flex flex-col">
                    <h2 class="text-xl font-bold text-cyan-400 border-b-2 border-gray-700 pb-2 mb-4 flex items-center gap-3">
                        <span class="text-2xl">${sector.icon}</span>
                        ${sector.name}
                    </h2>
                    <ul class="space-y-2">
                        ${roomsHtml}
                    </ul>
                </div>
            `;
        }).join('');
    };
    
    const renderModal = () => {
        const room = sectors.flatMap(s => s.rooms).find(r => r.id === state.selectedRoomId);

        modalContent.innerHTML = `
            <div class="p-6">
                <div class="flex justify-between items-start mb-4">
                    <div><h2 class="text-2xl font-bold text-cyan-400">${room.name}</h2><p class="text-gray-400">Calendário de Ocupação</p></div>
                    <button id="close-modal-btn" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div class="flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-900 p-2 rounded-md mb-6">
                    <div class="flex items-center gap-2"><button id="prev-btn" class="px-3 py-1 bg-gray-700 rounded hover:bg-cyan-600 transition-colors">Anterior</button><button id="next-btn" class="px-3 py-1 bg-gray-700 rounded hover:bg-cyan-600 transition-colors">Próximo</button></div>
                    <span id="date-display" class="font-semibold text-center order-first sm:order-none"></span>
                    <div class="flex items-center bg-gray-700 rounded-md p-1">
                        <button id="daily-view-btn" class="px-3 py-1 rounded-md text-sm ${state.viewMode === 'daily' ? 'bg-cyan-600' : ''}">Diária</button>
                        <button id="weekly-view-btn" class="px-3 py-1 rounded-md text-sm ${state.viewMode === 'weekly' ? 'bg-cyan-600' : ''}">Semanal</button>
                        <button id="monthly-view-btn" class="px-3 py-1 rounded-md text-sm ${state.viewMode === 'monthly' ? 'bg-cyan-600' : ''}">Mensal</button>
                    </div>
                </div>
                <div id="calendar-content"></div>
            </div>
        `;
        renderCalendarContent();
    };

    const renderCalendarContent = () => {
        if (state.viewMode === 'daily') {
            document.getElementById('date-display').textContent = state.currentDate.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            renderDailyView();
        } else if (state.viewMode === 'monthly') {
            document.getElementById('date-display').textContent = state.currentDate.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
            renderMonthlyView();
        } else {
            const startOfWeek = getStartOfWeek(state.currentDate);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            document.getElementById('date-display').textContent = `${startOfWeek.toLocaleDateString('pt-BR')} - ${endOfWeek.toLocaleDateString('pt-BR')}`;
            renderWeeklyView();
        }
    };
    
    const renderDailyView = () => {
        const calendarContent = document.getElementById('calendar-content');
        const dateKey = formatDate(state.currentDate);
        const isCoordinator = state.currentUserRole === 'coordinator';
        
        const periodsByGroup = periods.reduce((acc, period) => {
            if (!acc[period.group]) acc[period.group] = [];
            acc[period.group].push(period);
            return acc;
        }, {});

        calendarContent.innerHTML = Object.keys(periodsByGroup).map(groupName => `
            <div class="bg-gray-800 p-4 rounded-lg mb-4">
                <h3 class="text-xl font-bold text-cyan-400 mb-3">${groupName}</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    ${periodsByGroup[groupName].map(period => {
                        const booking = getBookingForDate(state.selectedRoomId, state.currentDate, period.id);
                        const pending = pendingRequests.find(r => r.roomId === state.selectedRoomId && ((!r.isRecurring && r.date && r.date.startsWith(dateKey)) || (r.isRecurring)) && r.period === period.id);

                        let content = '';
                        if (booking?.isBlocked) {
                            content = `<p class="text-gray-400 font-medium">🚫 Bloqueado: ${booking.blockReason}</p>`;
                        } else if (booking) {
                            content = `<div class="text-left text-sm"><p><span class="font-medium text-gray-400">Professor:</span> ${booking.prof} ${booking.isRecurring ? '🔄' : ''}</p><p><span class="font-medium text-gray-400">Turma:</span> ${booking.turma}</p></div>`;
                        } else if (pending) {
                            content = `<p class="text-yellow-400 font-medium">⏳ Pendente (${pending.prof})</p>`;
                        } else {
                            content = `<button data-period-id="${period.id}" data-period-name="${period.name}" data-date="${dateKey}" class="request-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm w-full">Solicitar</button>`;
                        }
                        
                        const professorOptions = allUsers.map(user => `<option value="${user.id}" ${booking?.applicationUserId === user.id ? 'selected' : ''}>${user.fullName}</option>`).join('');

                        return `
                            <div class="bg-gray-900 p-4 rounded-lg">
                                <h4 class="font-semibold text-md mb-3">${period.name}</h4>
                                ${content}
                                ${isCoordinator ? `
                                    <div class="mt-4 pt-4 border-t border-gray-700">
                                        <div class="grid grid-cols-1 gap-3">
                                            <div>
                                                <label for="prof-${period.id}" class="text-xs text-gray-400">Professor</label>
                                                <select id="prof-${period.id}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm mt-1" ${booking?.isBlocked ? 'disabled' : ''}>
                                                    <option value="">Selecione...</option>
                                                    ${professorOptions}
                                                </select>
                                            </div>
                                            <div>
                                                <label for="turma-${period.id}" class="text-xs text-gray-400">Turma</label>
                                                <input type="text" id="turma-${period.id}" placeholder="Turma" value="${booking?.turma || ''}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm mt-1" ${booking?.isBlocked ? 'disabled' : ''}>
                                            </div>
                                        </div>
                                        <div class="flex items-center justify-between mt-3 flex-wrap gap-2">
                                        <!--     
                                        <div class="flex items-center gap-2">
                                                <input type="checkbox" id="recurring-${period.id}" data-recurring-id="${booking?.isRecurring ? booking.id : ''}" class="recurring-checkbox bg-gray-700 rounded" ${booking?.isRecurring ? 'checked' : ''}>
                                                <label for="recurring-${period.id}" class="text-sm">Recorrente</label>
                                            </div>-->
                                            <div class="flex items-center gap-2">
                                                <button data-period-id="${period.id}" data-date="${dateKey}" class="block-btn bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded-md text-xs">Bloquear</button>
                                                <button data-period-id="${period.id}" data-date="${dateKey}" class="save-btn bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-2 rounded-md text-xs">Salvar</button>
                                            </div>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `).join('');
    };
    
    const renderWeeklyView = () => {
        const calendarContent = document.getElementById('calendar-content');
        const startOfWeek = getStartOfWeek(state.currentDate);
        const days = Array.from({ length: 7 }).map((_, i) => { const d = new Date(startOfWeek); d.setDate(d.getDate() + i); return d; });
        
        const mainPeriods = [
            { id: 'Manhã', name: 'Manhã' },
            { id: 'Tarde', name: 'Tarde' },
            { id: 'Noite', name: 'Noite' }
        ];

        let html = '<div class="week-view-grid text-xs text-center">';
        html += '<div></div>' + days.map(d => `<div class="font-bold p-1">${d.toLocaleDateString('pt-BR', { weekday: 'short' })}<br>${d.getDate()}</div>`).join('');
        
        mainPeriods.forEach(period => {
            html += `<div class="font-bold p-2 text-right">${period.name}</div>`;
            days.forEach(day => {
                const subPeriods = periods.filter(p => p.group.startsWith(period.id));
                let hasBooking = false, hasPending = false, hasBlocked = false;
                for (const sub of subPeriods) {
                    const booking = getBookingForDate(state.selectedRoomId, day, sub.id);
                     if (booking?.isBlocked) hasBlocked = true;
                     else if (booking) hasBooking = true;
                }
                
                let cellContent = '<span class="text-green-400">✓</span>';
                let cellClass = 'bg-gray-700';
                if (hasBlocked) { cellContent = `🚫 Bloqueado`; cellClass = 'bg-gray-600'; }
                else if (hasBooking) { cellContent = `🔴 Ocupado`; cellClass = 'bg-red-800 bg-opacity-70'; }
                
                html += `<div class="week-view-cell p-2 rounded ${cellClass}">${cellContent}</div>`;
            });
        });
        html += '</div>';
        calendarContent.innerHTML = html;
    };

    const renderMonthlyView = () => {
        const calendarContent = document.getElementById('calendar-content');
        const year = state.currentDate.getFullYear();
        const month = state.currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startDayOfWeek = firstDayOfMonth.getDay();
        const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        let html = '<div class="month-view-grid text-center">';
        weekdays.forEach(day => { html += `<div class="font-bold p-2 text-xs text-gray-400">${day}</div>`; });
        for (let i = 0; i < startDayOfWeek; i++) { html += `<div class="month-day-cell is-other-month"></div>`; }
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            const dateKey = formatDate(currentDate);

            const getCombinedPeriodStatusStyle = (groupPeriod) => {
                const basePeriod = groupPeriod.toLowerCase().replace('ã', 'a');
                const antes = getBookingForDate(state.selectedRoomId, currentDate, `${basePeriod}_antes`);
                const apos = getBookingForDate(state.selectedRoomId, currentDate, `${basePeriod}_apos`);
                const todo = getBookingForDate(state.selectedRoomId, currentDate, `${basePeriod}_todo`);

                const isAntesBooked = antes && !antes.isBlocked;
                const isAposBooked = apos && !apos.isBlocked;
                const isTodoBooked = todo && !todo.isBlocked;

                const isAntesBlocked = antes && antes.isBlocked;
                const isAposBlocked = apos && apos.isBlocked;
                const isTodoBlocked = todo && todo.isBlocked;

                if (isTodoBooked || (isAntesBooked && isAposBooked)) return 'bg-red-500';
                if (isAntesBooked) return 'bg-half-left-red';
                if (isAposBooked) return 'bg-half-right-red';

                if (isTodoBlocked || (isAntesBlocked && isAposBlocked)) return 'bg-gray-500';
                if (isAntesBlocked) return 'bg-half-left-gray';
                if (isAposBlocked) return 'bg-half-right-gray';
                
                const hasPending = pendingRequests.some(r => r.date === dateKey && r.period.startsWith(basePeriod));
                if(hasPending) return 'bg-yellow-500';

                return 'bg-green-500';
            };

            html += `<div class="month-day-cell text-left cursor-pointer hover:bg-gray-600 transition-colors" data-date="${dateKey}"><div class="font-bold">${day}</div><div class="period-summary"><span title="Manhã" class="w-5 h-5 flex items-center justify-center text-xs font-bold text-white ${getCombinedPeriodStatusStyle('Manhã')}">M</span><span title="Tarde" class="w-5 h-5 flex items-center justify-center text-xs font-bold text-white ${getCombinedPeriodStatusStyle('Tarde')}">T</span><span title="Noite" class="w-5 h-5 flex items-center justify-center text-xs font-bold text-white ${getCombinedPeriodStatusStyle('Noite')}">N</span></div></div>`;
        }
        html += '</div>';
        calendarContent.innerHTML = html;
    };
    
    const openRequestModal = (periodId, periodName, date) => {
        const room = sectors.flatMap(s => s.rooms).find(r => r.id === state.selectedRoomId);
        const dateDisplay = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {dateStyle: 'full'});
        const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const dayOfWeek = new Date(date + 'T12:00:00').getDay();

        requestModal.innerHTML = `
            <div class="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-auto animate-fade-in p-6">
                <h3 class="text-xl font-bold text-cyan-400 mb-2">Solicitar Agendamento</h3>
                <p class="text-gray-400 mb-4">Ambiente: <strong>${room.name}</strong><br>Período: <strong>${periodName}</strong></p>
                <form id="request-form">
                    <div>
                        <label for="turma-request" class="block mb-2 text-sm font-medium">Sua Turma</label>
                        <input type="text" id="turma-request" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" required>
                    </div>
                   
                    <div style="display: none;" class="mt-4 pt-4 border-t border-gray-700">
                        <div class="flex items-center gap-2">
                            <input type="checkbox" id="recurring-request-checkbox" class="bg-gray-700 rounded">
                            <label for="recurring-request-checkbox" class="text-sm font-medium">Solicitação Recorrente</label>
                        </div>
                    </div>

                    <div id="recurring-request-options" class="hidden mt-4 p-3 bg-gray-900 rounded-md space-y-4">
                        <div>
                            <label class="text-sm font-medium">Tipo de Recorrência</label>
                            <div class="flex gap-4 mt-2">
                                <div><input type="radio" id="type-weekly-request" name="recurring-type-request" value="weekly" class="recurring-type-radio-request" checked><label for="type-weekly-request" class="ml-2 text-sm">Semanal</label></div>
                                <div><input type="radio" id="type-daily-request" name="recurring-type-request" value="daily" class="recurring-type-radio-request"><label for="type-daily-request" class="ml-2 text-sm">Intervalo de Dias</label></div>
                            </div>
                        </div>
                        <div id="weekly-options-request" class="space-y-2">
                            <label class="text-sm font-medium">Repetir nos dias:</label>
                            <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                                ${weekdays.map((day, index) => `
                                    <div><input type="checkbox" id="weekday-request-${index}" value="${index}" class="weekday-checkbox-request" ${index === dayOfWeek ? 'checked' : ''}><label for="weekday-request-${index}" class="ml-2">${day}</label></div>
                                `).join('')}
                            </div>
                        </div>
                        <div id="daily-options-request" class="hidden space-y-2">
                             <div><input type="checkbox" id="weekdays-only-request" class="weekdays-only-checkbox-request"><label for="weekdays-only-request" class="ml-2 text-sm">Apenas dias úteis (Seg-Sex)</label></div>
                        </div>
                        <div>
                            <label for="recurring-end-date-request" class="text-sm font-medium">Repetir até:</label>
                            <input type="date" id="recurring-end-date-request" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mt-1 text-sm">
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 mt-6">
                        <button type="button" id="cancel-request-btn" class="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700 transition-colors">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-cyan-600 rounded hover:bg-cyan-700 font-semibold transition-colors">Enviar Solicitação</button>
                    </div>
                </form>
            </div>
        `;
        requestModal.classList.add('is-open');

        document.getElementById('cancel-request-btn').onclick = () => requestModal.classList.remove('is-open');
        
        document.getElementById('recurring-request-checkbox').onchange = (e) => {
            document.getElementById('recurring-request-options').classList.toggle('hidden', !e.target.checked);
        };

        document.querySelectorAll('.recurring-type-radio-request').forEach(radio => {
            radio.onchange = (e) => {
                const isWeekly = e.target.value === 'weekly';
                document.getElementById('weekly-options-request').classList.toggle('hidden', !isWeekly);
                document.getElementById('daily-options-request').classList.toggle('hidden', isWeekly);
            };
        });

        document.getElementById('request-form').onsubmit = (e) => {
            e.preventDefault();
            const turma = document.getElementById('turma-request').value.trim();
            const isRecurring = document.getElementById('recurring-request-checkbox').checked;

            let payload = { roomId: state.selectedRoomId, date, period: periodId, turma, isRecurring };
            
            if(isRecurring) {
                const type = document.querySelector('input[name="recurring-type-request"]:checked').value;
                const endDate = document.getElementById('recurring-end-date-request').value;
                if (!endDate) { alert("Por favor, selecione a data final da recorrência."); return; }

                payload.type = type;
                payload.endDate = endDate;
                payload.startDate = date;

                if (type === 'weekly') {
                    payload.daysOfWeek = Array.from(document.querySelectorAll('.weekday-checkbox-request:checked')).map(cb => parseInt(cb.value));
                    if (payload.daysOfWeek.length === 0) { alert("Selecione pelo menos um dia da semana."); return; }
                } else {
                    payload.weekdaysOnly = document.getElementById('weekdays-only-request').checked;
                }
            }
            
            submitRequest(payload);
            requestModal.classList.remove('is-open');
        };
    };
    
    const openNotificationsModal = () => {
         const requestsHtml = pendingRequests.map(req => {
            const roomName = sectors.flatMap(s => s.rooms).find(r => r.id === req.roomId)?.name || 'Desconhecido';
            
            let dateInfo;
            let recurringIcon = '';

            if (req.isRecurring) {
                const startDateDisplay = new Date(req.startDate).toLocaleDateString('pt-BR');
                const endDateDisplay = new Date(req.endDate).toLocaleDateString('pt-BR');
                dateInfo = `de ${startDateDisplay} até ${endDateDisplay}`;
                recurringIcon = `<span class="text-cyan-400" title="Solicitação Recorrente">🔄</span> `;
            } else {
                dateInfo = `para ${new Date(req.date).toLocaleDateString('pt-BR')}`;
            }

            const periodName = periods.find(p => p.id === req.period)?.name || req.period;
            const groupName = periods.find(p => p.id === req.period)?.group.split(' ')[0] || '';


            return `<div class="flex justify-between items-center p-3 bg-gray-700 rounded-md text-sm">
                        <div>
                            <p>${recurringIcon}<b>${req.prof} (${req.turma})</b> pediu <b>${roomName}</b> ${dateInfo} (${groupName} - ${periodName})</p>
                        </div>
                        <div class="flex gap-2">
                            <button data-request-id="${req.id}" class="approve-btn bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-2 rounded-md">Aprovar</button>
                            <button data-request-id="${req.id}" class="deny-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md">Negar</button>
                        </div>
                    </div>`;
         }).join('');

        notificationsModal.innerHTML = `<div class="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-auto animate-fade-in p-6"><div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold text-cyan-400">Solicitações Pendentes</h3><button id="close-notifications-btn" class="text-gray-400 hover:text-white text-2xl">&times;</button></div><div class="space-y-2">${pendingRequests.length > 0 ? requestsHtml : '<p class="text-gray-400">Nenhuma solicitação pendente.</p>'}</div></div>`;
        notificationsModal.classList.add('is-open');
        document.getElementById('close-notifications-btn').onclick = () => notificationsModal.classList.remove('is-open');
    };
    
    // NOVA FUNÇÃO PARA ABRIR O MODAL COM TODOS OS AGENDAMENTOS
    const openMyAllSchedulesModal = async () => {
        myAllSchedulesModal.innerHTML = `
            <div class="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl mx-auto animate-fade-in p-6">
                 <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-purple-400">Meus Agendamentos</h3>
                    <button id="close-my-all-schedules-btn" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div class="text-center p-8"><p class="text-gray-400">Carregando...</p></div>
            </div>`;
        myAllSchedulesModal.classList.add('is-open');
        document.getElementById('close-my-all-schedules-btn').onclick = () => myAllSchedulesModal.classList.remove('is-open');

        try {
            const [myPending, mySchedules, myRecurring] = await Promise.all([
                apiFetch('/Data/my-requests'),
                apiFetch('/Data/my-schedules'),
                apiFetch('/Data/my-recurring-schedules')
            ]);

            const requestsHtml = myPending.length > 0 ? myPending.map(req => {
                const roomName = getRoomNameById(req.roomId);
                const dateInfo = req.isRecurring ? `de ${new Date(req.startDate).toLocaleDateString('pt-BR')} a ${new Date(req.endDate).toLocaleDateString('pt-BR')}` : `para ${new Date(req.date).toLocaleDateString('pt-BR')}`;
                const periodName = periods.find(p => p.id === req.period)?.name || req.period;
                return `
                    <div class="flex justify-between items-center p-3 bg-gray-700 rounded-md text-sm">
                        <div><p>${req.isRecurring ? '🔄' : ''} <b>${roomName}</b> ${dateInfo} (${periodName})</p></div>
                        <button data-request-id="${req.id}" class="cancel-request-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md">Cancelar</button>
                    </div>`;
            }).join('') : '<p class="text-gray-400 text-sm">Nenhuma solicitação pendente.</p>';

            const schedulesHtml = mySchedules.length > 0 ? mySchedules.map(sched => {
                const roomName = getRoomNameById(sched.roomId);
                const periodName = periods.find(p => p.id === sched.period)?.name || sched.period;
                return `
                    <div class="flex justify-between items-center p-3 bg-gray-700 rounded-md text-sm">
                        <p><b>${roomName}</b> em <b>${new Date(sched.date.replace(' ', 'T')).toLocaleDateString('pt-BR')}</b> (${periodName}) - Turma: ${sched.turma}</p>
                        <button data-schedule-id="${sched.id}" class="cancel-schedule-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md">Cancelar</button>
                    </div>`;
            }).join('') : '<p class="text-gray-400 text-sm">Nenhum agendamento pontual aprovado.</p>';
            
            const recurringHtml = myRecurring.length > 0 ? myRecurring.map(rec => {
                const roomName = getRoomNameById(rec.roomId);
                const periodName = periods.find(p => p.id === rec.period)?.name || rec.period;
                const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                const days = rec.daysOfWeek.map(d => weekdays[d]).join(', ');
                return `
                    <div class="flex justify-between items-center p-3 bg-gray-700 rounded-md text-sm">
                        <div>
                             <p>🔄 <b>${roomName}</b> (${periodName}) - Turma: ${rec.turma}</p>
                             <p class="text-xs text-gray-400 mt-1">Repete ${rec.type === 'weekly' ? `toda ${days}` : 'diariamente'} de ${new Date(rec.startDate).toLocaleDateString('pt-BR')} até ${new Date(rec.endDate).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <button data-recurring-id="${rec.id}" class="cancel-recurring-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md">Cancelar</button>
                    </div>`;
            }).join('') : '<p class="text-gray-400 text-sm">Nenhum agendamento recorrente ativo.</p>';

            myAllSchedulesModal.innerHTML = `
                <div class="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl mx-auto animate-fade-in p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-purple-400">Meus Agendamentos</h3>
                        <button id="close-my-all-schedules-btn" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                    <div class="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                        <div>
                            <h4 class="text-lg font-semibold text-cyan-400 mb-3 border-b border-gray-700 pb-2">Solicitações Pendentes</h4>
                            <div class="space-y-2">${requestsHtml}</div>
                        </div>
                        <div>
                            <h4 class="text-lg font-semibold text-cyan-400 mb-3 border-b border-gray-700 pb-2">Agendamentos Aprovados</h4>
                            <div class="space-y-2">${schedulesHtml}</div>
                        </div>
                        <div>
                            <h4 class="text-lg font-semibold text-cyan-400 mb-3 border-b border-gray-700 pb-2">Agendamentos Recorrentes</h4>
                            <div class="space-y-2">${recurringHtml}</div>
                        </div>
                    </div>
                </div>`;
            document.getElementById('close-my-all-schedules-btn').onclick = () => myAllSchedulesModal.classList.remove('is-open');

        } catch (error) {
            console.error("Erro ao carregar meus agendamentos:", error);
            myAllSchedulesModal.querySelector('div').innerHTML += '<p class="text-red-500">Falha ao carregar dados.</p>';
        }
    };

    const updateNotificationBadge = () => {
        const pendingForCoordinator = pendingRequests.filter(r => r.status === 'pending');
        let badge = notificationsBell.querySelector('.notification-badge');
        if (pendingForCoordinator.length > 0 && state.currentUserRole === 'coordinator') {
            notificationsBellContainer.classList.remove('hidden');
            if (!badge) { badge = document.createElement('div'); badge.className = 'notification-badge'; notificationsBell.appendChild(badge); }
            badge.textContent = pendingForCoordinator.length;
        } else {
            if (badge) notificationsBell.removeChild(badge);
            notificationsBellContainer.classList.add('hidden');
        }
    };

    // --- LÓGICA DE DADOS (API .NET Core) ---
    async function apiFetch(endpoint, options = {}) {
        const token = getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

        if (response.status === 401) { // Unauthorized
            logout();
            throw new Error('Não autorizado');
        }
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Falha na requisição para a API.');
        }
        
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    }

    async function fetchData() {
        try {
            await Promise.all([
                loadSchedules(),
                loadRequests(),
                loadRecurringSchedules()
            ]);
        } catch (error) {
            console.error("Erro ao carregar dados iniciais:", error);
        }
    }

    async function loadSchedules() {
        try {
            schedules = await apiFetch('/Data/schedules');
            if (scheduleModal.classList.contains('is-open')) renderCalendarContent();
        } catch (error) {
            console.error('Erro ao carregar agendamentos:', error);
        }
    }
    
    async function loadRequests() {
        try {
            pendingRequests = await apiFetch('/Data/requests');
            updateNotificationBadge();
            if (notificationsModal.classList.contains('is-open')) openNotificationsModal();
        } catch (error) { console.error('Erro ao carregar solicitações:', error); }
    }

    async function loadRecurringSchedules() {
         try {
            recurringSchedules = await apiFetch('/Data/recurring-schedules');
            if (scheduleModal.classList.contains('is-open')) renderCalendarContent();
        } catch (error) { console.error('Erro ao carregar agendamentos recorrentes:', error); }
    }
    
    async function loadAllUsers() {
        try {
            if (state.currentUserRole === 'coordinator') {
                allUsers = await apiFetch('/Data/users');
            }
        } catch (error) {
            console.error('Erro ao carregar lista de usuários:', error);
        }
    }

    const saveBooking = async (periodId, date) => {
        const isCoordinator = state.currentUserRole === 'coordinator';
        let profName, userId, turma;

        if (isCoordinator) {
            const selectedProfElement = document.getElementById(`prof-${periodId}`);
            userId = selectedProfElement.value;
            profName = selectedProfElement.options[selectedProfElement.selectedIndex].text;
            turma = document.getElementById(`turma-${periodId}`).value.trim();
        } else {
            turma = document.getElementById(`turma-${periodId}`).value.trim();
        }
        
        const recurringCheckbox = document.getElementById(`recurring-${periodId}`);
        const isRecurring = recurringCheckbox && recurringCheckbox.checked;
        const recurringId = recurringCheckbox ? recurringCheckbox.dataset.recurringId : null;

        try {
            if (isRecurring) {
                const type = document.querySelector(`input[name="recurring-type-${periodId}"]:checked`).value;
                const endDate = document.getElementById(`recurring-end-date-${periodId}`).value;
                if (!endDate) { alert("Por favor, selecione a data final da recorrência."); return; }
                
                let payload = {
                    id: recurringId ? parseInt(recurringId) : 0,
                    roomId: state.selectedRoomId, period: periodId, prof: profName, applicationUserId: userId, turma, startDate: date, endDate, type,
                    daysOfWeek: [], weekdaysOnly: false
                };

                if (type === 'weekly') {
                    payload.daysOfWeek = Array.from(document.querySelectorAll(`#weekly-options-${periodId} .weekday-checkbox:checked`)).map(cb => parseInt(cb.value));
                    if (payload.daysOfWeek.length === 0) { alert("Selecione pelo menos um dia da semana."); return; }
                } else {
                    payload.weekdaysOnly = document.getElementById(`weekdays-only-${periodId}`).checked;
                }
                
                const method = recurringId && recurringId !== 'undefined' && recurringId !== '' ? 'PUT' : 'POST';
                const endpoint = recurringId && recurringId !== 'undefined' && recurringId !== '' ? `/Data/recurring-schedules/${recurringId}` : `/Data/recurring-schedules`;
                
                await apiFetch(endpoint, { method, body: JSON.stringify(payload) });

            } else {
                const payload = {
                    roomId: state.selectedRoomId, date, period: periodId, prof: profName, applicationUserId: userId, turma, isBlocked: false, blockReason: null
                };
                await apiFetch('/Data/schedules', { method: 'POST', body: JSON.stringify(payload) });

                if (recurringId && recurringId !== 'undefined' && recurringId !== '') {
                    await apiFetch(`/Data/recurring-schedules/${recurringId}`, { method: 'DELETE' });
                }
            }
            await fetchData();
        } catch (error) {
            console.error('Erro ao salvar agendamento:', error);
            alert('Ocorreu um erro ao salvar. Tente novamente.');
        }
    };

    const blockPeriod = async (periodId, date) => {
         const reason = prompt("Motivo do bloqueio (ex: Manutenção):");
        if (reason) {
            const payload = {
                roomId: state.selectedRoomId, date, period: periodId,
                isBlocked: true, blockReason: reason,
                prof: null, turma: null,
                applicationUserId: 'SYSTEM'
            };
            try {
                await apiFetch('/Data/schedules', { method: 'POST', body: JSON.stringify(payload) });
                await fetchData();
            } catch (error) {
                console.error('Erro ao bloquear período:', error);
                alert('Ocorreu um erro ao bloquear o período.');
            }
        }
    };

    const submitRequest = async (payload) => {
        try {
            await apiFetch('/Data/requests', { method: 'POST', body: JSON.stringify(payload) });
            await fetchData();
        } catch (error) {
            console.error('Erro ao enviar solicitação:', error);
            alert('Ocorreu um erro ao enviar a solicitação.');
        }
    };

    const approveRequest = async (requestId) => {
        try {
            await apiFetch(`/Data/requests/${requestId}/approve`, { method: 'PUT' });
            await fetchData();
        } catch (error) {
            console.error('Erro ao aprovar solicitação:', error);
            alert('Ocorreu um erro ao aprovar a solicitação.');
        }
    };

    const denyRequest = async (requestId) => {
        try {
            await apiFetch(`/Data/requests/${requestId}`, { method: 'DELETE' });
            await fetchData();
        } catch (error) {
            console.error('Erro ao negar solicitação:', error);
            alert('Ocorreu um erro ao negar a solicitação.');
        }
    };
    
    const openScheduleModal = (roomId) => {
        state.selectedRoomId = roomId;
        state.currentDate = new Date();
        state.viewMode = 'daily';
        renderModal();
        scheduleModal.classList.add('is-open');
    };

    const closeScheduleModal = () => {
        scheduleModal.classList.remove('is-open');
        modalContent.innerHTML = '';
    };

    const changeDate = (amount) => {
        if (state.viewMode === 'daily') {
            state.currentDate.setDate(state.currentDate.getDate() + amount);
        } else if (state.viewMode === 'weekly') {
            state.currentDate.setDate(state.currentDate.getDate() + (amount * 7));
        } else if (state.viewMode === 'monthly') {
            state.currentDate.setMonth(state.currentDate.getMonth() + amount);
        }
        renderCalendarContent();
    };

    // --- INICIALIZAÇÃO E AUTENTICAÇÃO ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.classList.add('hidden');
        const nif = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nif, password })
            });

            if (!response.ok) {
                throw new Error('NIF ou senha inválidos.');
            }

            const data = await response.json();
            localStorage.setItem('jwt_token', data.token);
            state.currentUserName = data.fullName;

            const tokenPayload = parseJwt(data.token);
            if(tokenPayload) {
                state.currentUserId = tokenPayload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
            }

            state.currentUserRole = (data.roles && data.roles.includes('Coordenador')) ? 'coordinator' : 'viewer';

            if (data.mustChangePassword) {
                changePasswordModal.classList.add('is-open');
            } else {
                await initializeApp();
            }

        } catch (error) {
            loginError.textContent = error.message;
            loginError.classList.remove('hidden');
        }
    });

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        changePasswordError.classList.add('hidden');
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        
        try {
            await apiFetch('/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({ currentPassword, newPassword })
            });
            changePasswordModal.classList.remove('is-open');
            await initializeApp();
        } catch (error) {
            changePasswordError.textContent = 'Falha ao alterar a senha. Verifique a senha atual.';
            changePasswordError.classList.remove('hidden');
        }
    });

    async function initializeApp() {
        if (state.currentUserRole === 'coordinator') {
            roleFlag.textContent = 'Coordenador';
            roleFlag.classList.remove('hidden');
            myAllSchedulesBtn.classList.add('hidden');
        } else {
            roleFlag.textContent = 'Professor';
            roleFlag.classList.remove('hidden');
            myAllSchedulesBtn.classList.remove('hidden');
        }
        
        loginScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');
        await loadAllUsers();
        await fetchData();
        renderDashboard();
        updateNotificationBadge();
    }

    function logout() {
        localStorage.removeItem('jwt_token');
        state.currentUserRole = null;
        mainContent.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        loginForm.reset();
        loginError.classList.add('hidden');
        notificationsBellContainer.classList.add('hidden');
        myAllSchedulesBtn.classList.add('hidden');
        roleFlag.classList.add('hidden');
    }

    // --- EVENT LISTENERS ---
    logoutBtn.addEventListener('click', logout);
    
    myAllSchedulesBtn.addEventListener('click', openMyAllSchedulesModal);
    
    dashboard.addEventListener('click', (e) => {
        const roomCard = e.target.closest('[data-room-id]');
        if (roomCard) {
            openScheduleModal(roomCard.dataset.roomId);
        }
    });

    modalContent.addEventListener('change', e => {
        const periodId = e.target.id.split('-').slice(1).join('-') || e.target.name.split('-').slice(2).join('-');
        if (e.target.classList.contains('recurring-checkbox')) {
            document.getElementById(`recurring-options-${periodId}`).classList.toggle('hidden', !e.target.checked);
        }
        if (e.target.classList.contains('recurring-type-radio')) {
            const isWeekly = e.target.value === 'weekly';
            document.getElementById(`weekly-options-${periodId}`).classList.toggle('hidden', !isWeekly);
            document.getElementById(`daily-options-${periodId}`).classList.toggle('hidden', isWeekly);
        }
    });
    
    modalContent.addEventListener('click', async (e) => {
        if (e.target.id === 'close-modal-btn') closeScheduleModal();
        if (e.target.id === 'prev-btn') changeDate(-1);
        if (e.target.id === 'next-btn') changeDate(1);
        if (e.target.id === 'daily-view-btn') { state.viewMode = 'daily'; renderModal(); }
        if (e.target.id === 'weekly-view-btn') { state.viewMode = 'weekly'; renderModal(); }
        if (e.target.id === 'monthly-view-btn') { state.viewMode = 'monthly'; renderModal(); }

        const saveBtn = e.target.closest('.save-btn');
        if(saveBtn) await saveBooking(saveBtn.dataset.periodId, saveBtn.dataset.date);

        const blockBtn = e.target.closest('.block-btn');
        if(blockBtn) await blockPeriod(blockBtn.dataset.periodId, blockBtn.dataset.date);

        const removeRecurringBtn = e.target.closest('.remove-recurring-btn');
        if (removeRecurringBtn) {
             const recurringId = removeRecurringBtn.dataset.recurringId;
             if (confirm('Tem certeza que deseja remover esta recorrência?')) {
                try {
                    await apiFetch(`/Data/recurring-schedules/${recurringId}`, { method: 'DELETE' });
                    await fetchData();
                } catch (error) {
                    console.error(error);
                    alert('Não foi possível remover a recorrência.');
                }
            }
        }

        const requestBtn = e.target.closest('.request-btn');
        if(requestBtn) openRequestModal(requestBtn.dataset.periodId, requestBtn.dataset.periodName, requestBtn.dataset.date);

        const dayCell = e.target.closest('.month-day-cell[data-date]');
        if (dayCell) {
            state.currentDate = new Date(dayCell.dataset.date + 'T12:00:00');
            state.viewMode = 'daily';
            renderModal();
        }
    });
    notificationsModal.addEventListener('click', async (e) => {
        const approveBtn = e.target.closest('.approve-btn');
        if(approveBtn) {
            const itemDiv = approveBtn.closest('.flex.justify-between');
            itemDiv.querySelectorAll('button').forEach(btn => btn.disabled = true);
            approveBtn.textContent = 'Processando...';
            await approveRequest(approveBtn.dataset.requestId);
        }
        
        const denyBtn = e.target.closest('.deny-btn');
        if(denyBtn) {
            const itemDiv = denyBtn.closest('.flex.justify-between');
            itemDiv.querySelectorAll('button').forEach(btn => btn.disabled = true);
            denyBtn.textContent = 'Processando...';
            await denyRequest(denyBtn.dataset.requestId);
        }
    });
    notificationsBell.onclick = openNotificationsModal;

    myAllSchedulesModal.addEventListener('click', async (e) => {
        const cancelRequestBtn = e.target.closest('.cancel-request-btn');
        if (cancelRequestBtn) {
            if (confirm('Tem certeza que deseja cancelar esta solicitação?')) {
                cancelRequestBtn.disabled = true;
                cancelRequestBtn.textContent = 'Cancelando...';
                await denyRequest(cancelRequestBtn.dataset.requestId);
                openMyAllSchedulesModal(); // Refresh modal content
            }
        }

        const cancelRecurringBtn = e.target.closest('.cancel-recurring-btn');
        if (cancelRecurringBtn) {
            if (confirm('Tem certeza que deseja remover esta recorrência?')) {
                 try {
                    cancelRecurringBtn.disabled = true;
                    cancelRecurringBtn.textContent = 'Cancelando...';
                    await apiFetch(`/Data/recurring-schedules/${cancelRecurringBtn.dataset.recurringId}`, { method: 'DELETE' });
                    await fetchData();
                    openMyAllSchedulesModal();
                } catch (error) {
                    console.error(error);
                    alert('Não foi possível remover a recorrência.');
                }
            }
        }

        const cancelScheduleBtn = e.target.closest('.cancel-schedule-btn');
        if (cancelScheduleBtn) {
            if (confirm('Tem certeza que deseja cancelar este agendamento aprovado?')) {
                try {
                    cancelScheduleBtn.disabled = true;
                    cancelScheduleBtn.textContent = 'Cancelando...';
                    await apiFetch(`/Data/schedules/${cancelScheduleBtn.dataset.scheduleId}`, { method: 'DELETE' });
                    await fetchData();
                    openMyAllSchedulesModal();
                } catch (error) {
                    console.error('Erro ao cancelar agendamento:', error);
                    alert('Não foi possível remover o agendamento.');
                }
            }
        }
    });
});