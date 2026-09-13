/**
 * EventBus - Pub/Sub event dispatcher for decoupled game communication
 */
export class EventBus {
  constructor() {
    this.events = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event
   * @param {Function} callback
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event only once
   * @param {string} event
   * @param {Function} callback
   */
  once(event, callback) {
    const unregister = this.on(event, (...args) => {
      unregister();
      callback(...args);
    });
    return unregister;
  }

  /**
   * Unsubscribe from an event
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    if (!this.events.has(event)) return;
    const callbacks = this.events.get(event).filter(cb => cb !== callback);
    if (callbacks.length === 0) {
      this.events.delete(event);
    } else {
      this.events.set(event, callbacks);
    }
  }

  /**
   * Dispatch an event to all subscribers
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    if (!this.events.has(event)) return;
    for (const callback of this.events.get(event)) {
      try {
        callback(data);
      } catch (err) {
        console.error(`Error in event handler for '${event}':`, err);
      }
    }
  }
}

export const eventBus = new EventBus();
