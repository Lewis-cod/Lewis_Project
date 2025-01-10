document.addEventListener('DOMContentLoaded', function() {
    setupProfileDropdown();
    // get DOM elements
    const sidebar = document.querySelector('.sidebar');
    const header = document.querySelector('.header');
    const mainContent = document.querySelector('.main-content');
    
    // sidebar expand/collapse function
    function toggleSidebar(isCollapsed) {
        [sidebar, header, mainContent].forEach(el => {
            el.classList.toggle('collapsed', isCollapsed);
        });
    }
    
    // mouse hover event
    sidebar.addEventListener('mouseenter', () => toggleSidebar(false));
    sidebar.addEventListener('mouseleave', () => toggleSidebar(true));

    // initial state is collapsed
    toggleSidebar(true);

    // mobile view handling
    if (window.innerWidth <= 768) {
        const overlay = document.createElement('div');
        overlay.classList.add('sidebar-overlay');
        document.body.appendChild(overlay);

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });

        sidebar.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }

    // password visibility toggle
    const toggleButtons = document.querySelectorAll('.toggle-password');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.previousElementSibling || this.parentElement.querySelector('input[type="password"]');
            
            // toggle password visibility
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = 'visibility';
            } else {
                input.type = 'password';
                this.textContent = 'visibility_off';
            }
        });
    });
});

function setupProfileDropdown() {
    const profileDropdown = document.getElementById('profileDropdown');
    const dropdownContent = document.getElementById('profileDropdownContent');
    const logoutBtn = document.getElementById('logoutBtn');

    // dropdown list
    profileDropdown.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdownContent.classList.toggle('show');
    });

    // close the dropdown menu
    document.addEventListener('click', function(e) {
        if (!profileDropdown.contains(e.target)) {
            dropdownContent.classList.remove('show');
        }
    });

    // logout 
    logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.clear();
        window.location.href = '/Funeral_Industry_Integration_System/startingPage.html';
    });
}
