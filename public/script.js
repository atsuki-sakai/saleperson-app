// Saleperson App Script
(function () {
    // Initialize the app
    function initSalepersonApp() {
        console.log('Saleperson App initialized');
        // Add your initialization code here
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSalepersonApp);
    } else {
        initSalepersonApp();
    }
})(); 