import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function EmployeeRoute({ children }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login/employee" replace state={{ from: location }} />;
  }
  if (role !== "employee") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default EmployeeRoute;
