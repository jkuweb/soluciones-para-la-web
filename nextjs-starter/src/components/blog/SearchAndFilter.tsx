'use client'

import Fuse, { type IFuseOptions, type FuseResult } from 'fuse.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import PostCard from './PostCard'
import type { Category, Post, Tag } from '@/lib/types'
import styles from './SearchAndFilter.module.css'

const POSTS_PER_PAGE = 6
const DEBOUNCE_MS = 300

export interface SearchablePost extends Post {
  searchText: string
}

interface SearchAndFilterProps {
  posts: SearchablePost[]
  categories: Category[]
  tags: Tag[]
}

/**
 * Internal search-index entry. Decoupled from `SearchablePost` so the chip
 * filter can compare against title strings instead of full category objects.
 */
interface IndexEntry {
  id: string
  slug: string
  title: string
  searchText: string
  heroImage: SearchablePost['heroImage']
  excerpt?: string
  publishedAt: string
  categories: string[]
  tags: string[]
}

const FUSE_OPTIONS: IFuseOptions<IndexEntry> = {
  keys: [
    { name: 'title', weight: 2 },
    { name: 'searchText', weight: 1 },
  ],
  threshold: 0.3,
  ignoreLocation: true,
  includeScore: false,
}

interface FilterDropdownProps {
  label: string
  items: { id: string; title: string }[]
  selected: Set<string>
  onToggle: (value: string) => void
}

function FilterDropdown({
  label,
  items,
  selected,
  onToggle,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const count = selected.size

  return (
    <div className={styles.dropdown} ref={ref}>
      <button
        type="button"
        className={`${styles.dropdownTrigger} ${count > 0 ? styles.dropdownTriggerActive : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{label}</span>
        {count > 0 && <span className={styles.dropdownCount}>{count}</span>}
        <svg
          className={styles.dropdownChevron}
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className={styles.dropdownPanel}>
          <ul className={styles.dropdownList} role="listbox" aria-multiselectable>
            {items.map((item) => {
              const isSelected = selected.has(item.title)
              return (
                <li
                  key={item.id}
                  className={styles.dropdownItem}
                  role="option"
                  aria-selected={isSelected}
                >
                  <label className={styles.dropdownOption}>
                    <input
                      type="checkbox"
                      className={styles.dropdownCheckbox}
                      checked={isSelected}
                      onChange={() => onToggle(item.title)}
                    />
                    <span>{item.title}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function SearchAndFilter({
  posts,
  categories,
  tags,
}: SearchAndFilterProps) {
  const index: IndexEntry[] = useMemo(
    () =>
      posts.map((p) => ({
        ...p,
        categories: (p.categories ?? []).map((c) => c.title),
        tags: (p.tags ?? []).map((t) => t.title),
      })),
    [posts],
  )

  const fuse = useMemo(() => new Fuse(index, FUSE_OPTIONS), [index])

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [ariaStatus, setAriaStatus] = useState('')
  const sectionRef = useRef<HTMLElement>(null)

  // Debounce query updates
  useEffect(() => {
    const id = window.setTimeout(() => {
      const trimmed = query.trim()
      setDebouncedQuery(trimmed)
      setCurrentPage(1)
      setAriaStatus(trimmed ? `Filtrando por "${trimmed}"` : '')
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [query])

  const filtered = useMemo<IndexEntry[]>(() => {
    let result: IndexEntry[] = index
    if (debouncedQuery) {
      const hits: FuseResult<IndexEntry>[] = fuse.search(debouncedQuery)
      result = hits.map((h) => h.item)
    }
    if (selectedCategories.size > 0) {
      result = result.filter((p) =>
        p.categories.some((c) => selectedCategories.has(c)),
      )
    }
    if (selectedTags.size > 0) {
      result = result.filter((p) => p.tags.some((t) => selectedTags.has(t)))
    }
    return result
  }, [index, fuse, debouncedQuery, selectedCategories, selectedTags])

  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE))
  const safePage = Math.min(Math.max(1, currentPage), totalPages)
  const start = (safePage - 1) * POSTS_PER_PAGE
  const visibleIds = useMemo(
    () => new Set(filtered.slice(start, start + POSTS_PER_PAGE).map((p) => p.id)),
    [filtered, start],
  )
  const isEmpty = filtered.length === 0
  const hasFilters =
    query.length > 0 || selectedCategories.size > 0 || selectedTags.size > 0

  function toggleChip(group: 'categories' | 'tags', value: string): void {
    const setter = group === 'categories' ? setSelectedCategories : setSelectedTags
    const current = group === 'categories' ? selectedCategories : selectedTags
    const next = new Set(current)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setter(next)
    setCurrentPage(1)
  }

  function clearAllFilters(): void {
    setQuery('')
    setDebouncedQuery('')
    setSelectedCategories(new Set())
    setSelectedTags(new Set())
    setCurrentPage(1)
    setAriaStatus('Filtros reiniciados')
  }

  function goToPage(page: number): void {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
    if (sectionRef.current) {
      window.scrollTo({
        top: sectionRef.current.offsetTop - 16,
        behavior: 'smooth',
      })
    }
  }

  function buildPageList(current: number, total: number): (number | '…')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const list: (number | '…')[] = [1]
    const startP = Math.max(2, current - 1)
    const endP = Math.min(total - 1, current + 1)
    if (startP > 2) list.push('…')
    for (let p = startP; p <= endP; p++) list.push(p)
    if (endP < total - 1) list.push('…')
    list.push(total)
    return list
  }

  return (
    <section ref={sectionRef} className={styles.wrapper} data-search-filter>
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>Blog</h1>
        <p className={styles.heroSubtitle}>
          Explora nuestra colección de artículos
        </p>
      </header>

      <div className={styles.searchBox}>
        <svg
          className={styles.searchIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Buscar artículos, categorías o etiquetas…"
          aria-label="Buscar artículos"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setQuery('')
            }
          }}
        />
        <button
          type="button"
          className={styles.searchClear}
          aria-label="Limpiar búsqueda"
          onClick={() => setQuery('')}
          hidden={query.length === 0}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            width={20}
            height={20}
            aria-hidden="true"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className={styles.filters}>
        {categories.length > 0 && (
          <FilterDropdown
            label="Categorías"
            items={categories}
            selected={selectedCategories}
            onToggle={(value) => toggleChip('categories', value)}
          />
        )}
        {tags.length > 0 && (
          <FilterDropdown
            label="Etiquetas"
            items={tags}
            selected={selectedTags}
            onToggle={(value) => toggleChip('tags', value)}
          />
        )}
        <button
          type="button"
          className={styles.clearAll}
          onClick={clearAllFilters}
          hidden={!hasFilters}
        >
          Limpiar filtros
        </button>
      </div>

      <p className={styles.resultsMeta} aria-live="polite">
        <strong data-results-count>{filtered.length}</strong>
        <span>
          {filtered.length === 1
            ? 'artículo encontrado'
            : 'artículos encontrados'}
        </span>
        {totalPages > 1 && (
          <span>
            {' · Página '}
            {safePage} de {totalPages}
          </span>
        )}
      </p>

      <div className={styles.grid} hidden={isEmpty}>
        {posts.map((post) => (
          <div
            key={post.id}
            className={`${styles.cardSlot} ${
              visibleIds.has(post.id) ? styles.cardSlotVisible : ''
            }`}
          >
            <PostCard
              title={post.title}
              slug={post.slug}
              publishedAt={post.publishedAt}
              heroImage={post.heroImage}
              excerpt={post.excerpt}
              categories={post.categories}
            />
          </div>
        ))}
      </div>

      {totalPages > 1 && !isEmpty && (
        <nav className={styles.pagination} aria-label="Paginación">
          <button
            type="button"
            className={styles.pageBtn}
            disabled={safePage <= 1}
            onClick={() => goToPage(safePage - 1)}
            aria-label="Página anterior"
          >
            ‹
          </button>
          {buildPageList(safePage, totalPages).map((item, i) =>
            item === '…' ? (
              <span
                key={`ellipsis-${i}`}
                className={styles.pageEllipsis}
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={`${styles.pageBtn} ${
                  item === safePage ? styles.pageBtnActive : ''
                }`}
                aria-current={item === safePage ? 'page' : undefined}
                aria-label={`Ir a la página ${item}`}
                onClick={() => goToPage(item)}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            className={styles.pageBtn}
            disabled={safePage >= totalPages}
            onClick={() => goToPage(safePage + 1)}
            aria-label="Página siguiente"
          >
            ›
          </button>
        </nav>
      )}

      {isEmpty && (
        <div className={`${styles.emptyState} ${styles.emptyStateVisible}`}>
          <div className={styles.emptyIcon} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className={styles.emptyTitle}>No hay resultados</h3>
          <p className={styles.emptyText}>
            Intenta ajustar tus filtros o búsqueda
          </p>
          <button
            type="button"
            className={styles.emptyReset}
            onClick={clearAllFilters}
          >
            Reiniciar búsqueda
          </button>
        </div>
      )}

      <span className={styles.srOnly} aria-live="polite">
        {ariaStatus}
      </span>
    </section>
  )
}
