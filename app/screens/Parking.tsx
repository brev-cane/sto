import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { SAMPLE_STADIUMS } from '@/dummyData/parking';
import { Stadium } from '@/types/parking';
import COLORS from '@/app/components/colors';
import { MapPin, ChevronRight, Search } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

const ParkingScreen = () => {
    const navigation = useNavigation<any>();

    const renderHeader = () => (
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Explore Stadiums</Text>
            <TouchableOpacity style={styles.searchButton}>
                <Search size={20} color="#6B7280" />
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
                    <ChevronRight size={20} color="#D1D5DB" />
                </View>
                <View style={styles.locationRow}>
                    <MapPin size={14} color="#6B7280" />
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 16,
    },
    searchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 10,
    },
    searchText: {
        marginLeft: 10,
        color: '#9CA3AF',
        fontSize: 15,
    },
    listContent: {
        paddingBottom: 30,
    },
    stadiumCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginHorizontal: 20,
        marginBottom: 20,
        shadowColor: '#000',
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
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stadiumLocation: {
        fontSize: 14,
        color: '#6B7280',
        marginLeft: 4,
    },
});

export default ParkingScreen;

