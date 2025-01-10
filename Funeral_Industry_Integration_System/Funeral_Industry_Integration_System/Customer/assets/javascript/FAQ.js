import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

document.addEventListener('DOMContentLoaded', function() {
    const faqList = document.getElementById('faqList');

    async function loadFAQs() {
        try {
            console.log("start loading FAQ...");
            const faqRef = collection(db, "FAQ");
            console.log("Collection reference:", faqRef);

            const querySnapshot = await getDocs(faqRef);
            console.log("get data count:", querySnapshot.size);

            faqList.innerHTML = '';

            if (querySnapshot.empty) {
                console.log("no data found");
                faqList.innerHTML = '<p>FAQ data not found</p>';
                return;
            }

            // filter active FAQs
            const activeFAQs = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.isActive) {
                    activeFAQs.push(data);
                }
            });

            // if no active FAQs
            if (activeFAQs.length === 0) {
                console.log("no active FAQs found");
                faqList.innerHTML = '<p>No active FAQs available</p>';
                return;
            }

            // display active FAQs
            activeFAQs.forEach((data) => {
                console.log("processing active FAQ:", data);

                const faqItem = document.createElement('div');
                faqItem.className = 'faq-item';
    
                const formattedResponse = data.response;

                faqItem.innerHTML = `
                    <div class="faq-question">
                        ${data.query || 'question not set'}
                        <span class="material-symbols-outlined">expand_more</span>
                    </div>
                    <div class="faq-answer">
                        <div class="answer-content">
                            ${formattedResponse || 'answer not set'}
                        </div>
                    </div>
                `;

                const question = faqItem.querySelector('.faq-question');
                const answer = faqItem.querySelector('.faq-answer');
                
                question.onclick = function() {
                    answer.classList.toggle('active');
                    this.classList.toggle('active');
                    
                    const arrow = this.querySelector('.material-symbols-outlined');
                    if (answer.classList.contains('active')) {
                        arrow.style.transform = 'rotate(180deg)';
                    } else {
                        arrow.style.transform = 'rotate(0deg)';
                    }
                };

                faqList.appendChild(faqItem);
            });

        } catch (error) {
            console.error("FAQ loading failed:", error);
            faqList.innerHTML = `<p>loading failed: ${error.message}</p>`;
        }
    }

    window.onerror = function(msg, url, line) {
        console.error('JavaScript error:', msg, 'in', url, 'line:', line);
    };

    loadFAQs();
});
