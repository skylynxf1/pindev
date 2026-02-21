/**
 * (main) route-group layout.
 *
 * Wires the @modal parallel slot so that navigating to /pin/[id]
 * client-side renders the PinModal overlay on top of the current page
 * instead of doing a hard full-page navigation.
 */
export default function MainLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}
