<!DOCTYPE html>
<html lang="ca">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Don't Lose Your Wings (DLYW)</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <style>
    body {
      background-color: #fdf6f6;
      color: #2b2627;
    }
    .navbar-dlyw {
      background-color: #f3c6c6;
    }
    .btn-dlyw {
      background-color: #e5989b;
      border-color: #e5989b;
      color: #1f1b1c;
      font-weight: 600;
    }
    .btn-dlyw:hover {
      background-color: #d98286;
      border-color: #d98286;
      color: #1f1b1c;
    }
  </style>
</head>
<body>
  <nav class="navbar navbar-dlyw px-3 py-2 mb-4">
    <div class="container">
      <span class="navbar-brand mb-0 h1 fw-bold">Don't Lose Your Wings</span>
      <div id="nav-user" class="d-none align-items-center gap-2">
        <span id="user-email" class="small fw-semibold d-none d-sm-inline"></span>
        <button id="btn-logout" type="button" class="btn btn-sm btn-outline-dark">Sortir</button>
      </div>
    </div>
  </nav>

  <main class="container pb-5" style="max-width: 900px;">
    <div id="alert-box" class="alert d-none" role="alert"></div>

    <!-- VISTA 1: AUTENTICACIÓ -->
    <section id="auth-view" class="card border-0 shadow-sm p-4 rounded-4 mx-auto" style="max-width: 540px;">
      <h1 class="h4 mb-1">Benvinguda i benvingut a DLYW</h1>
      <p class="text-muted small mb-4">
        Centralitza els teus viatges, allotjaments i llocs per visitar en un sol lloc[cite: 4].
      </p>

      <div class="mb-3">
        <label for="auth-nom" class="form-label">Nom (només per registrar-se)</label>
        <input id="auth-nom" type="text" class="form-control" placeholder="Ex. Laia" />
      </div>
      <div class="mb-3">
        <label for="auth-email" class="form-label">Correu electrònic</label>
        <input id="auth-email" type="email" class="form-control" required placeholder="correu@exemple.cat" />
      </div>
      <div class="mb-4">
        <label for="auth-password" class="form-label">Contrasenya (mínim 8 caràcters)</label>
        <input id="auth-password" type="password" class="form-control" required minlength="8" />
      </div>

      <div class="d-flex flex-wrap gap-2">
        <button id="btn-login" type="button" class="btn btn-dlyw">Iniciar sessió</button>
        <button id="btn-register" type="button" class="btn btn-outline-secondary">Registrar-se</button>
      </div>
    </section>

    <!-- VISTA 2: ELS MEUS VIATGES -->
    <section id="app-view" class="d-none">
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 id="welcome-title" class="h3 mb-1">Hola!</h1>
          <p class="text-muted small mb-0">Gestiona els teus viatges programats[cite: 5].</p>
        </div>
        <button id="btn-toggle-form" type="button" class="btn btn-dlyw">+ Nou viatge</button>
      </div>

      <!-- Cercador per destinació -->
      <div class="card border-0 shadow-sm p-3 rounded-4 mb-4">
        <div class="row g-2 align-items-center">
          <div class="col-sm-9">
            <label for="search-destinacio" class="visually-hidden">Cerca per destinació</label>
            <input id="search-destinacio" type="text" class="form-control" placeholder="Cerca per destinació (ex. Lisboa, Roma)..." />
          </div>
          <div class="col-sm-3 d-grid">
            <button id="btn-clear-search" type="button" class="btn btn-outline-secondary">Netejar</button>
          </div>
        </div>
      </div>

      <!-- Formulari Crear / Editar viatge -->
      <div id="viatge-form-card" class="card border-0 shadow-sm p-4 rounded-4 mb-4 d-none">
        <h2 id="form-title" class="h5 mb-3">Nou viatge</h2>
        <form id="viatge-form" novalidate>
          <input type="hidden" id="viatge-id" />
          <div class="row g-3">
            <div class="col-md-6">
              <label for="viatge-titol" class="form-label">Títol del viatge</label>
              <input id="viatge-titol" type="text" class="form-control" maxlength="150" required placeholder="Ex. Lisboa amb la colla" />
            </div>
            <div class="col-md-6">
              <label for="viatge-destinacio" class="form-label">Destinació</label>
              <input id="viatge-destinacio" type="text" class="form-control" maxlength="150" required placeholder="Ex. Lisboa" />
            </div>
            <div class="col-md-6">
              <label for="viatge-data-inici" class="form-label">Data inicial</label>
              <input id="viatge-data-inici" type="date" class="form-control" required />
            </div>
            <div class="col-md-6">
              <label for="viatge-data-fi" class="form-label">Data final</label>
              <input id="viatge-data-fi" type="date" class="form-control" required />
            </div>
          </div>
          <div class="d-flex gap-2 mt-4">
            <button type="submit" class="btn btn-dlyw">Desar viatge</button>
            <button id="btn-cancel-form" type="button" class="btn btn-outline-secondary">Cancel·lar</button>
          </div>
        </form>
      </div>

      <!-- Llistat dinàmic de viatges -->
      <div id="viatges-list" class="row g-3"></div>
    </section>
  </main>

  <script type="module">
    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

    const SUPABASE_URL = 'https://dlhbjxkhwtxploxnkbxc.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_AWirKMAydblzImSNJM8FHg_KzQujgZ_';

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');
    const navUser = document.getElementById('nav-user');
    const userEmailEl = document.getElementById('user-email');
    const welcomeTitle = document.getElementById('welcome-title');
    const alertBox = document.getElementById('alert-box');
    const viatgesList = document.getElementById('viatges-list');
    const formCard = document.getElementById('viatge-form-card');
    const viatgeForm = document.getElementById('viatge-form');
    const formTitle = document.getElementById('form-title');
    const searchInput = document.getElementById('search-destinacio');

    let currentSession = null;
    let viatgesCache = [];

    function showAlert(message, type = 'danger') {
      alertBox.textContent = message;
      alertBox.className = `alert alert-${type}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function hideAlert() {
      alertBox.className = 'alert d-none';
      alertBox.textContent = '';
    }

    function openForm(viatge = null) {
      hideAlert();
      formCard.classList.remove('d-none');
      if (viatge) {
        formTitle.textContent = 'Editar viatge';
        document.getElementById('viatge-id').value = viatge.id;
        document.getElementById('viatge-titol').value = viatge.titol;
        document.getElementById('viatge-destinacio').value = viatge.destinacio;
        document.getElementById('viatge-data-inici').value = viatge.data_inicial;
        document.getElementById('viatge-data-fi').value = viatge.data_final;
      } else {
        formTitle.textContent = 'Nou viatge';
        viatgeForm.reset();
        document.getElementById('viatge-id').value = '';
      }
    }

    function closeForm() {
      formCard.classList.add('d-none');
      viatgeForm.reset();
      document.getElementById('viatge-id').value = '';
    }

    async function apiRequest(method, path, body = null) {
      const token = currentSession?.access_token;
      if (!token) throw new Error('Cal iniciar sessió.');

      const opts = {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      if (body) opts.body = JSON.stringify(body);

      const resp = await fetch(path, opts);
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || 'S’ha produït un error en la petició.');
      return data;
    }

    function renderViatges(items) {
      viatgesList.innerHTML = '';

      if (!items.length) {
        viatgesList.innerHTML = `
          <div class="col-12">
            <div class="card border-0 shadow-sm p-4 rounded-4 text-center text-muted">
              Encara no hi ha cap viatge per mostrar. Crea’n un amb el botó <strong>+ Nou viatge</strong>.
            </div>
          </div>`;
        return;
      }

      for (const v of items) {
        const col = document.createElement('div');
        col.className = 'col-md-6';

        const card = document.createElement('div');
        card.className = 'card border-0 shadow-sm p-3 rounded-4 h-100';

        const title = document.createElement('h3');
        title.className = 'h5 mb-1';
        title.textContent = v.titol;

        const meta = document.createElement('p');
        meta.className = 'text-muted small mb-3';
        meta.textContent = `${v.destinacio} · ${v.data_inicial} → ${v.data_final}`;

        const actions = document.createElement('div');
        actions.className = 'd-flex gap-2 mt-auto';

        const btnEdit = document.createElement('button');
        btnEdit.type = 'button';
        btnEdit.className = 'btn btn-sm btn-outline-dark';
        btnEdit.textContent = 'Editar';
        btnEdit.addEventListener('click', () => openForm(v));

        const btnDelete = document.createElement('button');
        btnDelete.type = 'button';
        btnDelete.className = 'btn btn-sm btn-outline-danger';
        btnDelete.textContent = 'Eliminar';
        btnDelete.addEventListener('click', () => deleteViatge(v));

        actions.append(btnEdit, btnDelete);
        card.append(title, meta, actions);
        col.append(card);
        viatgesList.append(col);
      }
    }

    async function loadViatges() {
      try {
        const filtro = encodeURIComponent(searchInput.value.trim());
        const query = filtro ? `?destinacio=${filtro}` : '';
        viatgesCache = await apiRequest('GET', `/api/viatges${query}`);
        renderViatges(viatgesCache);
      } catch (err) {
        showAlert(err.message);
      }
    }

    async function deleteViatge(viatge) {
      hideAlert();
      const confirmed = window.confirm(`Segur que vols eliminar el viatge "${viatge.titol}"? També s’eliminaran els seus allotjaments i llocs.`);
      if (!confirmed) return;

      try {
        await apiRequest('DELETE', `/api/viatges?id=${encodeURIComponent(viatge.id)}`);
        showAlert('Viatge eliminat correctament.', 'success');
        await loadViatges();
      } catch (err) {
        showAlert(err.message);
      }
    }

    viatgeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const id = document.getElementById('viatge-id').value;
      const titol = document.getElementById('viatge-titol').value.trim();
      const destinacio = document.getElementById('viatge-destinacio').value.trim();
      const data_inicial = document.getElementById('viatge-data-inici').value;
      const data_final = document.getElementById('viatge-data-fi').value;

      if (!titol || !destinacio || !data_inicial || !data_final) {
        return showAlert('Cal omplir tots els camps del viatge.');
      }
      if (data_final < data_inicial) {
        return showAlert('La data final ha de ser igual o posterior a la data inicial.');
      }

      try {
        if (id) {
          await apiRequest('PUT', '/api/viatges', { id, titol, destinacio, data_inicial, data_final });
          showAlert('Viatge actualitzat correctament.', 'success');
        } else {
          await apiRequest('POST', '/api/viatges', { titol, destinacio, data_inicial, data_final });
          showAlert('Viatge creat correctament.', 'success');
        }
        closeForm();
        await loadViatges();
      } catch (err) {
        showAlert(err.message);
      }
    });

    document.getElementById('btn-toggle-form').addEventListener('click', () => openForm());
    document.getElementById('btn-cancel-form').addEventListener('click', closeForm);
    searchInput.addEventListener('input', () => loadViatges());
    document.getElementById('btn-clear-search').addEventListener('click', () => {
      searchInput.value = '';
      loadViatges();
    });

    function updateUI(session) {
      currentSession = session;
      if (session?.user) {
        authView.classList.add('d-none');
        appView.classList.remove('d-none');
        navUser.classList.remove('d-none');
        navUser.classList.add('d-flex');
        userEmailEl.textContent = session.user.email;
        const nom = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
        welcomeTitle.textContent = `Hola, ${nom}!`;
        loadViatges();
      } else {
        appView.classList.add('d-none');
        navUser.classList.add('d-none');
        navUser.classList.remove('d-flex');
        authView.classList.remove('d-none');
        userEmailEl.textContent = '';
        closeForm();
      }
    }

    document.getElementById('btn-register').addEventListener('click', async () => {
      hideAlert();
      const nom = document.getElementById('auth-nom').value.trim();
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;

      if (password.length < 8) {
        return showAlert('La contrasenya ha de tenir com a mínim 8 caràcters.');
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: nom || email.split('@')[0] } }
      });

      if (error) return showAlert(error.message);
      showAlert('Registre completat! Ja pots iniciar sessió.', 'success');
    });

    document.getElementById('btn-login').addEventListener('click', async () => {
      hideAlert();
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return showAlert('Credencials incorrectes o compte no verificat.');
      updateUI(data.session);
    });

    document.getElementById('btn-logout').addEventListener('click', async () => {
      hideAlert();
      await supabase.auth.signOut();
      updateUI(null);
    });

    const { data: { session } } = await supabase.auth.getSession();
    updateUI(session);

    supabase.auth.onAuthStateChange((_event, currentSession) => {
      updateUI(currentSession);
    });
  </script>
</body>
</html>
