        document.addEventListener('DOMContentLoaded', () => {

            // ===================================
            // CONFIGURAÇÃO E DADOS GLOBAIS
            // ===================================
            const API_BASE_URL = 'https://gerenciadorambientes.azurewebsites.net/api'; //'https://localhost:7001/api';  // 

            // Dados estáticos (idealmente viriam da API)
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
            const allDayPeriods = ['manha_antes', 'manha_apos', 'manha_todo', 'tarde_antes', 'tarde_apos', 'tarde_todo', 'noite_antes', 'noite_apos', 'noite_todo'];

            // Estado da aplicação (dados carregados da API e seleção atual)
            let allSchedules = {};
            let allRecurring = [];
            const now = new Date();
            const currentMonthISO = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2);
            let currentPeriodValue = currentMonthISO; // Mês atual como padrão "YYYY-MM"

            // ===================================
            // REFERÊNCIAS DO DOM
            // ===================================
            const monthSelect = document.getElementById('month-select');
            const btnSpecificMonth = document.getElementById('btn-specific-month');
            const dashboardContent = document.getElementById('dashboard-content');
            const loadingState = document.getElementById('loading-state');
            const errorState = document.getElementById('error-state');
            const heatmapTableContainer = document.getElementById('heatmap-table-container');
            const heatmapTbody = document.getElementById('heatmap-tbody');
            const detailModal = document.getElementById('detail-modal');
            const detailRoomName = document.getElementById('detail-room-name');
            const detailContent = document.getElementById('detail-content');
            const closeDetailModalBtn = document.getElementById('close-detail-modal-btn');

            // ===================================
            // FUNÇÕES DE UTILIDADE
            // ===================================
            const formatDate = (date) => date.toISOString().split('T')[0];
            const getToken = () => localStorage.getItem('jwt_token');

            /** Faz chamada fetch à API com autenticação e tratamento de erro básico */
            async function apiFetch(endpoint, options = {}) {
                const token = getToken();
                if (!token) {
                    errorState.innerHTML = `<p class="text-red-400 font-bold text-lg">Não autenticado.</p><p class="text-gray-400 mt-2">Faça login no sistema principal primeiro.</p><a href="index.html" class="mt-4 inline-block bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded text-sm">Ir para Login</a>`;
                    errorState.style.display = 'block'; loadingState.style.display = 'none'; heatmapTableContainer.style.display = 'none';
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

            /** Busca agendamento confirmado (único ou recorrente) para uma sala/data/período */
            function getBookingForDate(roomId, date, periodId) {
                const dateKey = formatDate(date);
                const currentDateOnly = new Date(dateKey + 'T12:00:00Z');
                const daySchedule = allSchedules[dateKey]?.[roomId]?.[periodId];
                if (daySchedule && !daySchedule.isBlocked) return { ...daySchedule, isRecurring: false };
                if (daySchedule?.isBlocked) return { isBlocked: true };
                const dayOfWeek = currentDateOnly.getUTCDay();
                const recurring = allRecurring.find(r => {
                    if (r.roomId !== roomId || r.period !== periodId) return false;
                    if (!r.startDate || !r.endDate) return false;
                    const startDate = new Date(r.startDate.split('T')[0] + 'T12:00:00Z');
                    const endDate = new Date(r.endDate.split('T')[0] + 'T12:00:00Z');
                    if (currentDateOnly < startDate || currentDateOnly > endDate) return false;
                    if (r.type === 'weekly') return Array.isArray(r.daysOfWeek) && r.daysOfWeek.includes(dayOfWeek);
                    if (r.type === 'daily') return !r.weekdaysOnly || (dayOfWeek >= 1 && dayOfWeek <= 5);
                    return false;
                });
                if (recurring) return { ...recurring, isRecurring: true };
                return null;
             }

             /** Verifica se um turno ('manha', 'tarde', 'noite') tem alguma ocupação confirmada */
             function isTurnOccupied(roomId, date, turn) {
                const p1 = getBookingForDate(roomId, date, `${turn}_antes`);
                const p2 = getBookingForDate(roomId, date, `${turn}_apos`);
                const p3 = getBookingForDate(roomId, date, `${turn}_todo`);
                return (p1 && !p1.isBlocked) || (p2 && !p2.isBlocked) || (p3 && !p3.isBlocked);
             }

             /** Retorna as classes CSS para a célula do heatmap baseada na porcentagem */
             function getHeatmapClass(percentage) {
                 const highThreshold = 66; const mediumThreshold = 33;
                 if (percentage >= highThreshold) return { bg: 'heatmap-high', text: 'text-gray-900' };
                 else if (percentage >= mediumThreshold) return { bg: 'heatmap-medium', text: 'text-gray-900' };
                 else if (percentage > 0) return { bg: 'heatmap-low', text: 'text-gray-900' };
                 else return { bg: 'heatmap-nodata', text: 'text-gray-300' };
             }

            // ===================================
            // LÓGICA DO DASHBOARD E RENDERIZAÇÃO
            // ===================================

            /** Carrega os dados da API (se necessário) e renderiza o heatmap para o mês selecionado */
            async function loadDataAndRender() {
                loadingState.style.display = 'block';
                errorState.style.display = 'none';
                heatmapTableContainer.style.display = 'none';

                try {
                    // Carrega dados se o cache estiver vazio
                    if (Object.keys(allSchedules).length === 0 || allRecurring.length === 0) {
                        console.log("Fetching data from API...");
                        const [schedules, recurring] = await Promise.all([
                            apiFetch('/Data/schedules'),
                            apiFetch('/Data/recurring-schedules')
                        ]);
                        allSchedules = schedules || {};
                        allRecurring = recurring || [];
                        console.log("Data fetched:", { schedulesCount: Object.keys(allSchedules).length, recurringCount: allRecurring.length });
                    } else {
                        console.log("Using cached data.");
                    }

                    // Determina o período (mês selecionado)
                    if (!currentPeriodValue || !/^\d{4}-\d{2}$/.test(currentPeriodValue)) throw new Error("Mês selecionado inválido.");
                    const [year, month] = currentPeriodValue.split('-').map(Number);
                    const startDate = new Date(Date.UTC(year, month - 1, 1));
                    const endDate = new Date(Date.UTC(year, month, 0));
                    const totalDaysInPeriod = endDate.getUTCDate();
                    console.log(`Rendering period: ${formatDate(startDate)} to ${formatDate(endDate)}`);

                    // Renderiza a tabela
                    renderHeatmap(startDate, endDate, totalDaysInPeriod);
                    loadingState.style.display = 'none';
                    heatmapTableContainer.style.display = 'block';

                } catch (error) {
                    console.error("Erro ao carregar/renderizar dashboard:", error);
                    loadingState.style.display = 'none';
                    errorState.style.display = 'block';
                    const errorMsgElement = errorState.querySelector('p:last-child');
                    if (errorMsgElement) errorMsgElement.textContent = `Detalhes: ${error.message}`;
                }
            }

            /** Preenche o corpo da tabela heatmap com os dados calculados */
            function renderHeatmap(startDate, endDate, totalDaysInPeriod) {
                 if (!heatmapTbody) return;
                 console.log("Rendering heatmap...");
                 let tbodyHtml = '';
                 for (const sector of sectors) {
                    tbodyHtml += `<tr><th colspan="4" class="py-2 px-4 text-left text-cyan-400 font-bold bg-gray-700">${sector.icon} ${sector.name}</th></tr>`;
                    for (const room of sector.rooms) {
                        const stats = calculateRoomStats(room.id, startDate, endDate, totalDaysInPeriod);
                        const manhaClass = getHeatmapClass(stats.manha);
                        const tardeClass = getHeatmapClass(stats.tarde);
                        const noiteClass = getHeatmapClass(stats.noite);
                        tbodyHtml += `
                            <tr>
                                <th class="py-2 px-4 room-name-header" data-room-id="${room.id}" data-room-name="${room.name}">${room.name}</th>
                                <td class="${manhaClass.bg} ${manhaClass.text} heatmap-cell" title="Manhã: ${stats.manha.toFixed(1)}%">${stats.manha.toFixed(0)}%</td>
                                <td class="${tardeClass.bg} ${tardeClass.text} heatmap-cell" title="Tarde: ${stats.tarde.toFixed(1)}%">${stats.tarde.toFixed(0)}%</td>
                                <td class="${noiteClass.bg} ${noiteClass.text} heatmap-cell" title="Noite: ${stats.noite.toFixed(1)}%">${stats.noite.toFixed(0)}%</td>
                            </tr>`;
                    }
                 }
                 heatmapTbody.innerHTML = tbodyHtml;
                 console.log("Heatmap rendered.");
            }

             /** Calcula a % de ocupação para cada turno de uma sala em um período */
            function calculateRoomStats(roomId, startDate, endDate, totalDaysInPeriod) {
                let occupiedManha = 0, occupiedTarde = 0, occupiedNoite = 0;
                if (totalDaysInPeriod <= 0) return { manha: 0, tarde: 0, noite: 0 };
                let currentDate = new Date(startDate);
                 while (currentDate <= endDate) {
                    let checkDate = new Date(currentDate); checkDate.setUTCHours(12, 0, 0, 0); // Use UTC
                    if (isTurnOccupied(roomId, checkDate, 'manha')) occupiedManha++;
                    if (isTurnOccupied(roomId, checkDate, 'tarde')) occupiedTarde++;
                    if (isTurnOccupied(roomId, checkDate, 'noite')) occupiedNoite++;
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                return {
                    manha: totalDaysInPeriod > 0 ? (occupiedManha / totalDaysInPeriod) * 100 : 0,
                    tarde: totalDaysInPeriod > 0 ? (occupiedTarde / totalDaysInPeriod) * 100 : 0,
                    noite: totalDaysInPeriod > 0 ? (occupiedNoite / totalDaysInPeriod) * 100 : 0
                };
             }

            // ===================================
            // FUNÇÕES DO MODAL DE DETALHES
            // ===================================
            /** Abre e preenche o modal com detalhes de ocupação por professor e turma */
            function openDetailModal(roomId, roomName) {
                console.log(`Opening detail modal for room: ${roomId} (${roomName})`);
                if (!detailModal || !detailRoomName || !detailContent) return;
                detailRoomName.textContent = roomName;
                detailContent.innerHTML = '<p class="text-gray-400 italic">Calculando detalhes...</p>';
                detailModal.classList.add('is-open');

                try {
                    // Determina período selecionado
                    const [year, month] = currentPeriodValue.split('-').map(Number);
                    const startDate = new Date(Date.UTC(year, month - 1, 1));
                    const endDate = new Date(Date.UTC(year, month, 0));
                    console.log(`Detail modal period: ${formatDate(startDate)} to ${formatDate(endDate)}`);

                    // --- ATUALIZADO: Agrega dados por professor E turma ---
                    // Estrutura: { profName: { total: count, turmas: { turmaName: count } } }
                    const bookingsByProfTurma = {};
                    let totalOccupiedPeriods = 0;
                    let currentDate = new Date(startDate);

                    while(currentDate <= endDate) {
                         let checkDate = new Date(currentDate); checkDate.setUTCHours(12, 0, 0, 0);
                         for(const periodId of allDayPeriods) {
                             const booking = getBookingForDate(roomId, checkDate, periodId);
                             // Conta apenas agendamentos válidos com professor definido
                             if (booking && !booking.isBlocked && booking.prof) {
                                 totalOccupiedPeriods++;
                                 const profName = booking.prof || "Desconhecido";
                                 const turmaName = booking.turma || "N/A"; // Considera turma não informada

                                 // Inicializa se for o primeiro agendamento do professor
                                 if (!bookingsByProfTurma[profName]) {
                                     bookingsByProfTurma[profName] = { total: 0, turmas: {} };
                                 }
                                 // Incrementa contagem total do professor
                                 bookingsByProfTurma[profName].total++;
                                 // Incrementa contagem da turma específica para aquele professor
                                 bookingsByProfTurma[profName].turmas[turmaName] = (bookingsByProfTurma[profName].turmas[turmaName] || 0) + 1;
                             }
                         }
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                    console.log(`Detail modal found ${totalOccupiedPeriods} occupied periods.`);
                    console.log("Bookings by prof/turma:", bookingsByProfTurma);
                    // --- FIM DA AGREGAÇÃO ---

                    // Renderiza resultados
                    if (totalOccupiedPeriods === 0) {
                        detailContent.innerHTML = '<p class="text-gray-400">Nenhum agendamento neste mês.</p>'; return;
                    }

                    // Ordena professores pela contagem total
                    const sortedProfs = Object.entries(bookingsByProfTurma)
                                        .sort(([, dataA], [, dataB]) => dataB.total - dataA.total);

                    let detailHtml = `<p class="text-sm text-gray-400 mb-4">Total de períodos ocupados: ${totalOccupiedPeriods}</p>`;
                    detailHtml += '<ul class="space-y-4">'; // Aumenta espaço entre professores

                    sortedProfs.forEach(([profName, data]) => {
                        const overallPercentage = ((data.total / totalOccupiedPeriods) * 100).toFixed(1);
                        // Cabeçalho do Professor
                        detailHtml += `
                            <li class="bg-gray-700 p-3 rounded">
                                <div class="flex justify-between items-center text-sm mb-1">
                                    <span class="font-semibold text-white">${profName}</span>
                                    <span class="font-bold text-cyan-400">${overallPercentage}%</span>
                                </div>`;

                        // Ordena turmas do professor por contagem
                        const sortedTurmas = Object.entries(data.turmas)
                                                .sort(([, countA], [, countB]) => countB - countA);

                        // Lista de Turmas (se houver mais de uma ou se a única turma não for "N/A")
                        if (sortedTurmas.length > 1 || (sortedTurmas.length === 1 && sortedTurmas[0][0] !== "N/A")) {
                             detailHtml += '<ul class="turma-list space-y-1">';
                             sortedTurmas.forEach(([turmaName, count]) => {
                                 // Calcula % da turma em relação ao TOTAL do professor
                                 const turmaPercentage = ((count / data.total) * 100).toFixed(1);
                                 detailHtml += `
                                     <li class="flex justify-between items-center">
                                         <span>- ${turmaName}</span>
                                         <span class="text-xs">${turmaPercentage}%</span>
                                     </li>
                                 `;
                             });
                             detailHtml += '</ul>';
                        } else if (sortedTurmas.length === 1) {
                             // Se só uma turma (e pode ser "N/A"), mostra direto
                             detailHtml += `<p class="text-xs text-gray-400 ml-4">Turma: ${sortedTurmas[0][0]}</p>`;
                        }

                        detailHtml += `</li>`; // Fecha <li> do professor
                    });

                    detailHtml += '</ul>'; // Fecha <ul> principal
                    detailContent.innerHTML = detailHtml;
                    console.log("Detail modal content updated.");
                } catch (error) {
                     console.error("Error calculating details for modal:", error);
                     detailContent.innerHTML = '<p class="text-red-400">Erro ao calcular detalhes.</p>';
                }
            }

            function closeDetailModal() { if(detailModal) detailModal.classList.remove('is-open'); }

            // ===================================
            // EVENT LISTENERS
            // ===================================
            if (btnSpecificMonth) {
                btnSpecificMonth.addEventListener('click', () => {
                     const selectedMonth = monthSelect.value;
                     if (!selectedMonth) { alert("Selecione um mês."); return; }
                     if (currentPeriodValue === selectedMonth) return;
                     currentPeriodValue = selectedMonth;
                     loadDataAndRender();
                });
            }

            if (monthSelect) {
                // Opcional: listener para atualizar ao mudar o mês (se desejado)
                // monthSelect.addEventListener('change', () => { /* ... */ });
            }

            // Listener para cliques na tabela (abrir modal de detalhes)
            if (heatmapTbody) {
                heatmapTbody.addEventListener('click', (e) => {
                     const headerCell = e.target.closest('th.room-name-header');
                     if (headerCell?.dataset.roomId && headerCell?.dataset.roomName) {
                         openDetailModal(headerCell.dataset.roomId, headerCell.dataset.roomName);
                     }
                });
            }

             // Listener para fechar o modal de detalhes
            if(closeDetailModalBtn) closeDetailModalBtn.onclick = closeDetailModal;


            // ===================================
            // INICIALIZAÇÃO
            // ===================================
            if(monthSelect) monthSelect.value = currentMonthISO; // Define valor inicial do input
            loadDataAndRender(); // Carrega dados iniciais

        }); // Fim DOMContentLoaded
    