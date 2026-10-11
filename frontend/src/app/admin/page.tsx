"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import Link from "next/link";

export default function AdminDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "ACCEPTED" | "DECLINED">("ALL");
  const [role, setRole] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "Users", user.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role || "PATIENT");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (loading || role !== "ADMIN") return;

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

    // Listen to All Users
    const qUsers = query(collection(db, "Users"));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const userList: any[] = [];
      snapshot.forEach((doc) => userList.push({ id: doc.id, ...doc.data() }));
      setUsers(userList);
    });

    return () => {
      unsubRequests();
      unsubAlerts();
      unsubUsers();
    };
  }, [loading, role]);

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "BloodRequests", requestId), {
        status: newStatus,
        adminReviewedAt: new Date(),
      });
    } catch (error) {
      console.error("Error updating request:", error);
      alert("Failed to update status.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading Admin Panel...
      </div>
    );

  // Block non-admins
  if (role !== "ADMIN") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="text-5xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">You do not have admin privileges.</p>
        <Link
          href="/patient"
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold"
        >
          Go Back Home
        </Link>
      </div>
    );
  }

  // Calculate Stats
  const totalRequests = requests.length;
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const acceptedCount = requests.filter((r) => r.status === "ACCEPTED").length;
  const declinedCount = requests.filter((r) => r.status === "DECLINED").length;
  const totalDonors = users.filter((u) => u.role === "DONOR").length;
  const availableDonors = users.filter(
    (u) => u.role === "DONOR" && u.availabilityStatus === true
  ).length;

  const filteredRequests =
    filter === "ALL" ? requests : requests.filter((r) => r.status === filter);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span>🏥</span> Blood-Link Admin Dashboard
        </h1>
        <div className="flex gap-3">
          <Link
            href="/patient"
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm"
          >
            Home
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
            <p className="text-xs text-gray-500 uppercase">Total Requests</p>
            <p className="text-3xl font-bold text-gray-800">{totalRequests}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
            <p className="text-xs text-gray-500 uppercase">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
            <p className="text-xs text-gray-500 uppercase">Accepted</p>
            <p className="text-3xl font-bold text-green-600">{acceptedCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
            <p className="text-xs text-gray-500 uppercase">Declined</p>
            <p className="text-3xl font-bold text-red-600">{declinedCount}</p>
          </div>
        </div>

        {/* Donor Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
            <p className="text-xs text-gray-500 uppercase">Total Donors</p>
            <p className="text-2xl font-bold text-purple-600">{totalDonors}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-600">
            <p className="text-xs text-gray-500 uppercase">Available Now</p>
            <p className="text-2xl font-bold text-green-700">{availableDonors}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Blood Requests Panel */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Blood Requests</h2>
              {/* Filter Tabs */}
              <div className="flex gap-2">
                {(["ALL", "PENDING", "ACCEPTED", "DECLINED"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      filter === f
                        ? "bg-gray-800 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 max-h-[700px] overflow-y-auto">
              {filteredRequests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No requests in this category.</p>
              ) : (
                filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    className="border border-gray-100 bg-gray-50 p-4 rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">
                          Request ID: {req.id.substring(0, 8)}...
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Donor: <span className="font-medium">{req.donorName || "Unknown"}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          Patient Phone: {req.patientPhone || "N/A"}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          req.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : req.status === "ACCEPTED"
                            ? "bg-green-100 text-green-700"
                            : req.status === "APPROVED"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    {/* Admin Action Buttons */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => updateRequestStatus(req.id, "APPROVED")}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-semibold transition-colors"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => updateRequestStatus(req.id, "DECLINED")}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded font-semibold transition-colors"
                      >
                        ✕ Reject
                      </button>
                      <button
                        onClick={() => updateRequestStatus(req.id, "COMPLETED")}
                        className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded font-semibold transition-colors"
                      >
                        ✓✓ Mark Completed
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* System Alerts Panel */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              🚨 System Alerts
              <span className="bg-orange-100 text-orange-700 text-sm px-2 py-1 rounded-full">
                {alerts.length}
              </span>
            </h2>
            <div className="space-y-3 max-h-[700px] overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-gray-500 text-sm">No alerts yet.</p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="border border-orange-100 bg-orange-50 p-4 rounded-lg"
                  >
                    <p className="font-semibold text-sm text-orange-800">{alert.message}</p>
                    <p className="text-xs text-orange-600 mt-1">
                      Patient ID: {alert.patientId.substring(0, 10)}...
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}