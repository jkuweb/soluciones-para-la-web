import { Block } from 'payload'

export const CartSummaryBlock: Block = {
  slug: 'cart-summary',
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
