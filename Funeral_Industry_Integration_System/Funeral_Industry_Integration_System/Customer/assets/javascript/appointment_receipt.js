document.addEventListener('DOMContentLoaded', function() {
    const appointmentData = JSON.parse(localStorage.getItem('appointmentData'));
    console.log('Retrieved appointment data:', appointmentData);

    if (appointmentData) {
        console.log('Setting ID:', appointmentData.appointmentID);
        document.getElementById('receiptId').textContent = appointmentData.appointmentID;
        
        console.log('Setting Name:', appointmentData.customerName);
        document.getElementById('receiptName').textContent = appointmentData.customerName;
        
        console.log('Setting Email:', appointmentData.customerEmail);
        document.getElementById('receiptEmail').textContent = appointmentData.customerEmail;
        
        console.log('Setting Date:', appointmentData.appointment_date);
        document.getElementById('receiptDate').textContent = formatDate(appointmentData.appointment_date);
        
        console.log('Setting Time:', appointmentData.appointment_time);
        document.getElementById('receiptTime').textContent = appointmentData.appointment_time;
        
        console.log('Setting Provider:', appointmentData.serviceProvider);
        document.getElementById('receiptProvider').textContent = appointmentData.serviceProvider;

        // Don't remove the data immediately for debugging
        // localStorage.removeItem('appointmentData');
    } else {
        console.log('No appointment data found in localStorage');
        // window.location.href = 'make_appointment.html';
    }
});

function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function printReceipt() {
    window.print();
} 