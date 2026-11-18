import React from 'react';
import { ArrowRight, Lock, MessageSquare, Unlock } from 'lucide-react';
import type { Booking, Ride, UserProfile } from '../types';

interface MyTripsViewProps {
  currentUser: UserProfile | null;
  bookings: Booking[];
  publishedRides: Ride[];
  onRequireAuth: () => void;
  onOpenBooking: (bookingId: string) => void;
  onExploreRides: () => void;
}

export const MyTripsView: React.FC<MyTripsViewProps> = ({
  currentUser,
  bookings,
  publishedRides,
  onRequireAuth,
  onOpenBooking,
  onExploreRides,
}) => {
  if (!currentUser) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Your Rides & Price Negotiations</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Sign in with your mobile number and OTP to view booked seats, active fare chats, unlocked contacts, and trip
          reviews.
        </p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
        >
          Sign In with Mobile OTP
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">My Trips & Active Negotiations</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Signed in as <span className="font-semibold text-slate-900">{currentUser.name}</span> (+91{' '}
            <span className="font-mono">{currentUser.mobile}</span>) · Driver Rating:{' '}
            <span className="font-mono">{currentUser.driverRating || 'New'}</span> · Rider Rating:{' '}
            <span className="font-mono">{currentUser.riderRating || 'New'}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onExploreRides}
          className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800"
        >
          Find More Rides
        </button>
      </div>

      {/* Bookings & Chat Rooms */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">Bookings & Observed Price Chats ({bookings.length})</h2>
        {bookings.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-900">No seat requests or bookings yet</p>
            <p className="text-xs text-slate-600">
              Search a route like Jalgaon → Pune and book seats or propose a discount offer to start negotiating.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {bookings.map((b) => {
              const isDriver = b.driverId === currentUser.id;
              return (
                <div
                  key={b.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                      <span>{b.rideOrigin}</span>
                      <ArrowRight className="w-4 h-4 text-amber-600" />
                      <span>{b.rideDestination}</span>
                      <span className="text-xs font-mono font-medium text-slate-500 ml-2">
                        {b.seatsBooked} {b.seatsBooked === 1 ? 'seat' : 'seats'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-mono tabular-nums">
                      {b.rideDepartureDate} at {b.rideDepartureTime} · Role: {isDriver ? 'Driver' : 'Rider'} ·{' '}
                      {isDriver ? `Rider: ${b.riderName}` : `Driver: ${b.driverName}`}
                    </p>
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-600 tabular-nums">
                      <span>
                        Fare: ₹{b.agreedPricePerSeat ?? b.currentOfferPerSeat}/seat · Total ₹{b.totalPayable.toFixed(2)}{' '}
                        (incl. 1.5% fee)
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                        {b.paymentStatus === 'paid' ? (
                          <>
                            <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Paid · Contacts Unlocked</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            <span>{b.status === 'price_agreed' ? 'Price Agreed · Ready to Pay' : 'Negotiating'}</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenBooking(b.id)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-2 shrink-0"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Open Chat, Pay & Live Map</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Driver's Published Rides */}
      {publishedRides.length > 0 && (
        <section className="space-y-3 pt-4 border-t border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Rides You Published ({publishedRides.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publishedRides.map((ride) => (
              <div key={ride.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">
                    {ride.origin} → {ride.destination}
                  </p>
                  <span className="text-xs font-mono font-semibold text-slate-600">{ride.status}</span>
                </div>
                <p className="text-xs text-slate-600 font-mono tabular-nums">
                  {ride.departureDate} at {ride.departureTime} · {ride.availableSeats}/{ride.totalSeats} seats left · ₹
                  {ride.basePricePerSeat}/seat
                </p>
                <p className="text-xs text-slate-500">
                  {ride.pickupPoint} → {ride.dropPoint}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
