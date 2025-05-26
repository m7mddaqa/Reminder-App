import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, Platform, Text, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';
import * as Notifications from 'expo-notifications';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export default function SetReminder({ route, navigation }) {
    const [text, setText] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const reminderId = route.params?.id;

    useEffect(() => {
        requestNotificationPermissions();
        setupNotificationListeners();
    }, []);

    const setupNotificationListeners = () => {
        // Handle notification received while app is in foreground
        const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
            const { reminderId } = notification.request.content.data;
            if (reminderId) {
                updateReminderStatus(reminderId, 'completed');
            }
        });

        // Handle notification response (when user taps notification)
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            const { reminderId } = response.notification.request.content.data;
            if (reminderId) {
                updateReminderStatus(reminderId, 'completed');
                // Check if we can navigate
                if (navigation && navigation.canGoBack()) {
                    navigation.goBack();
                } else {
                    // If we can't go back, navigate to Home screen
                    navigation.navigate('Home');
                }
            }
        });

        // Cleanup subscriptions
        return () => {
            receivedSubscription.remove();
            responseSubscription.remove();
        };
    };

    const updateReminderStatus = async (reminderId, status) => {
        try {
            const token = await AsyncStorage.getItem('token');
            await api.patch(`/reminders/${reminderId}`, 
                { status, completed: true },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            console.error('Error updating reminder status:', error);
        }
    };

    const requestNotificationPermissions = async () => {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please enable notifications to receive reminders.');
        }
    };

    const saveReminder = async () => {
        if (!text.trim()) {
            Alert.alert('Missing Title', 'Please enter a title for your reminder.');
            return;
        }
        if (date < new Date()) {
            Alert.alert('Invalid Date', 'You cannot set a reminder in the past.');
            return;
        }
        try {
            const token = await AsyncStorage.getItem('token');
            const reminderData = {
                title: text,
                dueDate: date,
                status: 'pending'
            };

            let savedReminder;
            if (reminderId) {
                // Update existing reminder
                savedReminder = await api.patch(`/reminders/${reminderId}`, reminderData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                // Create new reminder
                savedReminder = await api.post('/reminders', reminderData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            // Schedule notification
            await scheduleNotification({
                ...reminderData,
                id: savedReminder.data._id
            });

            // Navigate to home screen
            navigation.navigate('Home');
        } catch (e) {
            console.error('Error saving reminder:', e);
            Alert.alert('Error', 'Failed to save reminder. Please try again.');
        }
    };

    const scheduleNotification = async (reminderData) => {
        try {
            // Cancel any existing notification for this reminder
            if (reminderId) {
                await Notifications.cancelScheduledNotificationAsync(reminderId);
            }

            // Schedule new notification
            const trigger = new Date(reminderData.dueDate);
            const identifier = await Notifications.scheduleNotificationAsync({
                content: {
                    title: reminderData.title,
                    body: 'Time for your reminder!',
                    data: { reminderId: reminderData.id },
                },
                trigger,
            });

            return identifier;
        } catch (error) {
            console.error('Error scheduling notification:', error);
            throw error;
        }
    };

    const onChangeDate = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const newDate = new Date(date);
            newDate.setFullYear(selectedDate.getFullYear());
            newDate.setMonth(selectedDate.getMonth());
            newDate.setDate(selectedDate.getDate());
            setDate(newDate);
        }
    };

    const onChangeTime = (event, selectedTime) => {
        setShowTimePicker(false);
        if (selectedTime) {
            const newDate = new Date(date);
            newDate.setHours(selectedTime.getHours());
            newDate.setMinutes(selectedTime.getMinutes());
            setDate(newDate);
        }
    };

    return (
        <View style={styles.container}>
            <TextInput
                placeholder="Enter reminder..."
                value={text}
                onChangeText={setText}
                style={styles.input}
            />
            <Button title="Pick Date" onPress={() => setShowDatePicker(true)} />
            <Button title="Pick Time" onPress={() => setShowTimePicker(true)} />
            {showDatePicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={onChangeDate}
                />
            )}
            {showTimePicker && (
                <DateTimePicker
                    value={date}
                    mode="time"
                    display="default"
                    onChange={onChangeTime}
                />
            )}
            <Text style={{ marginTop: 10 }}>Selected: {date.toLocaleString()}</Text>
            <Button title={reminderId ? "Update Reminder" : "Save Reminder"} onPress={saveReminder} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20 },
    input: {
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 10,
        padding: 10,
        borderRadius: 6,
    },
});
