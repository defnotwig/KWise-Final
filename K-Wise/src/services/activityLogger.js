/**
 * Frontend Activity Logger Service
 * Logs all UI interactions to backend for comprehensive audit trail
 */

const API_BASE = 'http://localhost:5000/api';

class ActivityLogger {
    constructor() {
        this.enabled = true;
        this.queue = [];
        this.flushInterval = 5000; // Flush every 5 seconds
        this.startAutoFlush();
    }

    /**
     * Log a UI interaction
     */
    async log(action, description, component = '', metadata = {}) {
        if (!this.enabled) return;

        const activity = {
            action,
            description,
            component,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                pathname: window.location.pathname
            }
        };

        this.queue.push(activity);

        // If queue is large, flush immediately
        if (this.queue.length >= 10) {
            await this.flush();
        }
    }

    /**
     * Flush queued activities to backend
     */
    async flush() {
        if (this.queue.length === 0) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        const activities = [...this.queue];
        this.queue = [];

        try {
            // Send all activities in batch
            for (const activity of activities) {
                await fetch(`${API_BASE}/activity/log-interaction`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(activity)
                });
            }
        } catch (error) {
            console.error('Failed to log activities:', error);
            // Re-queue failed activities
            this.queue.unshift(...activities);
        }
    }

    /**
     * Start auto-flushing
     */
    startAutoFlush() {
        setInterval(() => {
            this.flush();
        }, this.flushInterval);

        // Flush on page unload
        window.addEventListener('beforeunload', () => {
            this.flush();
        });
    }

    /**
     * Helper methods for common actions
     */
    logButtonClick(buttonName, component, metadata = {}) {
        this.log('CLICK', `Clicked button: ${buttonName}`, component, metadata);
    }

    logPageView(pageName) {
        this.log('VIEW', `Viewed page: ${pageName}`, 'Navigation', {
            page: pageName
        });
    }

    logSearch(query, resultsCount) {
        this.log('SEARCH', `Searched for: "${query}" (${resultsCount} results)`, 'Search', {
            query,
            resultsCount
        });
    }

    logFilter(filterName, filterValue, component) {
        this.log('FILTER', `Applied filter: ${filterName} = ${filterValue}`, component, {
            filterName,
            filterValue
        });
    }

    logExport(exportType, component) {
        this.log('EXPORT', `Exported data as ${exportType}`, component, {
            exportType
        });
    }

    logCreate(itemType, itemId, component) {
        this.log('CREATE', `Created ${itemType}: ${itemId}`, component, {
            itemType,
            itemId
        });
    }

    logUpdate(itemType, itemId, component) {
        this.log('UPDATE', `Updated ${itemType}: ${itemId}`, component, {
            itemType,
            itemId
        });
    }

    logDelete(itemType, itemId, component) {
        this.log('DELETE', `Deleted ${itemType}: ${itemId}`, component, {
            itemType,
            itemId
        });
    }

    /**
     * Enable/disable logging
     */
    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }
}

// Export singleton instance
const activityLogger = new ActivityLogger();
export default activityLogger;

