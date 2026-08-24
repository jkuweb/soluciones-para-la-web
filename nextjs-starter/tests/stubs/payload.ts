// Test/typecheck stub for the `payload` package. The nextjs-starter does not
// install payload; the real package lives in agencia-backend. Tests mock this
// module via vi.mock('payload', factory) and the route imports it for its
// `getPayload({ config })` Local API call to create/update Orders.

type AnyArgs = Record<string, unknown>

export interface PayloadClient {
  create: (args: AnyArgs) => Promise<{ id: string | number }>
  update: (args: AnyArgs) => Promise<unknown>
  find: (args: AnyArgs) => Promise<unknown>
  findByID: (args: AnyArgs) => Promise<unknown>
}

export async function getPayload(_args?: unknown): Promise<PayloadClient> {
  throw new Error('payload.getPayload is a stub — must be mocked in tests')
}
