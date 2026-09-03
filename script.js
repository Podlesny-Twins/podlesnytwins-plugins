document.documentElement.classList.add('js');

const products = {
  /* trial: у продукта есть пробный срок, и он идёт ТРЕТЬИМ путём — не оплата и
     не бесплатная выдача. Общего с оплатой у него нет ничего, кроме диалога;
     общее с бесплатной выдачей — форма: имя, почта и два раздельных согласия. */
  ricochet: { title: 'Ricochet', price: 2499, trial: 14 },
  faraway: { title: 'Faraway', price: 2499, trial: 14 },
  combo: { title: 'Faraway + Ricochet', price: 3999 },
  /* Бесплатный продукт идёт по другому эндпоинту и не уходит в банк: там не
     платёж на ноль рублей, а согласия и ссылка. Флаг здесь — единственное, что
     отличает две ветки ниже; всё остальное в диалоге общее. */
  cutter: { title: 'Cutter', free: true }
};

document.querySelectorAll('.reveal').forEach((el) => {
  if (!('IntersectionObserver' in window)) { el.classList.add('visible'); return; }
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { el.classList.add('visible'); observer.disconnect(); }
  }, { threshold: .15 });
  observer.observe(el);
  window.setTimeout(() => el.classList.add('visible'), 1200);
});

const API_BASE = 'https://api.podlesnytwins.com';
const dialog = document.getElementById('checkout');
const form = document.getElementById('checkout-form');

if (dialog && form) {
  const errorBox = form.querySelector('.checkout-error');
  const submit = form.querySelector('.checkout-submit');
  const submitLabel = submit.textContent;
  const productInput = form.elements.product;
  const clearError = () => {
    errorBox.hidden = true; errorBox.textContent = '';
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  };
  const showError = (message) => { errorBox.textContent = message; errorBox.hidden = false; };

  /* Режим диалога живёт здесь, а не в разметке: одна форма на три пути, и то,
     какой из них выбран, решает нажатая кнопка. */
  let mode = 'buy';
  /* Ищем по ДИАЛОГУ, а не по форме: вводная строка и заголовок лежат вне
     <form>, и поиск внутри неё оставлял на экране обещание «после оплаты» над
     формой, которая ничего не спишет (поймано 2026-09-03). */
  const buyBlocks = () => dialog.querySelectorAll('.checkout-buy');
  const trialBlocks = () => dialog.querySelectorAll('.checkout-trial');
  const setMode = (next) => {
    mode = next;
    buyBlocks().forEach((el) => { el.hidden = next !== 'buy'; });
    trialBlocks().forEach((el) => { el.hidden = next !== 'trial'; });
    /* Поле «принимаю оферту» обязательно только на пути оплаты: обязательное и
       СПРЯТАННОЕ поле не даёт браузеру отправить форму и не говорит почему. */
    const offer = form.elements.consent;
    if (offer) offer.required = next === 'buy';
    /* Надпись на кнопке — часть обещания. «Перейти к оплате» на форме, которая
       ничего не спишет, читается как ловушка. */
    submit.textContent = next === 'buy' ? submitLabel : 'Скачать демо';
  };

  document.querySelectorAll('[data-checkout], [data-trial]').forEach((button) => {
    button.addEventListener('click', () => {
      const wanted = button.dataset.trial || button.dataset.checkout;
      const product = products[wanted] ? wanted : productInput.value;
      productInput.value = product;
      const item = products[product];
      setMode(button.dataset.trial ? 'trial' : (item.free ? 'free' : 'buy'));
      document.getElementById('checkout-title').textContent =
        button.dataset.trial ? `${item.title} · ${item.trial} дней бесплатно`
        : item.free ? `${item.title} · бесплатно` : `${item.title} — ${item.price} ₽`;
      clearError();
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
        window.setTimeout(() => form.elements.name.focus(), 60);
      }
    });
  });
  dialog.querySelectorAll('[data-checkout-close]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

  form.addEventListener('submit', async (event) => {
    event.preventDefault(); clearError();
    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    if (name.length < 2) { form.elements.name.setAttribute('aria-invalid', 'true'); form.elements.name.focus(); return showError(products[productInput.value] && products[productInput.value].free ? 'Укажите имя — так письмо не будет безличным.' : 'Укажите имя для лицензии.'); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { form.elements.email.setAttribute('aria-invalid', 'true'); form.elements.email.focus(); return showError('Проверьте адрес почты.'); }
    const free = products[productInput.value] && products[productInput.value].free;

    if (mode === 'trial') {
      const personal = form.elements.consent_personal;
      const marketing = form.elements.consent_marketing;
      /* Диалог без полей согласия — это чужая страница (главная), куда кнопку
         триала поставили ссылкой. Согласие нельзя получить молча, поэтому
         вместо запроса уводим человека на страницу продукта с настоящей формой. */
      if (!personal || !marketing) { window.location.href = `/${productInput.value}/`; return; }
      if (!personal.checked) { personal.focus(); return showError('Без согласия на обработку данных мы не можем даже сохранить адрес.'); }
      if (!marketing.checked) { marketing.focus(); return showError('Отметьте согласие на письма — ссылку мы присылаем на почту.'); }
      submit.disabled = true; submit.textContent = 'Готовим ссылки…';
      try {
        const response = await fetch(`${API_BASE}/api/trial`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: productInput.value, email, name,
            consent_personal: true, consent_marketing: true
          })
        });
        if (!response.ok) throw new Error(response.status === 503 ? 'Ссылки на скачивание ещё не готовы. Напишите нам на plugins@podlesnytwins.com.' : 'Не удалось получить ссылку. Попробуйте ещё раз.');
        const data = await response.json();
        const links = Array.isArray(data.downloads) ? data.downloads : [];
        if (!links.length) throw new Error('Сервер не вернул ссылку. Напишите нам на plugins@podlesnytwins.com.');
        const done = dialog.querySelector('.checkout-done');
        const box = done.querySelector('.checkout-links');
        box.textContent = '';
        links.forEach((item) => {
          const link = document.createElement('a');
          link.className = 'btn btn-amber btn-large checkout-link';
          link.href = item.url; link.rel = 'noopener';
          link.textContent = `Скачать для ${item.label}`;
          box.appendChild(link);
        });
        form.hidden = true; done.hidden = false;
      } catch (error) {
        showError(error.message);
      } finally {
        submit.disabled = false;
        submit.textContent = 'Скачать демо';
      }
      return;
    }

    if (free) {
      const personal = form.elements.consent_personal;
      const marketing = form.elements.consent_marketing;
      /* Диалог без полей согласия — это чужая страница (главная, платный
         продукт), куда кнопку бесплатного продукта поставили по ошибке.
         Согласие нельзя получить молча, поэтому вместо запроса уводим человека
         на страницу продукта, где форма настоящая. */
      if (!personal || !marketing) { window.location.href = `/${productInput.value}/`; return; }
      if (!personal.checked) { personal.focus(); return showError('Без согласия на обработку данных мы не можем даже сохранить адрес.'); }
      if (!marketing.checked) { marketing.focus(); return showError('Отметьте согласие на письма — ссылку мы присылаем на почту.'); }
      submit.disabled = true; submit.textContent = 'Готовим ссылки…';
      try {
        const response = await fetch(`${API_BASE}/api/free`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: productInput.value, email, name,
            consent_personal: true, consent_marketing: true
          })
        });
        if (!response.ok) throw new Error(response.status === 503 ? 'Ссылки на скачивание ещё не готовы. Напишите нам на plugins@podlesnytwins.com.' : 'Не удалось получить ссылку. Попробуйте ещё раз.');
        const data = await response.json();
        const links = Array.isArray(data.downloads) ? data.downloads : [];
        if (!links.length) throw new Error('Сервер не вернул ссылку. Напишите нам на plugins@podlesnytwins.com.');
        const done = dialog.querySelector('.checkout-done');
        const box = done.querySelector('.checkout-links');
        box.textContent = '';
        links.forEach((item) => {
          const link = document.createElement('a');
          link.className = 'btn btn-amber btn-large checkout-link';
          link.href = item.url; link.rel = 'noopener';
          link.textContent = `Скачать для ${item.label}`;
          box.append(link);
        });
        form.hidden = true; done.hidden = false;
        done.querySelector('.checkout-link').focus();
      } catch (error) {
        showError(error instanceof TypeError ? 'Не удалось связаться с сервером. Проверьте соединение.' : error.message);
        submit.disabled = false; submit.textContent = submitLabel;
      }
      return;
    }

    if (!form.elements.consent.checked) { form.elements.consent.focus(); return showError('Примите публичную оферту, чтобы продолжить.'); }
    submit.disabled = true; submit.textContent = 'Готовим оплату…';
    try {
      const response = await fetch(`${API_BASE}/api/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: productInput.value, email, name })
      });
      if (!response.ok) throw new Error(response.status === 503 ? 'Оплата временно недоступна. Напишите нам на plugins@podlesnytwins.com.' : 'Не удалось создать платёж. Попробуйте ещё раз.');
      const data = await response.json();
      if (!data.url) throw new Error('Сервис оплаты не вернул ссылку. Напишите нам на plugins@podlesnytwins.com.');
      window.location.href = data.url;
    } catch (error) {
      showError(error instanceof TypeError ? 'Не удалось связаться с сервисом оплаты. Проверьте соединение.' : error.message);
      submit.disabled = false; submit.textContent = submitLabel;
    }
  });
}

/* Меню демо раскрывается силами <details>. Здесь только то, чего разметка не
   умеет: Esc, клик мимо и одно открытое меню на странице. Без этого блока
   меню всё равно работает. */
const demos = document.querySelectorAll('details.demo');
if (demos.length) {
  demos.forEach((demo) => {
    demo.addEventListener('toggle', () => {
      if (!demo.open) return;
      demos.forEach((other) => { if (other !== demo) other.open = false; });
    });
  });

  document.addEventListener('click', (event) => {
    demos.forEach((demo) => { if (demo.open && !demo.contains(event.target)) demo.open = false; });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    // диалог оплаты закрывается по Esc сам — не отбираем у него нажатие
    if (document.querySelector('dialog[open]')) return;
    demos.forEach((demo) => {
      if (!demo.open) return;
      demo.open = false;
      if (demo.contains(document.activeElement)) demo.querySelector('summary').focus();
    });
  });
}

/* Кнопка «14 дней» в шапке главной. Якорь довозит до панелей продуктов, но
   пустой скролл — половина действия: сразу раскрываем первое меню демо, чтобы
   выбор платформы был на экране, а не ещё одним касанием ниже.
   Ждём окончания плавного скролла: scrollend там, где он есть, иначе таймаут. */
document.querySelectorAll('[data-open-demo]').forEach((link) => {
  link.addEventListener('click', () => {
    const first = document.querySelector('details.demo');
    if (!first) return;
    const open = () => { first.open = true; };
    if ('onscrollend' in window) {
      window.addEventListener('scrollend', open, { once: true });
      setTimeout(open, 1200);
    } else {
      setTimeout(open, 600);
    }
  });
});

const buybar = document.querySelector('.buybar');
const heroActions = document.querySelector('.hero-actions');
const pricing = document.getElementById('pricing');
if (buybar && heroActions && 'IntersectionObserver' in window) {
  const visible = { hero: true, pricing: false };
  const sync = () => { buybar.hidden = false; buybar.classList.toggle('is-shown', !visible.hero && !visible.pricing); };
  new IntersectionObserver(([entry]) => { visible.hero = entry.isIntersecting; sync(); }).observe(heroActions);
  if (pricing) new IntersectionObserver(([entry]) => { visible.pricing = entry.isIntersecting; sync(); }).observe(pricing);
}
