import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function EmployeeLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login/employee", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Employee self-service</h1>
          <p className="text-sm text-slate-400">{user?.fullName || "Employee"}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          Sign out
        </button>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default EmployeeLayout;
