"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, doc, updateDoc, getDoc, query } from "firebase/firestore";

export default function DonorDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [donorProfile, setDonorProfile] = useState<any>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [role, setRole] = useState<string>("DONOR");
  const router = useRouter();

  // Load user + donor profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);
      try {
        const userDoc = await getDoc(doc(db, "Users", currentUser.uid));
        if (userDoc.exists()) {
          const profile: any = { id: userDoc.id, ...userDoc.data() };
          setDonorProfile(profile);
          setIsAvailable(profile.availabilityStatus || false);
          setRole(profile.role || "DONOR");
        }
      } catch (err) {
        console.error("Error loading donor profile:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Load and match requests
  useEffect(() => {
    if (!user || !donorProfile) return;

    const unsub = onSnapshot(query(collection(db, "BloodRequests")), (snapshot) => {
      const myRequests: any[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const statusOk = data.status === "PENDING" || data.status === "APPROVED";
        if (!statusOk) return;

        // Match by any of these (resilient to data mismatches)
        const matchesUID =
          data.donorId === user.uid ||
          data.donorId === donorProfile.id ||
          data.donorId === donorProfile.userId;

        const matchesPhone =
          (data.donorPhone && data.donorPhone === user.phoneNumber) ||
          (data.donorPhone && donorProfile.phoneNumber && data.donorPhone === donorProfile.phoneNumber);

        const matchesName =
          data.donorName && donorProfile.name && data.donorName === donorProfile.name;

        if (matchesUID || matchesPhone || matchesName) {
          myRequests.push({ id: docSnap.id, ...data });
        }
      });

      console.log("=== DONOR DEBUG ===");
      console.log("My UID:", user.uid);
      console.log("My Phone:", user.phoneNumber);
      console.log("My Profile:", donorProfile);
      console.log("Matched Requests:", myRequests);
      console.log("===================");

      setRequests(myRequests);
    }, (error) => {
      console.error("onSnapshot error:", error);
    });

    return () => unsub();
  }, [user, donorProfile]);

  const toggleAvailability = async () => {
    if (!user) return;
    setToggling(true);
    const newStatus = !isAvailable;
    try {
      await updateDoc(doc(db, "Users", user.uid), { availabilityStatus: newStatus });
      setIsAvailable(newStatus);
    } catch (error) {
      console.error("Error toggling availability:", error);
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
        <div className="flex gap-3 items-center">
          <Link href="/leaderboard" className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            🏆 Leaderboard
          </Link>
          {role === "ADMIN" && (
            <Link href="/admin" className="bg-gray-800 hover:bg-gray-900 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              🏥 Admin
            </Link>
          )}
          <button onClick={handleLogout} className="bg-blue-900 hover:bg-blue-950 px-4 py-2 rounded-lg text-sm transition-colors">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
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
                isAvailable ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-green-600 text-white hover:bg-green-700"
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
                className={`bg-white rounded-xl shadow-sm p-6 border-l-4 flex flex-col md:flex-row justify-between items-center gap-4 ${
                  request.status === "APPROVED" ? "border-green-600" : "border-red-500"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-800">Blood Request</h3>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      request.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">
                    A patient needs your help. Please accept if you are available.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Request #{request.id.substring(0, 8)}
                  </p>
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