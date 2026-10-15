import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/employees", label: "Employees", icon: "👥" },
  { to: "/employee-access", label: "Employee access", icon: "🔑", roles: ["admin", "manager"] },
  { to: "/attendance", label: "Attendance", icon: "🕒" },
  { to: "/payroll", label: "Payroll", icon: "💵" },
  { to: "/payslips", label: "Payslips", icon: "🧾" },
  { to: "/feedback", label: "Feedback", icon: "💬" },
  { to: "/audit-trail", label: "Audit Trail", icon: "📜" },
  { to: "/manager-portal", label: "Manager Portal", icon: "🧠" },
  { to: "/whistleblowing", label: "Whistleblowing", icon: "🛡️" },
];

function Sidebar() {
  const { logout, role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-[#0F172A] text-slate-200 flex flex-col">
      <div className="px-5 py-6 border-b border-slate-700">
        <h1 className="font-bold tracking-wide text-white">SENTINEL PAY ROLL</h1>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {links
          .filter((link) => !link.roles || link.roles.includes(role))
          .map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-[#3B82F6] text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <span aria-hidden="true">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-700">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-md bg-slate-800 hover:bg-slate-700 text-white text-sm px-3 py-2"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
