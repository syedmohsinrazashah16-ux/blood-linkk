"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";

export default function PatientDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red-600 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span>🩸</span> Blood-Link
        </h1>
        <button 
          onClick={handleLogout}
          className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Logout
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Patient Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Find a Donor Card - NOW CLICKABLE */}
          <Link href="/find-donor" className="block group">
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500 h-full transition-all group-hover:shadow-md group-hover:-translate-y-1">
              <div className="text-3xl mb-3">🔍</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Find a Donor</h3>
              <p className="text-gray-600 text-sm mb-4">Search for nearby eligible blood donors on the map.</p>
              <span className="text-red-600 font-semibold text-sm">Open Map →</span>
            </div>
          </Link>

          {/* Transfusion Schedule Card */}
          <Link href="/schedule" className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500 h-full">
            <div className="text-3xl mb-3">📅</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Transfusion Schedule</h3>
            <p className="text-gray-600 text-sm mb-4">Manage your upcoming transfusion dates and linked donors.</p>
            <span className="text-orange-600 font-semibold text-sm">Manage Schedule →</span>
          </Link>

          {/* Request History Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500 h-full opacity-60">
            <div className="text-3xl mb-3">📋</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Request History</h3>
            <p className="text-gray-600 text-sm mb-4">View your past blood requests and their status.</p>
            <span className="text-blue-600 font-semibold text-sm">Coming soon — Phase 3</span>
          </div>

          {/* My Profile Card */}
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