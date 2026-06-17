import canUseDOM from './canUseDOM'

const DEFAULT_SERVER_URL = 'http://localhost:3000'

export const getServerUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_SERVER_URL ??
             process.env.PAYLOAD_PUBLIC_SERVER_URL

  if (!url) {
    // eslint-disable-next-line no-console
    console.warn(
      '⚠️ NEXT_PUBLIC_SERVER_URL is not defined. Falling back to http://localhost:3000. ' +
      'Set it in your .env file for production.',
    )
    return DEFAULT_SERVER_URL
  }

  return url.replace(/\/+$/, '') // strip trailing slash
}

export const getServerSideURL = (): string => {
  return (
    process.env.NEXT_PUBLIC_SERVER_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000')
  )
}

export const getClientSideURL = (): string => {
  if (canUseDOM) {
    const protocol = window.location.protocol
    const domain = window.location.hostname
    const port = window.location.port

    return `${protocol}//${domain}${port ? `:${port}` : ''}`
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  return process.env.NEXT_PUBLIC_SERVER_URL || ''
}
