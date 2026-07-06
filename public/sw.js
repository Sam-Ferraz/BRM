// Service Worker do BRM — cache-first pra assets, network-first pra API/HTML
//
// Estratégia:
//   • Assets estáticos (JS/CSS/imagens): serve do cache se tiver, atualiza em background
//   • Navegações (HTML) e /api/*: sempre tenta a rede primeiro, fallback pro cache
//     se offline. Isso evita servir versão velha do bundle quando deploy sobe.
//
// Versão do cache. Muda quando quiser invalidar cache antigo em todos os clientes.
const CACHE_VERSION = 'brm-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(['/', '/manifest.webmanifest'])
    )
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Não cacheia APIs (dados dinâmicos)
  if (url.pathname.startsWith('/api/')) return
  // Não intercepta requests cross-origin (S3, Google, etc.)
  if (url.origin !== location.origin) return

  // Navegações (HTML) — network first pra pegar bundle novo pós-deploy
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(STATIC_CACHE).then((c) => c.put(request, copy))
          return res
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    )
    return
  }

  // Assets estáticos — cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Atualiza em background sem bloquear
        fetch(request)
          .then((res) => {
            if (res.ok) caches.open(STATIC_CACHE).then((c) => c.put(request, res))
          })
          .catch(() => undefined)
        return cached
      }
      return fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(STATIC_CACHE).then((c) => c.put(request, copy))
        }
        return res
      })
    })
  )
})
