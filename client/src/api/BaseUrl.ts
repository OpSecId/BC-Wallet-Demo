import axios from 'axios'

export const baseRoute = process.env.REACT_APP_BASE_ROUTE ?? '/digital-trust/showcase'

/** CRA only injects REACT_APP_* when the dev server starts; if missing, path-only baseURL hits :3000 and the API never runs. */
function hostBackend(): string {
  const raw = process.env.REACT_APP_HOST_BACKEND?.trim()
  if (raw) {
    return raw.replace(/\/$/, '')
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://127.0.0.1:5000'
  }
  return ''
}

const backendOrigin = hostBackend()

export const baseUrl = backendOrigin + baseRoute
export const baseWsUrl = backendOrigin
export const socketPath = `${baseRoute}/demo/socket/`

export const apiCall = axios.create({ baseURL: baseUrl })
