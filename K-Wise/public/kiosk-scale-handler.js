/**
 * Kiosk Scale Handler
 * Handles viewport scaling for kiosk display (1080x1920)
 * Loaded before React app to prevent layout shift
 */
(function() {

  // Target kiosk resolution
  var KIOSK_WIDTH = 1080;
  var KIOSK_HEIGHT = 1920;

  /**
   * Apply scaling to fit kiosk resolution
   */
  function applyKioskScale() {
    var screenWidth = window.innerWidth || document.documentElement.clientWidth;
    var screenHeight = window.innerHeight || document.documentElement.clientHeight;

    // Only apply scaling if screen dimensions differ significantly from target
    if (Math.abs(screenWidth - KIOSK_WIDTH) < 50 && Math.abs(screenHeight - KIOSK_HEIGHT) < 50) {
      // Already at kiosk resolution, no scaling needed
      document.documentElement.style.fontSize = '16px';
      return;
    }

    // Calculate scale factor based on width (primary) and height (secondary)
    var scaleX = screenWidth / KIOSK_WIDTH;
    var scaleY = screenHeight / KIOSK_HEIGHT;
    var scale = Math.min(scaleX, scaleY);

    // Apply scale via CSS custom property for use in stylesheets
    document.documentElement.style.setProperty('--kiosk-scale', scale);
    document.documentElement.style.setProperty('--kiosk-width', KIOSK_WIDTH + 'px');
    document.documentElement.style.setProperty('--kiosk-height', KIOSK_HEIGHT + 'px');

    // Set base font size for rem scaling
    document.documentElement.style.fontSize = (16 * scale) + 'px';
  }

  // Apply on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyKioskScale);
  } else {
    applyKioskScale();
  }

  // Re-apply on resize (debounced)
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyKioskScale, 150);
  });
})();
