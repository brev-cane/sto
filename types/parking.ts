// ============================================================================
// TYPESCRIPT TYPES FOR STADIUM TAKEOVER PARKING FEATURE
// ============================================================================

/**
 * Enum for vehicle types that can be accommodated
 */
export enum VehicleType {
    CAR = 'car',
    SUV = 'suv',
    TRUCK = 'truck',
    CAMPER = 'camper',
    RV = 'rv',
    BUS = 'bus',
    MOTORCYCLE = 'motorcycle',
}

/**
 * Enum for ease of departure ratings
 */
export enum DepartureEase {
    VERY_EASY = 'very_easy',      // < 15 minutes
    EASY = 'easy',                // 15-30 minutes
    MODERATE = 'moderate',        // 30-60 minutes
    DIFFICULT = 'difficult',      // 60-90 minutes
    VERY_DIFFICULT = 'very_difficult', // > 90 minutes
}

/**
 * Enum for payment status
 */
export enum PaymentStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded',
}

/**
 * Enum for reservation status
 */
export enum ReservationStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    CHECKED_IN = 'checked_in',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    NO_SHOW = 'no_show',
}

/**
 * Stadium entrance information
 */
export interface StadiumEntrance {
    id: string;
    name: string;
    section: string;
}

/**
 * Main Stadium entity
 */
export interface Stadium {
    id: string;
    name: string;
    location: string;
    coordinates: Coordinates;
    image: string;
    entrances: StadiumEntrance[];
    capacity?: number;
    description?: string;
}

/**
 * Geographic coordinates
 */
export interface Coordinates {
    latitude: number;
    longitude: number;
}

/**
 * Opening time configuration
 */
export interface OpeningTime {
    hoursBeforeKickoff?: number;  // e.g., 5 (opens 5 hours before game)
    specificTime?: string;         // e.g., "08:00" (opens at 8 AM)
    description?: string;          // Human-readable description
}

/**
 * Recommended arrival time
 */
export interface RecommendedArrival {
    hoursBeforeKickoff?: number;
    specificTime?: string;
    description?: string;
}

/**
 * Departure information
 */
export interface DepartureInfo {
    ease: DepartureEase;
    estimatedMinutes: number;
    description?: string;
}

/**
 * Amenities available at the parking lot
 */
export interface ParkingAmenities {
    grillsAllowed: boolean;
    tailgatingSpace: boolean;
    bathrooms: boolean;
    security: boolean;
    lighting: boolean;
    covered: boolean;
    evCharging?: boolean;
    disabledAccess?: boolean;
}

/**
 * Pricing structure
 */
export interface ParkingPricing {
    perGame: number;
    seasonPrice?: number;
    currency: string;
    processingFee: number;        // Stadium Takeover's fee
    processingFeePercentage: number; // % of total price
}

/**
 * Rules and regulations
 */
export interface ParkingRules {
    rules: string[];
    prohibitedItems?: string[];
    alcoholPolicy?: string;
    noiseRestrictions?: string;
    maxOccupancy?: number;
}

/**
 * main Game entity
 */
export interface Game {
    id: string;
    stadiumId: string;
    date: string;
    kickoffTime: string;
    opponent: string;
    homeTeam: string;
    ticketsUrl?: string;
}

/**
 * Availability for specific games
 */
export interface GameAvailability {
    gameId: string;
    gameDate: string;             // ISO 8601 date
    kickoffTime: string;          // ISO 8601 datetime
    opponent: string;
    availableSpots: number;
    reservedSpots: number;
}

/**
 * Owner/operator information
 */
export interface LotOwner {
    id: string;
    name: string;
    email: string;
    phone: string;
    paymentMethod: string;        // Stripe Connect ID, bank account, etc.
    verificationStatus: 'verified' | 'pending' | 'unverified';
}

/**
 * Main Parking Lot entity
 */
export interface ParkingLot {
    id: string;
    name: string;
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        fullAddress: string;
    };
    coordinates: Coordinates;

    // Capacity
    totalSpots: number;
    accommodates: VehicleType[];

    // Timing
    openingTime: OpeningTime;
    recommendedArrival: RecommendedArrival;
    departureInfo: DepartureInfo;

    // Location relative to stadium
    distanceToStadium: number;    // in meters
    closestEntrance: StadiumEntrance;
    estimatedWalkTime: number;    // in minutes

    // Amenities and features
    amenities: ParkingAmenities;
    rules: ParkingRules;

    // Pricing
    pricing: ParkingPricing;

    // Availability
    availability: GameAvailability[];

    // Owner
    owner: LotOwner;

    // Media
    images: string[];

    // Relationships
    stadiumId: string;

    // Metadata
    rating?: number;              // Average rating 0-5
    reviewCount?: number;
    featured?: boolean;
    createdAt: string;
    updatedAt: string;
}

/**
 * User vehicle information
 */
export interface UserVehicle {
    id: string;
    userId: string;
    licensePlate: string;
    state: string;
    vehicleType: VehicleType;
    make?: string;
    model?: string;
    color?: string;
    verified: boolean;            // License plate verified via DMV or photo
    verificationMethod?: 'photo' | 'dmv' | 'manual';
    verificationDate?: string;
}

/**
 * Parking reservation
 */
export interface ParkingReservation {
    id: string;
    userId: string;
    userPhone: string;
    parkingLotId: string;
    vehicleId: string;

    // Game details
    gameId: string;
    gameDate: string;
    kickoffTime: string;

    // Reservation details
    reservationDate: string;
    status: ReservationStatus;

    // Check-in/out
    checkInTime?: string;
    checkInMethod?: 'qr' | 'license_plate' | 'phone' | 'manual';
    checkInLocation?: Coordinates;
    checkOutTime?: string;

    // Payment
    pricing: {
        basePrice: number;
        processingFee: number;
        totalPrice: number;
        currency: string;
    };
    paymentStatus: PaymentStatus;
    paymentId?: string;           // Stripe payment intent ID

    // Security
    confirmationCode: string;     // 6-8 digit code
    qrCode?: string;              // Base64 QR code image

    // Cancellation
    cancellationPolicy: string;
    cancellationDeadline: string;
    cancelledAt?: string;
    refundAmount?: number;

    // Metadata
    createdAt: string;
    updatedAt: string;
}

/**
 * Search/Filter criteria
 */
export interface ParkingSearchCriteria {
    gameId?: string;
    gameDate?: string;

    // Location filters
    maxDistanceToStadium?: number; // in meters
    maxWalkTime?: number;          // in minutes
    preferredEntrance?: string;

    // Pricing filters
    maxPrice?: number;
    seasonPassOnly?: boolean;

    // Amenities filters
    grillsRequired?: boolean;
    tailgatingRequired?: boolean;
    bathroomsRequired?: boolean;
    coveredRequired?: boolean;
    evChargingRequired?: boolean;

    // Vehicle requirements
    vehicleType?: VehicleType;

    // Departure preference
    easyDepartureOnly?: boolean;
    maxDepartureTime?: number;     // in minutes

    // Sorting
    sortBy?: 'price' | 'distance' | 'walkTime' | 'rating' | 'departureEase';
    sortOrder?: 'asc' | 'desc';
}