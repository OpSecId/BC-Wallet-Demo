import { baseUrl } from '../api/BaseUrl'

export function prependApiUrl(path: string | undefined | null) {
  if (path == null || path === '') {
    return ''
  }
  let fullPath = `${baseUrl}${path}`

  if (path.startsWith('data:')) {
    // path is a data url treat it as is
    fullPath = path
  }
  return fullPath
}
