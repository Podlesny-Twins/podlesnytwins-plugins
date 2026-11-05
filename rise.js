// Один авторский момент на всю страницу: имя и предмет выходят из-под кромки
// экрана один раз, когда до них доезжают. Ничего больше не двигается.
//
// Почему JS, а не CSS animation-timeline: на момент правки scroll-driven
// animations не умеют Safari и Firefox, а это браузеры половины тех, кому мы
// эти плагины отдаём. IntersectionObserver умеют все.
//
// Уважение к prefers-reduced-motion живёт в CSS: класс .rise получает
// начальное смещение ТОЛЬКО внутри @media (prefers-reduced-motion:
// no-preference). При выключенной анимации разметка остаётся на месте, даже
// если этот файл не загрузился вовсе — поэтому страница не зависит от скрипта.
(() => {
  const parts = [];
  document.querySelectorAll('.item').forEach((item) => {
    const head = item.querySelector('.item-head');
    const body = item.querySelector('.plinth, .note');
    if (head) parts.push([item, head, false]);
    if (body) parts.push([item, body, true]);
  });
  if (!parts.length) return;

  parts.forEach(([, el, late]) => {
    el.classList.add('rise');
    if (late) el.classList.add('rise--late');
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('shown');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });

  parts.forEach(([, el]) => io.observe(el));
})();
