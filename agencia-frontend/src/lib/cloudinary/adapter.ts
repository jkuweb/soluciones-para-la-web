import type { CollectionConfig, Field } from 'payload'
import type {
  GeneratedAdapter,
  HandleUpload,
  HandleDelete,
  StaticHandler,
} from '@payloadcms/plugin-cloud-storage/types'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Handler standalone para servir archivos
export const createStaticHandler = (folder: string): StaticHandler => {
  return async (req, { params }) => {
    const { filename } = params
    const publicId = `${folder}/${filename.replace(/\.[^/.]+$/, '')}`
    
    const isVideo = filename.match(/\.(mp4|webm|mov|avi|mkv|wmv)$/i)
    
    if (isVideo) {
      const url = cloudinary.url(publicId, { secure: true, resource_type: 'video' })
      const correctUrl = url.replace('/image/upload/', '/video/upload/')
      return new Response(null, {
        status: 302,
        headers: { Location: correctUrl },
      })
    }
    
    const url = cloudinary.url(publicId, { secure: true, fetch: 'auto', resource_type: 'image' })
    return new Response(null, {
      status: 302,
      headers: { Location: url },
    })
  }
}

export const cloudinaryAdapter = (args: {
  collection: CollectionConfig
  prefix?: string
}): GeneratedAdapter => {
  const folder = args.prefix || 'payload-media'

  const handleUpload: HandleUpload = async ({ file }) => {
    const filename = (file as any).filename || 'file'
    const isSvg = filename.toLowerCase().endsWith('.svg')
    const mimeType = (file as any).mimeType || 'image/jpeg'
    
    const isVideo = mimeType.startsWith('video/')
    const resourceType = isSvg ? 'image' : isVideo ? 'video' : 'auto'

    const result = await new Promise<{
      secure_url: string
      public_id: string
      format: string
      width: number
      height: number
    }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          public_id: filename.replace(/\.[^/.]+$/, ''),
        },
        (error, result) => {
          if (error) {
            reject(error)
          } else if (result) {
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
              format: result.format,
              width: result.width || 0,
              height: result.height || 0,
            })
          }
        },
      )

      uploadStream.end((file as any).buffer)
    })

    let thumbnailURL = result.secure_url
    let videoUrl = result.secure_url
    
    if (isVideo) {
      // Generar thumbnail del primer frame del video
      thumbnailURL = cloudinary.url(result.public_id, {
        resource_type: 'video',
        format: 'jpg',
        width: 400,
        height: 300,
        crop: 'fill',
        start_offset: '0',
        sign_url: true,
      })
      
      // Generar URL directa del video con el path correcto de video/upload
      const cloudUrl = cloudinary.url(result.public_id, {
        resource_type: 'video',
        secure: true,
      })
      
      // Reemplazar el path para asegurar que usa /video/upload/
      videoUrl = cloudUrl.replace('/image/upload/', '/video/upload/')
    }

    return {
      url: videoUrl,  // URL directa de Cloudinary
      filename: result.public_id.split('/').pop() || filename,
      publicId: result.public_id,
      mimeType,
      size: (file as any).size || 0,
      width: result.width,
      height: result.height,
      thumbnailURL,
    }
  }

  const handleDelete: HandleDelete = async ({ filename }) => {
    const publicId = `${folder}/${filename.replace(/\.[^/.]+$/, '')}`
    await cloudinary.uploader.destroy(publicId)
  }

  const staticHandler: StaticHandler = async (req, { params }) => {
    const { filename } = params
    const publicId = `${folder}/${filename.replace(/\.[^/.]+$/, '')}`
    
    // Detectar si es video
    const isVideo = filename.match(/\.(mp4|webm|mov|avi|mkv|wmv)$/i)
    
    // Para vídeos, usar URL directa de Cloudinary en lugar de redirect
    if (isVideo) {
      const url = cloudinary.url(publicId, { secure: true, resource_type: 'video' })
      // Asegurar path correcto
      const correctUrl = url.replace('/image/upload/', '/video/upload/')
      return new Response(null, {
        status: 302,
        headers: {
          Location: correctUrl,
        },
      })
    }
    
    const url = cloudinary.url(publicId, { secure: true, fetch: 'auto', resource_type: 'image' })

    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
      },
    })
  }

  const generateURL = ({ filename }: { filename: string }) => {
    const publicId = `${folder}/${filename.replace(/\.[^/.]+$/, '')}`
    const isVideo = filename.match(/\.(mp4|webm|mov|avi|mkv|wmv)$/i)
    // Para vídeos, usar URL directa sin transformación
    if (isVideo) {
      const url = cloudinary.url(publicId, { secure: true, resource_type: 'video' })
      return url.replace('/image/upload/', '/video/upload/')
    }
    return cloudinary.url(publicId, { secure: true, fetch: 'auto' })
  }

  return {
    name: 'cloudinary',
    handleUpload,
    handleDelete,
    staticHandler,
    generateURL,
    fields: [
      {
        name: 'publicId',
        type: 'text',
        admin: {
          hidden: true,
        },
      },
      {
        name: 'mimeType',
        type: 'text',
        admin: {
          hidden: true,
        },
      },
    ] as Field[],
  }
}
