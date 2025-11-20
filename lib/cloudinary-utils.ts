// lib/cloudinary-utils.ts
import cloudinary from './cloudinary'

/**
 * Gera URL otimizada para vídeo com diferentes qualidades
 */
export function getOptimizedVideoUrl(publicId: string, options: {
  quality?: 'auto' | 'low' | 'medium' | 'high'
  width?: number
  height?: number
  format?: 'mp4' | 'webm' | 'auto'
} = {}) {
  const {
    quality = 'auto',
    width,
    height,
    format = 'auto',
  } = options

  const transformation = []

  if (quality !== 'auto') {
    const qualityMap = {
      low: 'q_30',
      medium: 'q_50',
      high: 'q_80',
    }
    transformation.push(qualityMap[quality])
  } else {
    transformation.push('q_auto')
  }

  if (width) transformation.push(`w_${width}`)
  if (height) transformation.push(`h_${height}`)
  if (format !== 'auto') transformation.push(`f_${format}`)

  return cloudinary.url(publicId, {
    resource_type: 'video',
    transformation: transformation.join(','),
    secure: true,
  })
}

/**
 * Gera thumbnail do vídeo
 */
export function getVideoThumbnail(publicId: string, time: number = 1) {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    transformation: [
      { start_offset: `${time}s` },
      { width: 400, height: 600, crop: 'fill' },
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ],
    secure: true,
  })
}

/**
 * Gera URL para streaming adaptativo (HLS)
 */
export function getStreamingUrl(publicId: string) {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    streaming_profile: 'hd',
    format: 'm3u8',
    secure: true,
  })
}
