// Simple event bus for cross-page data refresh
const eventBus = {
  listeners: {},
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(callback)
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback)
    }
  },
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data))
    }
  },
}

export const EVENTS = {
  PAYMENT_CHANGED: 'payment_changed',
  INVOICE_CHANGED: 'invoice_changed',
}

export default eventBus
