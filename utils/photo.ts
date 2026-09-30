/**
 * Center-crop an image file to a square JPEG. Redrawing it on a canvas also
 * drops EXIF metadata such as GPS location.
 */
export async function squarePhoto(file: File, size = 256): Promise<Blob> {
  const img = await createImageBitmap(file)
  const side = Math.min(img.width, img.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  canvas.getContext('2d')!.drawImage(
    img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size,
  )
  img.close()
  return new Promise((resolve, reject) => canvas.toBlob(
    b => (b ? resolve(b) : reject(new Error('Could not read that image.'))), 'image/jpeg', 0.85,
  ))
}
