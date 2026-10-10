"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function PatientDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [patientType, setPatientType] = useState<string>("GENERAL");
  const [userName, setUserName] = useState<string>("Patient");

  useEffect(() => {
    // Safety timeout: If Firebase doesn't respond in 5 seconds, stop loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "Users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setPatientType(data.patientType || "GENERAL");
          setUserName(data.name || "Patient");
        } else {
          router.push("/profile");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red-600 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span>🩸</span> Blood-Link
        </h1>
        <button onClick={handleLogout} className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded-lg text-sm transition-colors">
          Logout
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome, {userName}</h2>
        <p className="text-gray-600 mb-6">
          Patient Dashboard {patientType === "THALASSEMIA" ? "(Thalassemia Major)" : "(General)"}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/find-donor" className="block group">
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500 h-full transition-all group-hover:shadow-md group-hover:-translate-y-1">
              <div className="text-3xl mb-3">🔍</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Find a Donor</h3>
              <p className="text-gray-600 text-sm mb-4">Search for nearby eligible blood donors on the map.</p>
              <span className="text-red-600 font-semibold text-sm">Open Map →</span>
            </div>
          </Link>

          {patientType === "THALASSEMIA" && (
            <Link href="/schedule" className="block group">
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500 h-full transition-all group-hover:shadow-md group-hover:-translate-y-1">
                <div className="text-3xl mb-3">📅</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Transfusion Schedule</h3>
                <p className="text-gray-600 text-sm mb-4">Manage your upcoming transfusion dates and linked donors.</p>
                <span className="text-orange-500 font-semibold text-sm">Manage Schedule →</span>
              </div>
            </Link>
          )}

          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500 h-full opacity-60">
            <div className="text-3xl mb-3">📋</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Request History</h3>
            <p className="text-gray-600 text-sm mb-4">View your past blood requests and their status.</p>
            <span className="text-blue-600 font-semibold text-sm">Coming soon — Phase 3</span>
          </div>

          <Link href="/profile" className="block group">
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500 h-full transition-all group-hover:shadow-md group-hover:-translate-y-1">
              <div className="text-3xl mb-3">👤</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">My Profile</h3>
              <p className="text-gray-600 text-sm mb-4">Update your blood group, medical info, and preferences.</p>
              <span className="text-green-600 font-semibold text-sm">View Profile →</span>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}