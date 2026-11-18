export type RolePreference = 'rider' | 'driver' | 'both';

export interface UserProfile {
  id: string;
  mobile: string;
  name: string;
  rolePreference: RolePreference;
  driverRating: number;
  driverReviewCount: number;
  riderRating: number;
  riderReviewCount: number;
  emergencyContactName: string;
  emergencyContactMobile: string;
  createdAt: string;
}

export interface LiveLocation {
  lat: number;
  lng: number;
  progressPct: number;
  currentCity: string;
  speedKmh: number;
  updatedAt: string;
}

export type RideStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Ride {
  id: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  driverReviewCount: number;
  origin: string;
  destination: string;
  pickupPoint: string;
  dropPoint: string;
  departureDate: string;
  departureTime: string;
  totalSeats: number;
  availableSeats: number;
  basePricePerSeat: number;
  minAcceptablePrice: number;
  negotiable: boolean;
  vehicleModel: string;
  vehicleNumberMasked: string;
  vehicleNumberFull?: string;
  waypoints: string[];
  distanceKm: number;
  estimatedDuration: string;
  status: RideStatus;
  liveLocation?: LiveLocation;
  createdAt: string;
}

export type BookingStatus =
  | 'negotiating'
  | 'price_agreed'
  | 'paid'
  | 'active_trip'
  | 'completed'
  | 'cancelled';

export interface Booking {
  id: string;
  rideId: string;
  rideOrigin: string;
  rideDestination: string;
  rideDepartureDate: string;
  rideDepartureTime: string;
  ridePickupPoint: string;
  rideDropPoint: string;
  rideVehicleModel: string;
  rideVehicleNumberMasked: string;
  rideVehicleNumberFull?: string;
  rideStatus: RideStatus;
  rideLiveLocation?: LiveLocation;
  rideWaypoints: string[];
  rideDistanceKm: number;
  driverId: string;
  driverName: string;
  driverRating: number;
  driverReviewCount: number;
  riderId: string;
  riderName: string;
  riderRating: number;
  riderReviewCount: number;
  seatsBooked: number;
  originalPricePerSeat: number;
  currentOfferPerSeat: number;
  agreedPricePerSeat: number | null;
  offerProposedBy: 'rider' | 'driver' | null;
  routeProposal?: {
    pickupPoint: string;
    dropPoint: string;
    waypoints: string[];
    proposedBy: 'rider' | 'driver';
    agreed: boolean;
  };
  rideSubtotal: number;
  platformFee: number;
  totalPayable: number;
  status: BookingStatus;
  paymentStatus: 'unpaid' | 'paid';
  paymentRef?: string;
  paidAt?: string;
  driverContactUnlocked: boolean;
  riderContactUnlocked: boolean;
  driverMobile?: string;
  riderMobile?: string;
  driverReviewedRider: boolean;
  riderReviewedDriver: boolean;
  createdAt: string;
}

export type ChatMessageType =
  | 'text'
  | 'price_offer'
  | 'price_accepted'
  | 'route_offer'
  | 'route_accepted'
  | 'payment_confirmed'
  | 'moderation_warning'
  | 'sos_alert';

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  senderRole: 'rider' | 'driver' | 'system' | 'moderator';
  type: ChatMessageType;
  text: string;
  proposedPricePerSeat?: number;
  flaggedReason?: string;
  createdAt: string;
}

export interface RouteAlert {
  id: string;
  userId: string;
  origin: string;
  destination: string;
  minSeats: number;
  maxPricePerSeat: number | null;
  active: boolean;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type:
    | 'ride_available'
    | 'price_offer'
    | 'price_agreed'
    | 'payment_done'
    | 'chat_message'
    | 'sos_alert'
    | 'review_received';
  title: string;
  message: string;
  rideId?: string;
  bookingId?: string;
  read: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  rideId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toRole: 'driver' | 'rider';
  rating: number;
  tags: string[];
  comment: string;
  createdAt: string;
}

export interface SosIncident {
  id: string;
  bookingId: string;
  rideId: string;
  triggeredByUserId: string;
  triggeredByName: string;
  lat: number;
  lng: number;
  locationLabel: string;
  status: 'active' | 'resolved';
  createdAt: string;
}
