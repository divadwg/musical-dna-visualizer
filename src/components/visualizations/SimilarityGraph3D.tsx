'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import type { SongDNA, SimilarityDimension, GraphNode, GraphLink } from '@/types/audio-features';
import { computeGraphData } from '@/services/similarity';

// atlas-3d tokens, repeated here because WebGL materials cannot read CSS variables
const INK = '#27282a'; // --key
const FAINT = '#a4a8ae'; // --faint
const LIME = '#c8f04a'; // --lime

const AXES: { label: string; end: [number, number, number] }[] = [
  { label: 'Tonal', end: [60, 0, 0] },
  { label: 'Energy', end: [0, 60, 0] },
  { label: 'Timbre', end: [0, 0, 60] },
];

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
      <div className="h-[600px] well !rounded-[20px] flex items-center justify-center">
        <p className="label">Upload at least 2 songs to see the similarity graph</p>
      </div>
    );
  }

  return (
    <div className="h-[600px] well !rounded-[20px] overflow-hidden relative">
      <Canvas camera={{ position: [0, 0, 300], fov: 60 }}>
        {/* Light from above, so the nodes read as moulded */}
        <ambientLight intensity={1.4} />
        <directionalLight position={[60, 200, 120]} intensity={2.2} />

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

        {/* Axes */}
        {AXES.map((axis) => (
          <group key={axis.label}>
            <Line points={[[0, 0, 0], axis.end]} color={FAINT} lineWidth={1} />
            <Html position={axis.end} center>
              <span className="label pointer-events-none select-none">{axis.label}</span>
            </Html>
          </group>
        ))}
      </Canvas>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-4 pointer-events-none">
        <span className="label flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-ink" />
          Song
        </span>
        <span className="label flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-lime shadow-[0_0_0_1px_var(--lime-deep)_inset]" />
          Selected
        </span>
        <span className="label flex items-center gap-1.5">
          <span className="w-3 h-px bg-ink" />
          Similar
        </span>
      </div>

      <div className="absolute top-4 left-4 pointer-events-none">
        <span className="status plain capitalize">{dimension} similarity</span>
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
            color={INK}
            lineWidth={isConnectedToSelected ? 1.5 : 1}
            opacity={isConnectedToSelected ? 0.75 : 0.14}
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
          hasSelection={Boolean(selectedId)}
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
  hasSelection: boolean;
  isConnected: boolean;
  onSelect: () => void;
}

function SongNode({ node, isSelected, hasSelection, isConnected, onSelect }: SongNodeProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  // Pulse animation for selected node
  useFrame((state) => {
    if (!meshRef.current) return;
    const scale = isSelected ? 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1 : 1;
    meshRef.current.scale.setScalar(scale);
  });

  // Ink by default, lime when selected; songs unrelated to the selection fall back to grey
  const color = isSelected ? LIME : hasSelection && !isConnected && !hovered ? FAINT : INK;

  return (
    <group position={[node.x, node.y, node.z]}>
      <Sphere
        ref={meshRef}
        args={[node.size, 16, 16]}
        onClick={onSelect}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.05} />
      </Sphere>

      {/* Label */}
      {(hovered || isSelected) && (
        <Html center position={[0, node.size + 14, 0]} zIndexRange={[20, 10]}>
          <div className="key rounded-[12px] px-3 py-2 whitespace-nowrap pointer-events-none">
            <p className="text-[12px] font-medium truncate max-w-[200px]">{node.name}</p>
            <p className="label !text-on-key-dim mt-1.5">
              {node.key} · {Math.round(node.bpm)} BPM
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}
