// Test-only stub for the `payload` package. The nextjs-starter does not install
// payload; the real package lives in agencia-backend. Tests mock this module
// via vi.mock('payload', factory) so the stub is never actually called.
export async function getPayload(_args?: unknown): Promise<unknown> {
  return null
}
