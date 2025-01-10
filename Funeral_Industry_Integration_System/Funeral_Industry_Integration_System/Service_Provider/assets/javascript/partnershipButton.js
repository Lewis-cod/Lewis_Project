import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Firebase Configuration
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

// Check and redirect function
window.checkAndRedirect = async function() {
    const providerID = localStorage.getItem('providerID');
    if (!providerID) {
        console.log("No providerID found in localStorage");
        return;
    }

    try {
        // check application_status
        const statusRef = collection(db, "application_status");
        const statusQuery = query(statusRef, 
            where("provider_ID", "==", providerID)
        );
        const statusSnapshot = await getDocs(statusQuery);

        // if no application_status record, means not submitted document
        if (statusSnapshot.empty) {
            window.location.href = '/Funeral_Industry_Integration_System/Service_Provider/documentRequirementsPage.html';
            return;
        }

        // get latest status record
        let latestStatus = null;
        let latestTimestamp = 0;
        
        statusSnapshot.forEach((doc) => {
            const data = doc.data();
            const timestamp = data.created_At?.toMillis() || 0;
            if (timestamp > latestTimestamp) {
                latestStatus = data;
                latestTimestamp = timestamp;
            }
        });

        if (!latestStatus) {
            window.location.href = '/Funeral_Industry_Integration_System/Service_Provider/documentRequirementsPage.html';
            return;
        }
        
        switch(latestStatus.partner_Status?.toLowerCase()) {
            case 'pending':
                alert("Your application is under review, please wait patiently.");
                return;
            case 'approved':
                // check if paid
                const paymentQuery = query(
                    collection(db, "payments"),
                    where("providerID", "==", providerID),
                    where("payment_status", "==", "Completed"),
                    where("payment_type", "==", "Membership")
                );
                
                const paymentDocs = await getDocs(paymentQuery);
                if (!paymentDocs.empty) {
                    alert("You have completed the payment!");
                    return;
                }
                
                // if not paid, redirect to payment page
                window.location.href = '/Funeral_Industry_Integration_System/Service_Provider/membershipPaymentPage.html';
                return;
            case 'rejected':
                // rejected user can reapply
                const confirmReapply = confirm("Your last application was rejected. Do you want to reapply?");
                if (confirmReapply) {
                    window.location.href = '/Funeral_Industry_Integration_System/Service_Provider/documentRequirementsPage.html';
                }
                return;
            default:
                window.location.href = '/Funeral_Industry_Integration_System/Service_Provider/documentRequirementsPage.html';
                return;
        }
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred, please try again later.");
    }
}

// button status update
async function updateButtonStatus(button, providerID) {
    if (!button) {
        console.error("Button element not found");
        return;
    }

    try {
        // 检查application_status
        const statusRef = collection(db, "application_status");
        const statusQuery = query(statusRef, 
            where("provider_ID", "==", providerID)
        );
        const statusSnapshot = await getDocs(statusQuery);

        // if no application_status record, display "Join Now"
        if (statusSnapshot.empty) {
            button.textContent = 'Join Now';
            button.disabled = false;
            button.style.backgroundColor = '#4CAF50';
            button.style.cursor = 'pointer';
            return;
        }

        // get latest status record
        let latestStatus = null;
        let latestTimestamp = 0;
        
        statusSnapshot.forEach((doc) => {
            const data = doc.data();
            const timestamp = data.created_At?.toMillis() || 0;
            if (timestamp > latestTimestamp) {
                latestStatus = data;
                latestTimestamp = timestamp;
            }
        });

        if (!latestStatus) {
            button.textContent = 'Join Now';
            button.disabled = false;
            button.style.backgroundColor = '#4CAF50';
            button.style.cursor = 'pointer';
            return;
        }
        
        const status = latestStatus.partner_Status?.toLowerCase();
        
        switch(status) {
            case 'pending':
                button.textContent = 'Under Review';
                button.disabled = true;
                button.style.backgroundColor = '#FFA500';
                button.style.cursor = 'not-allowed';
                break;
            case 'approved':
                // check payment status
                const isPaid = await checkPaymentStatus(providerID);
                if (isPaid) {
                    button.textContent = 'Membership Activated';
                    button.disabled = true;
                    button.style.backgroundColor = '#cccccc';
                    button.style.cursor = 'not-allowed';
                } else {
                    button.textContent = 'Subscribe Now';
                    button.disabled = false;
                    button.style.backgroundColor = '#4CAF50';
                    button.style.cursor = 'pointer';
                }
                break;
            case 'rejected':
                button.textContent = 'Reapply';
                button.disabled = false;
                button.style.backgroundColor = '#4CAF50';
                button.style.cursor = 'pointer';
                break;
            default:
                button.textContent = 'Join Now';
                button.disabled = false;
                button.style.backgroundColor = '#4CAF50';
                button.style.cursor = 'pointer';
        }
    } catch (error) {
        console.error("Error updating button status:", error);
        button.textContent = 'Error';
        button.disabled = true;
        button.style.cursor = 'not-allowed';
    }
}

// check payment status
async function checkPaymentStatus(providerID) {
    try {
        const paymentQuery = query(
            collection(db, "payments"),
            where("providerID", "==", providerID),
            where("payment_status", "==", "Completed"),
            where("payment_type", "==", "Membership")
        );
        
        const paymentDocs = await getDocs(paymentQuery);
        return !paymentDocs.empty;
    } catch (error) {
        console.error("Error checking payment status:", error);
        return false;
    }
}

// check service management status
async function updateSidebarStatus(providerID) {
    const serviceManagementItem = document.getElementById('serviceManagementItem');
    const serviceManagementLink = document.getElementById('serviceManagementLink');
    
    if (!serviceManagementItem || !serviceManagementLink) return;

    const isPaid = await checkPaymentStatus(providerID);
    
    if (!isPaid) {
        serviceManagementItem.classList.add('disabled');
        serviceManagementLink.style.pointerEvents = 'none';
        serviceManagementLink.style.opacity = '0.5';
        serviceManagementLink.title = 'Please complete membership payment to access this feature';
        
        // error message
        serviceManagementItem.onclick = (e) => {
            e.preventDefault();
            alert('Please complete your membership payment to access the Service Management feature.');
        };
    } else {
        serviceManagementItem.classList.remove('disabled');
        serviceManagementLink.style.pointerEvents = 'auto';
        serviceManagementLink.style.opacity = '1';
        serviceManagementLink.title = '';
        serviceManagementItem.onclick = null;
    }
}

// change button status and sidebar status
document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('partnershipButton');
    const providerID = localStorage.getItem('providerID');
    
    if (providerID) {
        if (button) {
            updateButtonStatus(button, providerID);
        }
        // update sidebar status
        updateSidebarStatus(providerID);
    }
}); 