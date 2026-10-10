"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function ProfileSetupPage() {
  const [bloodGroup, setBloodGroup] = useState("");
  const [patientType, setPatientType] = useState<"THALASSEMIA" | "GENERAL">("GENERAL");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserRole = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "Users", user.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
        }
      } catch (error) {
        console.error("Error fetching role:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserRole();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bloodGroup) return alert("Please select a blood group.");
    
    setSaving(true);
    const user = auth.currentUser;
    if (!user) return;

    try {
      await setDoc(doc(db, "Users", user.uid), {
        bloodGroup: bloodGroup,
        patientType: role === "PATIENT" ? patientType : "NONE",
        profileCompleted: true,
      }, { merge: true });

      if (role === "PATIENT") {
        if (patientType === "THALASSEMIA") {
          router.push("/schedule"); 
        } else {
          router.push("/patient"); 
        }
      } else {
        router.push("/donor");
      }
    } catch (error) {
      console.error("Error saving profile: ", error);
      alert("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-red-600 mb-2">Complete Profile</h1>
          <p className="text-gray-600">This information helps us match you correctly.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Your Blood Group</label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full block rounded-lg border border-gray-300 p-3 focus:ring-red-500 focus:border-red-500 bg-white"
              required
            >
              <option value="" disabled>Choose your blood group</option>
              {BLOOD_GROUPS.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          {role === "PATIENT" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">What kind of patient are you?</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPatientType("THALASSEMIA")}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    patientType === "THALASSEMIA" 
                      ? "border-red-500 bg-red-50 text-red-700 font-bold" 
                      : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  Thalassemia Major
                </button>
                <button
                  type="button"
                  onClick={() => setPatientType("GENERAL")}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    patientType === "GENERAL" 
                      ? "border-red-500 bg-red-50 text-red-700 font-bold" 
                      : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  General (Surgery, Accident)
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:bg-red-300"
          >
            {saving ? "Saving..." : "Save & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}