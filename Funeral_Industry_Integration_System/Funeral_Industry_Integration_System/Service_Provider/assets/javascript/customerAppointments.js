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

let currentStatus = 'Pending'; // Track current tab

document.addEventListener('DOMContentLoaded', async () => {
    const providerId = localStorage.getItem('providerID');
    
    if (!providerId) {
        console.log("No provider ID found");
        window.location.href = '/Funeral_Industry_Integration_System/Login_Register/serviceProvider-loginPage.html';
        return;
    }

    // Set up tab click handlers
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update current status and reload appointments
            currentStatus = tab.dataset.status;
            await loadAppointments(providerId);
        });
    });

    console.log("Provider ID:", providerId);
    await updateAppointmentCounters(providerId);
    await loadAppointments(providerId);
});

async function loadAppointments(providerId) {
    const appointmentsGrid = document.getElementById('appointmentsGrid');
    const noAppointmentsMessage = document.getElementById('noAppointmentsMessage');

    try {
        console.log(`Fetching ${currentStatus} appointments for provider:`, providerId);
        
        const q = query(
            collection(db, "appointment"),
            where("serviceProviderID", "==", providerId),
            where("appointment_status", "==", currentStatus)
        );

        const querySnapshot = await getDocs(q);
        appointmentsGrid.innerHTML = ''; // Clear existing appointments

        if (querySnapshot.empty) {
            console.log(`No ${currentStatus.toLowerCase()} appointments found`);
            appointmentsGrid.style.display = 'none';
            noAppointmentsMessage.style.display = 'block';
            return;
        }

        appointmentsGrid.style.display = 'grid';
        noAppointmentsMessage.style.display = 'none';
        
        // Use Promise.all to handle all async card creations
        const cards = await Promise.all(
            querySnapshot.docs.map(doc => createAppointmentCard(doc.data(), doc.id))
        );
        
        appointmentsGrid.innerHTML = '';
        cards.forEach(card => appointmentsGrid.appendChild(card));

    } catch (error) {
        console.error("Error loading appointments:", error);
        appointmentsGrid.innerHTML = `
            <div class="error-message">
                <p>Error loading appointments. Please try again later.</p>
            </div>
        `;
    }
}

async function getCustomerName(customerId) {
    try {
        const customerDoc = await getDoc(doc(db, "customer", customerId));
        if (customerDoc.exists()) {
            return customerDoc.data().cust_name;
        }
        return "Unknown Customer";
    } catch (error) {
        console.error("Error fetching customer name:", error);
        return "Unknown Customer";
    }
}

async function createAppointmentCard(appointment, appointmentId) {
    const card = document.createElement('div');
    card.className = 'appointment-card';
    
    // Get customer name
    const customerName = await getCustomerName(appointment.customerID);
    
    // Only show action buttons for pending appointments
    const actionButtons = currentStatus === 'Pending' ? `
        <div class="appointment-actions">
            <button class="btn-approve" onclick="handleAppointment('${appointmentId}', 'Approved')">
                <span class="material-symbols-outlined">check</span>
                Approve
            </button>
            <button class="btn-reject" onclick="handleAppointment('${appointmentId}', 'Rejected')">
                <span class="material-symbols-outlined">close</span>
                Reject
            </button>
        </div>
    ` : '';

    // Add "Mark as Completed" button for approved appointments
    const completeButton = currentStatus === 'Approved' ? `
        <div class="appointment-actions">
            <button class="btn-complete" onclick="handleAppointment('${appointmentId}', 'Completed')">
                <span class="material-symbols-outlined">task_alt</span>
                <span>Mark as Completed</span>
            </button>
        </div>
    ` : '';

    card.innerHTML = `
        <div class="appointment-header">
            <span class="appointment-id">Appointment ${appointment.appointmentID}</span>
            <span class="appointment-status status-${currentStatus.toLowerCase()}">
                ${currentStatus}
            </span>
        </div>
        <div class="appointment-details">
            <div class="detail-row">
                <span class="detail-label">Customer:</span>
                <span class="detail-value">${customerName}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Customer ID:</span>
                <span class="detail-value">${appointment.customerID}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${formatDate(appointment.appointment_date)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${appointment.appointment_time}</span>
            </div>
        </div>
        ${actionButtons}
        ${completeButton}
    `;
    return card;
}

function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Add this function to show success overlay
function showSuccessOverlay(message) {
    const overlay = document.getElementById('successOverlay');
    const messageElement = document.getElementById('successMessage');
    messageElement.textContent = message;
    overlay.style.display = 'flex';
}

// Add this function to close success overlay
window.closeSuccessOverlay = function() {
    const overlay = document.getElementById('successOverlay');
    overlay.style.display = 'none';
}

// Add this function to count appointments by status
async function updateAppointmentCounters(providerId) {
    try {
        const statuses = ['Pending', 'Approved', 'Cancelled', 'Rejected', 'Completed'];
        const counts = {};

        // Get counts for each status
        await Promise.all(statuses.map(async (status) => {
            const q = query(
                collection(db, "appointment"),
                where("serviceProviderID", "==", providerId),
                where("appointment_status", "==", status)
            );
            const snapshot = await getDocs(q);
            counts[status] = snapshot.size;
        }));

        // Update the tab counters
        statuses.forEach(status => {
            const tab = document.querySelector(`.tab-button[data-status="${status}"]`);
            const counter = document.createElement('span');
            counter.className = 'tab-counter';
            counter.textContent = counts[status];
            
            // Remove existing counter if any
            const existingCounter = tab.querySelector('.tab-counter');
            if (existingCounter) {
                existingCounter.remove();
            }
            
            tab.appendChild(counter);
        });

    } catch (error) {
        console.error("Error updating appointment counters:", error);
    }
}

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

// Update the handleAppointment function
window.handleAppointment = async function(appointmentId, status) {
    const modal = document.getElementById('confirmationModal');
    const message = document.getElementById('confirmationMessage');
    message.textContent = `Are you sure you want to ${status.toLowerCase()} this appointment?`;
    
    modal.style.display = 'flex';
    
    document.getElementById('confirmButton').onclick = async () => {
        try {
            const providerId = localStorage.getItem('providerID');
            
            // Get appointment details
            const appointmentDoc = await getDoc(doc(db, "appointment", appointmentId));
            const appointmentData = appointmentDoc.data();
            
            // Get provider name for the notification
            const providerDoc = await getDoc(doc(db, "service_provider", providerId));
            const providerName = providerDoc.data().provider_companyName;

            // Update appointment status
            await updateDoc(doc(db, "appointment", appointmentId), {
                appointment_status: status
            });

            // Create notification
            const notificationId = await generateNotificationId();
            const notificationData = {
                notificationID: notificationId,
                customerId: appointmentData.customerID,
                type: `appointment_${status.toLowerCase()}`,
                title: `Appointment ${status}`,
                message: `Your appointment with ${providerName} for ${appointmentData.appointment_date} at ${appointmentData.appointment_time} has been ${status.toLowerCase()}.`,
                timestamp: new Date().toISOString(),
                isRead: false,
                appointmentId: appointmentId
            };

            // Save notification to Firestore
            await setDoc(doc(db, "customer_notification", notificationId), notificationData);

            modal.style.display = 'none';
            
            await updateAppointmentCounters(providerId);
            await loadAppointments(providerId);
            
            showSuccessOverlay(`Appointment has been ${status.toLowerCase()} successfully.`);
        } catch (error) {
            console.error("Error updating appointment:", error);
            alert("Error updating appointment status");
        }
    };
    
    document.getElementById('cancelButton').onclick = () => {
        modal.style.display = 'none';
    };
};

// Update the window click handler to handle both modals
window.onclick = function(event) {
    const confirmationModal = document.getElementById('confirmationModal');
    const successOverlay = document.getElementById('successOverlay');
    
    if (event.target === confirmationModal) {
        confirmationModal.style.display = 'none';
    }
    if (event.target === successOverlay) {
        successOverlay.style.display = 'none';
    }
};

// Add this after your other event listeners
document.getElementById('closeModal').onclick = function() {
    document.getElementById('confirmationModal').style.display = 'none';
}; 