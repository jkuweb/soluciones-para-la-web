/* eslint-disable no-console */
/**
 * Migration: Migrate manual `status` field to Payload native `_status`
 *
 * This script migrates existing pages from the old manual `status` field
 * to Payload's auto-managed `_status` field. Run this AFTER adding
 * `versions.drafts` to the Pages config but BEFORE removing the
 * manual `status` field from the config.
 *
 * Usage:
 *   pnpm tsx src/migrations/001-status-to-versions.ts
 *
 * Rollback:
 *   Re-run with ROLLBACK=true to reverse: `ROLLBACK=true pnpm tsx src/migrations/001-status-to-versions.ts`
 */

import { getPayload } from 'payload'
import config from '@/payload.config'

async function run(): Promise<void> {
  const payload = await getPayload({ config: await config })

  const isRollback = process.env.ROLLBACK === 'true'

  if (isRollback) {
    console.log('🔁 Rolling back _status → manual status...')
    const pages = await payload.find({
      collection: 'pages',
      pagination: false,
      limit: 500,
    })

    for (const page of pages.docs) {
      const currentStatus = (page as unknown as Record<string, unknown>)._status as string | undefined
      await payload.update({
        collection: 'pages',
        id: page.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { status: currentStatus === 'published' ? 'published' : 'draft' } as any,
        overrideAccess: true,
      })
    }

    console.log(`✅ Rollback complete: ${pages.docs.length} pages migrated back.`)
    return
  }

  console.log('📋 Migrating pages from manual status → _status...')

  // Step 1: Find pages with old `status: 'published'`
  // Note: after `versions.drafts` is enabled, we need to iterate ALL pages
  // and publish those that had `status: 'published'`. We use pagination to
  // handle large datasets.
  let hasMore = true
  let pageIndex = 0
  const pageSize = 100
  let migrated = 0
  let skipped = 0

  while (hasMore) {
    const pages = await payload.find({
      collection: 'pages',
      limit: pageSize,
      page: pageIndex + 1,
      pagination: true,
    })

    for (const page of pages.docs) {
      // Try to read the old `status` field — it may still be in the DB column
      // even after config removal, accessed as raw data
      const rawPage = page as unknown as Record<string, unknown>
      const oldStatus = rawPage.status as string | undefined
      const currentStatus = rawPage._status as string | undefined

      if (oldStatus === 'published' && currentStatus !== 'published') {
        // Publish the page by setting _status via Payload API
        await payload.update({
          collection: 'pages',
          id: page.id,
          data: { _status: 'published' } as never,
          overrideAccess: true,
        })
        migrated++
      } else {
        skipped++
      }
    }

    hasMore = pages.hasNextPage ?? false
    pageIndex++
  }

  console.log(`✅ Migration complete: ${migrated} pages published, ${skipped} skipped/unchanged.`)
}

run().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
