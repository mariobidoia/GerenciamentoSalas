document.addEventListener("DOMContentLoaded", () => {
  // --- CONFIGURAÇÃO DA API ---
  const API_BASE_URL = "https://gerenciadorambientes.azurewebsites.net/api"; // 'https://localhost:7001/api'; //

  let nomeUsuarioLogado = "";

  // --- DADOS E ESTADO DA APLICAÇÃO ---
  const sectors = [
    {
      id: "salas",
      name: "Salas",
      icon: "📚",
      rooms: [
        { id: "sala_01", name: "Sala 01", posts: 32 },
        { id: "sala_02", name: "Sala 02", posts: 32 },
        { id: "sala_03", name: "Sala 03", posts: 32 },
        { id: "sala_04", name: "Sala 04", posts: 32 },
        { id: "sala_05", name: "Sala 05", posts: 32 },
        { id: "sala_06", name: "Sala 06 - Unid 2", posts: 32 },
        { id: "sala_07", name: "Sala 07 - Unid 2", posts: 16 },
        { id: "sala_08", name: "Sala 08 - Unid 2", posts: 16 },
      ],
    },
    {
      id: "laboratorios",
      name: "Laboratórios",
      icon: "🖥️",
      rooms: [
        { id: "lab_info_01", name: "Informática 01", posts: 20 },
        { id: "lab_info_02", name: "Informática 02", posts: 20 },
        { id: "lab_hidraulica", name: "Hidráulica", posts: 16 },
        { id: "lab_pneumatica", name: "Pneumática", posts: 16 },
        { id: "carrinho_notebook_01", name: "Notebooks 01 💻", posts: 20 },
        { id: "carrinho_notebook_02", name: "Notebooks 02 💻", posts: 20 },
      ],
    },
    {
      id: "usinagem",
      name: "Usinagem",
      icon: "⚙️",
      rooms: [
        { id: "ajustagem", name: "Ajustagem", posts: 12 },
        { id: "fresagem", name: "Fresagem", posts: 16 },
        { id: "metrologia", name: "Metrologia", posts: 15 },
        { id: "tornearia", name: "Tornearia", posts: 12 },
        { id: "soldagem", name: "Soldagem", posts: 10 },
        { id: "serralheria", name: "Serralheria", posts: 12 },
        { id: "centro_cnc", name: "Centro CNC 🖥️", posts: 16 },
        { id: "torno_cnc", name: "Torno CNC 🖥️", posts: 16 },
      ],
    },
    {
      id: "eletroeletronica",
      name: "Eletroeletrônica",
      icon: "⚡️",
      rooms: [
        { id: "eletronica_01", name: "Eletrônica 01 🖥️", posts: 16 },
        { id: "eletronica_02", name: "Eletrônica 02 🖥️", posts: 16 },
        { id: "automacao", name: "Automação", posts: 16 },
        { id: "clp", name: "CLP 🖥️", posts: 16 },
        { id: "predial_01", name: "Instalações Predial 01", posts: 16 },
        { id: "predial_02", name: "Instalações Predial 02", posts: 16 },
      ],
    },
    {
      id: "alimentos",
      name: "Plantas Alimentos",
      icon: "🥣",
      rooms: [
        { id: "panificacao", name: "Panificação", posts: 16 },
        { id: "biscoitos", name: "Biscoitos", posts: 16 },
        { id: "leites", name: "Leites", posts: 16 },
        { id: "carnes", name: "Carnes", posts: 16 },
        { id: "chocolates", name: "Chocolates", posts: 16 },
        { id: "lab_didatico", name: "Lab. Didático", posts: 16 },
      ],
    },
    {
      id: "mecanica",
      name: "Mecânica",
      icon: "🔧",
      rooms: [
        { id: "mec_suspensao", name: "Mecânica de Suspensão", posts: 16 },
        { id: "mec_transmissao", name: "Mecânica de Transmissão", posts: 16 },
        { id: "mec_motor", name: "Mecanica de Motor", posts: 16 },
        { id: "injecao", name: "Eletronica Injeção", posts: 16 },
      ],
    },
  ];

  const periods = [
    { id: "manha_antes", name: "Antes do Intervalo", group: "Manhã ☀️" },
    { id: "manha_apos", name: "Após o Intervalo", group: "Manhã ☀️" },
    { id: "manha_todo", name: "Período Todo", group: "Manhã ☀️" },
    { id: "tarde_antes", name: "Antes do Intervalo", group: "Tarde 🌇" },
    { id: "tarde_apos", name: "Após o Intervalo", group: "Tarde 🌇" },
    { id: "tarde_todo", name: "Período Todo", group: "Tarde 🌇" },
    { id: "noite_antes", name: "Antes do Intervalo", group: "Noite 🌙" },
    { id: "noite_apos", name: "Após o Intervalo", group: "Noite 🌙" },
    { id: "noite_todo", name: "Período Todo", group: "Noite 🌙" },
  ];
  let schedules = {};
  let pendingRequests = [];
  let recurringSchedules = [];
  let allUsers = [];
  let state = {
    currentUserRole: null,
    currentUserName: "",
    currentUserId: null,
    selectedRoomId: null,
    currentDate: new Date(),
    viewMode: "daily",
    conflictingRequestId: null, // Armazena ID da request em conflito
  };

  // --- REFERÊNCIAS DO DOM ---
  const loginScreen = document.getElementById("login-screen");
  const mainContent = document.getElementById("main-content");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const logoutBtn = document.getElementById("logout-btn");
  const roleFlag = document.getElementById("role-flag");
  const dashboardContainer = document.getElementById("dashboard");
  const dashboardLoading = document.getElementById("dashboard-loading");
  const scheduleModal = document.getElementById("schedule-modal");
  const modalContent = document.getElementById("modal-content");
  const requestModal = document.getElementById("request-modal");
  const notificationsModal = document.getElementById("notifications-modal");
  const notificationsBellContainer = document.getElementById(
    "notifications-bell-container"
  );
  const notificationsBell = document.getElementById("notifications-bell");
  const changePasswordModal = document.getElementById("change-password-modal");
  const changePasswordForm = document.getElementById("change-password-form");
  const changePasswordError = document.getElementById("change-password-error");
  const myAllSchedulesBtn = document.getElementById("my-all-schedules-btn");
  const myAllSchedulesModal = document.getElementById("my-all-schedules-modal");
  const dashboardBtn = document.getElementById("dashboard-btn");

  // Referências do Modal de Conflito
  const conflictErrorModal = document.getElementById("conflict-error-modal");
  const conflictErrorMessage = document.getElementById(
    "conflict-error-message"
  );
  const closeConflictModalBtn = document.getElementById(
    "close-conflict-modal-btn"
  );
  const conflictDenyBtn = document.getElementById("conflict-deny-btn");
  const conflictApproveSkipBtn = document.getElementById(
    "conflict-approve-skip-btn"
  );
  const conflictApproveForceBtn = document.getElementById(
    "conflict-approve-force-btn"
  );

  // --- FUNÇÕES DE UTILIDADE ---
  const formatDate = (date) => date.toISOString().split("T")[0];
  const getCurrentTurn = () => {
    const currentHour = new Date().getHours(); // Pega a hora atual (0-23)

    if (currentHour >= 6 && currentHour < 12) {
        return 'manha'; // 6:00 - 11:59
    } else if (currentHour >= 12 && currentHour < 18) {
        return 'tarde'; // 12:00 - 17:59
    } else {
        return 'noite'; // 18:00 - 5:59
    }
};
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -7 : 0);
    return new Date(d.setDate(diff));
  };
  const getToken = () => localStorage.getItem("jwt_token");

  // --- NOVO: Definição de "Hoje" ---
  const todayDateKey = formatDate(new Date()); // "YYYY-MM-DD" de hoje
  const todayTimestamp = new Date(todayDateKey + "T12:00:00Z").getTime(); // Timestamp normalizado de hoje
  // --- FIM NOVO ---

  /** Decodifica JWT */
  function parseJwt(token) {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("Erro ao decodificar token:", e);
      return null;
    }
  }

  const getRoomNameById = (roomId) =>
    sectors.flatMap((s) => s.rooms).find((r) => r.id === roomId)?.name ||
    roomId;

  // --- LÓGICA DE OBTENÇÃO DE DADOS ---
  const getBookingForDate = (roomId, date, periodId) => {
    const dateKey = formatDate(date);
    const dayScheduleData = schedules[dateKey]?.[roomId]?.[periodId];
    if (dayScheduleData) {
      return {
        id: dayScheduleData.id,
        prof: dayScheduleData.prof,
        turma: dayScheduleData.turma,
        isBlocked: dayScheduleData.isBlocked,
        blockReason: dayScheduleData.blockReason,
        applicationUserId: dayScheduleData.applicationUserId,
        isRecurring: false,
      };
    }
    const recurring = recurringSchedules.find((r) => {
      if (r.roomId !== roomId || r.period !== periodId) return false;
      const currentDate = new Date(dateKey + "T12:00:00Z");
      const startDate = new Date(r.startDate.split("T")[0] + "T12:00:00Z");
      const endDate = new Date(r.endDate.split("T")[0] + "T12:00:00Z");
      if (currentDate < startDate || currentDate > endDate) return false;
      if (r.type === "weekly") return r.daysOfWeek.includes(date.getUTCDay());
      if (r.type === "daily")
        return (
          !r.weekdaysOnly || (date.getUTCDay() >= 1 && date.getUTCDay() <= 5)
        );
      return false;
    });
    if (recurring) return { ...recurring, isRecurring: true };
    return null;
  };
  /**
 * MODIFICADO: Verifica se há atividade para um *período de turno específico* (manha, tarde, noite)
 * Esta função substitui a antiga 'hasAnyActivityForDay'
 */
const hasActivityForCurrentPeriod = (roomId, date, currentTurn) => {
    // Pega os IDs de período detalhados (ex: 'manha_antes', 'manha_apos', 'manha_todo')
    const turnPeriodIds = periods.filter(p => p.id.startsWith(currentTurn)).map(p => p.id);
    
    // Se não houver períodos para esse turno (segurança), retorna falso
    if (turnPeriodIds.length === 0) return false; 

    const dateKey = formatDate(date);
    const currentDate = new Date(dateKey + 'T12:00:00Z'); // Data de hoje em UTC
    const dayOfWeek = currentDate.getUTCDay(); // Dia da semana (0=Dom, 1=Seg...)

    // 1. Verifica agendamentos únicos (schedules)
    if (schedules[dateKey] && schedules[dateKey][roomId]) {
        // Itera *apenas* nos períodos do turno atual (ex: 'manha_antes', 'manha_apos', etc.)
        for (const periodId of turnPeriodIds) { 
            const booking = schedules[dateKey][roomId][periodId];
            
            // Se existe um agendamento e NÃO é um bloqueio
            if (booking && !booking.isBlocked) { 
                return true; // Encontrou! Está ocupado neste turno.
            }
        }
    }

    // 2. Verifica agendamentos recorrentes
    const isRecurringBooked = recurringSchedules.some(r => {
        // A recorrência é para esta sala?
        if (r.roomId !== roomId) return false;
        
        // A recorrência é para um período *dentro* do turno atual?
        // (ex: a recorrência é 'manha_antes' e o turno atual é 'manha')
        if (!turnPeriodIds.includes(r.period)) return false; 

        // A data atual está dentro do intervalo da recorrência?
        const startDate = new Date(r.startDate.split('T')[0] + 'T12:00:00Z');
        const endDate = new Date(r.endDate.split('T')[0] + 'T12:00:00Z');
        if (currentDate < startDate || currentDate > endDate) return false;
        
        // A regra de repetição (semanal/diária) bate com o dia de hoje?
        if (r.type === 'weekly') return r.daysOfWeek.includes(dayOfWeek);
        if (r.type === 'daily') return !r.weekdaysOnly || (dayOfWeek >= 1 && dayOfWeek <= 5);
        
        return false;
    });

    if (isRecurringBooked) return true;

    // Se não achou nada em agendamentos únicos ou recorrentes
    return false;
 };

  // --- FUNÇÕES DE RENDERIZAÇÃO (VIEWS) ---
  const renderDashboard = () => {
    const currentDate = new Date();
    if(!dashboardContainer || !dashboardLoading) return; // Verifica se elementos existem

    // NOVO: Pega o turno atual (ex: 'manha', 'tarde' ou 'noite')
    const currentTurn = getCurrentTurn();
    
    // NOVO: Cria um nome amigável (ex: 'Manhã') buscando no array 'periods'
    const currentTurnName = periods.find(p => p.id.startsWith(currentTurn))?.group.split(' ')[0] || currentTurn;


    dashboardLoading.classList.add('hidden'); // Esconde o loading
    dashboardContainer.innerHTML = sectors.map(sector => { // Usa map direto no container
        const roomsHtml = sector.rooms.map(room => {
            
            // MODIFICADO: Chama a nova função 'hasActivityForCurrentPeriod'
            // Em vez de: hasAnyActivityForDay(room.id, currentDate)
            const isOccupiedNow = hasActivityForCurrentPeriod(room.id, currentDate, currentTurn);
            
            // MODIFICADO: Atualiza o HTML para refletir o período atual
            const statusHtml = isOccupiedNow
                ? `<span class="text-xs text-red-400 flex items-center justify-end"><span class="w-2 h-2 rounded-full bg-red-400 mr-2"></span>Ocupado Agora</span>`
                : `<span class="text-xs text-green-400 flex items-center justify-end"><span class="w-2 h-2 rounded-full bg-green-400 mr-2"></span>Disponível Agora</span>`;
            
            return `
                <li class="bg-gray-800 rounded-lg p-3 cursor-pointer hover:bg-cyan-700 transition-colors" data-room-id="${room.id}">
                    <div class="flex justify-between items-center">
                        <div>
                            <div class="font-medium text-sm truncate" title="${room.name}">${room.name}</div>
                            <div class="text-xs text-gray-400">${room.posts} 👤</div>
                        </div>
                        <div class="flex-shrink-0 ml-2"> ${statusHtml} </div>
                    </div>
                </li>`;
        }).join('');
        return `
            <div class="bg-gray-800 rounded-lg p-4 flex flex-col">
                <h2 class="text-xl font-bold text-cyan-400 border-b-2 border-gray-700 pb-2 mb-4 flex items-center gap-3">
                    <span class="text-2xl">${sector.icon}</span> ${sector.name}
                </h2>
                <ul class="space-y-2"> ${roomsHtml} </ul>
            </div>`;
    }).join('');
 };

  // Funções do Modal de Conflito
  function openConflictModal(message, requestId) {
    state.conflictingRequestId = requestId;
    if (conflictErrorMessage && conflictErrorModal) {
      conflictErrorMessage.textContent =
        message || "Conflito detectado. Escolha uma ação.";
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
  // Listener NEGAR
  if (conflictDenyBtn) {
    conflictDenyBtn.onclick = async () => {
      // if (state.conflictingRequestId) {
      //     conflictDenyBtn.disabled = true; conflictDenyBtn.textContent = 'Negando...';
      //     await denyRequest(state.conflictingRequestId);
      //     closeConflictModal();
      //     conflictDenyBtn.disabled = false; conflictDenyBtn.textContent = 'Negar Solicitação';
      // }
    };
  }
  // Listener APROVAR SKIP
  if (conflictApproveSkipBtn) {
    conflictApproveSkipBtn.onclick = async () => {
      if (state.conflictingRequestId) {
        //[conflictDenyBtn, conflictApproveSkipBtn, conflictApproveForceBtn].forEach(btn => btn.disabled = true);
        conflictApproveSkipBtn.textContent = "Processando...";
        try {
          await apiFetch(
            `/Data/requests/${state.conflictingRequestId}/approve?skipConflicts=true`,
            { method: "PUT" }
          );
          await fetchData();
          closeConflictModal();
        } catch (error) {
          console.error("Erro ao aprovar com skip:", error);
          alert(`Erro: ${error.message}`);
          // [conflictDenyBtn, conflictApproveSkipBtn, conflictApproveForceBtn].forEach(btn => btn.disabled = false);
        } finally {
          conflictApproveSkipBtn.textContent = "Aprovar Somente Vagos";
        }
      }
    };
  }
  // Listener APROVAR FORCE
  if (conflictApproveForceBtn) {
    conflictApproveForceBtn.onclick = async () => {
      if (state.conflictingRequestId) {
        //    [conflictDenyBtn, conflictApproveSkipBtn, conflictApproveForceBtn].forEach(btn => btn.disabled = true);
        conflictApproveForceBtn.textContent = "Processando...";
        try {
          await apiFetch(
            `/Data/requests/${state.conflictingRequestId}/approve?force=true`,
            { method: "PUT" }
          );
          await fetchData();
          closeConflictModal();
        } catch (error) {
          console.error("Erro ao aprovar com force:", error);
          alert(`Erro: ${error.message}`);
          //         [conflictDenyBtn, conflictApproveSkipBtn, conflictApproveForceBtn].forEach(btn => btn.disabled = false);
        } finally {
          conflictApproveForceBtn.textContent = "Substituir Conflitos";
        }
      }
    };
  }

  const renderModal = () => {
    const room = sectors
      .flatMap((s) => s.rooms)
      .find((r) => r.id === state.selectedRoomId);

    modalContent.innerHTML = `
            <div class="p-6">
                <div class="flex justify-between items-start mb-4">
                    <div><h2 class="text-2xl font-bold text-cyan-400">${
                      room.name
                    }</h2><p class="text-gray-400">Calendário de Ocupação</p></div>
                    <button id="close-modal-btn" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div class="flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-900 p-2 rounded-md mb-6">
                    <div class="flex items-center gap-2"><button id="prev-btn" class="px-3 py-1 bg-gray-700 rounded hover:bg-cyan-600 transition-colors">Anterior</button><button id="next-btn" class="px-3 py-1 bg-gray-700 rounded hover:bg-cyan-600 transition-colors">Próximo</button></div>
                    <span id="date-display" class="font-semibold text-center order-first sm:order-none"></span>
                    <div class="flex items-center bg-gray-700 rounded-md p-1">
                        <button id="daily-view-btn" class="px-3 py-1 rounded-md text-sm ${
                          state.viewMode === "daily" ? "bg-cyan-600" : ""
                        }">Diária</button>
                        <button id="weekly-view-btn" class="px-3 py-1 rounded-md text-sm ${
                          state.viewMode === "weekly" ? "bg-cyan-600" : ""
                        }">Semanal</button>
                        <button id="monthly-view-btn" class="px-3 py-1 rounded-md text-sm ${
                          state.viewMode === "monthly" ? "bg-cyan-600" : ""
                        }">Mensal</button>
                    </div>
                </div>
                <div id="calendar-content"></div>
            </div>
        `;
    renderCalendarContent();
  };

  const renderCalendarContent = () => {
    const dateDisplay = document.getElementById("date-display");
    if (!dateDisplay) return; // Sai se o modal foi fechado rapidamente

    if (state.viewMode === "daily") {
      dateDisplay.textContent = state.currentDate.toLocaleDateString("pt-BR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }); // Add timeZone
      renderDailyView();
    } else if (state.viewMode === "monthly") {
      dateDisplay.textContent = state.currentDate.toLocaleDateString("pt-BR", {
        year: "numeric",
        month: "long",
        timeZone: "UTC",
      }); // Add timeZone
      renderMonthlyView();
    } else {
      // weekly
      const startOfWeek = getStartOfWeek(state.currentDate);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      dateDisplay.textContent = `${startOfWeek.toLocaleDateString("pt-BR", {
        timeZone: "UTC",
      })} - ${endOfWeek.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`; // Add timeZone
      renderWeeklyView();
    }
  };

  /**
   * NOVO: Verifica se um período específico em um dia específico tem uma solicitação recorrente PENDENTE.
   * Isso é mais detalhado do que a checagem anterior, pois precisa verificar as regras de data.
   */
  function isPeriodPending(roomId, date, periodId) {
    // 'date' é o currentDate do loop (ex: 2025-10-30), já em UTC
    const dateKey = formatDate(date);
    const dayOfWeek = date.getUTCDay(); // 0 = Dom, 1 = Seg, ...


    return pendingRequests.some((r) => {
      // Checagem básica
      if (
        r.roomId !== roomId ||
        r.status !== "pending" ||
        r.period !== periodId
      ) {
        return false;
      }

      // Checagem não-recorrente
      if (!r.isRecurring) {
        return r.date?.startsWith(dateKey);
      }

      // --- Checagem DETALHADA para RECORRENTE PENDENTE ---
      if (r.isRecurring) {
        // Verifica se a data está dentro do intervalo da solicitação
        if (!r.startDate || !r.endDate) return false; // Segurança
        const startDate = new Date(r.startDate.split("T")[0] + "T12:00:00Z");
        const endDate = new Date(r.endDate.split("T")[0] + "T12:00:00Z");

        // Usa 'date' (que é o dia do calendário sendo checado)
        if (date < startDate || date > endDate) {
          return false; // Este dia está fora do intervalo da solicitação pendente
        }

        // Verifica a regra de recorrência (weekly ou daily)
        if (r.type === "weekly") {
          // r.daysOfWeek é uma string "1,3,5"
          const days = r.daysOfWeek ? r.daysOfWeek.split(",").map(Number) : [];
          return days.includes(dayOfWeek);
        }
        if (r.type === "daily") {
          // Checa a flag weekdaysOnly (usa ?? false por segurança)
          return (
            !(r.weekdaysOnly ?? false) || (dayOfWeek >= 1 && dayOfWeek <= 5)
          );
        }
      }

      return false; // Padrão
    });
  }

const renderDailyView = () => {
    const calendarContent = document.getElementById("calendar-content");
    if (!calendarContent) return; // Sai se o modal foi fechado

    const dateKey = formatDate(state.currentDate);
    const currentDate = new Date(dateKey + "T12:00:00Z"); // Usar UTC para consistência
    const isCoordinator = state.currentUserRole === "coordinator";

    // Verificação de data passada
    const isPastDate = currentDate.getTime() < todayTimestamp;

    // --- INÍCIO: NOVAS FUNÇÕES AUXILIARES ---

    /**
     * Helper para verificar se um período específico está PENDENTE.
     * (Lógica copiada do check 'pending' original)
     */
    const isPeriodPending = (periodId) => {
        return pendingRequests.find((r) => {
            if (
                r.roomId !== state.selectedRoomId ||
                r.period !== periodId || // <--- Usa o ID do parâmetro
                r.status !== "pending"
            )
                return false;

            if (r.isRecurring) {
                // Verifica se a data atual cai dentro da recorrência pendente
                const startDate = new Date(
                    r.startDate.split("T")[0] + "T12:00:00Z"
                );
                const endDate = new Date(
                    r.endDate.split("T")[0] + "T12:00:00Z"
                );
                if (
                    currentDate < startDate ||
                    currentDate > endDate
                )
                    return false;

                const dayOfWeek = currentDate.getUTCDay();
                if (r.type === "weekly") {
                    const days = r.daysOfWeek
                        ? r.daysOfWeek.split(",").map(Number)
                        : [];
                    return days.includes(dayOfWeek);
                }
                if (r.type === "daily") {
                    return (
                        !(r.weekdaysOnly ?? false) ||
                        (dayOfWeek >= 1 && dayOfWeek <= 5)
                    );
                }
            } else {
                // Verifica se a data da requisição única corresponde
                return r.date && r.date.startsWith(dateKey);
            }
            return false;
        });
    };

    /**
     * Helper para verificar se um período tem um AGENDAMENTO ATIVO (não-bloqueado).
     */
    const getActiveBooking = (periodId) => {
        const b = getBookingForDate(state.selectedRoomId, currentDate, periodId);
        // Retorna o booking somente se ele existir E NÃO for um bloqueio
        if (b && !b.isBlocked) {
            return b;
        }
        return null;
    };

    // --- FIM: NOVAS FUNÇÕES AUXILIARES ---


    const periodsByGroup = periods.reduce((acc, period) => {
        if (!acc[period.group]) acc[period.group] = [];
        acc[period.group].push(period);
        return acc;
    }, {});

    calendarContent.innerHTML = Object.keys(periodsByGroup)
        .map(
            (groupName) => `
            <div class="bg-gray-800 p-4 rounded-lg mb-4">
                <h3 class="text-xl font-bold text-cyan-400 mb-3">${groupName}</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    ${periodsByGroup[groupName]
                        .map((period) => {

                            // --- INÍCIO DA LÓGICA DE DESABILITAÇÃO DE CONFLITO ---
                            
                            // 1. Identificar IDs do grupo (ex: 'manha_antes', 'manha_apos', 'manha_todo')
                            const basePeriodId = period.id.substring(0, period.id.lastIndexOf('_')); 
                            const antesId = `${basePeriodId}_antes`;
                            const aposId = `${basePeriodId}_apos`;
                            const todoId = `${basePeriodId}_todo`;

                            // 2. Verificar o status "TAKEN" (reservado ou pendente) para cada um
                            // Usamos '!!' para converter o resultado (objeto ou undefined) para boolean
                            const antesIsTaken = !!getActiveBooking(antesId) || !!isPeriodPending(antesId);
                            const aposIsTaken = !!getActiveBooking(aposId) || !!isPeriodPending(aposId);
                            const todoIsTaken = !!getActiveBooking(todoId) || !!isPeriodPending(todoId);

                            // 3. Definir a flag de desabilitação
                            let isPeriodDisabled = false;
                            let disabledReason = "";

                            if (period.id.endsWith('_todo')) {
                                // Lógica para desabilitar "Período Todo"
                                if (antesIsTaken || aposIsTaken) {
                                    isPeriodDisabled = true;
                                    disabledReason = "Períodos parciais já estão em uso.";
                                }
                            } else if (period.id.endsWith('_antes') || period.id.endsWith('_apos')) {
                                // Lógica para desabilitar "Antes/Após Intervalo"
                                if (todoIsTaken) {
                                    isPeriodDisabled = true;
                                    disabledReason = "O período todo já está em uso.";
                                }
                            }
                            // --- FIM DA LÓGICA DE DESABILITAÇÃO DE CONFLITO ---


                            // Busca os dados do período ATUAL
                            const booking = getBookingForDate(
                                state.selectedRoomId,
                                currentDate,
                                period.id
                            );
                            
                            // Reutiliza a função helper para o período atual
                            const pending = isPeriodPending(period.id); 

                            let content = "";
                            let actionButtons = ""; // Para botões de coordenador ou solicitar
                            let coordinatorEditSection = ""; // Para edição do coordenador

                            // --- Lógica de Bloqueio de Dia Passado ---
                            if (isPastDate) {
                                content = `<p class="text-gray-500 font-medium text-sm italic">Data passada</p>`;
                                // Coordenador ainda pode ver o que *aconteceu*
                                if (booking?.isBlocked) {
                                    content = `<p class="text-gray-500 font-medium">🚫 Bloqueado (Passado): ${booking.blockReason}</p>`;
                                } else if (booking) {
                                    content = `<div class="text-left text-sm opacity-70"><p><span class="font-medium text-gray-500">Prof (Passado):</span> ${
                                        booking.prof
                                    } ${
                                        booking.isRecurring ? "🔄" : ""
                                    }</p><p><span class="font-medium text-gray-500">Turma:</span> ${
                                        booking.turma
                                    }</p></div>`;
                                } else if (pending) {
                                    content = `<p class="text-yellow-600 font-medium opacity-70">⏳ Pendente (Expirado)</p>`;
                                }
                                // Não há actionButtons e nem coordinatorEditSection para datas passadas
                            
                            } else {
                                // --- Lógica original (colocada dentro do else) ---
                                if (booking?.isBlocked) {
                                    content = `<p class="text-gray-400 font-medium">🚫 Bloqueado: ${booking.blockReason}</p>`;
                                    if (isCoordinator) {
                                        actionButtons = `<button data-schedule-id="${booking.id}" class="remove-schedule-btn mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md text-xs">Desbloquear</button>`;
                                    }
                                } else if (booking) {
                                    // Agendamento Aprovado (único ou recorrente)
                                    content = `<div class="text-left text-sm"><p><span class="font-medium text-gray-400">Professor:</span> ${
                                        booking.prof
                                    } ${
                                        booking.isRecurring ? "🔄" : ""
                                    }</p><p><span class="font-medium text-gray-400">Turma:</span> ${
                                        booking.turma
                                    }</p></div>`;
                                    if (
                                        isCoordinator ||
                                        booking.applicationUserId === state.currentUserId
                                    ) {
                                        // Botão para cancelar (único ou recorrente)
                                        const cancelType = booking.isRecurring
                                            ? "recurring"
                                            : "schedule";
                                        const cancelId = booking.isRecurring
                                            ? booking.id
                                            : booking.id; // ID correto
                                        actionButtons = `<button data-cancel-type="${cancelType}" data-cancel-id="${cancelId}" class="cancel-booking-btn mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md text-xs">Cancelar</button>`;
                                    }
                                } else if (pending) {
                                    // Solicitação Pendente
                                    content = `<p class="text-yellow-400 font-medium">⏳ Pendente (${pending.prof})</p>`;
                                    if (isCoordinator) {
                                        actionButtons = `
                                            <div class="mt-2 flex gap-2">
                                                <button data-request-id="${pending.id}" class="approve-btn bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-2 rounded-md text-xs">Aprovar</button>
                                                <button data-request-id="${pending.id}" class="deny-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md text-xs">Negar</button>
                                            </div>`;
                                    } else if (
                                        pending.applicationUserId === state.currentUserId
                                    ) {
                                        // Botão para o professor cancelar a própria solicitação pendente
                                        actionButtons = `<button data-request-id="${pending.id}" class="deny-btn mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md text-xs">Cancelar Solicitação</button>`;
                                    }
                                
                                // --- MODIFICAÇÃO: Verifica se o período está desabilitado ---
                                } else if (isPeriodDisabled) {
                                    // Se está Disponível (sem booking, sem pending), MAS desabilitado
                                    content = `<span class="text-gray-500 text-sm font-medium italic">${disabledReason}</span>`;
                                    // Nenhum 'actionButton' é mostrado (impede "Solicitar")
                                
                                } else {
                                    // Disponível (e não desabilitado)
                                    content = `<span class="text-green-400 text-sm font-medium">Disponível</span>`;
                                    // Botão Solicitar para qualquer usuário logado
                                    actionButtons = `<button data-period-id="${period.id}" data-period-name="${period.name}" data-date="${dateKey}" class="request-btn mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm w-full">Solicitar</button>`;
                                }

                                // --- MODIFICAÇÃO: Opções de edição direta para Coordenador ---
                                if (isCoordinator) {
                                    if (booking?.isBlocked) {
                                        // Se bloqueado (e não for passado), mostra "Desbloquear"
                                        coordinatorEditSection = `
                                            <div class="mt-4 pt-4 border-t border-gray-700">
                                                <button data-schedule-id="${booking.id}" class="remove-schedule-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md text-xs">Desbloquear</button>
                                            </div>`;
                                    } else {
                                        // Se não bloqueado (e não for passado), mostra opções de salvar/bloquear
                                        
                                        // Verifica se os botões de ação do coordenador devem ser desabilitados
                                        // Desabilita se houver conflito E este período atual estiver vazio (!booking)
                                        const isDisabled = isPeriodDisabled && !booking; 
                                        const disabledAttr = isDisabled ? `disabled title="${disabledReason}"` : '';
                                        const disabledClass = isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-700';
                                        const disabledClassSave = isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cyan-700';

                                        const professorOptions = allUsers
                                            .map(
                                                (user) =>
                                                    `<option value="${user.id}" ${
                                                        booking?.applicationUserId === user.id
                                                            ? "selected"
                                                            : ""
                                                    }>${user.fullName}</option>`
                                            )
                                            .join("");
                                        
                                        coordinatorEditSection = `
                                            <div class="mt-4 pt-4 border-t border-gray-700">
                                                <div class="grid grid-cols-1 gap-3">
                                                    <div>
                                                        <label for="prof-${
                                                            period.id
                                                        }" class="text-xs text-gray-400">Professor</label>
                                                        <select id="prof-${
                                                            period.id
                                                        }" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm mt-1" ${disabledAttr}>
                                                            <option value="">Selecione o professor</option>
                                                            ${professorOptions}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label for="turma-${
                                                            period.id
                                                        }" class="text-xs text-gray-400">Turma</label>
                                                        <input type="text" id="turma-${
                                                            period.id
                                                        }" placeholder="Turma (Obrigatório se Prof selecionado)" value="${
                                                            booking?.turma || ""
                                                        }" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm mt-1" ${disabledAttr}>
                                                    </div>
                                                </div>
                                                <div class="flex items-center justify-between mt-3 flex-wrap gap-2">
                                                    <button data-period-id="${
                                                        period.id
                                                    }" data-date="${dateKey}" class="block-btn bg-yellow-600 text-white font-bold py-1 px-2 rounded-md text-xs ${disabledClass}" ${disabledAttr}>Bloquear</button>
                                                    <button data-schedule-id="${
                                                        booking?.id || 0
                                                    }" data-period-id="${
                                                        period.id
                                                    }" data-date="${dateKey}" class="save-direct-btn bg-cyan-600 text-white font-bold py-1 px-2 rounded-md text-xs ${disabledClassSave}" ${disabledAttr}>Salvar</button>
                                                </div>
                                            </div>`;
                                    }
                                }
                            } // --- Fim do 'else' da lógica de data passada ---

                            return `
                                <div class="bg-gray-900 p-4 rounded-lg flex flex-col justify-between">
                                    <div>
                                        <h4 class="font-semibold text-md mb-3">${period.name}</h4>
                                        ${content}
                                    </div>
                                    <div>
                                        ${actionButtons}
                                        ${coordinatorEditSection}
                                    </div>
                                </div>
                            `;
                        })
                        .join("")}
                </div>
            </div>
        `
        )
        .join("");
};

  const renderWeeklyView = () => {
    const calendarContent = document.getElementById("calendar-content");
    if (!calendarContent) return;

    const startOfWeek = getStartOfWeek(state.currentDate);
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      return d;
    });

    const mainPeriods = [
      { id: "manha", name: "Manhã" },
      { id: "tarde", name: "Tarde" },
      { id: "noite", name: "Noite" },
    ];

    let html = '<div class="week-view-grid text-xs text-center">';
    // Cabeçalho dos dias
    html +=
      '<div class="sticky top-0 bg-gray-800 z-10 py-1"></div>' +
      days
        .map(
          (d) =>
            `<div class="sticky top-0 bg-gray-800 z-10 font-bold p-1">${d.toLocaleDateString(
              "pt-BR",
              { weekday: "short", timeZone: "UTC" }
            )}<br>${d.getUTCDate()}</div>`
        )
        .join(""); // Use UTC

    mainPeriods.forEach((turn) => {
      html += `<div class="font-bold p-2 text-right self-center">${turn.name}</div>`; // Nome do turno
      days.forEach((day) => {
        const currentDate = new Date(day); // Cria cópia para não modificar 'day'
        currentDate.setUTCHours(12, 0, 0, 0); // Define hora UTC
        const dateKey = formatDate(currentDate);

        // --- NOVO: Verificação de data passada ---
        const isPastDate = currentDate.getTime() < todayTimestamp;
        // --- FIM NOVO ---

        let isOccupied = false;
        let isBlocked = false;
        let isPending = false;

        const turnPeriodIds = periods
          .filter((p) => p.id.startsWith(turn.id))
          .map((p) => p.id);

        for (const periodId of turnPeriodIds) {
          const booking = getBookingForDate(
            state.selectedRoomId,
            currentDate,
            periodId
          );
          if (booking?.isBlocked) {
            isBlocked = true;
            break;
          }
          if (booking?.isOccupied || booking?.prof) {
            isOccupied = true;
          }
        }

        // Verifica pendentes se não houver bloqueio ou ocupação
        if (!isBlocked && !isOccupied) {
          isPending = pendingRequests.some((r) => {
            if (
              r.roomId !== state.selectedRoomId ||
              !turnPeriodIds.includes(r.period) ||
              r.status !== "pending"
            )
              return false;
            if (r.isRecurring) {
              const startDate = new Date(
                r.startDate.split("T")[0] + "T12:00:00Z"
              );
              const endDate = new Date(r.endDate.split("T")[0] + "T12:00:00Z");
              if (currentDate < startDate || currentDate > endDate)
                return false;
              const dayOfWeek = currentDate.getUTCDay();
              if (r.type === "weekly") {
                const days = r.daysOfWeek
                  ? r.daysOfWeek.split(",").map(Number)
                  : [];
                return days.includes(dayOfWeek);
              }
              if (r.type === "daily") {
                return (
                  !(r.weekdaysOnly ?? false) ||
                  (dayOfWeek >= 1 && dayOfWeek <= 5)
                );
              }
            } else {
              return r.date && r.date.startsWith(dateKey);
            }
            return false;
          });
        }

        let cellContent = "",
          cellClass = "",
          cellDataAttr = "";

        if (isPastDate) {
          cellContent = `<i>(Passado)</i>`;
          cellClass = "bg-gray-700 opacity-50 cursor-not-allowed";
          cellDataAttr = ""; // Desabilita clique
        } else {
          // Lógica original (futuro ou hoje)
          cellDataAttr = `data-date="${dateKey}"`; // Habilita clique
          if (isBlocked) {
            cellContent = `🚫 Bloqueado`;
            cellClass =
              "bg-gray-600 opacity-70 cursor-pointer hover:bg-gray-500"; // Clicável, mas cinza
          } else if (isOccupied) {
            cellContent = `🔴 Ocupado`;
            cellClass =
              "bg-red-800 bg-opacity-60 hover:bg-red-700 cursor-pointer";
          } else if (isPending) {
            cellContent = `⏳ Pendente`;
            cellClass =
              "bg-yellow-700 bg-opacity-60 hover:bg-yellow-600 cursor-pointer";
          } else {
            cellContent = '<span class="text-green-400">✓ Disponível</span>';
            cellClass = "bg-gray-700 hover:bg-gray-600 cursor-pointer";
          }
        }

        html += `<div class="week-view-cell p-2 rounded ${cellClass} flex items-center justify-center" ${cellDataAttr}>${cellContent}</div>`;
      });
    });
    html += "</div>";
    calendarContent.innerHTML = html;
  };

  const renderMonthlyView = () => {
    const calendarContent = document.getElementById("calendar-content");
    const year = state.currentDate.getUTCFullYear(); // Use UTC
    const month = state.currentDate.getUTCMonth(); // Use UTC
    const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0));
    const daysInMonth = lastDayOfMonth.getUTCDate(); // Use UTC
    const startDayOfWeek = firstDayOfMonth.getUTCDay(); // Use UTC (0 = Dom)
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    let html = '<div class="month-view-grid text-center">';

    weekdays.forEach((day) => {
      html += `<div class="font-bold p-2 text-xs text-gray-400">${day}</div>`;
    });
    for (let i = 0; i < startDayOfWeek; i++) {
      html += `<div class="month-day-cell is-other-month"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(Date.UTC(year, month, day, 12)); // Use UTC
      const dateKey = formatDate(currentDate);

      // --- NOVO: Verificação de data passada ---
      const isPastDate = currentDate.getTime() < todayTimestamp;
      // --- FIM NOVO ---

      const getCombinedPeriodStatusStyle = (groupPeriod) => {
        const basePeriod = groupPeriod.toLowerCase().replace("ã", "a");
        const antesId = `${basePeriod}_antes`;
        const aposId = `${basePeriod}_apos`;
        const todoId = `${basePeriod}_todo`;
        const antesBooking = getBookingForDate(
          state.selectedRoomId,
          currentDate,
          antesId
        );
        const aposBooking = getBookingForDate(
          state.selectedRoomId,
          currentDate,
          aposId
        );
        const todoBooking = getBookingForDate(
          state.selectedRoomId,
          currentDate,
          todoId
        );

        // --- CORREÇÃO: Usa a nova função 'isPeriodPending' ---
        const antesPending = isPeriodPending(
          state.selectedRoomId,
          currentDate,
          antesId
        );
        const aposPending = isPeriodPending(
          state.selectedRoomId,
          currentDate,
          aposId
        );
        const todoPending = isPeriodPending(
          state.selectedRoomId,
          currentDate,
          todoId
        );
        // --- FIM DA CORREÇÃO ---

        if (antesPending || aposPending || todoPending) return "bg-yellow-500"; // Pendente tem prioridade visual aqui
        if (todoBooking?.isBlocked) return "bg-gray-500";
        if (todoBooking && !todoBooking.isBlocked) return "bg-red-500";
        let statusAntes = "free",
          statusApos = "free";
        if (antesBooking?.isBlocked) statusAntes = "blocked";
        else if (antesBooking) statusAntes = "booked";
        if (aposBooking?.isBlocked) statusApos = "blocked";
        else if (aposBooking) statusApos = "booked";
        if (statusAntes === "booked" && statusApos === "booked")
          return "bg-red-500";
        if (statusAntes === "blocked" && statusApos === "blocked")
          return "bg-gray-500";
        if (statusAntes === "booked" && statusApos === "free")
          return "bg-half-left-red";
        if (statusAntes === "free" && statusApos === "booked")
          return "bg-half-right-red";
        if (statusAntes === "blocked" && statusApos === "free")
          return "bg-half-left-gray";
        if (statusAntes === "free" && statusApos === "blocked")
          return "bg-half-right-gray";
        if (statusAntes === "booked" && statusApos === "blocked")
          return "bg-half-left-red-right-gray";
        if (statusAntes === "blocked" && statusApos === "booked")
          return "bg-half-left-gray-right-red";
        return "bg-green-500";
      };

      // --- ALTERAÇÃO: Adiciona classe e remove data-date se for data passada ---
      let cellClasses = "month-day-cell text-left";
      let cellDataAttr = `data-date="${dateKey}"`;

      if (isPastDate) {
        cellClasses += " bg-gray-700 opacity-50 cursor-not-allowed"; // Classe para dia passado
        cellDataAttr = ""; // Remove o atributo de data para desabilitar clique
      } else {
        cellClasses += " cursor-pointer hover:bg-gray-600 transition-colors"; // Classe normal
      }
      // --- FIM ALTERAÇÃO ---

      html += `
                <div class="${cellClasses}" ${cellDataAttr}>
                    <div class="font-bold text-xs sm:text-sm">${day}</div>
                    <div class="period-summary mt-1">
                        <span title="Manhã" class="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-xs font-bold text-white rounded-full ${getCombinedPeriodStatusStyle(
                          "Manhã"
                        )}">M</span>
                        <span title="Tarde" class="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-xs font-bold text-white rounded-full ${getCombinedPeriodStatusStyle(
                          "Tarde"
                        )}">T</span>
                        <span title="Noite" class="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-xs font-bold text-white rounded-full ${getCombinedPeriodStatusStyle(
                          "Noite"
                        )}">N</span>
                    </div>
                </div>`;
    }

    const totalCells = startDayOfWeek + daysInMonth;
    const remainingCells = 7 - (totalCells % 7);
    if (remainingCells < 7) {
      for (let i = 0; i < remainingCells; i++) {
        html += `<div class="month-day-cell is-other-month"></div>`;
      }
    }
    html += "</div>";
    calendarContent.innerHTML = html;
  };

  // --- FUNÇÕES MODAL DE SOLICITAÇÃO ---
  const openRequestModal = (periodId, periodName, date) => {
    // --- NOVO: Verificação de Segurança ---
    const requestedTimestamp = new Date(date + "T12:00:00Z").getTime();
    if (requestedTimestamp < todayTimestamp) {
      alert("Não é possível solicitar agendamentos para datas passadas.");
      return;
    }
    // --- FIM NOVO ---

    const room = sectors
      .flatMap((s) => s.rooms)
      .find((r) => r.id === state.selectedRoomId);
    if (!room) return;
    const dateObj = new Date(date + "T12:00:00Z");
    const dateDisplay = dateObj.toLocaleDateString("pt-BR", {
      dateStyle: "full",
      timeZone: "UTC",
    });
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const dayOfWeek = dateObj.getUTCDay();
    requestModal.innerHTML = `
            <div class="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-auto animate-fade-in p-6">
                <h3 class="text-xl font-bold text-cyan-400 mb-2">Solicitar Agendamento</h3>
                <p class="text-gray-400 mb-4">Ambiente: <strong>${
                  room.name
                }</strong><br>Período: <strong>${periodName} (${dateDisplay})</strong></p>
                <form id="request-form">
                    <div><label for="turma-request" class="block mb-2 text-sm font-medium text-gray-300">Sua Turma</label><input type="text" id="turma-request" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" required></div>
                    <div class="mt-4"><label for="justification-request" class="block mb-2 text-sm font-medium text-gray-300">Justificativa (Opcional)</label><textarea id="justification-request" rows="2" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors duration-200" placeholder="Ex: Aula de reposição, projeto..."></textarea><p id="conflict-warning" class="text-yellow-400 text-xs mt-1 hidden"></p></div>
                    <div class="mt-4 pt-4 border-t border-gray-700"><div class="flex items-center gap-2"><input type="checkbox" id="recurring-request-checkbox" class="bg-gray-700 border-gray-600 rounded text-cyan-500 focus:ring-cyan-500"><label for="recurring-request-checkbox" class="text-sm font-medium text-gray-300">Solicitação Recorrente</label></div></div>
                    <div id="recurring-request-options" class="hidden mt-4 p-4 bg-gray-900 rounded-md space-y-4 border border-gray-700">
                         <div><label class="text-sm font-medium text-gray-300">Tipo</label><div class="flex gap-4 mt-2"><label class="flex items-center gap-2 text-sm"><input type="radio" name="recurring-type-request" value="weekly" class="recurring-type-radio-request" checked> Semanal</label><label class="flex items-center gap-2 text-sm"><input type="radio" name="recurring-type-request" value="daily" class="recurring-type-radio-request"> Diário</label></div></div>
                         <div id="weekly-options-request"><label class="text-sm font-medium text-gray-300">Dias:</label><div class="grid grid-cols-4 gap-2 text-sm mt-1">${weekdays
                           .map(
                             (day, i) =>
                               `<label class="flex items-center gap-2 p-1 bg-gray-700 rounded"><input type="checkbox" value="${i}" class="weekday-checkbox-request"${
                                 i === dayOfWeek ? " checked" : ""
                               }> ${day}</label>`
                           )
                           .join("")}</div></div>
                         <div id="daily-options-request" class="hidden"><label class="flex items-center gap-2 text-sm"><input type="checkbox" id="weekdays-only-request"> Apenas dias úteis</label></div>
                         <div><label for="recurring-end-date-request" class="text-sm font-medium text-gray-300">Repetir até:</label><input type="date" id="recurring-end-date-request" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mt-1 text-sm text-white" min="${date}"></div>
                    </div>
                    <div class="flex justify-end gap-3 mt-6"><button type="button" id="cancel-request-btn" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">Cancelar</button><button type="submit" id="submit-request-btn" class="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 font-semibold transition-colors">Enviar Solicitação</button></div>
                </form>
            </div>
        `;
    requestModal.classList.add("is-open");

    // Adiciona listeners
    const recurringCheckbox = document.getElementById(
      "recurring-request-checkbox"
    );
    const recurringOptionsDiv = document.getElementById(
      "recurring-request-options"
    );
    const weeklyOptionsDiv = document.getElementById("weekly-options-request");
    const dailyOptionsDiv = document.getElementById("daily-options-request");
    const requestForm = document.getElementById("request-form");
    const cancelBtn = document.getElementById("cancel-request-btn");
    const submitBtn = document.getElementById("submit-request-btn");
    const justificationInput = document.getElementById("justification-request");
    const conflictWarning = document.getElementById("conflict-warning");

    if (recurringCheckbox) {
      recurringCheckbox.onchange = (e) => {
        recurringOptionsDiv?.classList.toggle("hidden", !e.target.checked);
        if (!e.target.checked && conflictWarning) {
          conflictWarning.classList.add("hidden");
          justificationInput?.classList.remove(
            "border-yellow-500",
            "ring-yellow-500"
          );
          justificationInput?.removeAttribute("required");
        }
      };
    }
    document
      .querySelectorAll('input[name="recurring-type-request"]')
      .forEach((radio) => {
        radio.onchange = (e) => {
          const isWeekly = e.target.value === "weekly";
          weeklyOptionsDiv?.classList.toggle("hidden", !isWeekly);
          dailyOptionsDiv?.classList.toggle("hidden", isWeekly);
        };
      });
    if (cancelBtn)
      cancelBtn.onclick = () => requestModal.classList.remove("is-open");

    if (requestForm && submitBtn) {
      requestForm.onsubmit = async (e) => {
        e.preventDefault();
        const turmaInput = document.getElementById("turma-request");
        const turma = turmaInput ? turmaInput.value.trim() : "";
        if (!turma) {
          alert("Informe a turma.");
          turmaInput?.focus();
          return;
        }
        const isRecurring = recurringCheckbox
          ? recurringCheckbox.checked
          : false;
        const justification = justificationInput
          ? justificationInput.value.trim()
          : null;

        // Monta payload preliminar
        let payload = {
          roomId: state.selectedRoomId,
          period: periodId,
          turma,
          justification,
          isRecurring,
          date: isRecurring ? null : date,
          type: null,
          startDate: null,
          endDate: null,
          daysOfWeek: null,
          weekdaysOnly: null,
        };
        if (isRecurring) {
          const typeRadio = document.querySelector(
            'input[name="recurring-type-request"]:checked'
          );
          const endDateInput = document.getElementById(
            "recurring-end-date-request"
          );
          const type = typeRadio ? typeRadio.value : "weekly";
          const endDate = endDateInput ? endDateInput.value : null;
          if (!endDate) {
            alert("Selecione a data final.");
            endDateInput?.focus();
            return;
          }
          if (new Date(endDate) < new Date(date)) {
            alert("Data final anterior à inicial.");
            endDateInput?.focus();
            return;
          }
          payload.type = type;
          payload.startDate = date;
          payload.endDate = endDate;
          payload.date = null;
          if (type === "weekly") {
            const selectedDays = Array.from(
              document.querySelectorAll(".weekday-checkbox-request:checked")
            ).map((cb) => parseInt(cb.value));
            if (selectedDays.length === 0) {
              alert("Selecione dias da semana.");
              return;
            }
            payload.daysOfWeek = selectedDays.join(",");
            payload.weekdaysOnly = null;
          } else {
            const weekdaysOnlyCheckbox = document.getElementById(
              "weekdays-only-request"
            );
            payload.weekdaysOnly = weekdaysOnlyCheckbox
              ? weekdaysOnlyCheckbox.checked
              : false;
            payload.daysOfWeek = null;
          }
        }

        // VERIFICAÇÃO DE CONFLITO (SE RECORRENTE)
        let proceedSubmission = true;
        // --- MODIFICADO: Só verifica se for recorrente E se a justificativa NÃO for obrigatória ainda ---
        if (isRecurring && !justificationInput?.hasAttribute("required")) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Verificando...";
          conflictWarning.classList.add("hidden");
          justificationInput?.classList.remove(
            "border-yellow-500",
            "ring-yellow-500"
          );

          try {
            await apiFetch("/Data/requests/check-conflict", {
              method: "POST",
              body: JSON.stringify(payload),
            });
            console.log("Nenhum conflito detectado.");
          } catch (error) {
            if (error.status === 409) {
              proceedSubmission = false; // Não prossegue para submitRequest
              const errorData = error.data;
              const conflictingDates = errorData?.conflictingDates || [];
              const conflictMessageString =
                errorData?.message || error.message || "Conflitos detectados.";
              console.warn(
                "Conflito detectado:",
                conflictingDates,
                "Msg:",
                conflictMessageString
              );
              if (conflictWarning && justificationInput) {
                const datesToShow = conflictingDates.slice(0, 5).join(", ");
                conflictWarning.textContent = `Conflito(s) em: ${datesToShow}${
                  conflictingDates.length > 5 ? "..." : ""
                }. Justifique a necessidade.`;
                conflictWarning.classList.remove("hidden");
                justificationInput.classList.add(
                  "border-yellow-500",
                  "ring-yellow-500"
                );
                justificationInput.setAttribute("required", "true"); // MARCA COMO OBRIGATÓRIO
                justificationInput.focus();
              } else {
                alert(
                  `Conflitos detectados. Justifique.\n${conflictMessageString}\nDatas: ${conflictingDates.join(
                    ", "
                  )}`
                );
              }
            } else {
              proceedSubmission = false; // Não prossegue
              alert(`Erro ao verificar conflitos: ${error.message}`);
            }
          } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Enviar Solicitação";
          }
        }
        // --- FIM DA MODIFICAÇÃO ---

        // ENVIO DA SOLICITAÇÃO
        if (proceedSubmission) {
          // Verifica se a justificativa era obrigatória (devido a conflito anterior) e foi preenchida
          if (justificationInput?.hasAttribute("required") && !justification) {
            alert("Justificativa obrigatória devido aos conflitos detectados.");
            justificationInput.focus();
            return; // Não envia
          }
          submitBtn.disabled = true;
          submitBtn.textContent = "Enviando...";
          await submitRequest(payload); // Chama a função original de envio
          requestModal.classList.remove("is-open");
          // Reset button state in case modal is reused or submitRequest fails without closing
          submitBtn.disabled = false;
          submitBtn.textContent = "Enviar Solicitação";
        }
      };
    }
  };

  const openNotificationsModal = async () => {
    try {
      if (state.currentUserRole === "coordinator")
        pendingRequests = (await apiFetch("/Data/requests")) || [];
      else pendingRequests = [];
      updateNotificationBadge();
    } catch (error) {
      /* ... (error handling) ... */
    }

    const requestsHtml = pendingRequests
      .map((req) => {
        const roomName = getRoomNameById(req.roomId);
        let dateInfo,
          recurringIcon = "";
        if (req.isRecurring && req.startDate && req.endDate) {
          /* ... (date formatting) ... */
          const startDateDisplay = new Date(req.startDate).toLocaleDateString(
            "pt-BR",
            { timeZone: "UTC" }
          );
          const endDateDisplay = new Date(req.endDate).toLocaleDateString(
            "pt-BR",
            { timeZone: "UTC" }
          );
          dateInfo = `de ${startDateDisplay} até ${endDateDisplay}`;
          recurringIcon = `<span class="text-cyan-400" title="Solicitação Recorrente">🔄</span> `;
        } else if (req.date) {
          dateInfo = `para ${new Date(req.date).toLocaleDateString("pt-BR", {
            timeZone: "UTC",
          })}`;
        } else {
          dateInfo = "(Data inválida)";
        }
        const periodName =
          periods.find((p) => p.id === req.period)?.name || req.period;
        const groupName =
          periods.find((p) => p.id === req.period)?.group.split(" ")[0] || "";
        const requesterName = req.userFullName || req.prof;

        // --- Display Justification ---
        let justificationHtml = "";
        if (req.justification) {
          // Check if justification exists and is not empty
          // Added italic, slightly smaller text, and margin top
          justificationHtml = `<p class="text-xs text-gray-400 mt-1 italic break-words">Justificativa: ${req.justification}</p>`;
        }
        // --- End Display Justification ---

        return `
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-700 rounded-md text-sm gap-2">
                    <div class="flex-grow">
                        <p>${recurringIcon}<b>${requesterName}</b> (${
          req.turma || "N/A"
        }) pediu <b>${roomName}</b> ${dateInfo} (${groupName} - ${periodName})</p>
                       
                        ${justificationHtml}
                    </div>
                    <div class="flex gap-2 flex-shrink-0 self-end sm:self-center"> 
                        <button data-request-id="${
                          req.id
                        }" class="approve-btn bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-2 rounded-md text-xs whitespace-nowrap">Aprovar</button>
                        <button data-request-id="${
                          req.id
                        }" class="deny-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md text-xs whitespace-nowrap">Negar</button>
                    </div>
                </div>`;
      })
      .join("");

    notificationsModal.innerHTML = `
            <div class="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl mx-auto animate-fade-in p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-cyan-400">Solicitações Pendentes</h3>
                    <button id="close-notifications-btn" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div class="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                    ${
                      pendingRequests.length > 0
                        ? requestsHtml
                        : '<p class="text-gray-400 text-center py-4">Nenhuma solicitação pendente.</p>'
                    }
                </div>
            </div>`;
    if (!notificationsModal.classList.contains("is-open"))
      notificationsModal.classList.add("is-open");
    const closeBtn = document.getElementById("close-notifications-btn");
    if (closeBtn)
      closeBtn.onclick = () => notificationsModal.classList.remove("is-open");
  };

  // --- REINSTATE FUNCTION DEFINITION: openMyAllSchedulesModal ---
  // const openMyAllSchedulesModal = async () => {
  //   myAllSchedulesModal.innerHTML = `
  //           <div class="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl mx-auto animate-fade-in p-6">
  //                <div class="flex justify-between items-center mb-4">
  //                   <h3 class="text-xl font-bold text-purple-400">Meus Agendamentos</h3>
  //                   <button id="close-my-all-schedules-btn" class="text-gray-400 hover:text-white text-2xl">&times;</button>
  //               </div>
  //               <div id="my-schedules-loading" class="text-center p-8"><p class="text-gray-400">Carregando...</p></div>
  //               <div id="my-schedules-content" class="hidden"></div>
  //           </div>`;
  //   myAllSchedulesModal.classList.add("is-open");
  //   const closeBtn = document.getElementById("close-my-all-schedules-btn");
  //   if (closeBtn)
  //     closeBtn.onclick = () => myAllSchedulesModal.classList.remove("is-open");

  //   try {
  //     const [myPending, mySchedules, myRecurring] = await Promise.all([
  //       apiFetch("/Data/my-requests"),
  //       apiFetch("/Data/my-schedules"),
  //       apiFetch("/Data/my-recurring-schedules"),
  //     ]);

  //     // ===== INÍCIO DA ALTERAÇÃO (APLICADA DA RESPOSTA ANTERIOR) =====
  //     const requestsHtml =
  //       myPending.length > 0
  //         ? myPending
  //             .map((req) => {
  //               const roomName = getRoomNameById(req.roomId);
  //               const periodName =
  //                 periods.find((p) => p.id === req.period)?.name || req.period;
  //               let dateInfoHtml;

  //               if (req.isRecurring) {
  //                 const weekdays = [
  //                   "Dom",
  //                   "Seg",
  //                   "Ter",
  //                   "Qua",
  //                   "Qui",
  //                   "Sex",
  //                   "Sáb",
  //                 ];

  //                 // Lógica para converter string "1,3,5" (da API /my-requests) em "Seg, Qua, Sex"
  //                 let dayArray = [];
  //                 if (
  //                   req.type === "weekly" &&
  //                   typeof req.daysOfWeek === "string" &&
  //                   req.daysOfWeek.length > 0
  //                 ) {
  //                   dayArray = req.daysOfWeek.split(",").map(Number);
  //                 }
  //                 const days =
  //                   dayArray.length > 0
  //                     ? dayArray.map((d) => weekdays[d]).join(", ")
  //                     : "";

  //                 const recurrenceDesc =
  //                   req.type === "weekly"
  //                     ? `toda ${days}`
  //                     : req.weekdaysOnly
  //                     ? "diariamente (dias úteis)"
  //                     : "diariamente (todos os dias)";

  //                 const startDateDisplay = new Date(
  //                   req.startDate
  //                 ).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  //                 const endDateDisplay = new Date(
  //                   req.endDate
  //                 ).toLocaleDateString("pt-BR", { timeZone: "UTC" });

  //                 dateInfoHtml = `<p class="text-xs text-gray-400 mt-1">Repete ${recurrenceDesc} de ${startDateDisplay} até ${endDateDisplay}</p>`;
  //               } else {
  //                 dateInfoHtml = `<p class="text-xs text-gray-400 mt-1">Para ${new Date(
  //                   req.date
  //                 ).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p>`;
  //               }

  //               return `
  //                   <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-700 rounded-md text-sm gap-2">
  //                       <div>
  //                           <p>${
  //                             req.isRecurring ? "🔄" : ""
  //                           } <b>${roomName}</b> (${periodName}) - Turma: ${
  //                 req.turma || "N/A"
  //               }</p>
  //                           ${dateInfoHtml}
  //                       </div>
  //                       <button data-request-id="${
  //                         req.id
  //                       }" class="cancel-request-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md text-xs whitespace-nowrap self-end sm:self-center">Cancelar Solicitação</button>
  //                   </div>`;
  //             })
  //             .join("")
  //         : '<p class="text-gray-400 text-sm italic">Nenhuma solicitação pendente.</p>';
  //     // ===== FIM DA ALTERAÇÃO =====

  //     const schedulesHtml =
  //       mySchedules.length > 0
  //         ? mySchedules
  //             .map((sched) => {
  //               const roomName = getRoomNameById(sched.roomId);
  //               const periodName =
  //                 periods.find((p) => p.id === sched.period)?.name ||
  //                 sched.period;
  //               return `
  //                   <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-700 rounded-md text-sm gap-2">
  //                       <p><b>${roomName}</b> em <b>${new Date(
  //                 sched.date
  //               ).toLocaleDateString("pt-BR", {
  //                 timeZone: "UTC",
  //               })}</b> (${periodName}) - Turma: ${sched.turma || "N/A"}</p>
  //                       <button data-schedule-id="${
  //                         sched.id
  //                       }" class="cancel-schedule-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md text-xs whitespace-nowrap self-end sm:self-center">Cancelar Agendamento</button>
  //                   </div>`;
  //             })
  //             .join("")
  //         : '<p class="text-gray-400 text-sm italic">Nenhum agendamento futuro aprovado.</p>';

  //     const recurringHtml =
  //       myRecurring.length > 0
  //         ? myRecurring
  //             .map((rec) => {
  //               const roomName = getRoomNameById(rec.roomId);
  //               const periodName =
  //                 periods.find((p) => p.id === rec.period)?.name || rec.period;
  //               const weekdays = [
  //                 "Dom",
  //                 "Seg",
  //                 "Ter",
  //                 "Qua",
  //                 "Qui",
  //                 "Sex",
  //                 "Sáb",
  //               ];
  //               // A API /my-recurring-schedules já retorna 'daysOfWeek' como array [1,3,5], então .map() funciona
  //               const days =
  //                 rec.daysOfWeek && rec.daysOfWeek.length > 0
  //                   ? rec.daysOfWeek.map((d) => weekdays[d]).join(", ")
  //                   : "";
  //               const recurrenceDesc =
  //                 rec.type === "weekly"
  //                   ? `toda ${days}`
  //                   : rec.weekdaysOnly
  //                   ? "diariamente (dias úteis)"
  //                   : "diariamente (todos os dias)";
  //               return `
  //                   <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-700 rounded-md text-sm gap-2">
  //                       <div>
  //                            <p>🔄 <b>${roomName}</b> (${periodName}) - Turma: ${
  //                 rec.turma || "N/A"
  //               }</p>
  //                            <p class="text-xs text-gray-400 mt-1">Repete ${recurrenceDesc} de ${new Date(
  //                 rec.startDate
  //               ).toLocaleDateString("pt-BR", {
  //                 timeZone: "UTC",
  //               })} até ${new Date(rec.endDate).toLocaleDateString("pt-BR", {
  //                 timeZone: "UTC",
  //               })}</p>
  //                       </div>
  //                       <button data-recurring-id="${
  //                         rec.id
  //                       }" class="cancel-recurring-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md text-xs whitespace-nowrap self-end sm:self-center">Cancelar Recorrência</button>
  //                   </div>`;
  //             })
  //             .join("")
  //         : '<p class="text-gray-400 text-sm italic">Nenhum agendamento recorrente ativo.</p>';

  //     const contentDiv = document.getElementById("my-schedules-content");
  //     const loadingDiv = document.getElementById("my-schedules-loading");
  //     if (contentDiv && loadingDiv) {
  //       contentDiv.innerHTML = `
  //                   <div class="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
  //                       <div>
  //                           <h4 class="text-lg font-semibold text-cyan-400 mb-3 border-b border-gray-700 pb-2">Solicitações Pendentes</h4>
  //                           <div class="space-y-2">${requestsHtml}</div>
  //                       </div>
  //                       <div>
  //                           <h4 class="text-lg font-semibold text-cyan-400 mb-3 border-b border-gray-700 pb-2">Agendamentos Aprovados (Futuros)</h4>
  //                           <div class="space-y-2">${schedulesHtml}</div>
  //                       </div>
  //                       <div>
  //                           <h4 class="text-lg font-semibold text-cyan-400 mb-3 border-b border-gray-700 pb-2">Agendamentos Recorrentes (Ativos)</h4>
  //                           <div class="space-y-2">${recurringHtml}</div>
  //                       </div>
  //                   </div>`;
  //       contentDiv.classList.remove("hidden");
  //       loadingDiv.classList.add("hidden");
  //     }
  //   } catch (error) {
  //     console.error("Erro ao carregar 'Meus Agendamentos':", error);
  //     const loadingDiv = document.getElementById("my-schedules-loading");
  //     if (loadingDiv)
  //       loadingDiv.innerHTML =
  //         '<p class="text-red-500">Falha ao carregar dados.</p>';
  //   }
  // };

  // --- REINSTATE FUNCTION DEFINITION: updateNotificationBadge ---
  const updateNotificationBadge = () => {
    // A contagem agora usa a lista 'pendingRequests' que é (ou deveria ser)
    // atualizada corretamente pelo fetchData ou loadRequests.
    const pendingCount = pendingRequests.filter(
      (r) => r.status === "pending"
    ).length;
    let badge = notificationsBell.querySelector(".notification-badge");
    
    if (pendingCount > 0 && state.currentUserRole === "coordinator") {
      
      notificationsBellContainer.classList.remove("hidden");
      if (!badge) {
        badge = document.createElement("div");
        badge.className = "notification-badge";
        // Aplicando estilos via JS (poderia ser uma classe CSS também)
        badge.style.position = "absolute";
        badge.style.top = "-5px";
        badge.style.right = "-5px";
        badge.style.width = "20px";
        badge.style.height = "20px";
        badge.style.borderRadius = "50%";
        badge.style.backgroundColor = "red";
        badge.style.color = "white";
        badge.style.fontSize = "12px";
        badge.style.display = "flex";
        badge.style.justifyContent = "center";
        badge.style.alignItems = "center";
        badge.style.border = "2px solid #1f2937"; // Cor de fundo do header
        notificationsBell.appendChild(badge);
      }
      badge.textContent = pendingCount;
    } else {
      if (badge) notificationsBell.removeChild(badge);
      // Garante que o container fique oculto se não for coordenador ou não houver notificações
      notificationsBellContainer.classList.add("hidden");}
  };

  // --- LÓGICA DE DADOS (API .NET Core) ---
  // --- ATUALIZADO: apiFetch para melhor tratamento de erro 409 ---
  async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    if (!token && !endpoint.includes("/auth/login")) {
      console.warn("API call attempt without token:", endpoint);
      if (
        errorState &&
        loadingState &&
        typeof dashboardContainer !== "undefined" &&
        dashboardContainer
      ) {
        errorState.innerHTML = `<p class="text-red-400 font-bold text-lg">Não autenticado.</p><p class="text-gray-400 mt-2">Faça login.</p><a href="index.html" class="mt-4 inline-block bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded text-sm">Login</a>`;
        errorState.style.display = "block";
        if (loadingState) loadingState.style.display = "none";
        if (
          typeof heatmapTableContainer !== "undefined" &&
          heatmapTableContainer
        )
          heatmapTableContainer.style.display = "none";
        if (dashboardContainer) dashboardContainer.innerHTML = "";
      }
      throw new Error("Usuário não autenticado.");
    }
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        logout();
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      if (response.status === 403) {
        throw new Error("Permissão negada.");
      }
      if (response.status === 204) {
        return null;
      }

      const responseText = await response.text();

      if (!response.ok) {
        let errorData = null;
        let parsedJsonSuccess = false;
        if (responseText) {
          try {
            errorData = JSON.parse(responseText);
            parsedJsonSuccess = true;
          } catch {
            console.warn(
              "Failed to parse error response as JSON:",
              responseText
            );
          }
        }
        console.error(
          `API Error ${response.status} (${endpoint}):`,
          parsedJsonSuccess ? errorData : responseText
        );
        const message =
          parsedJsonSuccess && errorData?.message
            ? errorData.message
            : responseText || `Erro ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        error.data = parsedJsonSuccess ? errorData : null; // Anexa objeto JSON
        error.rawText = responseText;
        throw error;
      }

      try {
        return responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        console.error(
          `Error parsing OK response JSON (${endpoint}):`,
          responseText,
          parseError
        );
        throw new Error("Resposta inesperada.");
      }
    } catch (error) {
      console.error(`API call error for ${endpoint}:`, error);
      if (error.status === 403) {
        alert("Você não tem permissão para executar esta ação.");
      } else if (error.status === 409) {
        /* Handled by caller */
      } else if (!error.message?.includes("Sessão expirada")) {
        alert(`Erro: ${error.message}`);
      }
      throw error;
    }
  }
  // --- FIM DA ATUALIZAÇÃO ---

  // --- ATUALIZADO: fetchData para tratar 403 em /Data/requests ---
  async function fetchData() {
    if (dashboardLoading) dashboardLoading.classList.remove("hidden");
    let schedulesData = {};
    let requestsData = []; // Inicia como vazio
    let recurringData = [];

    try {
      // Cria os promises
      const schedulesPromise = apiFetch("/Data/schedules");
      const recurringPromise = apiFetch("/Data/recurring-schedules");
      let requestsPromise;

      // Só busca /Data/requests se for coordenador
      //if (state.currentUserRole === 'coordinator') {
      requestsPromise = apiFetch("/Data/requests");
      // } else {
      //     requestsPromise = Promise.resolve([]); // Resolve imediatamente com array vazio para professor
      //  }

      // Aguarda todos resolverem
      [schedulesData, requestsData, recurringData] = await Promise.all([
        schedulesPromise,
        requestsPromise,
        recurringPromise,
      ]);

      schedules = schedulesData || {};
      pendingRequests = requestsData || []; // requestsData já será [] se não for coordenador
      recurringSchedules = recurringData || [];

      renderDashboard();
      if (scheduleModal.classList.contains("is-open")) renderCalendarContent();
      if (notificationsModal.classList.contains("is-open"))
        openNotificationsModal();
     
      updateNotificationBadge(); // Chama após ter os dados
      console.log("Dados carregados com sucesso.");
    } catch (error) {
      // O erro 403 de /Data/requests não deve mais acontecer aqui se a lógica acima estiver correta
      // Trata outros erros (conexão, 500, etc.)
      console.error("Erro ao carregar dados:", error);
      loginError.textContent = `Erro ao carregar dados: ${error.message}.`;
      loginError.classList.remove("hidden");
      if (dashboardContainer && dashboardLoading)
        dashboardContainer.innerHTML = "";
    } finally {
      if (dashboardLoading) dashboardLoading.classList.add("hidden");
    }
  }

  // loadRequests não é mais estritamente necessário se fetchData fizer tudo,
  // mas pode ser útil se precisar recarregar SÓ as requests no modal de notificações.
  async function loadRequests() {
    try {
      // Busca condicional aqui também
      //if (state.currentUserRole === 'coordinator') {
      pendingRequests = (await apiFetch("/Data/requests")) || [];
      //} else {
      //pendingRequests = [];
      // }
      updateNotificationBadge();
      // Atualiza o modal SÓ se ele estiver aberto
      if (notificationsModal.classList.contains("is-open")) {
        openNotificationsModal(); // Re-renderiza o modal com os dados atualizados
      }
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
      // Poderia mostrar erro dentro do modal de notificações se aberto
    }
  }
  async function loadAllUsers() {
    try {
      if (state.currentUserRole === "coordinator")
        allUsers = (await apiFetch("/Data/users")) || [];
      else allUsers = [];
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      allUsers = [];
    }
  }

  // Salvar/Atualizar Agendamento Direto (Coordenador)
  const saveDirectBooking = async (scheduleId, periodId, date) => {
    const profSelect = document.getElementById(`prof-${periodId}`);
    const turmaInput = document.getElementById(`turma-${periodId}`);
    const applicationUserId = profSelect ? profSelect.value : null;
    const turma = turmaInput ? turmaInput.value.trim() : null;
    const profName = profSelect
      ? profSelect.options[profSelect.selectedIndex].text
      : null;

    if (!applicationUserId) {
      // Libera horário
      if (scheduleId && scheduleId > 0) {
        if (confirm("Liberar este horário?")) {
          try {
            await apiFetch(`/Data/schedules/${scheduleId}`, {
              method: "DELETE",
            });
            await fetchData();
          } catch (error) {
            alert(`Erro: ${error.message}`);
          }
        }
      }
      return;
    }
    if (!turma) {
      alert("Informe a turma.");
      turmaInput?.focus();
      return;
    }
    const payload = {
      id: scheduleId || 0,
      roomId: state.selectedRoomId,
      date,
      period: periodId,
      prof: profName,
      applicationUserId,
      turma,
      isBlocked: false,
      blockReason: null,
    };
    try {
      await apiFetch("/Data/schedules", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await fetchData();
    } catch (error) {
      alert(`Erro: ${error.message}`);
    }
  };
  const blockPeriod = async (periodId, date) => {
    const reason = prompt("Motivo do bloqueio:");
    if (reason && reason.trim()) {
      const payload = {
        roomId: state.selectedRoomId,
        date,
        period: periodId,
        isBlocked: true,
        blockReason: reason.trim(),
        prof: null,
        turma: null,
        applicationUserId: "SYSTEM",
      };
      try {
        await apiFetch("/Data/schedules", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await fetchData();
      } catch (error) {
        alert(`Erro: ${error.message}`);
      }
    } else if (reason !== null) {
      alert("Motivo não pode ser vazio.");
    }
  };
  // Envia a solicitação para a API
  const submitRequest = async (requestData) => {
    // Recebe o objeto Request direto
    if (!requestData) {
      alert("Erro interno: Dados da solicitação inválidos.");
      return;
    }
    try {
      await apiFetch("/Data/requests", {
        method: "POST",
        body: JSON.stringify(requestData),
      }); // Envia direto
      await fetchData();
      alert("Solicitação enviada! Aguardando aprovação.");
    } catch (error) {
      alert(`Erro ao enviar solicitação: ${error.message}`);
    }
  };

  // Aprova solicitação - Modificado para usar o modal de conflito
  const approveRequest = async (requestId) => {
    const approveBtnNotify = notificationsModal?.querySelector(
      `.approve-btn[data-request-id="${requestId}"]`
    );
    const denyBtnNotify = notificationsModal?.querySelector(
      `.deny-btn[data-request-id="${requestId}"]`
    );
    const approveBtnCalendar = modalContent?.querySelector(
      `.approve-btn[data-request-id="${requestId}"]`
    );
    const denyBtnCalendar = modalContent?.querySelector(
      `.deny-btn[data-request-id="${requestId}"]`
    );

    try {
      await apiFetch(`/Data/requests/${requestId}/approve`, { method: "PUT" });
      await fetchData();
    } catch (error) {
      console.error("Erro ao tentar aprovar solicitação:", error);
      if (error.status === 409) {
        // Verifica se é conflito (pelo status adicionado no apiFetch)
        let conflictMsg = error.message || "Conflito detectado.";
        // Formata a data na mensagem de erro
        const dateRegex = /(\d{4})-(\d{2})-(\d{2})/;
        const match = conflictMsg.match(dateRegex);
        if (match) {
          conflictMsg = conflictMsg.replace(
            dateRegex,
            `${match[3]}/${match[2]}/${match[1]}`
          );
        }
        openConflictModal(conflictMsg, requestId); // Abre modal com opções
        console.log("Conflito ao aprovar:", conflictMsg);
      } else {
        alert(`Erro ao aprovar: ${error.message}`); // Outros erros
        await loadRequests(); // Recarrega só requests se não for conflito
      }
    } finally {
      // Reativa botões de aprovar/negar nos modais
      if (approveBtnNotify) {
        approveBtnNotify.disabled = false;
        approveBtnNotify.textContent = "Aprovar";
      }
      if (denyBtnNotify) {
        denyBtnNotify.disabled = false;
        denyBtnNotify.textContent = "Negar";
      }
      if (approveBtnCalendar) {
        approveBtnCalendar.disabled = false;
        approveBtnCalendar.textContent = "Aprovar";
      }
      if (denyBtnCalendar) {
        denyBtnCalendar.disabled = false;
        denyBtnCalendar.textContent = "Negar";
      }
    }
  };

  const denyRequest = async (requestId) => {
    const confirmationMessage =
      state.currentUserRole === "coordinator"
        ? "Negar esta solicitação?"
        : "Cancelar sua solicitação?";
    if (confirm(confirmationMessage)) {
      try {
        await apiFetch(`/Data/requests/${requestId}`, { method: "DELETE" });
        await fetchData();
      } catch (error) {
        alert(`Erro: ${error.message}`);
        await loadRequests();
      }
    }
  };
  const cancelBooking = async (type, id) => {
    const endpoint =
      type === "recurring"
        ? `/Data/recurring-schedules/${id}`
        : `/Data/schedules/${id}`;
    const msg = `Cancelar este agendamento ${
      type === "recurring" ? "recorrente" : ""
    }?`;
    if (confirm(msg)) {
      try {
        await apiFetch(endpoint, { method: "DELETE" });
        await fetchData();
       // if (myAllSchedulesModal.classList.contains("is-open"))
         // openMyAllSchedulesModal();
      } catch (error) {
        alert(`Erro: ${error.message}`);
      }
    }
  };

  // --- Funções do Modal de Calendário ---
  const openScheduleModal = async (roomId) => {
    state.selectedRoomId = roomId;
    state.currentDate = new Date();
    state.viewMode = "daily";
    if (state.currentUserRole === "coordinator" && allUsers.length === 0)
      await loadAllUsers();
    renderModal();
    scheduleModal.classList.add("is-open");
  };
  const closeScheduleModal = () => {
    scheduleModal.classList.remove("is-open");
    modalContent.innerHTML = "";
    state.selectedRoomId = null;
  };
  const changeDate = (amount) => {
    const current = state.currentDate;
    if (state.viewMode === "daily") current.setDate(current.getDate() + amount);
    else if (state.viewMode === "weekly")
      current.setDate(current.getDate() + amount * 7);
    else if (state.viewMode === "monthly") {
      const currentMonth = current.getMonth();
      current.setMonth(currentMonth + amount);
      if (current.getMonth() !== (currentMonth + amount + 12) % 12)
        current.setDate(0);
    }
    state.currentDate = new Date(current);
    renderCalendarContent();
  };

  // --- INICIALIZAÇÃO E AUTENTICAÇÃO ---
  async function checkExistingLogin() {
    const token = getToken();
    if (token) {
      const payload = parseJwt(token);
      if (payload) {
        const expirationTime = payload.exp * 1000;
        const now = Date.now();
        if (expirationTime < now) {
          localStorage.removeItem("jwt_token");
          loginScreen.classList.remove("hidden");
          mainContent.classList.add("hidden");
          return;
        }

        // --- AJUSTE NA EXTRAÇÃO DO NOME ---
        state.currentUserName =
          payload.unique_name ||
          payload.name ||
          payload[
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
          ] ||
          "Usuário"; // Fallback
        state.currentUserId =
          payload.nameid ||
          payload[
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
          ];

        const roles =
          payload.role ||
          payload[
            "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
          ];
        let isCoord = false;
        if (roles) {
          if (Array.isArray(roles)) isCoord = roles.includes("Coordenador");
          else if (typeof roles === "string") isCoord = roles === "Coordenador";
        }
        state.currentUserRole = isCoord ? "coordinator" : "viewer";
        await initializeApp();
        return;
      } else {
        localStorage.removeItem("jwt_token");
      }
    }
    loginScreen.classList.remove("hidden");
    mainContent.classList.add("hidden");

    if (!nif || !password) {
      loginError.textContent = "Preencha NIF e senha.";
      loginError.classList.remove("hidden");
      return;
    }
  }
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    //loginError.textContent = "";
    loginError.classList.add("hidden");
    const nif = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const submitButton = loginForm.querySelector('button[type="submit"]');
    
    submitButton.disabled = true;
    submitButton.textContent = "Entrando...";

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nif, password }),
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error("NIF ou senha inválidos.");
        else if(response.status >=500){
          //tratamento de erro 500 cold start
          throw new Error('O servidor demorou a responder. Recarregue a página e tente novamente')
        } else {
          throw new Error(`Erro inesperado: ${response.status}`)
        }
      }
      const data = await response.json();
      nomeUsuarioLogado = data.fullName; // Armazena o nome completo do usuário logado
      if (!data.token) throw new Error("Token não recebido.");
      localStorage.setItem("jwt_token", data.token);
      const tokenPayload = parseJwt(data.token);
      if (!tokenPayload) {
        localStorage.removeItem("jwt_token");
        throw new Error("Token inválido.");
      }

      // --- AJUSTE NA EXTRAÇÃO DO NOME ---
      state.currentUserName =
        tokenPayload.unique_name ||
        tokenPayload.name ||
        tokenPayload[
          "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
        ] ||
        data.fullName || // Usa o fullName retornado pela API de login como fallback
        "Usuário";
      state.currentUserId =
        tokenPayload.nameid ||
        tokenPayload[
          "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
        ];

      const roles =
        tokenPayload.role ||
        tokenPayload[
          "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
        ];
      let isCoord = false;
      if (roles) {
        if (Array.isArray(roles)) isCoord = roles.includes("Coordenador");
        else if (typeof roles === "string") isCoord = roles === "Coordenador";
      }
      state.currentUserRole = isCoord ? "coordinator" : "viewer";
      if (data.mustChangePassword) {
        changePasswordModal.classList.add("is-open");
        loginScreen.classList.add("hidden");
      } else {
        await initializeApp();
      }
    } catch (error) {
      loginError.textContent = error.message;
      loginError.classList.remove("hidden");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Entrar";
    }
  });
  changePasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    changePasswordError.textContent = "";
    changePasswordError.classList.add("hidden");
    const currentPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;
    const submitButton = changePasswordForm.querySelector(
      'button[type="submit"]'
    );
    if (!currentPassword || !newPassword) {
      changePasswordError.textContent = "Preencha ambas as senhas.";
      changePasswordError.classList.remove("hidden");
      return;
    }
    if (newPassword.length < 6) {
      changePasswordError.textContent = "Nova senha: mínimo 6 caracteres.";
      changePasswordError.classList.remove("hidden");
      return;
    }
    submitButton.disabled = true;
    submitButton.textContent = "Alterando...";
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      changePasswordModal.classList.remove("is-open");
      alert("Senha alterada!");
      await initializeApp();
    } catch (error) {
      changePasswordError.textContent = `Falha: ${error.message}.`;
      changePasswordError.classList.remove("hidden");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Alterar Senha";
    }
  });
  async function initializeApp() {
    if (state.currentUserRole === "coordinator") {
      roleFlag.textContent = "Coordenador";
      myAllSchedulesBtn.classList.add("hidden");
      dashboardBtn.classList.remove("hidden"); /* Não mexe no sino aqui */
      
    } else {
      roleFlag.textContent = `${nomeUsuarioLogado}`;
      myAllSchedulesBtn.classList.remove("hidden");
      dashboardBtn.classList.add("hidden");
      notificationsBellContainer.classList.add("hidden");
    } // Esconde sino para professor
    roleFlag.classList.remove("hidden");
    loginScreen.classList.add("hidden");
    mainContent.classList.remove("hidden");
    await loadAllUsers();
    await fetchData(); // fetchData agora chama updateNotificationBadge
    console.log(
      "App inicializado:",
      state.currentUserName,
      `(${state.currentUserRole})`
    );
  }
  function logout() {
    localStorage.removeItem("jwt_token");
    state = {
      currentUserRole: null,
      currentUserName: "",
      currentUserId: null,
      selectedRoomId: null,
      currentDate: new Date(),
      viewMode: "daily",
      conflictingRequestId: null,
    };
    schedules = {};
    pendingRequests = [];
    recurringSchedules = [];
    allUsers = [];
    mainContent.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    loginForm.reset();
    loginError.textContent = "";
    loginError.classList.add("hidden");
    notificationsBellContainer.classList.add("hidden");
    myAllSchedulesBtn.classList.add("hidden");
    dashboardBtn.classList.add("hidden");
    roleFlag.classList.add("hidden");
    closeScheduleModal();
    requestModal.classList.remove("is-open");
    notificationsModal.classList.remove("is-open");
    changePasswordModal.classList.remove("is-open");
    myAllSchedulesModal.classList.remove("is-open");
    closeConflictModal();
    console.log("Usuário deslogado.");
  }

  // --- EVENT LISTENERS GERAIS ---
  logoutBtn.addEventListener("click", logout);
 // myAllSchedulesBtn.addEventListener("click", openMyAllSchedulesModal);
  dashboardContainer.addEventListener("click", (e) => {
    const rc = e.target.closest("li[data-room-id]");
    if (rc) openScheduleModal(rc.dataset.roomId);
  });
  modalContent.addEventListener("click", async (e) => {
    const target = e.target;
    if (target.id === "close-modal-btn") closeScheduleModal();
    else if (target.id === "prev-btn") changeDate(-1);
    else if (target.id === "next-btn") changeDate(1);
    else if (target.id === "daily-view-btn") {
      if (state.viewMode !== "daily") {
        state.viewMode = "daily";
        renderModal();
      }
    } else if (target.id === "weekly-view-btn") {
      if (state.viewMode !== "weekly") {
        state.viewMode = "weekly";
        renderModal();
      }
    } else if (target.id === "monthly-view-btn") {
      if (state.viewMode !== "monthly") {
        state.viewMode = "monthly";
        renderModal();
      }
    } else if (target.classList.contains("request-btn")) {
      openRequestModal(
        target.dataset.periodId,
        target.dataset.periodName,
        target.dataset.date
      );
    } else if (target.classList.contains("save-direct-btn")) {
      target.disabled = true;
      target.textContent = "...";
      await saveDirectBooking(
        parseInt(target.dataset.scheduleId) || 0,
        target.dataset.periodId,
        target.dataset.date
      );
    } else if (target.classList.contains("block-btn")) {
      await blockPeriod(target.dataset.periodId, target.dataset.date);
    } else if (target.classList.contains("remove-schedule-btn")) {
      if (confirm("Desbloquear período?")) {
        target.disabled = true;
        target.textContent = "...";
        await cancelBooking("schedule", target.dataset.scheduleId);
      }
    } else if (target.classList.contains("cancel-booking-btn")) {
      target.disabled = true;
      target.textContent = "...";
      await cancelBooking(target.dataset.cancelType, target.dataset.cancelId);
    } else if (target.classList.contains("approve-btn")) {
      target
        .closest("div")
        .querySelectorAll("button")
        .forEach((b) => (b.disabled = true));
      target.textContent = "...";
      await approveRequest(target.dataset.requestId);
    } else if (target.classList.contains("deny-btn")) {
      target
        .closest("div")
        .querySelectorAll("button")
        .forEach((b) => (b.disabled = true));
      target.textContent = "...";
      await denyRequest(target.dataset.requestId);
    } else {
      const dc = target.closest(
        ".month-day-cell[data-date], .week-view-cell[data-date]"
      );
      if (dc?.dataset.date) {
        const clickedDate = new Date(dc.dataset.date + "T12:00:00Z");
        if (
          state.viewMode !== "daily" ||
          formatDate(clickedDate) !== formatDate(state.currentDate)
        ) {
          state.currentDate = clickedDate;
          state.viewMode = "daily";
          renderModal();
        }
      }
    }
  });
  notificationsModal.addEventListener("click", async (e) => {
    const target = e.target;
    if (target.classList.contains("approve-btn")) {
      const c = target.closest("div.flex.gap-2");
      c.querySelectorAll("button").forEach((b) => (b.disabled = true));
      target.textContent = "...";
      await approveRequest(target.dataset.requestId);
    }
    if (target.classList.contains("deny-btn")) {
      const c = target.closest("div.flex.gap-2");
      c.querySelectorAll("button").forEach((b) => (b.disabled = true));
      target.textContent = "...";
      await denyRequest(target.dataset.requestId);
    }
  });
  notificationsBell.onclick = openNotificationsModal;
  myAllSchedulesModal.addEventListener("click", async (e) => {
    const target = e.target;
    if (target.classList.contains("cancel-request-btn")) {
      target.disabled = true;
      target.textContent = "...";
      await denyRequest(target.dataset.requestId);
    }
    if (target.classList.contains("cancel-schedule-btn")) {
      target.disabled = true;
      target.textContent = "...";
      await cancelBooking("schedule", target.dataset.scheduleId);
    }
    if (target.classList.contains("cancel-recurring-btn")) {
      target.disabled = true;
      target.textContent = "...";
      await cancelBooking("recurring", target.dataset.recurringId);
    }
  });

  // --- INICIALIZAÇÃO REAL ---
  checkExistingLogin();
}); // Fim do DOMContentLoaded
