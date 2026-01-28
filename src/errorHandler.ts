// Debug overlay for mobile
const debugDiv = document.createElement('div');
debugDiv.id = 'debug-overlay';
debugDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:rgba(0,0,0,0.8);color:lime;padding:10px;z-index:9999;font-size:11px;font-family:monospace;max-height:30vh;overflow:auto;';
debugDiv.innerHTML = 'Loading...';
document.body.appendChild(debugDiv);

export function debugLog(msg: string) {
  const d = document.getElementById('debug-overlay');
  if (d) {
    d.innerHTML += '<br>' + msg;
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
