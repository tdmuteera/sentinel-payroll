import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const titleMap = {
  "/dashboard": "Dashboard",
  "/employees": "Employees",
  "/attendance": "Attendance",
  "/payroll": "Payroll",
  "/payslips": "Payslips",
  "/feedback": "Feedback",
  "/audit-trail": "Audit Trail",
  "/manager-portal": "Manager Portal",
  "/whistleblowing": "Whistleblowing",
};

function TopBar() {
  const location = useLocation();
  const { user, role } = useAuth();
  const pageTitle = titleMap[location.pathname] || "SENTINEL PAY ROLL";

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-slate-800">{pageTitle}</h2>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm text-slate-600 truncate max-w-[220px] sm:max-w-xs">
          {user?.fullName || user?.email}
        </span>
        <span className="shrink-0 text-xs font-semibold uppercase bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
          {role || "user"}
        </span>
      </div>
    </header>
  );
}

export default TopBar;
