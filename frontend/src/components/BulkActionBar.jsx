import { Trash2, X } from 'lucide-react'

const BulkActionBar = ({ selectedCount, onDelete, onClear, extraActions = [] }) => {
  if (selectedCount === 0) return null
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl">
      <span className="text-sm font-medium">{selectedCount} selected</span>
      <div className="w-px h-4 bg-gray-600" />
      {extraActions.map((a, i) => (
        <button key={i} onClick={a.onClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${a.className || 'bg-gray-700 hover:bg-gray-600'}`}>
          {a.icon && <a.icon className="w-3.5 h-3.5" />}
          {a.label}
        </button>
      ))}
      <button onClick={onDelete}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors">
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>
      <button onClick={onClear} className="text-gray-400 hover:text-white ml-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default BulkActionBar
