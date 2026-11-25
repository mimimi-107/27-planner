/* =========================================================
   MONTHLY PLANNER — offline service worker
   Cache-first with stale-while-revalidate, same-origin only:
   Google Identity / Calendar / Drive / Docs requests always go
   straight to the network.
   Bump CACHE when the shell changes so old copies are dropped.
   ========================================================= */
const CACHE = 'mp27-v32';
/* mp27-v31: remember 탭이 check · memo와 같은 세 칸(돋보기 검색 · ＋ new · 목록)이 되고, 적기·고치기는
   Search와 같은 종이 Remember 팝업에서 합니다. 일 모달의 반복에 `N일마다`(repeat:'days' · repeatDays:N)가
   붙어 RRULE:FREQ=DAILY;INTERVAL=N · Docs `(3일마다)`로 오갑니다. 폰에서 초점이 간 모든 입력 칸은
   글씨 크기 `작게`에서도 16px 이상이라 iOS Safari가 화면을 확대하지 않습니다(액션 시트 이름 칸 포함).
   (sw.js changes on purpose: a client that already took v30 re-installs and refills the
   same cache name.) */
/* mp27-v32: 양력으로 매년 돌아오는 `기념일 · 데이`(밸런타인데이 · 국군의 날 · 고양이의 날 ·
   식목일 · 어버이날 · 빼빼로데이 … 스물다섯 날 + 5월 셋째 월요일 성년의 날)를 달력 날짜 옆에
   절기와 같은 옅은 잉크로, 일 모달 머리에, 검색(이름·날짜)에 함께 넣었습니다. option 탭
   `음력 · 절기` 바로 아래 `기념일 · 데이` 스위치(prefs.observances)로 끄고 켜며, 끄면
   달력·일 모달·검색에서 모두 사라지고 법정 공휴일은 그대로 남습니다.
   (sw.js changes on purpose: a client that already took v31 re-installs and refills the
   same cache name.) */

/* the whole app is these six files (the fonts live inside index.html) */
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* stale-while-revalidate: answer from cache at once, refresh in the background */
async function handle(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });

  const refresh = fetch(request)
    .then(response => {
      if (response && response.ok) {
        return cache.put(request, response.clone()).then(() => response);
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;

  const fresh = await refresh;
  if (fresh) return fresh;

  /* offline and never cached: a navigation still opens the planner shell */
  if (request.mode === 'navigate') {
    const shell = await cache.match('./index.html');
    if (shell) return shell;
  }
  return new Response('오프라인 상태입니다.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // Google Fonts etc. go straight to the network
  if (url.pathname.endsWith('/sw.js')) return;       // never serve the worker from its own cache

  event.respondWith(handle(request));
});
