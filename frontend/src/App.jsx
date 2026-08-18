// App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Sidebar, { SidebarProvider, useSidebar } from "./components/SidePannel";
import NavBar from "./components/NavBar";
import Dashboard from "./pages/dashboard";
import Customers from "./pages/customers";
import ServiceCall from "./pages/ServiceCall.jsx";
import ServiceMaterial from "./pages/ServiceMaterial.jsx";
import ProductionMaterial from "./pages/ProductionMaterial.jsx";
import ProductionMaterialResponse from "./pages/productionMaterialResponse.jsx";
import ServiceMaterialResponse from "./pages/serviceMaterialResponse.jsx";
import Troubleshoot from "./pages/troubleshoot";
import ServiceCallResponse from "./pages/serviceCallResponse";
import { usePageTitle } from "./components/PageTitleNav";
import MasterPage from "./pages/MasterPage";
import CallAssignment from "./pages/Call Assignments/serviceCallAssignment"
import EscalationPage from "./pages/esculation";
import ServiceCallEscalations from "./pages/ServiceCallEscalations";
import { NotificationProvider } from "./components/NotificationContext";
import { SocketProvider } from "./contexts/SocketContext";
import ServiceMaterialReports from "./pages/ServiceMaterialReports.jsx";
import ProductionMaterialReports from "./pages/ProductionMaterialReports.jsx";
import ServiceCallReports from "./pages/ServiceCallReports.jsx";


function NavBarWithTitle() {
  const pageTitle = usePageTitle();
  return <NavBar type={pageTitle} />;
}

function MainLayout() {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex w-screen h-screen overflow-hidden">
      <Sidebar />
      <main
        className={`
          flex-1 bg-slate-100 min-h-screen px-[1.2vw] py-[0.4vh] 
          overflow-hidden
          transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        `}
      >
        <NavBarWithTitle />
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="masterPage" element={<MasterPage />} />
          <Route path="customers" element={<Customers />} />
          <Route path="serviceCall" element={<ServiceCall />} />
          <Route path="serviceCall/assignment" element={<CallAssignment />} />
          <Route path="serviceCall/reports" element={<ServiceCallReports />} />
          <Route path="serviceCall/escalations" element={<ServiceCallEscalations />} />
          <Route path="serviceMaterial" element={<ServiceMaterial />} />
          <Route path="serviceMaterial/reports" element={<ServiceMaterialReports />} />
          <Route path="productionMaterial" element={<ProductionMaterial />} />
          <Route path="serviceCallResponse" element={<ServiceCallResponse />} />
          <Route
            path="serviceMaterialResponse"
            element={<ServiceMaterialResponse />}
          />
          <Route
            path="productionMaterialResponse"
            element={<ProductionMaterialResponse />}
          />
          <Route path="productionMaterial/reports" element={<ProductionMaterialReports />} />
          <Route path="troubleshoot" element={<Troubleshoot />} />
          <Route path="escalation" element={<EscalationPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <NotificationProvider>
        <SocketProvider>
          <SidebarProvider>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/*" element={<MainLayout />} />
            </Routes>
          </SidebarProvider>
        </SocketProvider>
      </NotificationProvider>
    </Router>
  );
}

export default App;
