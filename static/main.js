/**
 * Colin Calvetti - Personal Website
 * Main JavaScript Module
 * 
 * Clean, modular, and accessible JavaScript architecture
 */

// =============================================================================
// CONFIGURATION
// =============================================================================
const CONFIG = {
    selectors: {
        yearElement: '#year',
        navLinks: '.nav-link',
        navIndicator: '.nav-indicator',
        projectsHome: '#projects-home',
        projectsPage: '#projects-page',
        datesColumn: '#dates-column'
    },
    classes: {
        pageHome: 'page-home',
        pageProjects: 'page-projects',
        highlighted: 'highlighted'
    },
    storage: {
        currentPage: 'currentPage'
    },
    animation: {
        fadeZone: 50
    }
};

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Safely query a DOM element
 */
const $ = (selector) => document.querySelector(selector);

/**
 * Safely query all matching DOM elements
 */
const $$ = (selector) => document.querySelectorAll(selector);

/**
 * Determine current page from URL path
 */
const getCurrentPage = () => {
    const path = window.location.pathname;
    if (path === '/' || path === '/index.html') return 'home';
    if (path.startsWith('/projects')) return 'projects';
    return null;
};

/**
 * Check if user prefers reduced motion
 */
const prefersReducedMotion = () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// =============================================================================
// NAVIGATION
// =============================================================================

/**
 * Initialize and manage navigation state
 */
const Navigation = {
    init() {
        // Get previous page BEFORE setting current page
        const previousPage = sessionStorage.getItem(CONFIG.storage.currentPage);
        this.setActiveNavItem();
        this.setupIndicatorAnimation(previousPage);
    },

    setActiveNavItem() {
        const currentPage = getCurrentPage();
        const previousPage = sessionStorage.getItem(CONFIG.storage.currentPage);
        const indicator = $(CONFIG.selectors.navIndicator);
        const navLinks = $$(CONFIG.selectors.navLinks);

        // Handle non-main pages (like unavailable)
        if (!currentPage) {
            if (indicator) indicator.style.opacity = '0';
            document.body.classList.remove(CONFIG.classes.pageHome, CONFIG.classes.pageProjects);
            document.body.classList.add(`page-${previousPage || 'home'}`);
            navLinks.forEach(link => link.removeAttribute('aria-current'));
            return;
        }

        // Set page class for navigation positioning
        document.body.classList.remove(CONFIG.classes.pageHome, CONFIG.classes.pageProjects);
        document.body.classList.add(`page-${currentPage}`);

        // Ensure indicator is visible
        if (indicator) indicator.style.opacity = '';

        // Store current page for next navigation
        sessionStorage.setItem(CONFIG.storage.currentPage, currentPage);

        // Update active states
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            const isActive = (currentPage === 'home' && href === '/') ||
                           (currentPage === 'projects' && href === '/projects/');
            
            link.setAttribute('aria-current', isActive ? 'page' : '');
        });
    },

    setupIndicatorAnimation(previousPage) {
        const currentPage = getCurrentPage();
        const indicator = $(CONFIG.selectors.navIndicator);

        // Only animate if we have a previous page that differs from current
        if (!indicator || !previousPage || previousPage === currentPage || prefersReducedMotion()) {
            return;
        }

        // Get positions based on viewport
        const positions = this.getNavPositions();
        
        // Start indicator at previous position (no transition)
        indicator.style.transition = 'none';
        indicator.style.left = previousPage === 'home' ? positions.home : positions.projects;
        
        // Force reflow
        indicator.offsetHeight;
        
        // Small delay then animate to new position
        setTimeout(() => {
            indicator.style.transition = '';
            indicator.style.left = '';
        }, 20);
    },

    getNavPositions() {
        const width = window.innerWidth;
        if (width <= 480) return { home: '22%', projects: '78%' };
        if (width <= 900) return { home: '20%', projects: '80%' };
        return { home: '15%', projects: '50%' };
    }
};

// =============================================================================
// PROJECTS
// =============================================================================

/**
 * Manage project loading and rendering
 */
const Projects = {
    async init() {
        try {
            const response = await fetch('/projects.json');
            const data = await response.json();
            this.render(data.projects);
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    },

    render(projects) {
        const homeContainer = $(CONFIG.selectors.projectsHome);
        const pageContainer = $(CONFIG.selectors.projectsPage);

        if (homeContainer) {
            this.renderHomeProjects(projects, homeContainer);
        }

        if (pageContainer) {
            this.renderPageProjects(projects, pageContainer);
        }
    },

    renderHomeProjects(projects, container) {
        const favorites = projects.filter(p => p.favorite);
        
        favorites.forEach(project => {
            const card = this.createCard(project, true);
            container.appendChild(card);
        });
    },

    renderPageProjects(projects, container) {
        const datesColumn = $(CONFIG.selectors.datesColumn);
        const projectCards = [];
        const dateElements = [];

        projects.forEach((project, index) => {
            const card = this.createCard(project, false, index);
            container.appendChild(card);
            projectCards.push(card);

            if (datesColumn) {
                const dateEl = document.createElement('div');
                dateEl.className = 'date-item';
                dateEl.textContent = project.date;
                dateEl.dataset.index = index;
                datesColumn.appendChild(dateEl);
                dateElements.push(dateEl);
            }
        });

        if (datesColumn && dateElements.length > 0) {
            DateTracker.init(container, projectCards, dateElements);
        }
    },

    createCard(project, isHome, index = 0) {
        const card = document.createElement('a');
        card.href = project.link;
        card.className = isHome ? 'project-card project-card-home' : 'project-card';
        card.dataset.index = index;

        const isUnavailable = project.link.includes('/unavailable');
        if (!isUnavailable) {
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
        }

        if (isHome) {
            card.innerHTML = `
                <h3 class="project-title">
                    ${this.escapeHtml(project.name)}
                    <span class="external-icon" aria-hidden="true">↗</span>
                </h3>
            `;
        } else {
            const descriptionHTML = project.description
                .map(desc => `<p>${this.escapeHtml(desc)}</p>`)
                .join('');

            card.innerHTML = `
                <div class="project-header">
                    <h3 class="project-title">
                        ${this.escapeHtml(project.name)}
                        <span class="external-icon" aria-hidden="true">↗</span>
                    </h3>
                </div>
                <div class="project-description">
                    ${descriptionHTML}
                </div>
            `;
        }

        return card;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// =============================================================================
// DATE TRACKER (Projects Page)
// =============================================================================

/**
 * Manages the date display tracking on the projects page
 */
const DateTracker = {
    projectsGrid: null,
    projectCards: [],
    dateElements: [],
    hoveredIndex: null,

    init(grid, cards, dates) {
        this.projectsGrid = grid;
        this.projectCards = cards;
        this.dateElements = dates;

        this.setupEventListeners();
        this.updatePositions();
    },

    setupEventListeners() {
        // Hover listeners for cards
        this.projectCards.forEach((card, index) => {
            card.addEventListener('mouseenter', () => this.handleHover(index));
            card.addEventListener('mouseleave', () => this.handleHover(null));
        });

        // Update on scroll and resize
        this.projectsGrid.addEventListener('scroll', () => this.updatePositions());
        window.addEventListener('resize', () => this.updatePositions());
    },

    handleHover(index) {
        this.hoveredIndex = index;
        
        this.dateElements.forEach((el, i) => {
            el.classList.toggle(CONFIG.classes.highlighted, i === index);
        });
        
        this.updatePositions();
    },

    updatePositions() {
        const datesColumn = $(CONFIG.selectors.datesColumn);
        if (!datesColumn) return;

        const columnRect = datesColumn.getBoundingClientRect();
        const gridRect = this.projectsGrid.getBoundingClientRect();
        const gridOffset = gridRect.top - columnRect.top;
        const gridPadding = 8;
        const visibleTop = gridRect.top + gridPadding;
        const visibleBottom = gridRect.bottom - gridPadding;
        const totalProjects = this.projectCards.length;

        this.projectCards.forEach((card, index) => {
            const cardRect = card.getBoundingClientRect();
            const dateEl = this.dateElements[index];
            if (!dateEl) return;

            const cardCenterY = cardRect.top + cardRect.height / 2;
            const relativeToGrid = cardCenterY - gridRect.top;
            const dateHeight = dateEl.offsetHeight;
            
            // Position date element
            dateEl.style.top = `${gridOffset + relativeToGrid - dateHeight / 2}px`;

            // Calculate visibility
            const isCenterVisible = cardCenterY >= visibleTop && cardCenterY <= visibleBottom;
            
            if (!isCenterVisible) {
                dateEl.style.opacity = '0';
            } else {
                const opacity = this.calculateOpacity(index, cardCenterY, visibleTop, visibleBottom, totalProjects);
                dateEl.style.opacity = opacity.toString();
            }
        });
    },

    calculateOpacity(index, cardCenterY, visibleTop, visibleBottom, totalProjects) {
        const distanceToTop = cardCenterY - visibleTop;
        const distanceToBottom = visibleBottom - cardCenterY;
        const distanceToEdge = Math.min(distanceToTop, distanceToBottom);
        
        // Edge fade multiplier
        let edgeFade = 1;
        if (distanceToEdge < CONFIG.animation.fadeZone) {
            edgeFade = distanceToEdge / CONFIG.animation.fadeZone;
        }

        // Base opacity based on hover state
        let baseOpacity;
        if (this.hoveredIndex === null) {
            baseOpacity = 0.3;
        } else if (index === this.hoveredIndex) {
            baseOpacity = 1;
        } else {
            const distance = Math.abs(index - this.hoveredIndex);
            const maxDistance = Math.max(this.hoveredIndex, totalProjects - 1 - this.hoveredIndex);
            const fadeFactor = distance / Math.max(maxDistance, 1);
            baseOpacity = Math.max(0.15, 0.6 - fadeFactor * 0.45);
        }

        return baseOpacity * edgeFade;
    }
};

// =============================================================================
// FOOTER
// =============================================================================

/**
 * Initialize footer with current year
 */
const Footer = {
    init() {
        const yearEl = $(CONFIG.selectors.yearElement);
        if (yearEl) {
            yearEl.textContent = new Date().getFullYear();
        }
    }
};

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    Footer.init();
    Navigation.init();
    Projects.init();
});
