import { getPayload } from 'payload'
import config from '@/payload.config'

const run = async (): Promise<void> => {
  const payload = await getPayload({ config })

  await payload.update({
    collection: 'users',
    id: 1,
    data: { password: 'admin1234' },
    overrideAccess: true,
  })
  console.log('✅ Admin password set to: admin1234')
  console.log('   (change it after testing)')
}

void run().then(() => process.exit(0))
