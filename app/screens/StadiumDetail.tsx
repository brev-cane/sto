import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView, Linking, Platform } from 'react-native';
import { SAMPLE_PARKING_LOTS, SAMPLE_GAMES } from '@/dummyData/parking';
import { ParkingLot, Stadium, Game } from '@/types/parking';
import { Theme, useTheme, useThemedStyles } from '@/theme';
import { MapPin, Car, DollarSign, Navigation as NavIcon, Calendar, Trophy, Clock, ChevronLeft } from 'lucide-react-native';
import { useRoute } from '@react-navigation/native';
import { useAppNavigation } from '@/types/navigation';

const StadiumDetailScreen = () => {
    const navigation = useAppNavigation();
    const route = useRoute();
    const { stadium } = route.params as { stadium: Stadium };
    const [activeTab, setActiveTab] = useState<'parking' | 'games'>('parking');
    const { colors } = useTheme();
    const styles = useThemedStyles(makeStyles);

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

    // Header text/icons sit on a dimmed photo, so they stay white in both themes
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
                <NavIcon size={20} color={colors.onPrimary} />
            </TouchableOpacity>
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'parking' && styles.activeTab]}
                onPress={() => setActiveTab('parking')}
            >
                <Car size={18} color={activeTab === 'parking' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.tabText, activeTab === 'parking' && styles.activeTabText]}>Parking</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'games' && styles.activeTab]}
                onPress={() => setActiveTab('games')}
            >
                <Trophy size={18} color={activeTab === 'games' ? colors.primary : colors.textSecondary} />
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
                    <MapPin size={16} color={colors.textSecondary} />
                    <Text style={styles.address}>{item.address.fullAddress}</Text>
                </View>

                <View style={styles.detailsRow}>
                    <View style={styles.badge}>
                        <DollarSign size={14} color={colors.primary} />
                        <Text style={styles.price}>{item.pricing.perGame} / Game</Text>
                    </View>

                    <View style={styles.badge}>
                        <Car size={14} color={colors.textSecondary} />
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
                <Calendar size={16} color={colors.primary} />
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
                    <Clock size={16} color={colors.textSecondary} />
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

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
        ...typography.h2,
        color: '#fff',
        marginBottom: 4,
    },
    stadiumLocationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stadiumAddressHeader: {
        ...typography.body,
        color: '#E5E7EB',
        marginLeft: 6,
    },
    directionsFab: {
        position: 'absolute',
        right: 20,
        bottom: 25,
        backgroundColor: colors.primary,
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: colors.shadow,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: colors.background,
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
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
        backgroundColor: colors.primaryMuted,
        borderWidth: 1,
        borderColor: colors.primaryMuted,
    },
    tabText: {
        ...typography.label,
        marginLeft: 8,
        color: colors.textSecondary,
    },
    activeTabText: {
        color: colors.primary,
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        marginBottom: 20,
        shadowColor: colors.shadow,
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
        ...typography.h3,
        marginBottom: 6,
        color: colors.text,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    address: {
        ...typography.bodySmall,
        color: colors.textSecondary,
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
        backgroundColor: colors.surfaceVariant,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginRight: 10,
    },
    price: {
        ...typography.label,
        color: colors.primary,
        marginLeft: 6,
    },
    spots: {
        ...typography.label,
        color: colors.textSecondary,
        marginLeft: 6,
    },
    distance: {
        ...typography.bodySmall,
        color: colors.textMuted,
        marginTop: 6,
    },
    gameCard: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: colors.shadow,
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
        ...typography.subtitle,
        marginLeft: 10,
        color: colors.text,
    },
    matchupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
        marginBottom: 15,
    },
    teamInfo: {
        flex: 1,
        alignItems: 'center',
    },
    teamName: {
        ...typography.title,
        color: colors.text,
        textAlign: 'center',
    },
    homeLabel: {
        ...typography.caption,
        fontWeight: '900',
        color: colors.primary,
        marginTop: 6,
        letterSpacing: 0.5,
    },
    awayLabel: {
        ...typography.caption,
        fontWeight: '900',
        color: colors.textSecondary,
        marginTop: 6,
        letterSpacing: 0.5,
    },
    vsText: {
        ...typography.subtitle,
        fontWeight: '900',
        color: colors.textMuted,
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
        ...typography.subtitle,
        marginLeft: 10,
        color: colors.textSecondary,
    },
    ticketsButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        shadowColor: colors.primary,
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    ticketsButtonText: {
        ...typography.button,
        fontSize: typography.bodySmall.fontSize,
        color: colors.onPrimary,
    },
    emptyContainer: {
        paddingTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        ...typography.body,
        color: colors.textMuted,
    }
});

export default StadiumDetailScreen;
