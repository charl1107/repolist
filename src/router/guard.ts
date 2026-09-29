import type { RouteLocationRaw, Router } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import { landingRoute } from './landing-route'

/**
 * The entry pages whose only job is to start or resume a session. Anyone who
 * already has one should be dropped straight into the app instead of being
 * shown a welcome screen or a sign-in form again — which is what happened when
 * the app was reopened: `/` and `/welcome` have no session check of their own,
 * so a returning user kept landing on "Sign in" on mobile and in narrow windows.
 */
const AUTH_ENTRY_ROUTES = new Set(['home', 'welcome', 'login', 'sign-in'])

export function installAuthGuard(router: Router): void {
  router.beforeEach(async (to) => {
    const auth = useAuthStore()
    const required = to.meta.roles as string[] | undefined
    const isPublic = to.meta.public === true

    if (isPublic) {
      if (AUTH_ENTRY_ROUTES.has(String(to.name))) {
        await auth.ensureRestored()
        if (auth.isAuthenticated) {
          // Mirrors auth.store login(): a password reset always comes first.
          if (auth.user?.mustChangePassword === true) {
            return { name: 'change-password' }
          }
          return landingRoute(auth.roles)
        }
      }
      return true
    }

    await auth.ensureRestored()

    if (!auth.isAuthenticated) {
      return { name: 'login' }
    }

    const mustChange = auth.user?.mustChangePassword === true
    if (mustChange && to.name !== 'change-password') {
      return { name: 'change-password' }
    }

    if (!required?.length) {
      return true
    }

    const allowed = required.some((role) => auth.roles.includes(role))
    if (allowed) {
      return true
    }

    return landingRoute(auth.roles) as RouteLocationRaw
  })
}
