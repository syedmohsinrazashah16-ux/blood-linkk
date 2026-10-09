"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, redirect to role selection or dashboard
        router.push("/role");
      } else {
        // Not signed in, redirect to login
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-700 mb-2">Blood-Link</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
}
