import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import sharp from 'sharp'
import { Tenants } from './collections/Tenants'
import { Users } from './collections/Users'
import { Pages } from './collections/Pages'
import { Media } from './collections/Media'

export default buildConfig({
  editor: lexicalEditor(),
  collections: [Tenants, Users, Pages, Media],
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: 'src/payload-types.ts',
  },
  sharp,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  plugins: [
    multiTenantPlugin({
      collections: {
        pages: {},
        media: {},
      },
      tenantsSlug: 'tenants',
      userHasAccessToAllTenants: (user) => {
        return user?.roles?.includes('super-admin') ?? false
      },
    }),
  ],
})
