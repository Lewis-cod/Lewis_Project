import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc, updateDoc, collection, getDocs, query, where, addDoc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

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
const storage = getStorage(app);


// generate document ID
async function generateDocumentID() {
    try {
        const docsRef = collection(db, "document");
        const querySnapshot = await getDocs(docsRef);
        
        let maxNumber = 0;
        querySnapshot.forEach(doc => {
            const docID = doc.data().document_ID;
            if (docID?.startsWith('DOT')) {
                const number = parseInt(docID.slice(3));
                if (number > maxNumber) maxNumber = number;
            }
        });

        return `DOT${(maxNumber + 1).toString().padStart(3, '0')}`;
    } catch (error) {
        console.error("Error generating document ID:", error);
        throw error;
    }
}

// generate notification ID
async function generateNotificationID() {
    try {
        const notificationsRef = collection(db, "notifications");
        const querySnapshot = await getDocs(notificationsRef);
        
        let maxNumber = 0;
        querySnapshot.forEach(doc => {
            const notID = doc.data().notification_ID;
            if (notID?.startsWith('NOT')) {
                const number = parseInt(notID.slice(3));
                if (!isNaN(number) && number > maxNumber) {
                    maxNumber = number;
                }
            }
        });

        return `NOT${(maxNumber + 1).toString().padStart(3, '0')}`;
    } catch (error) {
        console.error("Error generating notification ID:", error);
        throw error;
    }
}

// create notification
async function createNotification(providerId, status, reason = '') {
    try {
        const notificationID = await generateNotificationID();
        
        await setDoc(doc(db, "notifications", notificationID), {
            notification_ID: notificationID,
            recipient_ID: providerId,
            type: "status_update",
            status: status,
            reason: reason,
            created_At: serverTimestamp(),
            read: false
        });

        console.log(`Notification created with ID: ${notificationID}`);
        return notificationID;
    } catch (error) {
        console.error("Error creating notification:", error);
        throw error;
    }   
}

// generate status ID
async function generateStatusID() {
    try {
        const statusRef = collection(db, "application_status");
        const querySnapshot = await getDocs(statusRef);
        
        let maxNumber = 0;
        querySnapshot.forEach(doc => {
            const statusID = doc.data().status_ID;
            if (statusID?.startsWith('AS')) {
                const number = parseInt(statusID.slice(4));
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

// save document info to database
async function saveDocumentInfo(documentID, providerID, fileURL, fileName) {
    try {
        const timestamp = serverTimestamp();
        
        // save document info
        await setDoc(doc(db, "document", documentID), {
            document_ID: documentID,
            document_Type: "business_license",
            document_Name: fileName,
            document_URL: fileURL,
            provider_ID: providerID,
            created_At: timestamp,
            updated_At: timestamp
        });

        // generate new status ID
        const statusID = await generateStatusID();
        
        // create initial status record
        await setDoc(doc(db, "application_status", statusID), {
            status_ID: statusID,
            document_ID: documentID,
            provider_ID: providerID,
            document_Status: "pending",
            partner_Status: "pending",
            created_At: timestamp,
            updated_At: timestamp
        });

        // create notification
        await createNotification(providerID, "pending");

        return true;
    } catch (error) {
        console.error("Error saving document info:", error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('documentUploadForm');
    const fileInput = document.getElementById('documentInput');
    const fileName = document.querySelector('.file-name');
    const progressDiv = document.querySelector('.upload-progress');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                fileName.textContent = e.target.files[0].name;
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const selectedFile = fileInput.files[0];
            if (!selectedFile) {
                alert('Please select a file to upload!');
                return;
            }

            const providerID = localStorage.getItem('providerID');
            if (!providerID) {
                alert('Please login first!');
                return;
            }

            try {
                progressDiv.style.display = 'block';
                
                // generate new document ID
                const documentID = await generateDocumentID();
                
                // use document ID as part of file name
                const fileExtension = selectedFile.name.split('.').pop();
                const newFileName = `${documentID}.${fileExtension}`;
                
                // create file reference
                const fileRef = ref(storage, `business_licenses/${providerID}/${newFileName}`);
                
                // upload file
                await uploadBytes(fileRef, selectedFile);
                
                // get download URL
                const downloadURL = await getDownloadURL(fileRef);
                
                // update Firestore database
                await saveDocumentInfo(documentID, providerID, downloadURL, selectedFile.name);

                alert('File uploaded successfully!');
                
                // reset form
                form.reset();
                fileName.textContent = '';
                progressDiv.style.display = 'none';
                
                // redirect to dashboard
                window.location.href = '/Funeral_Industry_Integration_System/Service_Provider/serviceProviderDashboardPage.html';
                
            } catch (error) {
                console.error('Upload error:', error);
                alert('Upload failed: ' + error.message);
                progressDiv.style.display = 'none';
            }
        });
    }
});

// export functions for other modules
export {
    generateDocumentID,
    db,
    storage
};