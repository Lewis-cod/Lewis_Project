
// add enter key login support
function setupEnterKeyLogin() {
    const passInput = document.querySelector('.pass-input');
    if (passInput) {
        passInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const loginButton = document.querySelector('.signin-button');
                if (loginButton) {
                    loginButton.click();
                }
            }
        });
    }
}

// password visibility
function setupPasswordVisibility() {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault(); 
            const input = this.previousElementSibling;
            
            if (input && input.type === 'password') {
                input.type = 'text';
                this.textContent = 'visibility';
            } else if (input) {
                input.type = 'password';
                this.textContent = 'visibility_off';
            }
        });
    });
}

// ensure DOM fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setupEnterKeyLogin();
        setupPasswordVisibility();
    });
} else {
    setupEnterKeyLogin();
    setupPasswordVisibility();
} 

