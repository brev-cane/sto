import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView, Linking, Platform } from 'react-native';
import { SAMPLE_PARKING_LOTS, SAMPLE_GAMES } from '@/dummyData/parking';
import { ParkingLot, Stadium, Game } from '@/types/parking';
import COLORS from '@/app/components/colors';
import { MapPin, Car, DollarSign, Navigation as NavIcon, Calendar, Trophy, Clock, ChevronLeft } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

const StadiumDetailScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { stadium } = route.params as { stadium: Stadium };
    const [activeTab, setActiveTab] = useState<'parking' | 'games'>('parking');

    const stadiumParkingLots = SAMPLE_PARKING_LOTS.filter(lot => lot.stadiumId === stadium.id);
    const stadiumGames = SAMPLE_GAMES.filter(game => game.stadiumId === stadium.id);

    const openDirections = () => {
        const { latitude, longitude } = stadium.coordinates;
        const label = stadium.name;
        const url = Platform.select({
            ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
            android: `geo:0,0?q=${latitude},${longitude}(${label})`,
            default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
        });

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                console.warn("Don't know how to open URI: " + url);
            }
        });
    };

    const renderStadiumHeader = () => (
        <View style={styles.headerContainer}>
            <Image source={{ uri: stadium.image }} style={styles.stadiumImage} />
            <View style={styles.overlay} />

            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <ChevronLeft size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.headerTextContainer}>
                <Text style={styles.stadiumNameHeader}>{stadium.name}</Text>
                <View style={styles.stadiumLocationHeader}>
                    <MapPin size={16} color="#E5E7EB" />
                    <Text style={styles.stadiumAddressHeader}>{stadium.location}</Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.directionsFab}
                onPress={openDirections}
            >
                <NavIcon size={20} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'parking' && styles.activeTab]}
                onPress={() => setActiveTab('parking')}
            >
                <Car size={18} color={activeTab === 'parking' ? COLORS.primary : '#6B7280'} />
                <Text style={[styles.tabText, activeTab === 'parking' && styles.activeTabText]}>Parking</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'games' && styles.activeTab]}
                onPress={() => setActiveTab('games')}
            >
                <Trophy size={18} color={activeTab === 'games' ? COLORS.primary : '#6B7280'} />
                <Text style={[styles.tabText, activeTab === 'games' && styles.activeTabText]}>Games</Text>
            </TouchableOpacity>
        </View>
    );

    const renderParkingItem = ({ item }: { item: ParkingLot }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ParkingDetail', { parkingLot: item })}
        >
            <Image source={{ uri: item.images[0] }} style={styles.image} />
            <View style={styles.infoContainer}>
                <Text style={styles.name}>{item.name}</Text>

                <View style={styles.row}>
                    <MapPin size={16} color={'#6B7280'} />
                    <Text style={styles.address}>{item.address.fullAddress}</Text>
                </View>

                <View style={styles.detailsRow}>
                    <View style={styles.badge}>
                        <DollarSign size={14} color={COLORS.primary} />
                        <Text style={styles.price}>{item.pricing.perGame} / Game</Text>
                    </View>

                    <View style={styles.badge}>
                        <Car size={14} color={COLORS.secondary} />
                        <Text style={styles.spots}>{(item as any).availableSpots ?? item.totalSpots} Spots</Text>
                    </View>
                </View>

                <Text style={styles.distance}>
                    {item.distanceToStadium}m to stadium • {item.estimatedWalkTime} min walk
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderGameItem = ({ item }: { item: Game }) => (
        <View style={styles.gameCard}>
            <View style={styles.gameDateContainer}>
                <Calendar size={16} color={COLORS.primary} />
                <Text style={styles.gameDateText}>{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            </View>

            <View style={styles.matchupRow}>
                <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>{item.homeTeam}</Text>
                    <Text style={styles.homeLabel}>HOME</Text>
                </View>
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>{item.opponent}</Text>
                    <Text style={styles.awayLabel}>AWAY</Text>
                </View>
            </View>

            <View style={styles.gameFooter}>
                <View style={styles.timeInfo}>
                    <Clock size={16} color="#6B7280" />
                    <Text style={styles.timeText}>{new Date(item.kickoffTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <TouchableOpacity style={styles.ticketsButton}>
                    <Text style={styles.ticketsButtonText}>Tickets</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {renderStadiumHeader()}
            {renderTabs()}

            <FlatList
                data={(activeTab === 'parking' ? stadiumParkingLots : stadiumGames) as any[]}
                renderItem={(info: any) => activeTab === 'parking' ? renderParkingItem(info) : renderGameItem(info)}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No {activeTab} available for this stadium.</Text>
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    headerContainer: {
        height: 250,
        position: 'relative',
    },
    stadiumImage: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
    },
    headerTextContainer: {
        position: 'absolute',
        bottom: 25,
        left: 20,
        right: 80,
    },
    stadiumNameHeader: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    stadiumLocationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stadiumAddressHeader: {
        fontSize: 16,
        color: '#E5E7EB',
        marginLeft: 6,
    },
    directionsFab: {
        position: 'absolute',
        right: 20,
        bottom: 25,
        backgroundColor: COLORS.primary,
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 18,
        marginRight: 12,
        borderRadius: 25,
    },
    activeTab: {
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    tabText: {
        marginLeft: 8,
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
    },
    activeTabText: {
        color: COLORS.primary,
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 4,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: 160,
        resizeMode: 'cover',
    },
    infoContainer: {
        padding: 16,
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 6,
        color: '#111827',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    address: {
        fontSize: 14,
        color: '#6B7280',
        marginLeft: 6,
        flex: 1,
    },
    detailsRow: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginRight: 10,
    },
    price: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primary,
        marginLeft: 6,
    },
    spots: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
        marginLeft: 6,
    },
    distance: {
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 6,
    },
    gameCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 8,
        elevation: 3,
    },
    gameDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    gameDateText: {
        marginLeft: 10,
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    matchupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        marginBottom: 15,
    },
    teamInfo: {
        flex: 1,
        alignItems: 'center',
    },
    teamName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
    },
    homeLabel: {
        fontSize: 11,
        fontWeight: '900',
        color: COLORS.primary,
        marginTop: 6,
        letterSpacing: 0.5,
    },
    awayLabel: {
        fontSize: 11,
        fontWeight: '900',
        color: '#6B7280',
        marginTop: 6,
        letterSpacing: 0.5,
    },
    vsText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#D1D5DB',
        marginHorizontal: 15,
    },
    gameFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    timeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeText: {
        marginLeft: 10,
        fontSize: 15,
        color: '#4B5563',
        fontWeight: '600',
    },
    ticketsButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    ticketsButtonText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
    },
    emptyContainer: {
        paddingTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#9CA3AF',
        fontWeight: '500',
    }
});

export default StadiumDetailScreen;
