import { createRouter, createWebHistory } from 'vue-router'
import { useAppStore } from '@/stores/app'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'welcome', component: () => import('@/views/WelcomeView.vue') },
    { path: '/init/api', name: 'api-init', component: () => import('@/views/ApiSetupView.vue') },
    { path: '/api-test', name: 'api-test', component: () => import('@/views/ApiSetupView.vue') },
    { path: '/characters', name: 'characters', component: () => import('@/views/CharacterListView.vue'), meta: { requiresApi: true } },
    { path: '/characters/new', name: 'character-new', component: () => import('@/views/CharacterFormView.vue'), meta: { requiresApi: true } },
    { path: '/characters/:id/edit', name: 'character-edit', component: () => import('@/views/CharacterFormView.vue'), meta: { requiresApi: true } },
    { path: '/characters/:id', name: 'character-detail', component: () => import('@/views/CharacterDetailView.vue'), meta: { requiresApi: true } },
    { path: '/characters/:id/world', name: 'world-edit', component: () => import('@/views/WorldEditView.vue'), meta: { requiresApi: true } },
    { path: '/characters/:id/outfits', name: 'outfits', component: () => import('@/views/OutfitManageView.vue'), meta: { requiresApi: true } },
    { path: '/chat/:characterId?', name: 'chat', component: () => import('@/views/ChatView.vue'), meta: { requiresApi: true } },
    { path: '/memories/:characterId?', name: 'memories', component: () => import('@/views/MemoryManageView.vue'), meta: { requiresApi: true } },
    { path: '/data', redirect: '/data-management' },
    { path: '/data-management', name: 'data-management', component: () => import('@/views/DataManagementView.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
  ],
})

router.beforeEach(async (to) => {
  const app = useAppStore()
  if (!app.ready) await app.load()
  if (to.name === 'welcome' && !app.canUseApi) return '/init/api'
  if (to.meta.requiresApi && !app.canUseApi) return '/init/api'
  return true
})

export default router
