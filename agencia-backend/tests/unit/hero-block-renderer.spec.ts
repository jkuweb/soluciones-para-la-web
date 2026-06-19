import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'

import { HeroBlockRenderer } from '@/components/blocks/HeroBlockRenderer'

afterEach(cleanup)

const mockMedia = {
  id: 1,
  url: 'https://example.com/image.jpg',
  alt: 'Test image alt',
  width: 800,
  height: 600,
  updatedAt: '2026-06-18T00:00:00.000Z',
  createdAt: '2026-06-18T00:00:00.000Z',
}

const mockBlock = {
  blockType: 'hero' as const,
  id: 'test-block',
  title: 'Test Hero',
  subtitle: 'Test Subtitle',
  backgroundImage: mockMedia,
  images: [
    { id: 'img-1', image: mockMedia },
    {
      id: 'img-2',
      image: {
        ...mockMedia,
        id: 2,
        url: 'https://example.com/image2.jpg',
        alt: 'Second image',
      },
    },
  ],
  information: 'Test information text',
  cta: [
    {
      id: 'cta-1',
      link: {
        type: 'custom' as const,
        url: '/x',
        label: 'Click',
        newTab: false,
      },
    },
  ],
}

describe('HeroBlockRenderer', () => {
  it('renders the title', () => {
    render(React.createElement(HeroBlockRenderer, { block: mockBlock }))
    expect(screen.getByText('Test Hero')).toBeDefined()
  })

  it('renders the subtitle', () => {
    render(React.createElement(HeroBlockRenderer, { block: mockBlock }))
    expect(screen.getByText('Test Subtitle')).toBeDefined()
  })

  it('renders the information text', () => {
    render(React.createElement(HeroBlockRenderer, { block: mockBlock }))
    expect(screen.getByText('Test information text')).toBeDefined()
  })

  it('renders the CTA link with correct label and href', () => {
    render(React.createElement(HeroBlockRenderer, { block: mockBlock }))
    const cta = screen.getByText('Click')
    expect(cta).toBeDefined()
    expect(cta.closest('a')?.getAttribute('href')).toBe('/x')
  })

  it('renders all images (from images array)', () => {
    render(React.createElement(HeroBlockRenderer, { block: mockBlock }))
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(2)
  })

  it('handles empty cta array without crashing', () => {
    const blockNoCta = { ...mockBlock, cta: [] }
    expect(() =>
      render(React.createElement(HeroBlockRenderer, { block: blockNoCta })),
    ).not.toThrow()
  })

  it('handles undefined images without crashing', () => {
    const blockNoImages = { ...mockBlock, images: undefined }
    expect(() =>
      render(
        React.createElement(HeroBlockRenderer, { block: blockNoImages }),
      ),
    ).not.toThrow()
  })

  it('handles undefined information without crashing', () => {
    const blockNoInformation = { ...mockBlock, information: undefined }
    expect(() =>
      render(
        React.createElement(HeroBlockRenderer, { block: blockNoInformation }),
      ),
    ).not.toThrow()
  })

  // ── Edge case tests (review-based) ──

  it('renders multiple CTA links when provided', () => {
    const block = {
      ...mockBlock,
      cta: [
        {
          id: 'cta-1',
          link: {
            type: 'custom' as const,
            url: '/x',
            label: 'Click',
            newTab: false,
          },
        },
        {
          id: 'cta-2',
          link: {
            type: 'custom' as const,
            url: '/y',
            label: 'Read more',
            newTab: false,
          },
        },
      ],
    }
    render(React.createElement(HeroBlockRenderer, { block }))
    expect(screen.getByText('Click')).toBeDefined()
    expect(screen.getByText('Read more')).toBeDefined()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
  })

  it('skips malformed CTA link (missing label) without crashing', () => {
    const block = {
      ...mockBlock,
      cta: [
        {
          id: 'cta-1',
          link: {
            type: 'custom' as const,
            url: '/x',
            label: '',
            newTab: false,
          },
        },
        {
          id: 'cta-2',
          link: {
            type: 'custom' as const,
            url: '/y',
            label: 'Valid',
            newTab: false,
          },
        },
      ],
    }
    render(React.createElement(HeroBlockRenderer, { block }))
    // The valid one should render
    expect(screen.getByText('Valid')).toBeDefined()
    // Only 1 link should be in the DOM (empty-label one is skipped)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
  })

  it('skips malformed image (undefined image) without crashing', () => {
    const block = {
      ...mockBlock,
      images: [
        { id: 'img-valid', image: mockMedia },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: 'img-missing', image: undefined as any },
      ],
    }
    render(React.createElement(HeroBlockRenderer, { block }))
    // Only the valid image should render
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(1)
  })
})
