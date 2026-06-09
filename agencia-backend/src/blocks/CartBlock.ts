import { Block } from 'payload'

export const CartBlock: Block = {
  slug: 'cart',
  fields: [
    {
      name: 'emptyMessage',
      type: 'text',
      defaultValue: 'Tu carrito está vacío',
    },
    {
      name: 'checkoutButton',
      type: 'text',
      defaultValue: 'Finalizar compra',
    },
  ],
}
