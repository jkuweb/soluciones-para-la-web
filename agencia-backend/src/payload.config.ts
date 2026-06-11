import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import path from 'path'
import { buildConfig, Config } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Tenants } from './collections/Tenants'
import { Users } from './collections/Users'

import { Header } from './globals/Header/config'
import { Footer } from './globals/Footer/config'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Tenants, Users, Pages, Media],
  globals: [Header, Footer],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  jobs: {
    autoRun: [],
    shouldAutoRun: async () => process.env.ENABLE_JOBS === 'true',
  },
  sharp,
  plugins: [
    multiTenantPlugin<Config>({
      collections: {
        pages: {},
        media: {},
      },
      tenantsSlug: 'tenants',
      userHasAccessToAllTenants: (user) => {
        return user?.roles?.includes('super-admin') ?? false
      },
      tenantField: {
        admin: {
          disableListColumn: false,
          disableListFilter: false,
        },
      },
    }),
  ],
})
