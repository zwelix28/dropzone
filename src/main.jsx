import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AppProvider } from "./context/AppContext.jsx";
import { capturePasswordRecoveryFromUrl } from "./lib/passwordRecovery.js";
import { registerServiceWorker } from "./lib/registerServiceWorker.js";

capturePasswordRecoveryFromUrl();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

registerServiceWorker();

