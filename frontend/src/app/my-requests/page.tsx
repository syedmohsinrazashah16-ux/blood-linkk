"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Safety timeout so we never get stuck on "Loading..."
  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    // No orderBy — we sort client side to avoid index requirement
    const q = query(
      collection(db, "BloodRequests"),
      where("patientId", "==", user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const reqList: any[] = [];
        snapshot.forEach((docSnap) => {
          reqList.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Sort newest first
        reqList.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return bTime.getTime() - aTime.getTime();
        });

        setRequests(reqList);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading my requests:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "PENDING":
        return { bg: "bg-yellow-100", text: "text-yellow-700", label: "⏳ Awaiting Response" };
      case "APPROVED":
        return { bg: "bg-blue-100", text: "text-blue-700", label: "✓ Approved by Admin" };
      case "ACCEPTED":
        return { bg: "bg-green-100", text: "text-green-700", label: "🩸 Donor Accepted" };
      case "DECLINED":
        return { bg: "bg-red-100", text: "text-red-700", label: "✕ Declined" };
      case "COMPLETED":
        return { bg: "bg-gray-200", text: "text-gray-700", label: "✓✓ Completed" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-600", label: status };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red-600 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2">📋 My Blood Requests</h1>
        <Link
          href="/patient"
          className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Back to Dashboard
        </Link>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {requests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No requests yet</h3>
            <p className="text-gray-500 mb-4">
              You haven't sent any blood requests. Go to the map to find donors.
            </p>
            <Link
              href="/find-donor"
              className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              🔍 Find a Donor
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const style = getStatusStyle(req.status);
              return (
                <div key={req.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase">
                        Request #{req.id.substring(0, 8)}
                      </p>
                      <h3 className="text-lg font-bold text-gray-800 mt-1">
                        {req.donorName || "Unknown Donor"}
                      </h3>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                    {req.status === "PENDING" && <p>Your request has been sent to the donor. Waiting for their response.</p>}
                    {req.status === "APPROVED" && <p>The blood bank admin approved this request.</p>}
                    {req.status === "ACCEPTED" && <p>🎉 The donor accepted your request. Please contact them.</p>}
                    {req.status === "DECLINED" && <p>The request was declined. Try finding another donor.</p>}
                    {req.status === "COMPLETED" && <p>This donation has been completed. Thank you!</p>}
                  </div>

                  {req.createdAt && (
                    <p className="text-xs text-gray-400 mt-3">
                      Requested on:{" "}
                      {req.createdAt.toDate
                        ? req.createdAt.toDate().toLocaleString()
                        : new Date(req.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}