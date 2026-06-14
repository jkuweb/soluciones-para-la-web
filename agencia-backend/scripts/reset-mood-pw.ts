import { getPayload } from 'payload'
import config from '@payload-config'

const run = async (): Promise<void> => {
  const payload = await getPayload({ config })

  await payload.update({
    collection: 'users',
    id: 118,
    data: {
      password: 'mood1234',
    },
  })

  console.log('✅ Password for mood@example.com reset to: mood1234')

  const user = await payload.findByID({ collection: 'users', id: 118 })
  console.log(`   User: ${user.email} (${user.roles})`)
}

await run()
