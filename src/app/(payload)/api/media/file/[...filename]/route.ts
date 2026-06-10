import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

const folder = 'payload-media'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const dynamic = 'force-dynamic'

async function getMimeTypeFromDB(filename: string): Promise<string | null> {
  try {
    const config = await configPromise
    const payload = await getPayload({ config })

    // Buscar el archivo por filename
    const result = await payload.find({
      collection: 'media',
      where: {
        filename: {
          equals: filename,
        },
      },
      limit: 1,
    })

    if (result.docs[0]?.mimeType) {
      return result.docs[0].mimeType
    }

    // También buscar sin extensión
    const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '')
    const result2 = await payload.find({
      collection: 'media',
      where: {
        filename: {
          contains: filenameWithoutExt,
        },
      },
      limit: 1,
    })

    if (result2.docs[0]?.mimeType) {
      return result2.docs[0].mimeType
    }

    return null
  } catch (error) {
    console.error('Error getting mimeType from DB:', error)
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string[] }> }
) {
  const { filename } = await params
  const filenameStr = filename.join('/')
  
  const publicId = `${folder}/${filenameStr.replace(/\.[^/.]+$/, '')}`
  
  // Primero, intentar obtener el mimeType desde la base de datos
  let mimeType = await getMimeTypeFromDB(filenameStr)
  
  // Si no se encuentra, verificar la extensión
  if (!mimeType) {
    const ext = filenameStr.split('.').pop()?.toLowerCase()
    if (ext === 'mp4' || ext === 'webm' || ext === 'mov' || ext === 'avi' || ext === 'mkv') {
      mimeType = 'video/' + ext
    } else if (ext === 'svg') {
      mimeType = 'image/svg+xml'
    }
  }
  
  console.log('Filename:', filenameStr, 'mimeType:', mimeType)
  
  const isVideo = mimeType?.startsWith('video/')
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dxxrfvjvt'
  
  let location: string
  if (isVideo) {
    location = `https://res.cloudinary.com/${cloudName}/video/upload/v1/${publicId}`
  } else {
    location = `https://res.cloudinary.com/${cloudName}/image/upload/v1/${publicId}`
  }

  if (location) {
    return NextResponse.redirect(location)
  }

  return new NextResponse('Not Found', { status: 404 })
}