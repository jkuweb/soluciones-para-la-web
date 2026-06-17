import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Tenants } from './collections/Tenants'
import { Users } from './collections/Users'

import { Header } from './globals/Header/config'
import { Footer } from './globals/Footer/config'

import { getServerUrl } from './utilities/getURL'
import { plugins } from './plugins'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const livePreviewUrl = process.env.LIVE_PREVIEW_BASE_URL

const corsOrigins = [getServerUrl()]
if (livePreviewUrl) corsOrigins.push(livePreviewUrl)

const csrfOrigins = [getServerUrl()]
if (livePreviewUrl) csrfOrigins.push(livePreviewUrl)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
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
    push: true,
    logger: true,
  }),
  jobs: {
    autoRun: [],
    shouldAutoRun: async () => process.env.ENABLE_JOBS === 'true',
  },
  cors: corsOrigins,
  csrf: csrfOrigins,
  sharp,
  plugins: [...(plugins ?? [])],
})
