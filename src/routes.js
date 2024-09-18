/* eslint-disable */
const routes = [
  {path: '/', component: _ => import('./pages/index.vue')},
  {path: '/web', component: _ => import('./pages/web.vue')},
  {path: '/mobile', component: _ => import('./pages/mobile.vue')},
  {path: '/config', component: _ => import('./pages/config.vue')},
]

export default routes
