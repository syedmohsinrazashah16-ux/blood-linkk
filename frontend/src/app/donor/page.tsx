"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";

export default function DonorDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [toggling, setToggling] = useState(false);
  const router = useRouter();

  // Wait for Firebase to confirm login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
        const userDoc = await getDoc(doc(db, "Users", currentUser.uid));
        if (userDoc.exists()) {
          setIsAvailable(userDoc.data().availabilityStatus || false);
        }
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Real-time listener for incoming requests
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "BloodRequests"),
      where("donorId", "==", user.uid),
      where("status", "==", "PENDING")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const reqList: any[] = [];
      querySnapshot.forEach((doc) => reqList.push({ id: doc.id, ...doc.data() }));
      setRequests(reqList);
    });

    return () => unsubscribe();
  }, [user]);

  const toggleAvailability = async () => {
    if (!user) return;
    setToggling(true);
    const newStatus = !isAvailable;
    try {
      await updateDoc(doc(db, "Users", user.uid), { availabilityStatus: newStatus });
      setIsAvailable(newStatus);
    } catch (error) {
      console.error("Error toggling availability:", error);
      alert("Failed to update status.");
    } finally {
      setToggling(false);
    }
  };

  const handleResponse = async (requestId: string, newStatus: "ACCEPTED" | "DECLINED") => {
    try {
      await updateDoc(doc(db, "BloodRequests", requestId), { status: newStatus });
    } catch (error) {
      console.error("Error updating request: ", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span>💪</span> Donor Dashboard
        </h1>
        <button
          onClick={handleLogout}
          className="bg-blue-900 hover:bg-blue-950 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Logout
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Availability Toggle */}
        <div className={`rounded-xl shadow-sm p-6 mb-6 border-l-4 ${isAvailable ? "bg-green-50 border-green-500" : "bg-white border-gray-300"}`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {isAvailable ? "🟢 You are Available" : "🔴 You are Busy"}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {isAvailable
                  ? "Patients nearby can see you on the map and send requests."
                  : "Your location is hidden. You won't receive new requests."}
              </p>
            </div>
            <button
              onClick={toggleAvailability}
              disabled={toggling}
              className={`px-6 py-3 rounded-lg font-bold transition-colors ${
                isAvailable
                  ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {toggling ? "Updating..." : isAvailable ? "Go Busy" : "Go Available"}
            </button>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-6">Incoming Blood Requests</h2>

        {requests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No pending requests</h3>
            <p className="text-gray-500">
              When a patient needs your blood type, their request will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500 flex flex-col md:flex-row justify-between items-center gap-4"
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Blood Request</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    A patient with your blood group needs your help.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Request ID: {request.id}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleResponse(request.id, "ACCEPTED")}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleResponse(request.id, "DECLINED")}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}