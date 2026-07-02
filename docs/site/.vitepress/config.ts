import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'react-allauth',
  description:
    'Typed React hooks for the django-allauth headless API',
  base: '/react-allauth/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Hooks', link: '/hooks/use-auth' },
      {
        text: 'GitHub',
        link: 'https://github.com/alexandre-petitjean/react-allauth',
      },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting started', link: '/guide/getting-started' },
          { text: 'Backend configuration', link: '/guide/backend' },
          { text: 'Error handling', link: '/guide/errors' },
        ],
      },
      {
        text: 'Hooks',
        items: [
          { text: 'useAuth', link: '/hooks/use-auth' },
          { text: 'useConfig', link: '/hooks/use-config' },
          { text: 'usePassword', link: '/hooks/use-password' },
          { text: 'useEmails', link: '/hooks/use-emails' },
          { text: 'useMFA', link: '/hooks/use-mfa' },
          { text: 'useWebAuthn', link: '/hooks/use-webauthn' },
          { text: 'useSocialAuth', link: '/hooks/use-social-auth' },
          { text: 'useSessions', link: '/hooks/use-sessions' },
        ],
      },
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/alexandre-petitjean/react-allauth',
      },
    ],
  },
})
