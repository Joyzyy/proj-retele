import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { ThemeProvider } from "./components/theme-provider.tsx";
import { AppRoutes } from "./routes.tsx";
import { BrowserRouter } from "react-router-dom";
import { WebSocketProvider } from "./WebSocketProvider.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <BrowserRouter>
        <WebSocketProvider>
          <AppRoutes />
        </WebSocketProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
