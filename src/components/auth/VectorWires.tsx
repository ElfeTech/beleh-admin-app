import React, { useId, useMemo } from 'react';
import { motion } from 'framer-motion';

const WIRES = [
  { d: 'M -40 820 C 180 640, 320 900, 520 620 S 820 280, 1080 120', delay: 0 },
  { d: 'M -20 640 C 220 480, 380 720, 580 480 S 860 200, 1100 80', delay: 0.8 },
  { d: 'M 40 980 C 260 760, 420 980, 640 700 S 900 360, 1120 220', delay: 1.4 },
  { d: 'M -60 400 C 160 260, 300 520, 500 300 S 780 80, 1060 -20', delay: 0.3 },
  { d: 'M 120 1100 C 340 880, 500 1040, 720 780 S 980 420, 1160 260', delay: 2 },
  { d: 'M -80 200 C 120 80, 280 360, 460 180 S 760 -40, 1040 -100', delay: 1.1 },
];

const CROSS = [
  { d: 'M -100 100 C 200 300, 400 100, 700 400 S 1000 200, 1200 500', delay: 0.5 },
  { d: 'M -100 500 C 250 700, 450 500, 750 800 S 1050 600, 1200 900', delay: 1.7 },
  { d: 'M 0 -50 C 250 150, 450 -50, 700 250 S 950 50, 1200 350', delay: 2.4 },
];

function TravelDot({ pathId, delay, color }: { pathId: string; delay: number; color: string }) {
  return (
    <circle r="3.5" fill={color} filter="url(#wireGlow)">
      <animateMotion dur="8s" begin={`${delay}s`} repeatCount="indefinite" rotate="auto">
        <mpath href={`#${pathId}`} />
      </animateMotion>
      <animate
        attributeName="opacity"
        values="0;1;1;0"
        keyTimes="0;0.1;0.85;1"
        dur="8s"
        begin={`${delay}s`}
        repeatCount="indefinite"
      />
    </circle>
  );
}

const VectorWires: React.FC = () => {
  const uid = useId().replace(/:/g, '');
  const paths = useMemo(
    () =>
      [...WIRES, ...CROSS].map((w, i) => ({
        ...w,
        id: `${uid}-p${i}`,
        secondary: i >= WIRES.length,
      })),
    [uid],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(13,148,136,0.12),_transparent_55%)]" />
      <svg className="h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="wireGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={`${uid}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {paths.map((p) => (
          <g key={p.id}>
            <path
              id={p.id}
              d={p.d}
              fill="none"
              stroke="rgba(148,163,184,0.08)"
              strokeWidth={p.secondary ? 1 : 1.5}
            />
            <motion.path
              d={p.d}
              fill="none"
              stroke={`url(#${uid}-grad)`}
              strokeWidth={p.secondary ? 0.8 : 1.4}
              strokeLinecap="round"
              filter="url(#wireGlow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 1, 0.2, 1, 0],
                opacity: [0, 0.7, 0.35, 0.8, 0],
              }}
              transition={{
                duration: 14 + (p.delay % 3),
                repeat: Infinity,
                ease: 'easeInOut',
                delay: p.delay,
              }}
            />
            <TravelDot
              pathId={p.id}
              delay={p.delay + 1}
              color={p.secondary ? '#38bdf8' : '#2dd4bf'}
            />
            <TravelDot
              pathId={p.id}
              delay={p.delay + 4.5}
              color={p.secondary ? '#5eead4' : '#7dd3fc'}
            />
          </g>
        ))}

        {/* Node hubs */}
        {[
          [220, 480],
          [500, 360],
          [720, 520],
          [380, 700],
          [640, 220],
        ].map(([cx, cy], i) => (
          <motion.circle
            key={i}
            cx={cx}
            cy={cy}
            r={4}
            fill="#2dd4bf"
            initial={{ opacity: 0.2, scale: 0.8 }}
            animate={{ opacity: [0.25, 0.9, 0.25], scale: [0.85, 1.15, 0.85] }}
            transition={{ duration: 3.5 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
            filter="url(#wireGlow)"
          />
        ))}
      </svg>
    </div>
  );
};

export default VectorWires;
