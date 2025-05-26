import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function CustomHeader() {
    return (
        <View style={styles.header}>
            <Text style={styles.title}>Reminder App</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        height: 90,
        backgroundColor: '#4a90e2',
        paddingTop: 40,
        paddingHorizontal: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
});

export default CustomHeader;
