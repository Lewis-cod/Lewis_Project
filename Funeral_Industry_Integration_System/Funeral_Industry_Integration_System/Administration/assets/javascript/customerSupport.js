import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore,
    collection, 
    getDocs, 
    doc, 
    updateDoc,
    query,
    orderBy,
    getDoc,
    Timestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// DOM 
const addQAForm = document.getElementById('addQAForm');
const qaList = document.getElementById('qaList');
const totalQuestionsCount = document.querySelector('.total-questions h1');

// FAQ database
const faqRef = collection(db, "FAQ");

// load all FAQ
async function loadFAQs() {
    try {
        const q = query(faqRef, orderBy("date_Time", "desc"));
        const snapshot = await getDocs(q);
        
        qaList.innerHTML = '';
        let total = 0;

        snapshot.forEach(doc => {
            const faq = doc.data();
            total++;
            
            const faqHtml = `
                <div class="faq-item ${faq.isActive ? 'active' : 'inactive'}">
                    <div class="faq-content">
                        <h3>Question: ${faq.query}</h3>
                        <p style="white-space: pre-wrap;">${faq.response}</p>
                        <div class="faq-meta">
                            <small>Created: ${new Date(faq.date_Time.toDate()).toLocaleString()}</small>
                            <small>Status: ${faq.isActive ? 'Active' : 'Inactive'}</small>
                        </div>
                    </div>
                    <div class="faq-actions">
                        <button onclick="editFAQ('${doc.id}')" class="edit-btn" title="Edit">
                            <span class="material-symbols-outlined">edit</span>
                            Edit
                        </button>
                        <button onclick="toggleFAQ('${doc.id}')" class="toggle-btn" title="${faq.isActive ? 'Disable' : 'Enable'}">
                            <span class="material-symbols-outlined">${faq.isActive ? 'visibility' : 'visibility_off'}</span>
                            ${faq.isActive ? 'Disable' : 'Enable'}
                        </button>
                    </div>
                </div>
            `;
            qaList.innerHTML += faqHtml;
        });

        // update statistics    
        totalQuestionsCount.textContent = total;
        
    } catch (error) {
        alert('Load FAQ failed: ' + error.message);
    }
}

// get next FAQ ID
async function getNextFAQId() {
    try {
        const snapshot = await getDocs(faqRef);
        let maxNumber = 0;
        
        snapshot.forEach(doc => {
            const faqId = doc.data().faq_ID;
            if (faqId && faqId.startsWith('FAQ')) {
                const number = parseInt(faqId.slice(3));
                if (!isNaN(number) && number > maxNumber) {
                    maxNumber = number;
                }
            }
        });
        
        const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
        return `FAQ${nextNumber}`;
    } catch (error) {
        console.error('Error getting next FAQ ID:', error);
        throw error;
    }
}

// add new FAQ
async function addFAQ(event) {
    event.preventDefault();
    
    const question = document.getElementById('query').value.trim();
    const answer = document.getElementById('response').value
        .split('.')
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 0)
        .join('.\n');

    if (!question || !answer) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const faqId = await getNextFAQId();
        const newFAQ = {
            faq_ID: faqId,
            query: question,
            response: answer,
            date_Time: Timestamp.now(),
            isActive: true
        };

        await setDoc(doc(db, "FAQ", faqId), newFAQ);
        
        addQAForm.reset();
        alert('FAQ added successfully');
        loadFAQs();
        
    } catch (error) {
        alert('Add FAQ failed: ' + error.message);
    }
}

// edit FAQ
async function editFAQ(id) {
    try {
        const faqDoc = await getDoc(doc(db, "FAQ", id));
        const faq = faqDoc.data();
        
        document.getElementById('query').value = faq.query;
        document.getElementById('response').value = faq.response;
        
        const submitBtn = document.querySelector('.submit-btn');
        submitBtn.textContent = 'Update FAQ';
        submitBtn.dataset.editId = id;
        
        // add cancel button
        if (!document.querySelector('.cancel-btn')) {
            const cancelBtn = `
                <button type="button" class="cancel-btn" onclick="cancelEdit()">
                    Cancel
                </button>
            `;
            submitBtn.insertAdjacentHTML('afterend', cancelBtn);
        }
    } catch (error) {
        alert('Load FAQ failed: ' + error.message);
    }
}

// cancel edit
function cancelEdit() {
    addQAForm.reset();
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.textContent = 'Add FAQ';
    delete submitBtn.dataset.editId;
    document.querySelector('.cancel-btn')?.remove();
}

// toggle FAQ status
async function toggleFAQ(id) {
    try {
        const docRef = doc(db, "FAQ", id);
        const faqDoc = await getDoc(docRef);
        
        await updateDoc(docRef, {
            isActive: !faqDoc.data().isActive,
            date_Time: Timestamp.now()
        });

        alert('FAQ status updated');
        loadFAQs();
    } catch (error) {
        alert('Update status failed: ' + error.message);
    }
}

// form submit handle
addQAForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('.submit-btn');
    
    if (submitBtn.dataset.editId) {
        // update existing FAQ
        try {
            await updateDoc(doc(db, "FAQ", submitBtn.dataset.editId), {
                query: document.getElementById('query').value.trim(),
                response: document.getElementById('response').value.trim(),
                date_Time: Timestamp.now()
            });
            
            cancelEdit();
            alert('FAQ updated successfully');
            loadFAQs();
        } catch (error) {
            alert('Update failed: ' + error.message);
        }
    } else {
        // add new FAQ
        await addFAQ(e);
    }
});

// load FAQ when page loaded
document.addEventListener('DOMContentLoaded', loadFAQs);

// expose functions to global scope
window.editFAQ = editFAQ;
window.toggleFAQ = toggleFAQ;
window.cancelEdit = cancelEdit;

document.addEventListener('DOMContentLoaded', () => {
    const responseTextarea = document.getElementById('response');
    
    responseTextarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            
            e.preventDefault();
            
            const start = this.selectionStart;
            const end = this.selectionEnd;
            
            this.value = this.value.substring(0, start) + '\n' + this.value.substring(end);
            
            this.selectionStart = this.selectionEnd = start + 1;
        }
    });
});
