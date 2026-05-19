'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import type { SongDNA, SimilarityDimension, GraphNode, GraphLink } from '@/types/audio-features';
import { computeGraphData, DIMENSION_COLORS } from '@/services/similarity';

interface SimilarityGraph3DProps {
  songs: SongDNA[];
  selectedSongId?: string | null;
  dimension?: SimilarityDimension | 'overall';
  threshold?: number;
  onSelectSong?: (id: string) => void;
}

export function SimilarityGraph3D({
  songs,
  selectedSongId,
  dimension = 'overall',
  threshold = 0.3,
  onSelectSong,
}: SimilarityGraph3DProps) {
  const graphData = useMemo(
    () => computeGraphData(songs, dimension, threshold),
    [songs, dimension, threshold]
  );

  if (songs.length === 0) {
    return (
      <div className="h-[600px] bg-muted/30 rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">
          Upload at least 2 songs to see the similarity graph
        </p>
      </div>
    );
  }

  return (
    <div className="h-[600px] bg-black/90 rounded-lg overflow-hidden relative">
      <Canvas camera={{ position: [0, 0, 300], fov: 60 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[100, 100, 100]} intensity={1} />
        <pointLight position={[-100, -100, -100]} intensity={0.5} />

        <Graph
          data={graphData}
          selectedId={selectedSongId}
          onSelect={onSelectSong}
        />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={50}
          maxDistance={500}
          autoRotate
          autoRotateSpeed={0.5}
        />

        {/* Axes helper */}
        <axesHelper args={[50]} />
      </Canvas>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/70 p-3 rounded-lg text-xs space-y-1">
        <p className="text-white/80 font-medium mb-2">Axes</p>
        <p className="text-red-400">X: Tonal (harmony)</p>
        <p className="text-green-400">Y: Energy (rhythm + dynamics)</p>
        <p className="text-blue-400">Z: Timbre (texture)</p>
      </div>

      {/* Dimension legend */}
      <div className="absolute bottom-4 right-4 bg-black/70 p-3 rounded-lg text-xs space-y-1">
        <p className="text-white/80 font-medium mb-2">Link Colors</p>
        {Object.entries(DIMENSION_COLORS).map(([dim, color]) => (
          <div key={dim} className="flex items-center gap-2">
            <div className="w-3 h-1 rounded" style={{ backgroundColor: color }} />
            <span className="text-white/60 capitalize">{dim}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface GraphProps {
  data: { nodes: GraphNode[]; links: GraphLink[] };
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

function Graph({ data, selectedId, onSelect }: GraphProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Gentle rotation animation
  useFrame((_, delta) => {
    if (groupRef.current) {
      // Slow idle rotation when not interacting
      // groupRef.current.rotation.y += delta * 0.1;
    }
  });

  // Create node lookup for link positioning
  const nodePositions = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    for (const node of data.nodes) {
      map.set(node.id, [node.x, node.y, node.z]);
    }
    return map;
  }, [data.nodes]);

  return (
    <group ref={groupRef}>
      {/* Links */}
      {data.links.map((link, idx) => {
        const sourcePos = nodePositions.get(link.source);
        const targetPos = nodePositions.get(link.target);
        if (!sourcePos || !targetPos) return null;

        const isConnectedToSelected =
          selectedId && (link.source === selectedId || link.target === selectedId);

        return (
          <Line
            key={idx}
            points={[sourcePos, targetPos]}
            color={DIMENSION_COLORS[link.dimension]}
            lineWidth={isConnectedToSelected ? 3 : 1}
            opacity={isConnectedToSelected ? 0.8 : 0.2}
            transparent
          />
        );
      })}

      {/* Nodes */}
      {data.nodes.map((node) => (
        <SongNode
          key={node.id}
          node={node}
          isSelected={node.id === selectedId}
          isConnected={
            selectedId
              ? data.links.some(
                  (l) =>
                    (l.source === selectedId && l.target === node.id) ||
                    (l.target === selectedId && l.source === node.id)
                )
              : false
          }
          onSelect={() => onSelect?.(node.id)}
        />
      ))}
    </group>
  );
}

interface SongNodeProps {
  node: GraphNode;
  isSelected: boolean;
  isConnected: boolean;
  onSelect: () => void;
}

function SongNode({ node, isSelected, isConnected, onSelect }: SongNodeProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  // Pulse animation for selected node
  useFrame((state) => {
    if (meshRef.current && isSelected) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
  });

  const opacity = isSelected ? 1 : isConnected ? 0.9 : hovered ? 0.8 : 0.6;

  return (
    <group position={[node.x, node.y, node.z]}>
      <Sphere
        ref={meshRef}
        args={[node.size, 16, 16]}
        onClick={onSelect}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={node.color}
          transparent
          opacity={opacity}
          emissive={isSelected ? node.color : '#000000'}
          emissiveIntensity={isSelected ? 0.5 : 0}
        />
      </Sphere>

      {/* Glow effect for selected */}
      {isSelected && (
        <Sphere args={[node.size * 1.5, 16, 16]}>
          <meshBasicMaterial color={node.color} transparent opacity={0.2} />
        </Sphere>
      )}

      {/* Label */}
      {(hovered || isSelected) && (
        <Html center distanceFactor={100}>
          <div className="bg-black/90 px-3 py-2 rounded-lg text-white text-xs whitespace-nowrap pointer-events-none">
            <p className="font-medium truncate max-w-[200px]">{node.name}</p>
            <p className="text-white/60">
              {node.key} | {Math.round(node.bpm)} BPM
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}
