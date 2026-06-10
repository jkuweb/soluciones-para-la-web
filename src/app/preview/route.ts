import type { PayloadRequest } from 'payload'
import { getPayload } from 'payload'
import { NextRequest } from 'next/server'

import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

import configPromise from '@payload-config'

export async function GET(req: NextRequest): Promise<Response> {
  const payload = await getPayload({ config: configPromise })

  const { searchParams } = new URL(req.url)

  const path = searchParams.get('path')
  const previewSecret = searchParams.get('previewSecret')

  if (previewSecret !== process.env.PREVIEW_SECRET) {
    return new Response('You are not allowed to preview this page', {
      status: 403,
    })
  }

  if (!path) {
    return new Response('Insufficient search params', { status: 404 })
  }

  const finalPath = path.startsWith('/') ? path : `/${path}`

  let user

  try {
    user = await payload.auth({
      req: req as unknown as PayloadRequest,
      headers: req.headers,
    })
  } catch (error) {
    payload.logger.error(
      { err: error },
      'Error verifying token for live preview',
    )
    return new Response('You are not allowed to preview this page', {
      status: 403,
    })
  }

  const draft = await draftMode()

  if (!user) {
    draft.disable()
    return new Response('You are not allowed to preview this page', {
      status: 403,
    })
  }

  draft.enable()

  redirect(finalPath)
}
