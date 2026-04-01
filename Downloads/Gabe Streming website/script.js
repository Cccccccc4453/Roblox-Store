// Supabase Client Initialization
const SUPABASE_URL = 'https://nniegivrkkvzlqkkmtuq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RLaStEMHJaLvLGkvEtD25A_2u3yNElf';

const { createClient } = supabase;
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Add a listener for auth state changes to re-run handleAuthStatus
window.supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log('Supabase auth state changed:', event, session);
    // Only call handleAuthStatus if it's not already handling a redirect or initial load
    if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN') {
        window.handleAuthStatus();
    }
});

// --- Authentication Functions ---
window.handleAuthStatus = async function() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    const user = session?.user;

    const authContainer = document.getElementById('auth-container'); // This will contain login/signup forms
    const authenticatedContent = document.getElementById('authenticated-content'); // This will contain the main website content
    const loginLink = document.getElementById('login-link');
    const logoutButton = document.getElementById('logout-button-nav'); // Keep this for event listener setup if needed, but display handled by parent
    const userInfoSpan = document.getElementById('user-info-span'); // Keep this for text content, but display handled by parent
    const authNavItems = document.getElementById('auth-nav-items'); // New

    if (user) {
        // User is logged in
        if (authContainer) authContainer.style.display = 'none';
        if (authenticatedContent) authenticatedContent.style.display = 'block';
        if (loginLink) loginLink.style.display = 'none';
        if (authNavItems) authNavItems.style.display = 'block'; // Changed
        if (userInfoSpan) {
            userInfoSpan.textContent = `Welcome, ${user.email}`;
        }
        return user;
    } else {
        // User is not logged in
        if (authContainer) authContainer.style.display = 'block';
        if (authenticatedContent) authenticatedContent.style.display = 'none';
        if (loginLink) loginLink.style.display = 'block';
        if (authNavItems) authNavItems.style.display = 'none'; // Changed
        if (userInfoSpan) userInfoSpan.textContent = ''; // Clear user info on logout
        return null;
    }
};

window.signIn = async function(email, password) {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });
    if (error) {
        console.error('Login error:', error.message);
        return { success: false, error: error.message };
    } else {
        console.log('User logged in:', data.user);
        window.handleAuthStatus(); // Update UI after login
        return { success: true };
    }
};

window.signUp = async function(email, password) {
    const { data, error } = await window.supabaseClient.auth.signUp({
        email: email,
        password: password,
    });
    if (error) {
        console.error('Sign up error:', error.message);
        return { success: false, error: error.message };
    } else {
        console.log('User signed up:', data.user);
        alert('Please check your email to confirm your account!');
        return { success: true };
    }
};

window.signOut = async function() {
    const { error } = await window.supabaseClient.auth.signOut();
    if (error) {
        console.error('Logout error:', error.message);
    } else {
        console.log('User logged out.');
        window.handleAuthStatus(); // Update UI after logout
        // Optionally redirect to home or login page if desired
        window.location.href = window.location.origin + '/index.html';
    }
};

let activeTimers = {}; // Object to store active countdown timers

function showSpinner(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        const spinner = container.querySelector('.loading-spinner');
        const loadingText = container.querySelector('p');
        if (spinner) spinner.style.display = 'block';
        if (loadingText && loadingText.classList.contains('loading-text')) loadingText.style.display = 'block';
    }
}

function hideSpinner(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        const spinner = container.querySelector('.loading-spinner');
        const loadingText = container.querySelector('p');
        if (spinner) spinner.style.display = 'none';
        if (loadingText && loadingText.classList.contains('loading-text')) loadingText.style.display = 'none';
    }
}

// General purpose JavaScript functions can go here

window.getStreams = async function() {
    const { data, error } = await supabaseClient
        .from('streams')
        .select('*');
    if (error) {
        console.error('Error fetching streams:', error.message);
        return [];
    }
    return data;
}

function formatTimeRemaining(endTime) {
    const now = new Date().getTime();
    const distance = new Date(endTime).getTime() - now;

    if (distance < 0) {
        return "Live Now!"; // Event has started
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    let timeString = "";
    if (days > 0) timeString += `${days}d `;
    if (hours > 0 || days > 0) timeString += `${hours}h `;
    if (minutes > 0 || hours > 0 || days > 0) timeString += `${minutes}m `;
    timeString += `${seconds}s`;

    return `Starts in: ${timeString.trim()}`;
}

// We will implement a saveStreams equivalent later when we handle admin actions.
// For now, getStreams will directly fetch from Supabase.

async function getCountByType() {
    const streams = await getStreams(); // Use the new async getStreams
    return {
        events: streams.filter(s => s.streamType === 'event').length,
        replays: streams.filter(s => s.streamType === 'replay').length,
        channels: streams.filter(s => s.streamType === '24/7 Channel').length
    };
}

async function updateHomeStats() { // Make this async
    const counts = await getCountByType(); // Await the async function
    const liveCountEl = document.getElementById('live-events-count');
    const replayCountEl = document.getElementById('replay-count');
    const channelCountEl = document.getElementById('channels-count');

    if (liveCountEl) liveCountEl.textContent = counts.events;
    if (replayCountEl) replayCountEl.textContent = counts.replays;
    if (channelCountEl) channelCountEl.textContent = counts.channels;
}

async function renderFeaturedEvents() { // Make this async
    // Clear all existing timers before re-rendering
    Object.values(activeTimers).forEach(clearInterval);
    activeTimers = {}; // Reset the active timers object

    const streams = await getStreams(); // Await the async function
    const featuredStreams = streams.filter(s => s.streamType === 'event' || s.streamType === '24/7 Channel');
    const container = document.getElementById('featured-events-grid');

    if (!container) return;
    if (featuredStreams.length === 0) {
        container.innerHTML = '<p>No featured streams yet. Add one via admin.</p>';
        return;
    }

    container.innerHTML = '';
    featuredStreams.slice(0, 4).forEach(s => {
        const card = document.createElement('div');
        card.className = 'event-card';
        const countdownId = `countdown-${s.id}`;

        // Determine initial button state
        let buttonClass = 'watch-now-btn';
        let buttonText = '<span style="display:inline-block;vertical-align:middle;margin-right:8px;">▶️</span>Watch Now';
        let initialTimeRemaining = null; // Initialize to null

        if (s.streamType === 'event' && s.eventStartTime) {
            initialTimeRemaining = formatTimeRemaining(s.eventStartTime);

            if (initialTimeRemaining !== "Live Now!") {
                buttonClass = 'watch-soon-btn';
                buttonText = '<span style="display:inline-block;vertical-align:middle;margin-right:8px;">▶️</span>Watch Soon';
            }
        }

        card.innerHTML = `
            <div class="event-card-content">
                <h4>${s.eventName}</h4>
                ${s.isPostponed ? `<p class="postponed-status">POSTPONED</p><p class="postponed-reason">${s.postponementReason || 'Reason not specified.'}</p>` : ''}
                ${!s.isPostponed && s.streamType === 'event' && s.eventStartTime ? `<p><strong>Starts:</strong> ${new Date(s.eventStartTime).toLocaleString()}</p><p id="${countdownId}" class="countdown-timer">${initialTimeRemaining !== null ? initialTimeRemaining : ''}</p>` : ''}
                <p><strong>Type:</strong> ${s.streamType}</p>
                <p><strong>Category:</strong> ${s.eventCategory || 'N/A'}</p>
                <button id="watch-btn-${s.id}" class="${buttonClass}" ${s.isPostponed ? 'disabled' : ''} onclick="window.location.href='stream.html?streamUrl=${encodeURIComponent(s.streamUrl)}&eventName=${encodeURIComponent(s.eventName)}&eventTime=${encodeURIComponent(s.eventStartTime)}&imageUrl=${encodeURIComponent(s.imageUrl)}'">\
                    ${buttonText}
                </button>
            </div>
        `;
        container.appendChild(card);

        // Start countdown for event streams
        if (s.streamType === 'event' && s.eventStartTime) {
            const updateCountdown = () => {
                const countdownElement = document.getElementById(countdownId);
                const watchButton = document.getElementById(`watch-btn-${s.id}`);
                if (countdownElement) {
                    const timeRemaining = formatTimeRemaining(s.eventStartTime);
                    countdownElement.textContent = timeRemaining;

                    if (timeRemaining === "Live Now!") {
                        clearInterval(activeTimers[s.id]); // Stop timer once live
                        delete activeTimers[s.id];
                        countdownElement.style.display = 'none'; // Hide countdown
                        if (watchButton) {
                            watchButton.className = 'watch-now-btn';
                            watchButton.innerHTML = '<span style="display:inline-block;vertical-align:middle;margin-right:8px;">▶️</span>Watch Now';
                            watchButton.style.cursor = 'pointer';
                            watchButton.style.opacity = '1';
                        }
                    } else {
                        if (watchButton) {
                             watchButton.className = 'watch-soon-btn';
                             watchButton.innerHTML = '<span style="display:inline-block;vertical-align:middle;margin-right:8px;">▶️</span>Watch Soon';
                             watchButton.style.cursor = 'not-allowed';
                             watchButton.style.opacity = '0.8';
                         }
                    }
                } else {
                    // If element is not found, clear the interval (e.g., card was removed)
                    clearInterval(activeTimers[s.id]);
                    delete activeTimers[s.id];
                }
            };
            updateCountdown(); // Initial call
            // Clear any existing timer for this stream before setting a new one
            if (activeTimers[s.id]) {
                clearInterval(activeTimers[s.id]);
            }
            activeTimers[s.id] = setInterval(updateCountdown, 1000);
        }
    });
}

window.renderLiveEventsPage = async function() {
    // Clear all existing timers before re-rendering
    Object.values(activeTimers).forEach(clearInterval);
    activeTimers = {}; // Reset the active timers object

    const streams = await window.getStreams();
    const eventStreams = streams.filter(s => s.streamType === 'event');
    const container = document.getElementById('live-events-grid');
    if (!container) return;
    if (eventStreams.length === 0) {
        container.innerHTML = '<p>No live or upcoming events currently available. Add one in Admin.</p>';
        return;
    }
    container.innerHTML = '';
    eventStreams.forEach(s => {
        const card = document.createElement('div');
        card.className = 'event-card channel-card-modern';
        const countdownId = `countdown-${s.id}`;

        // Determine initial button state and countdown visibility
        let buttonClass = 'watch-now-btn channel-card-btn';
        let buttonText = '<span style="display:inline-block;vertical-align:middle;margin-right:8px;">▶️</span>Watch Now';
        let initialTimeRemaining = null;
        let showLiveBadge = false;
        let countdownHtml = '';

        if (s.eventStartTime) {
            initialTimeRemaining = formatTimeRemaining(s.eventStartTime);
            if (initialTimeRemaining !== "Live Now!") {
                buttonClass = 'watch-soon-btn channel-card-btn';
                buttonText = '<span style="display:inline-block;vertical-align:middle;margin-right:8px;">▶️</span>Watch Soon';
                countdownHtml = `<p id="${countdownId}" class="countdown-timer">${initialTimeRemaining}</p>`;
            } else {
                showLiveBadge = true;
            }
        }

        card.innerHTML = `
            <div class="event-card-content channel-card-content">
                ${s.isPostponed ? `<div class="live-now-badge channel-card-live" style="background-color: #ffc107;">POSTPONED</div><p class="postponed-reason">${s.postponementReason || 'Reason not specified.'}</p>` : ''}
                ${!s.isPostponed && showLiveBadge ? '<div class="live-now-badge channel-card-live"><span class="live-dot"></span>Live Now</div>' : ''}
                <img class="channel-card-img" src="${s.imageUrl || 'https://via.placeholder.com/300x160?text=Event'}" alt="${s.eventName}">
                <h4 class="channel-card-title">${s.eventName}</h4>
                <div class="channel-card-category">${s.eventCategory || 'N/A'}</div>
                ${!s.isPostponed ? countdownHtml : ''}
                <button id="watch-btn-${s.id}" class="${buttonClass}" ${s.isPostponed ? 'disabled' : ''} onclick="window.location.href='stream.html?streamUrl=${encodeURIComponent(s.streamUrl)}&eventName=${encodeURIComponent(s.eventName)}&eventTime=${encodeURIComponent(s.eventStartTime)}&imageUrl=${encodeURIComponent(s.imageUrl)}'">\
                    ${buttonText}
                </button>
            </div>
        `;
        container.appendChild(card);

        // Start countdown for event streams that are not live yet
        if (s.eventStartTime && initialTimeRemaining !== "Live Now!") {
            const updateCountdown = () => {
                const countdownElement = document.getElementById(countdownId);
                const watchButton = document.getElementById(`watch-btn-${s.id}`);
                const liveBadge = card.querySelector('.live-now-badge');

                if (countdownElement) {
                    const timeRemaining = formatTimeRemaining(s.eventStartTime);
                    countdownElement.textContent = timeRemaining;

                    if (timeRemaining === "Live Now!") {
                        clearInterval(activeTimers[s.id]); // Stop timer once live
                        delete activeTimers[s.id];
                        countdownElement.style.display = 'none'; // Hide countdown
                        if (liveBadge) liveBadge.style.display = 'block'; // Show live badge
                        if (watchButton) {
                            watchButton.className = 'watch-now-btn channel-card-btn';
                            watchButton.innerHTML = '<span style="display:inline-block;vertical-align:middle;margin-right:8px;">▶️</span>Watch Now';
                            watchButton.style.cursor = 'pointer';
                            watchButton.style.opacity = '1';
                        }
                    } else {
                        // Ensure live badge is hidden if not live yet
                        if (liveBadge) liveBadge.style.display = 'none';
                        if (watchButton) {
                             watchButton.className = 'watch-soon-btn channel-card-btn';
                             watchButton.innerHTML = '<span style="display:inline-block;vertical-align:middle;margin-right:8px;">▶️</span>Watch Soon';
                             watchButton.style.cursor = 'not-allowed';
                             watchButton.style.opacity = '0.8';
                         }
                    }
                } else {
                    clearInterval(activeTimers[s.id]);
                    delete activeTimers[s.id];
                }
            };
            updateCountdown(); // Initial call
            if (activeTimers[s.id]) {
                clearInterval(activeTimers[s.id]);
            }
            activeTimers[s.id] = setInterval(updateCountdown, 1000);
        }
    });
}

async function initEventsPage() {
    const liveEventsGrid = document.getElementById('live-events-grid');
    if (liveEventsGrid) showSpinner('live-events-grid');

    await window.renderLiveEventsPage();

    if (liveEventsGrid) hideSpinner('live-events-grid');

    window.supabaseClient
        .channel('public:streams')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'streams' }, async payload => {
            console.log('Change received on events page!', payload);
            if (liveEventsGrid) showSpinner('live-events-grid'); // Show spinner on real-time update
            await window.renderLiveEventsPage();
            if (liveEventsGrid) hideSpinner('live-events-grid'); // Hide spinner after update
        })
        .subscribe();
}

async function initChannelsPage() {
    const channelsGrid = document.getElementById('channels-grid');
    if (!channelsGrid) return;

    async function renderChannels() {
        if (channelsGrid) showSpinner('channels-grid'); // Show spinner before fetching
        // Clear all existing timers before re-rendering (for consistency, though channels don't have countdowns)
        Object.values(activeTimers).forEach(clearInterval);
        activeTimers = {}; // Reset the active timers object

        const allStreams = await window.getStreams();
        const channelStreams = allStreams.filter(s => s.streamType === '24/7 Channel');

        if (channelStreams.length === 0) {
            channelsGrid.innerHTML = '<p class="loading-text">No 24/7 channels currently available. Add one in Admin.</p>';
            if (channelsGrid) hideSpinner('channels-grid'); // Hide spinner if no channels
            return;
        }
        channelsGrid.innerHTML = '';
        channelStreams.forEach(stream => {
            const card = document.createElement('div');
            card.className = 'event-card channel-card-modern';
            card.innerHTML = `
                <div class="event-card-content channel-card-content">
                    <div class="live-now-badge channel-card-live"><span class="live-dot"></span>Live Now</div>
                    <img class="channel-card-img" src="${stream.imageUrl || 'https://via.placeholder.com/300x160?text=Channel'}" alt="${stream.eventName}">
                    <h4 class="channel-card-title">${stream.eventName}</h4>
                    <div class="channel-card-category">${stream.eventCategory || 'N/A'}</div>
                    <button class="watch-now-btn channel-card-btn" onclick="window.location.href='stream.html?streamUrl=${encodeURIComponent(stream.streamUrl)}&eventName=${encodeURIComponent(stream.eventName)}&eventTime=${encodeURIComponent(stream.eventStartTime)}&imageUrl=${encodeURIComponent(stream.imageUrl)}'">\
                        <span style='display:inline-block;vertical-align:middle;margin-right:8px;'>▶️</span>Watch Now
                    </button>
                </div>
            `;
            channelsGrid.appendChild(card);
        });
        if (channelsGrid) hideSpinner('channels-grid'); // Hide spinner after rendering
    }
    await renderChannels();

    window.supabaseClient
        .channel('public:streams')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'streams' }, async payload => {
            console.log('Change received on channels page!', payload);
            await renderChannels();
        })
        .subscribe();
}

async function initHomePage() {
    const featuredEventsGrid = document.getElementById('featured-events-grid');
    if (featuredEventsGrid) showSpinner('featured-events-grid');

    await renderFeaturedEvents();
    await updateHomeStats();

    if (featuredEventsGrid) hideSpinner('featured-events-grid');

    window.supabaseClient
        .channel('public:streams')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'streams' }, async payload => {
            console.log('Change received on home page!', payload);
            if (featuredEventsGrid) showSpinner('featured-events-grid'); // Show spinner on real-time update
            await renderFeaturedEvents(); // Re-render featured events
            await updateHomeStats();    // Update dashboard stats
            if (featuredEventsGrid) hideSpinner('featured-events-grid'); // Hide spinner after update
        })
        .subscribe();
}

// --- Animation Functions ---
window.initAnimations = function() {
    const animateElements = document.querySelectorAll('.animate-on-scroll');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            } else {
                // Optionally remove 'animated' class if element scrolls out of view
                // entry.target.classList.remove('animated');
            }
        });
    }, { threshold: 0.1 }); // Trigger when 10% of the item is visible

    animateElements.forEach(element => {
        observer.observe(element);
    });
};

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('live-events-grid')) { // Check if we are on events.html
        initEventsPage();
    }
    if (document.getElementById('featured-events-grid')) { // Check if we are on index.html
        initHomePage();
    }
    if (document.getElementById('channels-grid')) { // Check if we are on channels.html
        initChannelsPage();
    }

    // Scroll-to-top button logic
    const scrollToTopBtn = document.getElementById('scroll-to-top');

    if (scrollToTopBtn) {
        // Show or hide the button based on scroll position
        window.onscroll = function() {
            if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
                scrollToTopBtn.style.display = 'block';
            } else {
                scrollToTopBtn.style.display = 'none';
            }
        };

        // When the user clicks on the button, scroll to the top of the document
        scrollToTopBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Fade-in animation for elements on scroll
    const faders = document.querySelectorAll('.fade-in');

    const appearOptions = {
        threshold: 0.2,
        rootMargin: "0px 0px -50px 0px"
    };

    const appearOnScroll = new IntersectionObserver(function(entries, appearOnScroll) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('appear');
                appearOnScroll.unobserve(entry.target);
            }
        });
    }, appearOptions);

    faders.forEach(fader => {
        appearOnScroll.observe(fader);
    });



});

