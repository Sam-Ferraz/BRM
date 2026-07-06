// KILL SWITCH — este arquivo NÃO É o service worker de produção.
//
// Um Service Worker foi registrado por engano num deploy anterior e ficou
// cacheado nos browsers dos usuários, servindo lixo do cache mesmo após o
// revert do commit original. Como o browser SEMPRE baixa o sw.js do servidor
// pra ver se mudou, colocamos aqui um SW "kamikaze" que faz o seguinte:
//
//   1. self-unregister — se remove do browser
//   2. limpa TODOS os caches criados por ele
//   3. força reload da página pra remover a instância ativa
//
// Depois que todos os usuários passarem por esse SW pelo menos 1 vez, o
// problema fica resolvido — os browsers ficam limpos. Aí podemos remover
// este arquivo do repo em segurança (ou manter só como precaução).

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Limpa todos os caches
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))

      // Desregistra ESTE service worker
      await self.registration.unregister()

      // Recarrega todas as abas abertas pra remover a instância ativa
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        client.navigate(client.url)
      }
    })()
  )
})

// Repassa qualquer fetch direto pra rede (não intercepta nada)
// enquanto o unregister não completa
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
