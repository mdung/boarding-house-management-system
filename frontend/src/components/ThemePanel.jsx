import { useTheme } from '../context/ThemeContext'
import { X, Sun, Moon, Minimize2, Maximize2, RotateCcw } from 'lucide-react'

const ThemePanel = () => {
  const { settings, update, showPanel, setShowPanel, THEMES, RADIUS } = useTheme()
  if (!showPanel) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm"
        onClick={() => setShowPanel(false)}
        style={{ animation: 'fadeIn 0.15s ease' }} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 z-[81] w-80 bg-white shadow-2xl flex flex-col"
        style={{ animation: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)' }}>

        <style>{`
          @keyframes fadeIn{from{opacity:0}to{opacity:1}}
          @keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}
        `}</style>

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-black text-slate-900 text-base">⚙️ Tùy chỉnh giao diện</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Màu sắc · Bo góc · Chế độ hiển thị</p>
          </div>
          <button onClick={() => setShowPanel(false)}
            className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-all hover:rotate-90 duration-200">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Theme Color */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">🎨 Màu chủ đạo</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(THEMES).map(([key, t]) => (
                <button key={key} onClick={() => update('theme', key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 ${settings.theme === key
                    ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-300 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                  <div className="w-5 h-5 rounded-full shadow-inner flex-shrink-0" style={{ background: t.primary }} />
                  <span className="text-xs font-bold text-slate-700">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Border Radius */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">📐 Bo góc</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'sharp', label: 'Vuông', preview: 'rounded-sm' },
                { key: 'rounded', label: 'Bo tròn', preview: 'rounded-xl' },
                { key: 'pill', label: 'Tròn max', preview: 'rounded-3xl' },
              ].map(r => (
                <button key={r.key} onClick={() => update('radius', r.key)}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 border transition-all duration-200 ${r.preview} ${settings.radius === r.key
                    ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-300'
                    : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className={`w-8 h-6 border-2 border-slate-400 ${r.preview}`} />
                  <span className="text-[10px] font-bold text-slate-600">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dark Mode */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">🌙 Chế độ tối</label>
            <button onClick={() => update('darkMode', !settings.darkMode)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 ${settings.darkMode
                ? 'bg-slate-900 border-slate-700 text-white'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              <div className="flex items-center gap-2">
                {settings.darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <span className="text-sm font-bold">{settings.darkMode ? 'Dark Mode' : 'Light Mode'}</span>
              </div>
              <div className={`w-10 h-5 rounded-full transition-all duration-300 ${settings.darkMode ? 'bg-blue-500' : 'bg-slate-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 mt-0.5 ${settings.darkMode ? 'ml-5.5 translate-x-[22px]' : 'ml-0.5'}`} />
              </div>
            </button>
          </div>

          {/* Compact Mode */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">📏 Chế độ gọn</label>
            <button onClick={() => update('compact', !settings.compact)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 ${settings.compact
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              <div className="flex items-center gap-2">
                {settings.compact ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span className="text-sm font-bold">{settings.compact ? 'Compact' : 'Comfortable'}</span>
              </div>
              <div className={`w-10 h-5 rounded-full transition-all duration-300 ${settings.compact ? 'bg-blue-500' : 'bg-slate-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 mt-0.5 ${settings.compact ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">👁️ Preview</label>
            <div className={`p-4 border border-slate-200 space-y-2 ${settings.radius === 'sharp' ? 'rounded-sm' : settings.radius === 'pill' ? 'rounded-3xl' : 'rounded-xl'}`}
              style={{ background: settings.darkMode ? '#1e293b' : '#fff' }}>
              <div className="h-3 rounded-full" style={{ background: THEMES[settings.theme]?.primary, width: '60%' }} />
              <div className="h-3 rounded-full bg-slate-200" style={{ width: '80%' }} />
              <div className="h-3 rounded-full bg-slate-100" style={{ width: '40%' }} />
              <div className="flex gap-2 mt-3">
                <div className="h-8 flex-1 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: THEMES[settings.theme]?.primary }}>Button</div>
                <div className="h-8 flex-1 rounded-lg border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">Cancel</div>
              </div>
            </div>
          </div>

          {/* Reset */}
          <button onClick={() => {
            update('theme', 'blue')
            update('radius', 'rounded')
            update('darkMode', false)
            update('compact', false)
          }}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">
            <RotateCcw className="w-3.5 h-3.5" /> Reset mặc định
          </button>
        </div>
      </div>
    </>
  )
}

export default ThemePanel
