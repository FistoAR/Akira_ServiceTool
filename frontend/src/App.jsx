// App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./modules/auth/Login";
import Register from "./modules/auth/Register";
import Sidebar, { SidebarProvider, useSidebar } from "./components/SidePannel";
import NavBar from "./components/NavBar";
import Dashboard from "./modules/dashboard";
import Customers from "./modules/master/customers";
import ServiceCall from "./modules/serviceCall/ServiceCall.jsx";
import ServiceMaterial from "./modules/serviceMaterial/ServiceMaterial.jsx";
import ProductionMaterial from "./modules/production/ProductionMaterial.jsx";
import ProductionMaterialResponse from "./modules/production/productionMaterialResponse.jsx";
import ServiceMaterialResponse from "./modules/serviceMaterial/serviceMaterialResponse.jsx";
import Troubleshoot from "./modules/troubleshoot";
import ServiceCallResponse from "./modules/serviceCall/serviceCallResponse";
import { usePageTitle } from "./components/PageTitleNav";
import MasterPage from "./modules/master/MasterPage";
import CallAssignment from "./modules/serviceCall/serviceCallAssignment"
import EscalationPage from "./modules/master/esculation";
import ServiceCallEscalations from "./modules/serviceCall/ServiceCallEscalations";
import { NotificationProvider } from "./components/NotificationContext";
import { SocketProvider } from "./contexts/SocketContext";
import ServiceMaterialReports from "./modules/serviceMaterial/ServiceMaterialReports.jsx";
import ProductionMaterialReports from "./modules/production/ProductionMaterialReports.jsx";
import ServiceCallReports from "./modules/serviceCall/ServiceCallReports.jsx";
import ProtectedRoute from "./components/ProtectedRoute";


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
          <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route
            path="masterPage"
            element={
              <ProtectedRoute
                requiredModules={[
                  "partyTypes", "warrantyRules", "segments", "fourM", "units", "sites", "employees", "roleAccess", "escalation"
                ]}
              >
                <MasterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="customers"
            element={
              <ProtectedRoute requiredModules={["customers"]}>
                <Customers />
              </ProtectedRoute>
            }
          />
          <Route
            path="serviceCall"
            element={
              <ProtectedRoute
                requiredModules={["callReg", "callAssign", "callEscalation", "callReports"]}
                requireManagement={true}
                fallbackToResponse="/serviceCallResponse"
              >
                <ServiceCall />
              </ProtectedRoute>
            }
          />
          <Route
            path="serviceCall/assignment"
            element={
              <ProtectedRoute
                requiredModules={["callAssign"]}
                requireManagement={true}
                fallbackToResponse="/serviceCallResponse"
              >
                <CallAssignment />
              </ProtectedRoute>
            }
          />
          <Route
            path="serviceCall/reports"
            element={
              <ProtectedRoute
                requiredModules={["callReports"]}
                requireManagement={true}
                fallbackToResponse="/serviceCallResponse"
              >
                <ServiceCallReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="serviceCall/escalations"
            element={
              <ProtectedRoute
                requiredModules={["callEscalation"]}
                requireManagement={true}
                fallbackToResponse="/serviceCallResponse"
              >
                <ServiceCallEscalations />
              </ProtectedRoute>
            }
          />
          <Route
            path="serviceCallResponse"
            element={
              <ProtectedRoute requiredModules={["callReg", "callAssign", "callEscalation", "callReports"]}>
                <ServiceCallResponse />
              </ProtectedRoute>
            }
          />
          <Route
            path="serviceMaterial"
            element={
              <ProtectedRoute
                requiredModules={["matInward", "matReports"]}
                requireManagement={true}
                fallbackToResponse="/serviceMaterialResponse"
              >
                <ServiceMaterial />
              </ProtectedRoute>
            }
          />
          <Route
            path="serviceMaterial/reports"
            element={
              <ProtectedRoute
                requiredModules={["matReports"]}
                requireManagement={true}
                fallbackToResponse="/serviceMaterialResponse"
              >
                <ServiceMaterialReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="serviceMaterialResponse"
            element={
              <ProtectedRoute requiredModules={["matInward", "matReports"]}>
                <ServiceMaterialResponse />
              </ProtectedRoute>
            }
          />
          <Route
            path="productionMaterial"
            element={
              <ProtectedRoute
                requiredModules={["prodNC", "prodReports"]}
                requireManagement={true}
                fallbackToResponse="/productionMaterialResponse"
              >
                <ProductionMaterial />
              </ProtectedRoute>
            }
          />
          <Route
            path="productionMaterial/reports"
            element={
              <ProtectedRoute
                requiredModules={["prodReports"]}
                requireManagement={true}
                fallbackToResponse="/productionMaterialResponse"
              >
                <ProductionMaterialReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="productionMaterialResponse"
            element={
              <ProtectedRoute requiredModules={["prodNC", "prodReports"]}>
                <ProductionMaterialResponse />
              </ProtectedRoute>
            }
          />
          <Route
            path="troubleshoot"
            element={
              <ProtectedRoute requiredModules={["troubleshoot"]}>
                <Troubleshoot />
              </ProtectedRoute>
            }
          />
          <Route
            path="escalation"
            element={
              <ProtectedRoute requiredModules={["escalation"]}>
                <EscalationPage />
              </ProtectedRoute>
            }
          />
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
