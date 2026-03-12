import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CollectorProvider } from "./context/CollectorContext";
import { Sidebar } from "./components/Sidebar";
import { DataSourceSelector } from "./components/DataSourceSelector";
import { Dashboard } from "./pages/Dashboard";
import { Alerts } from "./pages/Alerts";
import { Resources } from "./pages/Resources";
import { Optimization } from "./pages/Optimization";
import { Security } from "./pages/Security";
import { BillingExplorer } from "./pages/BillingExplorer";
import { APIActivity } from "./pages/APIActivity";
import { Settings } from "./pages/Settings";

export default function App() {
  return (
    <CollectorProvider>
      <Router>
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="px-6 pt-4">
              <DataSourceSelector />
            </div>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/optimization" element={<Optimization />} />
              <Route path="/security" element={<Security />} />
              <Route path="/billing" element={<BillingExplorer />} />
              <Route path="/api-activity" element={<APIActivity />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </Router>
    </CollectorProvider>
  );
}
