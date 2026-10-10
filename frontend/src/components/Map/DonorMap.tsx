"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

// Haversine formula to calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

const customIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface DonorMapProps {
  userBloodGroup: string;
  onRankedDonors?: (donors: any[]) => void; // Callback to send ranked list up
  center?: [number, number];
  zoom?: number;
}

export default function DonorMap({ userBloodGroup, onRankedDonors, center = [28.4212, 70.2989], zoom = 13 }: DonorMapProps) {
  const [donors, setDonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Patient's location (for now, use map center. Later we will use real GPS)
  const patientLat = center[0];
  const patientLng = center[1];

  useEffect(() => {
    const fetchDonors = async () => {
      if (!userBloodGroup) return;
      
      try {
            const q = query(
          collection(db, "Users"),
          where("role", "==", "DONOR"),
          where("bloodGroup", "==", userBloodGroup),
          where("availabilityStatus", "==", true) // Only show available donors
        );

        const querySnapshot = await getDocs(q);
        const donorList: any[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Skip donors without coordinates
          if (!data.latitude || !data.longitude) return;

          // Calculate distance
          const distance = calculateDistance(
            patientLat, 
            patientLng, 
            data.latitude, 
            data.longitude
          );

          donorList.push({ 
            id: doc.id, 
            ...data, 
            distance: parseFloat(distance.toFixed(2)) // Round to 2 decimal places
          });
        });

        // Sort donors by distance (closest first)
        donorList.sort((a, b) => a.distance - b.distance);

        setDonors(donorList);
        
        // Send the ranked list up to the parent page
        if (onRankedDonors) {
          onRankedDonors(donorList);
        }

      } catch (error) {
        console.error("Error fetching donors: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDonors();
  }, [userBloodGroup, patientLat, patientLng, onRankedDonors]);

  const handleRequest = async (donorId: string, donorName: string) => {
    const patient = auth.currentUser;
    if (!patient) {
      alert("You must be logged in to request blood.");
      return;
    }

    try {
      await addDoc(collection(db, "BloodRequests"), {
        patientId: patient.uid,
        patientPhone: patient.phoneNumber,
        donorId: donorId,
        donorName: donorName,
        status: "PENDING",
        createdAt: serverTimestamp(),
      });
      
      alert(`✅ Request sent to ${donorName}! They will be notified.`);
    } catch (error) {
      console.error("Error sending request: ", error);
      alert("Failed to send request. Please try again.");
    }
  };

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-md border border-gray-200 relative">
      {loading && (
        <div className="absolute top-4 right-4 z-[1000] bg-white px-4 py-2 rounded shadow-md text-sm font-medium">
          Searching for {userBloodGroup} donors...
        </div>
      )}
      
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", minHeight: "500px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {donors.map((donor) => (
          <Marker
            key={donor.id}
            position={[donor.latitude, donor.longitude]}
            icon={customIcon}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-lg">{donor.name || "Anonymous Donor"}</h3>
                <p className="text-red-600 font-semibold">Blood Group: {donor.bloodGroup}</p>
                <p className="text-gray-600 text-sm mt-1">
                  📍 Distance: <span className="font-semibold">{donor.distance} km</span>
                </p>
                <button 
                  onClick={() => handleRequest(donor.id, donor.name)}
                  className="mt-3 w-full bg-red-600 text-white py-2 px-3 rounded text-sm hover:bg-red-700 transition-colors"
                >
                  Request Blood
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}