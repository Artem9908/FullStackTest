import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChakraProvider } from '@chakra-ui/react'
import { MemoryRouter } from 'react-router-dom'
import { UserList } from '../UserList'
import { vi } from 'vitest'
import { getUsers, deleteUser } from '../../services/api'

// Mock API calls
vi.mock('../../services/api', () => ({
  getUsers: vi.fn(),
  deleteUser: vi.fn()
}))

// Setup test utils
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <ChakraProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {component}
        </MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>
  )
}

describe('UserList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('displays loading state initially', () => {
    // Mock loading state
    vi.mocked(getUsers).mockImplementation(() => new Promise(() => {}))
    
    renderWithProviders(<UserList />)
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('displays users when data is loaded', async () => {
    // Mock successful response
    const mockUsers = [
      { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-24T00:00:00Z' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2024-01-24T00:00:00Z' }
    ]
    
    vi.mocked(getUsers).mockResolvedValue({
      data: mockUsers,
      total: 2,
      page: 1,
      per_page: 10
    })
    
    renderWithProviders(<UserList />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    })
  })

  it('handles error state', async () => {
    // Mock error response
    vi.mocked(getUsers).mockRejectedValue(new Error('Failed to fetch users'))
    
    renderWithProviders(<UserList />)
    
    await waitFor(() => {
      expect(screen.getByText(/error loading users/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  it('filters users by name', async () => {
    // Mock filtered response
    const mockUsers = [
      { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-24T00:00:00Z' }
    ]
    
    vi.mocked(getUsers).mockResolvedValue({
      data: mockUsers,
      total: 1,
      page: 1,
      per_page: 10
    })
    
    renderWithProviders(<UserList />)
    
    const searchInput = screen.getByPlaceholderText(/search users/i)
    fireEvent.change(searchInput, { target: { value: 'John' } })
    
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalledWith(expect.objectContaining({
        search: 'John'
      }))
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  it('handles pagination', async () => {
    // Mock paginated response
    const mockUsers = [
      { id: 3, name: 'Page 2 User', email: 'page2@example.com', created_at: '2024-01-24T00:00:00Z' }
    ]
    
    vi.mocked(getUsers)
      .mockResolvedValueOnce({
        data: [{ id: 1, name: 'Page 1 User', email: 'page1@example.com', created_at: '2024-01-24T00:00:00Z' }],
        total: 2,
        page: 1,
        per_page: 1
      })
      .mockResolvedValueOnce({
        data: mockUsers,
        total: 2,
        page: 2,
        per_page: 1
      })
    
    renderWithProviders(<UserList />)
    
    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Page 1 User')).toBeInTheDocument()
    })
    
    // Click next page
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalledWith(expect.objectContaining({
        page: 2
      }))
      expect(screen.getByText('Page 2 User')).toBeInTheDocument()
    })
  })

  it('confirms and handles user deletion', async () => {
    // Mock successful deletion
    vi.mocked(deleteUser).mockResolvedValue({ success: true })
    
    const mockUsers = [
      { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-24T00:00:00Z' }
    ]
    
    vi.mocked(getUsers).mockResolvedValue({
      data: mockUsers,
      total: 1,
      page: 1,
      per_page: 10
    })
    
    renderWithProviders(<UserList />)
    
    // Wait for user to be displayed
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    
    // Click delete button
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    
    // Confirm deletion
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    
    await waitFor(() => {
      expect(deleteUser).toHaveBeenCalledWith(1)
      expect(screen.getByText(/user deleted successfully/i)).toBeInTheDocument()
    })
  })

  it('displays no users message when list is empty', async () => {
    // Mock empty response
    vi.mocked(getUsers).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      per_page: 10
    })
    
    renderWithProviders(<UserList />)
    
    await waitFor(() => {
      expect(screen.getByText(/no users found/i)).toBeInTheDocument()
    })
  })

  it('handles network errors gracefully', async () => {
    // Mock network error
    vi.mocked(getUsers).mockRejectedValue(new Error('Network error'))
    
    renderWithProviders(<UserList />)
    
    await waitFor(() => {
      expect(screen.getByText(/error loading users/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
    
    // Test retry functionality
    vi.mocked(getUsers).mockResolvedValueOnce({
      data: [{ id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-24T00:00:00Z' }],
      total: 1,
      page: 1,
      per_page: 10
    })
    
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })
}) 