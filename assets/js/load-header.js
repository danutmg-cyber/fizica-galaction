/**
 * FIZICA GALACTION - Load Header Component
 * Încarcă header-ul dinamic în fiecare pagină
 */

function loadHeader() {
  const headerContainer = document.getElementById('header-container');
  
  if (!headerContainer) {
    console.warn('⚠️ Nu am găsit #header-container în pagină');
    return;
  }

  // Determină calea corectă la componenta header
  const currentPath = window.location.pathname;
  const depth = (currentPath.match(/\//g) || []).length;
  const relativePath = '../'.repeat(Math.max(depth - 2, 0));
  const headerPath = relativePath + 'assets/components/header.html';

  // Fetch header-ul
  fetch(headerPath)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(html => {
      headerContainer.innerHTML = html;
      console.log('✅ Header încărcat cu succes');
    })
    .catch(error => {
      console.error('❌ Eroare la încărcarea header-ului:', error);
      // Fallback: creează header manual
      createFallbackHeader(headerContainer);
    });
}

/**
 * Fallback header dacă fetch-ul nu merge
 */
function createFallbackHeader(container) {
  container.innerHTML = `
    <header class="site-header">
      <div class="container flex flex-between">
        <div>
          <h1 class="site-title">Fizica Galaction</h1>
          <p class="site-subtitle">Platformă educațională • Prof. DĂNUȚ ANDRONIE</p>
        </div>
        <button class="theme-toggle" title="Toggle Dark Mode">☀️</button>
      </div>
    </header>
  `;
  console.log('✅ Header fallback creat');
}

// Execută când DOM este gata
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadHeader);
} else {
  loadHeader();
}
