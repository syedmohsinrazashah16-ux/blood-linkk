"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import Link from "next/link";

export default function LeaderboardPage() {
  const [donors, setDonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Get all donors and sort them by reliabilityScore
        const q = query(
          collection(db, "Users"),
          where("role", "==", "DONOR"),
          orderBy("reliabilityScore", "desc")
        );
        const querySnapshot = await getDocs(q);
        const donorList: any[] = [];
        querySnapshot.forEach((doc) => {
          donorList.push({ id: doc.id, ...doc.data() });
        });
        setDonors(donorList);
      } catch (error) {
        console.error("Error fetching leaderboard: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Leaderboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-yellow-500 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2"><span>🏆</span> Donor Leaderboard</h1>
        <Link href="/donor" className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg text-sm transition-colors">Back to Dashboard</Link>
      </header>
      <main className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-yellow-100 p-4 border-b border-yellow-200">
            <p className="text-yellow-800 text-sm font-medium">Rankings are based on completed donations and reliability scores.</p>
          </div>
          <div className="divide-y divide-gray-100">
            {donors.map((donor, index) => (
              <div key={donor.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    index === 0 ? "bg-yellow-400 text-white" :
                    index === 1 ? "bg-gray-300 text-white" :
                    index === 2 ? "bg-orange-400 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-800">{donor.name || "Anonymous Donor"}</p>
                    <p className="text-sm text-gray-500">Blood Group: {donor.bloodGroup}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-yellow-600 text-lg">{donor.reliabilityScore || 0} pts</p>
                  <p className="text-xs text-gray-400">Reliability Score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}