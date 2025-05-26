import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const HomeScreen = ({ navigation, route }) => {
    const [reminders, setReminders] = useState([]);
    const isFocused = useIsFocused();
    const { logout } = useAuth();

    useEffect(() => {
        if (isFocused) {
            loadReminders();
            // Refresh every 2 seconds while screen is focused
            const interval = setInterval(loadReminders, 2000);
            return () => clearInterval(interval);
        }
    }, [isFocused]);

    const loadReminders = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            console.log('Token:', token);
            if (!token) {
                console.log('No token found');
                return;
            }
            console.log('Fetching reminders...');
            const response = await api.get('/reminders', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Reminders response:', response.data);
            setReminders(response.data);
        } catch (e) {
            console.error('Failed to load reminders:', e);
            Alert.alert('Error', 'Failed to load reminders. Please try again.');
        }
    };

    const deleteReminder = (id) => {
        Alert.alert('Delete Reminder', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const token = await AsyncStorage.getItem('token');
                        await api.delete(`/reminders/${id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        loadReminders();
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete reminder.');
                    }
                }
            }
        ]);
    };

    const renderReminder = ({ item }) => (
        <View style={styles.reminderItem}>
            <Text style={styles.reminderText}>{item.title || item.text}</Text>
            <Text style={styles.reminderDate}>Due: {new Date(item.dueDate || item.date).toLocaleString()}</Text>
            <Text style={[
                styles.reminderStatus,
                item.status === 'completed' && styles.completedStatus,
                item.status === 'expired' && styles.expiredStatus
            ]}>
                {item.status === 'completed' ? 'Completed' : 
                 item.status === 'expired' ? 'Expired' : 'Pending'}
            </Text>
            <View style={styles.buttonRow}>
                <TouchableOpacity 
                    style={styles.editButton} 
                    onPress={() => navigation.navigate('SetReminder', { id: item._id })}
                >
                    <Text style={styles.buttonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.deleteButton} 
                    onPress={() => deleteReminder(item._id)}
                >
                    <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={styles.title}>Reminders</Text>
                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('SetReminder')}>
                <Text style={styles.buttonText}>+ Set Reminder 🔔</Text>
            </TouchableOpacity>
            {reminders.length === 0 ? (
                <Text style={styles.noReminder}>No reminders set.</Text>
            ) : (
                <FlatList
                    data={reminders}
                    renderItem={renderReminder}
                    keyExtractor={item => item._id || item.id}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    addButton: {
        backgroundColor: '#4a90e2',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonText: { color: 'white', fontWeight: 'bold' },
    noReminder: { fontSize: 18, color: 'gray', textAlign: 'center', marginTop: 50 },
    list: { paddingBottom: 20 },
    reminderItem: {
        backgroundColor: '#fff',
        padding: 18,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    reminderText: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
    reminderDate: { fontSize: 14, color: '#888', marginBottom: 4 },
    reminderStatus: { 
        fontSize: 14, 
        color: '#4a90e2',
        fontWeight: 'bold'
    },
    completedStatus: {
        color: '#4CAF50'  // Green color for completed
    },
    expiredStatus: {
        color: '#FF5722'  // Orange-red color for expired
    },
    buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    editButton: { backgroundColor: '#ffa500', padding: 8, borderRadius: 8, marginRight: 10 },
    deleteButton: { backgroundColor: '#ff4d4d', padding: 8, borderRadius: 8 },
    logoutButton: { backgroundColor: '#ff4d4d', padding: 8, borderRadius: 8 },
    logoutText: { color: 'white', fontWeight: 'bold' },
});

export default HomeScreen;
