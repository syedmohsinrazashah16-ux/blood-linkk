"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function OTPPage() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Retrieve the confirmation result saved from the login page
      const confirmationResult = (window as any).confirmationResult;

      if (!confirmationResult) {
        throw new Error("Session expired. Please go back and request a new OTP.");
      }

      // Verify the OTP with Firebase
      const result = await confirmationResult.confirm(otp);
      
      // User is successfully logged in! 
      // Now we need to check their role in the database (we will do this next phase)
      // For now, let's route them to the Role Selection screen you created.
      
      router.push("/role"); 

    } catch (err: any) {
      console.error(err);
      setError("Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-red-600 mb-2">Verify OTP</h1>
          <p className="text-gray-600">Enter the 6-digit code sent to your phone</p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              One-Time Password
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="w-full text-center tracking-[0.5em] text-2xl block rounded-lg border border-gray-300 p-3 focus:ring-red-500 focus:border-red-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:bg-red-300"
          >
            {loading ? "Verifying..." : "Verify & Login"}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <button 
            onClick={() => router.push("/login")} 
            className="text-sm text-gray-500 hover:text-red-600 underline"
          >
            Change phone number
          </button>
        </div>
      </div>
    </div>
  );
}