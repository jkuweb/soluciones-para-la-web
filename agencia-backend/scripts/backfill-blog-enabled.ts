/**
 * Backfill: activa `blogEnabled: true` en cualquier tenant que tenga
 * al menos 1 post, 1 category o 1 tag.
 *
 * Idempotente: correrlo dos veces da el mismo resultado.
 *
 * Uso:
 *   pnpm backfill:blog-enabled
 *   pnpm backfill:blog-enabled --dry-run
 */
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function run(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  const payload = await getPayload({ config })

  const tenants = await payload.find({
    collection: 'tenants',
    limit: 0,
    pagination: false,
    overrideAccess: true,
    depth: 0,
  })

  let activated = 0
  let alreadyOn = 0
  let noContent = 0

  for (const tenant of tenants.docs) {
    const tenantId = tenant.id

    if (tenant.blogEnabled === true) {
      alreadyOn++
      continue
    }

    const [postsCount, categoriesCount, tagsCount] = await Promise.all([
      payload.count({
        collection: 'posts',
        where: { tenant: { equals: tenantId } },
        overrideAccess: true,
      }),
      payload.count({
        collection: 'categories',
        where: { tenant: { equals: tenantId } },
        overrideAccess: true,
      }),
      payload.count({
        collection: 'tags',
        where: { tenant: { equals: tenantId } },
        overrideAccess: true,
      }),
    ])

    const totalContent = postsCount.totalDocs + categoriesCount.totalDocs + tagsCount.totalDocs

    if (totalContent === 0) {
      noContent++
      continue
    }

    const log = `Tenant ${tenantId} (${tenant.slug}): ${postsCount.totalDocs} posts, ${categoriesCount.totalDocs} categories, ${tagsCount.totalDocs} tags → blogEnabled: true`
    if (dryRun) {
      console.log(`[dry-run] would activate: ${log}`)
    } else {
      await payload.update({
        collection: 'tenants',
        id: tenantId,
        data: { blogEnabled: true },
        overrideAccess: true,
      })
      console.log(`✓ ${log}`)
    }
    activated++
  }

  console.log('\n=== Resumen ===')
  console.log(`Tenants activados: ${activated}`)
  console.log(`Ya estaban activos: ${alreadyOn}`)
  console.log(`Sin contenido de blog: ${noContent}`)
  console.log(`Total procesados: ${tenants.docs.length}`)
  if (dryRun) console.log('(dry-run: nada se escribió en DB)')

  // Payload mantiene conexiones DB/pool abiertas; sin un exit explícito
  // el proceso queda colgado hasta timeout externo. El script es one-shot.
  process.exit(0)
}
