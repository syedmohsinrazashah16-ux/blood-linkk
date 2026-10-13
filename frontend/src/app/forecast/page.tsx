"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// ⚠️ Your live Render API URL
const HF_API_URL = "https://blood-linkk.onrender.com";

export default function ForecastPage() {
  const [selectedGroup, setSelectedGroup] = useState("AB+");
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/login");
    });
    return () => unsubscribe();
  }, [router]);

  const fetchForecast = async (group: string) => {
    setLoading(true);
    setError("");
    setForecast(null);
    try {
      const encoded = group.replace("+", "%2B");
      const res = await fetch(`${HF_API_URL}/predict/${encoded}`);
      if (!res.ok) throw new Error("Failed to fetch forecast");
      const data = await res.json();
      setForecast(data);
    } catch (err: any) {
      setError(err.message || "Could not connect to AI service");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroup) fetchForecast(selectedGroup);
  }, [selectedGroup]);

  const getRiskColor = (risk: string) => {
    if (risk === "HIGH") return "bg-red-100 text-red-700 border-red-500";
    if (risk === "MEDIUM") return "bg-yellow-100 text-yellow-700 border-yellow-500";
    return "bg-green-100 text-green-700 border-green-500";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span>🤖</span> AI Demand Forecast
        </h1>
        <Link
          href="/admin"
          className="bg-purple-900 hover:bg-purple-950 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Back to Admin
        </Link>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            LSTM Neural Network Predictions
          </h2>
          <p className="text-gray-600 text-sm">
            Powered by a Long Short-Term Memory model trained on 2 years of blood demand patterns,
            including seasonal trends, dengue outbreaks, and Ramadan surges.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <label className="text-sm font-semibold text-gray-700 mb-3 block">
            Select Blood Group:
          </label>
          <div className="flex flex-wrap gap-2">
            {BLOOD_GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGroup(g)}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  selectedGroup === g
                    ? "bg-purple-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Running LSTM inference...</p>
            <p className="text-xs text-gray-400 mt-2">
              (First request may take ~30 seconds if the server is waking up)
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-semibold">⚠️ {error}</p>
            <p className="text-red-500 text-sm mt-2">
              Make sure your Render service is running.
            </p>
          </div>
        )}

        {forecast && !loading && (
          <div className="space-y-6">
            <div className={`rounded-xl shadow-sm p-6 border-l-4 ${getRiskColor(forecast.shortage_risk)}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold uppercase opacity-70">Shortage Risk</p>
                  <p className="text-3xl font-bold mt-1">{forecast.shortage_risk}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase opacity-70">Recent Avg</p>
                  <p className="text-2xl font-bold">{forecast.average_recent_demand}</p>
                  <p className="text-xs uppercase opacity-70 mt-2">Forecast Avg</p>
                  <p className="text-2xl font-bold">{forecast.average_forecast_demand}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                7-Day Demand Forecast — {forecast.blood_group}
              </h3>
              <div className="flex items-end justify-between gap-2 h-64">
                {forecast.predicted_demand.map((value: number, i: number) => {
                  const maxVal = Math.max(...forecast.predicted_demand);
                  const height = (value / maxVal) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs font-bold text-purple-700">
                        {value.toFixed(1)}
                      </span>
                      <div
                        className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-lg transition-all"
                        style={{ height: `${height}%`, minHeight: "20px" }}
                      ></div>
                      <span className="text-[10px] text-gray-500 rotate-45 origin-top-left">
                        {forecast.forecast_dates[i].substring(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
              <h3 className="font-bold text-purple-900 mb-2">🤖 AI Recommendation</h3>
              <p className="text-purple-800 text-sm">
                {forecast.shortage_risk === "HIGH" &&
                  `⚠️ High demand expected for ${forecast.blood_group}. Proactively alert registered donors and coordinate with blood banks.`}
                {forecast.shortage_risk === "MEDIUM" &&
                  `📢 Moderate demand for ${forecast.blood_group}. Consider running a small donation drive to ensure steady supply.`}
                {forecast.shortage_risk === "LOW" &&
                  `✅ Current supply for ${forecast.blood_group} should meet demand. No immediate action needed.`}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}