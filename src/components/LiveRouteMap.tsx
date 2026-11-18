import React, { useState } from 'react';
import { LocateFixed, Navigation } from 'lucide-react';
import { api } from '../lib/api';
import { findIndiaCityCoords } from '../lib/indiaCities';
import type { LiveLocation, RideStatus } from '../types';

interface LiveRouteMapProps {
  rideId: string;
  origin: string;
  destination: string;
  waypoints: string[];
  distanceKm: number;
  rideStatus: RideStatus;
  liveLocation?: LiveLocation;
  canBroadcastLocation: boolean;
  onLocationUpdated?: (loc: LiveLocation) => void;
}

export const LiveRouteMap: React.FC<LiveRouteMapProps> = ({
  rideId,
  origin,
  destination,
  waypoints,
  distanceKm,
  rideStatus,
  liveLocation,
  canBroadcastLocation,
  onLocationUpdated,
}) => {
  const [updating, setUpdating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  const stops = waypoints.length >= 2 ? waypoints : [origin, destination];
  const progress = liveLocation?.progressPct ?? 0;

  const pushLocation = async (payload: Partial<LiveLocation>) => {
    setUpdating(true);
    setGpsStatus(null);
    try {
      const res = await api.updateRideLocation(rideId, payload);
      onLocationUpdated?.(res.liveLocation);
    } catch (err) {
      setGpsStatus(err instanceof Error ? err.message : 'Location update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleBrowserGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Browser geolocation is unavailable.');
      return;
    }
    setUpdating(true);
    setGpsStatus('Fetching GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const nextPct = Math.min(95, Math.max(progress, progress + 12));
        await pushLocation({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
          speedKmh: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 58,
          progressPct: nextPct,
        });
        setGpsStatus('Live GPS coordinates broadcast.');
      },
      () => {
        setUpdating(false);
        setGpsStatus('Location permission denied or unavailable.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Compute SVG corridor coordinates
  const svgWidth = 520;
  const svgHeight = 140;
  const padX = 42;
  const usableWidth = svgWidth - padX * 2;
  const points = stops.map((stop, idx) => {
    const ratio = stops.length === 1 ? 0 : idx / (stops.length - 1);
    const x = padX + ratio * usableWidth;
    const y = 70 + Math.sin(ratio * Math.PI * 1.4) * 20 - (idx % 2 === 0 ? 6 : -6);
    return { stop, x, y, ratio };
  });

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  // Interpolate vehicle position along polyline segments
  const norm = Math.max(0, Math.min(1, progress / 100));
  const segFloat = norm * Math.max(1, points.length - 1);
  const segIdx = Math.min(points.length - 2, Math.floor(segFloat));
  const segT = segFloat - segIdx;
  const pA = points[segIdx] ?? points[0];
  const pB = points[segIdx + 1] ?? points[points.length - 1];
  const vehicleX = pA.x + (pB.x - pA.x) * segT;
  const vehicleY = pA.y + (pB.y - pA.y) * segT;

  const remainingKm = Math.max(0, Math.round(distanceKm * (1 - progress / 100)));

  return (
    <div className="border border-slate-200 rounded-xl bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-amber-600 shrink-0" />
          <h3 className="text-sm font-bold text-slate-900">Live Route Tracking</h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-600 tabular-nums">
          <span>{rideStatus === 'in_progress' ? 'En Route' : rideStatus === 'completed' ? 'Arrived' : 'Scheduled'}</span>
          <span aria-hidden="true">·</span>
          <span>{remainingKm} km left</span>
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-2 overflow-hidden">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-32 block" role="img" aria-label={`Live route from ${origin} to ${destination}`}>
          <defs>
            <linearGradient id={`routeGrad-${rideId}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>

          {/* Subtle highway grid lines */}
          <line x1="16" y1="35" x2={svgWidth - 16} y2="35" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 4" />
          <line x1="16" y1="105" x2={svgWidth - 16} y2="105" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 4" />

          {/* Base highway path */}
          <path d={pathD} fill="none" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Active progress overlay */}
          <path
            d={pathD}
            fill="none"
            stroke={`url(#routeGrad-${rideId})`}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={100}
            strokeDasharray={`${progress} 100`}
          />

          {/* Waypoint nodes */}
          {points.map((pt, idx) => {
            const passed = pt.ratio * 100 <= progress;
            return (
              <g key={pt.stop}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={idx === 0 || idx === points.length - 1 ? 6 : 4}
                  fill={passed ? '#0f172a' : '#ffffff'}
                  stroke={passed ? '#0f172a' : '#64748b'}
                  strokeWidth="2"
                />
                <text
                  x={pt.x}
                  y={idx % 2 === 0 ? pt.y - 14 : pt.y + 22}
                  textAnchor="middle"
                  className="fill-slate-700 text-[10px] font-semibold"
                >
                  {pt.stop.length > 16 ? `${pt.stop.slice(0, 14)}…` : pt.stop}
                </text>
              </g>
            );
          })}

          {/* Live vehicle marker */}
          <g transform={`translate(${vehicleX}, ${vehicleY})`}>
            <circle r="11" fill="#f59e0b" fillOpacity="0.25" />
            <circle r="6.5" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" />
          </g>
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs border-t border-slate-100 pt-2.5">
        <div>
          <p className="text-slate-500">Current Zone</p>
          <p className="font-semibold text-slate-900 truncate">{liveLocation?.currentCity ?? origin}</p>
        </div>
        <div>
          <p className="text-slate-500">GPS Coordinates</p>
          <p className="font-mono text-slate-900 tabular-nums">
            {liveLocation
              ? `${liveLocation.lat.toFixed(3)}, ${liveLocation.lng.toFixed(3)}`
              : `${findIndiaCityCoords(origin).lat.toFixed(3)}, ${findIndiaCityCoords(origin).lng.toFixed(3)}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-slate-500">Speed / Progress</p>
          <p className="font-mono font-semibold text-slate-900 tabular-nums">
            {liveLocation?.speedKmh ?? 0} km/h · {progress}%
          </p>
        </div>
      </div>

      {canBroadcastLocation && (
        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`progress-${rideId}`} className="text-xs font-medium text-slate-600">
              Broadcast Highway Progress ({progress}%)
            </label>
            <button
              type="button"
              disabled={updating}
              onClick={handleBrowserGps}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors"
            >
              <LocateFixed className="w-3.5 h-3.5 text-amber-600" />
              <span>Share My GPS</span>
            </button>
          </div>
          <input
            id={`progress-${rideId}`}
            type="range"
            min={0}
            max={100}
            step={5}
            value={progress}
            disabled={updating}
            onChange={(e) => {
              const nextPct = Number(e.target.value);
              const idx = Math.min(stops.length - 1, Math.floor((nextPct / 100) * (stops.length - 1)));
              const oCoords = findIndiaCityCoords(origin);
              const dCoords = findIndiaCityCoords(destination);
              void pushLocation({
                progressPct: nextPct,
                currentCity: stops[idx],
                speedKmh: nextPct === 0 || nextPct === 100 ? 0 : 64,
                lat: oCoords.lat + (nextPct / 100) * (dCoords.lat - oCoords.lat),
                lng: oCoords.lng + (nextPct / 100) * (dCoords.lng - oCoords.lng),
              });
            }}
            className="w-full accent-amber-500 cursor-pointer"
          />
          {gpsStatus && <p className="text-xs text-slate-600">{gpsStatus}</p>}
        </div>
      )}
    </div>
  );
};
