import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <div className="ml-64 min-h-screen flex flex-col">
        <TopBar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
