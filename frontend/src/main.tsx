import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { NotificationProvider } from "./context/NotificationContext.tsx";
import { VisibilityProvider } from "./context/VisibilityContext.tsx";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <NotificationProvider>
        <VisibilityProvider>
          <App />
        </VisibilityProvider>
      </NotificationProvider>
    </ThemeProvider>
  </StrictMode>,
);
