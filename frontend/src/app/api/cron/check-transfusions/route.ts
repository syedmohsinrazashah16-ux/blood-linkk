import { NextResponse } from "next/server";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export async function GET(request: Request) {
  // Security check
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  
  if (secret !== "blood-link-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Running daily Thalassemia check...");
    
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    threeDaysFromNow.setHours(0, 0, 0, 0);

    const profilesRef = collection(db, "ThalassemiaProfiles");
    const snapshot = await getDocs(profilesRef);

    let alertsSent = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (!data.nextTransfusionDate) continue;

      // Handle both Firestore Timestamp and Date objects
      const transfusionDate = data.nextTransfusionDate.toDate 
        ? data.nextTransfusionDate.toDate() 
        : new Date(data.nextTransfusionDate);
      
      transfusionDate.setHours(0, 0, 0, 0);

      if (transfusionDate.getTime() === threeDaysFromNow.getTime()) {
        console.log(`ALERT: Patient ${docSnap.id} needs blood in 72 hours!`);
        
        await addDoc(collection(db, "SystemAlerts"), {
          patientId: docSnap.id,
          message: "Transfusion due in 72 hours. Please contact your linked donors.",
          timestamp: serverTimestamp(),
          status: "PENDING",
        });
        alertsSent++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Check complete. Alerts sent: ${alertsSent}`,
      alertsSent 
    });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}