'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './Link.module.css'

type CMSLinkProps = {
  [key: string]: unknown
}

export const CMSLink: React.FC<CMSLinkProps> = (props) => {
  const { type, appearance, children, className, label, newTab, reference, url, icon } =
    props as any

  const href =
    type === 'reference' && typeof reference?.value === 'object' && reference.value.slug
      ? `${reference?.relationTo !== 'pages' ? `/${reference?.relationTo}` : ''}/${
          reference.value.slug
        }`
      : url

  if (!href) return null

  const newTabProps = newTab ? { rel: 'noopener noreferrer', target: '_blank' } : {}

  const linkClass =
    appearance === 'link'
      ? `${styles.link} ${styles.text} ${className || ''}`
      : `${styles.link} ${styles.button} ${styles[appearance || 'default']} ${className || ''}`.trim()

  return (
    <Link className={linkClass} href={href || url || ''} {...newTabProps}>
      <span className={styles.textContent}>{(label as React.ReactNode) || children}</span>
      {icon && <IconRenderer icon={icon} />}
    </Link>
  )
}

function IconRenderer({ icon }: { icon: any }) {
  const [svgContent, setSvgContent] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!icon) return

    const iconUrl = icon.url
    if (!iconUrl) {
      setError('No URL in icon object')
      return
    }

    fetch(iconUrl)
      .then((res) => {
        return res.text()
      })
      .then((content) => {
        setSvgContent(content)
      })
      .catch((err) => {
        setError(err.message)
      })
  }, [icon])

  if (error) {
    return <span className={styles.iconError}>[Error: {error}]</span>
  }

  if (!svgContent) {
    return <span className={styles.iconLoading}>[Loading...]</span>
  }

  return <span className={styles.icon} dangerouslySetInnerHTML={{ __html: svgContent }} />
}
