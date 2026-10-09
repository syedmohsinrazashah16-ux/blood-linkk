"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const DonorMap = dynamic(() => import("@/components/Map/DonorMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full bg-gray-200 animate-pulse rounded-xl flex items-center justify-center">
      <p className="text-gray-500 font-medium">Loading Map...</p>
    </div>
  ),
});

export default function FindDonorPage() {
  const [bloodGroup, setBloodGroup] = useState("");
  const [loading, setLoading] = useState(true);
  const [rankedDonors, setRankedDonors] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }

      const userDoc = await getDoc(doc(db, "Users", user.uid));
      if (userDoc.exists()) {
        setBloodGroup(userDoc.data().bloodGroup || "");
      }
      setLoading(false);
    };
    fetchUserProfile();
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-red-600 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold">Find a Donor</h1>
        <Link href="/patient" className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded-lg text-sm transition-colors">
          Back to Dashboard
        </Link>
      </header>

      <div className="flex-1 p-4 max-w-7xl mx-auto w-full">
        <div className="mb-4 bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
          <div>
            <h2 className="font-semibold text-lg text-gray-800">Nearby Donors</h2>
            <p className="text-sm text-gray-500">Ranked by distance (DDR Algorithm)</p>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg font-bold">
            Your Blood Group: {bloodGroup || "Not Set"}
          </div>
        </div>

        <div className="h-[500px] w-full mb-6">
          <DonorMap userBloodGroup={bloodGroup} onRankedDonors={setRankedDonors} />
        </div>

        {/* Ranked Donor List */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Closest Donors</h3>
          {rankedDonors.length === 0 ? (
            <p className="text-gray-500">No donors found nearby.</p>
          ) : (
            <div className="space-y-3">
              {rankedDonors.map((donor, index) => (
                <div key={donor.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-4">
                    <span className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-800">{donor.name || "Anonymous Donor"}</p>
                      <p className="text-sm text-gray-500">{donor.bloodGroup} • {donor.distance} km away</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      // Trigger the request from the map component (or handle it here)
                      alert(`Please click the donor's marker on the map to send a request.`);
                    }}
                    className="text-red-600 font-semibold text-sm hover:underline"
                  >
                    View on Map
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}