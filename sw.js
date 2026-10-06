/* =========================================================================
   خدمة العمل دون إنترنت — الجدول الأسبوعي الذكي
   • الصفحة (index.html): من الشبكة أولًا ⇒ كل تحديث يصل فورًا، ومن النسخة المحفوظة عند انقطاع الإنترنت.
   • باقي الملفات (الأيقونات…): من النسخة المحفوظة فورًا مع تحديثها بصمت في الخلفية.
   • عند رفع نسخة جديدة من هذا الملف تُحذف الذاكرة القديمة تلقائيًا.
   ========================================================================= */
const CACHE = 'jadwal-cache-2026-10-v6';
const CORE = ['./', './index.html', './app-icon-192.png', './app-icon-180.png', './app-icon-512.png'];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(CORE.map(function(u){ return c.add(new Request(u, {cache:'reload'})).catch(function(){}); }));
    })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){ return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); })
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;            /* روابط خارجية (واتساب، الخطوط…) لا تُمس */

  const isPage = req.mode === 'navigate' || /\/$|\.html$/.test(url.pathname);
  if(isPage){
    /* الشبكة أولًا — مع حفظ نسخة للعمل دون إنترنت */
    e.respondWith(
      fetch(req, {cache:'no-store'}).then(function(res){
        if(res && res.ok){ const copy = res.clone(); caches.open(CACHE).then(function(c){ c.put('./index.html', copy); }); }
        return res;
      }).catch(function(){
        return caches.match(req).then(function(r){ return r || caches.match('./index.html') || caches.match('./'); });
      })
    );
    return;
  }
  /* بقية الملفات: المحفوظ فورًا + تحديث صامت */
  e.respondWith(
    caches.match(req).then(function(hit){
      const net = fetch(req).then(function(res){
        if(res && res.ok){ const copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }
        return res;
      }).catch(function(){ return hit; });
      return hit || net;
    })
  );
});
