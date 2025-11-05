document.addEventListener("DOMContentLoaded", () => {
    // --- CONFIGURAÇÃO DA API ---
    const API_BASE_URL = "https://gerenciadorambientes.azurewebsites.net/api";

    // --- DADOS ESTÁTICOS (Necessários para nomes) ---
    const sectors = [
        { id: "salas", name: "Salas", icon: "📚", rooms: [
            { id: "sala_01", name: "Sala 01", posts: 32 }, { id: "sala_02", name: "Sala 02", posts: 32 },
            { id: "sala_03", name: "Sala 03", posts: 32 }, { id: "sala_04", name: "Sala 04", posts: 32 },
            { id: "sala_05", name: "Sala 05", posts: 32 }, { id: "sala_06", name: "Sala 06 - Unid 2", posts: 32 },
            { id: "sala_07", name: "Sala 07 - Unid 2", posts: 16 }, { id: "sala_08", name: "Sala 08 - Unid 2", posts: 16 },
        ]},
        { id: "laboratorios", name: "Laboratórios", icon: "🖥️", rooms: [
            { id: "lab_info_01", name: "Informática 01", posts: 20 }, { id: "lab_info_02", name: "Informática 02", posts: 20 },
            { id: "lab_hidraulica", name: "Hidráulica", posts: 16 }, { id: "lab_pneumatica", name: "Pneumática", posts: 16 },
            { id: "carrinho_notebook_01", name: "Notebooks 01 💻", posts: 20 }, { id: "carrinho_notebook_02", name: "Notebooks 02 💻", posts: 20 },
        ]},
        { id: "usinagem", name: "Usinagem", icon: "⚙️", rooms: [
            { id: "ajustagem", name: "Ajustagem", posts: 12 }, { id: "fresagem", name: "Fresagem", posts: 16 },
            { id: "metrologia", name: "Metrologia", posts: 15 }, { id: "tornearia", name: "Tornearia", posts: 12 },
            { id: "soldagem", name: "Soldagem", posts: 10 }, { id: "serralheria", name: "Serralheria", posts: 12 },
            { id: "centro_cnc", name: "Centro CNC 🖥️", posts: 16 }, { id: "torno_cnc", name: "Torno CNC 🖥️", posts: 16 },
        ]},
        { id: "eletroeletronica", name: "Eletroeletrônica", icon: "⚡️", rooms: [
            { id: "eletronica_01", name: "Eletrônica 01 🖥️", posts: 16 }, { id: "eletronica_02", name: "Eletrônica 02 🖥️", posts: 16 },
            { id: "automacao", name: "Automação", posts: 16 }, { id: "clp", name: "CLP 🖥️", posts: 16 },
            { id: "predial_01", name: "Instalações Predial 01", posts: 16 }, { id: "predial_02", name: "Instalações Predial 02", posts: 16 },
        ]},
        { id: "alimentos", name: "Plantas Alimentos", icon: "🥣", rooms: [
            { id: "panificacao", name: "Panificação", posts: 16 }, { id: "biscoitos", name: "Biscoitos", posts: 16 },
            { id: "leites", name: "Leites", posts: 16 }, { id: "carnes", name: "Carnes", posts: 16 },
            { id: "chocolates", name: "Chocolates", posts: 16 }, { id: "lab_didatico", name: "Lab. Didático", posts: 16 },
        ]},
        { id: "mecanica", name: "Mecânica", icon: "🔧", rooms: [
            { id: "mec_suspensao", name: "Mecânica de Suspensão", posts: 16 }, { id: "mec_transmissao", name: "Mecânica de Transmissão", posts: 16 },
            { id: "mec_motor", name: "Mecanica de Motor", posts: 16 }, { id: "injecao", name: "Eletronica Injeção", posts: 16 },
        ]}
    ];
    const periods = [
        { id: "manha_antes", name: "Antes do Intervalo", group: "Manhã ☀️" }, { id: "manha_apos", name: "Após o Intervalo", group: "Manhã ☀️" }, { id: "manha_todo", name: "Período Todo", group: "Manhã ☀️" },
        { id: "tarde_antes", name: "Antes do Intervalo", group: "Tarde 🌇" }, { id: "tarde_apos", name: "Após o Intervalo", group: "Tarde 🌇" }, { id: "tarde_todo", name: "Período Todo", group: "Tarde 🌇" },
        { id: "noite_antes", name: "Antes do Intervalo", group: "Noite 🌙" }, { id: "noite_apos", name: "Após o Intervalo", group: "Noite 🌙" }, { id: "noite_todo", name: "Período Todo", group: "Noite 🌙" },
    ];
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    // --- REFERÊNCIAS DO DOM ---
    const loadingState = document.getElementById("loading-state");
    const errorState = document.getElementById("error-state");
    const errorMessageDetail = document.getElementById("error-message-detail");
    const contentDiv = document.getElementById("my-schedules-content");

    // --- FUNÇÕES DE UTILIDADE ---
    const getToken = () => localStorage.getItem("jwt_token");
    console.log("Token de autenticação carregado.", getToken() ? "Usuário autenticado." : "Nenhum token encontrado.");
    const getRoomNameById = (roomId) => sectors.flatMap(s => s.rooms).find(r => r.id === roomId)?.name || roomId;

    /**
     * Função de fetch da API (copiada de script.js)
     */
    async function apiFetch(endpoint, options = {}) {
        const token = getToken();
        if (!token) {
            if (errorState && loadingState) {
                errorState.innerHTML = `<p class="text-red-400 font-bold text-lg">Não autenticado.</p><p class="text-gray-400 mt-2">Faça login.</p><a href="/GerenciamentoSalas/index.html" class="mt-4 inline-block bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded text-sm">Login</a>`;
                errorState.style.display = "block";
                if (loadingState) loadingState.style.display = "none";
                if (contentDiv) contentDiv.innerHTML = "";
            }
            throw new Error("Usuário não autenticado.");
        }
        const headers = { "Content-Type": "application/json", ...options.headers, Authorization: `Bearer ${token}` };

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

            if (response.status === 401) {
                localStorage.removeItem("jwt_token"); // Logout
                window.location.href = "index.html"; // Redireciona para login
                throw new Error("Sessão expirada. Faça login novamente.");
            }
            if (response.status === 403) throw new Error("Permissão negada.");
            if (response.status === 204) return null;

            const responseText = await response.text();

            if (!response.ok) {
                throw new Error(responseText || `Erro ${response.status}`);
            }
            return responseText ? JSON.parse(responseText) : null;
        } catch (error) {
            console.error(`API call error for ${endpoint}:`, error);
            throw error;
        }
    }

    // --- FUNÇÕES DE CANCELAMENTO ---

    /**
     * Cancela uma solicitação pendente (Professor)
     */
    async function cancelRequest(requestId) {
        if (confirm("Cancelar esta solicitação?")) {
            try {
                await apiFetch(`/Data/requests/${requestId}`, { method: "DELETE" });
                loadAndRenderSchedules(); // Recarrega a lista
            } catch (error) {
                alert(`Erro: ${error.message}`);
            }
        }
    }

    /**
     * Cancela um agendamento (único ou recorrente)
     */
    async function cancelBooking(type, id) {
        const endpoint = type === "recurring" ? `/Data/recurring-schedules/${id}` : `/Data/schedules/${id}`;
        const msg = `Cancelar este agendamento ${type === "recurring" ? "recorrente" : ""}?`;
        if (confirm(msg)) {
            try {
                await apiFetch(endpoint, { method: "DELETE" });
                loadAndRenderSchedules(); // Recarrega a lista
            } catch (error) {
                alert(`Erro: ${error.message}`);
            }
        }
    }

    // --- LÓGICA PRINCIPAL DA PÁGINA ---

    /**
     * Carrega e renderiza os agendamentos do usuário
     */
    async function loadAndRenderSchedules() {
        try {
            loadingState.style.display = "block";
            errorState.style.display = "none";
            contentDiv.classList.add("hidden");

            // Busca todos os dados do usuário em paralelo
            const [myPending, mySchedules, myRecurring] = await Promise.all([
                apiFetch("/Data/my-requests"),
                apiFetch("/Data/my-schedules"),
                apiFetch("/Data/my-recurring-schedules"),
            ]);

            // --- Renderiza Solicitações Pendentes ---
            const requestsHtml = myPending.length > 0 ? myPending.map(req => {
                const roomName = getRoomNameById(req.roomId);
                const periodName = periods.find(p => p.id === req.period)?.name || req.period;
                let dateInfoHtml;

                if (req.isRecurring) {
                    let dayArray = [];
                    if (req.type === "weekly" && typeof req.daysOfWeek === "string" && req.daysOfWeek.length > 0) {
                        dayArray = req.daysOfWeek.split(",").map(Number);
                    }
                    const days = dayArray.length > 0 ? dayArray.map(d => weekdays[d]).join(", ") : "";
                    const recurrenceDesc = req.type === "weekly" ? `toda ${days}` : (req.weekdaysOnly ? "diariamente (dias úteis)" : "diariamente (todos os dias)");
                    const startDateDisplay = new Date(req.startDate).toLocaleDateString("pt-BR", { timeZone: "UTC" });
                    const endDateDisplay = new Date(req.endDate).toLocaleDateString("pt-BR", { timeZone: "UTC" });
                    dateInfoHtml = `<p class="text-xs text-gray-400 mt-1">Repete ${recurrenceDesc} de ${startDateDisplay} até ${endDateDisplay}</p>`;
                } else {
                    dateInfoHtml = `<p class="text-xs text-gray-400 mt-1">Para ${new Date(req.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p>`;
                }

                return `
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-700 rounded-md text-sm gap-2">
                    <div>
                        <p>${req.isRecurring ? "🔄" : ""} <b>${roomName}</b> (${periodName}) - Turma: ${req.turma || "N/A"}</p>
                        ${dateInfoHtml}
                    </div>
                    <button data-request-id="${req.id}" class="cancel-request-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md text-xs whitespace-nowrap self-end sm:self-center">Cancelar Solicitação</button>
                </div>`;
            }).join("") : '<p class="text-gray-400 text-sm italic">Nenhuma solicitação pendente.</p>';

            // --- Renderiza Agendamentos Aprovados (Únicos) ---
            const schedulesHtml = mySchedules.length > 0 ? mySchedules.map(sched => {
                const roomName = getRoomNameById(sched.roomId);
                const periodName = periods.find(p => p.id === sched.period)?.name || sched.period;
                return `
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-700 rounded-md text-sm gap-2">
                    <p><b>${roomName}</b> em <b>${new Date(sched.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</b> (${periodName}) - Turma: ${sched.turma || "N/A"}</p>
                    <button data-schedule-id="${sched.id}" class="cancel-schedule-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md text-xs whitespace-nowrap self-end sm:self-center">Cancelar Agendamento</button>
                </div>`;
            }).join("") : '<p class="text-gray-400 text-sm italic">Nenhum agendamento futuro aprovado.</p>';

            // --- Renderiza Agendamentos Recorrentes (Aprovados) ---
            const recurringHtml = myRecurring.length > 0 ? myRecurring.map(rec => {
                const roomName = getRoomNameById(rec.roomId);
                const periodName = periods.find(p => p.id === rec.period)?.name || rec.period;
                const days = (rec.daysOfWeek && rec.daysOfWeek.length > 0) ? rec.daysOfWeek.map(d => weekdays[d]).join(", ") : "";
                const recurrenceDesc = rec.type === "weekly" ? `toda ${days}` : (rec.weekdaysOnly ? "diariamente (dias úteis)" : "diariamente (todos os dias)");
                
                return `
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-700 rounded-md text-sm gap-2">
                    <div>
                         <p>🔄 <b>${roomName}</b> (${periodName}) - Turma: ${rec.turma || "N/A"}</p>
                         <p class="text-xs text-gray-400 mt-1">Repete ${recurrenceDesc} de ${new Date(rec.startDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })} até ${new Date(rec.endDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p>
                    </div>
                    <button data-recurring-id="${rec.id}" class="cancel-recurring-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md text-xs whitespace-nowrap self-end sm:self-center">Cancelar Recorrência</button>
                </div>`;
            }).join("") : '<p class="text-gray-400 text-sm italic">Nenhum agendamento recorrente ativo.</p>';

            // --- Insere o HTML no container ---
            contentDiv.innerHTML = `
                <div class="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    <div>
                        <h4 class="text-lg font-semibold text-cyan-400 mb-3 border-b border-gray-700 pb-2">Solicitações Pendentes</h4>
                        <div class="space-y-2">${requestsHtml}</div>
                    </div>
                    <div>
                        <h4 class="text-lg font-semibold text-cyan-400 mb-3 border-b border-gray-700 pb-2">Agendamentos Aprovados (Futuros)</h4>
                        <div class="space-y-2">${schedulesHtml}</div>
                    </div>
                    <div>
                        <h4 class="text-lg font-semibold text-cyan-400 mb-3 border-b border-gray-700 pb-2">Agendamentos Recorrentes (Ativos)</h4>
                        <div class="space-y-2">${recurringHtml}</div>
                    </div>
                </div>`;
            
            loadingState.style.display = "none";
            contentDiv.classList.remove("hidden");

        } catch (error) {
            console.error("Erro ao carregar 'Meus Agendamentos':", error);
            loadingState.style.display = "none";
            errorState.style.display = "block";
            if(errorMessageDetail) errorMessageDetail.textContent = error.message;
        }
    }

    // --- EVENT LISTENER (para botões de cancelar) ---
    contentDiv.addEventListener("click", async (e) => {
        const target = e.target;
        target.disabled = true; // Desabilita botão para evitar clique duplo
        target.textContent = "...";

        if (target.classList.contains("cancel-request-btn")) {
            await cancelRequest(target.dataset.requestId);
        } else if (target.classList.contains("cancel-schedule-btn")) {
            await cancelBooking("schedule", target.dataset.scheduleId);
        } else if (target.classList.contains("cancel-recurring-btn")) {
            await cancelBooking("recurring", target.dataset.recurringId);
        } else {
            target.disabled = false; // Não era um botão de cancelar
        }
    });

    // --- INICIALIZAÇÃO ---
    loadAndRenderSchedules();
});