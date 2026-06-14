import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error filtering to suppress benign browser extension / MetaMask errors in iframe sandbox
if (typeof window !== "undefined") {
  const isExtensionError = (text: string) => {
    const low = text.toLowerCase();
    return (
      low.includes("metamask") || 
      low.includes("ethereum") || 
      low.includes("wallet") || 
      low.includes("rpc") ||
      low.includes("extension") ||
      low.includes("crypto") ||
      low.includes("web3")
    );
  };

  window.addEventListener("error", (event) => {
    const msg = event.message || "";
    const errorMsg = event.error?.message || "";
    if (isExtensionError(msg) || isExtensionError(errorMsg)) {
      event.preventDefault();
      event.stopPropagation();
      console.warn("Muted benign browser extension error:", msg || errorMsg);
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reasonMsg = String(event.reason?.message || event.reason || "").toLowerCase();
    if (isExtensionError(reasonMsg)) {
      event.preventDefault();
      event.stopPropagation();
      console.warn("Muted benign browser extension promise rejection:", reasonMsg);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

