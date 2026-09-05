/* Личный кабинет.
   Сайт статический, поэтому вся правда живёт на api.podlesnytwins.com, а здесь —
   только отрисовка. Сессия в HttpOnly-куке: JS её не видит и не может отдать,
   что и есть смысл HttpOnly. Отсюда credentials: 'include' в каждом запросе. */

const API = 'https://api.podlesnytwins.com';

const panes = {
  login: document.getElementById('pane-login'),
  maglink: document.getElementById('pane-maglink'),
  sent: document.getElementById('pane-sent'),
  account: document.getElementById('pane-account'),
  expired: document.getElementById('pane-expired')
};

const logoutBtn = document.querySelector('.account-logout');

function show(name) {
  Object.entries(panes).forEach(([key, el]) => { el.hidden = key !== name; });
  logoutBtn.hidden = name !== 'account';
}

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  return res;
}

/* --- вход ---------------------------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const loginForm = document.getElementById('login-form');
const loginError = loginForm.querySelector('.checkout-error');
const maglinkForm = document.getElementById('maglink-form');
const maglinkError = maglinkForm.querySelector('.checkout-error');

// Вход по паролю.
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;

  const email = loginForm.elements.email.value.trim();
  const password = loginForm.elements.password.value;

  if (!EMAIL_RE.test(email) || !password) {
    loginError.textContent = 'Введите почту и пароль.';
    loginError.hidden = false;
    return;
  }

  const btn = loginForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Входим…';

  try {
    const res = await api('/api/account/login-password', {
      method: 'POST', body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      loginForm.elements.password.value = '';
      await load();
    } else {
      // Сервер намеренно не различает «нет такой почты» и «пароль не тот» —
      // повторяем это и здесь, иначе смысл теряется.
      loginError.textContent = 'Неверная почта или пароль. Если пароль ещё не задавали — войдите по ссылке на почту.';
      loginError.hidden = false;
    }
  } catch {
    loginError.textContent = 'Не удалось связаться с сервером. Попробуйте позже.';
    loginError.hidden = false;
  }

  btn.disabled = false;
  btn.textContent = 'Войти';
});

// Вход по одноразовой ссылке: первый вход и восстановление.
maglinkForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  maglinkError.hidden = true;

  const email = maglinkForm.elements.email.value.trim();
  if (!EMAIL_RE.test(email)) {
    maglinkError.textContent = 'Проверьте адрес почты.';
    maglinkError.hidden = false;
    return;
  }

  const btn = maglinkForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Отправляем…';

  try {
    await api('/api/account/login', { method: 'POST', body: JSON.stringify({ email }) });
    show('sent');
  } catch {
    maglinkError.textContent = 'Не удалось связаться с сервером. Попробуйте позже.';
    maglinkError.hidden = false;
  }

  btn.disabled = false;
  btn.textContent = 'Прислать ссылку';
});

document.getElementById('want-link').addEventListener('click', () => {
  maglinkForm.elements.email.value = loginForm.elements.email.value;
  show('maglink');
});
document.getElementById('want-password').addEventListener('click', () => show('login'));
document.getElementById('retry-btn').addEventListener('click', () => show('maglink'));

/* --- пароль -------------------------------------------------------------- */

const passwordForm = document.getElementById('password-form');
const passwordError = passwordForm.querySelector('.checkout-error');
const passwordOk = passwordForm.querySelector('.account-ok');
let minPassword = 10;

passwordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  passwordError.hidden = true;
  passwordOk.hidden = true;

  const password = passwordForm.elements.password.value;
  if (password.length < minPassword) {
    passwordError.textContent = `Пароль должен быть не короче ${minPassword} символов.`;
    passwordError.hidden = false;
    return;
  }

  const btn = passwordForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Сохраняем…';

  const res = await api('/api/account/password', {
    method: 'POST', body: JSON.stringify({ password })
  });

  if (res.ok) {
    passwordForm.elements.password.value = '';
    passwordOk.textContent = 'Пароль сохранён. Остальные сессии завершены — на других устройствах нужно войти заново.';
    passwordOk.hidden = false;
    document.getElementById('password-title').textContent = 'Пароль.';
    document.getElementById('password-lead').textContent = 'Пароль задан. Здесь его можно сменить.';
  } else {
    passwordError.textContent = 'Не удалось сохранить пароль. Попробуйте ещё раз.';
    passwordError.hidden = false;
  }

  btn.disabled = false;
  btn.textContent = 'Сохранить пароль';
});

/* --- содержимое ---------------------------------------------------------- */

function deviceRow(purchase, device, limit) {
  const row = document.createElement('div');
  row.className = 'device';

  const seen = new Date(device.last_seen).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const info = document.createElement('div');
  const label = device.name || `Устройство ${device.id}`;
  const title = document.createElement('b');
  title.textContent = label;
  const meta = document.createElement('span');
  meta.textContent = `${device.id} · последний раз: ${seen}`;
  info.append(title, meta);

  const btn = document.createElement('button');
  btn.className = 'btn btn-secondary btn-small';
  btn.type = 'button';
  btn.textContent = 'Отвязать';
  btn.addEventListener('click', async () => {
    const confirmed = window.confirm(
      `Отвязать «${label}»?\n\n` +
      'Освободится одно место активации. Покупка и файл лицензии останутся действующими.'
    );
    if (!confirmed) return;
    btn.disabled = true;
    btn.textContent = 'Отвязываем…';
    const res = await api('/api/account/device/release', {
      method: 'POST',
      body: JSON.stringify({
        order: purchase.order, product: purchase.product, device: device.id
      })
    });
    if (res.ok) {
      load();
    } else {
      btn.disabled = false;
      btn.textContent = 'Не вышло, ещё раз';
    }
  });

  row.append(info, btn);
  return row;
}

function purchaseCard(p, limit) {
  const card = document.createElement('article');
  card.className = 'purchase';

  const head = document.createElement('div');
  head.className = 'purchase-head';
  head.innerHTML = `<h2>${p.title}</h2><span class="purchase-order">заказ ${p.order}</span>`;

  const actions = document.createElement('div');
  actions.className = 'status-actions';

  const lic = document.createElement('a');
  lic.className = 'btn btn-primary btn-small';
  lic.href = `${API}/api/account/license?product=${encodeURIComponent(p.product)}`;
  lic.textContent = 'Скачать файл лицензии';
  actions.append(lic);

  const downloads = Array.isArray(p.downloads) && p.downloads.length
    ? p.downloads
    : (p.download ? [{ label: '', url: p.download }] : []);
  downloads.forEach((download) => {
    const dl = document.createElement('a');
    dl.className = 'btn btn-secondary btn-small';
    dl.href = download.url;
    dl.rel = 'noopener';
    dl.textContent = download.label
      ? `Скачать для ${download.label}`
      : 'Скачать установщик';
    actions.append(dl);
  });

  const install = document.createElement('p');
  install.className = 'muted-note';
  install.innerHTML =
    'При первой установке система покажет предупреждение: установщик не подписан '
    + 'сертификатом разработчика. Это ожидаемо и на работу плагина не влияет.<br>'
    + '<b>macOS:</b> если двойной клик не открывает пакет — System Settings → '
    + 'Privacy &amp; Security → пролистать вниз до имени файла → «Открыть всё равно».<br>'
    + '<b>Windows:</b> в окне SmartScreen нажать «Подробнее» → «Выполнить в любом случае».';

  const devHead = document.createElement('p');
  devHead.className = 'devices-head';
  devHead.textContent = p.devices.length
    ? `Занято мест: ${p.devices.length} из ${limit}`
    : `Места активации свободны: ${limit}`;

  card.append(head, actions, install, devHead);
  p.devices.forEach((d) => card.append(deviceRow(p, d, limit)));

  if (p.devices.length) {
    const note = document.createElement('p');
    note.className = 'muted-note';
    note.textContent = 'Отвязка освобождает место для нового устройства. Она не удаляет установщик или файл лицензии с прежней машины.';
    card.append(note);
  }

  return card;
}

async function load() {
  const res = await api('/api/account/me');
  if (res.status === 401) { show('login'); return false; }
  if (!res.ok) { show('login'); return false; }

  const data = await res.json();
  document.querySelector('.account-email').textContent = data.email;
  document.getElementById('marketing-toggle').checked = Boolean(data.marketing);

  minPassword = data.min_password || 10;
  document.getElementById('password-title').textContent = data.has_password ? 'Пароль.' : 'Задайте пароль.';
  document.getElementById('password-lead').textContent = data.has_password
    ? 'Пароль задан. Здесь его можно сменить.'
    : 'Пароль ещё не задан — сейчас вход только по ссылке на почту. Задайте, чтобы входить сразу.';

  const box = document.getElementById('purchases');
  box.textContent = '';
  if (!data.purchases.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Покупок на этом адресе нет.';
    box.append(empty);
  } else {
    data.purchases.forEach((p) => box.append(purchaseCard(p, data.device_limit)));
  }

  show('account');
  return data;
}

/* --- письма о новых версиях ---------------------------------------------- */

const marketingToggle = document.getElementById('marketing-toggle');
const marketingError = document.querySelector('#updates .checkout-error');

marketingToggle.addEventListener('change', async () => {
  marketingError.hidden = true;
  const wanted = marketingToggle.checked;
  marketingToggle.disabled = true;
  try {
    const res = await api('/api/account/marketing', {
      method: 'POST', body: JSON.stringify({ enabled: wanted })
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    marketingToggle.checked = Boolean(data.marketing);
  } catch (e) {
    // Возвращаем как было: галочка не должна обещать то, чего сервер не записал.
    marketingToggle.checked = !wanted;
    marketingError.textContent = 'Не удалось сохранить. Попробуйте ещё раз.';
    marketingError.hidden = false;
  } finally {
    marketingToggle.disabled = false;
  }
});

function spotlightUpdates() {
  const box = document.getElementById('updates');
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  box.classList.add('attention');
  window.setTimeout(() => box.classList.remove('attention'), 1600);
}

/* --- данные и удаление ---------------------------------------------------- */

document.getElementById('export-btn').addEventListener('click', () => {
  window.location.href = `${API}/api/account/export`;
});

document.getElementById('erase-btn').addEventListener('click', async () => {
  const ok = window.confirm(
    'Удалить аккаунт?\n\n' +
    'Будут стёрты: доступ в кабинет, список устройств, все сессии.\n' +
    'Сведения о сделке мы обязаны хранить 5 лет по налоговому законодательству — ' +
    'после этого срока они уничтожаются автоматически.\n\n' +
    'Уже скачанные лицензии продолжат работать.'
  );
  if (!ok) return;

  const res = await api('/api/account/erase', { method: 'POST' });
  if (!res.ok) return;
  const data = await res.json();

  const note = document.querySelector('.account-erase-note');
  note.textContent = `Аккаунт удалён. Сведения о сделке хранятся до ${new Date(data.records_until).toLocaleDateString('ru-RU')}, затем уничтожаются.`;
  note.hidden = false;
  document.getElementById('purchases').textContent = '';
});

logoutBtn.addEventListener('click', async () => {
  await api('/api/account/logout', { method: 'POST' });
  show('login');
});

/* --- вход по ссылке из письма --------------------------------------------- */

(async () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('t');

  if (token) {
    // Токен убираем из адресной строки сразу: он одноразовый, но истории
    // браузера, реферерам и скриншотам его знать незачем.
    window.history.replaceState({}, '', window.location.pathname);
    const res = await api('/api/account/session', {
      method: 'POST', body: JSON.stringify({ token })
    });
    if (res.ok) {
      const me = await load();
      // Пришёл по ссылке из письма (чаще всего — подарочного) и рассылку ещё
      // не включал: показываем ему ровно тот блок, ради которого звали.
      if (me && !me.marketing) spotlightUpdates();
      return;
    }
    show('expired');
    return;
  }

  if (!(await load())) show('login');
})();
