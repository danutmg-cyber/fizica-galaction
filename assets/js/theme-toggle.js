/**
 * FIZICA GALACTION - Theme Toggle Script
 * Gestionează Light/Dark Mode
 * ⚠️ NU salvează rezultate de teste - doar preferințe de temă
 */

class ThemeManager {
  constructor() {
    this.HTML = document.documentElement;
    this.STORAGE_KEY = 'fizica-galaction-theme';
    this.THEME_BUTTON = document.querySelector('.theme-toggle');
    
    this.THEMES = {
      light: {
        name: 'light',
        icon: '☀️',
        label: 'Light Mode'
      },
      dark: {
        name: 'dark',
        icon: '🌙',
        label: 'Dark Mode'
      }
    };

    this.init();
  }

  /**
   * Inițializare
   */
  init() {
    this.loadTheme();
    this.attachEventListeners();
    this.createThemeToggleButton();
  }

  /**
   * Încarcă tema salvată sau detectează preferința sistemului
   */
  loadTheme() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    
    if (saved) {
      this.setTheme(saved);
    } else {
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      this.setTheme(systemPreference);
    }
  }

  /**
   * Setează tema curentă
   */
  setTheme(themeName) {
    const theme = this.THEMES[themeName];
    
    if (!theme) return;

    // Îndepărtează tema anterioară
    Object.keys(this.THEMES).forEach(t => {
      this.HTML.classList.remove(this.THEMES[t].name);
    });

    // Adaugă noua temă
    this.HTML.classList.add(theme.name);
    localStorage.setItem(this.STORAGE_KEY, themeName);

    // Actualizează butonul
    if (this.THEME_BUTTON) {
      this.THEME_BUTTON.textContent = theme.icon;
      this.THEME_BUTTON.title = theme.label;
    }

    // Emit custom event
    this.emitEvent('themeChanged', { theme: themeName });
  }

  /**
   * Toggle între light și dark mode
   */
  toggleTheme() {
    const current = this.getCurrentTheme();
    const next = current === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  /**
   * Obține tema curentă
   */
  getCurrentTheme() {
    return localStorage.getItem(this.STORAGE_KEY) || 'light';
  }

  /**
   * Atașează event listeners
   */
  attachEventListeners() {
    // Toggle tema la click buton
    if (this.THEME_BUTTON) {
      this.THEME_BUTTON.addEventListener('click', () => this.toggleTheme());
    }

    // Detectează schimbarea preferinței sistemului
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const newTheme = e.matches ? 'dark' : 'light';
      this.setTheme(newTheme);
    });

    // Detectează schimbarea tabnelului
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.loadTheme();
      }
    });
  }

  /**
   * Creează butonul de toggle pentru temă
   */
  createThemeToggleButton() {
    if (this.THEME_BUTTON) {
      const current = this.getCurrentTheme();
      const theme = this.THEMES[current];
      this.THEME_BUTTON.textContent = theme.icon;
      this.THEME_BUTTON.title = theme.label;
    }
  }

  /**
   * Emite event personalizat
   */
  emitEvent(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    document.dispatchEvent(event);
  }

  /**
   * API publică: Obține toate temele disponibile
   */
  getAvailableThemes() {
    return Object.values(this.THEMES);
  }

  /**
   * API publică: Resetează la setările implicite
   */
  reset() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.init();
  }
}

// Inițializare automată când DOM este gata
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
  });
} else {
  window.themeManager = new ThemeManager();
}

// Export pentru utilizare în alte module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
}
