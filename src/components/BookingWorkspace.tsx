import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  CreditCard,
  Eye,
  Lock,
  Navigation,
  Phone,
  Send,
  ShieldAlert,
  Star,
  Unlock,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Booking, ChatMessage, Review, SosIncident, UserProfile } from '../types';
import { LiveRouteMap } from './LiveRouteMap';

interface BookingWorkspaceProps {
  bookingId: string;
  currentUser: UserProfile;
  liveBookingPatch?: Booking | null;
  incomingMessage?: ChatMessage | null;
  incomingSos?: SosIncident | null;
  onBack: () => void;
  onBookingUpdated: (booking: Booking) => void;
}

const DRIVER_REVIEW_TAGS = ['Punctual', 'Safe Driving', 'Clean Cabin', 'Fair Price', 'Polite'];
const RIDER_REVIEW_TAGS = ['On Time', 'Courteous', 'Smooth Pickup', 'Fair Negotiation'];

export const BookingWorkspace: React.FC<BookingWorkspaceProps> = ({
  bookingId,
  currentUser,
  liveBookingPatch,
  incomingMessage,
  incomingSos,
  onBack,
  onBookingUpdated,
}) => {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sosIncidents, setSosIncidents] = useState<SosIncident[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState('');
  const [offerInput, setOfferInput] = useState('');
  const [negotiateTab, setNegotiateTab] = useState<'fare' | 'route'>('fare');
  const [pickupInput, setPickupInput] = useState('');
  const [dropInput, setDropInput] = useState('');
  const [waypointsInput, setWaypointsInput] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Review state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [reviewComment, setReviewComment] = useState('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getBookingDetail(bookingId)
      .then((res) => {
        if (!active) return;
        setBooking(res.booking);
        setMessages(res.messages);
        setSosIncidents(res.sosIncidents);
        setReviews(res.reviews);
        setOfferInput(String(res.booking.currentOfferPerSeat));
        setPickupInput(res.booking.routeProposal?.pickupPoint ?? res.booking.ridePickupPoint);
        setDropInput(res.booking.routeProposal?.dropPoint ?? res.booking.rideDropPoint);
        setWaypointsInput(
          (res.booking.routeProposal?.waypoints ?? res.booking.rideWaypoints).join(', ')
        );
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load booking');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookingId]);

  useEffect(() => {
    if (liveBookingPatch && liveBookingPatch.id === bookingId) {
      setBooking(liveBookingPatch);
      if (liveBookingPatch.routeProposal) {
        setPickupInput(liveBookingPatch.routeProposal.pickupPoint);
        setDropInput(liveBookingPatch.routeProposal.dropPoint);
        setWaypointsInput(liveBookingPatch.routeProposal.waypoints.join(', '));
      }
    }
  }, [liveBookingPatch, bookingId]);

  useEffect(() => {
    if (incomingMessage && incomingMessage.bookingId === bookingId) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === incomingMessage.id)) return prev;
        return [...prev, incomingMessage];
      });
    }
  }, [incomingMessage, bookingId]);

  useEffect(() => {
    if (incomingSos && incomingSos.bookingId === bookingId) {
      setSosIncidents((prev) => {
        const existingIdx = prev.findIndex((s) => s.id === incomingSos.id);
        if (existingIdx >= 0) {
          const clone = [...prev];
          clone[existingIdx] = incomingSos;
          return clone;
        }
        return [incomingSos, ...prev];
      });
    }
  }, [incomingSos, bookingId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (loading) {
    return <div className="h-96 rounded-2xl bg-white border border-slate-200 animate-pulse" />;
  }

  if (error || !booking) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-3">
        <p className="text-sm font-semibold text-red-700">{error || 'Booking not found'}</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800"
        >
          Back to My Trips
        </button>
      </div>
    );
  }

  const isDriver = currentUser.id === booking.driverId;
  const isRider = currentUser.id === booking.riderId;
  const myRole: 'driver' | 'rider' = isDriver ? 'driver' : 'rider';
  const canAcceptCurrentOffer =
    booking.paymentStatus === 'unpaid' &&
    booking.agreedPricePerSeat === null &&
    booking.offerProposedBy !== null &&
    booking.offerProposedBy !== myRole;

  const canPayNow =
    isRider &&
    booking.paymentStatus === 'unpaid' &&
    (booking.agreedPricePerSeat !== null || booking.offerProposedBy !== 'rider');

  const alreadyReviewed = isDriver ? booking.driverReviewedRider : booking.riderReviewedDriver;
  const activeSos = sosIncidents.find((s) => s.status === 'active');

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setError(null);
    setBusyAction('chat');
    try {
      const res = await api.sendMessage(booking.id, chatInput);
      setMessages((prev) => (prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]));
      setChatInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message blocked');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSendOffer = async () => {
    const val = Math.round(Number(offerInput));
    if (!val || val < 50) {
      setError('Enter a valid fare per seat (minimum ₹50).');
      return;
    }
    setError(null);
    setBusyAction('offer');
    try {
      const res = await api.sendOffer(booking.id, val);
      setBooking(res.booking);
      onBookingUpdated(res.booking);
      setMessages((prev) => (prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send price offer');
    } finally {
      setBusyAction(null);
    }
  };

  const handleAcceptPrice = async () => {
    setError(null);
    setBusyAction('accept');
    try {
      const res = await api.acceptPrice(booking.id);
      setBooking(res.booking);
      onBookingUpdated(res.booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to accept fare');
    } finally {
      setBusyAction(null);
    }
  };

  const handleProposeRoute = async () => {
    const waypoints = waypointsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!pickupInput.trim() || !dropInput.trim()) {
      setError('Enter both pickup landmark and drop landmark.');
      return;
    }
    if (waypoints.length < 2) {
      setError('Enter at least two route stops separated by commas (e.g. Origin, Stop, Destination).');
      return;
    }
    setError(null);
    setBusyAction('route_offer');
    try {
      const res = await api.proposeRoute(booking.id, {
        pickupPoint: pickupInput.trim(),
        dropPoint: dropInput.trim(),
        waypoints,
      });
      setBooking(res.booking);
      onBookingUpdated(res.booking);
      setMessages((prev) => (prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to propose route update');
    } finally {
      setBusyAction(null);
    }
  };

  const handleAcceptRoute = async () => {
    setError(null);
    setBusyAction('route_accept');
    try {
      const res = await api.acceptRoute(booking.id);
      setBooking(res.booking);
      onBookingUpdated(res.booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm route');
    } finally {
      setBusyAction(null);
    }
  };

  const handlePay = async () => {
    setError(null);
    setBusyAction('pay');
    try {
      const res = await api.payBooking(booking.id);
      setBooking(res.booking);
      onBookingUpdated(res.booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handleTriggerSos = async () => {
    setError(null);
    setBusyAction('sos');
    const sendSos = async (lat?: number, lng?: number) => {
      try {
        const res = await api.triggerSos(booking.id, {
          lat: lat ?? booking.rideLiveLocation?.lat,
          lng: lng ?? booking.rideLiveLocation?.lng,
          locationLabel: booking.rideLiveLocation?.currentCity ?? `${booking.rideOrigin} – ${booking.rideDestination} Corridor`,
        });
        setSosIncidents((prev) => (prev.some((s) => s.id === res.incident.id) ? prev : [res.incident, ...prev]));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to send SOS alert');
      } finally {
        setBusyAction(null);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => void sendSos(pos.coords.latitude, pos.coords.longitude),
        () => void sendSos(),
        { timeout: 3000 }
      );
    } else {
      await sendSos();
    }
  };

  const handleResolveSos = async (incidentId: string) => {
    setBusyAction('resolve_sos');
    try {
      const res = await api.resolveSos(incidentId);
      setSosIncidents((prev) => prev.map((s) => (s.id === incidentId ? res.incident : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resolve SOS');
    } finally {
      setBusyAction(null);
    }
  };

  const handleRideStatusChange = async (status: 'in_progress' | 'completed') => {
    setBusyAction('status');
    setError(null);
    try {
      const res = await api.updateRideStatus(booking.rideId, status);
      setBooking((prev) =>
        prev
          ? {
              ...prev,
              rideStatus: res.ride.status,
              rideLiveLocation: res.ride.liveLocation,
              status: status === 'completed' ? 'completed' : 'active_trip',
            }
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update trip status');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyAction('review');
    setError(null);
    try {
      const res = await api.submitReview(booking.id, {
        rating: reviewRating,
        tags: reviewTags,
        comment: reviewComment,
      });
      setReviews((prev) => [res.review, ...prev]);
      setBooking((prev) =>
        prev
          ? {
              ...prev,
              driverReviewedRider: isDriver ? true : prev.driverReviewedRider,
              riderReviewedDriver: isRider ? true : prev.riderReviewedDriver,
            }
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit review');
    } finally {
      setBusyAction(null);
    }
  };

  const copyText = (val: string) => {
    void navigator.clipboard?.writeText(val);
    setCopiedPhone(val);
    setTimeout(() => setCopiedPhone(null), 1800);
  };

  const tagOptions = isDriver ? RIDER_REVIEW_TAGS : DRIVER_REVIEW_TAGS;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb + SOS Emergency Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            aria-label="Back to trips"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {booking.rideOrigin} → {booking.rideDestination} · {booking.seatsBooked}{' '}
              {booking.seatsBooked === 1 ? 'Seat' : 'Seats'}
            </h1>
            <p className="text-xs text-slate-600 font-mono tabular-nums truncate">
              {booking.rideDepartureDate} at {booking.rideDepartureTime} · Driver: {booking.driverName} · Rider:{' '}
              {booking.riderName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isDriver && booking.paymentStatus === 'paid' && booking.rideStatus === 'scheduled' && (
            <button
              type="button"
              disabled={busyAction === 'status'}
              onClick={() => handleRideStatusChange('in_progress')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors whitespace-nowrap"
            >
              Start Trip
            </button>
          )}
          {isDriver && booking.paymentStatus === 'paid' && booking.rideStatus !== 'completed' && (
            <button
              type="button"
              disabled={busyAction === 'status'}
              onClick={() => handleRideStatusChange('completed')}
              className="px-4 py-2.5 rounded-xl border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition-colors whitespace-nowrap"
            >
              Mark Completed
            </button>
          )}
          <button
            type="button"
            disabled={busyAction === 'sos'}
            onClick={handleTriggerSos}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-2 whitespace-nowrap shadow-xs"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{busyAction === 'sos' ? 'Sending SOS...' : 'SOS Emergency'}</span>
          </button>
        </div>
      </div>

      {activeSos && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-300 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-900">
                Active SOS Emergency Alert · Triggered by {activeSos.triggeredByName}
              </p>
              <p className="text-xs text-red-800 mt-0.5 font-mono tabular-nums">
                Location: {activeSos.locationLabel} ({activeSos.lat.toFixed(4)}, {activeSos.lng.toFixed(4)}) · Shared
                with Suffer Buddy Safety Desk & Emergency Contact
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busyAction === 'resolve_sos'}
            onClick={() => handleResolveSos(activeSos.id)}
            className="px-3.5 py-2 rounded-xl bg-white border border-red-300 text-xs font-bold text-red-800 hover:bg-red-100 transition-colors"
          >
            Mark Safe / Resolved
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: Observed Price Discussion & Ride Coordination Chat */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Rider &amp; Buddy Payment &amp; Route Chat
                </h2>
                <p className="text-xs text-slate-500">
                  Observed by Suffer Buddy Safety Desk · Contact numbers &amp; personal documents blocked until payment
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-700 tabular-nums shrink-0">
              {booking.paymentStatus === 'paid' ? 'Paid · Unlocked' : 'Under Observation'}
            </span>
          </div>

          {/* Chat messages stream */}
          <div className="p-5 space-y-3 h-[400px] overflow-y-auto bg-slate-50/40">
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              if (msg.senderRole === 'moderator' || msg.senderRole === 'system') {
                const isWarning = msg.type === 'moderation_warning';
                const isSos = msg.type === 'sos_alert';
                const isConfirmedMsg =
                  msg.type === 'payment_confirmed' ||
                  msg.type === 'price_accepted' ||
                  msg.type === 'route_accepted';
                return (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      isSos
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : isConfirmedMsg
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : isWarning
                        ? 'bg-amber-50 border-amber-200 text-amber-950'
                        : 'bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold">{msg.senderName}</span>
                      <span className="font-mono text-[11px] opacity-75">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p>{msg.text}</p>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.type === 'price_offer' || msg.type === 'route_offer'
                        ? 'bg-amber-50 border border-amber-300 text-slate-900'
                        : isMe
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[11px] opacity-75 mb-1">
                      <span className="font-semibold">
                        {msg.senderName} ({msg.senderRole})
                      </span>
                      <span className="font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Price & Route Compromise Toolbar (Pre-payment) */}
          {booking.paymentStatus === 'unpaid' && (
            <div className="px-5 py-3.5 border-t border-slate-200 bg-amber-50/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-xl border border-slate-300 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setNegotiateTab('fare')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      negotiateTab === 'fare'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Payable Fare
                  </button>
                  <button
                    type="button"
                    onClick={() => setNegotiateTab('route')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      negotiateTab === 'route'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Route &amp; Stops
                  </button>
                </div>

                {booking.routeProposal ? (
                  <span className="text-[11px] font-semibold text-slate-600">
                    {booking.routeProposal.agreed
                      ? 'Route locked by both'
                      : `Route proposed by ${booking.routeProposal.proposedBy === 'driver' ? 'Buddy' : 'Rider'}`}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">Buddy route active · editable before checkout</span>
                )}
              </div>

              {negotiateTab === 'fare' ? (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-800">
                      Fare Compromise · Listed ₹{booking.originalPricePerSeat}/seat · Current Offer ₹
                      {booking.currentOfferPerSeat}/seat
                    </span>
                    {booking.agreedPricePerSeat !== null ? (
                      <span className="font-bold text-emerald-700 font-mono">
                        Locked at ₹{booking.agreedPricePerSeat}/seat
                      </span>
                    ) : canAcceptCurrentOffer ? (
                      <button
                        type="button"
                        disabled={busyAction === 'accept'}
                        onClick={handleAcceptPrice}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors inline-flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept ₹{booking.currentOfferPerSeat}/seat</span>
                      </button>
                    ) : (
                      <span className="text-slate-500">
                        {booking.offerProposedBy === myRole
                          ? 'Waiting for counterparty to accept or counter'
                          : 'Propose a discount or counter-offer'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden">
                      <span className="px-2.5 py-2 text-xs font-mono text-slate-500 bg-slate-50 border-r border-slate-200">
                        ₹/seat
                      </span>
                      <input
                        type="number"
                        min={50}
                        max={booking.originalPricePerSeat * 2}
                        value={offerInput}
                        onChange={(e) => setOfferInput(e.target.value)}
                        className="w-24 px-2.5 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={busyAction === 'offer'}
                      onClick={handleSendOffer}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      {busyAction === 'offer' ? 'Sending...' : 'Propose Payable Amount'}
                    </button>
                    {Number(offerInput) > 0 && (
                      <span className="text-[11px] font-mono text-slate-600 tabular-nums">
                        = ₹{(Number(offerInput) * booking.seatsBooked).toFixed(0)} ride + ₹
                        {(Number(offerInput) * booking.seatsBooked * 0.015).toFixed(2)} fee (₹
                        {(Number(offerInput) * booking.seatsBooked * 1.015).toFixed(2)} total)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-800">
                      Active Path: {(booking.routeProposal?.waypoints ?? booking.rideWaypoints).join(' → ')}
                    </span>
                    {booking.routeProposal?.agreed ? (
                      <span className="font-bold text-emerald-700">Route Agreed</span>
                    ) : booking.routeProposal && booking.routeProposal.proposedBy !== myRole ? (
                      <button
                        type="button"
                        disabled={busyAction === 'route_accept'}
                        onClick={handleAcceptRoute}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors inline-flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept Proposed Route</span>
                      </button>
                    ) : booking.routeProposal ? (
                      <span className="text-slate-500">Waiting for counterparty to confirm route</span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Pickup landmark"
                      value={pickupInput}
                      onChange={(e) => setPickupInput(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="Drop landmark"
                      value={dropInput}
                      onChange={(e) => setDropInput(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Comma-separated stops (e.g. Jalgaon, Chalisgaon, Nashik, Pune)"
                      value={waypointsInput}
                      onChange={(e) => setWaypointsInput(e.target.value)}
                      className="flex-1 min-w-[220px] px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-slate-900"
                    />
                    <button
                      type="button"
                      disabled={busyAction === 'route_offer'}
                      onClick={handleProposeRoute}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      {busyAction === 'route_offer' ? 'Updating...' : 'Propose Route'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white flex items-center gap-2.5">
            <input
              type="text"
              placeholder={
                booking.paymentStatus === 'unpaid'
                  ? 'Discuss fare or route stops (no contact numbers or personal documents before payment)...'
                  : 'Coordinate pickup landmark or live arrival updates...'
              }
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
            />
            <button
              type="submit"
              disabled={busyAction === 'chat' || !chatInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>

        {/* Right 5 cols: 1.5% Fee Checkout, Contact Privacy Gate, Live Map & Mutual Reviews */}
        <div className="lg:col-span-5 space-y-5">
          {/* Payment & 1.5% Platform Fee Breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">Fare Breakdown & Checkout</h2>
              <span className="text-xs font-mono font-semibold text-slate-600">
                {booking.paymentStatus === 'paid' ? 'Paid' : 'Pending Payment'}
              </span>
            </div>

            <div className="space-y-2 text-sm border-t border-b border-slate-100 py-3 font-mono tabular-nums">
              <div className="flex items-center justify-between text-slate-600">
                <span>
                  Seat Fare ({booking.seatsBooked} × ₹{booking.agreedPricePerSeat ?? booking.currentOfferPerSeat})
                </span>
                <span className="text-slate-900 font-semibold">₹{booking.rideSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Platform Fee (1.5%)</span>
                <span className="text-slate-900 font-semibold">₹{booking.platformFee.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span>Total Payable</span>
                <span>₹{booking.totalPayable.toFixed(2)}</span>
              </div>
            </div>

            {booking.paymentStatus === 'paid' ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-2">
                <span className="font-semibold">Ride + 1.5% Fee Paid Together · Ref {booking.paymentRef}</span>
                <span className="font-mono">Unlocked</span>
              </div>
            ) : isRider ? (
              <button
                type="button"
                disabled={!canPayNow || busyAction === 'pay'}
                onClick={handlePay}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {busyAction === 'pay'
                    ? 'Processing Payment...'
                    : canPayNow
                    ? `Pay Ride + 1.5% Fee Together (₹${booking.totalPayable.toFixed(2)})`
                    : 'Waiting for Buddy to Accept Proposed Fare'}
                </span>
              </button>
            ) : (
              <p className="text-xs text-slate-600">
                Once the payable amount is agreed in chat, the rider pays the ride fee + 1.5% platform fee together (₹
                {booking.totalPayable.toFixed(2)}) to unlock both mobile numbers and vehicle details.
              </p>
            )}
          </div>

          {/* Privacy-Gated Mobile Contact Numbers & Vehicle Info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {booking.paymentStatus === 'paid' ? (
                  <Unlock className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-600" />
                )}
                <h2 className="text-sm font-bold text-slate-900">Mobile Numbers &amp; Vehicle Info</h2>
              </div>
              <span className="text-xs text-slate-500">
                {booking.paymentStatus === 'paid' ? 'Unlocked' : 'Locked until paid'}
              </span>
            </div>

            {booking.paymentStatus === 'paid' ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="text-slate-500">Buddy / Driver ({booking.driverName})</p>
                    <p className="font-mono text-sm font-bold text-slate-900 mt-0.5">+91 {booking.driverMobile}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(booking.driverMobile || '')}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedPhone === booking.driverMobile ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="text-slate-500">Rider ({booking.riderName})</p>
                    <p className="font-mono text-sm font-bold text-slate-900 mt-0.5">+91 {booking.riderMobile}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(booking.riderMobile || '')}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedPhone === booking.riderMobile ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                  <p className="text-emerald-900 font-semibold">Unlocked Vehicle Information</p>
                  <p className="text-slate-800">
                    Model: <span className="font-bold">{booking.rideVehicleModel}</span> · Plate:{' '}
                    <span className="font-mono font-bold text-slate-900">{booking.rideVehicleNumberFull}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Vehicle Name &amp; Model</span>
                  <span className="font-semibold text-slate-900">{booking.rideVehicleModel}</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span>Registration Plate</span>
                  <span className="text-slate-400">•• •• ••••</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span>Buddy / Driver ({booking.driverName})</span>
                  <span className="text-slate-400">+91 ••••• •••••</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span>Rider ({booking.riderName})</span>
                  <span className="text-slate-400">+91 ••••• •••••</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    Only the vehicle name and model are visible now. Both parties&apos; mobile numbers and registration
                    plate unlock immediately after paying the ride fee and 1.5% platform fee together.
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Decided Route Summary & Live Route Map */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-amber-600 shrink-0" />
                <h2 className="text-sm font-bold text-slate-900">Decided Route &amp; Stops</h2>
              </div>
              <span className="text-xs font-semibold text-slate-600">
                {booking.routeProposal?.agreed
                  ? 'Confirmed by Both'
                  : booking.routeProposal
                  ? `Proposed by ${booking.routeProposal.proposedBy === 'driver' ? 'Buddy' : 'Rider'}`
                  : 'Initial Buddy Route'}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-800">
              {(booking.routeProposal?.waypoints ?? booking.rideWaypoints).join(' → ')}
            </p>
            <p className="text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Pickup:</span>{' '}
              {booking.routeProposal?.pickupPoint ?? booking.ridePickupPoint} ·{' '}
              <span className="font-semibold text-slate-800">Drop:</span>{' '}
              {booking.routeProposal?.dropPoint ?? booking.rideDropPoint}
            </p>
          </div>

          <LiveRouteMap
            rideId={booking.rideId}
            origin={booking.rideOrigin}
            destination={booking.rideDestination}
            waypoints={booking.routeProposal?.waypoints ?? booking.rideWaypoints}
            distanceKm={booking.rideDistanceKm}
            rideStatus={booking.rideStatus}
            liveLocation={booking.rideLiveLocation}
            canBroadcastLocation={booking.paymentStatus === 'paid'}
            onLocationUpdated={(loc) =>
              setBooking((prev) => (prev ? { ...prev, rideLiveLocation: loc } : prev))
            }
          />

          {/* Mutual Review System (Drivers & Riders) */}
          {booking.paymentStatus === 'paid' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  Rate {isDriver ? `Rider (${booking.riderName})` : `Driver (${booking.driverName})`}
                </h2>
                <span className="text-xs text-slate-500">Mutual Trip Review</span>
              </div>

              {alreadyReviewed ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-emerald-700">
                    Thank you! Your review has been published.
                  </p>
                  {reviews.map((rev) => (
                    <div key={rev.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {rev.fromUserName} → {rev.toRole}
                        </span>
                        <span className="font-mono font-bold text-amber-600">{rev.rating}.0 ★</span>
                      </div>
                      {rev.comment && <p className="text-slate-700">{rev.comment}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        aria-label={`Rate ${star} stars`}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= reviewRating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-mono font-bold text-slate-700">{reviewRating}.0 / 5</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {tagOptions.map((tag) => {
                      const active = reviewTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            setReviewTags((prev) =>
                              prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                            )
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            active
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Share your trip experience..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
                  />

                  <button
                    type="submit"
                    disabled={busyAction === 'review'}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                  >
                    {busyAction === 'review' ? 'Submitting...' : 'Submit Verified Review'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
