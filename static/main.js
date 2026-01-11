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
        datesColumn: '#dates-column',
        unavailableBanner: '#unavailable-banner',
        skillsContainer: '#skills-container'
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
        const hasLink = project.link !== null && project.link !== '';
        const card = document.createElement('a');
        card.className = isHome ? 'project-card project-card-home' : 'project-card';
        card.dataset.index = index;

        if (hasLink) {
            card.href = project.link;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
        } else {
            card.href = '#';
            card.addEventListener('click', (e) => {
                e.preventDefault();
                this.showUnavailableBanner();
            });
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
                <div class="project-date-inline">${this.escapeHtml(project.date)}</div>
            `;
        }

        return card;
    },

    showUnavailableBanner() {
        let banner = $(CONFIG.selectors.unavailableBanner);
        
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'unavailable-banner';
            banner.className = 'unavailable-banner';
            banner.innerHTML = `
                <span class="banner-icon" aria-hidden="true">&#9888</span>
                <span class="banner-text">Link Unavailable</span>
            `;
            document.body.appendChild(banner);
        }

        // Hide banner first, then show after a brief delay
        banner.classList.remove('show');
        
        clearTimeout(this.bannerShowTimeout);
        clearTimeout(this.bannerHideTimeout);
        
        this.bannerShowTimeout = setTimeout(() => {
            banner.classList.add('show');
            
            // Auto-hide after 3 seconds
            this.bannerHideTimeout = setTimeout(() => {
                banner.classList.remove('show');
            }, 3000);
        },100); // Brief delay to let hide transition play
    },

    bannerShowTimeout: null,
    bannerHideTimeout: null,

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
// SKILLS
// =============================================================================

/**
 * Manage skills loading, line-based display, and animated swapping
 * 
 * Algorithm:
 * 1. Calculate the width of 4 lines based on container width
 * 2. Measure width of all skills using a hidden measurement element
 * 3. Fill each line using percentage-based algorithm:
 *    - Randomly select skills and add to line if they fit
 *    - Continue until 80% fill is reached
 *    - Once at/above 80%, keep trying until a failure occurs
 *    - Single failure at >=80% terminates fill, move to next line
 * 4. Swap every 1.5 seconds:
 *    - Select a random line and 1-3 adjacent skills
 *    - Calculate remaining line width without those skills
 *    - Find replacement skills using fill algorithm
 *    - Replace at same position with extended animation
 */
const Skills = {
    container: null,
    allSkills: [],           // All available skills
    lines: [[], [], [], []],     // Skills on each of the 4 lines
    lineContainers: [],      // DOM containers for each line
    lineElements: [[], [], [], []], // DOM elements for each line
    lineLocks: [false, false, false, false], // Prevent concurrent swaps on same line
    animationInterval: null, // Store interval ID for cleanup
    skillWidths: {},         // Cache of skill name -> pixel width
    lineWidth: 0,            // Available width per line
    gap: 8,                  // Gap between skills (--space-sm)
    highlightDuration: 800,     // Duration to show highlight (same for old and new skills)
    fadeOutDuration: 500,       // Duration for old skills to fade out (ms)
    fadeInDuration: 600,        // Duration for new skills to fade in (ms)
    
    async init() {
        this.container = $(CONFIG.selectors.skillsContainer);
        if (!this.container) return;

        try {
            const response = await fetch('/skills.json');
            const data = await response.json();
            this.processSkills(data.skills);
            this.calculateLineWidth();
            this.measureAllSkills();
            this.fillAllLines();
            this.render();
            this.startAnimation();
            
            // Recalculate on resize
            window.addEventListener('resize', () => this.handleResize());
        } catch (error) {
            console.error('Failed to load skills:', error);
        }
    },

    processSkills(skillsArray) {
        // Skills are now a flat array of strings
        this.allSkills = skillsArray.map(name => ({ name }));
        this.shuffleArray(this.allSkills);
    },

    calculateLineWidth() {
        const containerRect = this.container.getBoundingClientRect();
        // Account for container padding
        this.lineWidth = containerRect.width - 32;
        
        // Get gap from CSS
        const computedStyle = getComputedStyle(this.container);
        this.gap = parseInt(computedStyle.gap) || 8;
    },

    measureAllSkills() {
        // Create a hidden measurement element matching skill-box styles
        const measureEl = document.createElement('div');
        measureEl.className = 'skill-box';
        measureEl.style.cssText = 'position: absolute; visibility: hidden; white-space: nowrap;';
        document.body.appendChild(measureEl);
        
        this.skillWidths = {};
        this.allSkills.forEach(skill => {
            measureEl.textContent = skill.name;
            // Add padding (16px on each side from --space-md)
            this.skillWidths[skill.name] = measureEl.offsetWidth;
        });
        
        document.body.removeChild(measureEl);
    },

    getSkillWidth(skill) {
        return this.skillWidths[skill.name] || 100;
    },

    /**
     * Fill a line using percentage-based algorithm
     * Returns array of skills that fit on the line
     * 
     * Algorithm:
     * - Keep selecting random skills until 80% fill is reached
     * - Once at or above 80%, any failure (skill doesn't fit) terminates
     * - Never exceed 100%
     */
    fillLine(availableSkills, lineWidth) {
        const result = [];
        let currentWidth = 0;
        const used = new Set();
        const targetPercentage = 0.8; // 80% threshold
        
        // Create a shuffled copy of available skills
        const shuffled = [...availableSkills];
        this.shuffleArray(shuffled);
        
        let attempts = 0;
        const maxAttempts = shuffled.length * 3; // Prevent infinite loops
        
        while (attempts < maxAttempts) {
            // Randomly pick a skill from shuffled pool
            const randomIndex = Math.floor(Math.random() * shuffled.length);
            const skill = shuffled[randomIndex];
            
            // Skip if already used on this line
            if (used.has(skill.name)) {
                attempts++;
                continue;
            }
            
            const skillWidth = this.getSkillWidth(skill);
            const gapWidth = result.length > 0 ? this.gap : 0;
            const newWidth = currentWidth + gapWidth + skillWidth;
            
            // Calculate current fill percentage
            const currentPercentage = currentWidth / lineWidth;
            
            if (newWidth <= lineWidth) {
                // Skill fits, add to line
                result.push(skill);
                currentWidth = newWidth;
                used.add(skill.name);
            } else {
                // Skill doesn't fit
                if (currentPercentage >= targetPercentage) {
                    // At or above 80% - single failure terminates
                    break;
                }
                // Below 80% - keep trying other skills
            }
            
            attempts++;
        }
        
        return result;
    },

    fillAllLines() {
        this.lines = [[], [], [], []];
        
        // Track all skills used across lines
        let usedSkills = new Set();
        
        for (let i = 0; i < 4; i++) {
            // Get available skills (not yet used on any line)
            const available = this.allSkills.filter(s => !usedSkills.has(s.name));
            
            if (available.length === 0) break;
            
            // Fill this line
            this.lines[i] = this.fillLine(available, this.lineWidth);
            
            // Mark these skills as used
            this.lines[i].forEach(s => usedSkills.add(s.name));
        }
    },

    render() {
        // Clear container
        this.container.innerHTML = '';
        this.lineContainers = [];
        this.lineElements = [[], [], [], []];
        
        let elementIndex = 0;
        
        // Create separate container for each line
        for (let lineIndex = 0; lineIndex < 4; lineIndex++) {
            const lineContainer = document.createElement('div');
            lineContainer.className = 'skills-line';
            lineContainer.dataset.lineIndex = lineIndex;
            this.container.appendChild(lineContainer);
            this.lineContainers.push(lineContainer);
            
            const lineSkills = this.lines[lineIndex];
            
            lineSkills.forEach((skill) => {
                const box = this.createSkillBox(skill, lineIndex);
                lineContainer.appendChild(box);
                this.lineElements[lineIndex].push(box);
                
                // Stagger fade-in animation
                const idx = elementIndex++;
                setTimeout(() => {
                    box.classList.remove('fade-in');
                    box.classList.add('visible');
                }, 50 + idx * 30);
            });
        }
    },

    createSkillBox(skill, lineIndex) {
        const box = document.createElement('div');
        box.className = 'skill-box fade-in';
        box.setAttribute('role', 'listitem');
        box.textContent = skill.name;
        box.dataset.skillName = skill.name;
        box.dataset.lineIndex = lineIndex;
        return box;
    },

    startAnimation() {
        if (prefersReducedMotion()) return;
        
        // Clear any existing interval
        this.stopAnimation();
        
        // Reset line locks
        this.lineLocks = [false, false, false, false];
        
        // Start swaps at regular intervals (allows overlapping animations)
        // Animation duration ~2700ms, interval 1500ms = overlapping swaps
        this.animationInterval = setInterval(() => this.performSwap(), 1500);
        
        // Set up visibility change handler (only once)
        if (!this.visibilityHandlerBound) {
            this.visibilityHandlerBound = true;
            document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
        }
    },

    stopAnimation() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
    },

    handleVisibilityChange() {
        if (document.hidden) {
            // Tab is hidden - stop the animation to prevent accumulating highlights
            this.stopAnimation();
        } else {
            // Tab is visible again - clean up any stale highlights and restart
            this.cleanupHighlights();
            this.startAnimation();
        }
    },

    cleanupHighlights() {
        // Remove all highlight and animation classes from skill boxes
        const allSkillBoxes = this.container?.querySelectorAll('.skill-box');
        if (allSkillBoxes) {
            allSkillBoxes.forEach(box => {
                box.classList.remove('highlighted', 'fading-out', 'fading-in');
                // Ensure visible state
                if (!box.classList.contains('visible')) {
                    box.classList.add('visible');
                }
            });
        }
        
        // Reset all line locks
        this.lineLocks = [false, false, false, false];
    },

    /**
     * Try to find a valid swap configuration
     * Returns swap data if successful, null if no valid swap found
     */
    tryFindSwap() {
        // Select a random line (0, 1, 2, or 3)
        const lineIndex = Math.floor(Math.random() * 4);
        
        // Skip if this line is already being swapped
        if (this.lineLocks[lineIndex]) {
            return null;
        }
        
        const lineSkills = this.lines[lineIndex];
        const lineElements = this.lineElements[lineIndex];
        
        if (lineSkills.length === 0) {
            return null;
        }
        
        // Select 1-3 adjacent skills to swap
        const swapCount = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
        
        // Select random starting position for adjacent skills
        const maxStart = Math.max(0, lineSkills.length - swapCount);
        const startIndex = Math.floor(Math.random() * (maxStart + 1));
        const endIndex = Math.min(startIndex + swapCount, lineSkills.length);
        const actualSwapCount = endIndex - startIndex;
        
        if (actualSwapCount === 0) {
            return null;
        }
        
        // Get skills being removed
        const removedSkills = lineSkills.slice(startIndex, endIndex);
        const removedElements = lineElements.slice(startIndex, endIndex);
        
        // Calculate remaining line width after removal
        let remainingWidth = 0;
        for (let i = 0; i < lineSkills.length; i++) {
            if (i < startIndex || i >= endIndex) {
                remainingWidth += this.getSkillWidth(lineSkills[i]);
            }
        }
        // Add gaps for remaining skills
        const remainingCount = lineSkills.length - actualSwapCount;
        if (remainingCount > 1) {
            remainingWidth += (remainingCount - 1) * this.gap;
        }
        
        // Calculate available width for new skills (including gap to adjacent skills)
        const hasSkillsBefore = startIndex > 0;
        const hasSkillsAfter = endIndex < lineSkills.length;
        const extraGaps = (hasSkillsBefore ? 1 : 0) + (hasSkillsAfter ? 1 : 0);
        const availableWidth = this.lineWidth - remainingWidth - (extraGaps * this.gap);
        
        // Get all currently displayed skill names (including those being removed)
        // Skills being removed should NOT be available as replacements
        const displayedNames = new Set();
        this.lines.forEach(line => line.forEach(s => displayedNames.add(s.name)));
        
        // Get available skills for replacement (must not be currently displayed)
        const availableSkills = this.allSkills.filter(s => !displayedNames.has(s.name));
        
        if (availableSkills.length === 0) {
            return null;
        }
        
        // Fill the available width using the seen-list algorithm
        const newSkills = this.fillLine(availableSkills, availableWidth);
        
        if (newSkills.length === 0) {
            return null;
        }
        
        // Return all swap data
        return {
            lineIndex,
            lineSkills,
            lineElements,
            startIndex,
            endIndex,
            removedSkills,
            removedElements,
            newSkills
        };
    },

    performSwap() {
        // Try to find a valid swap (retry up to 5 times if needed)
        let swapData = null;
        let attempts = 0;
        
        while (!swapData && attempts < 5) {
            swapData = this.tryFindSwap();
            attempts++;
        }
        
        // If no valid swap found, skip this cycle
        if (!swapData) {
            return;
        }
        
        const {
            lineIndex,
            lineSkills,
            lineElements,
            startIndex,
            endIndex,
            removedElements,
            newSkills
        } = swapData;
        
        // Lock this line to prevent concurrent swaps
        this.lineLocks[lineIndex] = true;
        
        // Now that we have confirmed replacement skills, highlight old skills
        removedElements.forEach(el => {
            if (el) el.classList.add('highlighted');
        });
        
        // After highlight duration, fade out old skills
        setTimeout(() => {
            removedElements.forEach(el => {
                if (el) el.classList.add('fading-out');
            });
            
            // After fade out completes, swap the elements
            setTimeout(() => {
                // Create new elements (start hidden for fade-in)
                const newElements = newSkills.map(skill => {
                    const box = this.createSkillBox(skill, lineIndex);
                    box.classList.remove('fade-in');
                    box.classList.add('fading-in');
                    return box;
                });
                
                // Find insertion point in DOM (use line container, not main container)
                const lineContainer = this.lineContainers[lineIndex];
                const insertBeforeElement = removedElements[0];
                
                // Insert new elements at the same position within the line
                newElements.forEach(el => {
                    lineContainer.insertBefore(el, insertBeforeElement);
                });
                
                // Remove old elements from DOM
                removedElements.forEach(el => {
                    if (el && el.parentNode) el.remove();
                });
                
                // Update data structures
                this.lines[lineIndex] = [
                    ...lineSkills.slice(0, startIndex),
                    ...newSkills,
                    ...lineSkills.slice(endIndex)
                ];
                
                this.lineElements[lineIndex] = [
                    ...lineElements.slice(0, startIndex),
                    ...newElements,
                    ...lineElements.slice(endIndex)
                ];
                
                // Update line indices in data attributes
                this.lineElements[lineIndex].forEach(el => {
                    el.dataset.lineIndex = lineIndex;
                });
                
                // Trigger fade-in animation with highlight
                requestAnimationFrame(() => {
                    newElements.forEach(el => {
                        if (el) {
                            el.classList.remove('fading-in');
                            el.classList.add('visible', 'highlighted');
                        }
                    });
                });
                
                // Remove highlight after same duration as old skills
                setTimeout(() => {
                    newElements.forEach(el => {
                        if (el) el.classList.remove('highlighted');
                    });
                    
                    // Unlock this line for future swaps
                    this.lineLocks[lineIndex] = false;
                }, this.fadeInDuration + this.highlightDuration);
            }, this.fadeOutDuration);
        }, this.highlightDuration);
    },

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    handleResize() {
        // Stop animation immediately to prevent errors with stale references
        this.stopAnimation();
        
        // Debounce resize handler
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            const oldWidth = this.lineWidth;
            this.calculateLineWidth();
            
            // If width changed significantly, refill lines
            if (Math.abs(this.lineWidth - oldWidth) > 50) {
                this.measureAllSkills();
                this.fillAllLines();
                this.render();
            }
            
            // Restart animation after resize settles
            this.startAnimation();
        }, 250);
    },

    resizeTimeout: null
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
    Skills.init();
});
