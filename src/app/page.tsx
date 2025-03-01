"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { CitySelector } from "@/components/ui/city-selector";
import { cities } from "@/lib/utils/cities";

// Leafletはクライアントサイドでのみ動作するため、動的にインポート
const MapWithNoSSR = dynamic(
  () => import("@/components/map").then((mod) => mod.MapClient),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[calc(100vh-80px)] flex items-center justify-center bg-gray-100">
        <p className="text-lg font-medium">マップを読み込み中...</p>
      </div>
    ),
  }
);

export default function Home() {
  const [selectedCity, setSelectedCity] = useState(cities[0]);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="p-4">
        <CitySelector
          cities={cities}
          selectedCity={selectedCity}
          onSelectCity={setSelectedCity}
        />
      </div>

      <main className="flex-1 p-4">
        <div className="w-full h-[calc(100vh-200px)] bg-gray-100 rounded-lg overflow-hidden relative">
          <MapWithNoSSR
            initialCenter={selectedCity.center}
            initialZoom={selectedCity.zoom}
            city={selectedCity.name}
          />
        </div>
      </main>
    </div>
  );
}
