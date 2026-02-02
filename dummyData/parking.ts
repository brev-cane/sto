// ============================================================================
// DUMMY DATA
// ============================================================================

import { DepartureEase, LotOwner, ParkingLot, ParkingReservation, ParkingSearchCriteria, PaymentStatus, ReservationStatus, UserVehicle, VehicleType, Stadium, Game } from "@/types/parking";
import { parkingArea, stadiumImage } from "./images";

export const SAMPLE_STADIUMS: Stadium[] = [
    {
        id: "stadium_001",
        name: "MetLife Stadium",
        location: "East Rutherford, NJ",
        coordinates: { latitude: 40.8128, longitude: -74.0742 },
        image: stadiumImage,
        entrances: [
            { id: "gate_a", name: "Gate A", section: "North" },
            { id: "gate_b", name: "Gate B", section: "East" },
            { id: "gate_c", name: "Gate C", section: "South" },
            { id: "gate_d", name: "Gate D", section: "West" },
        ]
    },
    {
        id: "stadium_002",
        name: "Yankee Stadium",
        location: "Bronx, NY",
        coordinates: { latitude: 40.8296, longitude: -73.9262 },
        image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1073&auto=format&fit=crop",
        entrances: [
            { id: "gate_1", name: "Gate 1", section: "North" },
            { id: "gate_2", name: "Gate 2", section: "East" },
            { id: "gate_4", name: "Gate 4", section: "West" },
            { id: "gate_6", name: "Gate 6", section: "South" },
        ]
    },
    {
        id: "stadium_003",
        name: "Madison Square Garden",
        location: "New York, NY",
        coordinates: { latitude: 40.7505, longitude: -73.9934 },
        image: "https://images.unsplash.com/photo-1577900232427-18219b9166a0?q=80&w=1170&auto=format&fit=crop",
        entrances: [
            { id: "8th_ave", name: "8th Ave Entrance", section: "West" },
            { id: "7th_ave", name: "7th Ave Entrance", section: "East" },
        ]
    }
];

export const STADIUM_INFO = SAMPLE_STADIUMS[0];

export const SAMPLE_GAMES: Game[] = [
    {
        id: "game_001",
        stadiumId: "stadium_001",
        date: "2026-09-13",
        kickoffTime: "2026-09-13T13:00:00-04:00",
        opponent: "Dallas Cowboys",
        homeTeam: "New York Giants"
    },
    {
        id: "game_002",
        stadiumId: "stadium_001",
        date: "2026-09-20",
        kickoffTime: "2026-09-20T16:25:00-04:00",
        opponent: "Green Bay Packers",
        homeTeam: "New York Giants"
    },
    {
        id: "game_003",
        stadiumId: "stadium_002",
        date: "2026-10-04",
        kickoffTime: "2026-10-04T19:00:00-04:00",
        opponent: "Boston Red Sox",
        homeTeam: "New York Yankees"
    },
];

export const SAMPLE_LOT_OWNERS: LotOwner[] = [
    {
        id: "owner_001",
        name: "Premium Parking LLC",
        email: "contact@premiumparking.com",
        phone: "+1-555-0101",
        paymentMethod: "stripe_acct_1234567890",
        verificationStatus: "verified"
    },
    {
        id: "owner_002",
        name: "East Rutherford Church",
        email: "admin@erchurch.org",
        phone: "+1-555-0102",
        paymentMethod: "stripe_acct_0987654321",
        verificationStatus: "verified"
    },
    {
        id: "owner_003",
        name: "Meadowlands Business Center",
        email: "parking@meadowlandsbiz.com",
        phone: "+1-555-0103",
        paymentMethod: "stripe_acct_1122334455",
        verificationStatus: "verified"
    },
];

export const SAMPLE_PARKING_LOTS: ParkingLot[] = [
    {
        id: "lot_001",
        name: "Premium North Lot",
        address: {
            street: "1 MetLife Stadium Dr",
            city: "East Rutherford",
            state: "NJ",
            zipCode: "07073",
            fullAddress: "1 MetLife Stadium Dr, East Rutherford, NJ 07073"
        },
        coordinates: { latitude: 40.8145, longitude: -74.0750 },
        totalSpots: 500,
        accommodates: [VehicleType.CAR, VehicleType.SUV, VehicleType.TRUCK],
        openingTime: {
            hoursBeforeKickoff: 5,
            description: "Opens 5 hours before kickoff"
        },
        recommendedArrival: {
            hoursBeforeKickoff: 3,
            description: "Arrive 3 hours before kickoff for best experience"
        },
        departureInfo: {
            ease: DepartureEase.EASY,
            estimatedMinutes: 20,
            description: "Quick exit to highway access"
        },
        distanceToStadium: 200,
        closestEntrance: STADIUM_INFO.entrances[0],
        estimatedWalkTime: 3,
        amenities: {
            grillsAllowed: true,
            tailgatingSpace: true,
            bathrooms: true,
            security: true,
            lighting: true,
            covered: false,
            evCharging: true,
            disabledAccess: true
        },
        rules: {
            rules: [
                "No glass containers",
                "Keep music at reasonable volume",
                "Clean up after tailgating",
                "No saving spots for others"
            ],
            prohibitedItems: ["fireworks", "weapons", "illegal substances"],
            alcoholPolicy: "Permitted in designated tailgating areas only",
            noiseRestrictions: "No excessive noise after 10 PM",
            maxOccupancy: 8
        },
        pricing: {
            perGame: 75.00,
            seasonPrice: 600.00,
            currency: "USD",
            processingFee: 5.00,
            processingFeePercentage: 6.25
        },
        availability: [
            {
                gameId: "game_001",
                gameDate: "2026-09-13",
                kickoffTime: "2026-09-13T13:00:00-04:00",
                opponent: "Dallas Cowboys",
                availableSpots: 120,
                reservedSpots: 380
            },
            {
                gameId: "game_002",
                gameDate: "2026-09-20",
                kickoffTime: "2026-09-20T16:25:00-04:00",
                opponent: "Green Bay Packers",
                availableSpots: 450,
                reservedSpots: 50
            }
        ],
        owner: SAMPLE_LOT_OWNERS[0],
        images: [
            parkingArea
        ],
        stadiumId: "stadium_001",
        rating: 4.7,
        reviewCount: 342,
        featured: true,
        createdAt: "2026-01-15T10:00:00Z",
        updatedAt: "2026-01-28T14:30:00Z"
    },
    {
        id: "lot_002",
        name: "Church Parking - Tailgate Friendly",
        address: {
            street: "45 Paterson Plank Rd",
            city: "East Rutherford",
            state: "NJ",
            zipCode: "07073",
            fullAddress: "45 Paterson Plank Rd, East Rutherford, NJ 07073"
        },
        coordinates: { latitude: 40.8102, longitude: -74.0782 },
        totalSpots: 150,
        accommodates: [VehicleType.CAR, VehicleType.SUV, VehicleType.TRUCK, VehicleType.CAMPER],
        openingTime: {
            specificTime: "07:00",
            description: "Opens at 7:00 AM on game days"
        },
        recommendedArrival: {
            hoursBeforeKickoff: 4,
            description: "Popular lot - arrive early for best spots"
        },
        departureInfo: {
            ease: DepartureEase.MODERATE,
            estimatedMinutes: 45,
            description: "Single exit point can cause delays"
        },
        distanceToStadium: 850,
        closestEntrance: STADIUM_INFO.entrances[1],
        estimatedWalkTime: 12,
        amenities: {
            grillsAllowed: true,
            tailgatingSpace: true,
            bathrooms: true,
            security: false,
            lighting: true,
            covered: false,
            disabledAccess: true
        },
        rules: {
            rules: [
                "Respect church property",
                "No table smashing or destructive activities",
                "No dizzy bat contests",
                "Must vacate lot by 9 PM"
            ],
            prohibitedItems: ["fireworks", "portable generators over 2000W"],
            alcoholPolicy: "Allowed but keep family-friendly",
            maxOccupancy: 10
        },
        pricing: {
            perGame: 45.00,
            seasonPrice: 400.00,
            currency: "USD",
            processingFee: 3.50,
            processingFeePercentage: 7.22
        },
        availability: [
            {
                gameId: "game_001",
                gameDate: "2026-09-13",
                kickoffTime: "2026-09-13T13:00:00-04:00",
                opponent: "Dallas Cowboys",
                availableSpots: 25,
                reservedSpots: 125
            },
            {
                gameId: "game_002",
                gameDate: "2026-09-20",
                kickoffTime: "2026-09-20T16:25:00-04:00",
                opponent: "Green Bay Packers",
                availableSpots: 89,
                reservedSpots: 61
            }
        ],
        owner: SAMPLE_LOT_OWNERS[1],
        images: [
            parkingArea
        ],
        stadiumId: "stadium_001",
        rating: 4.5,
        reviewCount: 203,
        featured: false,
        createdAt: "2026-01-10T09:00:00Z",
        updatedAt: "2026-01-29T11:20:00Z"
    },
    {
        id: "lot_003",
        name: "Executive Covered Parking",
        address: {
            street: "100 Murray Hill Pkwy",
            city: "East Rutherford",
            state: "NJ",
            zipCode: "07073",
            fullAddress: "100 Murray Hill Pkwy, East Rutherford, NJ 07073"
        },
        coordinates: { latitude: 40.8155, longitude: -74.0695 },
        totalSpots: 80,
        accommodates: [VehicleType.CAR, VehicleType.SUV, VehicleType.TRUCK],
        openingTime: {
            hoursBeforeKickoff: 4,
            description: "Opens 4 hours before kickoff"
        },
        recommendedArrival: {
            hoursBeforeKickoff: 2.5,
            description: "Arrive 2.5 hours early - limited spots"
        },
        departureInfo: {
            ease: DepartureEase.VERY_EASY,
            estimatedMinutes: 10,
            description: "Direct highway access, fastest exit"
        },
        distanceToStadium: 450,
        closestEntrance: STADIUM_INFO.entrances[0],
        estimatedWalkTime: 6,
        amenities: {
            grillsAllowed: false,
            tailgatingSpace: false,
            bathrooms: true,
            security: true,
            lighting: true,
            covered: true,
            evCharging: true,
            disabledAccess: true
        },
        rules: {
            rules: [
                "No tailgating - parking only",
                "Reserved for premium ticket holders",
                "Valet service available"
            ],
            prohibitedItems: ["grills", "coolers", "alcohol"],
            alcoholPolicy: "Not permitted"
        },
        pricing: {
            perGame: 125.00,
            seasonPrice: 1500.00,
            currency: "USD",
            processingFee: 7.50,
            processingFeePercentage: 5.66
        },
        availability: [
            {
                gameId: "game_001",
                gameDate: "2026-09-13",
                kickoffTime: "2026-09-13T13:00:00-04:00",
                opponent: "Dallas Cowboys",
                availableSpots: 15,
                reservedSpots: 65
            },
            {
                gameId: "game_002",
                gameDate: "2026-09-20",
                kickoffTime: "2026-09-20T16:25:00-04:00",
                opponent: "Green Bay Packers",
                availableSpots: 42,
                reservedSpots: 38
            }
        ],
        owner: SAMPLE_LOT_OWNERS[0],
        images: [
            parkingArea
        ],
        stadiumId: "stadium_001",
        rating: 4.9,
        reviewCount: 128,
        featured: true,
        createdAt: "2026-01-12T08:00:00Z",
        updatedAt: "2026-01-30T09:15:00Z"
    },
    {
        id: "lot_004",
        name: "RV & Camper Lot",
        address: {
            street: "75 State Route 120",
            city: "East Rutherford",
            state: "NJ",
            zipCode: "07073",
            fullAddress: "75 State Route 120, East Rutherford, NJ 07073"
        },
        coordinates: { latitude: 40.8089, longitude: -74.0810 },
        totalSpots: 60,
        accommodates: [VehicleType.CAR, VehicleType.SUV, VehicleType.TRUCK, VehicleType.CAMPER, VehicleType.RV, VehicleType.BUS],
        openingTime: {
            hoursBeforeKickoff: 6,
            description: "Opens 6 hours before kickoff for RVs"
        },
        recommendedArrival: {
            hoursBeforeKickoff: 5,
            description: "Early arrival recommended for larger vehicles"
        },
        departureInfo: {
            ease: DepartureEase.DIFFICULT,
            estimatedMinutes: 75,
            description: "Large vehicles take time to exit safely"
        },
        distanceToStadium: 1200,
        closestEntrance: STADIUM_INFO.entrances[2],
        estimatedWalkTime: 18,
        amenities: {
            grillsAllowed: true,
            tailgatingSpace: true,
            bathrooms: true,
            security: true,
            lighting: true,
            covered: false,
            disabledAccess: true
        },
        rules: {
            rules: [
                "RV hookups available for additional fee",
                "Generator use permitted until 11 PM",
                "Overnight camping allowed with premium package",
                "Designated dump station available"
            ],
            prohibitedItems: ["fireworks", "open flames without grill"],
            alcoholPolicy: "Permitted in moderation",
            maxOccupancy: 20
        },
        pricing: {
            perGame: 95.00,
            seasonPrice: 850.00,
            currency: "USD",
            processingFee: 6.00,
            processingFeePercentage: 5.94
        },
        availability: [
            {
                gameId: "game_001",
                gameDate: "2026-09-13",
                kickoffTime: "2026-09-13T13:00:00-04:00",
                opponent: "Dallas Cowboys",
                availableSpots: 8,
                reservedSpots: 52
            },
            {
                gameId: "game_002",
                gameDate: "2026-09-20",
                kickoffTime: "2026-09-20T16:25:00-04:00",
                opponent: "Green Bay Packers",
                availableSpots: 35,
                reservedSpots: 25
            }
        ],
        owner: SAMPLE_LOT_OWNERS[2],
        images: [
            parkingArea
        ],
        stadiumId: "stadium_001",
        rating: 4.6,
        reviewCount: 89,
        featured: true,
        createdAt: "2026-01-08T07:30:00Z",
        updatedAt: "2026-01-29T16:45:00Z"
    },
    {
        id: "lot_005",
        name: "Budget Lot - South",
        address: {
            street: "200 Paterson Plank Rd",
            city: "East Rutherford",
            state: "NJ",
            zipCode: "07073",
            fullAddress: "200 Paterson Plank Rd, East Rutherford, NJ 07073"
        },
        coordinates: { latitude: 40.8070, longitude: -74.0760 },
        totalSpots: 300,
        accommodates: [VehicleType.CAR, VehicleType.SUV, VehicleType.TRUCK, VehicleType.MOTORCYCLE],
        openingTime: {
            specificTime: "09:00",
            description: "Opens at 9:00 AM"
        },
        recommendedArrival: {
            hoursBeforeKickoff: 2,
            description: "Flexible arrival times available"
        },
        departureInfo: {
            ease: DepartureEase.VERY_DIFFICULT,
            estimatedMinutes: 95,
            description: "High traffic, plan for extended exit time"
        },
        distanceToStadium: 1450,
        closestEntrance: STADIUM_INFO.entrances[2],
        estimatedWalkTime: 22,
        amenities: {
            grillsAllowed: false,
            tailgatingSpace: false,
            bathrooms: false,
            security: false,
            lighting: true,
            covered: false,
            disabledAccess: false
        },
        rules: {
            rules: [
                "Parking only - no tailgating",
                "Park at your own risk",
                "No overnight parking"
            ],
            prohibitedItems: ["grills", "tents", "canopies"],
            alcoholPolicy: "Not permitted"
        },
        pricing: {
            perGame: 25.00,
            seasonPrice: 225.00,
            currency: "USD",
            processingFee: 2.50,
            processingFeePercentage: 9.09
        },
        availability: [
            {
                gameId: "game_001",
                gameDate: "2026-09-13",
                kickoffTime: "2026-09-13T13:00:00-04:00",
                opponent: "Dallas Cowboys",
                availableSpots: 180,
                reservedSpots: 120
            },
            {
                gameId: "game_002",
                gameDate: "2026-09-20",
                kickoffTime: "2026-09-20T16:25:00-04:00",
                opponent: "Green Bay Packers",
                availableSpots: 275,
                reservedSpots: 25
            }
        ],
        owner: SAMPLE_LOT_OWNERS[2],
        images: [
            parkingArea
        ],
        stadiumId: "stadium_001",
        rating: 3.8,
        reviewCount: 456,
        featured: false,
        createdAt: "2026-01-05T06:00:00Z",
        updatedAt: "2026-01-28T10:00:00Z"
    },
    {
        id: "lot_006",
        name: "Bronx 161st St Garage",
        address: {
            street: "800 River Ave",
            city: "Bronx",
            state: "NY",
            zipCode: "10451",
            fullAddress: "800 River Ave, Bronx, NY 10451"
        },
        coordinates: { latitude: 40.8285, longitude: -73.9275 },
        totalSpots: 400,
        accommodates: [VehicleType.CAR, VehicleType.SUV],
        openingTime: {
            hoursBeforeKickoff: 3,
            description: "Opens 3 hours before first pitch"
        },
        recommendedArrival: {
            hoursBeforeKickoff: 1.5,
            description: "Arrive 90 mins early for easy entry"
        },
        departureInfo: {
            ease: DepartureEase.MODERATE,
            estimatedMinutes: 35,
            description: "Expect traffic on River Ave"
        },
        distanceToStadium: 150,
        closestEntrance: { id: "gate_4", name: "Gate 4", section: "West" },
        estimatedWalkTime: 2,
        amenities: {
            grillsAllowed: false,
            tailgatingSpace: false,
            bathrooms: true,
            security: true,
            lighting: true,
            covered: true,
            disabledAccess: true
        },
        rules: {
            rules: ["No tailgating", "No outside alcohol", "Max height 7'0\""],
            prohibitedItems: ["Oversized vehicles", "trailers"]
        },
        pricing: {
            perGame: 45.00,
            currency: "USD",
            processingFee: 4.00,
            processingFeePercentage: 8.8
        },
        availability: [
            {
                gameId: "game_003",
                gameDate: "2026-10-04",
                kickoffTime: "2026-10-04T19:00:00-04:00",
                opponent: "Boston Red Sox",
                availableSpots: 50,
                reservedSpots: 350
            }
        ],
        owner: SAMPLE_LOT_OWNERS[0],
        images: [parkingArea],
        stadiumId: "stadium_002",
        rating: 4.2,
        reviewCount: 156,
        createdAt: "2026-01-15T10:00:00Z",
        updatedAt: "2026-01-28T14:30:00Z"
    },
    {
        id: "lot_007",
        name: "MSG Plaza Parking",
        address: {
            street: "4 Penn Plaza",
            city: "New York",
            state: "NY",
            zipCode: "10001",
            fullAddress: "4 Penn Plaza, New York, NY 10001"
        },
        coordinates: { latitude: 40.7510, longitude: -73.9930 },
        totalSpots: 100,
        accommodates: [VehicleType.CAR, VehicleType.SUV],
        openingTime: {
            hoursBeforeKickoff: 2,
            description: "Opens 2 hours before event start"
        },
        recommendedArrival: {
            hoursBeforeKickoff: 1,
            description: "Arrive 1 hour early for best access"
        },
        departureInfo: {
            ease: DepartureEase.DIFFICULT,
            estimatedMinutes: 50,
            description: "Manhattan traffic can be extreme"
        },
        distanceToStadium: 50,
        closestEntrance: { id: "8th_ave", name: "8th Ave Entrance", section: "West" },
        estimatedWalkTime: 1,
        amenities: {
            grillsAllowed: false,
            tailgatingSpace: false,
            bathrooms: true,
            security: true,
            lighting: true,
            covered: true,
            disabledAccess: true
        },
        rules: {
            rules: ["No tailgating", "Valet only for premium", "No liquids"],
            prohibitedItems: ["Large bags", "Professional cameras"]
        },
        pricing: {
            perGame: 85.00,
            currency: "USD",
            processingFee: 8.00,
            processingFeePercentage: 9.4
        },
        availability: [
            {
                gameId: "game_005",
                gameDate: "2026-11-15",
                kickoffTime: "2026-11-15T19:30:00-05:00",
                opponent: "Boston Celtics",
                availableSpots: 10,
                reservedSpots: 90
            }
        ],
        owner: SAMPLE_LOT_OWNERS[2],
        images: [parkingArea],
        stadiumId: "stadium_003",
        rating: 4.8,
        reviewCount: 312,
        createdAt: "2026-01-15T10:00:00Z",
        updatedAt: "2026-01-28T14:30:00Z"
    }
];

export const SAMPLE_USER_VEHICLES: UserVehicle[] = [
    {
        id: "vehicle_001",
        userId: "user_123",
        licensePlate: "ABC1234",
        state: "NJ",
        vehicleType: VehicleType.SUV,
        make: "Toyota",
        model: "Highlander",
        color: "Silver",
        verified: true,
        verificationMethod: "photo",
        verificationDate: "2026-01-20T14:30:00Z"
    },
    {
        id: "vehicle_002",
        userId: "user_456",
        licensePlate: "XYZ5678",
        state: "NY",
        vehicleType: VehicleType.TRUCK,
        make: "Ford",
        model: "F-150",
        color: "Blue",
        verified: true,
        verificationMethod: "dmv",
        verificationDate: "2026-01-15T09:15:00Z"
    },
    {
        id: "vehicle_003",
        userId: "user_789",
        licensePlate: "RV12345",
        state: "PA",
        vehicleType: VehicleType.RV,
        make: "Winnebago",
        model: "View",
        color: "White",
        verified: false,
        verificationMethod: "photo"
    }
];

export const SAMPLE_RESERVATIONS: ParkingReservation[] = [
    {
        id: "res_001",
        userId: "user_123",
        userPhone: "+1-555-1234",
        parkingLotId: "lot_001",
        vehicleId: "vehicle_001",
        gameId: "game_001",
        gameDate: "2026-09-13",
        kickoffTime: "2026-09-13T13:00:00-04:00",
        reservationDate: "2026-08-15T16:45:00Z",
        status: ReservationStatus.CONFIRMED,
        pricing: {
            basePrice: 75.00,
            processingFee: 5.00,
            totalPrice: 80.00,
            currency: "USD"
        },
        paymentStatus: PaymentStatus.COMPLETED,
        paymentId: "pi_1234567890",
        confirmationCode: "GT8X42M9",
        qrCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
        cancellationPolicy: "Full refund if cancelled 48 hours before game",
        cancellationDeadline: "2026-09-11T13:00:00-04:00",
        createdAt: "2026-08-15T16:45:00Z",
        updatedAt: "2026-08-15T16:45:30Z"
    },
    {
        id: "res_002",
        userId: "user_456",
        userPhone: "+1-555-5678",
        parkingLotId: "lot_002",
        vehicleId: "vehicle_002",
        gameId: "game_002",
        gameDate: "2026-09-20",
        kickoffTime: "2026-09-20T16:25:00-04:00",
        reservationDate: "2026-09-10T10:20:00Z",
        status: ReservationStatus.CONFIRMED,
        pricing: {
            basePrice: 45.00,
            processingFee: 3.50,
            totalPrice: 48.50,
            currency: "USD"
        },
        paymentStatus: PaymentStatus.COMPLETED,
        paymentId: "pi_0987654321",
        confirmationCode: "PK5N91W7",
        qrCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
        cancellationPolicy: "50% refund if cancelled 24 hours before game",
        cancellationDeadline: "2026-09-19T16:25:00-04:00",
        createdAt: "2026-09-10T10:20:00Z",
        updatedAt: "2026-09-10T10:20:45Z"
    }
];

export const SAMPLE_SEARCH_CRITERIA: ParkingSearchCriteria = {
    gameId: "game_001",
    maxPrice: 100.00,
    tailgatingRequired: true,
    grillsRequired: true,
    vehicleType: VehicleType.SUV,
    maxWalkTime: 15,
    sortBy: "distance",
    sortOrder: "asc"
};