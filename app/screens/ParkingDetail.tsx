import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ParkingLot } from '@/types/parking';
import { Theme, useTheme, useThemedStyles } from '@/theme';
import { MapPin, Car, DollarSign, Clock, Shield, Flame, Trash2, Info, ChevronLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ParkingDetailScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { parkingLot } = route.params as { parkingLot: ParkingLot };
    const { colors } = useTheme();
    const styles = useThemedStyles(makeStyles);

    const handleReserve = () => {
        Alert.alert(
            "Confirm Reservation",
            `Do you want to reserve a spot at ${parkingLot.name} for $${parkingLot.pricing.perGame}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reserve",
                    onPress: () => Alert.alert("Success", "Your parking spot has been reserved!")
                }
            ]
        );
    };

    const AmenityItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: boolean }) => (
        <View style={styles.amenityRow}>
            <View
                style={[
                    styles.iconContainer,
                    // hex + alpha suffix gives a subtle tint of the status color
                    { backgroundColor: `${value ? colors.success : colors.error}22` },
                ]}
            >
                <Icon size={18} color={value ? colors.success : colors.error} />
            </View>
            <Text style={styles.amenityLabel}>{label}</Text>
            <Text style={[styles.amenityValue, { color: value ? colors.success : colors.error }]}>
                {value ? 'Available' : 'No'}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{parkingLot.name}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <Image source={{ uri: parkingLot.images[0] }} style={styles.image} />

                <View style={styles.content}>
                    <View style={styles.section}>
                        <Text style={styles.lotName}>{parkingLot.name}</Text>
                        <View style={styles.row}>
                            <MapPin size={16} color={colors.textSecondary} />
                            <Text style={styles.address}>{parkingLot.address.fullAddress}</Text>
                        </View>
                        <View style={styles.statsRow}>
                            <View style={styles.stat}>
                                <Car size={18} color={colors.primary} />
                                <Text style={styles.statText}>{parkingLot.totalSpots} Total Spots</Text>
                            </View>
                            <View style={styles.stat}>
                                <Clock size={18} color={colors.primary} />
                                <Text style={styles.statText}>{parkingLot.estimatedWalkTime} min walk</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Amenities</Text>
                        <AmenityItem icon={Flame} label="Tailgating" value={parkingLot.amenities.tailgatingSpace} />
                        <AmenityItem icon={Info} label="Grills Allowed" value={parkingLot.amenities.grillsAllowed} />
                        <AmenityItem icon={Shield} label="Security" value={parkingLot.amenities.security} />
                        <AmenityItem icon={Trash2} label="Bathrooms" value={parkingLot.amenities.bathrooms} />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Rules & Information</Text>
                        {parkingLot.rules.rules.map((rule, index) => (
                            <View key={index} style={styles.bulletRow}>
                                <View style={styles.bullet} />
                                <Text style={styles.bulletText}>{rule}</Text>
                            </View>
                        ))}
                        <Text style={styles.timingInfo}>
                            {parkingLot.openingTime.description}
                        </Text>
                    </View>

                    <View style={styles.priceSection}>
                        <View>
                            <Text style={styles.priceLabel}>Total Price</Text>
                            <Text style={styles.priceValue}>${parkingLot.pricing.perGame}</Text>
                        </View>
                        <TouchableOpacity style={styles.reserveButton} onPress={handleReserve}>
                            <Text style={styles.reserveButtonText}>Reserve Now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        ...typography.title,
        color: colors.text,
        flex: 1,
        textAlign: 'center',
    },
    image: {
        width: '100%',
        height: 250,
        resizeMode: 'cover',
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    lotName: {
        ...typography.h2,
        color: colors.text,
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    address: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginLeft: 4,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 12,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statText: {
        ...typography.label,
        marginLeft: 8,
        color: colors.textSecondary,
    },
    sectionTitle: {
        ...typography.title,
        color: colors.text,
        marginBottom: 16,
    },
    amenityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    amenityLabel: {
        ...typography.bodySmall,
        flex: 1,
        color: colors.textSecondary,
    },
    amenityValue: {
        ...typography.label,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
        marginTop: 6,
        marginRight: 10,
    },
    bulletText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        lineHeight: 20,
        flex: 1,
    },
    timingInfo: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 12,
    },
    priceSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: colors.separator,
    },
    priceLabel: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    priceValue: {
        ...typography.h2,
        color: colors.primary,
    },
    reserveButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
    },
    reserveButtonText: {
        ...typography.button,
        color: colors.onPrimary,
    },
});

export default ParkingDetailScreen;
