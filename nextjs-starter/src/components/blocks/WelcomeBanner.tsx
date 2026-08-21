import type { WelcomeBanner } from '@/lib/types'

export default function WelcomeBannerBlock({ data }: { data: WelcomeBanner }) {
  if (!data.enabled) return null
  const text = data.text || process.env.WELCOME_BANNER_TEXT || '¡Bienvenido!'
  return (
    <div className="welcome-banner" data-testid="welcome-banner">
      {text}
    </div>
  )
}
