// Debug mode - set to false for production
const DEBUG_MODE = false;

// Debug overlay for mobile - only create if debug mode is on
if (DEBUG_MODE) {
  const debugDiv = document.createElement('div');
  debugDiv.id = 'debug-overlay';
  debugDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:rgba(0,0,0,0.95);color:lime;padding:10px;z-index:999999;font-size:12px;font-family:monospace;max-height:40vh;overflow:auto;pointer-events:none;';
  debugDiv.innerHTML = '🔧 Debug Ready';
  document.body.appendChild(debugDiv);

  // Ensure overlay stays on top
  setInterval(() => {
    const d = document.getElementById('debug-overlay');
    if (d && d.parentNode !== document.body) {
      document.body.appendChild(d);
    }
  }, 1000);
}

export function debugLog(msg: string) {
  if (!DEBUG_MODE) return;
  const d = document.getElementById('debug-overlay');
  if (d) {
    const time = new Date().toLocaleTimeString();
    d.innerHTML += '<br>[' + time + '] ' + msg;
    d.scrollTop = d.scrollHeight;
  }
  console.log('[DEBUG]', msg);
}

// Global error handler
window.onerror = function(msg, url, lineNo, columnNo, error) {
  debugLog('❌ ERROR: ' + msg + ' (line ' + lineNo + ')');
  return false;
};

window.addEventListener('unhandledrejection', function(event) {
  debugLog('❌ Promise Error: ' + event.reason);
});

// Expose globally
(window as any).debugLog = debugLog;
