import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const categories = ["Fraud", "Harassment", "Compliance", "Data Breach", "Other"];
const statusOptions = ["Pending", "Under Review", "Resolved", "Dismissed"];

function Whistleblowing() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [reports, setReports] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [referenceMessage, setReferenceMessage] = useState("");
  const form = useForm({
    defaultValues: {
      category: categories[0],
      description: "",
    },
  });

  const fetchReports = async () => {
    if (!isAdmin) {
      return;
    }
    const response = await api.get("/whistleblower");
    setReports(response.data);
  };

  useEffect(() => {
    fetchReports().catch(() => setErrorMessage("Failed to load whistleblower reports."));
  }, [isAdmin]);

  const submitAnonymous = async (values) => {
    setErrorMessage("");
    setReferenceMessage("");
    try {
      const response = await api.post("/whistleblower", values);
      setReferenceMessage(
        `Report submitted. Your reference ID is ${response.data.reportId}. Keep this safe.`
      );
      form.reset({ category: categories[0], description: "" });
      await fetchReports();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Failed to submit report.");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/whistleblower/${id}/status`, { status });
      await fetchReports();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Failed to update report status.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-slate-800">Anonymous Report Submission</h3>
        <p className="text-sm text-slate-500 mt-1">
          You may submit anonymously. No identifying account data is required.
        </p>

        <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(submitAnonymous)}>
          <select className="w-full rounded-md border-slate-300" {...form.register("category", { required: true })}>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <textarea
            rows={5}
            className="w-full rounded-md border-slate-300"
            placeholder="Describe the report details..."
            {...form.register("description", { required: true })}
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
            Submit Report
          </button>
        </form>

        {referenceMessage ? (
          <div className="mt-3 bg-green-50 border border-green-200 text-green-700 rounded-md px-3 py-2 text-sm">
            {referenceMessage}
          </div>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-sm">
          {errorMessage}
        </div>
      ) : null}

      {isAdmin ? (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-600">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">#{report.id}</td>
                  <td className="px-4 py-3">{report.category}</td>
                  <td className="px-4 py-3">{report.description}</td>
                  <td className="px-4 py-3">{String(report.submitted_at).slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={report.status}
                      onChange={(e) => updateStatus(report.id, e.target.value)}
                      className="rounded-md border-slate-300"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export default Whistleblowing;
