const fs = require('fs');
const path = require('path');

const messagesPath = path.join(__dirname, '../frontend/messages/en.json');
const data = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

if (data.ext) {
    const extKeys = Object.keys(data.ext);
    console.log('Total ext keys:', extKeys.length);
    console.log('\nChecking for payment-related keys:');
    const paymentKeys = extKeys.filter(key => key.toLowerCase().includes('payment'));
    console.log('Payment-related keys:', paymentKeys);
    
    console.log('\nChecking for activity-related keys:');
    const activityKeys = extKeys.filter(key => key.toLowerCase().includes('activit'));
    console.log('Activity-related keys:', activityKeys);
    
    // Check if payment_activities exists
    if (data.ext.payment_activities) {
        console.log('\n✓ payment_activities exists with value:', data.ext.payment_activities);
    } else {
        console.log('\n✗ payment_activities does NOT exist in ext namespace');
    }
} else {
    console.log('No ext namespace found');
}