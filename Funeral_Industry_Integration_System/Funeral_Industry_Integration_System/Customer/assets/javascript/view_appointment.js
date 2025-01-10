import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs,
    doc,
    getDoc,
    updateDoc,
    orderBy,
    limit,
    setDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA3QJpuhNnEtDivnLXc2BsX2ltcJ87bDHY",
    authDomain: "funeral-integrationsyste-3988c.firebaseapp.com",
    projectId: "funeral-integrationsyste-3988c",
    storageBucket: "funeral-integrationsyste-3988c.firebasestorage.app",
    messagingSenderId: "449055794833",
    appId: "1:449055794833:web:b68ec0d31dba9b77ce8130",
    measurementId: "G-25GELPQ29Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Add this function to get service provider name
async function getServiceProviderName(providerId) {
    try {
        const providerDoc = await getDoc(doc(db, "service_provider", providerId));
        if (providerDoc.exists()) {
            return providerDoc.data().provider_companyName;
        }
        return "Unknown Provider";
    } catch (error) {
        console.error("Error fetching provider name:", error);
        return "Unknown Provider";
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    const custId = localStorage.getItem('custId');
    if (!custId) {
        window.location.href = 'customer_login.html';
        return;
    }

    try {
        // Get appointments for the current user
        const appointmentsRef = collection(db, "appointment");
        const q = query(appointmentsRef, where("customerID", "==", custId));
        const querySnapshot = await getDocs(q);

        const appointmentsList = document.getElementById('appointmentsList');
        const noAppointments = document.getElementById('noAppointments');

        if (querySnapshot.empty) {
            appointmentsList.style.display = 'none';
            noAppointments.style.display = 'block';
        } else {
            appointmentsList.style.display = 'grid';
            noAppointments.style.display = 'none';

            // Use Promise.all to handle all async card creations
            const cards = await Promise.all(
                querySnapshot.docs.map(doc => createAppointmentCard(doc.data()))
            );
            
            cards.forEach(card => appointmentsList.appendChild(card));
        }

        // Hide loader
        document.querySelector('.loader-container').style.display = 'none';

    } catch (error) {
        console.error("Error fetching appointments:", error);
        alert("Error loading appointments. Please try again.");
    }
});

// Updated function to properly parse time
function isWithin24Hours(appointmentDate, appointmentTime) {
    try {
        // Extract the start time (e.g., from "9am - 11am (Slot 1)")
        const timeMatch = appointmentTime.match(/(\d+)(?:am|pm)/i);
        if (!timeMatch) return true; // If can't parse time, assume within 24h for safety
        
        let hour = parseInt(timeMatch[1]);
        const isPM = appointmentTime.toLowerCase().includes('pm');
        
        // Convert to 24-hour format
        if (isPM && hour !== 12) hour += 12;
        if (!isPM && hour === 12) hour = 0;
        
        // Create appointment date with correct time
        const appointmentDateTime = new Date(appointmentDate);
        appointmentDateTime.setHours(hour, 0, 0, 0);
        
        // Get current time
        const now = new Date();
        
        // Calculate time difference in hours
        const diffInHours = (appointmentDateTime - now) / (1000 * 60 * 60);
        
        console.log('Appointment time:', appointmentDateTime);
        console.log('Current time:', now);
        console.log('Hours difference:', diffInHours);
        
        return diffInHours <= 24;
    } catch (error) {
        console.error('Error calculating time difference:', error);
        return true; // If there's an error, assume within 24h for safety
    }
}

// Update the createAppointmentCard function to handle rejected status
async function createAppointmentCard(appointment) {
    const card = document.createElement('div');
    card.className = `appointment-card status-${appointment.appointment_status.toLowerCase()}`;

    const statusClass = `status-${appointment.appointment_status.toLowerCase()}`;
    
    // Get provider name
    const providerName = await getServiceProviderName(appointment.serviceProviderID);
    
    // Check if appointment can be cancelled
    const within24Hours = appointment.appointment_status === 'Approved' && 
                         isWithin24Hours(appointment.appointment_date, appointment.appointment_time);
    
    // Add status icon based on status
    const getStatusIcon = (status) => {
        switch(status) {
            case 'Approved': return '<span class="status-icon">✓</span>';
            case 'Completed': return '<span class="status-icon">✓✓</span>';
            case 'Rejected': return '<span class="status-icon">✕</span>';
            default: return '';
        }
    };

    card.innerHTML = `
        <div class="appointment-header">
            <span class="appointment-id">${appointment.appointmentID}</span>
            <span class="appointment-status ${statusClass}">
                ${getStatusIcon(appointment.appointment_status)}
                ${appointment.appointment_status}
            </span>
        </div>
        <div class="appointment-details">
            <div class="detail-item">
                <span class="detail-label">Service Provider</span>
                <span class="detail-value">${providerName}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Date</span>
                <span class="detail-value">${formatDate(appointment.appointment_date)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Time</span>
                <span class="detail-value">${appointment.appointment_time}</span>
            </div>
            ${shouldShowCancelButton(appointment, within24Hours)}
        </div>
    `;

    return card;
}

// Add this helper function to determine if cancel button should be shown
function shouldShowCancelButton(appointment, within24Hours) {
    // Don't show cancel button for these statuses
    const nonCancellableStatuses = ['Cancelled', 'Completed', 'Rejected'];
    
    if (nonCancellableStatuses.includes(appointment.appointment_status)) {
        return '';
    }

    return within24Hours ? 
        `<div class="detail-item">
            <p class="cancel-notice">Cannot cancel appointment within 24 hours of scheduled time</p>
        </div>` :
        `<div class="detail-item">
            <button class="btn-cancel-appointment" onclick="showCancelConfirmation('${appointment.appointmentID}', '${appointment.appointment_date}', '${appointment.appointment_time}')">
                Cancel Appointment
            </button>
        </div>`;
}

function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

window.showCancelConfirmation = function(appointmentId, date, time) {
    const overlay = document.getElementById('cancelOverlay');
    const detailsDiv = document.getElementById('cancelAppointmentDetails');
    
    detailsDiv.innerHTML = `
        <p><strong>Appointment ID:</strong> ${appointmentId}</p>
        <p><strong>Date:</strong> ${formatDate(date)}</p>
        <p><strong>Time:</strong> ${time}</p>
    `;
    
    overlay.style.display = 'flex';
    
    // Store the appointment ID for the cancel confirmation
    overlay.dataset.appointmentId = appointmentId;
};

// Add this function to generate notification ID
async function generateNotificationId() {
    try {
        const notificationRef = collection(db, "customer_notification");
        const q = query(notificationRef, orderBy("notificationID", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        
        let nextNumber = 1;
        
        if (!querySnapshot.empty) {
            // Get the last notification ID
            const lastNotification = querySnapshot.docs[0].data();
            const lastNumber = parseInt(lastNotification.notificationID.substring(4));
            nextNumber = lastNumber + 1;
        }
        
        // Format the new notification ID with leading zeros
        return `CNOT${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
        console.error("Error generating notification ID:", error);
        throw error;
    }
}

// Update the cancel confirmation handler
document.getElementById('confirmCancelBtn').onclick = async function() {
    const overlay = document.getElementById('cancelOverlay');
    const appointmentId = overlay.dataset.appointmentId;
    
    try {
        // Get appointment details for the notification
        const appointmentRef = doc(db, "appointment", appointmentId);
        const appointmentDoc = await getDoc(appointmentRef);
        const appointmentData = appointmentDoc.data();

        // Get service provider name
        const providerName = await getServiceProviderName(appointmentData.serviceProviderID);

        // Update the appointment status in Firestore
        await updateDoc(appointmentRef, {
            appointment_status: "Cancelled"
        });

        // Create notification
        const notificationId = await generateNotificationId();
        const notificationData = {
            notificationID: notificationId,
            customerId: appointmentData.customerID,
            type: "appointment_cancelled",
            title: "Appointment Cancelled",
            message: `Your appointment with ${providerName} for ${appointmentData.appointment_date} at ${appointmentData.appointment_time} has been cancelled.`,
            timestamp: new Date().toISOString(),
            isRead: false,
            appointmentId: appointmentId
        };

        // Save notification to Firestore
        await setDoc(doc(db, "customer_notification", notificationId), notificationData);

        // Refresh the page to show updated status
        location.reload();
    } catch (error) {
        console.error("Error cancelling appointment:", error);
        alert("Error cancelling appointment. Please try again.");
    }
};

// Handle cancel button click
document.getElementById('cancelCancelBtn').onclick = function() {
    document.getElementById('cancelOverlay').style.display = 'none';
};

// Close overlay when clicking outside
window.onclick = function(event) {
    const overlay = document.getElementById('cancelOverlay');
    if (event.target === overlay) {
        overlay.style.display = 'none';
    }
}; 