import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api/axios";

const pieColors = ["#22C55E", "#EAB308", "#EF4444", "#3B82F6"];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    api
      .get("/dashboard/stats")
      .then((response) => {
        setStats(response.data);
      })
      .catch(() => {
        setErrorMessage("Failed to load dashboard analytics.");
      });
  }, []);

  const attendanceRate = useMemo(() => {
    if (!stats?.attendanceToday?.total) return 0;
    const attended =
      Number(stats.attendanceToday.present || 0) + Number(stats.attendanceToday.late || 0);
    return (attended / Number(stats.attendanceToday.total)) * 100;
  }, [stats]);

  const attendancePieData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Present", value: Number(stats.attendanceToday.present || 0) },
      { name: "Late", value: Number(stats.attendanceToday.late || 0) },
      { name: "Absent", value: Number(stats.attendanceToday.absent || 0) },
      { name: "Leave", value: Number(stats.attendanceToday.leave || 0) },
    ];
  }, [stats]);

  if (!stats && !errorMessage) {
    return (
      <div className="bg-white rounded-xl shadow p-6 text-slate-600">Loading dashboard...</div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-sm">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-slate-500">Total Employees</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{stats?.totalEmployees ?? 0}</p>
          <p className="text-xl mt-2 text-[#3B82F6]">👥</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-slate-500">Monthly Payroll</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {formatCurrency(stats?.totalMonthlyPayroll)}
          </p>
          <p className="text-xl mt-2 text-[#3B82F6]">💵</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-slate-500">Last Payroll Run</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {formatDate(stats?.lastPayrollDate)}
          </p>
          <p className="text-xl mt-2 text-[#3B82F6]">📅</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-slate-500">Open Issues</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              Number(stats?.openIssues || 0) > 0 ? "text-orange-600" : "text-green-600"
            }`}
          >
            {stats?.openIssues ?? 0}
          </p>
          <p className="text-xl mt-2 text-orange-500">⚠️</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-slate-500">Attendance Rate Today</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{attendanceRate.toFixed(1)}%</p>
          <p className="text-xl mt-2 text-[#3B82F6]">✅</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-slate-500">Total Departments</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {stats?.departmentStats?.length ?? 0}
          </p>
          <p className="text-xl mt-2 text-[#3B82F6]">🏢</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Payroll Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.payrollTrend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="totalNetPay" stroke="#3B82F6" name="Net Pay" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Department Headcount</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.departmentStats || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="employee_count" fill="#0F172A" name="Employees" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Attendance Breakdown Today</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={attendancePieData} dataKey="value" nameKey="name" outerRadius={110}>
                  {attendancePieData.map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Recent Activity</h3>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
            {(stats?.recentActivity || []).map((item) => (
              <div key={item.id} className="border-b border-slate-100 pb-2">
                <p className="text-sm font-medium text-slate-800">
                  {item.full_name || "System"} - {item.action}
                </p>
                <p className="text-sm text-slate-600">{item.description || item.entity}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDate(item.timestamp)}</p>
              </div>
            ))}
            {(stats?.recentActivity || []).length === 0 ? (
              <p className="text-sm text-slate-500">No recent activity.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
