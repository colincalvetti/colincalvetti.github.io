/**
 * Colin Calvetti - Personal Website
 * Clean, modular JavaScript architecture
 * 
 * Table of Contents:
 * 1. Configuration
 * 2. Utilities
 * 3. HoverDropdown Base Class
 * 4. Navigation
 * 5. Projects
 * 6. Date Tracker
 * 7. Skills
 * 8. Info Tooltip
 * 9. Settings
 * 10. Footer
 * 11. Global Scroll Handler
 * 12. Initialization
 */

// =============================================================================
// 1. CONFIGURATION
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
        highlighted: 'highlighted',
        animationsDisabled: 'animations-disabled'
    },
    storage: {
        currentPage: 'currentPage',
        animationsEnabled: 'animationsEnabled'
    },
    // Animation timings (should match CSS variables)
    timing: {
        highlightDuration: 800,
        fadeOutDuration: 500,
        fadeInDuration: 600,
        bannerDuration: 3000,
        swapInterval: 1500,
        hideTimeout: 500,
        resizeDebounce: 250
    }
};

// =============================================================================
// 2. UTILITIES
// =============================================================================
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const getCurrentPage = () => {
    const path = window.location.pathname;
    if (path === '/' || path === '/index.html') return 'home';
    if (path.startsWith('/projects')) return 'projects';
    return null;
};

const prefersReducedMotion = () => 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isMobile = () => window.innerWidth <= 900;

const isTouchDevice = () => 
    'ontouchstart' in window || navigator.maxTouchPoints > 0;

const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// =============================================================================
// 3. HOVER DROPDOWN BASE CLASS
// =============================================================================
class HoverDropdown {
    constructor(triggerSelector, dropdownSelector, wrapperSelector = null) {
        this.trigger = $(triggerSelector);
        this.dropdown = $(dropdownSelector);
        this.wrapper = wrapperSelector ? $(wrapperSelector) : null;
        this.hideTimeout = null;
        this.isActive = false;
    }

    init() {
        if (!this.trigger || !this.dropdown) return;

        // Desktop hover events (only for non-touch devices)
        if (!isTouchDevice()) {
            this.trigger.addEventListener('mouseenter', () => this.activate());
            this.trigger.addEventListener('mouseleave', () => this.startHideTimer());
            this.dropdown.addEventListener('mouseenter', () => this.cancelHideTimer());
            this.dropdown.addEventListener('mouseleave', () => this.startHideTimer());
        }

        // Touch/click events
        this.trigger.addEventListener('click', (e) => this._handleClick(e));
        document.addEventListener('click', (e) => this._handleOutsideClick(e));
    }

    _handleClick(e) {
        if (isTouchDevice() || isMobile()) {
            e.preventDefault();
            e.stopPropagation();
            this.isActive ? this.deactivate() : this.activate();
        }
    }

    _handleOutsideClick(e) {
        if (!this.isActive) return;
        const container = this.wrapper || this.trigger;
        if (!container.contains(e.target) && !this.dropdown.contains(e.target)) {
            this.deactivate();
        }
    }

    activate() {
        this.cancelHideTimer();
        if (!this.isActive) {
            this.isActive = true;
            this.onActivate();
        }
    }

    deactivate() {
        if (this.isActive) {
            this.isActive = false;
            this.onDeactivate();
        }
    }

    startHideTimer() {
        this.cancelHideTimer();
        this.hideTimeout = setTimeout(() => this.deactivate(), CONFIG.timing.hideTimeout);
    }

    cancelHideTimer() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }

    onActivate() {}
    onDeactivate() {}
}

// =============================================================================
// 4. NAVIGATION
// =============================================================================
const Navigation = {
    indicator: null,
    navName: null,
    navProjects: null,
    isHovering: false,

    init() {
        this.indicator = $(CONFIG.selectors.navIndicator);
        this.navName = $('.nav-name');
        this.navProjects = $('.nav-projects');

        if (!this.indicator || !this.navName || !this.navProjects) return;

        const previousPage = sessionStorage.getItem(CONFIG.storage.currentPage);
        this.setActiveNavItem();
        this.setupIndicatorAnimation(previousPage);
        this.setupHoverListeners();

        // Debounced resize handler
        this._resizeHandler = debounce(() => this.updateIndicator(false), CONFIG.timing.resizeDebounce);
        window.addEventListener('resize', this._resizeHandler);
    },

    setupHoverListeners() {
        [this.navName, this.navProjects].forEach(link => {
            link.addEventListener('mouseenter', () => {
                if (link.getAttribute('aria-current') === 'page') {
                    this.isHovering = true;
                    this.updateIndicator(true);
                }
            });
            link.addEventListener('mouseleave', () => {
                if (this.isHovering) {
                    this.isHovering = false;
                    this.updateIndicator(true);
                }
            });
        });
    },

    setActiveNavItem() {
        const currentPage = getCurrentPage();
        const navLinks = $$(CONFIG.selectors.navLinks);

        document.body.classList.remove(CONFIG.classes.pageHome, CONFIG.classes.pageProjects);

        if (!currentPage) {
            // 404 or unknown page - hide indicator, use previous page for nav positioning
            const previousPage = sessionStorage.getItem(CONFIG.storage.currentPage) || 'home';
            if (this.indicator) this.indicator.style.opacity = '0';
            document.body.classList.add(`page-${previousPage}`);
            navLinks.forEach(link => link.removeAttribute('aria-current'));
            return;
        }

        document.body.classList.add(`page-${currentPage}`);
        if (this.indicator) this.indicator.style.opacity = '';
        sessionStorage.setItem(CONFIG.storage.currentPage, currentPage);

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            const isActive = (currentPage === 'home' && href === '/') ||
                           (currentPage === 'projects' && href === '/projects/');
            link.setAttribute('aria-current', isActive ? 'page' : '');
        });

        this.updateIndicator(false);
    },

    setupIndicatorAnimation(previousPage) {
        const currentPage = getCurrentPage();
        // Check animations state from localStorage directly to avoid race condition with Settings.init()
        const savedAnimations = localStorage.getItem(CONFIG.storage.animationsEnabled);
        const animationsEnabled = savedAnimations !== 'false';
        const animationsDisabled = prefersReducedMotion() || !animationsEnabled;
        
        if (!this.indicator || !previousPage || previousPage === currentPage || animationsDisabled) {
            return;
        }

        const previousLink = previousPage === 'home' ? this.navName : this.navProjects;
        const textWidth = this.getTextWidth(previousLink);
        const previousRect = previousLink.getBoundingClientRect();
        const previousCenter = previousRect.left + previousRect.width / 2;

        this.indicator.style.transition = 'none';
        this.indicator.style.left = `${previousCenter}px`;
        this.indicator.style.width = `${textWidth}px`;
        this.indicator.offsetHeight; // Force reflow
        
        setTimeout(() => this.updateIndicator(true), 20);
    },

    getTextWidth(element) {
        const measureSpan = document.createElement('span');
        measureSpan.style.cssText = `
            position: absolute;
            visibility: hidden;
            white-space: nowrap;
            font-family: ${getComputedStyle(element).fontFamily};
            font-size: ${getComputedStyle(element).fontSize};
            font-weight: ${getComputedStyle(element).fontWeight};
        `;
        measureSpan.textContent = element.textContent.trim();
        document.body.appendChild(measureSpan);
        const width = measureSpan.offsetWidth;
        document.body.removeChild(measureSpan);
        return width;
    },

    updateIndicator(animate = true) {
        const currentPage = getCurrentPage();
        if (!currentPage || !this.indicator) return;

        const activeLink = currentPage === 'home' ? this.navName : this.navProjects;
        const rect = activeLink.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const width = this.isHovering ? rect.width : this.getTextWidth(activeLink);

        this.indicator.style.transition = animate ? '' : 'none';
        this.indicator.style.left = `${centerX}px`;
        this.indicator.style.width = `${width}px`;

        if (!animate) {
            this.indicator.offsetHeight;
            this.indicator.style.transition = '';
        }
    }
};

// =============================================================================
// 5. PROJECTS
// =============================================================================
const Projects = {
    bannerTimeout: null,

    async init() {
        const homeContainer = $(CONFIG.selectors.projectsHome);
        const pageContainer = $(CONFIG.selectors.projectsPage);
        
        // Skip if no containers exist on this page
        if (!homeContainer && !pageContainer) return;
        
        try {
            const response = await fetch('/projects.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            
            if (!data.projects || !Array.isArray(data.projects)) {
                throw new Error('Invalid projects data format');
            }
            
            this.render(data.projects);
        } catch (error) {
            console.error('Failed to load projects:', error);
            // Show user-friendly error message
            this.renderError(homeContainer || pageContainer);
        }
    },
    
    renderError(container) {
        if (!container) return;
        container.innerHTML = `
            <div class="project-card" style="text-align: center; color: var(--color-text-muted);">
                <p>Unable to load projects. Please refresh the page.</p>
            </div>
        `;
    },

    render(projects) {
        const homeContainer = $(CONFIG.selectors.projectsHome);
        const pageContainer = $(CONFIG.selectors.projectsPage);

        if (homeContainer) {
            projects.filter(p => p.favorite).forEach(project => {
                homeContainer.appendChild(this.createCard(project, true));
            });
        }

        if (pageContainer) {
            const datesColumn = $(CONFIG.selectors.datesColumn);
            const projectCards = [];
            const dateElements = [];

            projects.forEach((project, index) => {
                const card = this.createCard(project, false, index);
                pageContainer.appendChild(card);
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
                DateTracker.init(pageContainer, projectCards, dateElements);
            }
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

        const titleHTML = `
            <h3 class="project-title">
                ${escapeHtml(project.name)}
                <span class="external-icon" aria-hidden="true">↗</span>
            </h3>
        `;

        if (isHome) {
            card.innerHTML = `
                <div class="project-header-home">
                    ${titleHTML}
                    <span class="project-date-home">${escapeHtml(project.date)}</span>
                </div>
            `;
        } else {
            const descriptionHTML = project.description
                .map(desc => `<p><span class="desc-bullet">-</span><span class="desc-text">${escapeHtml(desc)}</span></p>`)
                .join('');

            card.innerHTML = `
                <div class="project-header">${titleHTML}</div>
                <div class="project-description">${descriptionHTML}</div>
                <div class="project-date-inline">${escapeHtml(project.date)}</div>
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
            banner.setAttribute('role', 'alert');
            banner.setAttribute('aria-live', 'polite');
            banner.innerHTML = `
                <span class="banner-icon" aria-hidden="true">⚠</span>
                <span class="banner-text">Link Unavailable</span>
            `;
            document.body.appendChild(banner);
        }

        banner.classList.remove('show');
        clearTimeout(this.bannerTimeout);
        
        // Small delay to ensure CSS transition triggers
        requestAnimationFrame(() => {
            banner.classList.add('show');
            this.bannerTimeout = setTimeout(() => {
                banner.classList.remove('show');
            }, CONFIG.timing.bannerDuration);
        });
    }
};

// =============================================================================
// 6. DATE TRACKER
// =============================================================================
const DateTracker = {
    projectsGrid: null,
    projectCards: [],
    dateElements: [],
    hoveredIndex: null,
    fadeZone: 50,

    init(grid, cards, dates) {
        this.projectsGrid = grid;
        this.projectCards = cards;
        this.dateElements = dates;

        cards.forEach((card, index) => {
            card.addEventListener('mouseenter', () => this.setHovered(index));
            card.addEventListener('mouseleave', () => this.setHovered(null));
        });

        grid.addEventListener('scroll', () => this.updatePositions());
        window.addEventListener('resize', () => this.updatePositions());
        this.updatePositions();
    },

    setHovered(index) {
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

        this.projectCards.forEach((card, index) => {
            const cardRect = card.getBoundingClientRect();
            const dateEl = this.dateElements[index];
            if (!dateEl) return;

            const cardCenterY = cardRect.top + cardRect.height / 2;
            const relativeToGrid = cardCenterY - gridRect.top;
            const dateHeight = dateEl.offsetHeight;
            
            dateEl.style.top = `${gridOffset + relativeToGrid - dateHeight / 2}px`;

            const isCenterVisible = cardCenterY >= visibleTop && cardCenterY <= visibleBottom;
            dateEl.style.opacity = isCenterVisible 
                ? this.calculateOpacity(index, cardCenterY, visibleTop, visibleBottom)
                : '0';
        });
    },

    calculateOpacity(index, cardCenterY, visibleTop, visibleBottom) {
        const distanceToEdge = Math.min(cardCenterY - visibleTop, visibleBottom - cardCenterY);
        const edgeFade = distanceToEdge < this.fadeZone ? distanceToEdge / this.fadeZone : 1;

        let baseOpacity = 0.3;
        if (this.hoveredIndex !== null && index === this.hoveredIndex) {
            baseOpacity = 1;
        }

        return (baseOpacity * edgeFade).toString();
    }
};

// =============================================================================
// 7. SKILLS
// =============================================================================
const Skills = {
    container: null,
    allSkills: [],
    lines: [[], [], [], []],
    lineContainers: [],
    lineElements: [[], [], [], []],
    lineLocks: [false, false, false, false],
    animationInterval: null,
    skillWidths: {},
    lineWidth: 0,
    gap: 8,
    
    async init() {
        this.container = $(CONFIG.selectors.skillsContainer);
        if (!this.container) return;

        try {
            const response = await fetch('/skills.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            
            if (!data.skills || !Array.isArray(data.skills)) {
                throw new Error('Invalid skills data format');
            }
            
            this.allSkills = [...data.skills];
            this.shuffleArray(this.allSkills);
            this.calculateLineWidth();
            this.measureAllSkills();
            this.fillAllLines();
            this.render();
            this.startAnimation();
            
            // Debounced resize handler
            this._resizeHandler = debounce(() => this.handleResize(), CONFIG.timing.resizeDebounce);
            window.addEventListener('resize', this._resizeHandler);
        } catch (error) {
            console.error('Failed to load skills:', error);
            this.renderError();
        }
    },
    
    renderError() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="skills-line" style="justify-content: center;">
                <div class="skill-box visible" style="color: var(--color-text-muted);">
                    Unable to load skills
                </div>
            </div>
        `;
    },

    calculateLineWidth() {
        const containerRect = this.container.getBoundingClientRect();
        this.lineWidth = containerRect.width - 32;
        this.gap = parseInt(getComputedStyle(this.container).gap) || 8;
    },

    measureAllSkills() {
        const measureEl = document.createElement('div');
        measureEl.className = 'skill-box';
        measureEl.style.cssText = 'position: absolute; visibility: hidden; white-space: nowrap;';
        document.body.appendChild(measureEl);
        
        this.skillWidths = {};
        this.allSkills.forEach(skill => {
            measureEl.textContent = skill;
            this.skillWidths[skill] = measureEl.offsetWidth;
        });
        
        document.body.removeChild(measureEl);
    },

    fillLine(availableSkills, lineWidth) {
        const result = [];
        let currentWidth = 0;
        const used = new Set();
        const shuffled = [...availableSkills];
        this.shuffleArray(shuffled);
        
        let attempts = 0;
        const maxAttempts = shuffled.length * 3;
        
        while (attempts < maxAttempts) {
            const skill = shuffled[Math.floor(Math.random() * shuffled.length)];
            
            if (used.has(skill)) {
                attempts++;
                continue;
            }
            
            const skillWidth = this.skillWidths[skill] || 100;
            const gapWidth = result.length > 0 ? this.gap : 0;
            const newWidth = currentWidth + gapWidth + skillWidth;
            
            if (newWidth <= lineWidth) {
                result.push(skill);
                currentWidth = newWidth;
                used.add(skill);
            } else if (currentWidth / lineWidth >= 0.8) {
                break;
            }
            
            attempts++;
        }
        
        return result;
    },

    fillAllLines() {
        this.lines = [[], [], [], []];
        const usedSkills = new Set();
        
        for (let i = 0; i < 4; i++) {
            const available = this.allSkills.filter(s => !usedSkills.has(s));
            if (available.length === 0) break;
            
            this.lines[i] = this.fillLine(available, this.lineWidth);
            this.lines[i].forEach(s => usedSkills.add(s));
        }
    },

    render() {
        this.container.innerHTML = '';
        this.lineContainers = [];
        this.lineElements = [[], [], [], []];
        
        let elementIndex = 0;
        
        for (let lineIndex = 0; lineIndex < 4; lineIndex++) {
            const lineContainer = document.createElement('div');
            lineContainer.className = 'skills-line';
            lineContainer.dataset.lineIndex = lineIndex;
            this.container.appendChild(lineContainer);
            this.lineContainers.push(lineContainer);
            
            this.lines[lineIndex].forEach(skill => {
                const box = this.createSkillBox(skill, lineIndex);
                lineContainer.appendChild(box);
                this.lineElements[lineIndex].push(box);
                
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
        box.textContent = skill;
        box.dataset.skillName = skill;
        box.dataset.lineIndex = lineIndex;
        return box;
    },

    startAnimation() {
        if (prefersReducedMotion()) return;
        this.stopAnimation();
        this.lineLocks = [false, false, false, false];
        this.animationInterval = setInterval(() => this.performSwap(), CONFIG.timing.swapInterval);
        
        // Set up visibility handler once (using bound method for proper cleanup)
        if (!this._visibilityHandler) {
            this._visibilityHandler = () => {
                if (document.hidden) {
                    this.stopAnimation();
                } else {
                    this.cleanupHighlights();
                    this.startAnimation();
                }
            };
            document.addEventListener('visibilitychange', this._visibilityHandler);
        }
    },

    stopAnimation() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
    },

    cleanupHighlights() {
        this.container?.querySelectorAll('.skill-box').forEach(box => {
            box.classList.remove('highlighted', 'fading-out', 'fading-in');
            if (!box.classList.contains('visible')) box.classList.add('visible');
        });
        this.lineLocks = [false, false, false, false];
    },

    performSwap() {
        // Find a valid swap
        let swapData = null;
        for (let attempts = 0; attempts < 5 && !swapData; attempts++) {
            swapData = this.findSwapCandidate();
        }
        if (!swapData) return;

        const { lineIndex, startIndex, endIndex, removedElements, newSkills } = swapData;
        const lineSkills = this.lines[lineIndex];
        const lineElements = this.lineElements[lineIndex];
        
        this.lineLocks[lineIndex] = true;

        // Check if animations are enabled (handles both Settings not initialized and disabled state)
        const animationsEnabled = Settings.animationsEnabled !== false;
        
        if (!animationsEnabled) {
            this.executeSwap(lineIndex, lineSkills, lineElements, startIndex, endIndex, removedElements, newSkills, false);
            return;
        }

        // Animated swap
        removedElements.forEach(el => el?.classList.add('highlighted'));
        
        setTimeout(() => {
            // Re-check if animations were disabled during the highlight phase
            if (!Settings.animationsEnabled) {
                this.lineLocks[lineIndex] = false;
                return;
            }
            
            removedElements.forEach(el => el?.classList.add('fading-out'));
            
            setTimeout(() => {
                // Re-check if animations were disabled during the fade-out phase
                if (!Settings.animationsEnabled) {
                    this.lineLocks[lineIndex] = false;
                    return;
                }
                
                this.executeSwap(lineIndex, lineSkills, lineElements, startIndex, endIndex, removedElements, newSkills, true);
            }, CONFIG.timing.fadeOutDuration);
        }, CONFIG.timing.highlightDuration);
    },

    findSwapCandidate() {
        const lineIndex = Math.floor(Math.random() * 4);
        if (this.lineLocks[lineIndex]) return null;
        
        const lineSkills = this.lines[lineIndex];
        if (lineSkills.length === 0) return null;
        
        // Select 1-3 adjacent skills
        const swapCount = Math.floor(Math.random() * 3) + 1;
        const maxStart = Math.max(0, lineSkills.length - swapCount);
        const startIndex = Math.floor(Math.random() * (maxStart + 1));
        const endIndex = Math.min(startIndex + swapCount, lineSkills.length);
        
        if (endIndex === startIndex) return null;
        
        // Calculate available width
        const removedElements = this.lineElements[lineIndex].slice(startIndex, endIndex);
        let remainingWidth = 0;
        for (let i = 0; i < lineSkills.length; i++) {
            if (i < startIndex || i >= endIndex) {
                remainingWidth += this.skillWidths[lineSkills[i]] || 100;
            }
        }
        const remainingCount = lineSkills.length - (endIndex - startIndex);
        if (remainingCount > 1) remainingWidth += (remainingCount - 1) * this.gap;
        
        const hasSkillsBefore = startIndex > 0;
        const hasSkillsAfter = endIndex < lineSkills.length;
        const extraGaps = (hasSkillsBefore ? 1 : 0) + (hasSkillsAfter ? 1 : 0);
        const availableWidth = this.lineWidth - remainingWidth - (extraGaps * this.gap);
        
        // Find replacement skills
        const displayedSkills = new Set();
        this.lines.forEach(line => line.forEach(s => displayedSkills.add(s)));
        const availableSkills = this.allSkills.filter(s => !displayedSkills.has(s));
        
        if (availableSkills.length === 0) return null;
        
        const newSkills = this.fillLine(availableSkills, availableWidth);
        if (newSkills.length === 0) return null;
        
        return { lineIndex, startIndex, endIndex, removedElements, newSkills };
    },

    executeSwap(lineIndex, lineSkills, lineElements, startIndex, endIndex, removedElements, newSkills, animated) {
        const newElements = newSkills.map(skill => {
            const box = this.createSkillBox(skill, lineIndex);
            box.classList.remove('fade-in');
            box.classList.add(animated ? 'fading-in' : 'visible');
            return box;
        });
        
        const lineContainer = this.lineContainers[lineIndex];
        const insertBeforeElement = removedElements[0];
        
        newElements.forEach(el => lineContainer.insertBefore(el, insertBeforeElement));
        removedElements.forEach(el => el?.parentNode?.removeChild(el));
        
        // Update state
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
        
        this.lineElements[lineIndex].forEach(el => el.dataset.lineIndex = lineIndex);
        
        if (animated) {
            requestAnimationFrame(() => {
                newElements.forEach(el => {
                    el?.classList.remove('fading-in');
                    el?.classList.add('visible', 'highlighted');
                });
            });
            
            setTimeout(() => {
                newElements.forEach(el => el?.classList.remove('highlighted'));
                this.lineLocks[lineIndex] = false;
            }, CONFIG.timing.fadeInDuration + CONFIG.timing.highlightDuration);
        } else {
            this.lineLocks[lineIndex] = false;
        }
    },

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    handleResize() {
        this.stopAnimation();
        
        const oldWidth = this.lineWidth;
        this.calculateLineWidth();
        
        // Only re-render if width changed significantly
        if (Math.abs(this.lineWidth - oldWidth) > 50) {
            this.measureAllSkills();
            this.fillAllLines();
            this.render();
        }
        
        this.startAnimation();
    }
};

// =============================================================================
// 8. INFO TOOLTIP
// =============================================================================
class InfoTooltipHandler extends HoverDropdown {
    constructor() {
        super('.info-icon', '.info-tooltip');
    }

    init() {
        super.init();
        if (!this.dropdown) return;
        
        // Stop propagation on tooltip link to let native navigation work
        const link = this.dropdown.querySelector('.info-tooltip-link');
        if (link) {
            link.addEventListener('click', (e) => e.stopPropagation());
        }
    }

    onActivate() {
        this.trigger.classList.add('active');
    }

    onDeactivate() {
        this.trigger.classList.remove('active');
    }
}

const InfoTooltip = new InfoTooltipHandler();

// =============================================================================
// 9. SETTINGS
// =============================================================================
class SettingsHandler extends HoverDropdown {
    constructor() {
        super('.settings-btn', '.settings-dropdown', '.settings-wrapper');
        this.animationsEnabled = true;
    }

    init() {
        super.init();
        if (!this.trigger || !this.dropdown) return;
        
        this.animationsToggle = document.getElementById('animations-toggle');
        
        // Load saved preference
        const saved = localStorage.getItem(CONFIG.storage.animationsEnabled);
        this.animationsEnabled = saved !== 'false';
        
        if (this.animationsToggle) {
            this.animationsToggle.checked = this.animationsEnabled;
            this.animationsToggle.addEventListener('change', () => {
                this.animationsEnabled = this.animationsToggle.checked;
                localStorage.setItem(CONFIG.storage.animationsEnabled, this.animationsEnabled);
                this.applyAnimationState();
            });
        }
        
        this.applyAnimationState();
    }

    onActivate() {
        this.wrapper?.classList.add('active');
        this.trigger.classList.add('active');
        this.trigger.setAttribute('aria-expanded', 'true');
    }

    onDeactivate() {
        this.wrapper?.classList.remove('active');
        this.trigger.classList.remove('active');
        this.trigger.setAttribute('aria-expanded', 'false');
    }

    applyAnimationState() {
        if (this.animationsEnabled) {
            document.body.classList.remove(CONFIG.classes.animationsDisabled);
        } else {
            document.body.classList.add(CONFIG.classes.animationsDisabled);
            Skills.cleanupHighlights();
        }
    }
}

const Settings = new SettingsHandler();

// =============================================================================
// 10. FOOTER
// =============================================================================
const Footer = {
    init() {
        const yearEl = $(CONFIG.selectors.yearElement);
        if (yearEl) yearEl.textContent = new Date().getFullYear();
    }
};

// =============================================================================
// 11. GLOBAL SCROLL HANDLER
// Allows scrolling projects list from anywhere on page when there's no main scrollbar
// =============================================================================
const GlobalScroll = {
    container: null,
    isOverContainer: false,

    init() {
        this.container = $(CONFIG.selectors.projectsPage) || $(CONFIG.selectors.projectsHome);
        if (!this.container) return;

        this.container.addEventListener('mouseenter', () => { this.isOverContainer = true; });
        this.container.addEventListener('mouseleave', () => { this.isOverContainer = false; });
        document.addEventListener('wheel', (e) => this._handleWheel(e), { passive: false });
    },

    _handleWheel(e) {
        if (isTouchDevice() || !this.container) return;
        
        const canScroll = this.container.scrollHeight > this.container.clientHeight;
        const pageHasScroll = document.documentElement.scrollHeight > document.documentElement.clientHeight;

        // Redirect scroll to container if page doesn't scroll and cursor not over container
        if (canScroll && !pageHasScroll && !this.isOverContainer) {
            e.preventDefault();
            let deltaY = e.deltaY;
            if (e.deltaMode === 1) deltaY *= 20;
            else if (e.deltaMode === 2) deltaY *= this.container.clientHeight;
            this.container.scrollTop += deltaY;
        }
    }
};

// =============================================================================
// 12. INITIALIZATION
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Apply animation state early to prevent flash
    if (localStorage.getItem(CONFIG.storage.animationsEnabled) === 'false') {
        document.body.classList.add(CONFIG.classes.animationsDisabled);
    }
    
    // Initialize all modules
    Footer.init();
    Navigation.init();
    Projects.init();
    Skills.init();
    InfoTooltip.init();
    Settings.init();
    GlobalScroll.init();
});