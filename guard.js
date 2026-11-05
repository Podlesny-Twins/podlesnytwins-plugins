/* Заглушка на время закрытой подготовки к запуску.
   Подключается первым в <head> каждой страницы: если в localStorage нет
   токена, документ гасится и браузер уходит на /guard/ ещё до отрисовки.

   Честно про уровень защиты: GitHub Pages отдаёт статику, серверной
   авторизации здесь нет в принципе. Этот скрипт останавливает человека,
   а не того, кто открыл исходник страницы. Токен — SHA-256 от
   «соль:пароль», чтобы сам пароль не лежал в репозитории строкой,
   но подбирается он по словарю за минуты. Если понадобится настоящий
   запрет — это Cloudflare Access или приватный хостинг, не этот файл. */
(function () {
  var KEY = 'pt_site_guard';
  var TOKEN = 'b14b95142810212a037dc7767f0a539ee6a562d5daec5e80de6390825dc9a4c1';
  var GUARD = '/guard/';

  var path = location.pathname;
  // Сама заглушка себя не сторожит — иначе получится цикл редиректов.
  if (path === GUARD || path === '/guard/index.html') return;

  var unlocked = false;
  // Приватный режим и отключённые куки роняют доступ к localStorage:
  // без try тут падал бы весь скрипт и guard просто не срабатывал.
  try { unlocked = localStorage.getItem(KEY) === TOKEN; } catch (e) { unlocked = false; }
  if (unlocked) return;

  // Парсер продолжает работать, пока навигация не началась: без этого
  // на секунду успевает мелькнуть шапка сайта.
  document.documentElement.style.visibility = 'hidden';
  location.replace(GUARD + '?next=' + encodeURIComponent(path + location.search + location.hash));
})();
