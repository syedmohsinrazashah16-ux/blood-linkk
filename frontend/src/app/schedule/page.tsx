"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function SchedulePage() {
  const [nextDate, setNextDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchSchedule = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }

      // Check if a schedule already exists for this patient
      const profileRef = doc(db, "ThalassemiaProfiles", user.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists() && profileSnap.data().nextTransfusionDate) {
        // Format the date to YYYY-MM-DD for the HTML date input
        const savedDate = profileSnap.data().nextTransfusionDate.toDate();
        setNextDate(savedDate.toISOString().split("T")[0]);
      }
      setLoading(false);
    };
    fetchSchedule();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextDate) return alert("Please select a date.");

    setSaving(true);
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Save the schedule to the ThalassemiaProfiles collection
      await setDoc(doc(db, "ThalassemiaProfiles", user.uid), {
        patientUserId: user.uid,
        nextTransfusionDate: new Date(nextDate), // Convert to Firestore Timestamp
        linkedDonorIds: [], // To be populated later
        updatedAt: serverTimestamp(),
      }, { merge: true });

      alert("✅ Transfusion schedule saved! We will remind your donors 72 hours before.");
      router.push("/patient");
    } catch (error) {
      console.error("Error saving schedule: ", error);
      alert("Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading schedule...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-orange-500 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold">Thalassemia Schedule</h1>
        <Link href="/patient" className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg text-sm transition-colors">
          Back to Dashboard
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">📅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Next Transfusion Date</h2>
            <p className="text-gray-600 text-sm">
              Set the date of your next required blood transfusion. Blood-Link will automatically alert your donor network 72 hours in advance.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full block rounded-lg border border-gray-300 p-3 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:bg-orange-300"
            >
              {saving ? "Saving..." : "Save Schedule"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}