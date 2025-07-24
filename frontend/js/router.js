class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        
        // Listen for hash changes
        window.addEventListener('hashchange', this.handleRouteChange.bind(this));
        window.addEventListener('load', this.handleRouteChange.bind(this));
    }
    
    // Register a route with its handler function
    addRoute(path, handler) {
        this.routes[path] = handler;
    }
    
    // Handle route changes
    handleRouteChange() {
        const hash = window.location.hash.slice(1) || '/'; // Remove the '#' and default to '/'
        const route = hash.split('/')[1] || 'songs'; // Default to 'songs' page
        
        this.currentRoute = route;
        this.updateActiveNavLink(route);
        
        if (this.routes[route]) {
            this.routes[route]();
        } else {
            // Default route
            this.routes['songs']();
        }
    }
    
    // Update active navigation link
    updateActiveNavLink(route) {
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current route link
        const currentLink = document.querySelector(`.nav-link[data-route="${route}"]`);
        if (currentLink) {
            currentLink.classList.add('active');
        }
    }
    
    // Programmatically navigate to a route
    navigate(route) {
        window.location.hash = `#/${route}`;
    }
}

// Create global router instance
const router = new Router();