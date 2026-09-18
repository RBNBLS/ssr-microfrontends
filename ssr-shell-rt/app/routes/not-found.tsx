import { data } from 'react-router'

// Returned, not thrown: a thrown 404 is an error and gets logged by the
// framework's default handleError; a returned one is just a response whose
// status is 404.
export function loader() {
  return data(null, { status: 404 })
}

export function meta() {
  return [{ title: 'Not found' }]
}

export default function NotFound() {
  return <p style={{ padding: 8 }}>Not found.</p>
}
