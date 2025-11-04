document.addEventListener("DOMContentLoaded", () => {
  // --- CONFIGURAÇÃO E DADOS ---
  const API_BASE_URL =
    "https://gerenciadorambientes.azurewebsites.net/api";
  const sectors = [
    {
      id: "salas",
      name: "Salas",
      icon: "📚",
      rooms: [
        { id: "sala_01", name: "Sala 01" },
        { id: "sala_02", name: "Sala 02" },
        { id: "sala_03", name: "Sala 03" },
        { id: "sala_04", name: "Sala 04" },
        { id: "sala_05", name: "Sala 05" },
        { id: "sala_06", name: "Sala 06 - Unid 2" },
        { id: "sala_07", name: "Sala 07 - Unid 2" },
        { id: "sala_08", name: "Sala 08 - Unid 2" },
      ],
    },
    {
      id: "laboratorios",
      name: "Laboratórios",
      icon: "🖥️",
      rooms: [
        { id: "lab_info_01", name: "Informática 01" },
        { id: "lab_info_02", name: "Informática 02" },
        { id: "lab_hidraulica", name: "Hidráulica" },
        { id: "lab_pneumatica", name: "Pneumática" },
        { id: "carrinho_notebook_01", name: "Notebooks 01 💻" },
        { id: "carrinho_notebook_02", name: "Notebooks 02 💻" },
      ],
    },
    {
      id: "usinagem",
      name: "Usinagem",
      icon: "⚙️",
      rooms: [
        { id: "ajustagem", name: "Ajustagem" },
        { id: "fresagem", name: "Fresagem" },
        { id: "metrologia", name: "Metrologia" },
        { id: "tornearia", name: "Tornearia" },
        { id: "soldagem", name: "Soldagem" },
        { id: "serralheria", name: "Serralheria" },
        { id: "centro_cnc", name: "Centro CNC 🖥️" },
        { id: "torno_cnc", name: "Torno CNC 🖥️" },
      ],
    },
    {
      id: "eletroeletronica",
      name: "Eletroeletrônica",
      icon: "⚡️",
      rooms: [
        { id: "eletronica_01", name: "Eletrônica 01 🖥️" },
        { id: "eletronica_02", name: "Eletrônica 02 🖥️" },
        { id: "automacao", name: "Automação" },
        { id: "clp", name: "CLP 🖥️" },
        { id: "predial_01", name: "Instalações Predial 01" },
        { id: "predial_02", name: "Instalações Predial 02" },
      ],
    },
    {
      id: "alimentos",
      name: "Plantas Alimentos",
      icon: "🥣",
      rooms: [
        { id: "panificacao", name: "Panificação" },
        { id: "biscoitos", name: "Biscoitos" },
        { id: "leites", name: "Leites" },
        { id: "carnes", name: "Carnes" },
        { id: "chocolates", name: "Chocolates" },
        { id: "lab_didatico", name: "Lab. Didático" },
      ],
    },
    {
      id: "mecanica",
      name: "Mecânica",
      icon: "🔧",
      rooms: [
        { id: "mec_suspensao", name: "Mec. de Suspensão" },
        { id: "mec_transmissao", name: "Mec. de Transmissão" },
        { id: "mec_motor", name: "Mec. de Motor" },
        { id: "injecao", name: "Eletronica Injeção" },
      ],
    },
  ];
  const periods = [
    { id: "manha_antes", name: "M. Antes Int." },
    { id: "manha_apos", name: "M. Após Int." },
    { id: "manha_todo", name: "Manhã Toda" },
    { id: "tarde_antes", name: "T. Antes Int." },
    { id: "tarde_apos", name: "T. Após Int." },
    { id: "tarde_todo", name: "Tarde Toda" },
    { id: "noite_antes", name: "N. Antes Int." },
    { id: "noite_apos", name: "N. Após Int." },
    { id: "noite_todo", name: "Noite Toda" },
  ];

  // --- ESTADO DA APLICAÇÃO ---
  let allSchedules = {};
  let allRecurring = [];
  let currentMonthDate = new Date();
  let currentSectorFilter = "all";

  // --- REFERÊNCIAS DO DOM ---
  const prevMonthBtn = document.getElementById("prev-month-btn");
  const nextMonthBtn = document.getElementById("next-month-btn");
  const monthYearDisplay = document.getElementById("month-year-display");
  const reportSubtitle = document.getElementById("report-subtitle");
  const calendarGrid = document.getElementById("calendar-grid");
  const loadingState = document.getElementById("loading-state");
  const errorState = document.getElementById("error-state");
  const printReportBtn = document.getElementById("print-report-btn");
  const sectorFilter = document.getElementById("sector-filter");
  const printAllContainer = document.getElementById("print-all-container");

  // --- FUNÇÕES DE UTILIDADE ---
  const formatDate = (date) => date.toISOString().split("T")[0];
  const getToken = () => localStorage.getItem("jwt_token");
  const getFirstName = (fullName) => (fullName || "").split(" ")[0];

  async function apiFetch(endpoint, options = {}) {
    // (Função apiFetch mantida, sem alterações)
    const token = getToken();
    if (!token) {
      errorState.innerHTML = `<p class="text-red-400 font-bold text-lg">Não autenticado.</p><p class="text-gray-400 mt-2">Faça login no sistema principal primeiro.</p><a href="index.html" class="mt-4 inline-block bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded text-sm">Ir para Login</a>`;
      errorState.style.display = "block";
      loadingState.style.display = "none";
      if (calendarGrid) calendarGrid.style.display = "none";
      throw new Error("Token não encontrado.");
    }
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
      if (response.status === 401) {
        localStorage.removeItem("jwt_token");
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      if (!response.ok) {
        const et = await response.text();
        throw new Error(
          `Falha (${response.status}): ${et || "Erro desconhecido"}`
        );
      }
      if (response.status === 204) return null;
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (err) {
      console.error(`Erro API (${endpoint}):`, err);
      throw err;
    }
  }

  function getConfirmedBookingForDate(roomId, date, periodId) {
    // (Função getConfirmedBookingForDate mantida, sem alterações)
    const dateKey = formatDate(date);
    const currentDate = new Date(dateKey + "T12:00:00Z");
    const dayOfWeek = currentDate.getUTCDay();
    const dayScheduleData = allSchedules[dateKey]?.[roomId]?.[periodId];
    if (dayScheduleData && !dayScheduleData.isBlocked) {
      return { prof: dayScheduleData.prof, turma: dayScheduleData.turma };
    }
    const recurring = allRecurring.find((r) => {
      if (r.roomId !== roomId || r.period !== periodId) return false;
      const startDate = new Date(r.startDate.split("T")[0] + "T12:00:00Z");
      const endDate = new Date(r.endDate.split("T")[0] + "T12:00:00Z");
      if (currentDate < startDate || currentDate > endDate) return false;
      if (r.type === "weekly") return r.daysOfWeek.includes(dayOfWeek);
      if (r.type === "daily")
        return !r.weekdaysOnly || (dayOfWeek >= 1 && dayOfWeek <= 5);
      return false;
    });
    if (recurring) {
      return { prof: recurring.prof, turma: recurring.turma };
    }
    return null;
  }

  // --- LÓGICA DO RELATÓRIO ---

  function populateSectorFilter() {
    if (!sectorFilter) return;
    let filterHtml = '<option value="all">Todos os Setores</option>';
    for (const sector of sectors) {
      filterHtml += `<option value="${sector.id}">${sector.icon} ${sector.name}</option>`;
    }
    sectorFilter.innerHTML = filterHtml;
  }

  function updateReportTitle() {
    if (!reportSubtitle || !sectorFilter) return;
    const selectedText =
      sectorFilter.options[sectorFilter.selectedIndex].text;
    const cleanText = selectedText
      .replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
        ""
      )
      .trim();
    reportSubtitle.textContent = cleanText;
  }

  async function loadReportData() {
    loadingState.style.display = "block";
    errorState.style.display = "none";
    if (calendarGrid) calendarGrid.style.display = "none";
    if (monthYearDisplay) monthYearDisplay.textContent = "Carregando Dados...";

    try {
      populateSectorFilter();
      document.body.classList.add("print-filter-all");

      const [schedulesData, recurringData] = await Promise.all([
        apiFetch("/Data/schedules"),
        apiFetch("/Data/recurring-schedules"),
      ]);
      allSchedules = schedulesData || {};
      allRecurring = recurringData || [];
      renderCalendar(
        currentMonthDate.getUTCFullYear(),
        currentMonthDate.getUTCMonth()
      );
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      loadingState.style.display = "none";
      errorState.style.display = "block";
      const errorMsgElement = errorState.querySelector("p:last-child");
      if (errorMsgElement)
        errorMsgElement.textContent = `Detalhes: ${error.message}`;
      if (monthYearDisplay) monthYearDisplay.textContent = "Erro";
    }
  }

  function generateCalendarGridHtml(year, month, sectorFilterId) {
    const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0));
    const daysInMonth = lastDayOfMonth.getUTCDate();
    const startDayOfWeek = firstDayOfMonth.getUTCDay();
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    let html = "";

    // Renderiza cabeçalho (agora usa a classe CSS .weekday-header)
    weekdays.forEach((day) => {
      html += `<div class="font-semibold weekday-header">${day}</div>`;
    });
    // Renderiza dias em branco
    for (let i = 0; i < startDayOfWeek; i++) {
      html += `<div class="calendar-day-cell other-month"></div>`;
    }

    // Renderiza dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(Date.UTC(year, month, day, 12));
      // MUDANÇA: .font-bold é classe, não tag
      let dayCellInnerHtml = `<div class="font-bold">${day}</div><div>`;
      let bookingsHtml = "";

      // --- LÓGICA DE FILTRAGEM (sem alteração) ---
      const sectorsToRender =
        sectorFilterId === "all"
          ? sectors
          : sectors.filter((s) => s.id === sectorFilterId);

      const dailyBookings = [];
      for (const sector of sectorsToRender) {
        for (const room of sector.rooms) {
          for (const period of periods) {
            const booking = getConfirmedBookingForDate(
              room.id,
              currentDate,
              period.id
            );
            if (booking) {
              dailyBookings.push({
                roomName: room.name,
                ...booking,
              });
            }
          }
        }
      }
      dailyBookings.sort((a, b) => a.roomName.localeCompare(b.roomName));

      for (const booking of dailyBookings) {
        bookingsHtml += `
          <div class="booking-item">
            ${booking.roomName} - 
            <span class="booking-item-prof">${getFirstName(
              booking.prof
            )}</span>
            <span class="booking-item-turma">(${
              booking.turma || "N/A"
            })</span>
          </div>
        `;
      }
      // --- FIM DA LÓGICA ---

      dayCellInnerHtml += bookingsHtml + "</div>";
      // MUDANÇA: removido bg-gray-900 (CSS de impressão cuida disso)
      html += `<div class="calendar-day-cell">${dayCellInnerHtml}</div>`;
    }

    // Renderiza dias em branco no final
    const totalCells = startDayOfWeek + daysInMonth;
    const remainingCells = 7 - (totalCells % 7);
    if (remainingCells < 7) {
      for (let i = 0; i < remainingCells; i++) {
        html += `<div class="calendar-day-cell other-month"></div>`;
      }
    }
    return html;
  }

  function renderAllSectorsForPrint(year, month) {
    if (!printAllContainer) return;
    let allHtml = "";
    const monthTitle = currentMonthDate.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    for (const sector of sectors) {
      const sectorName = sector.name;
      const gridHtml = generateCalendarGridHtml(year, month, sector.id);
      
      // MUDANÇA: O ID #calendar-grid é aplicado ao contêiner do grid
      allHtml += `
        <div class="print-page-container">
          <h2 class="print-title">${monthTitle}</h2>
          <h3 class="print-subtitle">${sectorName}</h3>
          <div id="calendar-grid">${gridHtml}</div>
        </div>
      `;
    }
    printAllContainer.innerHTML = allHtml;
  }

  /**
   * FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO (Modificada)
   */
  function renderCalendar(year, month) {
    if (!calendarGrid || !monthYearDisplay || !reportSubtitle) return;
    loadingState.style.display = "none";
    errorState.style.display = "none";
    
    // MUDANÇA: Adiciona classes do grid ao contêiner #calendar-grid
    // Isso corrige a visualização web
    calendarGrid.className = "grid grid-cols-7 text-center";
    calendarGrid.style.display = "grid"; // Garante que a classe 'hidden' seja sobreposta

    // 1. Atualiza Título e Subtítulo da view principal
    currentMonthDate = new Date(Date.UTC(year, month, 1));
    monthYearDisplay.textContent = currentMonthDate.toLocaleDateString(
      "pt-BR",
      { month: "long", year: "numeric", timeZone: "UTC" }
    );
    updateReportTitle();

    // 2. Renderiza o grid da view principal (usando o filtro atual)
    calendarGrid.innerHTML = generateCalendarGridHtml(
      year,
      month,
      currentSectorFilter
    );

    // 3. Pré-renderiza todos os setores para a impressão (em segundo plano)
    renderAllSectorsForPrint(year, month);
  }

  function changeMonth(amount) {
    currentMonthDate.setUTCMonth(currentMonthDate.getUTCMonth() + amount);
    renderCalendar(
      currentMonthDate.getUTCFullYear(),
      currentMonthDate.getUTCMonth()
    );
  }

  // --- EVENT LISTENERS ---
  if (prevMonthBtn) prevMonthBtn.onclick = () => changeMonth(-1);
  if (nextMonthBtn) nextMonthBtn.onclick = () => changeMonth(1);

  if (printReportBtn) {
    printReportBtn.onclick = () => {
      window.print();
    };
  }

  if (sectorFilter) {
    sectorFilter.onchange = () => {
      currentSectorFilter = sectorFilter.value;
      
      // Adiciona/Remove a classe do <body> para o CSS de impressão
      document.body.classList.remove("print-filter-all", "print-filter-specific");
      if (currentSectorFilter === "all") {
        document.body.classList.add("print-filter-all");
      } else {
        document.body.classList.add("print-filter-specific");
      }
      
      // Apenas re-renderiza.
      renderCalendar(
        currentMonthDate.getUTCFullYear(),
        currentMonthDate.getUTCMonth()
      );
    };
  }

  // --- INICIALIZAÇÃO ---
  loadReportData();
});