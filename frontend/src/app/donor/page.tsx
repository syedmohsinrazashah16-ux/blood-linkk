"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

export default function DonorDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // 1. Wait for Firebase to confirm if the user is logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        // If Firebase definitively says "no user", redirect to login
        router.push("/login");
      } else {
        // User is logged in, save them to state
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 2. Fetch incoming requests ONLY after we know the user is loaded
  useEffect(() => {
    const fetchRequests = async () => {
      if (!user) return;

      try {
        const q = query(
          collection(db, "BloodRequests"),
          where("donorId", "==", user.uid),
          where("status", "==", "PENDING")
        );
        const querySnapshot = await getDocs(q);
        const reqList: any[] = [];
        querySnapshot.forEach((doc) => {
          reqList.push({ id: doc.id, ...doc.data() });
        });
        setRequests(reqList);
      } catch (error) {
        console.error("Error fetching requests: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user]); // This runs whenever 'user' state updates

  // 3. Handle Accept or Decline
  const handleResponse = async (requestId: string, newStatus: "ACCEPTED" | "DECLINED") => {
    try {
      await updateDoc(doc(db, "BloodRequests", requestId), {
        status: newStatus,
      });
      setRequests(requests.filter((req) => req.id !== requestId));
      alert(`Request ${newStatus.toLowerCase()}!`);
    } catch (error) {
      console.error("Error updating request: ", error);
      alert("Failed to update request.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Dashboard...</div>;

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
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Incoming Blood Requests</h2>

        {requests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No pending requests</h3>
            <p className="text-gray-500">When a patient needs your blood type, their request will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Blood Request</h3>
                  <p className="text-gray-600 text-sm mt-1">A patient with your blood group needs your help.</p>
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