import '@testing-library/jest-dom/vitest'

const KEYS = [
  'ff-admin-demo-state',
  'kyc-review-queue-state',
  'refunds-dashboard-state',
  'novaops-current-user',
  'novaops-theme',
]

beforeEach(() => {
  for (const key of KEYS) {
    localStorage.removeItem(key)
  }
})

afterEach(() => {
  for (const key of KEYS) {
    localStorage.removeItem(key)
  }
})
