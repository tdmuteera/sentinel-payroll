import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function StaffRoute({ children }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (role === "employee") {
    return <Navigate to="/employee" replace />;
  }
  return children;
}

export default StaffRoute;
