/**
 * ModalOverlay - fixes mobile keyboard pushing modal off screen
 * Uses dvh (dynamic viewport height) which shrinks when keyboard opens
 */
const ModalOverlay = ({ children, onClick, className = '' }) => (
  <div
    onClick={onClick}
    className={`fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto ${className}`}
    style={{ height: '100dvh', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
  >
    <style>{`
      @media (min-width: 640px) {
        .modal-overlay-inner { align-items: center !important; }
      }
    `}</style>
    <div className="modal-overlay-inner w-full flex items-end sm:items-center justify-center min-h-full">
      {children}
    </div>
  </div>
)

export default ModalOverlay
