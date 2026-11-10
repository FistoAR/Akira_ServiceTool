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
    "/productionMaterial": "Production Material",
    "/masterPage": "Master Access",
    "/troubleshoot": "Troubleshoot"
  };

  return titles[location.pathname] || "Dashboard";
}
