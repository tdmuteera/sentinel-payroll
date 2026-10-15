import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";

function fmt(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function EmployeePortal() {
  const [status, setStatus] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try {
      const [s, p] = await Promise.all([
        api.get("/employee-self/attendance/today"),
        api.get("/employee-self/payslips"),
      ]);
      setStatus(s.data);
      setPayslips(p.data);
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to load portal data.");
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const checkIn = async () => {
    setMsg("");
    setErr("");
    try {
      await api.post("/employee-self/attendance/check-in");
      setMsg("Checked in successfully.");
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || "Check-in failed.");
    }
  };

  const checkOut = async () => {
    setMsg("");
    setErr("");
    try {
      await api.post("/employee-self/attendance/check-out");
      setMsg("Checked out successfully.");
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || "Check-out failed.");
    }
  };

  const fetchPdfBlob = async (id) => {
    const res = await api.get(`/employee-self/payslips/${id}/pdf`, { responseType: "blob" });
    return res;
  };

  const viewPdf = async (id) => {
    setErr("");
    try {
      const res = await fetchPdfBlob(id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setErr(e.response?.data?.message || "Could not open payslip.");
    }
  };

  const downloadPdf = async (id) => {
    setErr("");
    try {
      const res = await fetchPdfBlob(id);
      const cd = res.headers["content-disposition"] || "";
      const match = /filename="([^"]+)"/.exec(cd);
      const filename = match ? match[1] : `payslip-${id}.pdf`;
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.response?.data?.message || "Download failed.");
    }
  };

  const today = status?.today;
  const canCheckIn = !today?.check_in_at;
  const canCheckOut = Boolean(today?.check_in_at && !today?.check_out_at);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-white">Today</h2>
        <p className="text-slate-400 text-sm mt-1">
          {status?.date} · {status?.server_time ? fmt(status.server_time) : ""}
        </p>
      </div>

      {msg ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-200">
          {msg}
        </div>
      ) : null}
      {err ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-4 py-2 text-sm text-rose-200">{err}</div>
      ) : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-medium text-white mb-4">Check-in</h3>
        <p className="text-sm text-slate-400 mb-2">Last check-in: {fmt(today?.check_in_at)}</p>
        <button
          type="button"
          onClick={checkIn}
          disabled={!canCheckIn}
          className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Check in
        </button>
        {today?.check_in_at && today?.check_out_at ? (
          <p className="mt-2 text-xs text-amber-400">You have completed today&apos;s session.</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-medium text-white mb-4">Check-out</h3>
        <p className="text-sm text-slate-400 mb-1">Last check-out: {fmt(today?.check_out_at)}</p>
        <p className="text-sm text-slate-400 mb-1">
          Hours today:{" "}
          <span className="text-white font-medium">
            {today?.check_out_at ? Number(today.hours_worked || 0).toFixed(2) : "—"}
          </span>
        </p>
        {today?.check_out_at ? (
          <p className="text-sm text-slate-400 mb-4">
            Overtime (hours):{" "}
            <span className="text-white font-medium">{Number(today.overtime_hours || 0).toFixed(2)}</span>
          </p>
        ) : (
          <p className="text-sm text-slate-400 mb-4">Overtime is calculated when you check out.</p>
        )}
        <button
          type="button"
          onClick={checkOut}
          disabled={!canCheckOut}
          className="rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Check out
        </button>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-medium text-white mb-4">Payslips</h3>
        <p className="text-sm text-slate-400 mb-4">
          Same PDF as payroll admin — view in the browser or download.
        </p>
        {payslips.length === 0 ? (
          <p className="text-slate-500 text-sm">No payslips available yet.</p>
        ) : (
          <ul className="space-y-3">
            {payslips.map((ps, idx) => (
              <li
                key={ps.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 px-4 py-3"
              >
                <div>
                  <p className="text-white font-medium">
                    {ps.period_label || "Payslip"}
                    {idx === 0 ? (
                      <span className="ml-2 rounded bg-blue-900/60 px-2 py-0.5 text-xs text-blue-200">
                        Latest
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500">
                    Net: ${Number(ps.net_pay || 0).toFixed(2)} · {fmt(ps.generated_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => viewPdf(ps.id)}
                    className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600"
                  >
                    View PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadPdf(ps.id)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
                  >
                    Download PDF
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
