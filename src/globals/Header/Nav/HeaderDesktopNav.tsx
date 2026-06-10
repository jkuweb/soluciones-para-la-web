'use client'

import React, { useEffect, useState } from 'react'
import type { Header as HeaderType } from '@/payload-types'
import { CMSLink } from '@/components/Link/Link'
import styles from './HeaderDesktopNav.module.css'

export const HeaderDesktopNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const navItems = data?.navItems || []
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(true)
  }, [])

  return (
    <nav className={styles.nav} aria-label="Navegación principal">
      <ol className={styles.navList}>
        {navItems.map(({ link }, i) => (
          <li
            key={i}
            className={`${styles.navItem} ${loaded ? styles.loaded : ''}`}
            style={{ animationDelay: `${0.15 + i * 0.05}s` }}
          >
            <CMSLink {...link} appearance="link" />
          </li>
        ))}
      </ol>
    </nav>
  )
}
