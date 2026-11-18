import React, { useState } from 'react';
import { Bell, CheckCheck, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { INDIA_CITIES } from '../lib/indiaCities';
import type { AppNotification, RouteAlert, UserProfile } from '../types';

interface AlertsViewProps {
  currentUser: UserProfile | null;
  alerts: RouteAlert[];
  notifications: AppNotification[];
  prefillOrigin?: string;
  prefillDestination?: string;
  onRequireAuth: () => void;
  onAlertCreated: (alert: RouteAlert) => void;
  onAlertDeleted: (id: string) => void;
  onMarkAllRead: () => void;
  onOpenNotificationTarget: (notification: AppNotification) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  currentUser,
  alerts,
  notifications,
  prefillOrigin = 'Jalgaon',
  prefillDestination = 'Pune',
  onRequireAuth,
  onAlertCreated,
  onAlertDeleted,
  onMarkAllRead,
  onOpenNotificationTarget,
}) => {
  const [origin, setOrigin] = useState(prefillOrigin);
  const [destination, setDestination] = useState(prefillDestination);
  const [minSeats, setMinSeats] = useState(2);
  const [maxPricePerSeat, setMaxPricePerSeat] = useState('900');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentUser) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
        <Bell className="w-8 h-8 text-amber-600 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">Automated Route Alerts Across India</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Sign in with your mobile number and OTP to subscribe to any route in India and get instant alerts when
          drivers post matching seats.
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

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await api.createAlert({
        origin,
        destination,
        minSeats,
        maxPricePerSeat: maxPricePerSeat ? Number(maxPricePerSeat) : null,
      });
      onAlertCreated(res.alert);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save alert');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <datalist id="india-alert-cities">
        {INDIA_CITIES.map((c) => (
          <option key={`${c.name}-${c.state}`} value={c.name}>
            {c.name}, {c.state}
          </option>
        ))}
      </datalist>

      {/* Left: Create & Manage Route Alerts */}
      <div className="lg:col-span-5 space-y-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Automated Route Alerts</h1>
            <p className="text-xs text-slate-600 mt-1">
              Get instant in-app and real-time WebSocket alerts whenever a matching ride is published anywhere in India.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateAlert} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">From</label>
                <input
                  type="text"
                  list="india-alert-cities"
                  required
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">To</label>
                <input
                  type="text"
                  list="india-alert-cities"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Min Seats</label>
                <select
                  value={minSeats}
                  onChange={(e) => setMinSeats(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-xl bg-white"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'seat' : 'seats'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Price (₹/seat)</label>
                <input
                  type="number"
                  min={50}
                  placeholder="Any"
                  value={maxPricePerSeat}
                  onChange={(e) => setMaxPricePerSeat(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{saving ? 'Saving Alert...' : 'Activate Route Alert'}</span>
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Your Active Alerts ({alerts.length})</h2>
          {alerts.length === 0 ? (
            <p className="text-xs text-slate-500">No route alerts configured yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.map((alert) => (
                <div key={alert.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {alert.origin} → {alert.destination}
                    </p>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      Min {alert.minSeats} seat(s) ·{' '}
                      {alert.maxPricePerSeat ? `Up to ₹${alert.maxPricePerSeat}/seat` : 'Any fare'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.deleteAlert(alert.id);
                      onAlertDeleted(alert.id);
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Delete route alert"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Real-Time Notification Feed */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Notification Feed</h2>
            <p className="text-xs text-slate-500">
              Live updates for new matching rides, price counter-offers, payments, and SOS alerts.
            </p>
          </div>
          {notifications.some((n) => !n.read) && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No notifications yet. Set a route alert or start a booking to receive real-time updates.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((ntf) => (
              <div
                key={ntf.id}
                className={`py-3.5 flex items-start justify-between gap-4 ${
                  !ntf.read ? 'bg-amber-50/40 -mx-3 px-3 rounded-xl' : ''
                }`}
              >
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900">{ntf.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{ntf.message}</p>
                  <p className="text-[11px] font-mono text-slate-400">
                    {new Date(ntf.createdAt).toLocaleString()}
                  </p>
                </div>
                {(ntf.bookingId || ntf.rideId) && (
                  <button
                    type="button"
                    onClick={() => onOpenNotificationTarget(ntf)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shrink-0"
                  >
                    Open
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
