"use client";

import Image from "next/image";
import BackgroundBlob from "@/components/dashboard/BackgroundBlob";
import UnitSphere from "@/components/dashboard/UnitSphere";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <BackgroundBlob />

      <div className="z-10 flex flex-col items-center space-y-24 p-4">
        <div className="relative z-10 text-center -mt-20">
          <h1 className="bg-gradient-to-r from-primary via-white to-secondary bg-clip-text text-5xl font-bold text-transparent md:text-7xl">
            WardTracker
          </h1>
        </div>

        <div className="w-full max-w-md">
          <UnitSphere />
        </div>
      </div>
    </main>
  );
}
