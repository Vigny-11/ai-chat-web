const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 6 * 1024 * 1024
const MAX_DIMENSION = 1400

export const validateImageFile = (file: File) => {
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('仅支持 JPG、JPEG、PNG 或 WebP 图片。')
  if (file.size > MAX_FILE_SIZE) throw new Error('图片不能超过 6MB，请压缩后再上传。')
}

export const compressImage = async (file: File): Promise<{ dataUrl: string; mimeType: string }> => {
  validateImageFile(file)
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('浏览器无法处理图片。')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const mimeType = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
  const dataUrl = canvas.toDataURL(mimeType, 0.82)
  return { dataUrl, mimeType }
}
