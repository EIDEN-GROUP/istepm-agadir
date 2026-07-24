import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { AuthProvider } from "@/lib/auth";
import { DashboardI18nProvider } from "@/lib/dashboard-i18n";
import { IstpmProvider } from "@/lib/istpm-store";
import { AppLoadingGate } from "@/components/brand-loader";
import "./styles.css";

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: { queryClient },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DashboardI18nProvider>
          <IstpmProvider>
            <AppLoadingGate>
              <RouterProvider router={router} />
            </AppLoadingGate>
          </IstpmProvider>
        </DashboardI18nProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
