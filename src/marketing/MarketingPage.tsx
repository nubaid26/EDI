import "../styles/monochrome.css";
import { Outlet } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";

export default function MarketingPage() {
  return (
    <div className="marketing min-h-screen">
      {/* Skip Link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Navbar />

      <main id="main-content">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
