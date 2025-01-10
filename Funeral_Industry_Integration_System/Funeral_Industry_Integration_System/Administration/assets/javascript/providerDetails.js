import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    collection, 
    getDocs, 
    getDoc, 
    updateDoc, 
    serverTimestamp,
    query,
    where,
    setDoc,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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

// ID Generation Functions
async function generateStatusID() {
    try {
        const statusRef = collection(db, "application_status");
        const querySnapshot = await getDocs(statusRef);
        
        let maxNumber = 0;
        querySnapshot.forEach(doc => {
            const statusID = doc.data().status_ID;
            if (statusID?.startsWith('AS')) {
                const number = parseInt(statusID.slice(2));
                if (!isNaN(number) && number > maxNumber) {
                    maxNumber = number;
                }
            }
        });

        return `AS${(maxNumber + 1).toString().padStart(4, '0')}`;
    } catch (error) {
        console.error("Error generating status ID:", error);
        throw error;
    }
}


// Data Retrieval Functions
export async function showProviderList() {
    try {
        const providersRef = collection(db, 'service_provider');
        const querySnapshot = await getDocs(providersRef);
        
        // use Map to store each provider's latest record
        const providerMap = new Map();
        
        // update statistics
        let total = 0;
        let active = 0;
        let pending = 0;
        let rejected = 0;
        
        // get all providers' latest status
        for (const providerDoc of querySnapshot.docs) {
            const providerData = providerDoc.data();
            
            // get latest application_status
            const statusRef = collection(db, "application_status");
            const statusQuery = query(statusRef, 
                where("provider_ID", "==", providerDoc.id)
            );
            const statusSnapshot = await getDocs(statusQuery);
            
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

            // store each provider's latest record
            if (!providerMap.has(providerData.provider_ID)) {
                providerMap.set(providerData.provider_ID, {
                    providerDoc,
                    providerData,
                    latestStatus,
                    timestamp: latestTimestamp
                });
                total++;
            }
        }
        
        const tableBody = document.getElementById('providerTableBody');
        tableBody.innerHTML = '';
        
        // show latest record
        for (const [_, data] of providerMap) {
            const { providerDoc, providerData, latestStatus } = data;
            
            // update statistics
            const partnerStatus = latestStatus?.partner_Status?.toLowerCase() || 'pending';
            switch(partnerStatus) {
                case 'approved': active++; break;
                case 'pending': pending++; break;
                case 'rejected': rejected++; break;
            }
            
            // create table row
            const row = document.createElement('tr');
            row.setAttribute('data-provider-id', providerDoc.id);
            
            // use application_status status
            const statusClass = `status-badge ${partnerStatus}`;
            const accountStatusClass = `status-badge ${providerData.provider_Status?.toLowerCase() || 'active'}`;
            
            row.innerHTML = `
                <td>${providerData.provider_ID}</td>
                <td>${providerData.provider_companyName}</td>
                <td><span class="${statusClass}">${latestStatus?.partner_Status || 'Pending'}</span></td>
                <td>${providerData.provider_email}</td>
                <td><span class="${accountStatusClass}">${providerData.provider_Status || 'Active'}</span></td>
                <td>${new Date(providerData.created_At).toLocaleDateString()}</td>
            `;
            
            tableBody.appendChild(row);
        }
        
        // update statistics card
        document.querySelector('.card:nth-child(1) .card-inner p').textContent = 'Total Partners';
        document.querySelector('.card:nth-child(2) .card-inner p').textContent = 'Active Partners';
        document.querySelector('.card:nth-child(3) .card-inner p').textContent = 'Pending Partners';
        document.querySelector('.card:nth-child(4) .card-inner p').textContent = 'Rejected Partners';
        
        document.getElementById('totalProviders').textContent = total;
        document.getElementById('activeProviders').textContent = active;
        document.getElementById('pendingProviders').textContent = pending;
        document.getElementById('rejectedProviders').textContent = rejected;
        
    } catch (error) {
        console.error("Error fetching providers: ", error);
    }
}

export async function getProviderDetails(providerId) {
    try {
        const docRef = doc(db, 'service_provider', providerId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Get provider documents
            const documents = await getProviderDocuments(providerId);
            data.documents = documents;
            
            // Get payment information
            const paymentInfo = await getPaymentInformation(providerId);
            data.payment = paymentInfo;
            
            displayProviderDetails(data);
            return data;
        } else {
            console.log("No such provider!");
            return null;
        }
    } catch (error) {
        console.error("Error getting provider details: ", error);
        return null;
    }
}

async function getPaymentInformation(providerId) {
    try {
        const paymentsRef = collection(db, "payments");
        const q = query(paymentsRef, 
            where("providerID", "==", providerId),
            where("payment_type", "==", "Membership")
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            // get latest payment record
            let latestPayment = null;
            let latestTimestamp = 0;
            
            querySnapshot.forEach((doc) => {
                const paymentData = doc.data();
                const timestamp = new Date(`${paymentData.payment_date} ${paymentData.payment_time}`).getTime();
                if (timestamp > latestTimestamp) {
                    latestPayment = paymentData;
                    latestTimestamp = timestamp;
                }
            });
            
            return latestPayment;
        }
        return null;
    } catch (error) {
        console.error("Error getting payment information:", error);
        return null;
    }
}

function displayProviderDetails(data) {
    // Company Information
    document.getElementById('companyName').textContent = data.provider_companyName || '';
    document.getElementById('businessLicense').textContent = data.business_License || '';
    document.getElementById('serviceType').textContent = data.service_Type || '';
    document.getElementById('businessState').textContent = data.business_state || '';
    document.getElementById('registrationDate').textContent = data.created_At ? new Date(data.created_At).toLocaleDateString() : '';

    // Contact Information
    document.getElementById('email').textContent = data.provider_email || '';
    document.getElementById('phone').textContent = data.provider_Contact || '';
    document.getElementById('address').textContent = data.business_Address || '';

    // Payment Information
    if (data.payment) {
        document.getElementById('paymentStatus').textContent = data.payment.payment_status || 'N/A';
        document.getElementById('paymentDate').textContent = 
            `${data.payment.payment_date} ${data.payment.payment_time}` || 'N/A';
        document.getElementById('paymentAmount').textContent = 
            `RM ${data.payment.payment_amount}` || 'N/A';
        document.getElementById('paymentMethod').textContent = data.payment.payment_method || 'N/A';
        document.getElementById('paymentId').textContent = data.payment.paymentID || 'N/A';
        document.getElementById('cardLastFour').textContent = 
            data.payment.card_last_four ? `**** **** **** ${data.payment.card_last_four}` : 'N/A';
    } else {
        // if no payment information, show "Not paid"
        const paymentFields = ['paymentStatus', 'paymentDate', 'paymentAmount', 
                             'paymentMethod', 'paymentId', 'cardLastFour'];
        paymentFields.forEach(field => {
            document.getElementById(field).textContent = 'Not paid';
        });
    }

    // Documents section
    const documents = document.getElementById('documents');
    if (data.documents && data.documents.length > 0) {
        const documentsList = data.documents.map(doc => `
            <div class="document-item" >
                <span class="material-symbols-outlined">description</span>
                <a href="${doc.document_URL}" target="_blank">
                    ${doc.document_Name} (${doc.document_Type === 'business_license' ? 'Business License' : 'Document'})
                </a>
                <div class="document-status" style="display: flex; justify-content: flex-end; margin-left: 20px;">
                    <span class="status-badge ${doc.partner_Status?.toLowerCase()}" >${doc.partner_Status}</span>
                </div>
            </div>
        `).join('');
        documents.innerHTML = documentsList;
    } else {
        documents.innerHTML = '<p>No documents uploaded</p>';
    }

    // block approval section
    const approvalSection = document.querySelector('.approval-section');
    if (approvalSection) {
        approvalSection.style.display = 'block';
    }

    // update account status
    const accountStatusBadge = document.getElementById('accountStatus');
    const toggleAccountBtn = document.getElementById('toggleAccountStatus');
    
    if (accountStatusBadge && toggleAccountBtn) {
        // update status label
        accountStatusBadge.className = `status-badge ${data.provider_Status?.toLowerCase() || 'active'}`;
        accountStatusBadge.textContent = data.provider_Status || 'Active';
        
        // update toggle button
        toggleAccountBtn.className = `status-toggle-btn ${data.provider_Status === 'Active' ? 'deactivate' : 'activate'}`;
        toggleAccountBtn.textContent = data.provider_Status === 'Active' ? 'Deactivate Account' : 'Activate Account';
        
        // add click event
        toggleAccountBtn.onclick = async () => {
            const newStatus = data.provider_Status === 'Active' ? 'Inactive' : 'Active';
            const confirmed = confirm(`Are you sure you want to ${newStatus === 'Active' ? 'activate' : 'deactivate'} this account?`);
            if (confirmed) {
                await updateAccountStatus(data.provider_ID, newStatus);
            }
        };
    }
}

async function getProviderDocuments(providerId) {
    try {
        const docsRef = collection(db, "document");
        const q = query(docsRef, where("provider_ID", "==", providerId));
        const querySnapshot = await getDocs(q);
        
        const documents = [];
        for (const docSnapshot of querySnapshot.docs) {
            const docData = docSnapshot.data();
            
            try {
                // get all related status records
                const statusRef = collection(db, "application_status");
                const statusQuery = query(statusRef, 
                    where("document_ID", "==", docData.document_ID)
                );
                const statusSnapshot = await getDocs(statusQuery);
                
                // get latest status record
                let latestStatus = null;
                let latestTimestamp = 0;
                
                statusSnapshot.forEach((statusDoc) => {
                    const statusData = statusDoc.data();
                    const timestamp = statusData.created_At?.toMillis() || 0;
                    if (timestamp > latestTimestamp) {
                        latestStatus = statusData;
                        latestTimestamp = timestamp;
                    }
                });

                // build document object
                const documentObj = {
                    document_ID: docData.document_ID,
                    document_Type: docData.document_Type,
                    document_Name: docData.document_Name,
                    document_URL: docData.document_URL,
                    created_At: docData.created_At,
                    updated_At: docData.updated_At,
                    url: docData.document_URL,
                    name: docData.document_Name,
                    type: docData.document_Type === 'business_license' ? 'license' : 'document',
                    partner_Status: latestStatus ? latestStatus.partner_Status : 'pending',
                    rejection_Reason: latestStatus ? latestStatus.rejection_Reason : '',
                    previous_status: latestStatus ? latestStatus.previous_status : null,
                    status_history: statusSnapshot.docs.map(doc => ({
                        status: doc.data().partner_Status,
                        date: doc.data().created_At,
                        reason: doc.data().rejection_Reason
                    })).sort((a, b) => b.date?.toMillis() - a.date?.toMillis())
                };
                
                documents.push(documentObj);
            } catch (error) {
                console.error(`Error processing document ${docData.document_ID}:`, error);
            }
        }
        
        return documents;
    } catch (error) {
        console.error("Error getting provider documents:", error);
        return [];
    }
}

// Status Update Functions
export async function updateProviderStatus(providerId, applicationStatus, reason = '') {
    try {
        const providerRef = doc(db, 'service_provider', providerId);
        
        // update service_provider status
        const updateData = {
            partner_Status: applicationStatus,
            updated_At: serverTimestamp()
        };
        
        if (applicationStatus === 'rejected') {
            updateData.rejection_Reason = reason;
        }
        
        await updateDoc(providerRef, updateData);

        // get document record
        const docsRef = collection(db, "document");
        const q = query(docsRef, where("provider_ID", "==", providerId));
        const querySnapshot = await getDocs(q);
        
        let latestDoc = null;
        let latestTimestamp = 0;
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const timestamp = data.created_At?.toMillis() || 0;
            if (timestamp > latestTimestamp) {
                latestDoc = data;
                latestTimestamp = timestamp;
            }
        });
        
        if (latestDoc) {
            // get corresponding application_status
            const statusRef = collection(db, "application_status");
            const statusQuery = query(statusRef, 
                where("document_ID", "==", latestDoc.document_ID),
                where("provider_ID", "==", providerId)
            );
            const statusSnapshot = await getDocs(statusQuery);
            
            if (!statusSnapshot.empty) {
                const statusDoc = statusSnapshot.docs[0];
                const oldStatus = statusDoc.data();

                // create new status record not updating old record
                const newStatusID = await generateStatusID();
                const statusData = {
                    status_ID: newStatusID,
                    document_ID: latestDoc.document_ID,
                    provider_ID: providerId,
                    document_Status: applicationStatus,
                    partner_Status: applicationStatus,
                    reviewer_ID: localStorage.getItem('userId'),
                    review_Date: serverTimestamp(),
                    created_At: serverTimestamp(),
                    updated_At: serverTimestamp(),
                    rejection_Reason: reason || null,
                    previous_status: oldStatus.partner_Status, // save previous status
                    previous_status_id: oldStatus.status_ID   // save previous status ID
                };

                // create new status record
                await setDoc(doc(db, "application_status", newStatusID), statusData);

                // show success message
                alert(`Application has been successfully ${applicationStatus.toLowerCase()}`);
                return true;
            }
        }
    } catch (error) {
        console.error("Error updating provider status: ", error);
        alert(`Error updating status: ${error.message}`);
        return false;
    }
}

// add new account status update function
async function updateAccountStatus(providerId, status) {
    try {
        const providerRef = doc(db, 'service_provider', providerId);
        
        await updateDoc(providerRef, {
            provider_Status: status,
            updated_At: serverTimestamp()
        });

        alert(`Account has been successfully ${status === 'Active' ? 'activated' : 'deactivated'}`);
        await getProviderDetails(providerId);
        return true;
    } catch (error) {
        console.error("Error updating account status:", error);
        alert(`Failed to update status: ${error.message}`);
        return false;
    }
}

// Event Handlers
function handleApproveClick(providerId) {
    return async () => {
        if (await updateProviderStatus(providerId, 'approved')) {
            // hide rejection reason input
            const rejectionDiv = document.querySelector('.rejection-reason');
            if (rejectionDiv) {
                rejectionDiv.style.display = 'none';
            }
            // refresh provider details
            await getProviderDetails(providerId);
        }
    };
}

function handleRejectClick(providerId) {
    return () => {
        // show rejection reason input
        const rejectionDiv = document.querySelector('.rejection-reason');
        const rejectionInput = document.getElementById('rejectionReason');
        if (rejectionDiv && rejectionInput) {
            rejectionDiv.style.display = 'block';
            rejectionInput.value = '';
        }
    };
}

function handleSubmitRejection(providerId) {
    return async () => {
        const rejectionInput = document.getElementById('rejectionReason');
        if (!rejectionInput || !rejectionInput.value.trim()) {
            alert('Please provide a rejection reason');
            return;
        }
        
        if (await updateProviderStatus(providerId, 'rejected', rejectionInput.value)) {
            // hide rejection reason input
            const rejectionDiv = document.querySelector('.rejection-reason');
            if (rejectionDiv) {
                rejectionDiv.style.display = 'none';
            }
            // refresh provider details
            await getProviderDetails(providerId);
        }
    };
}

// Page Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // initialize list page
    const providerTableBody = document.getElementById('providerTableBody');
    if (providerTableBody) {
        await showProviderList();
        
        // add table row click event
        providerTableBody.addEventListener('click', function(e) {
            const row = e.target.closest('tr');
            if (row) {
                const providerId = row.getAttribute('data-provider-id');
                if (providerId) {
                    window.location.href = `/Funeral_Industry_Integration_System/Administration/admin_dashboard/providerDetailsPage.html?id=${providerId}`;
                }
            }
        });
    }

    // initialize details page
    const urlParams = new URLSearchParams(window.location.search);
    const providerId = urlParams.get('id');
    if (providerId) {
        await getProviderDetails(providerId);

        // Add approve button event listener
        const approveBtn = document.getElementById('approveBtn');
        if (approveBtn) {
            approveBtn.addEventListener('click', handleApproveClick(providerId));
        }

        // Add reject button event listener
        const rejectBtn = document.getElementById('rejectBtn');
        if (rejectBtn) {
            rejectBtn.addEventListener('click', handleRejectClick(providerId));
        }

        // Add submit rejection button event listener
        const submitRejectionBtn = document.getElementById('submitRejection');
        if (submitRejectionBtn) {
            submitRejectionBtn.addEventListener('click', handleSubmitRejection(providerId));
        }
    }
});