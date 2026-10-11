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

type StatusFilter = "ALL" | "PENDING" | "ACCEPTED" | "DECLINED" | "APPROVED" | "COMPLETED";

export default function AdminDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [role, setRole] = useState<string>("");
  const [adminName, setAdminName] = useState<string>("");
  const [adminPhone, setAdminPhone] = useState<string>("");
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
          const data = userDoc.data();
          setRole(data.role || "PATIENT");
          setAdminName(data.name || "Admin");
          setAdminPhone(data.phoneNumber || user.phoneNumber || "");
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

    const qRequests = query(collection(db, "BloodRequests"), orderBy("createdAt", "desc"));
    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      const reqList: any[] = [];
      snapshot.forEach((doc) => reqList.push({ id: doc.id, ...doc.data() }));
      setRequests(reqList);
    });

    const qAlerts = query(collection(db, "SystemAlerts"), orderBy("timestamp", "desc"));
    const unsubAlerts = onSnapshot(qAlerts, (snapshot) => {
      const alertList: any[] = [];
      snapshot.forEach((doc) => alertList.push({ id: doc.id, ...doc.data() }));
      setAlerts(alertList);
    });

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

  // Lookup helper: get user details by UID
  const getUserDetails = (uid: string) => {
    const found = users.find((u) => u.id === uid || u.userId === uid);
    return found || { name: "Unknown", phoneNumber: "N/A", bloodGroup: "N/A" };
  };

  // Stats
  const totalRequests = requests.length;
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const acceptedCount = requests.filter((r) => r.status === "ACCEPTED").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const declinedCount = requests.filter((r) => r.status === "DECLINED").length;
  const completedCount = requests.filter((r) => r.status === "COMPLETED").length;
  const totalDonors = users.filter((u) => u.role === "DONOR").length;
  const totalPatients = users.filter((u) => u.role === "PATIENT").length;
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
        <div className="flex gap-3 items-center">
          {/* Logged-in admin info */}
          <div className="bg-gray-700 px-3 py-2 rounded-lg text-xs">
            <p className="font-semibold">{adminName}</p>
            <p className="text-gray-300">{adminPhone}</p>
          </div>
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
            <p className="text-xs text-gray-500 uppercase">Total</p>
            <p className="text-2xl font-bold text-gray-800">{totalRequests}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
            <p className="text-xs text-gray-500 uppercase">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-700">
            <p className="text-xs text-gray-500 uppercase">Approved</p>
            <p className="text-2xl font-bold text-blue-700">{approvedCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
            <p className="text-xs text-gray-500 uppercase">Accepted</p>
            <p className="text-2xl font-bold text-green-600">{acceptedCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
            <p className="text-xs text-gray-500 uppercase">Declined</p>
            <p className="text-2xl font-bold text-red-600">{declinedCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-gray-500">
            <p className="text-xs text-gray-500 uppercase">Completed</p>
            <p className="text-2xl font-bold text-gray-700">{completedCount}</p>
          </div>
        </div>

        {/* Donor & Patient Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
            <p className="text-xs text-gray-500 uppercase">Total Donors</p>
            <p className="text-2xl font-bold text-purple-600">{totalDonors}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-600">
            <p className="text-xs text-gray-500 uppercase">Available Donors</p>
            <p className="text-2xl font-bold text-green-700">{availableDonors}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-indigo-500">
            <p className="text-xs text-gray-500 uppercase">Total Patients</p>
            <p className="text-2xl font-bold text-indigo-600">{totalPatients}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Blood Requests Panel */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
              <h2 className="text-xl font-bold text-gray-800">Blood Requests</h2>
              <div className="flex flex-wrap gap-2">
                {(["ALL", "PENDING", "APPROVED", "ACCEPTED", "DECLINED", "COMPLETED"] as StatusFilter[]).map((f) => (
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
                filteredRequests.map((req) => {
                  const patient = getUserDetails(req.patientId);
                  const donor = getUserDetails(req.donorId);
                  return (
                    <div
                      key={req.id}
                      className="border border-gray-200 bg-gray-50 p-4 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-gray-500">
                            Request #{req.id.substring(0, 8)}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full ${
                            req.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-700"
                              : req.status === "APPROVED"
                              ? "bg-blue-100 text-blue-700"
                              : req.status === "ACCEPTED"
                              ? "bg-green-100 text-green-700"
                              : req.status === "COMPLETED"
                              ? "bg-gray-200 text-gray-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>

                      {/* Rich details */}
                      <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                        <div className="bg-white p-2 rounded border border-gray-100">
                          <p className="text-gray-400 uppercase font-bold text-[10px] mb-1">
                            Patient
                          </p>
                          <p className="font-semibold text-gray-800">
                            {patient.name || "Unknown"}
                          </p>
                          <p className="text-gray-500">{patient.phoneNumber || "N/A"}</p>
                          {patient.bloodGroup && (
                            <p className="text-red-600 font-bold mt-1">
                              🩸 {patient.bloodGroup}
                            </p>
                          )}
                        </div>
                        <div className="bg-white p-2 rounded border border-gray-100">
                          <p className="text-gray-400 uppercase font-bold text-[10px] mb-1">
                            Donor
                          </p>
                          <p className="font-semibold text-gray-800">
                            {donor.name || req.donorName || "Unknown"}
                          </p>
                          <p className="text-gray-500">{donor.phoneNumber || "N/A"}</p>
                          {donor.bloodGroup && (
                            <p className="text-red-600 font-bold mt-1">
                              🩸 {donor.bloodGroup}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {req.status === "PENDING" && (
                          <>
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
                          </>
                        )}
                        {req.status === "APPROVED" && (
                          <>
                            <button
                              onClick={() => updateRequestStatus(req.id, "COMPLETED")}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded font-semibold transition-colors"
                            >
                              ✓✓ Mark as Completed
                            </button>
                            <button
                              onClick={() => updateRequestStatus(req.id, "DECLINED")}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded font-semibold transition-colors"
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}
                        {req.status === "ACCEPTED" && (
                          <button
                            onClick={() => updateRequestStatus(req.id, "COMPLETED")}
                            className="bg-gray-700 hover:bg-gray-800 text-white text-xs px-3 py-1.5 rounded font-semibold transition-colors"
                          >
                            ✓✓ Mark as Completed
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
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