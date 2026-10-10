"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import Link from "next/link";

export default function AdminDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (loading) return;

    // Listen to all Blood Requests
    const qRequests = query(collection(db, "BloodRequests"), orderBy("createdAt", "desc"));
    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      const reqList: any[] = [];
      snapshot.forEach((doc) => reqList.push({ id: doc.id, ...doc.data() }));
      setRequests(reqList);
    });

    // Listen to System Alerts
    const qAlerts = query(collection(db, "SystemAlerts"), orderBy("timestamp", "desc"));
    const unsubAlerts = onSnapshot(qAlerts, (snapshot) => {
      const alertList: any[] = [];
      snapshot.forEach((doc) => alertList.push({ id: doc.id, ...doc.data() }));
      setAlerts(alertList);
    });

    return () => {
      unsubRequests();
      unsubAlerts();
    };
  }, [loading]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Admin Panel...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span>🏥</span> Blood-Link Admin
        </h1>
        <div className="flex gap-3">
          <Link href="/login" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm">Logout</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blood Requests Panel */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            📋 All Blood Requests <span className="bg-red-100 text-red-700 text-sm px-2 py-1 rounded-full">{requests.length}</span>
          </h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {requests.map((req) => (
              <div key={req.id} className="border border-gray-100 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm">Request ID: {req.id.substring(0, 8)}...</p>
                    <p className="text-xs text-gray-500 mt-1">Donor: {req.donorName || "Unknown"}</p>
                    <p className="text-xs text-gray-500">Patient Phone: {req.patientPhone || "N/A"}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    req.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                    req.status === "ACCEPTED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Alerts Panel */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            🚨 System Alerts <span className="bg-orange-100 text-orange-700 text-sm px-2 py-1 rounded-full">{alerts.length}</span>
          </h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {alerts.map((alert) => (
              <div key={alert.id} className="border border-orange-100 bg-orange-50 p-4 rounded-lg">
                <p className="font-semibold text-sm text-orange-800">{alert.message}</p>
                <p className="text-xs text-orange-600 mt-1">Patient ID: {alert.patientId.substring(0, 10)}...</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}