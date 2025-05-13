// Dark mode management utility
class DarkModeManager {
    constructor() {
        this.isDarkMode = localStorage.getItem('darkMode') === 'true';
        this.init();
    }

    init() {
        // Apply initial dark mode state
        if (this.isDarkMode) {
            document.body.classList.add('dark-mode');
            this.updateToggleButton();
        }

        // Set up event listeners
        document.addEventListener('DOMContentLoaded', () => {
            const darkModeToggle = document.getElementById('darkModeToggle');
            if (darkModeToggle) {
                darkModeToggle.addEventListener('click', () => this.toggle());
                this.updateToggleButton();
            }
        });
    }

    toggle() {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', this.isDarkMode);
        this.updateToggleButton();
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('darkModeChange', {
            detail: { isDarkMode: this.isDarkMode }
        }));
    }

    updateToggleButton() {
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.innerHTML = this.isDarkMode ? 
                '<i class="fas fa-sun"></i>' : 
                '<i class="fas fa-moon"></i>';
        }
    }

    // Static method to get current mode
    static getCurrentMode() {
        return localStorage.getItem('darkMode') === 'true' ? 'dark' : 'light';
    }
}

// Create and export a single instance
export const darkMode = new DarkModeManager(); 