import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const defaultValues = {
  full_name: "",
  department_id: "",
  position: "",
  base_salary: "",
  tax_rate: 0.2,
  employment_status: "Active",
  date_joined: "",
  generate_employee_password: true,
  employee_password: "",
};

function Employees() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const canCreateEmployee = isAdmin || role === "manager";
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deletingEmployee, setDeletingEmployee] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [portalPasswordNotice, setPortalPasswordNotice] = useState("");

  const {
    register,
    reset,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ defaultValues });

  const generateEmployeePassword = watch("generate_employee_password");

  const fetchData = async () => {
    const [employeeRes, departmentRes] = await Promise.all([
      api.get("/employees"),
      api.get("/departments"),
    ]);
    setEmployees(employeeRes.data);
    setDepartments(departmentRes.data);
  };

  useEffect(() => {
    fetchData().catch(() => {
      setErrorMessage("Failed to load employees.");
    });
  }, []);

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const searchMatch =
        employee.full_name.toLowerCase().includes(term) ||
        employee.employee_code.toLowerCase().includes(term);
      const departmentMatch =
        !departmentFilter || String(employee.department_id) === departmentFilter;
      return searchMatch && departmentMatch;
    });
  }, [employees, search, departmentFilter]);

  const openAddModal = () => {
    setEditingEmployee(null);
    setPortalPasswordNotice("");
    reset(defaultValues);
    setIsModalOpen(true);
    setErrorMessage("");
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setPortalPasswordNotice("");
    reset({
      full_name: employee.full_name,
      department_id: String(employee.department_id || ""),
      position: employee.position,
      base_salary: employee.base_salary,
      tax_rate: employee.tax_rate,
      employment_status: employee.employment_status || "Active",
      date_joined: employee.date_joined?.slice(0, 10) || "",
    });
    setIsModalOpen(true);
    setErrorMessage("");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    reset(defaultValues);
  };

  const onSubmit = async (values) => {
    setIsSaving(true);
    setErrorMessage("");
    try {
      const payload = {
        full_name: values.full_name,
        department_id: Number(values.department_id),
        position: values.position,
        base_salary: Number(values.base_salary),
        tax_rate: Number(values.tax_rate),
        employment_status: values.employment_status,
        date_joined: values.date_joined,
      };

      if (!editingEmployee) {
        payload.generate_employee_password = Boolean(values.generate_employee_password);
        if (!payload.generate_employee_password) {
          const pw = (values.employee_password || "").trim();
          if (pw.length < 6) {
            setErrorMessage(
              "Set an employee portal password of at least 6 characters, or enable automatic password."
            );
            setIsSaving(false);
            return;
          }
          payload.employee_password = pw;
        }
        const response = await api.post("/employees", payload);
        if (response.data?.generated_employee_password) {
          setPortalPasswordNotice(
            `Employee portal password (copy now): ${response.data.generated_employee_password}`
          );
        }
      } else {
        await api.put(`/employees/${editingEmployee.id}`, payload);
      }
      await fetchData();
      closeModal();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Failed to save employee.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEmployee) {
      return;
    }
    try {
      await api.delete(`/employees/${deletingEmployee.id}`);
      setDeletingEmployee(null);
      await fetchData();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Failed to delete employee.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or employee code"
            className="w-72 rounded-md border-slate-300 focus:border-blue-500 focus:ring-blue-500"
          />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-56 rounded-md border-slate-300 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
        {canCreateEmployee ? (
          <button
            type="button"
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Add Employee
          </button>
        ) : null}
      </div>

      {portalPasswordNotice ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-md px-3 py-2 text-sm">
          {portalPasswordNotice}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-sm">
          {errorMessage}
        </div>
      ) : null}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-600">
              <th className="px-4 py-3">Employee Code</th>
              <th className="px-4 py-3">Full Name</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Base Salary</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((employee) => (
              <tr key={employee.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-700">{employee.employee_code}</td>
                <td className="px-4 py-3">{employee.full_name}</td>
                <td className="px-4 py-3">{employee.department_name || "-"}</td>
                <td className="px-4 py-3">{employee.position}</td>
                <td className="px-4 py-3">${Number(employee.base_salary).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      employee.employment_status === "Terminated"
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {employee.employment_status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(employee)}
                      className="px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200"
                    >
                      Edit
                    </button>
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => setDeletingEmployee(employee)}
                        className="px-3 py-1 rounded-md bg-red-100 hover:bg-red-200 text-red-700"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No employees found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingEmployee ? "Edit Employee" : "Add Employee"}
            </h3>
            <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Full Name</label>
                <input
                  className="w-full rounded-md border-slate-300"
                  {...register("full_name", { required: "Full name is required" })}
                />
                {errors.full_name ? (
                  <p className="text-xs text-red-600 mt-1">{errors.full_name.message}</p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Department</label>
                  <select
                    className="w-full rounded-md border-slate-300"
                    {...register("department_id", { required: "Department is required" })}
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Position</label>
                  <input
                    className="w-full rounded-md border-slate-300"
                    {...register("position", { required: "Position is required" })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Base Salary</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-md border-slate-300"
                    {...register("base_salary", { required: "Base salary is required" })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Tax Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-md border-slate-300"
                    {...register("tax_rate", { required: "Tax rate is required" })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Date Joined</label>
                  <input
                    type="date"
                    className="w-full rounded-md border-slate-300"
                    {...register("date_joined", { required: "Date joined is required" })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Employment Status</label>
                <select
                  className="w-full rounded-md border-slate-300"
                  {...register("employment_status", { required: true })}
                >
                  <option value="Active">Active</option>
                  <option value="Leave">Leave</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>
              {!editingEmployee ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-3">
                  <p className="text-sm font-medium text-slate-800">Employee portal</p>
                  <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" className="mt-1" {...register("generate_employee_password")} />
                    <span>Generate portal password automatically (shown once after save)</span>
                  </label>
                  {!generateEmployeePassword ? (
                    <div>
                      <label className="block text-sm text-slate-700 mb-1">Portal password (min 6)</label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        className="w-full rounded-md border-slate-300"
                        {...register("employee_password")}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-md border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSaving ? "Saving..." : editingEmployee ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deletingEmployee ? (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold">Confirm Termination</h3>
            <p className="text-sm text-slate-600 mt-2">
              Set {deletingEmployee.full_name} to Terminated status?
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setDeletingEmployee(null)}
                className="px-4 py-2 rounded-md border border-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Employees;
