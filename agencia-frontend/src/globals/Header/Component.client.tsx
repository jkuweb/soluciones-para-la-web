'use client'

import Link from 'next/link'
import type { Header } from '@/payload-types'
import { Logo } from '@/components/Logo/Logo'
import { HeaderDesktopNav } from './Nav/HeaderDesktopNav'
import { HeaderMobileNav } from './Nav/HeaderMobileNav'
import styles from './Component.module.css'

interface HeaderClientProps {
  data: Header
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data }) => {
  const navItems = data.navItems as any[]

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <Logo />
        </Link>
        <HeaderDesktopNav data={data} />
        <HeaderMobileNav data={data} />
      </div>
    </header>
  )
}
