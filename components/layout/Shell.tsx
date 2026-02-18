import Header from './Header'

interface ShellProps {
  children: React.ReactNode
}

/**
 * Shell wraps every page.
 * – Renders the fixed Header
 * – Applies has-header to offset content below the fixed bar
 * – Sets a max-width and horizontal padding at the outermost level
 *   so individual pages only need to worry about vertical spacing
 */
export default function Shell({ children }: ShellProps) {
  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg)' }}>
      <Header />
      <main id="main-content" className="has-header">
        {children}
      </main>
    </div>
  )
}