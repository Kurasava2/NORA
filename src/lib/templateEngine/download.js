const DEFAULT_XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export function downloadBytes(bytes, fileName, mimeType = DEFAULT_XLSX_MIME) {
  const blob = new Blob([bytes], { type: mimeType })
  const downloadLink = document.createElement('a')
  downloadLink.href = URL.createObjectURL(blob)
  downloadLink.download = fileName
  document.body.appendChild(downloadLink)
  downloadLink.click()
  downloadLink.remove()

  setTimeout(() => URL.revokeObjectURL(downloadLink.href), 1500)
}
