import type { Block } from 'payload'

export const CartBlock: Block = {
  slug: 'cart',
  fields: [
    {
      name: 'emptyMessage',
      type: 'text',
    },
    {
      name: 'checkoutButton',
      type: 'text',
    },
  ],
  labels: {
    singular: 'Cart',
    plural: 'Cart Blocks',
  },
}
