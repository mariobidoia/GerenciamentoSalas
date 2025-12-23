// URL Base da sua API
const API_BASE_URL = 'https://localhost:7001';

// --- Variáveis Globais de Estado ---
let currentTheme = 'light';
let currentDate = new Date();
let selectedDate = null;
let currentView = 'calendar';
let expandedCategories = new Set();
let selectedAmbienteFilter = ''; // Filtro global de ambiente
let currentUser = null; 
let isConflictActive = false;

// --- Cache de Dados ---
let allSchedules = {}; 
let allRecurringSchedules = []; 
let allMyRequests = [];
let allMySchedules = [];
let allMyRecurringSchedules = [];
let allCoordinatorRequests = [];
let allCategorias = [];
let allAmbientesMap = new Map(); 
let allPendingRequests = []; 

// --- Constantes de UI ---
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Dicionário para traduzir códigos antigos se ainda existirem no DB
// Para novos agendamentos, o "period" será uma string de horário (ex: "08:00 - 10:00")
const PERIOD_NAMES = {
  "manha_todo": "07:00 - 12:20",
  "manha_antes": "07:00 - 09:30",
  "manha_apos": "09:50 - 12:20",
  "tarde_todo": "13:00 - 18:20",
  "tarde_antes": "13:00 - 15:30",
  "tarde_apos": "15:50 - 18:20",
  "noite_todo": "19:00 - 22:40",
  "noite_antes": "19:00 - 20:40",
  "noite_apos": "21:00 - 22:40",
};

// --- Função Auxiliar: Formata Período ---
function formatPeriodString(startStr, endStr) {
    if (!startStr || !endStr) return null;
    if (startStr >= endStr) return null; // Validação básica
    return `${startStr} - ${endStr}`;
}

// --- Função Auxiliar: Verifica Sobreposição de Horários (Frontend) ---
function isTimeOverlap(periodA, periodB) {
    // Helper para converter "HH:mm" em minutos
    const toMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    // Helper para extrair inicio e fim de uma string "HH:mm - HH:mm"
    const getRange = (periodStr) => {
        // Tenta formato novo "HH:mm - HH:mm"
        if (periodStr.includes('-')) {
            const parts = periodStr.split('-').map(s => s.trim());
            if (parts.length === 2) {
                return { start: toMinutes(parts[0]), end: toMinutes(parts[1]) };
            }
        }
        // Fallback para códigos antigos (estimativa)
        if (PERIOD_NAMES[periodStr]) {
             const parts = PERIOD_NAMES[periodStr].split('-').map(s => s.trim());
             return { start: toMinutes(parts[0]), end: toMinutes(parts[1]) };
        }
        return null;
    };

    const rangeA = getRange(periodA);
    const rangeB = getRange(periodB);

    if (!rangeA || !rangeB) return false;

    // Lógica de Overlap: (StartA < EndB) && (EndA > StartB)
    return (rangeA.start < rangeB.end) && (rangeA.end > rangeB.start);
}

// --- Função Auxiliar: Retorna o Intervalo do Turno Atual ---
function getCurrentShiftInterval() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Definição dos Turnos (em minutos)
    // Manhã: 07:30 (450) - 11:30 (690)
    const morningStart = 7 * 60 + 30;
    const morningEnd = 11 * 60 + 30;

    // Tarde: 13:30 (810) - 17:30 (1050)
    const afternoonStart = 13 * 60 + 30;
    const afternoonEnd = 17 * 60 + 30;

    // Noite: 18:30 (1110) - 22:30 (1350)
    const nightStart = 18 * 60 + 30;
    const nightEnd = 22 * 60 + 30;

    if (currentMinutes >= morningStart && currentMinutes < morningEnd) {
        return "07:30 - 11:30";
    }
    if (currentMinutes >= afternoonStart && currentMinutes < afternoonEnd) {
        return "13:30 - 17:30";
    }
    if (currentMinutes >= nightStart && currentMinutes < nightEnd) {
        return "18:30 - 22:30";
    }

    return null; // Fora de turno (ex: meio-dia, madrugada)
}
// --------------------------------------------------------


document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  const savedUser = localStorage.getItem('currentUser');
  
  if (!savedUser) {
    showLoginScreen();
    setupLoginListeners();
    return;
  }

  try {
    currentUser = JSON.parse(savedUser);
    if (!currentUser || !currentUser.token || !currentUser.fullName || !currentUser.id) { 
      throw new Error("Usuário salvo inválido.");
    }
    
    showMainApp();
    setupEventListeners();
    await loadCategoriasEAmbientes();
    await loadAllData();
    
    const today = new Date();
    currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
    selectedDate = today;
    
    renderAll();
    
  } catch (error) {
    console.error("Falha ao inicializar:", error);
    handleLogout(); 
  }
}

function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-container').style.display = 'none';
}

function showMainApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-container').style.display = 'grid';
  document.getElementById('user-name').textContent = `👤 ${currentUser.fullName}`;
  
  const isCoordinator = currentUser.roles.includes('Coordenador');
  
  document.querySelectorAll('.coord-only').forEach(el => {
    if (el.classList.contains('view')) return; 
    if (el.classList.contains('nav-btn')) {
      el.style.display = isCoordinator ? 'flex' : 'none';
    } else {
      el.style.display = isCoordinator ? '' : 'none';
    }
  });

  document.querySelectorAll('.prof-only').forEach(el => {
    if (el.classList.contains('view')) return;
    if (el.classList.contains('nav-btn')) {
      el.style.display = isCoordinator ? 'none' : 'flex';
    } else {
      el.style.display = isCoordinator ? 'none' : '';
    }
  });
  
  const allRequestsNav = document.querySelector('.nav-btn[data-view="all-requests"]');
  if (allRequestsNav) {
      allRequestsNav.style.display = isCoordinator ? 'flex' : 'none';
  }
}

function setupLoginListeners() {
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
}

function setupEventListeners() {
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  document.getElementById('ambiente-filter')?.addEventListener('change', handleAmbienteFilterChange);
  
  document.getElementById('new-reservation-btn')?.addEventListener('click', () => {
      openNewReservationModal(null, null, selectedAmbienteFilter);
  });

  document.getElementById('prev-month')?.addEventListener('click', () => navigateMonth(-1));
  document.getElementById('next-month')?.addEventListener('click', () => navigateMonth(1));
  document.getElementById('today-btn')?.addEventListener('click', goToToday);

  document.getElementById('reservation-form')?.addEventListener('submit', handleRequestSubmit);
  document.getElementById('categoria')?.addEventListener('change', handleCategoryChange);
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchReservationTab(btn.dataset.tab));
  });
  
  document.getElementById('recorrencia-tipo')?.addEventListener('change', toggleRecurrenceOptions);
  document.getElementById('weekdays-only')?.addEventListener('change', updateConflictPreview);
  
  document.querySelectorAll('.close-btn, #confirm-btn-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modalToClose = e.target.closest('.modal');
        if (modalToClose) {
            closeModalById(modalToClose.id);
        }
    });
  });
  
  document.getElementById('change-password-form')?.addEventListener('submit', handleChangePassword);

  // Listeners para verificar conflitos em tempo real
    const conflictTriggers = [
        '#ambiente', 
        '#hora-inicio', 
        '#hora-fim',
        '#data', // Gatilho para data única
        '#recorrencia-inicio', 
        '#recorrencia-fim', 
        '#recorrencia-tipo',
        '#weekdays-only'
    ];
    
    conflictTriggers.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) el.addEventListener('change', updateConflictPreview);
    });

    document.querySelectorAll('input[name="dayOfWeek"]').forEach(cb => {
        cb.addEventListener('change', updateConflictPreview);
    });
}

// --- Variáveis para Modais de Conflito (Coordenador) ---
  const conflictErrorModal = document.getElementById("conflict-error-modal");
  const conflictErrorMessage = document.getElementById("conflict-error-message");
  const closeConflictModalBtn = document.getElementById("close-conflict-modal-btn");
  const conflictDenyBtn = document.getElementById("conflict-deny-btn");
  const conflictApproveSkipBtn = document.getElementById("conflict-approve-skip-btn");
  const conflictApproveForceBtn = document.getElementById("conflict-approve-force-btn");

  let state = {
    currentUserRole: null,
    currentUserName: "",
    currentUserId: null,
    selectedRoomId: null,
    currentDate: new Date(),
    viewMode: "daily",
    conflictingRequestId: null,
  };

async function handleLogin(e) {
  e.preventDefault();
  const nif = document.getElementById('login-nif').value;
  const password = document.getElementById('login-senha').value;
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  btn.disabled = true;
  btn.textContent = 'Entrando...';
  errorEl.style.display = 'none';

  try {
    const response = await fetch(`${API_BASE_URL}/api/Auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nif, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'NIF ou senha inválidos');
    }

    currentUser = {
      token: data.token, id: data.id, fullName: data.fullName, roles: data.roles || [], mustChangePassword: data.mustChangePassword
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    if (data.mustChangePassword) {
        showMainApp(); 
        setupEventListeners(); 
        openModalById('change-password-modal'); 
        showToast("Você deve alterar sua senha antes de continuar.", "warning");
    } else {
        showMainApp();
        setupEventListeners();
        await loadCategoriasEAmbientes();
        await loadAllData();
        
        const today = new Date();
        currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
        selectedDate = today;
        
        renderAll();
    }

  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
}

function handleLogout() {
  localStorage.removeItem('currentUser');
  currentUser = null;
  allSchedules = {}; allRecurringSchedules = []; allMyRequests = []; allMySchedules = [];
  allMyRecurringSchedules = []; allCoordinatorRequests = []; allCategorias = []; allAmbientesMap.clear();
  selectedDate = null; selectedAmbienteFilter = '';
  showLoginScreen();
  document.getElementById('logout-btn')?.removeEventListener('click', handleLogout);
  setupLoginListeners();
}

async function handleChangePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('cp-current-password').value;
    const newPassword = document.getElementById('cp-new-password').value;
    const confirmPassword = document.getElementById('cp-confirm-password').value;
    const errorEl = document.getElementById('cp-error');
    const btn = document.getElementById('cp-submit-btn');

    if (newPassword !== confirmPassword) {
        errorEl.textContent = "As novas senhas não coincidem.";
        errorEl.style.display = 'block';
        return;
    }

    btn.disabled = true; btn.textContent = 'Alterando...'; errorEl.style.display = 'none';

    try {
        const response = await apiFetch('/api/Auth/change-password', {
            method: 'POST', body: JSON.stringify({ currentPassword, newPassword })
        });

        if (!response.ok) {
            const errorData = await response.json();
            let errorMessage = "Erro ao alterar senha.";
            if (errorData && errorData.errors) errorMessage = errorData.errors.map(err => err.description || err.code).join(' ');
            else if (response.status === 400 && errorData.message) errorMessage = errorData.message;
            throw new Error(errorMessage);
        }
        showToast("Senha alterada com sucesso!");
        closeModalById('change-password-modal');
        if (currentUser.mustChangePassword) {
            currentUser.mustChangePassword = false;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            await loadCategoriasEAmbientes();
            await loadAllData();
            const today = new Date();
            currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
            selectedDate = today;
            renderAll();
        }
    } catch (error) {
        errorEl.textContent = error.message; errorEl.style.display = 'block';
    } finally {
        btn.disabled = false; btn.textContent = 'Alterar Senha';
        document.getElementById('change-password-form').reset();
    }
}


// --- Lógica de Navegação e UI ---

function switchView(viewName) {
  if (currentUser && currentUser.mustChangePassword) {
      showToast("Você deve alterar sua senha para navegar.", "warning");
      openModalById('change-password-modal');
      return;
  }
  currentView = viewName;
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
  document.querySelectorAll('.view').forEach(view => {
    view.classList.toggle('active', view.id === `${viewName}-view`);
  });

  switch (viewName) {
    case 'calendar':
      renderCalendar();
      renderDaySummary(selectedDate);
      break;
    case 'categories':
      renderCategoriesGrid();
      break;
    case 'requests':
      renderMyRequests();
      break;
    case 'my-schedules':
      renderMySchedules();
      renderMyRecurringSchedules();
      break;
    case 'all-requests':
      if (currentUser.roles.includes('Coordenador')) renderCoordinatorRequests();
      break;
  }
}

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.body.className = `${currentTheme}-theme`;
  const icon = document.getElementById('theme-icon');
  const text = document.getElementById('theme-text');
  if (currentTheme === 'dark') { icon.textContent = '☀️'; text.textContent = 'Claro'; } 
  else { icon.textContent = '🌙'; text.textContent = 'Escuro'; }
}

function openModalById(modalId) { document.getElementById(modalId)?.classList.add('active'); }
function closeModalById(modalId) { document.getElementById(modalId)?.classList.remove('active'); }

function showToast(message, type = 'success', duration = 3000) {
  const existing = document.querySelector('.inline-message');
  if (existing) existing.remove();
  const messageEl = document.createElement('div');
  messageEl.className = `inline-message ${type}`;
  messageEl.textContent = message;
  document.body.appendChild(messageEl);
  setTimeout(() => {
    messageEl.style.opacity = '0';
    setTimeout(() => messageEl.remove(), 300); 
  }, duration);
}

// --- Lógica de Comunicação com API ---

async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers, };
  if (currentUser && currentUser.token) headers['Authorization'] = `Bearer ${currentUser.token}`;
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  if (response.status === 401) {
    showToast("Sua sessão expirou. Por favor, faça login novamente.", "error");
    handleLogout();
    throw new Error('Não autorizado');
  }
  return response;
}

// --- Carregamento e Cache de Dados ---

async function loadCategoriasEAmbientes() {
  try {
    const response = await apiFetch('/api/Data/categorias');
    if (!response.ok) throw new Error('Falha ao buscar categorias');
    allCategorias = await response.json();
    allAmbientesMap.clear();
    allCategorias.forEach(cat => {
      cat.ambientes.forEach(amb => {
        allAmbientesMap.set(amb.id, {
          nome: amb.nome, categoriaId: cat.id, categoriaNome: cat.nome, icon: cat.icon
        });
      });
    });
  } catch (error) {
    console.error("Erro ao carregar categorias:", error);
  }
}

async function loadAllData() {
  document.getElementById('categories-sidebar').innerHTML = '<div class="loading-spinner"></div>';
  document.getElementById('categories-grid').innerHTML = '<div class="loading-spinner"></div>';
  if (currentUser && currentUser.mustChangePassword) return;
  
  const isCoordinator = currentUser.roles.includes('Coordenador');
  try {
    const endpoints = [
      '/api/Data/schedules', '/api/Data/recurring-schedules', '/api/Data/my-requests',
      '/api/Data/my-schedules', '/api/Data/my-recurring-schedules', '/api/Data/requests'
    ];
    const responses = await Promise.all(endpoints.map(ep => apiFetch(ep)));
    for(const res of responses) { if (!res.ok) throw new Error(`Falha ao carregar dados.`); }
    const [ schedulesData, recurringData, myRequestsData, mySchedulesData, myRecurringSchedulesData, allRequestsData ] = await Promise.all(responses.map(res => res.json()));

    allSchedules = schedulesData; 
    allRecurringSchedules = recurringData; 
    allMyRequests = myRequestsData;
    allMySchedules = mySchedulesData;
    allMyRecurringSchedules = myRecurringSchedulesData;
    allPendingRequests = allRequestsData || [];
    allCoordinatorRequests = isCoordinator ? allRequestsData : [];
    
    applyAmbienteFilter(); 
  } catch (error) {
    console.error("Falha ao inicializar dados:", error);
    if (error.message !== 'Não autorizado') showToast(error.message, "error");
  }
}

function handleAmbienteFilterChange(e) {
  selectedAmbienteFilter = e.target.value;
  applyAmbienteFilter();
}

function applyAmbienteFilter() { renderAll(); }

// --- Renderização (Funções Principais) ---

function renderAll() {
  if (currentUser && currentUser.mustChangePassword) return;
  renderCategoriesSidebar(); renderCategoriesGrid();
  switch (currentView) {
    case 'calendar': renderCalendar(); renderDaySummary(selectedDate); break;
    case 'categories': break;
    case 'requests': renderMyRequests(); break;
    case 'my-schedules': renderMySchedules(); renderMyRecurringSchedules(); break;
    case 'all-requests': if (currentUser.roles.includes('Coordenador')) renderCoordinatorRequests(); break;
  }
  populateAmbienteFilterSelect(); updateNavigationBadges();
}

function updateNavigationBadges() {
  const allRequestsBtn = document.querySelector('.nav-btn[data-view="all-requests"]');
  if (allRequestsBtn) {
    const existingBadge = allRequestsBtn.querySelector('.nav-btn-badge');
    if (existingBadge) existingBadge.remove();
    const isCoordinator = currentUser && currentUser.roles.includes('Coordenador');
    const count = allCoordinatorRequests.length;
    if (isCoordinator && count > 0) {
      const badge = document.createElement('span');
      badge.className = 'nav-btn-badge';
      badge.textContent = count;
      allRequestsBtn.appendChild(badge);
    }
  }
}

function populateAmbienteFilterSelect() {
  const filterSelect = document.getElementById('ambiente-filter');
  if (!filterSelect) return;
  filterSelect.innerHTML = '<option value="">Todos os Ambientes</option>';
  allCategorias.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(cat => {
    const optGroup = document.createElement('optgroup');
    optGroup.label = `${cat.icon} ${cat.nome}`;
    cat.ambientes.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(amb => {
      const option = document.createElement('option');
      option.value = amb.id; option.textContent = amb.nome;
      optGroup.appendChild(option);
    });
    filterSelect.appendChild(optGroup);
  });
  filterSelect.value = selectedAmbienteFilter;
}

function renderCategoriesSidebar() {
  const container = document.getElementById('categories-sidebar');
  if (!container) return;
  container.innerHTML = '';
  if (allCategorias.length === 0) { container.innerHTML = '<div class="empty-state-text">Nenhuma categoria.</div>'; return; }

  const allItem = document.createElement('div');
  allItem.className = 'category-item all-ambientes-item';
  if (selectedAmbienteFilter === '') allItem.classList.add('active');
  allItem.innerHTML = `<div class="category-header"><div class="category-name">🏢 Todos os Ambientes</div></div>`;
  allItem.addEventListener('click', () => {
      selectedAmbienteFilter = '';
      const filterSelect = document.getElementById('ambiente-filter');
      if (filterSelect) filterSelect.value = '';
      applyAmbienteFilter(); 
  });
  container.appendChild(allItem);

  allCategorias.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(categoria => {
    const isExpanded = expandedCategories.has(categoria.id);
    const item = document.createElement('div');
    item.className = 'category-item';
    item.innerHTML = `<div class="category-header"><div class="category-name">${categoria.nome}<span class="dropdown-arrow ${isExpanded ? 'expanded' : ''}">▼</span></div></div>`;
    const ambientesList = document.createElement('div');
    ambientesList.className = `ambientes-list ${isExpanded ? 'expanded' : 'collapsed'}`;
    if (isExpanded) {
      if (categoria.ambientes.length > 0) {
          categoria.ambientes.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(ambiente => {
            const ambienteItem = document.createElement('div');
            ambienteItem.className = `ambiente-item ${selectedAmbienteFilter === ambiente.id ? 'active' : ''}`;
            ambienteItem.innerHTML = `<span class="ambiente-name">${ambiente.nome}</span>`;
            ambienteItem.addEventListener('click', (e) => {
              e.stopPropagation(); selectedAmbienteFilter = ambiente.id;
              document.getElementById('ambiente-filter').value = ambiente.id;
              applyAmbienteFilter(); switchView('calendar');
            });
            ambientesList.appendChild(ambienteItem);
          });
      } else { ambientesList.innerHTML = `<div class="ambiente-item-empty">Nenhum ambiente</div>`; }
    }
    item.appendChild(ambientesList);
    item.addEventListener('click', () => {
      if (expandedCategories.has(categoria.id)) expandedCategories.delete(categoria.id); else expandedCategories.add(categoria.id);
      renderCategoriesSidebar(); 
    });
    container.appendChild(item);
  });
}

function renderCategoriesGrid() {
  const grid = document.getElementById('categories-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  if (allCategorias.length === 0) {
      grid.innerHTML = '<div class="loading-spinner"></div>';
      return;
  }

  // --- LÓGICA DE DISPONIBILIDADE (ATUALIZADA) ---
  const currentShiftInterval = getCurrentShiftInterval(); // ex: "13:30 - 17:30"
  
  // Data de HOJE considerando FUSO
  const now = new Date();
  const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
                    .toISOString().split('T')[0];
  
  const todaySchedules = allSchedules[todayStr] || {};
  // --- FIM DA LÓGICA DE DISPONIBILIDADE ---

  allCategorias.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(categoria => {
    const card = document.createElement('div');
    card.className = 'category-card';

    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `
      <div class="category-name">${categoria.nome}</div>
    `;

    const ambientesList = document.createElement('div');
    ambientesList.style.marginTop = '16px';
    ambientesList.classList.add('ambientes-grid-list');

    if (categoria.ambientes.length > 0) {
        categoria.ambientes.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(ambiente => {
          
          // --- VERIFICAÇÃO DE STATUS ---
          let roomSchedulesToday = todaySchedules[ambiente.id];
          if (!roomSchedulesToday) {
             roomSchedulesToday = todaySchedules[ambiente.nome] || {};
          }

          let isOcupado = false;
          let statusText = "Disponível";
          
          if (currentShiftInterval) {
              // Se estamos num turno ativo, verifica conflito de horário
              // Itera sobre todos os agendamentos do ambiente para o dia de hoje
              const periodsBooked = Object.keys(roomSchedulesToday);
              
              isOcupado = periodsBooked.some(bookedPeriod => {
                  return isTimeOverlap(currentShiftInterval, bookedPeriod);
              });
              
              if (isOcupado) {
                  statusText = "Ocupado Agora";
              } else {
                  statusText = "Disponível Agora";
              }
          } else {
              // Fora de turno (ex: 12:30, 23:00)
              statusText = "Fora de Turno";
          }
          // --- FIM DA VERIFICAÇÃO ---

          const item = document.createElement('div');
          item.className = `ambiente-item-grid ${selectedAmbienteFilter == ambiente.id ? 'active' : ''}`;
          
          let statusClass = 'disponivel';
          if (isOcupado) statusClass = 'ocupado';
          if (!currentShiftInterval) statusClass = 'neutral'; // Classe nova para 'Fora de Turno' se quiser estilizar (cinza)

          item.innerHTML = `
            <div>
                <span class="ambiente-name">${ambiente.nome}</span>
            </div>
            <div class="ambiente-status-tag ${statusClass}">
                <span class="status-dot"></span>
                ${statusText}
            </div>
          `;

          item.addEventListener('click', () => {
              selectedAmbienteFilter = ambiente.id;
              const filterSelect = document.getElementById('ambiente-filter');
              if (filterSelect) filterSelect.value = ambiente.id;
              applyAmbienteFilter(); switchView('calendar');
          });
          ambientesList.appendChild(item);
        });
    } else {
        ambientesList.innerHTML = `<div class="ambiente-item-empty">Nenhum ambiente nesta categoria.</div>`;
    }

    card.appendChild(header);
    card.appendChild(ambientesList);
    grid.appendChild(card);
  });
}

// --- Lógica do Modal de Reserva ---

function openNewReservationModal(dateStr = null, categoriaId = null, ambienteId = null) {
  const modal = document.getElementById('reservation-modal');
  modal.querySelector('.modal-title').textContent = 'Nova Solicitação';
  
  document.getElementById('categoria-form-group').style.display = 'none';
  document.getElementById('reservation-form').reset();
  document.getElementById('request-id').value = ''; 
  isConflictActive = false;
  showFormError(null);
  document.getElementById('conflict-preview').style.display = 'none';
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = false;
  document.getElementById('submit-btn-text').textContent = 'Enviar Solicitação';
  document.getElementById('submit-btn-loading').style.display = 'none';

  switchReservationTab('unica');
  
  let dateToUse = dateStr ? dateStr : (selectedDate || new Date()).toISOString().split('T')[0];
  document.getElementById('data').value = dateToUse;
  document.getElementById('recorrencia-inicio').value = dateToUse;
  document.getElementById('recorrencia-fim').value = '';
  
  // PROTEÇÃO CONTRA ERRO DE ELEMENTO NULO
  const horaInicioInput = document.getElementById('hora-inicio');
  const horaFimInput = document.getElementById('hora-fim');
  if (horaInicioInput) horaInicioInput.value = '';
  if (horaFimInput) horaFimInput.value = '';

  let finalCategoriaId = categoriaId;
  let finalAmbienteId = ambienteId;
  if (finalAmbienteId && !finalCategoriaId) {
      const ambDetails = allAmbientesMap.get(finalAmbienteId);
      if (ambDetails) finalCategoriaId = ambDetails.categoriaId;
  }
  
  populateModalAmbienteSelect(finalAmbienteId);
  openModalById('reservation-modal');
}

function handleCategoryChange() {
  const categoriaId = document.getElementById('categoria').value;
  const ambienteSelect = document.getElementById('ambiente');
  ambienteSelect.innerHTML = '<option value="">Selecione o ambiente</option>';
  if (categoriaId) {
    const categoria = allCategorias.find(c => c.id === categoriaId);
    if (categoria && categoria.ambientes) {
      categoria.ambientes.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(ambiente => {
        const option = document.createElement('option');
        option.value = ambiente.id; option.textContent = ambiente.nome;
        ambienteSelect.appendChild(option);
      });
    }
  }
}

function switchReservationTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });
  const isRecurring = (tabName === 'recorrente');
  document.getElementById('data').required = !isRecurring;
  document.getElementById('recorrencia-inicio').required = isRecurring;
  document.getElementById('recorrencia-fim').required = isRecurring;
  toggleRecurrenceOptions();
}

function toggleRecurrenceOptions() {
    const tipo = document.getElementById('recorrencia-tipo').value;
    const isRecurring = document.getElementById('tab-recorrente').classList.contains('active');
    document.getElementById('dias-semana-group').style.display = (isRecurring && tipo === 'weekly') ? 'block' : 'none';
    document.getElementById('weekdays-only-group').style.display = (isRecurring && tipo === 'daily') ? 'block' : 'none';
}

function showFormError(message) {
    const errorEl = document.getElementById('conflict-preview');
    const contentEl = document.getElementById('conflict-content');
    if (!message) { errorEl.style.display = 'none'; contentEl.innerHTML = ''; return; }
    errorEl.style.display = 'block';
    errorEl.classList.remove('success'); errorEl.classList.remove('warning');
    contentEl.innerHTML = `<strong class="text-danger">Erro:</strong> ${message}`;
}

async function handleRequestSubmit(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  document.getElementById('submit-btn-text').textContent = 'Enviando...';
  document.getElementById('submit-btn-loading').style.display = 'inline-block';
  showFormError(null);

  const isRecurring = document.getElementById('tab-recorrente').classList.contains('active');
  const ambienteId = document.getElementById('ambiente').value;
  const justification = document.getElementById('justification').value;

  // --- Lógica de Período baseada em Horas ---
  const horaInicioInput = document.getElementById('hora-inicio');
  const horaFimInput = document.getElementById('hora-fim');
  
  if (!horaInicioInput || !horaFimInput) {
      showFormError("Erro interno: Campos de horário não encontrados.");
      resetSubmitBtn(); return;
  }

  const horaInicio = horaInicioInput.value;
  const horaFim = horaFimInput.value;
  
  if (!horaInicio || !horaFim) {
      showFormError("Informe a hora de início e fim.");
      resetSubmitBtn(); return;
  }

  // AGORA ENVIAMOS A STRING FORMATADA "HH:mm - HH:mm"
  const periodoCalculado = formatPeriodString(horaInicio, horaFim);
  if (!periodoCalculado) {
      showFormError("Horário final deve ser maior que o inicial.");
      resetSubmitBtn(); return;
  }

  if (isConflictActive && (!justification || justification.trim() === '')) {
      showToast("Devido ao conflito de horário, você deve fornecer uma justificativa.", "warning");
      const justInput = document.getElementById('justification');
      justInput.focus(); justInput.style.borderColor = "var(--danger-color)";
      resetSubmitBtn(); return;
  }

  const payload = {
    id: 0, roomId: ambienteId, turma: document.getElementById('turma').value,
    period: periodoCalculado, // Periodo agora é "08:00 - 12:00"
    justification: document.getElementById('justification').value || null,
    isRecurring: isRecurring
  };

  if (isRecurring) {
    payload.type = document.getElementById('recorrencia-tipo').value;
    payload.startDate = document.getElementById('recorrencia-inicio').value;
    payload.endDate = document.getElementById('recorrencia-fim').value;
    if (payload.type === 'weekly') {
      const days = Array.from(document.querySelectorAll('[name="dayOfWeek"]:checked')).map(cb => cb.value);
      if (days.length === 0) { showFormError("Selecione pelo menos um dia."); resetSubmitBtn(); return; }
      payload.daysOfWeek = days.join(','); payload.weekdaysOnly = null;
    } else { 
      payload.daysOfWeek = null; payload.weekdaysOnly = document.getElementById('weekdays-only').checked;
    }
    if (!payload.startDate || !payload.endDate) { showFormError("Datas obrigatórias."); resetSubmitBtn(); return; }
    if (new Date(payload.endDate) < new Date(payload.startDate)) { showFormError("Data final inválida."); resetSubmitBtn(); return; }
  } else { 
    payload.date = document.getElementById('data').value;
    payload.type = null; payload.startDate = null; payload.endDate = null; payload.daysOfWeek = null; payload.weekdaysOnly = null;
    if (!payload.date) { showFormError("Data obrigatória."); resetSubmitBtn(); return; }
  }
  
  if (!payload.roomId || !payload.period || !payload.turma) { showFormError("Campos obrigatórios ausentes."); resetSubmitBtn(); return; }

  try {
    const response = await apiFetch('/api/Data/requests', { method: 'POST', body: JSON.stringify(payload) });
    if (!response.ok) {
      const errorData = await response.json(); throw new Error(errorData.message || 'Falha ao enviar solicitação');
    }
    showToast("Solicitação enviada com sucesso!");
    closeModalById('reservation-modal');
    await loadAllData(); renderAll(); 
  } catch (error) {
    console.error("Erro:", error); showFormError(error.message);
  } finally {
    resetSubmitBtn();
  }
}

function resetSubmitBtn() {
    const submitBtn = document.getElementById('submit-btn');
    if (!submitBtn) return;
    submitBtn.disabled = false;
    document.getElementById('submit-btn-text').textContent = 'Enviar Solicitação';
    document.getElementById('submit-btn-loading').style.display = 'none';
}

function populateModalAmbienteSelect(selectedId = null) {
  const select = document.getElementById('ambiente');
  select.innerHTML = '<option value="">Selecione o ambiente</option>';
  allCategorias.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(cat => {
    const group = document.createElement('optgroup'); group.label = `${cat.icon || ''} ${cat.nome}`;
    cat.ambientes.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(amb => {
      const option = document.createElement('option'); option.value = amb.id; option.textContent = amb.nome;
      if (amb.id == selectedId) option.selected = true;
      group.appendChild(option);
    });
    select.appendChild(group);
  });
}

// --- Lógica de Conflito (Frontend) ---

let conflictCheckTimer = null;

function updateConflictPreview() {
    clearTimeout(conflictCheckTimer);
    conflictCheckTimer = setTimeout(async () => {
        
        const previewEl = document.getElementById('conflict-preview');
        const contentEl = document.getElementById('conflict-content');
        const justificationLabel = document.querySelector('label[for="justification"]');
        const isRecurring = document.getElementById('tab-recorrente').classList.contains('active');
        
        const ambienteId = document.getElementById('ambiente').value;
        const horaInicioInput = document.getElementById('hora-inicio');
        const horaFimInput = document.getElementById('hora-fim');
        
        // Verifica se elementos existem e valores estão preenchidos
        if (!horaInicioInput || !horaFimInput || !ambienteId) { 
            previewEl.style.display = 'none'; 
            return; 
        }

        const horaInicio = horaInicioInput.value;
        const horaFim = horaFimInput.value;
        
        if (!horaInicio || !horaFim) { 
            previewEl.style.display = 'none'; 
            return; 
        }

        const periodo = formatPeriodString(horaInicio, horaFim);
        if (!periodo) { 
            previewEl.style.display = 'none'; 
            return; 
        }

        // Monta payload
        const checkPayload = {
            roomId: ambienteId,
            period: periodo,
            isRecurring: isRecurring,
            startDate: null,
            endDate: null,
            type: null,
            daysOfWeek: null,
            weekdaysOnly: false,
            date: null,
            turma: document.getElementById('turma').value
        };

        if (isRecurring) {
            checkPayload.startDate = document.getElementById('recorrencia-inicio').value;
            checkPayload.endDate = document.getElementById('recorrencia-fim').value;
            checkPayload.type = document.getElementById('recorrencia-tipo').value;
            checkPayload.weekdaysOnly = document.getElementById('weekdays-only').checked;

            if (checkPayload.type === 'weekly') {
                const days = Array.from(document.querySelectorAll('[name="dayOfWeek"]:checked')).map(cb => cb.value);
                
                // Se for semanal mas não selecionou dias, esconde o preview e sai
                if (days.length === 0) {
                    previewEl.style.display = 'none';
                    return; 
                }
                checkPayload.daysOfWeek = days.join(',');
                checkPayload.weekdaysOnly = null;
            } else {
                checkPayload.daysOfWeek = null;
            }

            if (!checkPayload.startDate || !checkPayload.endDate) {
                previewEl.style.display = 'none';
                return;
            }
        } else {
            // Data Única
            checkPayload.date = document.getElementById('data').value;
            if (!checkPayload.date) {
                previewEl.style.display = 'none';
                return;
            }
        }

        // Exibe "Carregando..."
        previewEl.style.display = 'block';
        previewEl.className = 'recurrence-preview'; 
        contentEl.innerHTML = `<span class="loading-inline"></span> Verificando disponibilidade...`;
        
        const { hasConflict, message } = await checkConflictsForRequest(checkPayload);
        
        if (hasConflict) {
            isConflictActive = true;
            previewEl.classList.add('warning');
            previewEl.classList.remove('success');
            
            contentEl.innerHTML = `
                <strong class="text-danger">⚠️ Atenção:</strong> ${message}
                <div style="margin-top:8px; font-size: 0.9em; color: var(--text-primary);">
                    Para prosseguir, é <strong>obrigatório</strong> informar uma justificativa.
                </div>
            `;
            
            if (justificationLabel) {
                justificationLabel.innerHTML = 'Justificativa <span class="text-danger">* (Obrigatório devido ao conflito)</span>';
            }
            
        } else {
            isConflictActive = false;
            previewEl.classList.add('success');
            previewEl.classList.remove('warning');
            
            contentEl.innerHTML = `<strong class="text-success">✓</strong> Horário disponível.`;
            
            if (justificationLabel) {
                justificationLabel.innerHTML = 'Justificativa (Opcional)';
            }
        }

    }, 500);
}

async function checkConflictsForRequest(requestPayload) {
    try {
        const response = await apiFetch('/api/Data/requests/check-conflict', { method: 'POST', body: JSON.stringify(requestPayload) });
        if (response.ok) return { hasConflict: false, message: "Nenhum conflito." };
        if (response.status === 409) {
            const errorData = await response.json();
            let conflictMsg = errorData.message || "Conflito detectado.";
            if (errorData.conflictingDates && errorData.conflictingDates.length > 0) {
                const datesToShow = errorData.conflictingDates.slice(0, 5).join(', ');
                const moreCount = errorData.conflictingDates.length - 5;
                conflictMsg = `Conflito nas datas: ${datesToShow}${moreCount > 0 ? ` (e mais ${moreCount}).` : '.'}`;
            }
            return { hasConflict: true, message: conflictMsg };
        }
        return { hasConflict: false, message: "Erro na verificação." };
    } catch (error) {
        console.error("Erro no checkConflicts:", error);
        return { hasConflict: false, message: "Não foi possível verificar." };
    }
}

// ... Funções Modais de Conflito e Confirmação ...

function openConflictModal(message, requestId) {
    state.conflictingRequestId = requestId;
    if (conflictErrorMessage && conflictErrorModal) {
      conflictErrorMessage.textContent = message || "Conflito detectado.";
      conflictErrorModal.classList.add("is-open");
    } else { alert(message || "Conflito detectado."); }
  }
  function closeConflictModal() { if (conflictErrorModal) conflictErrorModal.classList.remove("is-open"); state.conflictingRequestId = null; }
  if (closeConflictModalBtn) closeConflictModalBtn.onclick = closeConflictModal;
  if (conflictApproveSkipBtn) {
    conflictApproveSkipBtn.onclick = async () => {
      if (state.conflictingRequestId) {
        conflictApproveSkipBtn.textContent = "Processando...";
        try {
          await apiFetch(`/api/Data/requests/${state.conflictingRequestId}/approve?skipConflicts=true`, { method: "PUT" });
          await loadAllData(); renderAll(); closeConflictModal();
        } catch (error) { console.error(error); alert(`Erro: ${error.message}`); } finally { conflictApproveSkipBtn.textContent = "Aprovar Somente Vagos"; }
      }
    };
  }
  if (conflictApproveForceBtn) {
    conflictApproveForceBtn.onclick = async () => {
      if (state.conflictingRequestId) {
        conflictApproveForceBtn.textContent = "Processando...";
        try {
          await apiFetch(`/api/Data/requests/${state.conflictingRequestId}/approve?force=true`, { method: "PUT" });
          closeConflictModal(); await loadAllData(); renderAll();
        } catch (error) { console.error(error); alert(`Erro: ${error.message}`); } finally { conflictApproveForceBtn.textContent = "Substituir Conflitos"; }
      }
    };
  }

function openConfirmModal(title, message, onConfirm, options = {}) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    const optionsEl = document.getElementById('confirm-options');
    optionsEl.innerHTML = '';
    if (options.showForceSkip) {
        optionsEl.style.display = 'block';
        optionsEl.innerHTML = `<p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">Conflito detectado. Como prosseguir?</p><div class="form-group"><label class="day-checkbox" style="flex-direction: row; gap: 8px;"><input type="radio" name="approval-type" value="force" checked> <span><strong>Forçar:</strong> Remove conflitantes.</span></label></div><div class="form-group"><label class="day-checkbox" style="flex-direction: row; gap: 8px;"><input type="radio" name="approval-type" value="skip"><span><strong>Pular:</strong> Aprova somente vagos.</span></label></div>`;
    } else { optionsEl.style.display = 'none'; }

    const confirmBtn = document.getElementById('confirm-btn-ok');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.onclick = () => {
        let params = {};
        if (options.showForceSkip) {
            const selectedOption = document.querySelector('[name="approval-type"]:checked');
            if (selectedOption) {
                if(selectedOption.value === 'force') params['force'] = true;
                else if (selectedOption.value === 'skip') params['skipConflicts'] = true;
            }
        }
        onConfirm(params); closeModalById('confirm-modal');
    };
    openModalById('confirm-modal');
}

// ... Funções do Calendário ...

function getReservationsForDate(date) {
  if (!date) return [];
  const dateStr = date.toISOString().split('T')[0];
  const dayOfWeek = date.getDay();
  const reservations = [];
  
  let scheduleSource = allSchedules;
  if (scheduleSource[dateStr]) {
    const rooms = scheduleSource[dateStr];
    for (const roomId in rooms) {
      let ambienteId = null;
      for (const [id, details] of allAmbientesMap.entries()) {
        if (details.nome === roomId || id === roomId) { ambienteId = id; break; }
      }
      if (selectedAmbienteFilter !== '' && selectedAmbienteFilter != ambienteId) continue;
      
      const periods = rooms[roomId];
      const ambDetails = allAmbientesMap.get(ambienteId);
      for (const period in periods) {
        const schedule = periods[period]; 
        reservations.push({
          ...schedule, roomId: ambienteId, ambienteNome: ambDetails?.nome || roomId,
          categoriaIcon: ambDetails?.icon || '🏢', period: period, date: dateStr,
          isRecurring: !!schedule.recurringScheduleId, isPending: false
        });
      }
    }
  }
  
  allPendingRequests.forEach(req => {
      if (selectedAmbienteFilter !== '' && selectedAmbienteFilter != req.roomId) return;
      let isMatch = false;
      if (!req.isRecurring) {
          const reqDateStr = req.date ? req.date.split('T')[0] : '';
          if (reqDateStr === dateStr) isMatch = true;
      } else {
          const start = new Date(req.startDate); const end = new Date(req.endDate);
          const checkDate = new Date(dateStr); 
          start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
          end.setMinutes(end.getMinutes() + end.getTimezoneOffset());
          checkDate.setMinutes(checkDate.getMinutes() + checkDate.getTimezoneOffset());
          if (checkDate >= start && checkDate <= end) {
              if (req.type === 'daily') {
                  if (req.weekdaysOnly) { if (dayOfWeek >= 1 && dayOfWeek <= 5) isMatch = true; } 
                  else isMatch = true;
              } else if (req.type === 'weekly' && req.daysOfWeek) {
                  const days = String(req.daysOfWeek).split(',').map(Number);
                  if (days.includes(dayOfWeek)) isMatch = true;
              }
          }
      }
      if (isMatch) {
          const ambDetails = allAmbientesMap.get(req.roomId);
          reservations.push({
              id: req.id, roomId: req.roomId, ambienteNome: ambDetails?.nome || req.roomId,
              categoriaIcon: ambDetails?.icon || '🏢', period: req.period, date: dateStr,
              prof: req.prof || req.userFullName, turma: req.turma, isBlocked: false,
              isRecurring: req.isRecurring, isPending: true 
          });
      }
  });
  return reservations;
}

function navigateMonth(direction) {
  currentDate.setMonth(currentDate.getMonth() + direction);
  renderCalendar();
}
function goToToday() {
  const today = new Date();
  currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
  selectedDate = today;
  renderCalendar(); renderDaySummary(selectedDate);
}

function renderCalendar() {
  const title = document.getElementById('calendar-title');
  if (!title) return; 
  let titleText = `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  if (selectedAmbienteFilter) {
    const ambDetails = allAmbientesMap.get(selectedAmbienteFilter);
    if (ambDetails) titleText += ` • ${ambDetails.nome}`;
  }
  title.textContent = titleText;
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';
  DAYS_OF_WEEK.forEach(day => {
    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.textContent = day;
    grid.appendChild(header);
  });
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    if (date.getMonth() !== currentDate.getMonth()) dayElement.classList.add('other-month');
    if (date.toDateString() === new Date().toDateString()) dayElement.classList.add('today');
    if (selectedDate && date.toDateString() === selectedDate.toDateString()) dayElement.classList.add('selected');

    const dayReservations = getReservationsForDate(date);
    
    dayReservations.sort((a, b) => {
        const timeA = parseInt(a.period.substring(0, 2)) || 0;
        const timeB = parseInt(b.period.substring(0, 2)) || 0;
        return timeA - timeB;
    });

    let eventsHtml = '';
    if (dayReservations.length > 0) {
        dayReservations.forEach(res => {
            const label = PERIOD_NAMES[res.period] || res.period;
            
            let periodClass = '';
            if (res.isPending) periodClass = 'pending';
            else {
                const startHour = parseInt(res.period.substring(0, 2)) || 0;
                if (res.period.startsWith('manha')) periodClass = 'event-manha';
                else if (res.period.startsWith('tarde')) periodClass = 'event-tarde';
                else if (res.period.startsWith('noite')) periodClass = 'event-noite';
                else {
                    if (startHour < 12) periodClass = 'event-manha';
                    else if (startHour < 18) periodClass = 'event-tarde';
                    else periodClass = 'event-noite';
                }
            }

            let textInfo = '';
            let tooltipPrefix = '';
            if (res.isBlocked) textInfo = res.blockReason || 'Bloqueado';
            else if (res.isPending) {
                const profName = res.prof ? res.prof.split(' ')[0] : 'Docente';
                textInfo = `⏳ ${profName} - ${res.turma}`;
                tooltipPrefix = '[AGUARDANDO APROVAÇÃO] ';
            } else {
                const profName = res.prof ? res.prof.split(' ')[0] : 'Docente';
                textInfo = `${profName} - ${res.turma}`;
            }

            eventsHtml += `<div class="event-text-item ${periodClass} ${res.isBlocked ? 'blocked' : ''}" title="${tooltipPrefix}${label}: ${res.prof || ''} - ${res.turma || ''}"><span class="event-period">${label}:</span> ${textInfo}</div>`;
        });
    }
    
    dayElement.innerHTML = `<div class="day-number">${date.getDate()}</div><div class="day-events">${eventsHtml}</div>`;
    dayElement.addEventListener('click', () => {
      selectedDate = new Date(date);
      renderCalendar(); renderDaySummary(selectedDate);
    });
    grid.appendChild(dayElement);
  }
}

function renderDaySummary(date) {
  const title = document.getElementById('summary-title');
  if (!title) return; 
  const content = document.getElementById('summary-content');
  const newRequestBtn = document.getElementById('summary-new-request-btn');
  if (!date) { newRequestBtn.style.display = 'none'; title.textContent = "Selecione uma data"; content.innerHTML = `<div class="summary-empty">Clique em uma data.</div>`; return; }
  
  const dayReservations = getReservationsForDate(date);
  newRequestBtn.style.display = 'flex';
  const newBtn = newRequestBtn.cloneNode(true);
  newRequestBtn.parentNode.replaceChild(newBtn, newRequestBtn);
  newBtn.onclick = () => { openNewReservationModal(date.toISOString().split('T')[0], null, selectedAmbienteFilter); };
  
  title.textContent = `${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
  
  if (dayReservations.length === 0) { content.innerHTML = `<div class="summary-empty">Nenhum agendamento.</div>`; } 
  else {
      const groupedByPeriod = {};
      dayReservations.forEach(res => { if (!groupedByPeriod[res.period]) groupedByPeriod[res.period] = []; groupedByPeriod[res.period].push(res); });
      let html = '';
      Object.keys(groupedByPeriod).sort().forEach(period => {
          const reservationsInPeriod = groupedByPeriod[period];
          reservationsInPeriod.forEach(res => { html += createScheduleCard(res, { showAmbiente: selectedAmbienteFilter === '', showDate: false, isDaySummary: true }); });
      });
      content.innerHTML = html;
  }
}

function renderMyRequests() {
  const container = document.getElementById('my-requests-list');
  if (!container) return;
  container.innerHTML = '';
  if (allMyRequests.length === 0) { container.innerHTML = '<div class="empty-state-text">Sem solicitações.</div>'; return; }
  allMyRequests.forEach(req => { container.innerHTML += createRequestCard(req, { isCoordinatorView: false }); });
}

function renderCoordinatorRequests() {
  const container = document.getElementById('all-requests-list');
  if (!container) return;
  container.innerHTML = '';
  if (allCoordinatorRequests.length === 0) { container.innerHTML = '<div class="empty-state-text">Sem solicitações pendentes.</div>'; return; }
  allCoordinatorRequests.forEach(req => { container.innerHTML += createRequestCard(req, { isCoordinatorView: true }); });
}

function renderMySchedules() {
    const container = document.getElementById('my-schedules-list');
    if (!container) return;
    container.innerHTML = '';
  const singleSchedules = (allMySchedules || []).filter(sch => !sch.recurringScheduleId);
  if (singleSchedules.length === 0) { container.innerHTML = '<div class="empty-state-text">Sem agendamentos futuros.</div>'; return; }
  singleSchedules.sort((a, b) => { if (a.date && b.date) return new Date(a.date) - new Date(b.date); return 0; });
  singleSchedules.forEach(sch => { container.innerHTML += createScheduleCard(sch, { showAmbiente: true, showDate: true, allowCancel: true }); });
}

function renderMyRecurringSchedules() {
    const container = document.getElementById('my-recurring-schedules-list');
    if (!container) return;
    container.innerHTML = '';
    if (allMyRecurringSchedules.length === 0) { container.innerHTML = '<div class="empty-state-text">Sem agendamentos recorrentes.</div>'; return; }
    allMyRecurringSchedules.forEach(rec => { container.innerHTML += createScheduleCard(rec, { showAmbiente: true, showDate: false, isRecurring: true, allowCancel: true }); });
}

function createScheduleCard(sch, options = {}) {
  const { showAmbiente = false, showDate = false, isRecurring = sch.isRecurring, allowCancel = false, isDaySummary = false } = options;
  const ambDetails = allAmbientesMap.get(sch.roomId);
  const isBlocked = sch.isBlocked;
  const isPending = sch.isPending; 
  
  const periodDisplay = PERIOD_NAMES[sch.period] || sch.period;

  let headerInfo = '';
  if (isRecurring) {
      const type = sch.type || (sch.isRecurring ? 'Recorrente' : '');
      headerInfo = `<div style="text-align: right;"><span class="card-badge recurring">${periodDisplay}</span><div class="card-subtitle" style="font-size: 0.7em; margin-top: 2px;">${type}</div></div>`;
  } else { headerInfo = `<span class="card-badge period">${periodDisplay}</span>`; }

  if (isPending) { headerInfo += `<div style="margin-top: 6px; text-align: right;"><span style="font-size: 11px; background: #f3f4f6; color: #4b5563; border: 1px dashed #9ca3af; padding: 2px 6px; border-radius: 4px; display: inline-block;">⏳ Aguardando Aprovação</span></div>`; }

  let bodyInfo = '';
  if (isBlocked) bodyInfo = `<p><strong>BLOQUEADO</strong></p><p>${sch.blockReason || 'Motivo não informado.'}</p>`;
  else bodyInfo = `<p><strong>${sch.prof}</strong> • ${sch.turma}</p>`;
  if (showAmbiente) bodyInfo += `<p>${ambDetails?.icon || '🏢'} ${ambDetails?.nome || sch.roomId}</p>`;
  if (showDate && sch.date) bodyInfo += `<p>Data: <strong>${new Date(sch.date).toLocaleDateString('pt-BR')}</strong></p>`;
  
  if (isRecurring && sch.startDate && sch.endDate) {
      bodyInfo += `<p>De: <strong>${new Date(sch.startDate).toLocaleDateString('pt-BR')}</strong></p><p>Até: <strong>${new Date(sch.endDate).toLocaleDateString('pt-BR')}</strong></p><p>Dias: <strong>${sch.type === 'weekly' && Array.isArray(sch.daysOfWeek) ? sch.daysOfWeek.map(d => DAYS_OF_WEEK[d]).join(', ') : (sch.weekdaysOnly ? 'Seg-Sex' : 'Todos os dias')}</strong></p>`;
  }

  let actions = '';
  const isOwner = (currentUser && sch.applicationUserId === currentUser.id);
  const isCoord = (currentUser && currentUser.roles.includes('Coordenador'));

  if (isPending && (isOwner || isCoord)) {
      actions = `<div class="card-actions"><button class="btn-danger" onclick="handleCancelRequest(${sch.id})">Cancelar Solicitação</button></div>`;
  } 
  else if (isDaySummary && (isOwner || isCoord) && !sch.isBlocked) {
      actions = '<div class="card-actions">';
      if (sch.isRecurring && sch.recurringScheduleId) {
          actions += `<button class="btn-danger-outline" onclick="handleCancelRecurring(${sch.recurringScheduleId})">Cancelar Série</button>`;
          actions += `<button class="btn-danger" onclick="handleCancelSchedule(${sch.id})">Cancelar Dia</button>`;
      } else { actions += `<button class="btn-danger" onclick="handleCancelSchedule(${sch.id})">Cancelar</button>`; }
      actions += '</div>';
  } else if (allowCancel && (isOwner || isCoord) && !sch.isBlocked && !isPending) {
      const cancelFn = isRecurring ? `handleCancelRecurring(${sch.id})` : `handleCancelSchedule(${sch.id})`;
      actions = `<div class="card-actions"><button class="btn-danger" onclick="${cancelFn}">Cancelar</button></div>`;
  }

  const cardStyle = isPending ? 'style="border: 1px dashed #cbd5e1; background-color: #f8fafc;"' : '';
  return `<div class="card ${isBlocked ? 'blocked' : ''}" ${cardStyle}><div class="card-header"><div><h3>${isBlocked ? 'Horário Bloqueado' : (sch.turma || 'Agendamento')}</h3>${showAmbiente && !isBlocked ? `<span class="card-subtitle">${ambDetails?.nome || sch.roomId}</span>` : ''}</div><div>${headerInfo}</div></div><div class="card-body">${bodyInfo}</div>${actions}</div>`;
}

function createRequestCard(req, options = {}) {
  const { isCoordinatorView = false } = options;
  const ambDetails = allAmbientesMap.get(req.roomId);
  const periodDisplay = PERIOD_NAMES[req.period] || req.period;
  
  let dateInfo = ''; let typeInfo = '';
  if (req.isRecurring) {
      typeInfo = `<span class="card-badge recurring">${req.type}</span>`;
      dateInfo = `<p>De: <strong>${new Date(req.startDate).toLocaleDateString('pt-BR')}</strong></p><p>Até: <strong>${new Date(req.endDate).toLocaleDateString('pt-BR')}</strong></p><p>Dias: <strong>${req.type === 'weekly' && req.daysOfWeek ? req.daysOfWeek.split(',').map(d => DAYS_OF_WEEK[d]).join(', ') : (req.weekdaysOnly ? 'Seg-Sex' : 'Todos os dias')}</strong></p>`;
  } else { dateInfo = `<p>Data: <strong>${new Date(req.date).toLocaleDateString('pt-BR')}</strong></p>`; }
  
  let actions = '';
  if (isCoordinatorView) {
      actions = `<div class="card-actions"><button class="btn-danger" onclick="handleDenyRequest(${req.id})">Recusar</button><button class="btn-primary" onclick="handleApproveRequest(${req.id})">Aprovar</button></div>`;
  } else { actions = `<div class="card-actions"><button class="btn-danger" onclick="handleCancelRequest(${req.id})">Cancelar Solicitação</button></div>`; }

  return `<div class="card"><div class="card-header"><div><h3>${req.turma}</h3><span class="card-subtitle">${ambDetails?.nome || req.roomId}</span></div><div>${typeInfo}<span class="card-badge period">${periodDisplay}</span></div></div><div class="card-body"><p>Solicitado por: <strong>${req.userFullName || req.prof}</strong></p>${dateInfo}${req.justification ? `<p class="card-justification">${req.justification}</p>` : ''}</div>${actions}</div>`;
}

function handleCancelRequest(id) {
    openConfirmModal("Cancelar Solicitação", "Deseja cancelar esta solicitação?", async () => {
            try {
                const response = await apiFetch(`/api/Data/requests/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error("Falha ao cancelar.");
                showToast("Cancelada."); await loadAllData(); renderAll();
            } catch (error) { showToast(error.message, "error"); }
    });
}
function handleDenyRequest(id) {
    openConfirmModal("Recusar Solicitação", "Deseja RECUSAR esta solicitação?", async () => {
            try {
                const response = await apiFetch(`/api/Data/requests/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error("Falha ao recusar.");
                showToast("Recusada."); await loadAllData(); renderAll();
            } catch (error) { showToast(error.message, "error"); }
    });
}
async function handleApproveRequest(id) {
    try {
        const response = await apiFetch(`/api/Data/requests/${id}/approve`, { method: 'PUT' });
        if (response.ok) { showToast("Aprovada!"); await loadAllData(); renderAll(); return; }
        if (response.status === 409) {
            const errorData = await response.json();
            let conflictMsg = errorData.message || "Conflito.";
            const dateRegex = /(\d{4})-(\d{2})-(\d{2})/;
            const match = conflictMsg.match(dateRegex);
            if (match) conflictMsg = conflictMsg.replace(dateRegex, `${match[3]}/${match[2]}/${match[1]}`);
            openConflictModal(conflictMsg, id);
        } else { const errorData = await response.json(); throw new Error(errorData.message || "Falha ao aprovar."); }
    } catch (error) { showToast(error.message, "error"); }
}
function handleCancelSchedule(id) {
    openConfirmModal("Cancelar Agendamento", "Cancelar este dia?", async () => {
            try {
                const response = await apiFetch(`/api/Data/schedules/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error("Falha ao cancelar.");
                showToast("Cancelado."); await loadAllData(); renderAll();
            } catch (error) { showToast(error.message, "error"); }
    });
}
function handleCancelRecurring(id) {
    openConfirmModal("Cancelar Série Recorrente", "Cancelar TODA a série?", async () => {
            try {
                const response = await apiFetch(`/api/Data/recurring-schedules/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error("Falha ao cancelar.");
                showToast("Série cancelada."); await loadAllData(); renderAll();
            } catch (error) { showToast(error.message, "error"); }
    });
}