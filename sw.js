const CACHE = 'earnings-v2'

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// FMP API → 永遠走網路；其他資源 → cache first
self.addEventListener('fetch', e => {
  if (e.request.url.includes('financialmodelingprep.com')) return

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(res => {
        if (e.request.method === 'GET' && res.status === 200) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
    }).catch(() => caches.match('./index.html'))
  )
})

// Push notification handler（Phase 2 後端設定後啟用）
self.addEventListener('push', e => {
  if (!e.data) return
  let p = { title: '財報提醒', body: '' }
  try { p = e.data.json() } catch {}
  e.waitUntil(
    self.registration.showNotification(p.title, {
      body: p.body, icon: './icon-192.png',
      badge: './icon-96.png', tag: 'earnings',
      data: { url: './' }, vibrate: [200, 100, 200]
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      const w = wins.find(x => x.url.includes(self.location.origin))
      return w ? w.focus() : clients.openWindow('./')
    })
  )
})
