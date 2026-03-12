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
import MarketingPage from "./marketing/MarketingPage";

// Marketing pages
import HomePage from "./marketing/pages/HomePage";
import FeaturesPage from "./marketing/pages/FeaturesPage";
import ArchitecturePage from "./marketing/pages/ArchitecturePage";
import PricingPage from "./marketing/pages/PricingPage";
import UseCasesPage from "./marketing/pages/UseCasesPage";
import WhyPage from "./marketing/pages/WhyPage";
import PlatformPage from "./marketing/pages/PlatformPage";

/* Dashboard layout wrapper – keeps the existing sidebar + selector chrome */
function DashboardLayout() {
  return (
    <CollectorProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="px-6 pt-4">
            <DataSourceSelector />
          </div>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="resources" element={<Resources />} />
            <Route path="optimization" element={<Optimization />} />
            <Route path="security" element={<Security />} />
            <Route path="billing" element={<BillingExplorer />} />
            <Route path="api-activity" element={<APIActivity />} />
            <Route path="settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </CollectorProvider>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Marketing / product website */}
        <Route path="/" element={<MarketingPage />}>
          <Route index element={<HomePage />} />
          <Route path="features" element={<FeaturesPage />} />
          <Route path="architecture" element={<ArchitecturePage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="use-cases" element={<UseCasesPage />} />
          <Route path="why" element={<WhyPage />} />
          <Route path="platform" element={<PlatformPage />} />
        </Route>
        {/* Dashboard application (unchanged) */}
        <Route path="/app/*" element={<DashboardLayout />} />
      </Routes>
    </Router>
  );
}
