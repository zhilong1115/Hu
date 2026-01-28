// Global error handler for mobile debugging
window.onerror = function(msg, url, lineNo, columnNo, error) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:10px;z-index:9999;font-size:12px;';
  errorDiv.innerHTML = `Error: ${msg}<br>Line: ${lineNo}`;
  document.body.appendChild(errorDiv);
  return false;
};

window.addEventListener('unhandledrejection', function(event) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position:fixed;top:50px;left:0;right:0;background:orange;color:white;padding:10px;z-index:9999;font-size:12px;';
  errorDiv.innerHTML = `Promise Error: ${event.reason}`;
  document.body.appendChild(errorDiv);
});
