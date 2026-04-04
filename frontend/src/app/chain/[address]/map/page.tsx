"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";
import Navbar from "@/src/components/navbar";
/* ---------------- DYNAMIC IMPORT ---------------- */
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);

/* ---------------- TYPES ---------------- */
type Role =
  | "manufacturer"
  | "supplier"
  | "transporter"
  | "warehouse"
  | "distributor"
  | "retailer";

type LocationPoint = {
  lat: number;
  lng: number;
  label: string;
  role: Role;
};

/* ---------------- ICON FACTORY ---------------- */
const createIcon = (color: string) =>
  new L.Icon({
    iconUrl: `https://maps.google.com/mapfiles/ms/icons/${color}-dot.png`,
    iconSize: [32, 32],
  });

/* ---------------- ROLE COLORS ---------------- */
const roleIcons: Record<Role, L.Icon> = {
  manufacturer: createIcon("red"),
  supplier: createIcon("orange"),
  transporter: createIcon("blue"),
  warehouse: createIcon("purple"),
  distributor: createIcon("green"),
  retailer: createIcon("yellow"),
};

/* ---------------- COMPONENT ---------------- */
export default function SupplyChainMap({
  points = [
    {
      lat: 28.6139,
      lng: 77.2090,
      label: "Manufacturer - Delhi",
      role: "manufacturer",
    },
    {
      lat: 26.9124,
      lng: 75.7873,
      label: "Supplier - Jaipur",
      role: "supplier",
    },
    {
      lat: 23.0225,
      lng: 72.5714,
      label: "Transport Hub - Ahmedabad",
      role: "transporter",
    },
    {
      lat: 19.0760,
      lng: 72.8777,
      label: "Warehouse - Mumbai",
      role: "warehouse",
    },
    {
      lat: 18.5204,
      lng: 73.8567,
      label: "Distributor - Pune",
      role: "distributor",
    },
    {
      lat: 12.9716,
      lng: 77.5946,
      label: "Retailer - Bangalore",
      role: "retailer",
    },
  ],
}: {
  points?: LocationPoint[];
}) {
  const [mounted, setMounted] = useState(false);

  /* ---------------- LOAD CSS ---------------- */
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

    document.head.appendChild(link);
    setMounted(true);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  if (!mounted) return null;

  const safePoints = Array.isArray(points) ? points : [];

  const center: [number, number] =
    safePoints.length > 0
      ? [safePoints[0].lat, safePoints[0].lng]
      : [20.5937, 78.9629];

  /* ---------------- PATH ---------------- */
  const pathPositions: [number, number][] = safePoints.map((p) => [
    p.lat,
    p.lng,
  ]);

  return (
    <>
    <Navbar />
    <div className="w-full max-w-6xl mx-auto bg-black/40 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl py-10 mt-20">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-white text-lg font-semibold">
          🌍 Supply Chain Flow Map
        </h2>
        <span className="text-xs text-white/50">
          End-to-end tracking
        </span>
      </div>

      {/* MAP */}
      <div className="w-full h-[420px] rounded-2xl overflow-hidden">
        <MapContainer
          center={center}
          zoom={5}
          scrollWheelZoom
          className="w-full h-full"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* ROUTE */}
          {pathPositions.length > 1 && (
            <Polyline
              positions={pathPositions}
              pathOptions={{ color: "lime", weight: 4 }}
            />
          )}

          {/* MARKERS */}
          {safePoints.map((p, i) => (
            <Marker
              key={i}
              position={[p.lat, p.lng]}
              icon={roleIcons[p.role]}
            >
              <Popup>
                <div className="text-xs">
                  <b>{p.label}</b>
                  <br />
                  Role: {p.role}
                  <br />
                  {p.lat}, {p.lng}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* LEGEND */}
      <div className="grid grid-cols-3 gap-3 mt-4 text-xs text-white/70">
        <div>🔴 Manufacturer</div>
        <div>🟠 Supplier</div>
        <div>🔵 Transporter</div>
        <div>🟣 Warehouse</div>
        <div>🟢 Distributor</div>
        <div>🟡 Retailer</div>
      </div>
    </div>
    </>
  );
}