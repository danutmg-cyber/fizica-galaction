/**
 * FIZICA GALACTION - Visitor Counter
 * Contorizează vizitatori unici + total vizite
 * Fără salvare de rezultate de teste
 */

class VisitorCounter {
  constructor() {
    this.VISITORS_STORAGE_KEY = 'fizica-galaction-visitors';
    this.VISITS_STORAGE_KEY = 'fizica-galaction-total-visits';
    this.LAST_VISIT_STORAGE_KEY = 'fizica-galaction-last-visit';
    this.VISIT_TIMEOUT = 24 * 60 * 60 * 1000; // 24 ore
    
    this.init();
  }

  /**
   * Inițializare
   */
  init() {
    this.recordVisit();
    this.displayStats();
  }

  /**
   * Înregistrează o vizită nouă
   */
  recordVisit() {
    const now = Date.now();
    const lastVisit = parseInt(localStorage.getItem(this.LAST_VISIT_STORAGE_KEY)) || 0;
    
    // Incrementează total vizite
    const totalVisits = this.getTotalVisits() + 1;
    localStorage.setItem(this.VISITS_STORAGE_KEY, totalVisits.toString());
    
    // Incrementează vizitatori unici (o dată la 24h)
    if (now - lastVisit > this.VISIT_TIMEOUT) {
      const uniqueVisitors = this.getUniqueVisitors() + 1;
      localStorage.setItem(this.VISITORS_STORAGE_KEY, uniqueVisitors.toString());
    }
    
    // Actualizează timestamp-ul ultimei vizite
    localStorage.setItem(this.LAST_VISIT_STORAGE_KEY, now.toString());
  }

  /**
   * Obține numărul de vizitatori unici
   */
  getUniqueVisitors() {
    return parseInt(localStorage.getItem(this.VISITORS_STORAGE_KEY)) || 0;
  }

  /**
   * Obține total vizite
   */
  getTotalVisits() {
    return parseInt(localStorage.getItem(this.VISITS_STORAGE_KEY)) || 0;
  }

  /**
   * Obține ultima vizită
   */
  getLastVisit() {
    return parseInt(localStorage.getItem(this.LAST_VISIT_STORAGE_KEY)) || 0;
  }

  /**
   * Afișează statisticile (dacă există container)
   */
  displayStats() {
    const container = document.querySelector('[data-visitor-stats]');
    
    if (container) {
      const uniqueVisitors = this.getUniqueVisitors();
      const totalVisits = this.getTotalVisits();
      
      container.innerHTML = `
        <div style="text-align: center; padding: 1rem; background: rgba(52, 152, 219, 0.1); border-radius: 0.5rem; border: 1px solid rgba(52, 152, 219, 0.2);">
          <p style="margin: 0.5rem 0; font-size: 0.9rem; color: var(--text-secondary);">
            <strong>👥 Vizitatori unici:</strong> <span style="color: var(--primary-accent); font-weight: bold;">${uniqueVisitors}</span>
          </p>
          <p style="margin: 0.5rem 0; font-size: 0.9rem; color: var(--text-secondary);">
            <strong>📊 Total vizite:</strong> <span style="color: var(--secondary-accent); font-weight: bold;">${totalVisits}</span>
          </p>
        </div>
      `;
    }
  }

  /**
   * Resetează contoare (doar pentru administrator)
   */
  reset() {
    localStorage.removeItem(this.VISITORS_STORAGE_KEY);
    localStorage.removeItem(this.VISITS_STORAGE_KEY);
    localStorage.removeItem(this.LAST_VISIT_STORAGE_KEY);
    console.log('✅ Contoare vizitatori resetate');
  }

  /**
   * Exportă statistici (pentru analytics)
   */
  getStats() {
    return {
      uniqueVisitors: this.getUniqueVisitors(),
      totalVisits: this.getTotalVisits(),
      lastVisit: new Date(this.getLastVisit()).toLocaleString('ro-RO'),
      timestamp: new Date().toISOString()
    };
  }
}

// Inițializare automată când DOM este gata
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.visitorCounter = new VisitorCounter();
  });
} else {
  window.visitorCounter = new VisitorCounter();
}

// Export pentru utilizare în alte module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VisitorCounter;
}
