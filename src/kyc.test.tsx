import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import KycQueue from './KycQueue.tsx'
import { AllProviders } from './test/wrapper.tsx'

describe('KYC review queue', () => {
  it('requires assignment before a reviewer can approve a case', async () => {
    const user = userEvent.setup()
    localStorage.setItem('novaops-current-user', 'demo-user')
    render(<KycQueue />, { wrapper: AllProviders })

    await waitFor(() => screen.getByRole('heading', { name: 'KYC review queue' }))

    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /Assign to me/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Approve' }))

    await user.click(screen.getByRole('button', { name: /^Approved/ }))
  })

  it('rejects a case using a reason and logs the rejection', async () => {
    const user = userEvent.setup()
    localStorage.setItem('novaops-current-user', 'demo-user')
    render(<KycQueue />, { wrapper: AllProviders })

    await waitFor(() => screen.getByRole('heading', { name: 'KYC review queue' }))

    await user.click(screen.getByRole('button', { name: /Assign to me/ }))
    await user.click(screen.getByRole('button', { name: 'Reject' }))

    await waitFor(() => screen.getByRole('heading', { name: /Reject/ }))

    const comboboxes = screen.getAllByRole('combobox')
    const reasonSelect = comboboxes[comboboxes.length - 1]
    await user.selectOptions(reasonSelect, 'Name or DOB mismatch')

    const submitButtons = screen.getAllByRole('button', { name: /Reject case/ })
    await waitFor(() => expect(submitButtons[submitButtons.length - 1]).toBeEnabled())

    await user.click(submitButtons[submitButtons.length - 1])

    await user.click(screen.getByRole('button', { name: /^Rejected/ }))
  })

  it('requests information and supports the Other option', async () => {
    const user = userEvent.setup()
    localStorage.setItem('novaops-current-user', 'demo-user')
    render(<KycQueue />, { wrapper: AllProviders })

    await waitFor(() => screen.getByRole('heading', { name: 'KYC review queue' }))

    await user.click(screen.getByRole('button', { name: /Assign to me/ }))
    await user.click(screen.getByRole('button', { name: 'Request information' }))

    await waitFor(() => screen.getByRole('heading', { name: /Request information/ }))

    const submitButtons = screen.getAllByRole('button', { name: /^Request information$/ })
    expect(submitButtons[submitButtons.length - 1]).toBeDisabled()

    await user.click(screen.getByLabelText('Other'))
    await user.type(screen.getByPlaceholderText(/Describe what additional information is required/i), 'Bank statement')

    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /^Request information$/ })
      expect(buttons[buttons.length - 1]).toBeEnabled()
    })

    const confirmButtons = screen.getAllByRole('button', { name: /^Request information$/ })
    await user.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => screen.getByRole('button', { name: /^Waiting for customer information/ }))
    await user.click(screen.getByRole('button', { name: /^Waiting for customer information/ }))
  })

  it('filters the case list when searching and resets with the clear button', async () => {
    const user = userEvent.setup()
    localStorage.setItem('novaops-current-user', 'demo-user')
    render(<KycQueue />, { wrapper: AllProviders })

    await waitFor(() => screen.getByRole('heading', { name: 'KYC review queue' }))

    const search = screen.getByPlaceholderText('Search by name, email or case ID...')
    await user.type(search, 'Amelia')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Amelia Hartley/ })).toBeInTheDocument()
    })

    const clearButton = screen.getByRole('button', { name: /Clear search/i })
    await user.click(clearButton)
    expect(search).toHaveValue('')
  })
})
