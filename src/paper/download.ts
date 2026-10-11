/** Offer a file built in the browser as a download. Returns false if the browser refused. */
export function downloadBlob(filename: string, blob: Blob): boolean {
  try {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    return true
  } catch {
    return false
  }
}
