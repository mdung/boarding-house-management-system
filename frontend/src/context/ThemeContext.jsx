import { createContext, useContext, useState, useEffect } from 'react'

const THEMES = {
  blue:   { name: 'Blue',   primary: '#3b82f6', primaryDark: '#2563eb', accent: '#6366f1', sidebar: '#1e293b', emoji: '🔵' },
  purple: { name: 'Purple', primary: '#8b5cf6', primaryDark: '#7c3aed', accent: '#a855f7', sidebar: '#1e1b4b', emoji: '🟣' },
  orange: { name: 'Orange', primary: '#f97316', primaryDark: '#ea580c', accent: '#f59e0b', sidebar: '#431407', emoji: '🟠' },
  green:  { name: 'Green',  primary: '#10b981', primaryDark: '#059669', accent: '#14b8a6', sidebar: '#064e3b', emoji: '🟢' },
  rose:   { name: 'Rose',   primary: '#f43f5e', primaryDark: '#e11d48', accent: '#fb7185', sidebar: '#4c0519', emoji: '🔴' },
  slate:  { name: 'Dark',   primary: '#64748b', primaryDark: '#475569', accent: '#94a3b8', sidebar: '#0f172a', emoji: '⚫' },
}

const RADIUS = { sharp: '0.25rem', rounded: '0.75rem', pill: '1.25rem' }

const defaults = { theme: 'blue', radius: 'rounded', darkMode: false, compact: false }

const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem('app_theme')) } }
    catch { return defaults }
  })
  const [showPanel, setShowPanel] = useState(false)

  useEffect(() => {
    localStorage.setItem('app_theme', JSON.stringify(settings))
    const t = THEMES[settings.theme] || THEMES.blue
    const r = RADIUS[settings.radius] || RADIUS.rounded
    const root = document.documentElement
    root.style.setProperty('--color-primary', t.primary)
    root.style.setProperty('--color-primary-dark', t.primaryDark)
    root.style.setProperty('--color-accent', t.accent)
    root.style.setProperty('--color-sidebar', t.sidebar)
    root.style.setProperty('--radius', r)
    root.classList.toggle('dark-mode', settings.darkMode)
    root.classList.toggle('compact-mode', settings.compact)
  }, [settings])

  const update = (key, value) => setSettings(p => ({ ...p, [key]: value }))

  return (
    <ThemeContext.Provider value={{ settings, update, showPanel, setShowPanel, THEMES, RADIUS }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
