import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary.jsx";
import Login from "./pages/Login.jsx";
import EmployeeLogin from "./pages/EmployeeLogin.jsx";
import StaffRoute from "./components/StaffRoute.jsx";
import EmployeeRoute from "./components/EmployeeRoute.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MainLayout from "./components/layout/MainLayout.jsx";
import EmployeeLayout from "./components/layout/EmployeeLayout.jsx";
import Employees from "./pages/Employees.jsx";
import EmployeeAccess from "./pages/EmployeeAccess.jsx";
import Attendance from "./pages/Attendance.jsx";
import Payroll from "./pages/Payroll.jsx";
import Payslips from "./pages/Payslips.jsx";
import Feedback from "./pages/Feedback.jsx";
import AuditTrail from "./pages/AuditTrail.jsx";
import Whistleblowing from "./pages/Whistleblowing.jsx";
import ManagerPortal from "./pages/ManagerPortal.jsx";
import EmployeePortal from "./pages/EmployeePortal.jsx";

function App() {
  return (
    <RouteErrorBoundary>
      <Routes>
        <Route path="/login" element={<Outlet />}>
          <Route index element={<Login />} />
          <Route
            path="employee"
            element={
              <RouteErrorBoundary>
                <EmployeeLogin />
              </RouteErrorBoundary>
            }
          />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          element={
            <StaffRoute>
              <MainLayout />
            </StaffRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/employee-access" element={<EmployeeAccess />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/payslips" element={<Payslips />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/audit-trail" element={<AuditTrail />} />
          <Route path="/manager-portal" element={<ManagerPortal />} />
          <Route path="/whistleblowing" element={<Whistleblowing />} />
        </Route>
        <Route
          path="/employee"
          element={
            <EmployeeRoute>
              <EmployeeLayout />
            </EmployeeRoute>
          }
        >
          <Route index element={<EmployeePortal />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </RouteErrorBoundary>
  );
}

export default App;
