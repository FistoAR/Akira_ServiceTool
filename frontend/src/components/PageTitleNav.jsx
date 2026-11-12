import { useLocation } from "react-router-dom";

export function usePageTitle() {
  const location = useLocation();

  const titles = {
    "/dashboard": "Dashboard",
    "/customers": "Customers Data",
    "/escalation": "Escalation",
    "/serviceCall": "Service Call Entry",
    "/serviceCall/assignment": "Call Assignment",
    "/serviceCall/escalations": "Escalated Calls",
    "/serviceCall/reports": "Service Call Reports",
    "/serviceCallResponse": "Call Response",
    "/serviceMaterial": "Service Material",
    "/serviceMaterialResponse": "Service Material Response",
    "/serviceMaterial/reports": "Service Material Reports",
    "/productionMaterial": "Production Material",
    "/productionMaterialResponse": "Production Material Response",
    "/productionMaterial/reports": "Production Material Reports",
    "/masterPage": "Master Access",
    "/troubleshoot": "Troubleshoot"
  };

  return titles[location.pathname] || "Dashboard";
}
