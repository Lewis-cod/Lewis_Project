// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit
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

// Add these functions at the top after Firebase initialization
function isWeekend(dateString) {
    const date = new Date(dateString);
    const day = date.getDay(); // 0 is Sunday, 6 is Saturday
    return day === 0 || day === 6;
}

function updateTimeSlots(dateString) {
    const timeSelect = document.querySelector('select[name="select-appointment-time"]');
    const isWeekendDay = isWeekend(dateString);
    
    // Clear existing options
    timeSelect.innerHTML = '';
    
    // Add available slots based on day
    if (isWeekendDay) {
        // Weekend slots
        timeSelect.innerHTML = `
            <option value="1">9am - 11am (Slot 1)</option>
            <option value="2">12pm - 2pm (Slot 2)</option>
        `;
    } else {
        // Weekday slots
        timeSelect.innerHTML = `
            <option value="1">9am - 11am (Slot 1)</option>
            <option value="2">12pm - 2pm (Slot 2)</option>
            <option value="3">3pm - 5pm (Slot 3)</option>
        `;
    }
}

// Add this after Firebase initialization
async function loadServiceProviders() {
    try {
        const serviceProvidersRef = collection(db, "service_provider");
        const q = query(serviceProvidersRef, where("partner_Status", "==", "approved"));
        const querySnapshot = await getDocs(q);
        
        const providerSelect = document.getElementById('serviceProvider');
        providerSelect.innerHTML = '<option value="">Select Service Provider</option>';

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const option = document.createElement('option');
            option.value = data.provider_ID;
            option.textContent = `${data.provider_companyName} (${data.business_state})`;
            providerSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading service providers:", error);
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log("DOM Content Loaded");
    const form = document.getElementById('appointmentForm');
    
    // Load service providers
    await loadServiceProviders();
    
    // Set up date restrictions
    const dateInput = document.querySelector('input[type="date"]');
    
    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get date 31 days from tomorrow
    const thirtyOneDaysLater = new Date();
    thirtyOneDaysLater.setDate(tomorrow.getDate() + 31);
    
    // Format dates to YYYY-MM-DD
    const tomorrowFormatted = tomorrow.toISOString().split('T')[0];
    const thirtyOneDaysLaterFormatted = thirtyOneDaysLater.toISOString().split('T')[0];
    
    // Set min and max attributes
    dateInput.min = tomorrowFormatted;
    dateInput.max = thirtyOneDaysLaterFormatted;

    // Add event listener for date input to update time slots
    dateInput.addEventListener('change', function(e) {
        updateTimeSlots(e.target.value);
    });

    // Set initial time slots based on default date (if any)
    if (dateInput.value) {
        updateTimeSlots(dateInput.value);
    }

    // Check if logged in using custId
    const custId = localStorage.getItem('custId');
    console.log("Customer ID:", custId);
    
    if (!custId) {
        window.location.href = '/Funeral_Industry_Integration_System/Login_Register/customer_login.html';
        return;
    }

    // Get customer data using custId
    try {
        const custRef = doc(db, "customer", custId);
        const custDoc = await getDoc(custRef);
        console.log("Customer Doc:", custDoc);

        if (custDoc.exists()) {
            const data = custDoc.data();
            console.log("Customer Data:", data);
            
            // Populate form fields with customer data
            document.getElementById('fullName').value = data.cust_name;
            document.getElementById('email').value = data.cust_email;
        } else {
            console.log("No customer document found");
        }
    } catch (error) {
        console.error("Error loading customer data:", error);
        alert("Error loading customer data");
    }

    // Form submit handler
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            // Add service provider validation
            const serviceProviderId = document.getElementById('serviceProvider').value;
            if (!serviceProviderId) {
                alert('Please select a service provider');
                return;
            }

            // Check for pending or approved appointments
            const appointmentsRef = collection(db, "appointment");
            const q = query(
                appointmentsRef, 
                where("customerID", "==", custId),
                where("appointment_status", "in", ["Pending", "Approved"])
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Get the existing appointment details
                const existingAppointment = querySnapshot.docs[0].data();
                
                // Show pending appointment overlay
                const overlay = document.getElementById('pendingOverlay');
                const detailsDiv = document.getElementById('pendingAppointmentDetails');
                detailsDiv.innerHTML = `
                    <div class="pending-details">
                        <p><strong>Appointment ID:</strong> ${existingAppointment.appointmentID}</p>
                        <p><strong>Date:</strong> ${existingAppointment.appointment_date}</p>
                        <p><strong>Time:</strong> ${existingAppointment.appointment_time}</p>
                        <p><strong>Status:</strong> ${existingAppointment.appointment_status}</p>
                        <p class="warning-text">You cannot make a new appointment while you have an ${existingAppointment.appointment_status.toLowerCase()} appointment. Please wait for your current appointment to be completed or cancel it before making a new appointment.</p>
                    </div>
                `;
                overlay.style.display = 'flex';
                return;
            }

            // If no pending or approved appointments, continue with the normal appointment creation
            const formData = {
                customerID: custId,
                serviceProviderID: serviceProviderId,
                appointment_date: document.querySelector('input[type="date"]').value,
                appointment_time: document.querySelector('select[name="select-appointment-time"]').options[document.querySelector('select[name="select-appointment-time"]').selectedIndex].text,
                appointment_status: "Pending"
            };

            // Validate date
            if (!formData.appointment_date) {
                alert('Please select a date');
                return;
            }

            // Show confirmation overlay with appointment details
            const overlay = document.getElementById('confirmationOverlay');
            const detailsDiv = document.getElementById('appointmentDetails');
            detailsDiv.innerHTML = `
                <p><strong>Name:</strong> ${document.getElementById('fullName').value}</p>
                <p><strong>Email:</strong> ${document.getElementById('email').value}</p>
                <p><strong>Date:</strong> ${formData.appointment_date}</p>
                <p><strong>Time:</strong> ${formData.appointment_time}</p>
            `;
            overlay.style.display = 'flex';

            // Handle confirm button click
            document.getElementById('confirmBtn').onclick = async () => {
                try {
                    // Generate unique appointment ID only when confirming
                    const appointmentId = await generateUniqueAppointmentId();
                    formData.appointmentID = appointmentId;

                    // Get service provider name
                    const providerSelect = document.getElementById('serviceProvider');
                    const selectedProviderName = providerSelect.options[providerSelect.selectedIndex].text;

                    // Save appointment to Firestore
                    await setDoc(doc(db, "appointment", appointmentId), formData);

                    // Create notification
                    const notificationId = await generateNotificationId();
                    const notificationData = {
                        notificationID: notificationId,
                        customerId: custId,
                        type: "appointment_request",
                        title: "Appointment Request Submitted",
                        message: `Your appointment request with ${selectedProviderName} for ${formData.appointment_date} at ${formData.appointment_time} has been submitted successfully.`,
                        timestamp: new Date().toISOString(),
                        isRead: false,
                        appointmentId: appointmentId
                    };

                    // Save notification to Firestore
                    await setDoc(doc(db, "customer_notification", notificationId), notificationData);

                    // Create receipt data
                    const receiptData = {
                        appointmentID: appointmentId,
                        customerName: document.getElementById('fullName').value,
                        customerEmail: document.getElementById('email').value,
                        appointment_date: formData.appointment_date,
                        appointment_time: formData.appointment_time,
                        serviceProvider: selectedProviderName
                    };

                    // Store for receipt page
                    localStorage.setItem('appointmentData', JSON.stringify(receiptData));

                    // Hide overlay
                    overlay.style.display = 'none';

                    // Redirect to receipt page
                    window.location.href = '/Funeral_Industry_Integration_System/Customer/appointment_receipt.html';
                } catch (error) {
                    console.error("Error saving appointment:", error);
                    alert("Error saving appointment. Please try again.");
                }
            };

            // Handle cancel button click
            document.getElementById('cancelBtn').onclick = () => {
                overlay.style.display = 'none';
            };
        } catch (error) {
            console.error("Error checking pending appointments:", error);
            alert("Error checking appointment status. Please try again.");
        }
    });

    // Close overlay when clicking outside
    window.onclick = function(event) {
        const overlay = document.getElementById('confirmationOverlay');
        if (event.target === overlay) {
            overlay.style.display = 'none';
        }
    };
});

async function generateUniqueAppointmentId() {
    try {
        // Get all appointments
        const appointmentsRef = collection(db, "appointment");
        const querySnapshot = await getDocs(appointmentsRef);
        let maxNumber = 0;

        // Find the highest number
        querySnapshot.forEach((doc) => {
            const currentId = doc.data().appointmentID || ''; // Get the appointmentID field
            if (currentId.startsWith('AP')) {
                const numberStr = currentId.replace('AP', '');
                const number = parseInt(numberStr);
                if (!isNaN(number) && number > maxNumber) {
                    maxNumber = number;
                }
            }
        });

        // Generate the next number
        const nextNumber = maxNumber + 1;
        // Format to AP0001
        const formattedId = `AP${nextNumber.toString().padStart(4, '0')}`;
        
        // Verify if this ID already exists (double-check)
        const existingDoc = await getDoc(doc(db, "appointment", formattedId));
        if (existingDoc.exists()) {
            throw new Error('Duplicate ID generated');
        }

        return formattedId;
    } catch (error) {
        console.error("Error generating appointment ID:", error);
        throw error;
    }
}

function closeModal() {
    const modal = document.getElementById('appointmentModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('appointmentForm').reset();
    }
}

// Close modal if clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('appointmentModal');
    if (modal && event.target == modal) {
        modal.style.display = 'none';
    }
}

// Close overlay if clicking outside
window.onclick = function(event) {
    const overlay = document.getElementById('confirmationOverlay');
    if (event.target === overlay) {
        overlay.style.display = 'none';
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