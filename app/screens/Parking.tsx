import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { SAMPLE_STADIUMS } from '@/dummyData/parking';
import { Stadium } from '@/types/parking';
import { Theme, useTheme, useThemedStyles } from '@/theme';
import { MapPin, ChevronRight, Search } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

const ParkingScreen = () => {
    const navigation = useNavigation<any>();
    const { colors } = useTheme();
    const styles = useThemedStyles(makeStyles);

    const renderHeader = () => (
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Explore Stadiums</Text>
            <TouchableOpacity style={styles.searchButton}>
                <Search size={20} color={colors.textSecondary} />
                <Text style={styles.searchText}>Search stadiums or teams...</Text>
            </TouchableOpacity>
        </View>
    );

    const renderStadiumItem = ({ item }: { item: Stadium }) => (
        <TouchableOpacity
            style={styles.stadiumCard}
            onPress={() => navigation.navigate('StadiumDetail', { stadium: item })}
        >
            <Image source={{ uri: item.image }} style={styles.stadiumImage} />
            <View style={styles.stadiumInfo}>
                <View style={styles.nameRow}>
                    <Text style={styles.stadiumName}>{item.name}</Text>
                    <ChevronRight size={20} color={colors.textMuted} />
                </View>
                <View style={styles.locationRow}>
                    <MapPin size={14} color={colors.textSecondary} />
                    <Text style={styles.stadiumLocation}>{item.location}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                ListHeaderComponent={renderHeader}
                data={SAMPLE_STADIUMS}
                renderItem={renderStadiumItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
};

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    headerTitle: {
        ...typography.h2,
        color: colors.text,
        marginBottom: 16,
    },
    searchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.inputBackground,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 10,
    },
    searchText: {
        ...typography.body,
        marginLeft: 10,
        color: colors.placeholder,
    },
    listContent: {
        paddingBottom: 30,
    },
    stadiumCard: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        marginHorizontal: 20,
        marginBottom: 20,
        shadowColor: colors.shadow,
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 5,
        overflow: 'hidden',
    },
    stadiumImage: {
        width: '100%',
        height: 180,
    },
    stadiumInfo: {
        padding: 16,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    stadiumName: {
        ...typography.h3,
        color: colors.text,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stadiumLocation: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginLeft: 4,
    },
});

export default ParkingScreen;
