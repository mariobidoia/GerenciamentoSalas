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
    
    // --- ESTADO ---
    let state = { conflictingRequestId: null };

    // --- REFERÊNCIAS DO DOM ---
    const loadingState = document.getElementById("loading-state");
    const errorState = document.getElementById("error-state");
    const errorMessageDetail = document.getElementById("error-message-detail");
    const listContainer = document.getElementById("notifications-list");

    const conflictErrorModal = document.getElementById("conflict-error-modal");
    const conflictErrorMessage = document.getElementById("conflict-error-message");
    const closeConflictModalBtn = document.getElementById("close-conflict-modal-btn");
    const conflictDenyBtn = document.getElementById("conflict-deny-btn");
    const conflictApproveSkipBtn = document.getElementById("conflict-approve-skip-btn");
    const conflictApproveForceBtn = document.getElementById("conflict-approve-force-btn");

    // --- FUNÇÕES DE UTILIDADE ---
    const getToken = () => localStorage.getItem("jwt_token");
    const getRoomNameById = (roomId) => sectors.flatMap(s => s.rooms).find(r => r.id === roomId)?.name || roomId;

    /**
     * Função de fetch da API (copiada de script.js)
     */
    async function apiFetch(endpoint, options = {}) {
        const token = getToken();
        if (!token) {
            if (errorState && loadingState) {
                errorState.innerHTML = `<p class="text-red-400 font-bold text-lg">Não autenticado.</p><p class="text-gray-400 mt-2">Faça login.</p><a href="index.html" class="mt-4 inline-block bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded text-sm">Login</a>`;
                errorState.style.display = "block";
                if (loadingState) loadingState.style.display = "none";
                if (listContainer) listContainer.innerHTML = "";
            }
            throw new Error("Usuário não autenticado.");
        }
        const headers = { "Content-Type": "application/json", ...options.headers, Authorization: `Bearer ${token}` };

        let response;
        try {
            response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

            if (response.status === 401) {
                localStorage.removeItem("jwt_token"); // Logout
                window.location.href = "index.html"; // Redireciona para login
                throw new Error("Sessão expirada. Faça login novamente.");
            }
            if (response.status === 403) throw new Error("Permissão negada.");
            if (response.status === 204) return null;

            const responseText = await response.text();

            if (!response.ok) {
                let errorData = null;
                let parsedJsonSuccess = false;
                try {
                    errorData = JSON.parse(responseText);
                    parsedJsonSuccess = true;
                } catch { /* falha silenciosa */ }
                
                const message = parsedJsonSuccess && errorData?.message ? errorData.message : responseText || `Erro ${response.status}`;
                const error = new Error(message);
                error.status = response.status;
                error.data = parsedJsonSuccess ? errorData : null;
                throw error;
            }
            return responseText ? JSON.parse(responseText) : null;
        } catch (error) {
            console.error(`API call error for ${endpoint}:`, error);
            if (error.status === 403) alert("Você não tem permissão para executar esta ação.");
            throw error;
        }
    }

    // --- LÓGICA DO MODAL DE CONFLITO (Copiado de script.js) ---
    function openConflictModal(message, requestId) {
        state.conflictingRequestId = requestId;
        if (conflictErrorMessage && conflictErrorModal) {
            conflictErrorMessage.textContent = message || "Conflito detectado. Escolha uma ação.";
            conflictErrorModal.classList.add("is-open");
        } else {
            console.error("Elementos do modal de conflito não encontrados!");
            alert(message || "Conflito detectado.");
        }
    }
    function closeConflictModal() {
        if (conflictErrorModal) conflictErrorModal.classList.remove("is-open");
        state.conflictingRequestId = null;
    }
    if (closeConflictModalBtn) closeConflictModalBtn.onclick = closeConflictModal;
    
    // Listener NEGAR (No modal de conflito)
    if (conflictDenyBtn) {
        conflictDenyBtn.onclick = async () => {
            if (state.conflictingRequestId) {
                conflictDenyBtn.disabled = true; conflictDenyBtn.textContent = 'Negando...';
                await denyRequest(state.conflictingRequestId); // Reusa a função deny
                closeConflictModal();
                conflictDenyBtn.disabled = false; conflictDenyBtn.textContent = 'Negar Solicitação';
            }
        };
    }
    // Listener APROVAR SKIP
    if (conflictApproveSkipBtn) {
        conflictApproveSkipBtn.onclick = async () => {
            if (state.conflictingRequestId) {
                [conflictDenyBtn, conflictApproveSkipBtn, conflictApproveForceBtn].forEach(btn => btn.disabled = true);
                conflictApproveSkipBtn.textContent = "Processando...";
                try {
                    await apiFetch(`/Data/requests/${state.conflictingRequestId}/approve?skipConflicts=true`, { method: "PUT" });
                    removeRequestFromUI(state.conflictingRequestId); // Remove item da lista
                    closeConflictModal();
                } catch (error) {
                    alert(`Erro: ${error.message}`);
                } finally {
                    [conflictDenyBtn, conflictApproveSkipBtn, conflictApproveForceBtn].forEach(btn => btn.disabled = false);
                    conflictApproveSkipBtn.textContent = "Aprovar Somente Vagos";
                }
            }
        };
    }
    // Listener APROVAR FORCE
    if (conflictApproveForceBtn) {
        conflictApproveForceBtn.onclick = async () => {
            if (state.conflictingRequestId) {
                [conflictDenyBtn, conflictApproveSkipBtn, conflictApproveForceBtn].forEach(btn => btn.disabled = true);
                conflictApproveForceBtn.textContent = "Processando...";
                try {
                    await apiFetch(`/Data/requests/${state.conflictingRequestId}/approve?force=true`, { method: "PUT" });
                    removeRequestFromUI(state.conflictingRequestId); // Remove item da lista
                    closeConflictModal();
                } catch (error) {
                    alert(`Erro: ${error.message}`);
                } finally {
                    [conflictDenyBtn, conflictApproveSkipBtn, conflictApproveForceBtn].forEach(btn => btn.disabled = false);
                    conflictApproveForceBtn.textContent = "Substituir Conflitos";
                }
            }
        };
    }
    
    // --- LÓGICA PRINCIPAL DA PÁGINA ---
    /**
     * Renderiza a lista de solicitações pendentes
     */
    function renderNotifications(pendingRequests) {
        if (!listContainer) return;

        if (pendingRequests.length === 0) {
            listContainer.innerHTML = '<p class="text-gray-400 text-center py-4">Nenhuma solicitação pendente.</p>';
            return;
        }

        const requestsHtml = pendingRequests.map(req => {
            const roomName = getRoomNameById(req.roomId);
            let dateInfo, recurringIcon = "";

            if (req.isRecurring && req.startDate && req.endDate) {
                const startDateDisplay = new Date(req.startDate).toLocaleDateString("pt-BR", { timeZone: "UTC" });
                const endDateDisplay = new Date(req.endDate).toLocaleDateString("pt-BR", { timeZone: "UTC" });
                dateInfo = `de ${startDateDisplay} até ${endDateDisplay}`;
                recurringIcon = `<span class="text-cyan-400" title="Solicitação Recorrente">🔄</span> `;
            } else if (req.date) {
                dateInfo = `para ${new Date(req.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}`;
            } else {
                dateInfo = "(Data inválida)";
            }

            const periodName = periods.find(p => p.id === req.period)?.name || req.period;
            const groupName = periods.find(p => p.id === req.period)?.group.split(" ")[0] || "";
            const requesterName = req.userFullName || req.prof;
            let justificationHtml = req.justification ? `<p class="text-sm text-gray-400 mt-1 italic break-words">Justificativa: ${req.justification}</p>` : "";

            return `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-700 rounded-md text-base gap-2" data-request-item-id="${req.id}">
                <div class="flex-grow">
                    <p>${recurringIcon}<b>${requesterName}</b> solicitou a reserva para a Turma <b>${req.turma}</b>:</p>
                    <p><b>${roomName}</b> ${dateInfo} (${groupName}${periodName != "Período Todo" ? " - "+periodName : ""}) </p>
                    ${justificationHtml}
                </div>
                <div class="flex flex-col gap-2 flex-shrink-0 self-end sm:self-center" data-request-controls-id="${req.id}"> 
                    <button data-request-id="${req.id}" class="approve-btn bg-green-800 hover:bg-green-700 text-white font-bold py-1 px-2 rounded-md text-xs whitespace-nowrap">Aprovar</button>
                    <button data-request-id="${req.id}" class="deny-btn bg-red-800 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md text-xs whitespace-nowrap">Negar</button>
                </div>
            </div>`;
        }).join("");

        listContainer.innerHTML = requestsHtml;
    }

    /**
     * Ação de Aprovar (lógica de script.js, adaptada para esta página)
     */
    async function approveRequest(requestId) {
        const controlsDiv = listContainer.querySelector(`[data-request-controls-id="${requestId}"]`);
        if(controlsDiv) controlsDiv.querySelectorAll("button").forEach(b => b.disabled = true);

        try {
            await apiFetch(`/Data/requests/${requestId}/approve`, { method: "PUT" });
            removeRequestFromUI(requestId); // Sucesso, remove da UI
        } catch (error) {
            if (error.status === 409) {
                let conflictMsg = error.message || "Conflito detectado.";
                const dateRegex = /(\d{4})-(\d{2})-(\d{2})/;
                const match = conflictMsg.match(dateRegex);
                if (match) conflictMsg = conflictMsg.replace(dateRegex, `${match[3]}/${match[2]}/${match[1]}`);
                
                openConflictModal(conflictMsg, requestId); // Abre modal de conflito
                // Não reativa os botões aqui, o modal de conflito assume
            } else {
                alert(`Erro ao aprovar: ${error.message}`);
                if(controlsDiv) controlsDiv.querySelectorAll("button").forEach(b => b.disabled = false); // Reativa botões se for outro erro
            }
        }
    }

    /**
     * Ação de Negar (lógica de script.js, adaptada para esta página)
     */
    async function denyRequest(requestId) {
        if (confirm("Negar esta solicitação?")) {
            const controlsDiv = listContainer.querySelector(`[data-request-controls-id="${requestId}"]`);
            if(controlsDiv) controlsDiv.querySelectorAll("button").forEach(b => b.disabled = true);
            try {
                await apiFetch(`/Data/requests/${requestId}`, { method: "DELETE" });
                removeRequestFromUI(requestId); // Sucesso, remove da UI
            } catch (error) {
                alert(`Erro: ${error.message}`);
                if(controlsDiv) controlsDiv.querySelectorAll("button").forEach(b => b.disabled = false);
            }
        }
    }

    /**
     * Remove o item da lista da UI após ação
     */
    function removeRequestFromUI(requestId) {
        const itemElement = listContainer.querySelector(`[data-request-item-id="${requestId}"]`);
        if (itemElement) {
            itemElement.style.opacity = '0.5';
            itemElement.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                itemElement.remove();
                if (listContainer.children.length === 0) {
                    listContainer.innerHTML = '<p class="text-gray-400 text-center py-4">Nenhuma solicitação pendente.</p>';
                }
            }, 500);
        }
    }

    /**
     * Carrega e renderiza todas as notificações
     */
    async function loadAndRenderNotifications() {
        try {
            loadingState.style.display = "block";
            errorState.style.display = "none";
            listContainer.innerHTML = "";

            const pendingRequests = (await apiFetch("/Data/requests")) || [];
            renderNotifications(pendingRequests.filter(r => r.status === 'pending')); // Filtra por via das dúvidas

            loadingState.style.display = "none";

        } catch (error) {
            console.error("Erro ao carregar notificações:", error);
            loadingState.style.display = "none";
            errorState.style.display = "block";
            if(errorMessageDetail) errorMessageDetail.textContent = error.message;
        }
    }

    // --- EVENT LISTENER PRINCIPAL (para botões na lista) ---
    listContainer.addEventListener("click", async (e) => {
        const target = e.target;
        if (target.classList.contains("approve-btn")) {
            target.textContent = "...";
            await approveRequest(target.dataset.requestId);
        }
        if (target.classList.contains("deny-btn")) {
            target.textContent = "...";
            await denyRequest(target.dataset.requestId);
        }
    });

    // --- INICIALIZAÇÃO ---
    loadAndRenderNotifications();
});