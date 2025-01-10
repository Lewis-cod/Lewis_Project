// Firebase Configuration and Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA3QJpuhNnEtDivnLXc2BsX2ltcJ87bDHY",
    authDomain: "funeral-integrationsyste-3988c.firebaseapp.com",
    projectId: "funeral-integrationsyste-3988c",
    storageBucket: "funeral-integrationsyste-3988c.firebasestorage.app",
    messagingSenderId: "449055794833",
    appId: "1:449055794833:web:b68ec0d31dba9b77ce8130",
    measurementId: "G-25GELPQ29Y"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper Functions
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        if (dateString.toDate) {
            return dateString.toDate().toISOString().split('T')[0];
        }
        if (dateString.includes('T')) {
            return dateString.split('T')[0];
        }
        if (dateString.includes('Z')) {
            return dateString.split('Z')[0].split('T')[0];
        }
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return '-';
        }
        return date.toISOString().split('T')[0];
    } catch (error) {
        console.error('Date formatting error:', error);
        return '-';
    }
}

// UI Update Functions
function updatePartnershipStatus(status) {
    const statusProgress = document.getElementById('applicationStatus');
    if (!statusProgress) return;

    statusProgress.classList.remove('pending', 'approved', 'rejected');
    
    if (!status || status === 'Not Submitted') {
        statusProgress.classList.add('not-submitted');
        statusProgress.querySelector('.status-text').textContent = 'Not Submitted';
        return;
    }
    
    let currentStatus = status.toLowerCase();
    statusProgress.classList.add(currentStatus);
    const displayStatus = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);
    statusProgress.querySelector('.status-text').textContent = displayStatus;
}

function updateTimeline(data) {
    const submittedStep = document.getElementById('submittedStep');
    const reviewStep = document.getElementById('reviewStep');
    const decisionStep = document.getElementById('decisionStep');

    // clear all active classes
    submittedStep.classList.remove('active');
    reviewStep.classList.remove('active');
    decisionStep.classList.remove('active');

    // if no document_ID, show as not submitted
    if (!data.document_ID) {
        document.getElementById('submittedDate').textContent = '-';
        document.getElementById('reviewDate').textContent = '-';
        document.getElementById('decisionDate').textContent = '-';
        return;
    }

    // if there is document_ID, show as submitted
    if (data.created_At) {
        submittedStep.classList.add('active');
        document.getElementById('submittedDate').textContent = formatDate(data.created_At);
        
        // if review date or updated date is available, show as review
        if (data.review_Date || data.updated_At) {
            reviewStep.classList.add('active');
            document.getElementById('reviewDate').textContent = formatDate(data.review_Date || data.updated_At);
            
            // if there is final decision, show as decision
            if (data.partner_Status && (data.partner_Status.toLowerCase() === 'rejected' || data.partner_Status.toLowerCase() === 'approved')) {
                decisionStep.classList.add('active');
                const statusText = data.partner_Status.charAt(0).toUpperCase() + data.partner_Status.slice(1);
                document.getElementById('decisionDate').textContent = `${statusText} (${formatDate(data.updated_At)})`;
            }
        }
    }
}

function updatePartnershipInfo(data) {
    const additionalInfoElement = document.getElementById('additionalInfo');
    if (!additionalInfoElement) return;

    // if no document_ID, show as not submitted
    if (!data.document_ID) {
        additionalInfoElement.innerHTML = `
            <div class="pending-info">
                <p>You haven't submitted any documents yet.</p>
                <p>Please submit your business license through the Join Our Platform Plan to start the application process.</p>
            </div>`;
        return;
    }

    const partnerStatus = data.partner_Status?.toLowerCase();

    switch(partnerStatus) {
        case 'rejected':
            additionalInfoElement.innerHTML = `
                <div class="rejection-info">
                    <h4>Rejection Reason:</h4>
                    <p>${data.rejection_Reason || 'No reason provided'}</p>
                    <div class="mt-3">
                        <p>You can submit a new application after addressing the issues mentioned above.</p>
                    </div>
                </div>`;
            break;
        case 'approved':
            additionalInfoElement.innerHTML = `
                <div class="approval-info">
                    <h4>Welcome to the Funeral Industry Integration Platform!</h4>
                    <p>Your application has been approved. </p>
                    <p>Please proceed to the first page to pay for your membership.</p>
                    <p>After that you can now start managing your services.</p>
                </div>`;
            break;
        case 'pending':
            additionalInfoElement.innerHTML = `
                <div class="pending-info">
                    <p>Your application is under review.</p>
                    <p>We will notify you once there is an update.</p>
                    <p>Estimated review time: 3-5 business days</p>
                </div>`;
            break;
        default:
            additionalInfoElement.innerHTML = `
                <div class="pending-info">
                    <p>Please complete your document submission to proceed with the application.</p>
                    <p>Submit your documents through the Join Our Platform Plan.</p>
                </div>`;
            break;  
    }
}

// Data Functions
async function fetchPartnershipStatus() {
    try {
        const providerID = localStorage.getItem('providerID');
        if (!providerID) {
            console.error('No provider ID found');
            window.location.href = '/Funeral_Industry_Integration_System/startingPage.html';
            return;
        }

        // use real-time listening
        onSnapshot(doc(db, "service_provider", providerID), async (providerDoc) => {
            if (providerDoc.exists()) {
                const providerData = providerDoc.data();
                document.getElementById('companyName').textContent = providerData.provider_companyName || '-';
                
                try {
                    // get latest application status
                    const statusRef = collection(db, "application_status");
                    const statusQuery = query(statusRef, 
                        where("provider_ID", "==", providerID)
                    );
                    const statusSnapshot = await getDocs(statusQuery);
                    
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

                    if (latestStatus) {
                        updatePartnershipStatus(latestStatus.partner_Status);
                        updateTimeline(latestStatus);
                        updatePartnershipInfo(latestStatus);
                        
                        document.getElementById('applicationDate').textContent = formatDate(latestStatus.created_At);
                        document.getElementById('lastUpdated').textContent = formatDate(latestStatus.updated_At);
                    } else {
                        updatePartnershipStatus('Not Submitted');
                        updateTimeline({});
                        updatePartnershipInfo({});
                    }
                } catch (error) {
                    console.error('Error getting status:', error);
                    throw error;
                }
            }
        });
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('additionalInfo').innerHTML = `
            <div class="error-message">
                Failed to load partnership status. Error: ${error.message}
            </div>`;
    }
}

// Page Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchPartnershipStatus();
});
