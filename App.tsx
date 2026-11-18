import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, LogOut, X } from 'lucide-react';
import { AlertsView } from './components/AlertsView';
import { BookingWorkspace } from './components/BookingWorkspace';
import { ExploreRidesView } from './components/ExploreRidesView';
import { MyTripsView } from './components/MyTripsView';
import { OfferRideView } from './components/OfferRideView';
import { OtpAuthModal } from './components/OtpAuthModal';
import { api, getStoredToken, setStoredToken, type WsEvent } from './lib/api';
import type {
  AppNotification,
  Booking,
  ChatMessage,
  Review,
  Ride,
  RouteAlert,
  SosIncident,
  UserProfile,
} from './types';

type NavTab = 'explore' | 'offer' | 'trips' | 'alerts';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('explore');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authHint, setAuthHint] = useState<string | undefined>(undefined);

  const [rides, setRides] = useState<Ride[]>([]);
  const [ridesLoading, setRidesLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [alerts, setAlerts] = useState<RouteAlert[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [alertPrefill, setAlertPrefill] = useState<{ origin: string; destination: string }>({
    origin: 'Jalgaon',
    destination: 'Pune',
  });

  const [liveBookingPatch, setLiveBookingPatch] = useState<Booking | null>(null);
  const [incomingMessage, setIncomingMessage] = useState<ChatMessage | null>(null);
  const [incomingSos, setIncomingSos] = useState<SosIncident | null>(null);
  const [toast, setToast] = useState<{ title: string; message: string; bookingId?: string } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const loadPublicData = useCallback(async (filters?: { origin?: string; destination?: string; minSeats?: number; date?: string }) => {
    setRidesLoading(true);
    try {
      const [ridesRes, reviewsRes] = await Promise.all([
        api.listRides(filters),
        api.listReviews(),
      ]);
      setRides(ridesRes.rides);
      setReviews(reviewsRes.reviews);
    } catch {
      // Handled gracefully in UI
    } finally {
      setRidesLoading(false);
    }
  }, []);

  const loadUserWorkspace = useCallback(async () => {
    try {
      const [bookingsRes, alertsRes, ntfRes] = await Promise.all([
        api.listBookings(),
        api.listAlerts(),
        api.listNotifications(),
      ]);
      setBookings(bookingsRes.bookings);
      setAlerts(alertsRes.alerts);
      setNotifications(ntfRes.notifications);
    } catch {
      // Ignore if unauthenticated
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    void loadPublicData({});
    const token = getStoredToken();
    if (token) {
      api
        .getMe()
        .then((res) => {
          setCurrentUser(res.user);
          void loadUserWorkspace();
        })
        .catch(() => {
          setStoredToken(null);
        });
    }
  }, [loadPublicData, loadUserWorkspace]);

  // WebSocket real-time connection
  useEffect(() => {
    let closed = false;
    let reconnectTimer: number | null = null;

    const connect = () => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        const token = getStoredToken();
        if (token) {
          ws.send(JSON.stringify({ type: 'auth', token }));
        }
        if (selectedBookingId) {
          ws.send(JSON.stringify({ type: 'booking:join', bookingId: selectedBookingId }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data)) as WsEvent;
          if (data.type === 'ride:created') {
            setRides((prev) => (prev.some((r) => r.id === data.ride.id) ? prev : [data.ride, ...prev]));
          } else if (data.type === 'ride:updated') {
            setRides((prev) => prev.map((r) => (r.id === data.ride.id ? data.ride : r)));
          } else if (data.type === 'ride:location') {
            setRides((prev) =>
              prev.map((r) => (r.id === data.rideId ? { ...r, liveLocation: data.liveLocation } : r))
            );
            setBookings((prev) =>
              prev.map((b) => (b.rideId === data.rideId ? { ...b, rideLiveLocation: data.liveLocation } : b))
            );
            setLiveBookingPatch((prev) =>
              prev && prev.rideId === data.rideId ? { ...prev, rideLiveLocation: data.liveLocation } : prev
            );
          } else if (data.type === 'booking:updated') {
            setBookings((prev) => {
              const exists = prev.some((b) => b.id === data.booking.id);
              return exists
                ? prev.map((b) => (b.id === data.booking.id ? data.booking : b))
                : [data.booking, ...prev];
            });
            setLiveBookingPatch(data.booking);
          } else if (data.type === 'chat:message') {
            setIncomingMessage(data.message);
          } else if (data.type === 'sos:alert' || data.type === 'sos:resolved') {
            setIncomingSos(data.incident);
          } else if (data.type === 'notification:new') {
            setNotifications((prev) =>
              prev.some((n) => n.id === data.notification.id) ? prev : [data.notification, ...prev]
            );
            setToast({
              title: data.notification.title,
              message: data.notification.message,
              bookingId: data.notification.bookingId,
            });
          }
        } catch {
          // Ignore invalid socket frames
        }
      };

      ws.onclose = () => {
        if (!closed) {
          reconnectTimer = window.setTimeout(connect, 2500);
        }
      };
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [currentUser?.id, selectedBookingId]);

  useEffect(() => {
    if (selectedBookingId && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'booking:join', bookingId: selectedBookingId }));
    }
  }, [selectedBookingId]);

  const openAuth = (hint?: string) => {
    setAuthHint(hint);
    setAuthModalOpen(true);
  };

  const handleAuthenticated = (user: UserProfile) => {
    setCurrentUser(user);
    void loadUserWorkspace();
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    setStoredToken(null);
    setCurrentUser(null);
    setBookings([]);
    setAlerts([]);
    setNotifications([]);
    setSelectedBookingId(null);
    setActiveTab('explore');
  };

  const handleBookOrNegotiate = async (ride: Ride, seats: number, offerPricePerSeat?: number) => {
    if (!currentUser) {
      openAuth(
        `Sign in with your mobile number & OTP to book ${seats} seat(s) from ${ride.origin} to ${ride.destination}.`
      );
      return;
    }
    const res = await api.createBooking({
      rideId: ride.id,
      seatsBooked: seats,
      offerPricePerSeat,
    });
    setBookings((prev) => [res.booking, ...prev]);
    setSelectedBookingId(res.booking.id);
    setActiveTab('trips');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const publishedRides = currentUser ? rides.filter((r) => r.driverId === currentUser.id) : [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              setSelectedBookingId(null);
              setActiveTab('explore');
            }}
            className="text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Suffer Buddy
          </button>

          {/* Zone 2: 4 concise single-line text navigation links */}
          <nav className="flex items-center gap-5 sm:gap-7 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setSelectedBookingId(null);
                setActiveTab('explore');
              }}
              className={`py-1 text-sm font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                activeTab === 'explore'
                  ? 'border-amber-500 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Find Rides
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedBookingId(null);
                setActiveTab('offer');
              }}
              className={`py-1 text-sm font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                activeTab === 'offer'
                  ? 'border-amber-500 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Offer Ride
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedBookingId(null);
                setActiveTab('trips');
              }}
              className={`py-1 text-sm font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                activeTab === 'trips'
                  ? 'border-amber-500 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              My Trips{bookings.length > 0 ? ` (${bookings.length})` : ''}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedBookingId(null);
                setActiveTab('alerts');
              }}
              className={`py-1 text-sm font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                activeTab === 'alerts'
                  ? 'border-amber-500 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Alerts{unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="shrink-0">
            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-900 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <span className="max-w-[110px] truncate">{currentUser.name}</span>
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuth()}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
              >
                Sign In with OTP
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Real-time Notification Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-40 max-w-sm bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700 p-4 flex items-start gap-3">
          <Bell className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold">{toast.title}</p>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
            {toast.bookingId && (
              <button
                type="button"
                onClick={() => {
                  setSelectedBookingId(toast.bookingId || null);
                  setActiveTab('trips');
                  setToast(null);
                }}
                className="mt-2 text-xs font-bold text-amber-400 hover:text-amber-300 underline"
              >
                Open Trip Chat
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'explore' && (
          <ExploreRidesView
            rides={rides}
            reviews={reviews}
            currentUser={currentUser}
            loading={ridesLoading}
            onSearch={(filters) => void loadPublicData(filters)}
            onBookOrNegotiate={handleBookOrNegotiate}
            onOpenOfferRide={() => {
              if (!currentUser) {
                openAuth('Sign in with your mobile number & OTP to publish a ride.');
                return;
              }
              setActiveTab('offer');
            }}
            onOpenAlertModal={(o, d) => {
              setAlertPrefill({ origin: o, destination: d });
              if (!currentUser) {
                openAuth(`Sign in with your mobile number & OTP to receive automated alerts for ${o} → ${d}.`);
                return;
              }
              setActiveTab('alerts');
            }}
          />
        )}

        {activeTab === 'offer' && (
          <OfferRideView
            currentUser={currentUser}
            onRequireAuth={() => openAuth('Mobile OTP verification is required before publishing a ride.')}
            onRidePublished={(ride, matchedCount) => {
              setRides((prev) => [ride, ...prev]);
              setToast({
                title: `Ride published: ${ride.origin} → ${ride.destination}`,
                message:
                  matchedCount > 0
                    ? `Automated notifications sent to ${matchedCount} matching rider alert(s).`
                    : 'Your seats are now live for riders to book and negotiate.',
              });
              setActiveTab('trips');
            }}
          />
        )}

        {activeTab === 'trips' && selectedBookingId && currentUser && (
          <BookingWorkspace
            bookingId={selectedBookingId}
            currentUser={currentUser}
            liveBookingPatch={liveBookingPatch}
            incomingMessage={incomingMessage}
            incomingSos={incomingSos}
            onBack={() => {
              setSelectedBookingId(null);
              void loadUserWorkspace();
            }}
            onBookingUpdated={(updated) => {
              setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
            }}
          />
        )}

        {activeTab === 'trips' && (!selectedBookingId || !currentUser) && (
          <MyTripsView
            currentUser={currentUser}
            bookings={bookings}
            publishedRides={publishedRides}
            onRequireAuth={() => openAuth('Sign in with your mobile number & OTP to access your trips.')}
            onOpenBooking={(id) => setSelectedBookingId(id)}
            onExploreRides={() => setActiveTab('explore')}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsView
            currentUser={currentUser}
            alerts={alerts}
            notifications={notifications}
            prefillOrigin={alertPrefill.origin}
            prefillDestination={alertPrefill.destination}
            onRequireAuth={() => openAuth('Sign in with your mobile number & OTP to manage route alerts.')}
            onAlertCreated={(alert) => setAlerts((prev) => [alert, ...prev])}
            onAlertDeleted={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
            onMarkAllRead={async () => {
              await api.markNotificationsRead();
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            }}
            onOpenNotificationTarget={(ntf) => {
              if (ntf.bookingId) {
                setSelectedBookingId(ntf.bookingId);
                setActiveTab('trips');
              } else if (ntf.rideId) {
                setActiveTab('explore');
                void loadPublicData({});
              }
            }}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <p>Suffer Buddy · Free intercity seat sharing · 1.5% transparent platform fee on confirmed fares</p>
          <p>Mandatory Mobile OTP Auth · Safety-Observed Negotiation · Post-Payment Contact Reveal</p>
        </div>
      </footer>

      <OtpAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
        contextHint={authHint}
      />
    </div>
  );
}
