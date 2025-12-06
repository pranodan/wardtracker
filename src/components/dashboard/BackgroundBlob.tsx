"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";

export default function BackgroundBlob() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return (
        <div className="fixed inset-0 -z-10 h-screen w-screen overflow-hidden bg-[#050505]" />
    );

    return (
        <div className="fixed inset-0 -z-10 h-screen w-screen overflow-hidden bg-[#050505]">
            <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
                <ambientLight intensity={0.5} />
                <Wave />
                <Stars />
            </Canvas>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/90" />
        </div>
    );
}

function Wave() {
    const ref = useRef<THREE.Points>(null);

    const positions = useMemo(() => {
        const positions = [];
        const count = 100; // Grid size
        const sep = 0.5; // Separation

        for (let xi = 0; xi < count; xi++) {
            for (let zi = 0; zi < count; zi++) {
                const x = sep * (xi - count / 2);
                const z = sep * (zi - count / 2);
                const y = 0;
                positions.push(x, y, z);
            }
        }
        return new Float32Array(positions);
    }, []);

    useFrame((state) => {
        if (!ref.current) return;

        const { clock } = state;
        const t = clock.getElapsedTime();
        const positions = ref.current.geometry.attributes.position.array as Float32Array;

        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];

            // Wave equation: y = sin(x + t) + cos(z + t)
            // Complex wave for "vibe coding" feel
            positions[i + 1] =
                Math.sin(x / 2 + t) * 1 +
                Math.cos(z / 2 + t) * 1 +
                Math.sin(Math.sqrt(x * x + z * z) / 2 + t) * 0.5;
        }

        ref.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
            <PointMaterial
                transparent
                color="#00f3ff"
                size={0.05}
                sizeAttenuation={true}
                depthWrite={false}
                opacity={0.6}
            />
        </Points>
    );
}

function Stars() {
    const ref = useRef<THREE.Points>(null);

    const [positions] = useState(() => {
        const positions = [];
        for (let i = 0; i < 2000; i++) {
            positions.push((Math.random() - 0.5) * 50);
            positions.push((Math.random() - 0.5) * 50);
            positions.push((Math.random() - 0.5) * 50);
        }
        return new Float32Array(positions);
    });

    useFrame((state) => {
        if (ref.current) {
            ref.current.rotation.y += 0.0005;
            ref.current.rotation.x += 0.0002;
        }
    });

    return (
        <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
            <PointMaterial
                transparent
                color="#ffffff"
                size={0.02}
                sizeAttenuation={true}
                depthWrite={false}
                opacity={0.4}
            />
        </Points>
    );
}


