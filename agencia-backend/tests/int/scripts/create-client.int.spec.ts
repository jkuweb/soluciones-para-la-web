import { describe, it, expect } from 'vitest'
import {
  isValidSlug,
  isValidEmail,
  buildTenantData,
  buildUserData,
  type TenantInput,
  type UserInput,
} from '../../../scripts/create-client'

describe('isValidSlug', () => {
  it('acepta slugs válidos', () => {
    expect(isValidSlug('cliente-ejemplo')).toBe(true)
    expect(isValidSlug('tienda-2026')).toBe(true)
    expect(isValidSlug('a')).toBe(true)
  })

  it('rechaza slugs con mayúsculas, espacios o caracteres especiales', () => {
    expect(isValidSlug('Cliente-Ejemplo')).toBe(false)
    expect(isValidSlug('cliente ejemplo')).toBe(false)
    expect(isValidSlug('cliente_ejemplo')).toBe(false)
    expect(isValidSlug('cliente.ejemplo')).toBe(false)
    expect(isValidSlug('')).toBe(false)
  })
})

describe('isValidEmail', () => {
  it('acepta emails válidos', () => {
    expect(isValidEmail('admin@cliente.com')).toBe(true)
    expect(isValidEmail('a.b+tag@example.co')).toBe(true)
  })

  it('rechaza emails inválidos', () => {
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('@nodomain.com')).toBe(false)
    expect(isValidEmail('noatsign.com')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})

describe('buildTenantData', () => {
  it('construye el payload para tenants.create con todos los campos', () => {
    const input: TenantInput = {
      name: 'Cliente Ejemplo',
      slug: 'cliente-ejemplo',
      domain: 'cliente-ejemplo.com',
      serviceType: 'web-estatica',
      frontendType: 'astro',
      status: 'pending',
      projectPrice: 1500,
      maintenanceFee: 79,
    }
    const data = buildTenantData(input)
    expect(data).toEqual({
      name: 'Cliente Ejemplo',
      slug: 'cliente-ejemplo',
      domain: 'cliente-ejemplo.com',
      serviceType: 'web-estatica',
      frontendType: 'astro',
      status: 'pending',
      projectPrice: 1500,
      maintenanceFee: 79,
    })
  })

  it('omite campos opcionales cuando no se proveen', () => {
    const input: TenantInput = {
      name: 'Tienda',
      slug: 'tienda',
      domain: 'tienda.com',
      serviceType: 'tienda-online',
      frontendType: 'nextjs',
      status: 'active',
    }
    const data = buildTenantData(input)
    expect(data).not.toHaveProperty('projectPrice')
    expect(data).not.toHaveProperty('maintenanceFee')
  })
})

describe('buildUserData', () => {
  it('construye el payload para users.create con el tenant asignado', () => {
    const input: UserInput = {
      email: 'admin@cliente.com',
      name: 'Admin Cliente',
      password: 'secret123',
      role: 'tenant-admin',
    }
    const data = buildUserData(input, 42)
    expect(data).toEqual({
      email: 'admin@cliente.com',
      name: 'Admin Cliente',
      password: 'secret123',
      roles: ['tenant-admin'],
      tenants: [{ tenant: 42 }],
    })
  })
})
