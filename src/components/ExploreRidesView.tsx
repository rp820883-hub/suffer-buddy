import React, { useState } from 'react';
import { ArrowRight, Calendar, MapPin, Navigation, Search, Shield, Star, Users } from 'lucide-react';
import { INDIA_CITIES } from '../lib/indiaCities';
import type { Review, Ride, UserProfile } from '../types';
import { LiveRouteMap } from './LiveRouteMap';

interface ExploreRidesViewProps {
  rides: Ride[];
  reviews: Review[];
  currentUser: UserProfile | null;
  loading: boolean;
  onSearch: (filters: { origin: string; destination: string; minSeats: number; date: string }) => void;
  onBookOrNegotiate: (ride: Ride, seats: number, offerPricePerSeat?: number) => Promise<void>;
  onOpenOfferRide: () => void;
  onOpenAlertModal: (origin: string, destination: string) => void;
}

const POPULAR_CORRIDORS = [
  { label: 'All India', origin: '', destination: '' },
  { label: 'Jalgaon → Pune', origin: 'Jalgaon', destination: 'Pune' },
  { label: 'New Delhi → Jaipur', origin: 'New Delhi', destination: 'Jaipur' },
  { label: 'Bengaluru → Mysuru', origin: 'Bengaluru', destination: 'Mysuru' },
  { label: 'Mumbai → Surat', origin: 'Mumbai', destination: 'Surat' },
  { label: 'Hyderabad → Vijayawada', origin: 'Hyderabad', destination: 'Vijayawada' },
  { label: 'Kolkata → Siliguri', origin: 'Kolkata', destination: 'Siliguri' },
];

export const ExploreRidesView: React.FC<ExploreRidesViewProps> = ({
  rides,
  reviews,
  currentUser,
  loading,
  onSearch,
  onBookOrNegotiate,
  onOpenOfferRide,
  onOpenAlertModal,
}) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [minSeats, setMinSeats] = useState(1);
  const [date, setDate] = useState('');
  const [selectedSeatsMap, setSelectedSeatsMap] = useState<Record<string, number>>({});
  const [offerMap, setOfferMap] = useState<Record<string, string>>({});
  const [submittingRideId, setSubmittingRideId] = useState<string | null>(null);
  const [expandedRouteRideId, setExpandedRouteRideId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ origin, destination, minSeats, date });
  };

  const handleSelectCorridor = (o: string, d: string) => {
    setOrigin(o);
    setDestination(d);
    onSearch({ origin: o, destination: d, minSeats, date });
  };

  const handleResetFilters = () => {
    setOrigin('');
    setDestination('');
    setMinSeats(1);
    setDate('');
    onSearch({ origin: '', destination: '', minSeats: 1, date: '' });
  };

  const triggerBooking = async (ride: Ride, negotiate: boolean) => {
    setActionError(null);
    const seats = selectedSeatsMap[ride.id] ?? Math.min(minSeats, ride.availableSeats);
    const rawOffer = offerMap[ride.id];
    const parsedOffer = negotiate && rawOffer ? Number(rawOffer) : undefined;
    setSubmittingRideId(ride.id);
    try {
      await onBookOrNegotiate(ride, seats, parsedOffer);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to create booking request.');
    } finally {
      setSubmittingRideId(null);
    }
  };

  return (
    <div className="space-y-12">
      <datalist id="india-cities-list">
        {INDIA_CITIES.map((c) => (
          <option key={`${c.name}-${c.state}`} value={c.name}>
            {c.name}, {c.state}
          </option>
        ))}
      </datalist>

      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between bg-white border border-slate-200 rounded-2xl p-7 sm:p-9">
          <div className="space-y-4">
            <p className="text-xs font-semibold text-amber-700 tracking-wide">
              Available Across All Indian States & Routes · Free with +91 Mobile OTP
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-slate-900 leading-[1.15] tracking-tight text-balance">
              Share intercity seats anywhere in India. Agree on a fair fare.
            </h1>
            <p className="text-base text-slate-600 max-w-2xl leading-relaxed">
              Traveling from Jalgaon to Pune, Delhi to Jaipur, Bengaluru to Mysuru, or any town across India? List open
              seats or book together, negotiate discounts safely in observed chat, pay with a flat 1.5% platform fee, and
              unlock verified contacts immediately.
            </p>
          </div>

          <form onSubmit={handleSubmitSearch} className="mt-8 pt-6 border-t border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label htmlFor="search-origin" className="block text-xs font-semibold text-slate-700 mb-1">
                  Leaving From (Any City)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="search-origin"
                    type="text"
                    list="india-cities-list"
                    placeholder="e.g. Jalgaon, Delhi..."
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="search-dest" className="block text-xs font-semibold text-slate-700 mb-1">
                  Going To (Any City)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-amber-600 absolute left-3 top-3" />
                  <input
                    id="search-dest"
                    type="text"
                    list="india-cities-list"
                    placeholder="e.g. Pune, Jaipur..."
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="search-seats" className="block text-xs font-semibold text-slate-700 mb-1">
                  Seats Needed
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    id="search-seats"
                    value={minSeats}
                    onChange={(e) => setMinSeats(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2.5 text-sm font-mono border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-slate-900"
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'seat' : 'seats'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="search-date" className="block text-xs font-semibold text-slate-700 mb-1">
                  Travel Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="search-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm font-mono border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Search className="w-4 h-4" />
                  <span>Find Available Seats</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors whitespace-nowrap shrink-0"
                >
                  All India Routes
                </button>
              </div>
              <button
                type="button"
                onClick={onOpenOfferRide}
                className="text-sm font-semibold text-slate-900 hover:text-amber-700 underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                Driving any route in India? Offer seats
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-slate-200 min-h-[260px] bg-slate-900">
          <img
            src="/src/assets/images/hero_highway_corridor_1794965960334.jpg"
            alt="Sedan cruising along an Indian intercity expressway"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent flex flex-col justify-end p-6 text-white">
            <p className="text-xs font-medium text-amber-300">
              All 28 States & 8 Union Territories · Every Indian Highway Corridor
            </p>
            <p className="text-lg font-bold mt-1">
              1.5% flat platform fee · Contacts unlock after checkout
            </p>
          </div>
        </div>
      </section>

      {/* Available Rides Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {origin && destination
                ? `Available Rides: ${origin} to ${destination}`
                : 'Active Rides Across India'}
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Negotiate seat fares in monitored chat. Mobile numbers stay private until payment + 1.5% fee clears.
            </p>
          </div>
          {origin && destination && (
            <button
              type="button"
              onClick={() => onOpenAlertModal(origin, destination)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Notify Me for {origin} → {destination}
            </button>
          )}
        </div>

        {/* Interactive Corridor Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {POPULAR_CORRIDORS.map((c) => {
            const isActive =
              origin.trim().toLowerCase() === c.origin.toLowerCase() &&
              destination.trim().toLowerCase() === c.destination.toLowerCase();
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => handleSelectCorridor(c.origin, c.destination)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {actionError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
            {actionError}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-36 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : rides.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
            <p className="text-base font-bold text-slate-900">No rides currently match your route filter</p>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Create an automated route alert for {origin || 'your origin'} → {destination || 'your destination'} and we
              will notify you the moment a driver posts seats.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenAlertModal(origin || 'Jalgaon', destination || 'Pune')}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
              >
                Create Route Alert
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
              >
                View All India Rides
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {rides.map((ride) => {
              const seats = selectedSeatsMap[ride.id] ?? Math.min(Math.max(1, minSeats), ride.availableSeats);
              const isOwnRide = currentUser?.id === ride.driverId;
              const defaultOffer = Math.max(ride.minAcceptablePrice, Math.round(ride.basePricePerSeat * 0.9));
              const offerVal = offerMap[ride.id] ?? String(defaultOffer);
              const subtotal = seats * ride.basePricePerSeat;
              const fee = Math.round(subtotal * 0.015 * 100) / 100;

              return (
                <article
                  key={ride.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 transition-colors hover:border-slate-300"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* Route & Schedule */}
                    <div className="lg:col-span-5 space-y-2.5">
                      <div className="flex items-center gap-2.5 text-lg font-bold text-slate-900">
                        <span>{ride.origin}</span>
                        <ArrowRight className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{ride.destination}</span>
                      </div>
                      <div className="text-xs text-slate-600 space-y-1">
                        <p>
                          <span className="font-semibold text-slate-800">Route stops:</span>{' '}
                          {(ride.waypoints.length >= 2 ? ride.waypoints : [ride.origin, ride.destination]).join(' → ')}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Pickup:</span> {ride.pickupPoint}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Drop:</span> {ride.dropPoint}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums pt-1">
                        <span>{ride.departureDate}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-800">{ride.departureTime}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ride.distanceKm} km</span>
                        <span aria-hidden="true">·</span>
                        <span>{ride.estimatedDuration}</span>
                        <span aria-hidden="true">·</span>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRouteRideId((prev) => (prev === ride.id ? null : ride.id))
                          }
                          className="inline-flex items-center gap-1 font-sans font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-4"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>{expandedRouteRideId === ride.id ? 'Hide Route' : 'See Route'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Buddy (Driver) & Vehicle Model Only */}
                    <div className="lg:col-span-3 space-y-1.5 lg:border-l lg:border-slate-100 lg:pl-5">
                      <p className="text-sm font-bold text-slate-900">{ride.driverName} · Buddy</p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono tabular-nums">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="font-semibold text-slate-900">
                          {ride.driverRating > 0 ? ride.driverRating.toFixed(1) : 'New'}
                        </span>
                        <span>({ride.driverReviewCount} reviews)</span>
                      </div>
                      <p className="text-xs font-medium text-slate-800">{ride.vehicleModel}</p>
                      <p className="text-[11px] text-slate-500">
                        Plate &amp; mobile unlock after payment
                      </p>
                      <p className="text-xs font-medium text-emerald-700 font-mono tabular-nums">
                        {ride.availableSeats} of {ride.totalSeats} seats open ·{' '}
                        {ride.negotiable ? 'Discuss payable in chat' : 'Fixed fare'}
                      </p>
                    </div>

                    {/* Seat Selector, Discount Offer & Book CTA */}
                    <div className="lg:col-span-4 lg:border-l lg:border-slate-100 lg:pl-5 space-y-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <div>
                          <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                            ₹{ride.basePricePerSeat}
                          </span>
                          <span className="text-xs text-slate-500 ml-1">/ seat</span>
                        </div>
                        <span className="text-xs font-mono text-slate-500 tabular-nums">
                          +1.5% fee (₹{fee.toFixed(2)} for {seats})
                        </span>
                      </div>

                      {!isOwnRide ? (
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-medium text-slate-500 mb-1">Seats</label>
                              <select
                                value={seats}
                                onChange={(e) =>
                                  setSelectedSeatsMap((prev) => ({ ...prev, [ride.id]: Number(e.target.value) }))
                                }
                                className="w-full px-2.5 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                              >
                                {Array.from({ length: ride.availableSeats }, (_, idx) => idx + 1).map((n) => (
                                  <option key={n} value={n}>
                                    {n} {n === 1 ? 'seat' : 'seats'}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {ride.negotiable && (
                              <div>
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                  Offer ₹/seat
                                </label>
                                <input
                                  type="number"
                                  min={50}
                                  max={ride.basePricePerSeat}
                                  value={offerVal}
                                  onChange={(e) =>
                                    setOfferMap((prev) => ({ ...prev, [ride.id]: e.target.value }))
                                  }
                                  className="w-full px-2.5 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {ride.negotiable && (
                              <button
                                type="button"
                                disabled={submittingRideId === ride.id}
                                onClick={() => triggerBooking(ride, true)}
                                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-900 text-slate-900 hover:bg-slate-50 text-xs font-bold transition-colors whitespace-nowrap"
                              >
                                Negotiate ₹{offerVal}
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={submittingRideId === ride.id}
                              onClick={() => triggerBooking(ride, false)}
                              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors whitespace-nowrap"
                            >
                              {submittingRideId === ride.id ? 'Opening...' : `Book ₹${subtotal}`}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-slate-500 py-2">
                          Your published ride · Manage requests in My Trips
                        </p>
                      )}
                    </div>
                  </div>

                  {expandedRouteRideId === ride.id && (
                    <div className="mt-5 pt-5 border-t border-slate-200 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
                        <span>
                          <span className="font-semibold text-slate-900">Decided Route by Buddy:</span>{' '}
                          {(ride.waypoints.length >= 2 ? ride.waypoints : [ride.origin, ride.destination]).join(' → ')}
                        </span>
                        <span className="text-slate-500">
                          Pickup &amp; drop stops can be fine-tuned with Buddy in chat before payment
                        </span>
                      </div>
                      <LiveRouteMap
                        rideId={ride.id}
                        origin={ride.origin}
                        destination={ride.destination}
                        waypoints={ride.waypoints}
                        distanceKm={ride.distanceKm}
                        rideStatus={ride.status}
                        liveLocation={ride.liveLocation}
                        canBroadcastLocation={false}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Safety, 1.5% Fee Transparency & Mutual Reviews */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-4 border-t border-slate-200">
        <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-slate-200 bg-white flex flex-col">
          <img
            src="/src/assets/images/carpool_cabin_interior_1794965959105.jpg"
            alt="Tidy carpool cabin interior during daytime intercity ride"
            referrerPolicy="no-referrer"
            className="w-full h-56 object-cover"
          />
          <div className="p-6 space-y-3 flex-1">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <h2>Observed Chat & Contact Privacy</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every price discussion happens inside our safety-monitored chat room. Phone numbers and UPI links are
              automatically blocked during negotiation. Once both travelers agree on a fair seat price and complete
              payment with the 1.5% platform fee, verified mobile numbers unlock instantly for pickup coordination.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-bold text-slate-900">Verified Driver & Rider Reviews</h2>
            <span className="text-xs text-slate-500">Mutual post-trip ratings</span>
          </div>

          <div className="divide-y divide-slate-100">
            {reviews.slice(0, 4).map((rev) => (
              <div key={rev.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-600">
                    <span className="font-bold text-slate-900">{rev.fromUserName}</span>
                    <span className="mx-1.5">·</span>
                    <span>Rated {rev.toRole}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-900">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{rev.rating}.0</span>
                  </div>
                </div>
                {rev.comment && <p className="text-sm text-slate-700 leading-relaxed">{rev.comment}</p>}
                {rev.tags.length > 0 && <p className="text-xs text-slate-500">{rev.tags.join(' · ')}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
