import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs,
    onSnapshot 
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

// Function to wait for element
function waitForElement(selector) {
    return new Promise(resolve => {
        if (document.getElementById('notificationBadge')) {
            return resolve(document.getElementById('notificationBadge'));
        }

        const observer = new MutationObserver(mutations => {
            if (document.getElementById('notificationBadge')) {
                observer.disconnect();
                resolve(document.getElementById('notificationBadge'));
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

// Function to update badge
async function updateBadge(count) {
    console.log("Updating badge with count:", count);
    const badge = await waitForElement('notificationBadge');
    if (badge) {
        console.log("Badge element found");
        badge.textContent = count;
        badge.style.display = count > 0 ? 'block' : 'none';
    } else {
        console.log("Badge element not found");
    }
}

// Function to check notifications
async function checkNotifications(custId) {
    console.log("Checking notifications for customer:", custId);
    try {
        const notificationsRef = collection(db, "customer_notification");
        const q = query(
            notificationsRef,
            where("customerId", "==", custId),
            where("isRead", "==", false)
        );

        const querySnapshot = await getDocs(q);
        const count = querySnapshot.size;
        console.log("Found unread notifications:", count);
        await updateBadge(count);
        return count;
    } catch (error) {
        console.error("Error checking notifications:", error);
        return 0;
    }
}

// Function to setup real-time notifications
function setupNotificationListener(custId) {
    console.log("Setting up notification listener for customer:", custId);
    try {
        const notificationsRef = collection(db, "customer_notification");
        const q = query(
            notificationsRef,
            where("customerId", "==", custId),
            where("isRead", "==", false)
        );

        return onSnapshot(q, async (snapshot) => {
            const count = snapshot.size;
            console.log("Real-time notification update, count:", count);
            await updateBadge(count);
        }, (error) => {
            console.error("Error in notification listener:", error);
        });
    } catch (error) {
        console.error("Error setting up notification listener:", error);
    }
}

// Initialize notifications when the page loads and header is ready
async function initializeNotifications() {
    console.log("Waiting for header to load...");
    await waitForElement('notificationBadge');
    console.log("Header loaded, initializing notifications");
    
    const custId = localStorage.getItem('custId');
    console.log("Customer ID from localStorage:", custId);
    
    if (custId) {
        await checkNotifications(custId);
        setupNotificationListener(custId);
    } else {
        console.log("No customer ID found in localStorage");
    }
}

// Start initialization when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeNotifications();
}); 