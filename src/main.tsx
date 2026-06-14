import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error filtering to suppress benign browser extension / MetaMask errors in iframe sandbox
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    const msg = event.message?.toLowerCase() || "";
    if (
      msg.includes("metamask") || 
      msg.includes("ethereum") || 
      msg.includes("wallet") || 
      msg.includes("rpc") ||
      msg.includes("extension")
    ) {
      event.preventDefault();
      event.stopPropagation();
      console.warn("Muted benign browser extension error:", event.message);
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reasonMsg = String(event.reason?.message || event.reason).toLowerCase();
    if (
      reasonMsg.includes("metamask") || 
      reasonMsg.includes("ethereum") || 
      reasonMsg.includes("wallet") || 
      reasonMsg.includes("rpc") ||
      reasonMsg.includes("extension")
    ) {
      event.preventDefault();
      event.stopPropagation();
      console.warn("Muted benign browser extension promise rejection:", event.reason?.message || event.reason);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

