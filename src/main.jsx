import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createRoot } from "react-dom/client";
import { AppCommandCenter } from "./AppCommandCenter.jsx";
import "./styles.css";
import "./foundation.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppCommandCenter />
    </QueryClientProvider>
  </React.StrictMode>,
);
