import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { Upload, Star, Trash2, X, ChevronLeft, ChevronRight, Plus, Image as ImageIcon } from 'lucide-react'

/**
 * RoomPhotoGallery — embeddable component for uploading & managing room photos.
 * Props:
 *   roomId      (required) — room ID
 *   boardingHouseId — for isolation guard (optional, just for display)
 *   readOnly    — if true, hide upload/delete controls (e.g. for booking view)
 */
const RoomPhotoGallery = ({ roomId, readOnly = false }) => {
  const { showToast } = useToast()
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState(null) // index
  const fileRef = useRef()

  useEffect(() => {
    if (roomId) fetchPhotos()
  }, [roomId])

  const fetchPhotos = async () => {
    setLoading(true)
    try {
      const r = await api.get(`/rooms/${roomId}/photos`)
      setPhotos(r.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    let uploaded = 0
    for (const file of files) {
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('caption', '')
        fd.append('setPrimary', uploaded === 0 && photos.length === 0 ? 'true' : 'false')
        await api.post(`/rooms/${roomId}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        uploaded++
      } catch (err) {
        showToast(`Lỗi upload: ${file.name}`, 'error')
      }
    }
    if (uploaded > 0) {
      showToast(`Đã upload ${uploaded} ảnh`, 'success')
      fetchPhotos()
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleDelete = async (photo) => {
    if (!confirm(`Xóa ảnh "${photo.originalName}"?`)) return
    try {
      await api.delete(`/room-photos/${photo.id}`)
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      showToast('Đã xóa ảnh', 'success')
    } catch (e) { showToast('Lỗi xóa ảnh', 'error') }
  }

  const handleSetPrimary = async (photo) => {
    try {
      await api.patch(`/room-photos/${photo.id}/primary?roomId=${roomId}`)
      setPhotos(prev => prev.map(p => ({ ...p, isPrimary: p.id === photo.id })))
      showToast('Đã đặt ảnh bìa', 'success')
    } catch (e) { showToast('Lỗi', 'error') }
  }

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightbox === null) return
    const handler = (e) => {
      if (e.key === 'ArrowRight') setLightbox(i => (i + 1) % photos.length)
      if (e.key === 'ArrowLeft')  setLightbox(i => (i - 1 + photos.length) % photos.length)
      if (e.key === 'Escape')     setLightbox(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, photos.length])

  if (loading) return (
    <div className="grid grid-cols-3 gap-3">
      {[1,2,3].map(i => <div key={i} className="aspect-square bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Upload button */}
      {!readOnly && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400 font-medium">{photos.length} ảnh · click ảnh để xem lớn</p>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
            <button disabled={uploading} onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-60 transition-all shadow-sm shadow-blue-500/20 hover:-translate-y-0.5">
              {uploading ? (
                <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Upload...</>
              ) : (
                <><Upload className="w-3.5 h-3.5" /> Thêm ảnh</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Gallery grid */}
      {photos.length === 0 ? (
        <div
          className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl py-12 text-slate-400 transition-all
            ${!readOnly ? 'cursor-pointer hover:border-blue-300 hover:bg-blue-50/30' : ''}`}
          onClick={!readOnly ? () => fileRef.current?.click() : undefined}>
          <ImageIcon className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm font-medium">{readOnly ? 'Chưa có ảnh' : 'Nhấn để upload ảnh phòng'}</p>
          {!readOnly && <p className="text-xs mt-1">Hỗ trợ JPG, PNG, WebP</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo, idx) => (
            <div key={photo.id}
              className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer shadow-sm hover:shadow-md"
              onClick={() => setLightbox(idx)}>
              <img src={photo.url} alt={photo.caption || photo.originalName || 'Room photo'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={e => { e.target.style.display = 'none' }} />

              {/* Primary badge */}
              {photo.isPrimary && (
                <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow">
                  <Star className="w-2.5 h-2.5 fill-current" /> BÌA
                </div>
              )}

              {/* Action overlay */}
              {!readOnly && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {!photo.isPrimary && (
                    <button onClick={e => { e.stopPropagation(); handleSetPrimary(photo) }}
                      className="w-8 h-8 bg-yellow-400 hover:bg-yellow-300 rounded-xl flex items-center justify-center shadow transition-all hover:scale-110"
                      title="Đặt làm ảnh bìa">
                      <Star className="w-4 h-4 text-yellow-900" />
                    </button>
                  )}
                  <button onClick={e => { e.stopPropagation(); handleDelete(photo) }}
                    className="w-8 h-8 bg-red-500 hover:bg-red-400 rounded-xl flex items-center justify-center shadow transition-all hover:scale-110"
                    title="Xóa ảnh">
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}

              {/* Caption */}
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                  <p className="text-[10px] text-white font-medium truncate">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}

          {/* Add more button */}
          {!readOnly && (
            <div
              className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 flex flex-col items-center justify-center cursor-pointer transition-all text-slate-400 hover:text-blue-500"
              onClick={() => fileRef.current?.click()}>
              <Plus className="w-7 h-7 mb-1" />
              <span className="text-[10px] font-bold">Thêm ảnh</span>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && photos[lightbox] && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(null)}>
          <button onClick={e => { e.stopPropagation(); setLightbox(null) }}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all">
            <X className="w-5 h-5" />
          </button>

          {photos.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setLightbox(i => (i - 1 + photos.length) % photos.length) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all z-10">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={e => { e.stopPropagation(); setLightbox(i => (i + 1) % photos.length) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all z-10">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="max-w-4xl max-h-[85vh] mx-auto px-16" onClick={e => e.stopPropagation()}>
            <img src={photos[lightbox].url} alt={photos[lightbox].caption || ''}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" />
            <div className="text-center mt-3">
              <p className="text-white/80 text-sm font-medium">{photos[lightbox].caption || photos[lightbox].originalName}</p>
              <p className="text-white/40 text-xs mt-1">{lightbox + 1} / {photos.length}</p>
            </div>
          </div>

          {/* Thumbnails */}
          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-4 overflow-x-auto max-w-full">
              {photos.map((p, i) => (
                <button key={p.id} onClick={e => { e.stopPropagation(); setLightbox(i) }}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${i === lightbox ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-80'}`}>
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RoomPhotoGallery
