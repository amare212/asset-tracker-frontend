
const API_BASE_URL = 'http://localhost:8082/api'

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token')

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const responseText = await response.text()
    let message = responseText || `Request failed: ${response.status}`

    try {
      const data = JSON.parse(responseText)
      message = data.message || data.error || message
    } catch {
      // Keep the original response message.
    }

    const error = new Error(message)
    error.status = response.status
    throw error
  }

  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type')

  return contentType?.includes('application/json')
    ? response.json()
    : null
}

export async function login(username, password) {
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

  const token = result?.token || result?.accessToken

  if (!token) {
    throw new Error('Login response did not contain a token.')
  }

  localStorage.setItem('token', token)
  return result
}

export function logout() {
  localStorage.removeItem('token')
}
