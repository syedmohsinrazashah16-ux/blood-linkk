"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

const ADMIN_CODE = "KFUEIT-ADMIN-2024"; // Change this to your own secret code

export default function RoleSelectionPage() {
  const [loading, setLoading] = useState(false);
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRoleSelect = async (role: "PATIENT" | "DONOR" | "ADMIN") => {
    setLoading(true);
    const user = auth.currentUser;

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      await setDoc(
        doc(db, "Users", user.uid),
        {
          userId: user.uid,
          phoneNumber: user.phoneNumber,
          role: role,
          bloodGroup: "",
          reliabilityScore: 1.0,
          createdAt: new Date(),
        },
        { merge: true }
      );

      // Redirect based on role
      if (role === "PATIENT") {
        router.push("/profile");
      } else if (role === "DONOR") {
        router.push("/profile");
      } else {
        router.push("/admin");
      }
    } catch (error) {
      console.error("Error saving role: ", error);
      alert("Failed to save role. Please try again.");
      setLoading(false);
    }
  };

  const handleAdminLogin = () => {
    if (adminCode === ADMIN_CODE) {
      setError("");
      handleRoleSelect("ADMIN");
    } else {
      setError("Invalid admin code. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to Blood-Link</h1>
      <p className="text-gray-600 mb-10 text-center">How do you want to use the platform?</p>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl">
        {/* Patient Card */}
        <button
          onClick={() => handleRoleSelect("PATIENT")}
          disabled={loading}
          className="flex-1 bg-white border-2 border-red-100 rounded-2xl p-8 hover:border-red-500 hover:shadow-lg transition-all group disabled:opacity-50"
        >
          <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🩸</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">I Need Blood</h2>
          <p className="text-sm text-gray-500">
            I am a patient or a guardian looking for donors.
          </p>
        </button>

        {/* Donor Card */}
        <button
          onClick={() => handleRoleSelect("DONOR")}
          disabled={loading}
          className="flex-1 bg-white border-2 border-blue-100 rounded-2xl p-8 hover:border-blue-500 hover:shadow-lg transition-all group disabled:opacity-50"
        >
          <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">💪</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">I Want to Donate</h2>
          <p className="text-sm text-gray-500">
            I am a healthy individual willing to donate blood.
          </p>
        </button>
      </div>

      {/* Admin Section */}
      <div className="mt-10 w-full max-w-3xl">
        {!showAdminInput ? (
          <button
            onClick={() => setShowAdminInput(true)}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-800 underline transition-colors"
          >
            🏥 Blood Bank Admin? Click here to login
          </button>
        ) : (
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Admin Access</h3>
            <p className="text-sm text-gray-500 mb-4">
              Enter your secret admin code to access the blood bank dashboard.
            </p>
            {error && (
              <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">{error}</div>
            )}
            <div className="flex gap-3">
              <input
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="Enter admin code"
                className="flex-1 rounded-lg border border-gray-300 p-3 focus:ring-gray-500 focus:border-gray-500"
              />
              <button
                onClick={handleAdminLogin}
                disabled={loading}
                className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:bg-gray-400"
              >
                {loading ? "..." : "Login"}
              </button>
            </div>
            <button
              onClick={() => {
                setShowAdminInput(false);
                setError("");
                setAdminCode("");
              }}
              className="text-xs text-gray-400 hover:text-gray-600 mt-3"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}