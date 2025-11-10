// URL Base da sua API
const API_BASE_URL = 'https://localhost:7001';

// --- Variáveis Globais de Estado ---
let currentTheme = 'light';
let currentDate = new Date();
let selectedDate = null;
let currentView = 'calendar';
let expandedCategories = new Set();
let selectedAmbienteFilter = ''; // Filtro global de ambiente
let currentUser = null; // { token, id, fullName, roles: ['Coordenador'] }

// --- Cache de Dados ---
let allSchedules = {}; // { 'YYYY-MM-DD': { 'room-id': { 'period': { scheduleData } } } }
let allRecurringSchedules = []; // Usado para a lista "Meus Agendamentos Recorrentes"
let allMyRequests = [];
let allMySchedules = [];
let allMyRecurringSchedules = [];
let allCoordinatorRequests = [];
let allCategorias = [];
let allAmbientesMap = new Map(); // Map<ambienteId, { nome, categoriaId, icon }>

// --- Constantes de UI ---
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const PERIOD_NAMES = {
  "manha_todo": "Manhã (Todo)",
  "manha_antes": "Manhã (Antes Int.)",
  "manha_apos": "Manhã (Após Int.)",
  "tarde_todo": "Tarde (Todo)",
  "tarde_antes": "Tarde (Antes Int.)",
  "tarde_apos": "Tarde (Após Int.)",
  "noite_todo": "Noite (Todo)",
  "noite_antes": "Noite (Antes Int.)",
  "noite_apos": "Noite (Após Int.)",
};

// --- Inicialização ---

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
    // Validação simples de token (não verifica expiração, mas é melhor que nada)
    if (!currentUser || !currentUser.token || !currentUser.fullName || !currentUser.id) { // Verificando ID
      throw new Error("Usuário salvo inválido.");
    }
    
    showMainApp();
    setupEventListeners();
    
    // Carrega dados essenciais (Categorias)
    await loadCategoriasEAmbientes();
    
    // Carrega o restante dos dados e renderiza
    await loadAllData();
    
    // Define a data inicial
    const today = new Date();
    currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
    selectedDate = today;
    
    // Renderiza tudo
    renderAll();
    
  } catch (error) {
    console.error("Falha ao inicializar:", error);
    handleLogout(); // Desloga se o usuário salvo for inválido
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
  
  // Exibe/Oculta elementos de Coordenador
  const isCoordinator = currentUser.roles.includes('Coordenador');
  document.querySelectorAll('.coord-only').forEach(el => {
    el.style.display = isCoordinator ? 'block' : 'none'; // 'block' ou 'flex' dependendo do elemento
  });
  
  // Se o botão for flex, use 'flex'
  const allRequestsNav = document.querySelector('.nav-btn[data-view="all-requests"]');
  if (allRequestsNav) {
      allRequestsNav.style.display = isCoordinator ? 'flex' : 'none';
  }
}

function setupLoginListeners() {
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
}

function setupEventListeners() {
  // Login / Logout
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);

  // Navegação
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Tema
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  // Filtro Global de Ambiente
  document.getElementById('ambiente-filter')?.addEventListener('change', handleAmbienteFilterChange);
  
  // Botão Nova Reserva (Principal)
  document.getElementById('new-reservation-btn')?.addEventListener('click', () => {
      // Abre o modal, preenchendo o filtro de ambiente (se houver)
      openNewReservationModal(null, null, selectedAmbienteFilter);
  });

  // Navegação do Calendário
  document.getElementById('prev-month')?.addEventListener('click', () => navigateMonth(-1));
  document.getElementById('next-month')?.addEventListener('click', () => navigateMonth(1));
  document.getElementById('today-btn')?.addEventListener('click', goToToday);

  // --- Modal de Reserva ---
  document.getElementById('reservation-form')?.addEventListener('submit', handleRequestSubmit);
  document.getElementById('categoria')?.addEventListener('change', handleCategoryChange);
  
  // Abas do Modal (Única / Recorrente)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchReservationTab(btn.dataset.tab));
  });
  
  // Opções de Recorrência
  document.getElementById('recorrencia-tipo')?.addEventListener('change', toggleRecurrenceOptions);
  document.getElementById('weekdays-only')?.addEventListener('change', updateConflictPreview);
  
  // Listeners para verificar conflitos
  //const conflictTriggers = ['#dias-semana-group input', '#recorrencia-inicio', '#recorrencia-fim', '#periodo', '#data', '#ambiente'];
  // conflictTriggers.forEach(selector => {
  //     document.querySelectorAll(selector).forEach(el => {
  //         el.addEventListener('change', updateConflictPreview);
  //     });
  // });

  

  // Fechar Modais
  document.querySelectorAll('.close-btn, #confirm-btn-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Encontra o modal pai do botão
        const modalToClose = e.target.closest('.modal');
        if (modalToClose) {
            closeModalById(modalToClose.id);
        }
    });
  });
  
  // Modal de Mudança de Senha
  document.getElementById('change-password-form')?.addEventListener('submit', handleChangePassword);
}

// --- Lógica de Login / Logout ---

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

  let state = {
    currentUserRole: null,
    currentUserName: "",
    currentUserId: null,
    selectedRoomId: null,
    currentDate: new Date(),
    viewMode: "daily",
    conflictingRequestId: null, // Armazena ID da request em conflito
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

    // Login bem-sucedido
    currentUser = {
      token: data.token,
      id: data.id, // <-- CORREÇÃO: ID do usuário está aqui
      fullName: data.fullName,
      roles: data.roles || [],
      mustChangePassword: data.mustChangePassword
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    if (data.mustChangePassword) {
        showMainApp(); // Mostra o app principal
        setupEventListeners(); // Configura listeners básicos (como logout)
        openModalById('change-password-modal'); // Força o modal de troca de senha
        showToast("Você deve alterar sua senha antes de continuar.", "warning");
    } else {
        // Inicialização completa
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
  
  // Reseta todo o estado da aplicação
  allSchedules = {};
  allRecurringSchedules = [];
  allMyRequests = [];
  allMySchedules = [];
  allMyRecurringSchedules = [];
  allCoordinatorRequests = [];
  allCategorias = [];
  allAmbientesMap.clear();
  selectedDate = null;
  selectedAmbienteFilter = '';

  showLoginScreen();
  // Remove listeners antigos
  document.getElementById('logout-btn')?.removeEventListener('click', handleLogout);
  // Adiciona listener de login novamente
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

    btn.disabled = true;
    btn.textContent = 'Alterando...';
    errorEl.style.display = 'none';

    try {
        const response = await apiFetch('/api/Auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword })
        });

        if (!response.ok) {
            const errorData = await response.json();
            // Tenta formatar os erros do Identity
            let errorMessage = "Erro ao alterar senha.";
            if (errorData && errorData.errors) {
                errorMessage = errorData.errors.map(err => err.description || err.code).join(' ');
            } else if (response.status === 400 && errorData.message) {
                 errorMessage = errorData.message;
            } else if (response.status === 400) {
                 errorMessage = "Senha atual incorreta ou nova senha inválida.";
            }
            throw new Error(errorMessage);
        }

        // Senha alterada com sucesso
        showToast("Senha alterada com sucesso!");
        closeModalById('change-password-modal');
        
        // Atualiza o estado local do usuário
        if (currentUser.mustChangePassword) {
            currentUser.mustChangePassword = false;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            // Recarrega os dados caso ele não os tivesse antes
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
        btn.textContent = 'Alterar Senha';
        document.getElementById('change-password-form').reset();
    }
}


// --- Lógica de Navegação e UI ---

function switchView(viewName) {
  // Se o usuário tiver que trocar a senha, impede a navegação
  if (currentUser && currentUser.mustChangePassword) {
      showToast("Você deve alterar sua senha para navegar.", "warning");
      openModalById('change-password-modal');
      return;
  }
    
  currentView = viewName;
  
  // Atualiza botões
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Atualiza views
  document.querySelectorAll('.view').forEach(view => {
    view.classList.toggle('active', view.id === `${viewName}-view`);
  });

  // Renderiza o conteúdo da view específica
  switch (viewName) {
    case 'calendar':
      // O calendário e o sumário são renderizados pelo renderAll()
      // se a data selecionada mudar, mas é bom garantir aqui
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
      if (currentUser.roles.includes('Coordenador')) {
        renderCoordinatorRequests();
      }
      break;
  }
}

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.body.className = `${currentTheme}-theme`;
  
  const icon = document.getElementById('theme-icon');
  const text = document.getElementById('theme-text');
  
  if (currentTheme === 'dark') {
    icon.textContent = '☀️';
    text.textContent = 'Claro';
  } else {
    icon.textContent = '🌙';
    text.textContent = 'Escuro';
  }
}

function openModalById(modalId) {
    document.getElementById(modalId)?.classList.add('active');
}

function closeModalById(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}

function showToast(message, type = 'success', duration = 3000) {
  const existing = document.querySelector('.inline-message');
  if (existing) existing.remove();

  const messageEl = document.createElement('div');
  messageEl.className = `inline-message ${type}`; // Usa classes CSS para estilo
  messageEl.textContent = message;
  document.body.appendChild(messageEl);

  setTimeout(() => {
    messageEl.style.opacity = '0';
    setTimeout(() => messageEl.remove(), 300); // 300ms da transição de opacidade
  }, duration);
}

// --- Lógica de Comunicação com API ---

async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (currentUser && currentUser.token) {
    headers['Authorization'] = `Bearer ${currentUser.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

  if (response.status === 401) {
    // Token expirou ou é inválido
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
    if (!response.ok) {
        console.error("Falha ao buscar categorias, status:", response.status);
        throw new Error('Falha ao buscar categorias');
    }
    
    allCategorias = await response.json();
    
    // Processa o mapa de ambientes para fácil acesso
    allAmbientesMap.clear();
    allCategorias.forEach(cat => {
      cat.ambientes.forEach(amb => {
        allAmbientesMap.set(amb.id, {
          nome: amb.nome,
          categoriaId: cat.id,
          categoriaNome: cat.nome,
          icon: cat.icon
        });
      });
    });
    
  } catch (error) {
    console.error("Erro ao carregar categorias:", error);
    showToast("Erro ao carregar configuração de ambientes.", "error");
  }
}

async function loadAllData() {
  // Mostra spinners
  document.getElementById('categories-sidebar').innerHTML = '<div class="loading-spinner"></div>';
  document.getElementById('categories-grid').innerHTML = '<div class="loading-spinner"></div>';
  
  // Se o usuário tiver que trocar a senha, não carrega nada
  if (currentUser && currentUser.mustChangePassword) {
      return;
  }
  
  const isCoordinator = currentUser.roles.includes('Coordenador');
  
  try {
    const endpoints = [
      '/api/Data/schedules',
      '/api/Data/recurring-schedules', // Usado para a lista "Meus Agendamentos Recorrentes"
      '/api/Data/my-requests',
      '/api/Data/my-schedules',
      '/api/Data/my-recurring-schedules'
    ];
    
    if (isCoordinator) {
      endpoints.push('/api/Data/requests'); // Todas as solicitações
    }

    const responses = await Promise.all(endpoints.map(ep => apiFetch(ep)));
    
    for(const res of responses) {
        if (!res.ok) {
             console.error(`Falha ao carregar: ${res.url}`);
             throw new Error(`Falha ao carregar dados da API.`);
        }
    }

    const [
      schedulesData,
      recurringData, // Este é o allRecurringSchedules (para a lista)
      myRequestsData,
      mySchedulesData,
      myRecurringSchedulesData,
      allRequestsData // Será undefined se não for coordenador
    ] = await Promise.all(responses.map(res => res.json()));

    // Atualiza caches
    allSchedules = schedulesData; // Fonte da verdade para o calendário
    allRecurringSchedules = recurringData; // Fonte da verdade para a lista
    allMyRequests = myRequestsData;
    allMySchedules = mySchedulesData;
    allMyRecurringSchedules = myRecurringSchedulesData;
    if (isCoordinator) {
      allCoordinatorRequests = allRequestsData;
    }
    
    // Aplica o filtro (importante para a primeira renderização)
    applyAmbienteFilter(); 
    
  } catch (error) {
    console.error("Falha ao inicializar dados:", error);
    if (error.message !== 'Não autorizado') { // Evita toast duplicado no logout
        showToast(error.message, "error");
    }
  }
}

function handleAmbienteFilterChange(e) {
  selectedAmbienteFilter = e.target.value;
  applyAmbienteFilter();
}

function applyAmbienteFilter() {
  // A lógica de filtragem real foi movida para as funções de renderização
  // e getReservationsForDate() para garantir que tudo seja atualizado.
  renderAll();
}

// --- Renderização (Funções Principais) ---

function renderAll() {
  // Se o usuário tiver que trocar a senha, não renderiza
  if (currentUser && currentUser.mustChangePassword) {
      return;
  }
    
  // Renderiza componentes que dependem de todos os dados
  renderCategoriesSidebar();
  renderCategoriesGrid();
  
  // Renderiza a view atual
  switch (currentView) {
    case 'calendar':
      renderCalendar();
      renderDaySummary(selectedDate);
      break;
    case 'categories':
      // já renderizado acima
      break;
    case 'requests':
      renderMyRequests();
      break;
    case 'my-schedules':
      renderMySchedules();
      renderMyRecurringSchedules();
      break;
    case 'all-requests':
      if (currentUser.roles.includes('Coordenador')) {
          renderCoordinatorRequests();
      }
      break;
  }
  
  // Atualiza o <select> de filtro
  populateAmbienteFilterSelect();

  updateNavigationBadges();
}

function updateNavigationBadges() {
  // Badge de "Todas Solicitações"
  const allRequestsBtn = document.querySelector('.nav-btn[data-view="all-requests"]');
  if (allRequestsBtn) {
    // Limpa badge antigo
    const existingBadge = allRequestsBtn.querySelector('.nav-btn-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    // Adiciona novo badge se for Coordenador e houver solicitações
    const isCoordinator = currentUser && currentUser.roles.includes('Coordenador');
    const count = allCoordinatorRequests.length;

    if (isCoordinator && count > 0) {
      const badge = document.createElement('span');
      badge.className = 'nav-btn-badge';
      badge.textContent = count;
      allRequestsBtn.appendChild(badge);
    }
  }

  // (Futuramente, pode adicionar badge de "Minhas Solicitações" aqui também)
}

/**
 * Renderiza o <select> de filtro na sidebar
 */
function populateAmbienteFilterSelect() {
  const filterSelect = document.getElementById('ambiente-filter');
  if (!filterSelect) return;
  
  filterSelect.innerHTML = '<option value="">Todos os Ambientes</option>';
  
  allCategorias.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(cat => {
    const optGroup = document.createElement('optgroup');
    optGroup.label = `${cat.icon} ${cat.nome}`;
    
    cat.ambientes.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(amb => {
      const option = document.createElement('option');
      option.value = amb.id;
      option.textContent = amb.nome;
      optGroup.appendChild(option);
    });
    
    filterSelect.appendChild(optGroup);
  });
  
  // Restaura o valor selecionado
  filterSelect.value = selectedAmbienteFilter;
}


function renderCategoriesSidebar() {
  const container = document.getElementById('categories-sidebar');
  if (!container) return;
  container.innerHTML = '';

  if (allCategorias.length === 0) {
      container.innerHTML = '<div class="empty-state-text">Nenhuma categoria.</div>';
      return;
  }

  allCategorias.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(categoria => {
    const isExpanded = expandedCategories.has(categoria.id);

    const item = document.createElement('div');
    item.className = 'category-item';
    item.innerHTML = `
      <div class="category-header">
        <div class="category-name">
          ${categoria.icon} ${categoria.nome}
          <span class="dropdown-arrow ${isExpanded ? 'expanded' : ''}">▼</span>
        </div>
      </div>
    `;

    const ambientesList = document.createElement('div');
    ambientesList.className = `ambientes-list ${isExpanded ? 'expanded' : 'collapsed'}`;

    if (isExpanded) {
      if (categoria.ambientes.length > 0) {
          categoria.ambientes.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(ambiente => {
            const ambienteItem = document.createElement('div');
            // Destaca o ambiente se for o filtrado
            ambienteItem.className = `ambiente-item ${selectedAmbienteFilter === ambiente.id ? 'active' : ''}`;
            ambienteItem.innerHTML = `<span class="ambiente-name">${ambiente.nome}</span>`;
            
            // ATUALIZADO: Muda o fluxo de clique do ambiente
            ambienteItem.addEventListener('click', (e) => {
              e.stopPropagation();
              
              // 1. Define o filtro global
              selectedAmbienteFilter = ambiente.id;
              
              // 2. Atualiza o dropdown de filtro para refletir a seleção
              document.getElementById('ambiente-filter').value = ambiente.id;
              
              // 3. Re-renderiza tudo (sidebar para destacar, calendário para filtrar)
              applyAmbienteFilter(); 
              
              // 4. Muda para a visão do calendário
              switchView('calendar');
            });
            ambientesList.appendChild(ambienteItem);
          });
      } else {
          ambientesList.innerHTML = `<div class="ambiente-item-empty">Nenhum ambiente</div>`;
      }
    }

    item.appendChild(ambientesList);

    item.addEventListener('click', () => {
      if (expandedCategories.has(categoria.id)) {
        expandedCategories.delete(categoria.id);
      } else {
        expandedCategories.add(categoria.id);
      }
      renderCategoriesSidebar(); // Re-renderiza apenas a sidebar
    });

    container.appendChild(item);
  });
}

function renderCategoriesGrid() {
  const grid = document.getElementById('categories-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  if (allCategorias.length === 0) {
      grid.innerHTML = '<div class="loading-spinner"></div>'; // Ou estado vazio
      return;
  }

  allCategorias.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(categoria => {
    const card = document.createElement('div');
    card.className = 'category-card';

    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `
      <div class="category-name">${categoria.icon} ${categoria.nome}</div>
    `;

    const ambientesList = document.createElement('div');
    ambientesList.style.marginTop = '16px';

    if (categoria.ambientes.length > 0) {
        categoria.ambientes.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(ambiente => {
          const item = document.createElement('div');
          item.className = `ambiente-item ${selectedAmbienteFilter === ambiente.id ? 'active' : ''}`;
          item.style.marginBottom = '8px';
          item.innerHTML = `<span class="ambiente-name">${ambiente.nome}</span>`;

          item.addEventListener('click', () => {
              // Mesmo fluxo da sidebar: filtrar e ir para o calendário
              selectedAmbienteFilter = ambiente.id;
              document.getElementById('ambiente-filter').value = ambiente.id;
              applyAmbienteFilter();
              switchView('calendar');
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
  
  // ATUALIZADO: Esconde o campo Categoria
  document.getElementById('categoria-form-group').style.display = 'none';
  
  document.getElementById('reservation-form').reset();
  document.getElementById('request-id').value = ''; // Limpa ID (para garantir modo "criação")
  
  isConflictActive = false;
  // Reseta estado do formulário
  showFormError(null);
  document.getElementById('conflict-preview').style.display = 'none';
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = false;
  document.getElementById('submit-btn-text').textContent = 'Enviar Solicitação';
  document.getElementById('submit-btn-loading').style.display = 'none';

  // Define a aba padrão
  switchReservationTab('unica');
  
  // Define data
  let dateToUse = dateStr ? dateStr : (selectedDate || new Date()).toISOString().split('T')[0];
  document.getElementById('data').value = dateToUse;
  document.getElementById('recorrencia-inicio').value = dateToUse;
  document.getElementById('recorrencia-fim').value = '';

  // ATUALIZADO: Lógica de Preenchimento de Categoria/Ambiente
  let finalCategoriaId = categoriaId;
  let finalAmbienteId = ambienteId;

  // Se temos um ambiente (do filtro), encontramos sua categoria
  if (finalAmbienteId && !finalCategoriaId) {
      const ambDetails = allAmbientesMap.get(finalAmbienteId);
      if (ambDetails) {
          finalCategoriaId = ambDetails.categoriaId;
      }
  }
  
  // Preenche o <select> de Categoria (mesmo oculto, para o <select> de ambiente funcionar)
  const categoriaSelect = document.getElementById('categoria');
  // Limpa opções antigas (exceto a primeira)
  while (categoriaSelect.options.length > 1) {
      categoriaSelect.remove(1);
  }
  allCategorias.forEach(cat => {
     const option = document.createElement('option');
     option.value = cat.id;
     option.textContent = cat.nome;
     categoriaSelect.appendChild(option);
  });
  
  if (finalCategoriaId) {
      categoriaSelect.value = finalCategoriaId;
  } else {
      // Se não tem categoria, seleciona a primeira da lista
      if (allCategorias.length > 0) {
          categoriaSelect.value = allCategorias[0].id;
          finalCategoriaId = allCategorias[0].id;
      }
  }
  
  // Popula o <select> de Ambientes
  handleCategoryChange(); 
  
  // Preenche o <select> de Ambiente (com delay)
  if (finalAmbienteId) {
      setTimeout(() => {
          document.getElementById('ambiente').value = finalAmbienteId;
      }, 50);
  } else {
      // Se não tem ambiente, seleciona o primeiro da categoria
      const firstCat = allCategorias.find(c => c.id === finalCategoriaId);
      if(firstCat && firstCat.ambientes.length > 0) {
          setTimeout(() => {
            document.getElementById('ambiente').value = firstCat.ambientes[0].id;
          }, 50);
      }
  }
  
  // Reseta preview de conflito
  //updateConflictPreview();
  
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
        option.value = ambiente.id;
        option.textContent = ambiente.nome;
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
  
  // Atualiza validação
  const isRecurring = (tabName === 'recorrente');
  document.getElementById('data').required = !isRecurring;
  document.getElementById('recorrencia-inicio').required = isRecurring;
  document.getElementById('recorrencia-fim').required = isRecurring;
  
  toggleRecurrenceOptions();
  //updateConflictPreview();
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
    
    if (!message) {
        errorEl.style.display = 'none';
        contentEl.innerHTML = '';
        return;
    }
    
    errorEl.style.display = 'block';
    errorEl.classList.remove('success'); // Garante que não tenha a classe success
    errorEl.classList.remove('warning');
    contentEl.innerHTML = `<strong class="text-danger">Erro:</strong> ${message}`;
}

/**
 * Lida com o envio do formulário de solicitação (criação).
 */
async function handleRequestSubmit(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  document.getElementById('submit-btn-text').textContent = 'Enviando...';
  document.getElementById('submit-btn-loading').style.display = 'inline-block';
  showFormError(null);

  const isRecurring = document.getElementById('tab-recorrente').classList.contains('active');
  const ambienteId = document.getElementById('ambiente').value;

  // Monta o payload base
  const payload = {
    id: 0, // ID será 0 para criação
    roomId: ambienteId,
    turma: document.getElementById('turma').value,
    period: document.getElementById('periodo').value,
    justification: document.getElementById('justification').value || null,
    isRecurring: isRecurring
  };

  // Adiciona campos específicos
  if (isRecurring) {
    payload.type = document.getElementById('recorrencia-tipo').value;
    payload.startDate = document.getElementById('recorrencia-inicio').value;
    payload.endDate = document.getElementById('recorrencia-fim').value;
    
    if (payload.type === 'weekly') {
      const days = Array.from(document.querySelectorAll('[name="dayOfWeek"]:checked')).map(cb => cb.value);
      if (days.length === 0) {
          showFormError("Selecione pelo menos um dia da semana para recorrência semanal.");
          resetSubmitBtn();
          return;
      }
      payload.daysOfWeek = days.join(',');
      payload.weekdaysOnly = null;
    } else { // daily
      payload.daysOfWeek = null;
      payload.weekdaysOnly = document.getElementById('weekdays-only').checked;
    }
    
    // Validação de data
    if (!payload.startDate || !payload.endDate) {
        showFormError("Datas de início e fim são obrigatórias para recorrência.");
        resetSubmitBtn();
        return;
    }
    if (new Date(payload.endDate) < new Date(payload.startDate)) {
        showFormError("A data de fim não pode ser anterior à data de início.");
        resetSubmitBtn();
        return;
    }

  } else { // Data única
    payload.date = document.getElementById('data').value;
    payload.type = null;
    payload.startDate = null;
    payload.endDate = null;
    payload.daysOfWeek = null;
    payload.weekdaysOnly = null;
    
    if (!payload.date) {
        showFormError("A data é obrigatória para reserva única.");
        resetSubmitBtn();
        return;
    }
  }
  
  // Validação de campos comuns
  if (!payload.roomId || !payload.period || !payload.turma) {
      showFormError("Ambiente, Período e Turma são obrigatórios.");
      resetSubmitBtn();
      return;
  }

  if (isConflictActive && (!payload.justification || payload.justification.trim() === '')) {
      showFormError("A justificativa é obrigatória pois foi detectado um conflito.");
      resetSubmitBtn();
      return;
  }

  try {
    // 1. Verifica conflitos ANTES de enviar
    // const conflictCheck = await checkConflictsForRequest(payload);
    
    // if (conflictCheck.hasConflict) {
    //     // Se houver conflito, exibe e pára
    //     showFormError(conflictCheck.message);
    //     resetSubmitBtn();
    //     return;
    // }

    // 2. Se não houver conflitos, envia a solicitação
    const response = await apiFetch('/api/Data/requests', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Falha ao enviar solicitação');
    }

    // Sucesso!
    showToast("Solicitação enviada com sucesso!");
    closeModalById('reservation-modal');
    
    // Recarrega os dados relevantes
    await loadAllData(); // Recarrega tudo para simplicidade
    renderAll(); // Re-renderiza a UI

  } catch (error) {
    console.error("Erro ao enviar solicitação:", error);
    showFormError(error.message);
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

// --- Lógica de Conflito (Frontend) ---

let conflictCheckTimer = null;

function updateConflictPreview() {
    // Debounce: Aguarda 500ms após o usuário parar de digitar
    clearTimeout(conflictCheckTimer);
    conflictCheckTimer = setTimeout(async () => {
        
        const previewEl = document.getElementById('conflict-preview');
        const contentEl = document.getElementById('conflict-content');
        
        if (!previewEl || !contentEl) return; // Modal não está aberto/pronto

        const isRecurring = document.getElementById('tab-recorrente').classList.contains('active');
        const ambienteId = document.getElementById('ambiente').value;
        const periodo = document.getElementById('periodo').value;

        // Só verifica se os campos principais estiverem preenchidos
        if (!ambienteId || !periodo) {
            previewEl.style.display = 'none';
            return;
        }

        // Monta um payload *parcial* para verificação
        const checkPayload = {
            roomId: ambienteId,
            period: periodo,
            isRecurring: isRecurring,
            date: isRecurring ? null : document.getElementById('data').value,
            startDate: isRecurring ? document.getElementById('recorrencia-inicio').value : null,
            endDate: isRecurring ? document.getElementById('recorrencia-fim').value : null,
            type: isRecurring ? document.getElementById('recorrencia-tipo').value : null,
        };
        
        if (isRecurring) {
            if (checkPayload.type === 'weekly') {
                const days = Array.from(document.querySelectorAll('[name="dayOfWeek"]:checked')).map(cb => cb.value);
                checkPayload.daysOfWeek = days.join(',');
                checkPayload.weekdaysOnly = null;
            } else {
                checkPayload.daysOfWeek = null;
                checkPayload.weekdaysOnly = document.getElementById('weekdays-only').checked;
            }
        }
        
        // Validação de dados mínimos
        if ((!isRecurring && !checkPayload.date) || (isRecurring && (!checkPayload.startDate || !checkPayload.endDate)) || (isRecurring && checkPayload.type === 'weekly' && !checkPayload.daysOfWeek)) {
             previewEl.style.display = 'none';
             return; // Não tem dados suficientes para verificar
        }

        // Exibe o preview
        previewEl.style.display = 'block';
        previewEl.classList.remove('success');
        contentEl.innerHTML = `<span class="loading-inline"></span> Verificando conflitos...`;
        
        const { hasConflict, message } = await checkConflictsForRequest(checkPayload);
        
        if (hasConflict) {
            previewEl.classList.remove('success');
            previewEl.classList.add('warning');
            contentEl.innerHTML = `
                <strong class="text-danger">Conflito:</strong> ${message}
                <br>
                <strong style="color: var(--warning-color);">Ação:</strong> Por favor, preencha a <strong>justificativa</strong> para enviar a solicitação.
            `;
            if (justificationLabel) {
                justificationLabel.innerHTML = 'Justificativa <span class="text-danger">(Obrigatório)</span>';
            }
            isConflictActive = true;
        } else {
            previewEl.classList.add('success');
            previewEl.classList.remove('warning'); // <-- NOVO
            contentEl.innerHTML = `<strong class="text-success">✓</strong> Nenhum conflito detectado.`;
            if (justificationLabel) {
                justificationLabel.innerHTML = 'Justificativa (Opcional)';
            }
            isConflictActive = false;
        }

    }, 500);
}

/**
 * Verifica conflitos usando o endpoint da API.
 * Retorna { hasConflict: boolean, message: string }
 */
async function checkConflictsForRequest(requestPayload) {
    try {
        const response = await apiFetch('/api/Data/requests/check-conflict', {
            method: 'POST',
            body: JSON.stringify(requestPayload)
        });

        if (response.ok) {
            // 200 OK = Sem conflitos
            return { hasConflict: false, message: "Nenhum conflito." };
        } 
        
        if (response.status === 409) {
            // 409 Conflict = Conflito encontrado
            const errorData = await response.json();
            let conflictMsg = errorData.message || "Conflito detectado.";
            if (errorData.conflictingDates && errorData.conflictingDates.length > 0) {
                const datesToShow = errorData.conflictingDates.slice(0, 5).join(', ');
                const moreCount = errorData.conflictingDates.length - 5;
                conflictMsg = `${conflictMsg} Datas: ${datesToShow}${moreCount > 0 ? ` (e mais ${moreCount}).` : '.'}`;
            }
            return { hasConflict: true, message: conflictMsg };
        }

        // Outros erros (ex: 400 Bad Request se os dados estiverem ruins)
        const errorData = await response.json();
        return { hasConflict: true, message: `Erro de validação: ${errorData.message}` };

    } catch (error) {
        console.error("Erro no checkConflicts:", error);
        return { hasConflict: true, message: "Não foi possível verificar conflitos." };
    }
}


// --- Lógica de Confirmação (Genérico) ---

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
            `/api/Data/requests/${state.conflictingRequestId}/approve?skipConflicts=true`,
            { method: "PUT" }
          );
          //await fetchData();
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
          //await fetchData();
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


/**
 * Abre um modal de confirmação genérico.
 * @param {string} title - O título do modal.
 * @param {string} message - A mensagem de confirmação.
 * @param {function} onConfirm - A função a ser executada se o usuário confirmar.
 * @param {object} [options] - Opções extras (ex: { showForceSkip: true, requestId: 123 })
 */
function openConfirmModal(title, message, onConfirm, options = {}) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    
    const optionsEl = document.getElementById('confirm-options');
    optionsEl.innerHTML = '';
    
    // Lógica para aprovação com conflito (ex: Coordenador)
    if (options.showForceSkip) {
        optionsEl.style.display = 'block';
        optionsEl.innerHTML = `
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">Este agendamento conflita com outros. Como deseja prosseguir?</p>
            <div class="form-group">
                <label class="day-checkbox" style="flex-direction: row; gap: 8px;">
                    <input type="radio" name="approval-type" value="force" checked> 
                    <span><strong>Forçar (Substituir):</strong> Remove agendamentos conflitantes.</span>
                </label>
            </div>
            <div class="form-group">
                <label class="day-checkbox" style="flex-direction: row; gap: 8px;">
                    <input type="radio" name="approval-type" value="skip">
                    <span><strong>Pular Conflitos:</strong> Aprova somente os horários vagos.</span>
                </label>
            </div>
        `;
    } else {
        optionsEl.style.display = 'none';
    }

    const confirmBtn = document.getElementById('confirm-btn-ok');
    
    // Remove listener antigo e adiciona o novo
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.onclick = () => {
        let params = {};
        if (options.showForceSkip) {
            const selectedOption = document.querySelector('[name="approval-type"]:checked');
            if (selectedOption) {
                // O backend espera 'force' ou 'skipConflicts' como query params
                if(selectedOption.value === 'force') {
                    params['force'] = true;
                } else if (selectedOption.value === 'skip') {
                    params['skipConflicts'] = true;
                }
            }
        }
        
        onConfirm(params); // Executa a ação de confirmação com os parâmetros
        closeModalById('confirm-modal');
    };

    openModalById('confirm-modal');
}


// --- Lógica do Calendário ---

/**
 * Retorna um array de agendamentos para uma data específica,
 * respeitando o filtro global (selectedAmbienteFilter).
 */
function getReservationsForDate(date) {
  if (!date) return [];
  
  const dateStr = date.toISOString().split('T')[0];
  const reservations = [];
  
  // ATUALIZADO: Usar sempre o 'allSchedules' completo
  let scheduleSource = allSchedules;
  
  // 1. Adiciona agendamentos (únicos E recorrentes)
  if (scheduleSource[dateStr]) {
    const rooms = scheduleSource[dateStr];
    
    for (const roomId in rooms) {
      // Respeita o filtro global
      if (selectedAmbienteFilter !== '' && selectedAmbienteFilter !== roomId) {
          continue; // Pula este ambiente se não for o filtrado
      }
      
      const periods = rooms[roomId];
      const ambDetails = allAmbientesMap.get(roomId);
      
      for (const period in periods) {
        const schedule = periods[period]; // Objeto vindo do /api/Data/schedules
        
        reservations.push({
          ...schedule, // Passa (id, prof, turma, applicationUserId, recurringScheduleId)
          roomId: roomId,
          ambienteNome: ambDetails?.nome || roomId,
          categoriaIcon: ambDetails?.icon || '🏢',
          period: period,
          date: dateStr,
          // CORRIGIDO: 'isRecurring' agora é baseado no ID da série
          isRecurring: !!schedule.recurringScheduleId 
        });
      }
    }
  }
  
  // 2. O loop de 'recurringSource' foi REMOVIDO.
  // 'allSchedules' é a única fonte da verdade para o calendário.

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
  renderCalendar();
  renderDaySummary(selectedDate);
}

function renderCalendar() {
  const title = document.getElementById('calendar-title');
  if (!title) return; // Sai se a view não estiver ativa
  
  title.textContent = `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  // Headers dos dias da semana
  DAYS_OF_WEEK.forEach(day => {
    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.textContent = day;
    grid.appendChild(header);
  });

  // Calcular primeiro dia do mês e quantos dias tem
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  // Renderizar 42 dias (6 semanas)
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    
    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
    const isToday = date.toDateString() === new Date().toDateString();
    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
    
    if (!isCurrentMonth) dayElement.classList.add('other-month');
    if (isToday) dayElement.classList.add('today');
    if (isSelected) dayElement.classList.add('selected');

    // Buscar reservas para este dia (respeitando o filtro)
    const dayReservations = getReservationsForDate(date);
    const hasBlocked = dayReservations.some(r => r.isBlocked);
    
    dayElement.innerHTML = `
      <div class="day-number">${date.getDate()}</div>
      <div class="day-events">
        ${dayReservations.length > 0 ? 
            `<div class="event-dot ${hasBlocked ? 'blocked' : ''} ${dayReservations.length > 1 ? 'multiple' : ''}"></div>` : ''}
        ${dayReservations.length > 3 ? 
            `<div class="event-dot multiple"></div>` : ''}
      </div>
    `;

    dayElement.addEventListener('click', () => {
      selectedDate = new Date(date);
      renderCalendar(); // Re-renderiza calendário para destacar seleção
      renderDaySummary(selectedDate);
    });

    grid.appendChild(dayElement);
  }
}

function renderDaySummary(date) {
  const title = document.getElementById('summary-title');
  if (!title) return; // View não ativa
  
  const content = document.getElementById('summary-content');
  
  // Botão de Nova Solicitação do Sumário
  const newRequestBtn = document.getElementById('summary-new-request-btn');
  if (!date) {
      newRequestBtn.style.display = 'none';
      title.textContent = "Selecione uma data";
      content.innerHTML = `<div class="summary-empty">Clique em uma data para ver os agendamentos.</div>`;
      return;
  }
  
  const dayReservations = getReservationsForDate(date);
  
  // Mostra o botão e define o listener
  newRequestBtn.style.display = 'flex';
  // Remove listener antigo e adiciona novo para garantir a data correta
  const newBtn = newRequestBtn.cloneNode(true);
  newRequestBtn.parentNode.replaceChild(newBtn, newRequestBtn);
  newBtn.onclick = () => {
      // Abre o modal pré-preenchendo data e ambiente (se houver filtro)
      openNewReservationModal(date.toISOString().split('T')[0], null, selectedAmbienteFilter);
  };
  
  
  title.textContent = `${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
  
  if (dayReservations.length === 0) {
    content.innerHTML = `<div class="summary-empty">Nenhum agendamento para este dia.</div>`;
  } else {
      // Agrupa por período
      const groupedByPeriod = {};
      dayReservations.forEach(res => {
        if (!groupedByPeriod[res.period]) {
          groupedByPeriod[res.period] = [];
        }
        groupedByPeriod[res.period].push(res);
      });

      let html = '';
      
      // Ordena os períodos
      Object.keys(groupedByPeriod).sort().forEach(period => {
          const reservationsInPeriod = groupedByPeriod[period];
          
          reservationsInPeriod.forEach(res => {
              // ATUALIZADO: Passa 'isDaySummary: true' para o card
              html += createScheduleCard(res, {
                  showAmbiente: selectedAmbienteFilter === '', // Mostra ambiente se não estiver filtrando
                  showDate: false, // Data já está no título
                  isDaySummary: true // Flag para nova lógica de botões
              });
          });
      });
      content.innerHTML = html;
  }
}


// --- Renderização de Views (Listas) ---

function renderMyRequests() {
  const container = document.getElementById('my-requests-list');
  if (!container) return;
  
  container.innerHTML = ''; // Limpa
  
  if (allMyRequests.length === 0) {
      container.innerHTML = '<div class="empty-state-text">Você não possui solicitações pendentes.</div>';
      return;
  }
  
  allMyRequests.forEach(req => {
      container.innerHTML += createRequestCard(req, { isCoordinatorView: false });
  });
}

function renderCoordinatorRequests() {
  const container = document.getElementById('all-requests-list');
  if (!container) return;
  
  container.innerHTML = ''; // Limpa
  
  if (allCoordinatorRequests.length === 0) {
      container.innerHTML = '<div class="empty-state-text">Nenhuma solicitação pendente no sistema.</div>';
      return;
  }
  
  allCoordinatorRequests.forEach(req => {
      container.innerHTML += createRequestCard(req, { isCoordinatorView: true });
  });
}

function renderMySchedules() {
    const container = document.getElementById('my-schedules-list');
    if (!container) return;
    container.innerHTML = '';
    
    if (allMySchedules.length === 0) {
      container.innerHTML = '<div class="empty-state-text">Você não possui agendamentos futuros.</div>';
      return;
    }
    
    allMySchedules.forEach(sch => {
        container.innerHTML += createScheduleCard(sch, {
            showAmbiente: true,
            showDate: true,
            allowCancel: true
        });
    });
}

function renderMyRecurringSchedules() {
    const container = document.getElementById('my-recurring-schedules-list');
    if (!container) return;
    container.innerHTML = '';
    
    if (allMyRecurringSchedules.length === 0) {
      container.innerHTML = '<div class="empty-state-text">Você não possui agendamentos recorrentes.</div>';
      return;
    }
    
    // Usa 'allMyRecurringSchedules' que vem da API
    allMyRecurringSchedules.forEach(rec => {
        container.innerHTML += createScheduleCard(rec, {
            showAmbiente: true,
            showDate: false, // Recorrência tem datas de início/fim
            isRecurring: true,
            allowCancel: true
        });
    });
}


// --- Geração de HTML (Cards) ---

/**
 * Cria o HTML para um card de Agendamento (único ou recorrente)
 */
function createScheduleCard(sch, options = {}) {
  const { 
    showAmbiente = false, 
    showDate = false, 
    isRecurring = sch.isRecurring, // Usa o 'isRecurring' do próprio objeto se existir
    allowCancel = false,
    isDaySummary = false // ADICIONADO: Flag para o sumário do dia
  } = options;
  
  const ambDetails = allAmbientesMap.get(sch.roomId);
  const isBlocked = sch.isBlocked;
  
  let headerInfo = '';
  if (isRecurring) {
      // 'sch' pode ser um RecurringSchedule (das listas) ou um Schedule (do calendário)
      const type = sch.type || (sch.isRecurring ? 'Recorrente' : '');
      headerInfo = `
        <span class_ ="card-subtitle">${type}</span>
        <span class="card-badge recurring">${PERIOD_NAMES[sch.period] || sch.period}</span>
      `;
  } else {
      headerInfo = `<span class="card-badge period">${PERIOD_NAMES[sch.period] || sch.period}</span>`;
  }

  let bodyInfo = '';
  if (isBlocked) {
      bodyInfo = `<p><strong>BLOQUEADO</strong></p><p>${sch.blockReason || 'Motivo não informado.'}</p>`;
  } else {
      bodyInfo = `<p><strong>${sch.prof}</strong> • ${sch.turma}</p>`;
  }
  
  if (showAmbiente) {
      bodyInfo += `<p>${ambDetails?.icon || '🏢'} ${ambDetails?.nome || sch.roomId}</p>`;
  }
  
  if (showDate && sch.date) {
      bodyInfo += `<p>Data: <strong>${new Date(sch.date).toLocaleDateString('pt-BR')}</strong></p>`;
  }
  
  // Se for um RecurringSchedule (das listas)
  if (isRecurring && sch.startDate && sch.endDate) {
      bodyInfo += `
        <p>De: <strong>${new Date(sch.startDate).toLocaleDateString('pt-BR')}</strong></p>
        <p>Até: <strong>${new Date(sch.endDate).toLocaleDateString('pt-BR')}</strong></p>
        <p>Dias: <strong>${sch.type === 'weekly' && Array.isArray(sch.daysOfWeek) ? sch.daysOfWeek.map(d => DAYS_OF_WEEK[d]).join(', ') : (sch.weekdaysOnly ? 'Seg-Sex' : 'Todos os dias')}</strong></p>
      `;
  }

  // Ações
  let actions = '';
  // ATUALIZADO: Lógica de botões reescrita
  const isOwner = (currentUser && sch.applicationUserId === currentUser.id);
  const isCoord = (currentUser && currentUser.roles.includes('Coordenador'));

  if (isDaySummary && (isOwner || isCoord) && !sch.isBlocked) {
      // Lógica para o Sumário do Dia (Com botões de Série/Dia)
      actions = '<div class="card-actions">';
      if (sch.isRecurring && sch.recurringScheduleId) {
          // Botão 1: Cancelar Série (usa recurringScheduleId)
          actions += `<button class="btn-danger-outline" onclick="handleCancelRecurring(${sch.recurringScheduleId})">Cancelar Série</button>`;
          // Botão 2: Cancelar Dia (usa o 'id' da ocorrência)
          actions += `<button class="btn-danger" onclick="handleCancelSchedule(${sch.id})">Cancelar Dia</button>`;
      } else {
          // Botão Único: Cancelar (usa o 'id' da ocorrência)
          actions += `<button class="btn-danger" onclick="handleCancelSchedule(${sch.id})">Cancelar</button>`;
      }
      actions += '</div>';
      
  } else if (allowCancel && (isOwner || isCoord) && !sch.isBlocked) {
      // Lógica antiga (para as listas "Meus Agendamentos")
      // Nota: sch.id aqui é o ID da série (se recorrente) ou da ocorrência (se único)
      const cancelFn = isRecurring ? `handleCancelRecurring(${sch.id})` : `handleCancelSchedule(${sch.id})`;
      actions = `
        <div class="card-actions">
            <button class="btn-danger" onclick="${cancelFn}">Cancelar</button>
        </div>
      `;
  }


  return `
    <div class="card ${isBlocked ? 'blocked' : ''}">
      <div class="card-header">
        <div>
          <h3>${isBlocked ? 'Horário Bloqueado' : (sch.turma || 'Agendamento')}</h3>
          ${showAmbiente && !isBlocked ? `<span class="card-subtitle">${ambDetails?.nome || sch.roomId}</span>` : ''}
        </div>
        <div>
          ${headerInfo}
        </div>
      </div>
      <div class="card-body">
        ${bodyInfo}
      </div>
      ${actions}
    </div>
  `;
}

/**
 * Cria o HTML para um card de Solicitação (pendente)
 */
function createRequestCard(req, options = {}) {
  const { isCoordinatorView = false } = options;
  const ambDetails = allAmbientesMap.get(req.roomId);
  
  let dateInfo = '';
  let typeInfo = '';
  
  if (req.isRecurring) {
      typeInfo = `<span class="card-badge recurring">${req.type}</span>`;
      dateInfo = `
        <p>De: <strong>${new Date(req.startDate).toLocaleDateString('pt-BR')}</strong></p>
        <p>Até: <strong>${new Date(req.endDate).toLocaleDateString('pt-BR')}</strong></p>
        <p>Dias: <strong>${req.type === 'weekly' && req.daysOfWeek ? req.daysOfWeek.split(',').map(d => DAYS_OF_WEEK[d]).join(', ') : (req.weekdaysOnly ? 'Seg-Sex' : 'Todos os dias')}</strong></p>
      `;
  } else {
      dateInfo = `<p>Data: <strong>${new Date(req.date).toLocaleDateString('pt-BR')}</strong></p>`;
  }
  
  let actions = '';
  if (isCoordinatorView) {
      actions = `
        <div class="card-actions">
            <button class="btn-danger" onclick="handleDenyRequest(${req.id})">Recusar</button>
            <button class="btn-primary" onclick="handleApproveRequest(${req.id})">Aprovar</button>
        </div>
      `;
  } else {
      actions = `
        <div class="card-actions">
            <button class="btn-danger" onclick="handleCancelRequest(${req.id})">Cancelar Solicitação</button>
        </div>
      `;
  }

  return `
    <div class="card">
      <div class="card-header">
        <div>
          <h3>${req.turma}</h3>
          <span class="card-subtitle">${ambDetails?.nome || req.roomId}</span>
        </div>
        <div>
          ${typeInfo}
          <span class="card-badge period">${PERIOD_NAMES[req.period] || req.period}</span>
        </div>
      </div>
      <div class="card-body">
        <p>Solicitado por: <strong>${req.userFullName || req.prof}</strong></p>
        ${dateInfo}
        ${req.justification ? `<p class="card-justification">${req.justification}</p>` : ''}
      </div>
      ${actions}
    </div>
  `;
}


// --- Ações (Cancelar, Aprovar, Recusar) ---

// Usuário cancela a própria solicitação
function handleCancelRequest(id) {
    openConfirmModal(
        "Cancelar Solicitação",
        "Você tem certeza que deseja cancelar esta solicitação?",
        async () => {
            try {
                const response = await apiFetch(`/api/Data/requests/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error("Falha ao cancelar.");
                showToast("Solicitação cancelada.");
                await loadAllData();
                renderAll();
            } catch (error) {
                showToast(error.message, "error");
            }
        }
    );
}

// Coordenador recusa solicitação
function handleDenyRequest(id) {
    openConfirmModal(
        "Recusar Solicitação",
        "Você tem certeza que deseja RECUSAR esta solicitação? Esta ação é permanente.",
        async () => {
            try {
                // A rota é a mesma de cancelar
                const response = await apiFetch(`/api/Data/requests/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error("Falha ao recusar.");
                showToast("Solicitação recusada.");
                await loadAllData();
                renderAll();
            } catch (error) {
                showToast(error.message, "error");
            }
        }
    );
}

// Coordenador aprova solicitação
async function handleApproveRequest(id) {
    try {
        // Tenta aprovar sem forçar
        const response = await apiFetch(`/api/Data/requests/${id}/approve`, { method: 'PUT' });
        
        if (response.ok) {
            showToast("Solicitação aprovada!");
            await loadAllData();
            renderAll();
            return;
        }
        
        if (response.status === 409) {
            // Conflito!
            const errorData = await response.json();
            console.log("ERROR"+ errorData.message);
            // Verifica se é conflito (pelo status adicionado no apiFetch)
        let conflictMsg = errorData.message || "Conflito detectado.";
        // Formata a data na mensagem de erro
        const dateRegex = /(\d{4})-(\d{2})-(\d{2})/;
        const match = conflictMsg.match(dateRegex);
        if (match) {
          conflictMsg = conflictMsg.replace(
            dateRegex,
            `${match[3]}/${match[2]}/${match[1]}`
          );
        }
        console.log("ABREDDDDDD");
            openConflictModal(conflictMsg, id);
            // openConfirmModal(
            //     "Conflito Detectado",
            //     errorData.message || "Esta solicitação conflita com um agendamento existente.",
            //     async (params) => {
            //         // Tenta aprovar novamente com parâmetros (force=true ou skipConflicts=true)
            //         const queryString = new URLSearchParams(params).toString();
            //         try {
            //             const forceResponse = await apiFetch(`/api/Data/requests/${id}/approve?${queryString}`, { method: 'PUT' });
            //             if (!forceResponse.ok) {
            //                  const forceError = await forceResponse.json();
            //                  throw new Error(forceError.message || "Falha ao forçar aprovação.");
            //             }
            //             showToast("Solicitação aprovada (com opções)!");
            //             await loadAllData();
            //             renderAll();
            //         } catch (error) {
            //              showToast(error.message, "error");
            //         }
            //     },
            //     { showForceSkip: true } // Mostra as opções de Forçar/Pular
            // );
        } else {
             const errorData = await response.json();
             throw new Error(errorData.message || "Falha ao aprovar.");
        }

    } catch (error) {
        showToast(error.message, "error");
    }
}

// Usuário (ou Coordenador) cancela um agendamento ÚNICO
function handleCancelSchedule(id) {
    openConfirmModal(
        "Cancelar Agendamento",
        "Você tem certeza que deseja cancelar este agendamento (apenas este dia)?",
        async () => {
            try {
                const response = await apiFetch(`/api/Data/schedules/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error("Falha ao cancelar.");
                showToast("Agendamento cancelado.");
                await loadAllData();
                renderAll();
            } catch (error) {
                showToast(error.message, "error");
            }
        }
    );
}

// Usuário (ou Coordenador) cancela um agendamento RECORRENTE (a série inteira)
function handleCancelRecurring(id) {
    openConfirmModal(
        "Cancelar Agendamento Recorrente",
        "Você tem certeza que deseja cancelar TODA a série deste agendamento recorrente?",
        async () => {
            try {
                const response = await apiFetch(`/api/Data/recurring-schedules/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error("Falha ao cancelar.");
                showToast("Agendamento recorrente cancelado.");
                await loadAllData();
                renderAll();
            } catch (error) {
                showToast(error.message, "error");
            }
        }
    );
}