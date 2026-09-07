import { useEffect } from "react";
import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAppStore } from "./store/appStore";
import { useDataStore } from "./store/dataStore";
import AppHeader from "./components/AppHeader";
import LoginPage from "./pages/LoginPage";
import GateControllerPage from "./pages/GateControllerPage";
import TemplateGalleryPage from "./pages/TemplateGalleryPage";
import TemplateEditorPage from "./pages/TemplateEditorPage";
import AdminScreensPage from "./pages/AdminScreensPage";
import AdminAirlinesPage from "./pages/AdminAirlinesPage";
import AdminBroadcastPage from "./pages/AdminBroadcastPage";
import AdminGatesPage from "./pages/AdminGatesPage";
import PlayerPage from "./pages/PlayerPage";

function Require({ role, children }: { role: "airline_officer" | "airport_admin"; children: ReactNode }) {
  const session = useAppStore((s) => s.session);
  if (!session) return <Navigate to="/login" replace />;
  if (session.role !== role) {
    return (
      <Navigate
        to={session.role === "airport_admin" ? "/admin/screens" : `/gate/${session.assignedGate}`}
        replace
      />
    );
  }
  return <>{children}</>;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main">{children}</main>
    </div>
  );
}

export default function App() {
  const session = useAppStore((s) => s.session);

  useEffect(() => {
    const code = session?.role === "airline_officer" ? session.airlineCode : undefined;
    useDataStore.getState().init(code);
  }, [session]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/player/:gateId/:screenId" element={<PlayerPage />} />

      <Route
        path="/gate/:gateId"
        element={
          <Require role="airline_officer">
            <Shell>
              <GateControllerPage />
            </Shell>
          </Require>
        }
      />
      <Route
        path="/templates/gallery"
        element={
          <Require role="airline_officer">
            <Shell>
              <TemplateGalleryPage />
            </Shell>
          </Require>
        }
      />
      <Route
        path="/templates/editor"
        element={
          <Require role="airline_officer">
            <Shell>
              <TemplateEditorPage />
            </Shell>
          </Require>
        }
      />
      <Route
        path="/templates/editor/:templateId"
        element={
          <Require role="airline_officer">
            <Shell>
              <TemplateEditorPage />
            </Shell>
          </Require>
        }
      />

      <Route
        path="/admin/screens"
        element={
          <Require role="airport_admin">
            <Shell>
              <AdminScreensPage />
            </Shell>
          </Require>
        }
      />
      <Route
        path="/admin/gates"
        element={
          <Require role="airport_admin">
            <Shell>
              <AdminGatesPage />
            </Shell>
          </Require>
        }
      />
      <Route
        path="/admin/airlines"
        element={
          <Require role="airport_admin">
            <Shell>
              <AdminAirlinesPage />
            </Shell>
          </Require>
        }
      />
      <Route
        path="/admin/broadcast"
        element={
          <Require role="airport_admin">
            <Shell>
              <AdminBroadcastPage />
            </Shell>
          </Require>
        }
      />

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

function RootRedirect() {
  const session = useAppStore((s) => s.session);
  if (!session) return <Navigate to="/login" replace />;
  if (session.role === "airport_admin") return <Navigate to="/admin/screens" replace />;
  return <Navigate to={`/gate/${session.assignedGate}`} replace />;
}