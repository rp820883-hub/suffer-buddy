import React, { useMemo, useState } from 'react';
import { ArrowRight, BellRing, Car, CheckCircle2, MapPin, Shield } from 'lucide-react';
import { api } from '../lib/api';
import { INDIA_CITIES } from '../lib/indiaCities';
import type { Ride, UserProfile } from '../types';

interface OfferRideViewProps {
  currentUser: UserProfile | null;
  onRequireAuth: () => void;
  onRidePublished: (ride: Ride, matchedAlertsCount: number) => void;
}

export const OfferRideView: React.FC<OfferRideViewProps> = ({
  currentUser,
  onRequireAuth,
  onRidePublished,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [waypointsInput, setWaypointsInput] = useState('');
  const [pickupPoint, setPickupPoint] = useState('');
  const [dropPoint, setDropPoint] = useState('');
  const [departureDate, setDepartureDate] = useState(today);
  const [departureTime, setDepartureTime] = useState('07:30');
  const [totalSeats, setTotalSeats] = useState(3);
  const [basePricePerSeat, setBasePricePerSeat] = useState(750);
  const [negotiable, setNegotiable] = useState(true);
  const [minAcceptablePrice, setMinAcceptablePrice] = useState(600);
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const feePerSeat = Math.round(basePricePerSeat * 0.015 * 100) / 100;

  const decidedStops = useMemo(() => {
    const mid = waypointsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const list: string[] = [];
    if (origin.trim()) list.push(origin.trim());
    for (const stop of mid) {
      if (
        stop.toLowerCase() !== origin.trim().toLowerCase() &&
        stop.toLowerCase() !== destination.trim().toLowerCase()
      ) {
        list.push(stop);
      }
    }
    if (destination.trim()) list.push(destination.trim());
    return list;
  }, [origin, destination, waypointsInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const customStops = waypointsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await api.createRide({
        origin,
        destination,
        pickupPoint,
        dropPoint,
        departureDate,
        departureTime,
        totalSeats,
        basePricePerSeat,
        negotiable,
        minAcceptablePrice: negotiable ? minAcceptablePrice : basePricePerSeat,
        waypoints: customStops.length > 0 ? customStops : undefined,
        vehicleModel,
        vehicleNumber,
      });
      onRidePublished(res.ride, res.matchedAlertsCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish ride');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <datalist id="india-offer-cities">
        {INDIA_CITIES.map((c) => (
          <option key={`${c.name}-${c.state}`} value={c.name}>
            {c.name}, {c.state}
          </option>
        ))}
      </datalist>

      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-900">Decide Route &amp; Publish Ride</h1>
          <p className="text-sm text-slate-600">
            Buddy (Driver) defines the highway route, stops, pickup/drop landmarks, and seats first. Riders see your
            full route before booking and can refine stops together in chat.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="offer-origin" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Origin City / Town
              </label>
              <input
                id="offer-origin"
                type="text"
                list="india-offer-cities"
                placeholder="e.g. Jalgaon, New Delhi, Bengaluru..."
                required
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label htmlFor="offer-dest" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Destination City / Town
              </label>
              <input
                id="offer-dest"
                type="text"
                list="india-offer-cities"
                placeholder="e.g. Pune, Jaipur, Mysuru..."
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div>
            <label htmlFor="offer-waypoints" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Highway Waypoints / Stops En Route (Optional, comma-separated)
            </label>
            <input
              id="offer-waypoints"
              type="text"
              placeholder="e.g. Chalisgaon, Chhatrapati Sambhajinagar, Ahilyanagar"
              value={waypointsInput}
              onChange={(e) => setWaypointsInput(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
            />
            {decidedStops.length >= 2 && (
              <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-1.5 text-xs text-slate-800">
                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mr-1" />
                <span className="font-semibold">Decided Route Preview:</span>
                {decidedStops.map((stop, idx) => (
                  <React.Fragment key={`${stop}-${idx}`}>
                    <span className="font-medium">{stop}</span>
                    {idx < decidedStops.length - 1 && <ArrowRight className="w-3 h-3 text-slate-400" />}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="offer-pickup" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pickup Landmark
              </label>
              <input
                id="offer-pickup"
                type="text"
                placeholder="e.g. Railway Station / Highway Toll Plaza"
                required
                value={pickupPoint}
                onChange={(e) => setPickupPoint(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label htmlFor="offer-drop" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Drop Landmark
              </label>
              <input
                id="offer-drop"
                type="text"
                placeholder="e.g. Main Bus Stand / Metro Junction"
                required
                value={dropPoint}
                onChange={(e) => setDropPoint(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="offer-date" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Departure Date
              </label>
              <input
                id="offer-date"
                type="date"
                required
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label htmlFor="offer-time" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Departure Time
              </label>
              <input
                id="offer-time"
                type="time"
                required
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label htmlFor="offer-seats" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Available Seats
              </label>
              <select
                id="offer-seats"
                value={totalSeats}
                onChange={(e) => setTotalSeats(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-slate-900"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'seat' : 'seats'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label htmlFor="offer-price" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Listed Price per Seat (₹)
              </label>
              <input
                id="offer-price"
                type="number"
                min={50}
                required
                value={basePricePerSeat}
                onChange={(e) => setBasePricePerSeat(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm font-mono font-bold border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label htmlFor="offer-min-price" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Suggested Floor for Compromise (₹)
              </label>
              <input
                id="offer-min-price"
                type="number"
                min={50}
                max={basePricePerSeat}
                disabled={!negotiable}
                value={minAcceptablePrice}
                onChange={(e) => setMinAcceptablePrice(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-xl disabled:bg-slate-100 focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={negotiable}
              onChange={(e) => setNegotiable(e.target.checked)}
              className="w-4 h-4 accent-slate-900 rounded"
            />
            <span>Allow riders to negotiate and propose fair seat discounts in observed chat</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label htmlFor="offer-vehicle" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Vehicle Name &amp; Model (Visible Before Payment)
              </label>
              <input
                id="offer-vehicle"
                type="text"
                required
                placeholder="e.g. Maruti Swift · White"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label htmlFor="offer-plate" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Registration Plate (Hidden Until Paid)
              </label>
              <input
                id="offer-plate"
                type="text"
                required
                placeholder="e.g. MH 19 AB 1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 text-sm font-mono uppercase border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold transition-colors inline-flex items-center justify-center gap-2"
          >
            <Car className="w-4 h-4" />
            <span>
              {submitting
                ? 'Publishing Ride...'
                : currentUser
                ? 'Publish Ride & Notify Riders'
                : 'Sign In via Mobile OTP to Publish'}
            </span>
          </button>
        </form>
      </div>

      <aside className="lg:col-span-4 space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Shield className="w-4 h-4 text-emerald-600" />
            <h2>Buddy Route &amp; Payout Protection</h2>
          </div>
          <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Riders see your vehicle name/model and full route stops before booking, while your mobile number and
                registration plate unlock only after the rider pays the agreed fare +{' '}
                <strong className="text-slate-900">1.5% platform fee</strong> (₹{feePerSeat.toFixed(2)}/seat at ₹
                {basePricePerSeat}).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                You and the rider can agree on exact highway pickup/drop stops in observed chat before payment.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <BellRing className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Publishing automatically notifies riders subscribed to {origin || 'your'} → {destination || 'route'}{' '}
                alerts.
              </span>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
};
