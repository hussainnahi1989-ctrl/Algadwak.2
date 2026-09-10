/* =====================================================================
   خدمة العمل بلا إنترنت — «الجدول الأسبوعي الذكي»
   بعد أول فتح للرابط تُخزَّن نسخة كاملة في الجهاز، وتبقى تعمل بلا إنترنت.
   عند أي تحديث للنسخة: غيّر رقم الإصدار أدناه (v1 ← v2) لتُحدَّث تلقائيًا.
   ===================================================================== */
const CACHE = 'nibras-schedule-v1';
const CORE = ['./', './index.html', './app-icon-192.png', './app-icon-512.png', './app-icon-180.png'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(CORE); }).then(function(){ return self.skipWaiting(); })
  );
});
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});
self.addEventListener('fetch', function(e){
  const req = e.request;
  if(req.method !== 'GET') return;
  let url;
  try{ url = new URL(req.url); }catch(err){ return; }
  if(url.origin !== location.origin) return;
  /* صفحة التطبيق: الأحدث من الشبكة عند توفرها، ونسخة الجهاز عند انقطاع الإنترنت */
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).then(function(res){
        try{
          const copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put('./index.html', copy); });
        }catch(err){}
        return res;
      }).catch(function(){ return caches.match('./index.html'); })
    );
    return;
  }
  /* بقية الملفات (الأيقونات): من الجهاز أولًا */
  e.respondWith(
    caches.match(req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        try{
          const copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }catch(err){}
        return res;
      }).catch(function(){ return hit; });
    })
  );
});
