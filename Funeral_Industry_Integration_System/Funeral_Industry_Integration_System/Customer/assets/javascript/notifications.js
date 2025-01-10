import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    orderBy,
    getDocs,
    doc,
    updateDoc,
    getDoc,
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

// Format relative time
function formatRelativeTime(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return date.toLocaleDateString();
}

// Get notification icon based on type
function getNotificationIcon(type) {
    switch(type) {
        case 'payment_success':
            return '<i class="fas fa-check-circle"></i>';
        case 'appointment_approved':
            return '<i class="fas fa-calendar-check"></i>';
        case 'appointment_rejected':
            return '<i class="fas fa-calendar-times"></i>';
        case 'appointment_reminder':
            return '<i class="fas fa-bell"></i>';
        case 'feedback_submitted':
            return '<i class="fas fa-star"></i>';
        default:
            return '<i class="fas fa-info-circle"></i>';
    }
}

// Add this function to check for new appointment notifications
async function checkNewAppointmentNotifications(customerId) {
    try {
        // Get all approved appointments
        const appointmentsRef = collection(db, "appointment");
        const appointmentsQuery = query(
            appointmentsRef,
            where("customerID", "==", customerId),
            where("appointment_status", "==", "Approved")
        );

        const appointmentsSnapshot = await getDocs(appointmentsQuery);

        for (const appointmentDoc of appointmentsSnapshot.docs) {
            const appointment = appointmentDoc.data();
            
            // Check if notification exists
            const notificationsRef = collection(db, "customer_notification");
            const notificationQuery = query(
                notificationsRef,
                where("customerId", "==", customerId),
                where("appointmentId", "==", appointment.appointmentID),
                where("type", "==", "appointment_approved")
            );
            
            const existingNotifications = await getDocs(notificationQuery);
            
            // Create notification if none exists
            if (existingNotifications.empty) {
                const providerDoc = await getDoc(doc(db, "service_provider", appointment.serviceProviderID));
                const providerName = providerDoc.exists() ? providerDoc.data().provider_companyName : "your service provider";

                const notificationId = `CNOT${Date.now()}${Math.floor(Math.random() * 1000)}`;
                const notificationData = {
                    notificationID: notificationId,
                    customerId: customerId,
                    type: "appointment_approved",
                    title: "Appointment Approved",
                    message: `Your appointment with ${providerName} for ${appointment.appointment_date} at ${appointment.appointment_time} has been approved.`,
                    timestamp: new Date().toISOString(),
                    isRead: false,
                    appointmentId: appointment.appointmentID
                };

                await setDoc(doc(db, "customer_notification", notificationId), notificationData);
                console.log("Created new appointment notification:", appointment.appointmentID);
            }
        }
    } catch (error) {
        console.error("Error checking new notifications:", error);
    }
}

// Add this function to check for upcoming appointments and create reminders
async function checkUpcomingAppointmentReminders(customerId) {
    try {
        // Get all approved appointments
        const appointmentsRef = collection(db, "appointment");
        const appointmentsQuery = query(
            appointmentsRef,
            where("customerID", "==", customerId),
            where("appointment_status", "==", "Approved")
        );

        const appointmentsSnapshot = await getDocs(appointmentsQuery);

        for (const appointmentDoc of appointmentsSnapshot.docs) {
            const appointment = appointmentDoc.data();
            const appointmentDate = new Date(appointment.appointment_date);
            const today = new Date();
            
            // Calculate days until appointment
            const daysUntil = Math.ceil((appointmentDate - today) / (1000 * 60 * 60 * 24));
            
            // Check if it's 3, 2, or 1 day before the appointment
            if (daysUntil > 0 && daysUntil <= 3) {
                // Check if reminder already exists for this day
                const notificationsRef = collection(db, "customer_notification");
                const reminderQuery = query(
                    notificationsRef,
                    where("customerId", "==", customerId),
                    where("appointmentId", "==", appointment.appointmentID),
                    where("type", "==", "appointment_reminder"),
                    where("daysUntil", "==", daysUntil)
                );
                
                const existingReminders = await getDocs(reminderQuery);
                
                // Create reminder if none exists for this day
                if (existingReminders.empty) {
                    const providerDoc = await getDoc(doc(db, "service_provider", appointment.serviceProviderID));
                    const providerName = providerDoc.exists() ? providerDoc.data().provider_companyName : "your service provider";

                    const notificationId = `CNOT${Date.now()}${Math.floor(Math.random() * 1000)}`;
                    const notificationData = {
                        notificationID: notificationId,
                        customerId: customerId,
                        type: "appointment_reminder",
                        title: "Upcoming Appointment Reminder",
                        message: `Reminder: Your appointment with ${providerName} is in ${daysUntil} day${daysUntil > 1 ? 's' : ''} (${appointment.appointment_date} at ${appointment.appointment_time}).`,
                        timestamp: new Date().toISOString(),
                        isRead: false,
                        appointmentId: appointment.appointmentID,
                        daysUntil: daysUntil
                    };

                    await setDoc(doc(db, "customer_notification", notificationId), notificationData);
                    console.log(`Created ${daysUntil}-day reminder for appointment:`, appointment.appointmentID);
                }
            }
        }
    } catch (error) {
        console.error("Error checking appointment reminders:", error);
    }
}

// Load notifications
async function loadNotifications() {
    try {
        const customerId = localStorage.getItem('custId');
        console.log("Loading notifications for customer:", customerId);
        
        if (!customerId) {
            console.log("No customer ID found, redirecting to login");
            window.location.href = '/Funeral_Industry_Integration_System/Login_Register/customer_login.html';
            return;
        }

        // Check for new approval notifications
        await checkNewAppointmentNotifications(customerId);
        
        // Check for upcoming appointment reminders
        await checkUpcomingAppointmentReminders(customerId);

        // Then load all notifications
        const notificationsRef = collection(db, "customer_notification");
        const q = query(
            notificationsRef, 
            where("customerId", "==", customerId),
            orderBy("timestamp", "desc")
        );
        
        console.log("Fetching notifications...");
        const querySnapshot = await getDocs(q);
        console.log("Found notifications:", querySnapshot.size);

        const notificationsList = document.getElementById('notificationsList');
        const emptyState = document.getElementById('emptyState');

        if (querySnapshot.empty) {
            console.log("No notifications found");
            notificationsList.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        let notificationsHTML = '';

        querySnapshot.forEach((doc) => {
            const notification = doc.data();
            console.log("Processing notification:", notification);
            
            notificationsHTML += `
                <div class="notification-item ${!notification.isRead ? 'unread' : ''}" 
                     data-id="${notification.notificationID}">
                    <div class="notification-icon">
                        ${getNotificationIcon(notification.type)}
                    </div>
                    <div class="notification-content">
                        <p class="notification-message">
                            <strong>${notification.title}</strong><br>
                            ${notification.message}
                        </p>
                        <span class="notification-time">
                            ${formatRelativeTime(notification.timestamp)}
                        </span>
                    </div>
                </div>
            `;
        });

        if (notificationsList) {
            notificationsList.innerHTML = notificationsHTML;
            console.log("Notifications HTML updated");

            // Add click handlers for notifications
            document.querySelectorAll('.notification-item').forEach(item => {
                item.addEventListener('click', () => markAsRead(item.dataset.id));
            });
        } else {
            console.error("Notifications list element not found");
        }

    } catch (error) {
        console.error("Error loading notifications:", error);
        console.error("Error details:", error.message);
    }
}

// Mark notification as read
async function markAsRead(notificationId) {
    try {
        const notificationRef = doc(db, "customer_notification", notificationId);
        await updateDoc(notificationRef, {
            isRead: true
        });

        // Update UI
        const notificationElement = document.querySelector(`[data-id="${notificationId}"]`);
        if (notificationElement) {
            notificationElement.classList.remove('unread');
        }
    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
}

// Mark all notifications as read
async function markAllAsRead() {
    try {
        const customerId = localStorage.getItem('custId');
        const notificationsRef = collection(db, "customer_notification");
        const q = query(
            notificationsRef, 
            where("customerId", "==", customerId),
            where("isRead", "==", false)
        );
        
        const querySnapshot = await getDocs(q);
        
        const updatePromises = querySnapshot.docs.map(doc => 
            updateDoc(doc.ref, { isRead: true })
        );
        
        await Promise.all(updatePromises);

        // Update UI
        document.querySelectorAll('.notification-item.unread').forEach(item => {
            item.classList.remove('unread');
        });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
    }
}

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("Document loaded, initializing notifications");
    loadNotifications();  // Call loadNotifications instead of searchNotificationsByCustomerId

    // Add click handler for "Mark all as read" button
    const markAllReadBtn = document.getElementById('markAllRead');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllAsRead);
    }
});
  