import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

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

// EmailJS configuration
const PUBLIC_KEY = "3xcFGH6Gr05Hhdtwy";
const SERVICE_ID = "service_gcq45eq";
const ADMIN_TEMPLATE_ID = "template_8jvzmwo";
const PROVIDER_TEMPLATE_ID = "template_xl1n3ej";

// send registration email for admin
async function sendRegistrationEmail(email, userID, password) {
    try {
        // use EmailJS 
        const templateParams = {
            to_email: email,
            to_name: email.split('@')[0],
            user_ID: userID,
            user_Password: password
        };

        // send email
        await emailjs.send(
            SERVICE_ID,
            ADMIN_TEMPLATE_ID,
            templateParams,
            PUBLIC_KEY
        );
        
        console.log('Registration confirmation email sent successfully');
        return true;
    } catch (error) {
        console.error("Failed to send registration email:", error);
        return false;
    }
}

// send registration email for service provider
async function sendProviderRegistrationEmail(email, providerID, password) {
    try {
        // use EmailJS 
        const templateParams = {
            to_email: email,
            to_name: email.split('@')[0],
            providerID: providerID,
            password: password
        };

        console.log('Provider email params:', templateParams);

        // send email
        await emailjs.send(
            SERVICE_ID,
            PROVIDER_TEMPLATE_ID,
            templateParams,
            PUBLIC_KEY
        );
        
        console.log('Provider registration confirmation email sent successfully');
        return true;
    } catch (error) {
        console.error("Failed to send provider registration email:", error);
        return false;
    }
}

export { sendRegistrationEmail, sendProviderRegistrationEmail };



