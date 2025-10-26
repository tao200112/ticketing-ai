import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

describe('Frontend Health Check', () => {
  it('renders home page without crashing', () => {
    render(<Home />)
    expect(screen.getByText(/Partytix/i)).toBeInTheDocument()
  })

  it('has proper page structure', () => {
    render(<Home />)
    
    // Check for main elements
    expect(screen.getByRole('main')).toBeInTheDocument()
    
    // Check for navigation
    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
  })

  it('loads without JavaScript errors', () => {
    // This test ensures the page loads without throwing errors
    expect(() => render(<Home />)).not.toThrow()
  })
})
