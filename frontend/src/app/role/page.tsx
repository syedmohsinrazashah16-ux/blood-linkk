"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export default function RoleSelectionPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRoleSelect = async (role: "PATIENT" | "DONOR") => {
    setLoading(true);
    const user = auth.currentUser;

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      // Save the user to the Firestore 'Users' collection
      // We use the Firebase Auth UID as the document ID
      await setDoc(doc(db, "Users", user.uid), {
        userId: user.uid,
        phoneNumber: user.phoneNumber,
        role: role,
        bloodGroup: "", // To be filled in profile later
        reliabilityScore: 1.0, // Start with a perfect score
        createdAt: new Date(),
      }, { merge: true }); // merge: true prevents overwriting existing data

      // Redirect to profile setup instead of the dashboard
         router.push("/profile");
         
    } catch (error) {
      console.error("Error saving role: ", error);
      alert("Failed to save role. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to Blood-Link</h1>
      <p className="text-gray-600 mb-10 text-center">How do you want to use the platform?</p>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">
        {/* Patient Card */}
        <button
          onClick={() => handleRoleSelect("PATIENT")}
          disabled={loading}
          className="flex-1 bg-white border-2 border-red-100 rounded-2xl p-8 hover:border-red-500 hover:shadow-lg transition-all group disabled:opacity-50"
        >
          <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🩸</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">I Need Blood</h2>
          <p className="text-sm text-gray-500">I am a patient or a guardian looking for donors.</p>
        </button>

        {/* Donor Card */}
        <button
          onClick={() => handleRoleSelect("DONOR")}
          disabled={loading}
          className="flex-1 bg-white border-2 border-blue-100 rounded-2xl p-8 hover:border-blue-500 hover:shadow-lg transition-all group disabled:opacity-50"
        >
          <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">💪</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">I Want to Donate</h2>
          <p className="text-sm text-gray-500">I am a healthy individual willing to donate blood.</p>
        </button>
      </div>
    </div>
  );
}