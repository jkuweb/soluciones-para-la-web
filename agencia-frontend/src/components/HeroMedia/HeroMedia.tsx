'use client'

import { useEffect, useState, useRef } from 'react'
import gsap from 'gsap'

interface HeroMediaProps {
  src: string
  className?: string
}

export const HeroMedia = ({ src, className }: HeroMediaProps) => {
  const [svgContent, setSvgContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(src)
      .then((res) => res.text())
      .then((content) => {
        setSvgContent(content)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [src])

  useEffect(() => {
    if (loading || !containerRef.current) return

    const svg = containerRef.current.querySelector('svg')
    if (!svg) return

    svg.style.setProperty('--x', '0')
    svg.style.setProperty('--y', '0')

    const character = svg.querySelector('#Character')
    const stars = svg.querySelector('#Stars')
    const astronautGroup = svg.querySelector('#Astronaut')

    const tl = gsap.timeline()

    if (stars) {
      gsap.set(stars, { opacity: 0, scale: 0.8 })
    }
    if (character) {
      gsap.set(character, { opacity: 0, scale: 0.5, y: 50 })
    }
    if (astronautGroup) {
      gsap.set(astronautGroup, { opacity: 0 })
    }

    if (stars) {
      tl.to(stars, {
        opacity: 1,
        scale: 1,
        duration: 1.2,
        ease: 'power2.out',
      })
    }

    if (character) {
      tl.to(
        character,
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 1.5,
          ease: 'power3.out',
        },
        '-=0.3',
      )
    }

    if (astronautGroup) {
      tl.to(astronautGroup, {
        opacity: 1,
        duration: 0.5,
        ease: 'power1.inOut',
      })
    }

    tl.call(() => {
      if (character) {
        gsap.to(character, {
          y: -15,
          duration: 2.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      }

      if (astronautGroup) {
        gsap.to(astronautGroup, {
          rotation: 4,
          transformOrigin: 'center center',
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      }

      if (stars) {
        gsap.fromTo(
          stars,
          { x: -20 },
          {
            x: 20,
            duration: 8,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          },
        )
      }
    })

    const start = { x: 0, y: 0 }
    let raf: number | null = null

    function update() {
      gsap.to(svg, { duration: 1, '--x': start.x, '--y': start.y })
      raf = null
    }

    const handleMouseMove = (e: MouseEvent) => {
      const end = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      }
      start.x += (end.x - start.x) * 0.1
      start.y += (end.y - start.y) * 0.1
      if (!raf) raf = requestAnimationFrame(update)
    }

    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      if (raf) cancelAnimationFrame(raf)
      if (character) gsap.killTweensOf(character)
      if (stars) gsap.killTweensOf(stars)
      if (astronautGroup) gsap.killTweensOf(astronautGroup)
      tl.kill()
    }
  }, [loading])

  if (loading) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  )
}
