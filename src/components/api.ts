import type {
  AppNotification,
  Booking,
  ChatMessage,
  LiveLocation,
  Review,
  Ride,
  RolePreference,
  RouteAlert,
  SosIncident,
  UserProfile,
} from '../types';

const TOKEN_KEY = 'safarpool_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  requestOtp(mobile: string) {
    return request<{
      success: boolean;
      mobile: string;
      isNewUser: boolean;
      existingName: string | null;
      expiresInSeconds: number;
      otpPreview: string;
    }>('/api/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile }),
    });
  },

  verifyOtp(payload: {
    mobile: string;
    otp: string;
    name?: string;
    rolePreference?: RolePreference;
    emergencyContactName?: string;
    emergencyContactMobile?: string;
  }) {
    return request<{ token: string; user: UserProfile }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMe() {
    return request<{ user: UserProfile }>('/api/auth/me');
  },

  updateProfile(payload: {
    name?: string;
    rolePreference?: RolePreference;
    emergencyContactName?: string;
    emergencyContactMobile?: string;
  }) {
    return request<{ user: UserProfile }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  logout() {
    return request<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
  },

  listRides(params: { origin?: string; destination?: string; minSeats?: number; date?: string } = {}) {
    const query = new URLSearchParams();
    if (params.origin) query.set('origin', params.origin);
    if (params.destination) query.set('destination', params.destination);
    if (params.minSeats) query.set('minSeats', String(params.minSeats));
    if (params.date) query.set('date', params.date);
    const qs = query.toString();
    return request<{ rides: Ride[] }>(`/api/rides${qs ? `?${qs}` : ''}`);
  },

  createRide(payload: {
    origin: string;
    destination: string;
    pickupPoint: string;
    dropPoint: string;
    departureDate: string;
    departureTime: string;
    totalSeats: number;
    basePricePerSeat: number;
    negotiable: boolean;
    minAcceptablePrice?: number;
    waypoints?: string[];
    vehicleModel: string;
    vehicleNumber: string;
  }) {
    return request<{ ride: Ride; matchedAlertsCount: number }>('/api/rides', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateRideStatus(rideId: string, status: Ride['status']) {
    return request<{ ride: Ride }>(`/api/rides/${rideId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  updateRideLocation(rideId: string, payload: Partial<LiveLocation>) {
    return request<{ liveLocation: LiveLocation }>(`/api/rides/${rideId}/location`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listBookings() {
    return request<{ bookings: Booking[] }>('/api/bookings');
  },

  getBookingDetail(bookingId: string) {
    return request<{
      booking: Booking;
      messages: ChatMessage[];
      sosIncidents: SosIncident[];
      reviews: Review[];
    }>(`/api/bookings/${bookingId}`);
  },

  createBooking(payload: { rideId: string; seatsBooked: number; offerPricePerSeat?: number }) {
    return request<{ booking: Booking }>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  sendOffer(bookingId: string, proposedPricePerSeat: number) {
    return request<{ booking: Booking; message: ChatMessage }>(`/api/bookings/${bookingId}/offer`, {
      method: 'POST',
      body: JSON.stringify({ proposedPricePerSeat }),
    });
  },

  acceptPrice(bookingId: string) {
    return request<{ booking: Booking }>(`/api/bookings/${bookingId}/accept-price`, {
      method: 'POST',
    });
  },

  proposeRoute(bookingId: string, payload: { pickupPoint: string; dropPoint: string; waypoints: string[] }) {
    return request<{ booking: Booking; message: ChatMessage }>(`/api/bookings/${bookingId}/route`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  acceptRoute(bookingId: string) {
    return request<{ booking: Booking }>(`/api/bookings/${bookingId}/accept-route`, {
      method: 'POST',
    });
  },

  sendMessage(bookingId: string, text: string) {
    return request<{ message: ChatMessage }>(`/api/bookings/${bookingId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  payBooking(bookingId: string) {
    return request<{ booking: Booking }>(`/api/bookings/${bookingId}/pay`, {
      method: 'POST',
    });
  },

  triggerSos(bookingId: string, payload: { lat?: number; lng?: number; locationLabel?: string }) {
    return request<{ incident: SosIncident }>(`/api/bookings/${bookingId}/sos`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  resolveSos(incidentId: string) {
    return request<{ incident: SosIncident }>(`/api/sos/${incidentId}/resolve`, {
      method: 'POST',
    });
  },

  listReviews(userId?: string) {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return request<{ reviews: Review[] }>(`/api/reviews${qs}`);
  },

  submitReview(bookingId: string, payload: { rating: number; tags: string[]; comment: string }) {
    return request<{ review: Review }>(`/api/bookings/${bookingId}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listAlerts() {
    return request<{ alerts: RouteAlert[] }>('/api/alerts');
  },

  createAlert(payload: { origin: string; destination: string; minSeats: number; maxPricePerSeat: number | null }) {
    return request<{ alert: RouteAlert }>('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteAlert(alertId: string) {
    return request<{ success: boolean }>(`/api/alerts/${alertId}`, {
      method: 'DELETE',
    });
  },

  listNotifications() {
    return request<{ notifications: AppNotification[] }>('/api/notifications');
  },

  markNotificationsRead() {
    return request<{ success: boolean }>('/api/notifications/read-all', {
      method: 'POST',
    });
  },
};

export type WsEvent =
  | { type: 'auth:ok'; userId: string | null }
  | { type: 'notification:new'; notification: AppNotification }
  | { type: 'chat:message'; message: ChatMessage }
  | { type: 'booking:updated'; booking: Booking }
  | { type: 'ride:created'; ride: Ride }
  | { type: 'ride:updated'; ride: Ride }
  | { type: 'ride:location'; rideId: string; liveLocation: LiveLocation }
  | { type: 'sos:alert'; incident: SosIncident }
  | { type: 'sos:resolved'; incident: SosIncident };
