import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { getApiBaseUrl } from "../api/axios";

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const { loginEmployee, isAuthenticated, role } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get("/auth/employee/departments")
      .then((r) => {
        setDepartments(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => setError("Could not load departments."));
  }, []);

  useEffect(() => {
    setEmployeeId("");
    setEmployees([]);
    if (!departmentId) return;
    api
      .get("/auth/employee/directory", { params: { department_id: departmentId } })
      .then((r) => {
        setEmployees(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => setError("Could not load employees for department."));
  }, [departmentId]);

  if (isAuthenticated && role && role !== "employee") {
    return <Navigate to="/dashboard" replace />;
  }

  if (isAuthenticated && role === "employee") {
    return <Navigate to="/employee" replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginEmployee(Number(departmentId), Number(employeeId), password);
      navigate("/employee", { replace: true });
    } catch (err) {
      const isNetwork =
        err.code === "ERR_NETWORK" || err.message === "Network Error" || !err.response;
      setError(
        err.response?.status === 401
          ? "Invalid department, employee, or password."
          : isNetwork
            ? `Cannot reach the API at ${getApiBaseUrl()}.`
            : err.response?.data?.message || "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-12">
      <div className="relative w-full max-w-[440px]">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-white">Employee sign-in</h1>
          <p className="mt-2 text-sm text-slate-400">Select your department and name, then enter your password.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-8 shadow-xl">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Department</label>
              <select
                required
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2.5 text-slate-100"
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Your name</label>
              <select
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={!departmentId}
                className="w-full rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2.5 text-slate-100 disabled:opacity-50"
              >
                <option value="">Select your name</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_code})
                  </option>
                ))}
              </select>
              {departmentId && employees.length === 0 ? (
                <p className="mt-1 text-xs text-amber-400">No active portal accounts in this department yet.</p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2.5 text-slate-100"
                autoComplete="current-password"
              />
            </div>
            {error ? (
              <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
                {error}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in to portal"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          <button type="button" className="text-blue-400 hover:underline" onClick={() => navigate("/login")}>
            Staff sign-in (admin / manager)
          </button>
        </p>
      </div>
    </main>
  );
}
