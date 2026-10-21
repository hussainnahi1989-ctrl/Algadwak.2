/* =========================================================================
   خدمة العمل دون إنترنت — الجدول الأسبوعي الذكي
   • الصفحة: تُفتح فورًا من النسخة المحفوظة (إقلاع سريع حتى مع إنترنت ضعيف)،
     وفي الخلفية تُجلب أحدث نسخة من الموقع؛ إن تغيّرت تُحفظ ويُبلَّغ البرنامج
     فيُعيد التحميل تلقائيًا بعد الفتح مباشرة (أو يعرض «تحديث الآن»).
   • أول فتح (لا نسخة محفوظة): من الشبكة مباشرة.
   • باقي الملفات: المحفوظ فورًا مع تحديث صامت.
   • البيانات والتفعيل محفوظة في المتصفح ولا يمسّها التحديث.
   ========================================================================= */
const CACHE = 'jadwal-cache-2026-10-v41';
const CORE = ['./', './index.html', './assets/teacher-app-phone.png', './app-icon-192.png', './app-icon-180.png', './app-icon-512.png'];
const PAGE_KEY = './index.html';
const FLAG_KEY = './__nb_update_pending';   /* علامة «وصلت نسخة أحدث» يقرؤها البرنامج حتى لو فاتته الرسالة */

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
    caches.keys().then(function(keys){
      const old = keys.filter(function(k){ return k !== CACHE; });
      return Promise.all(old.map(function(k){ return caches.delete(k); }))
        .then(function(){ return self.clients.claim(); })
        .then(function(){ if(old.length) return notifyUpdate(); });   /* ترقية من نسخة سابقة: البرنامج المفتوح يتحدّث فورًا */
    })
  );
});

function notifyUpdate(){
  return self.clients.matchAll({type:'window', includeUncontrolled:true}).then(function(list){
    list.forEach(function(c){ try{ c.postMessage({type:'nb-new-version'}); }catch(e){} });
  });
}

self.addEventListener('fetch', function(e){
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;            /* روابط خارجية لا تُمس */

  const isPage = req.mode === 'navigate' || /\/$|\.html$/.test(url.pathname);
  if(isPage){
    e.respondWith(caches.open(CACHE).then(function(cache){
      return cache.match(PAGE_KEY).then(function(cached){
        const cachedCopy = cached ? cached.clone() : null;   /* نسخة للمقارنة قبل تسليم الأصل للصفحة */
        /* طلب جديد من الرابط (طلب التنقّل نفسه لا يقبل خيارات cache) — يتجاوز ذاكرة HTTP لجلب أحدث نسخة */
        const net = fetch(new Request(url.href, {cache:'no-store', credentials:'same-origin'})).then(function(res){
          if(!res || !res.ok) return res;
          const forCache = res.clone(), forCompare = res.clone();
          return Promise.all([ forCompare.text(), cachedCopy ? cachedCopy.text() : Promise.resolve(null) ]).then(function(t){
            return cache.put(PAGE_KEY, forCache).then(function(){
              if(t[1] !== null && t[0] !== t[1]){
                return cache.put(FLAG_KEY, new Response(String(Date.now()))).then(notifyUpdate);
              }
            });
          }).then(function(){ return res; });
        });
        if(cached){
          /* الصفحة المسلَّمة الآن هي أحدث نسخة محفوظة: تُمسح العلامة القديمة */
          e.waitUntil(cache.delete(FLAG_KEY).then(function(){ return net; }).catch(function(){}));
          return cached;                                       /* إقلاع فوري */
        }
        return net.catch(function(){ return caches.match(req); });
      });
    }));
    return;
  }
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
