import type { Block } from 'payload'

export const WelcomeBannerBlock: Block = {
  slug: 'welcome-banner',
  labels: {
    singular: 'Welcome Banner',
    plural: 'Welcome Banners',
  },
  fields: [
    {
      name: 'text',
      type: 'text',
      required: false,
      admin: {
        description:
          'Texto del banner. Si está vacío, el storefront muestra WELCOME_BANNER_TEXT (env var).',
      },
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Switch on/off del banner.',
      },
    },
  ],
}
