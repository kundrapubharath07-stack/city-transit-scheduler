/**
 * APSRTC Kakinada City Transit & Route Optimizer
 * Main Application Frontend Controller (Unified Vanilla JS)
 */

// --- Global State ---
let authToken = localStorage.getItem("apsrtc_token") || null;
let currentUser = null;
try {
    currentUser = JSON.parse(localStorage.getItem("apsrtc_user") || "null");
} catch (e) {
    currentUser = null;
}

let allStops = [];
let allRoutes = [];
let allBuses = [];
let allTimetables = [];
let allAlerts = [];
let allOccupancy = [];
let confirmCallback = null;

// --- API Helper ---
async function apiCall(endpoint, method = "GET", body = null) {
    const headers = {};
    if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
    }
    if (body) {
        headers["Content-Type"] = "application/json";
    }

    try {
        const res = await fetch(endpoint, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `HTTP error ${res.status}`);
            }
            return data;
        } else {
            return await res.text();
        }
    } catch (err) {
        console.error(`API Error on ${method} ${endpoint}:`, err);
        throw err;
    }
}

// --- Toast Notifications ---
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast-item ${type}`;

    let iconClass = "fa-circle-info text-blue-400";
    if (type === "success") iconClass = "fa-circle-check text-emerald-400";
    if (type === "error") iconClass = "fa-triangle-exclamation text-rose-400";
    if (type === "warning") iconClass = "fa-circle-exclamation text-amber-400";

    toast.innerHTML = `
        <i class="fa-solid ${iconClass} text-base flex-shrink-0"></i>
        <span class="flex-1">${message}</span>
        <button class="text-slate-400 hover:text-white transition ml-2 text-xs" onclick="this.parentElement.remove()">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-10px)";
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}

// --- Confirmation Modal ---
function showConfirm(title, message, onConfirm) {
    const modal = document.getElementById("confirm-modal");
    document.getElementById("confirm-title").innerText = title;
    document.getElementById("confirm-msg").innerText = message;
    confirmCallback = onConfirm;

    const okBtn = document.getElementById("confirm-ok-btn");
    okBtn.onclick = () => {
        closeConfirmModal(true);
    };

    modal.classList.remove("hidden");
}

function closeConfirmModal(confirmed = false) {
    const modal = document.getElementById("confirm-modal");
    modal.classList.add("hidden");
    if (confirmed && typeof confirmCallback === "function") {
        confirmCallback();
    }
    confirmCallback = null;
}

// --- View Switching (Public vs Admin) ---
function switchView(viewName) {
    const publicView = document.getElementById("view-public");
    const adminView = document.getElementById("view-admin");
    const navPublicBtn = document.getElementById("nav-public-btn");
    const navAdminDashBtn = document.getElementById("nav-admin-dash-btn");

    if (viewName === "admin") {
        if (!authToken) {
            openLoginModal();
            return;
        }
        publicView.classList.add("hidden");
        adminView.classList.remove("hidden");

        if (navPublicBtn) {
            navPublicBtn.classList.remove("bg-rose-600", "text-white");
            navPublicBtn.classList.add("bg-slate-800", "text-slate-300");
        }
        if (navAdminDashBtn) {
            navAdminDashBtn.classList.remove("text-rose-300");
            navAdminDashBtn.classList.add("bg-rose-600", "text-white");
        }

        switchAdminSection("overview");
        window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
        adminView.classList.add("hidden");
        publicView.classList.remove("hidden");

        if (navPublicBtn) {
            navPublicBtn.classList.add("bg-rose-600", "text-white");
            navPublicBtn.classList.remove("bg-slate-800", "text-slate-300");
        }
        if (navAdminDashBtn) {
            navAdminDashBtn.classList.remove("bg-rose-600", "text-white");
            navAdminDashBtn.classList.add("text-rose-300");
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}


// --- Public Section Navigation Smooth Scroll ---
function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function scrollToAlerts() {
    const alertSec = document.getElementById("public-alerts-section");
    if (alertSec) {
        alertSec.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

// --- Authentication ---
function openLoginModal() {
    const modal = document.getElementById("login-modal");
    const errBox = document.getElementById("login-error-msg");
    if (errBox) errBox.classList.add("hidden");
    modal.classList.remove("hidden");
    const input = document.getElementById("login-username");
    if (input) input.focus();
}

function closeLoginModal() {
    document.getElementById("login-modal").classList.add("hidden");
}

function togglePasswordVisibility() {
    const pwdInput = document.getElementById("login-password");
    const icon = document.getElementById("toggle-pwd-icon");
    const text = document.getElementById("toggle-pwd-text");

    if (pwdInput.type === "password") {
        pwdInput.type = "text";
        icon.className = "fa-solid fa-eye-slash text-xs";
        text.innerText = "Hide";
    } else {
        pwdInput.type = "password";
        icon.className = "fa-solid fa-eye text-xs";
        text.innerText = "Show";
    }
}

function fillDemoCredentials() {
    document.getElementById("login-username").value = "admin";
    document.getElementById("login-password").value = "Admin@123";
}

async function handleAdminLogin(event) {
    event.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();
    const errBox = document.getElementById("login-error-msg");
    const errText = document.getElementById("login-error-text");

    try {
        const res = await apiCall("/api/auth/login", "POST", { username, password });
        if (res.success && res.token) {
            authToken = res.token;
            currentUser = res.user;
            localStorage.setItem("apsrtc_token", authToken);
            localStorage.setItem("apsrtc_user", JSON.stringify(currentUser));

            updateAuthUI();
            closeLoginModal();
            showToast(`Welcome back, ${currentUser.full_name || currentUser.username}!`, "success");
            switchView("admin");
        }
    } catch (err) {
        if (errBox && errText) {
            errText.innerText = err.message || "Invalid credentials. Please verify your login details.";
            errBox.classList.remove("hidden");
        }
    }
}

async function handleLogout() {
    showConfirm("Confirm Sign Out", "Are you sure you want to end your administrative session?", async () => {
        try {
            if (authToken) {
                await apiCall("/api/auth/logout", "POST", {});
            }
        } catch (e) {
            console.warn("Logout request failed:", e);
        } finally {
            authToken = null;
            currentUser = null;
            localStorage.removeItem("apsrtc_token");
            localStorage.removeItem("apsrtc_user");
            updateAuthUI();
            switchView("public");
            showToast("Successfully logged out.", "info");
        }
    });
}

function updateAuthUI() {
    const loginBtn = document.getElementById("nav-admin-login-btn");
    const loggedGroup = document.getElementById("nav-admin-logged-group");
    const userDisplay = document.getElementById("admin-user-display");
    const profileFullname = document.getElementById("profile-fullname");
    const profileUsername = document.getElementById("profile-username");
    const profileEmail = document.getElementById("profile-email");

    if (authToken && currentUser) {
        if (loginBtn) loginBtn.classList.add("hidden");
        if (loggedGroup) loggedGroup.classList.remove("hidden");
        if (userDisplay) userDisplay.innerText = `${currentUser.username} (${currentUser.role || "Admin"})`;
        if (profileFullname) profileFullname.innerText = currentUser.full_name || "Depot Administrator";
        if (profileUsername) profileUsername.innerText = currentUser.username;
        if (profileEmail) profileEmail.innerText = currentUser.email || "admin@apsrtc.gov.in";
    } else {
        if (loginBtn) loginBtn.classList.remove("hidden");
        if (loggedGroup) loggedGroup.classList.add("hidden");
    }
}

async function verifyExistingSession() {
    if (!authToken) {
        updateAuthUI();
        return;
    }
    try {
        const res = await apiCall("/api/auth/verify", "GET");
        if (res.authenticated && res.user) {
            currentUser = res.user;
            localStorage.setItem("apsrtc_user", JSON.stringify(currentUser));
            updateAuthUI();
        } else {
            throw new Error("Invalid session");
        }
    } catch (e) {
        authToken = null;
        currentUser = null;
        localStorage.removeItem("apsrtc_token");
        localStorage.removeItem("apsrtc_user");
        updateAuthUI();
    }
}

// --- Data Fetching & Public UI Initialization ---
async function loadPublicData() {
    try {
        const [stops, routes, alerts, buses] = await Promise.all([
            apiCall("/api/stops"),
            apiCall("/api/routes"),
            apiCall("/api/alerts"),
            apiCall("/api/buses")
        ]);

        allStops = stops || [];
        allRoutes = routes || [];
        allAlerts = alerts || [];
        allBuses = buses || [];

        populatePublicDropdowns();
        renderPublicAlerts();
        updatePublicStats();
        renderPublicRoutes();
        loadPublicRemarks();
    } catch (e) {
        console.error("Failed to load initial transit data:", e);
        showToast("Error loading city transit dataset.", "error");
    }
}

function updatePublicStats() {
    const stopsCountEl = document.getElementById("stat-stops-count");
    const routesCountEl = document.getElementById("stat-routes-count");
    const busesCountEl = document.getElementById("stat-buses-count");

    if (stopsCountEl) stopsCountEl.innerText = allStops.length;
    if (routesCountEl) routesCountEl.innerText = allRoutes.length;
    if (busesCountEl) busesCountEl.innerText = allBuses.length;
}

function populatePublicDropdowns() {
    const fromSelect = document.getElementById("search-from");
    const toSelect = document.getElementById("search-to");
    const stopSelect = document.getElementById("public-stop-selector");
    const routeCodeSelect = document.getElementById("public-route-code-select");
    const crowdStopSelect = document.getElementById("live-crowd-stop-select");
    const bfsStart = document.getElementById("public-bfs-start");
    const bfsTarget = document.getElementById("public-bfs-target");

    // Populate Stops dropdowns
    const stopOptions = allStops
        .map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`)
        .join("");

    if (fromSelect) {
        fromSelect.innerHTML = `<option value="">Select origin stop...</option>` + stopOptions;
    }
    if (toSelect) {
        toSelect.innerHTML = `<option value="">Select destination stop...</option>` + stopOptions;
    }
    if (stopSelect) {
        stopSelect.innerHTML = `<option value="">Select bus stop to view all timings...</option>` + stopOptions;
    }
    if (crowdStopSelect) {
        crowdStopSelect.innerHTML = stopOptions;
        updateLiveCrowdMetric();
    }

    const bfsOptions = allStops
        .map(s => `<option value="${s.name}">${s.name}</option>`)
        .join("");

    if (bfsStart) bfsStart.innerHTML = bfsOptions;
    if (bfsTarget) {
        bfsTarget.innerHTML = bfsOptions;
        if (allStops.length > 1) {
            bfsTarget.selectedIndex = 1;
        }
    }


    // Populate Remarks dropdowns
    const remarkRouteSelect = document.getElementById("remark-form-route");
    const remarkStopSelect = document.getElementById("remark-form-stop");
    if (remarkRouteSelect) {
        remarkRouteSelect.innerHTML = `<option value="">-- Choose Route --</option>` +
            allRoutes.map(r => `<option value="${r.id}">${r.route_number}: ${r.route_name}</option>`).join("");
    }
    if (remarkStopSelect) {
        remarkStopSelect.innerHTML = `<option value="">-- Choose Stop --</option>` + stopOptions;
    }

    // Populate Routes dropdown
    if (routeCodeSelect) {
        routeCodeSelect.innerHTML =
            `<option value="">Select Route Number / Service ID...</option>` +
            allRoutes
                .map(r => `<option value="${r.id}">${r.route_number}: ${r.route_name}</option>`)
                .join("");
    }
}

function renderPublicAlerts() {
    const list = document.getElementById("public-alerts-list");
    const pill = document.getElementById("header-alerts-pill");
    const pillText = document.getElementById("header-alerts-text");

    if (!list) return;

    if (!allAlerts || allAlerts.length === 0) {
        list.innerHTML = `
            <div class="col-span-full bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-sm">
                <i class="fa-solid fa-circle-check text-emerald-500 text-xl mb-1 block"></i>
                All APSRTC Kakinada routes and depot operations are running normally without service interruptions.
            </div>
        `;
        if (pill) pill.classList.add("hidden");
        return;
    }

    if (pill && pillText) {
        pill.classList.remove("hidden");
        pillText.innerText = `${allAlerts.length} Active Alert${allAlerts.length > 1 ? "s" : ""}`;
    }

    list.innerHTML = allAlerts.map(a => {
        let badgeColor = "bg-amber-100 text-amber-800 border-amber-300";
        if (a.severity === "High") badgeColor = "bg-rose-100 text-rose-800 border-rose-300";
        if (a.severity === "Low") badgeColor = "bg-blue-100 text-blue-800 border-blue-300";

        return `
            <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeColor}">
                        ${a.alert_type} • ${a.severity}
                    </span>
                    <span class="text-[11px] text-slate-400">${a.start_date || "Active"}</span>
                </div>
                <h4 class="font-bold text-slate-900 text-sm">${a.title}</h4>
                <p class="text-xs text-slate-600 leading-relaxed">${a.description}</p>
                <div class="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-500">
                    <span><strong>Routes:</strong> ${a.affected_route_ids || "All"}</span>
                    <span>•</span>
                    <span><strong>Stops:</strong> ${a.affected_stop_ids || "All"}</span>
                </div>
            </div>
        `;
    }).join("");
}

// --- Public Search Tabs ---
function switchPublicSearchTab(tabName) {
    const tabs = ["route", "stop", "route-no"];
    tabs.forEach(t => {
        const btn = document.getElementById(`search-tab-${t}`);
        const pane = document.getElementById(`pane-search-${t}`);
        if (t === tabName) {
            if (btn) {
                btn.className = "px-5 py-2.5 rounded-xl font-bold text-sm bg-rose-600 text-white shadow-sm flex items-center gap-2 transition";
            }
            if (pane) pane.classList.remove("hidden");
        } else {
            if (btn) {
                btn.className = "px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-2 transition";
            }
            if (pane) pane.classList.add("hidden");
        }
    });
}

// --- Haversine Distance Calculation (KM) ---
function calculateHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
}

// --- TAB 1: Route Search (Origin -> Destination) ---
function handleRouteSearch() {
    const fromId = parseInt(document.getElementById("search-from").value);
    const toId = parseInt(document.getElementById("search-to").value);
    const resultsContainer = document.getElementById("search-results-container");
    const cardsList = document.getElementById("route-cards-list");

    if (!fromId || !toId) {
        showToast("Please choose both an origin and destination stop.", "warning");
        return;
    }

    if (fromId === toId) {
        showToast("Origin and Destination cannot be the same bus stop.", "warning");
        return;
    }

    const origStop = allStops.find(s => s.id === fromId);
    const destStop = allStops.find(s => s.id === toId);

    const matchingRoutes = allRoutes.filter(r => {
        const stopsList = r.stops || [];
        const origIdx = stopsList.findIndex(s => s.id === fromId);
        const destIdx = stopsList.findIndex(s => s.id === toId);
        return origIdx !== -1 && destIdx !== -1 && origIdx < destIdx;
    });

    resultsContainer.classList.remove("hidden");

    if (matchingRoutes.length === 0) {
        cardsList.innerHTML = `
            <div class="bg-amber-50/70 border border-amber-200 text-amber-900 p-6 rounded-2xl text-center space-y-2">
                <i class="fa-solid fa-circle-question text-amber-600 text-2xl"></i>
                <h5 class="font-bold text-sm">No direct bus route between ${origStop ? origStop.name : "Origin"} and ${destStop ? destStop.name : "Destination"}.</h5>
                <p class="text-xs text-slate-600">Try running the <strong>ADSA Network Graph & BFS Path Optimizer</strong> below to find connected transfer services across Kakinada nodes.</p>
            </div>
        `;
        return;
    }

    const straightDist = (origStop && destStop)
        ? calculateHaversine(origStop.latitude, origStop.longitude, destStop.latitude, destStop.longitude)
        : "5.5";

    cardsList.innerHTML = matchingRoutes.map(r => {
        const stopsList = r.stops || [];
        const origIdx = stopsList.findIndex(s => s.id === fromId);
        const destIdx = stopsList.findIndex(s => s.id === toId);
        const intermediateCount = destIdx - origIdx - 1;
        const estMins = Math.max(12, Math.round(parseFloat(straightDist) * 3.2));

        return `
            <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
                    <div class="flex items-center space-x-3">
                        <span class="bg-rose-600 text-white font-black text-sm px-3 py-1 rounded-xl shadow-sm">
                            ${r.route_number}
                        </span>
                        <div>
                            <h4 class="font-bold text-slate-900 text-base">${r.route_name}</h4>
                            <p class="text-xs text-slate-500">${r.origin_name} ➔ ${r.dest_name}</p>
                        </div>
                    </div>
                    <div class="text-left sm:text-right">
                        <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                            ${r.frequency_desc || "Every 15 mins"}
                        </span>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl text-xs">
                    <div>
                        <span class="text-slate-400 block font-semibold uppercase text-[10px]">Estimated Distance</span>
                        <strong class="text-slate-800 font-bold text-sm">${straightDist} km</strong>
                    </div>
                    <div>
                        <span class="text-slate-400 block font-semibold uppercase text-[10px]">Approx. Travel Time</span>
                        <strong class="text-slate-800 font-bold text-sm">${estMins} mins</strong>
                    </div>
                    <div>
                        <span class="text-slate-400 block font-semibold uppercase text-[10px]">Intermediate Stops</span>
                        <strong class="text-slate-800 font-bold text-sm">${intermediateCount} stops</strong>
                    </div>
                    <div>
                        <span class="text-slate-400 block font-semibold uppercase text-[10px]">Service Verification</span>
                        <strong class="text-emerald-700 font-bold text-xs">Official APSRTC</strong>
                    </div>
                </div>

                <div class="space-y-1">
                    <span class="text-[11px] font-bold text-slate-500 uppercase">Sequential Stop Progression:</span>
                    <div class="flex flex-wrap gap-1.5 pt-1">
                        ${stopsList.map((s, idx) => {
                            let style = "bg-slate-100 text-slate-700 border-slate-200";
                            if (s.id === fromId) style = "bg-rose-100 text-rose-800 border-rose-300 font-bold";
                            if (s.id === toId) style = "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
                            return `
                                <span class="px-2.5 py-1 text-xs rounded-lg border ${style}">
                                    ${idx + 1}. ${s.name}
                                </span>
                            `;
                        }).join("")}
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

// --- TAB 2: Bus Stop Search & Timings ---
async function handleStopDetailsSearch() {
    const stopId = parseInt(document.getElementById("public-stop-selector").value);
    const container = document.getElementById("stop-details-container");
    const routesList = document.getElementById("stop-routes-list");
    const alertBox = document.getElementById("stop-specific-alert");

    if (!stopId) {
        showToast("Please choose a bus stop to inspect.", "warning");
        return;
    }

    const stop = allStops.find(s => s.id === stopId);
    if (!stop) return;

    document.getElementById("disp-stop-code").innerText = stop.code;
    document.getElementById("disp-stop-status").innerText = stop.operational_status || "Normal Operation";
    document.getElementById("disp-stop-name").innerText = stop.name;
    document.getElementById("disp-stop-desc").innerText = stop.location_desc || "Kakinada Municipal Corporation Transit Node";
    document.getElementById("disp-stop-coords").innerText = `${stop.latitude.toFixed(4)}° N, ${stop.longitude.toFixed(4)}° E`;

    // Filter relevant alerts
    const relevantAlerts = allAlerts.filter(a =>
        a.affected_stop_ids === "All" ||
        (a.affected_stop_ids && a.affected_stop_ids.toLowerCase().includes(stop.name.toLowerCase()))
    );

    if (relevantAlerts.length > 0) {
        alertBox.className = "bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs space-y-1";
        alertBox.innerHTML = `
            <div class="font-bold flex items-center gap-1.5 text-rose-700">
                <i class="fa-solid fa-triangle-exclamation"></i> Active Notice for ${stop.name}
            </div>
            ${relevantAlerts.map(a => `<p>${a.title} — ${a.description}</p>`).join("")}
        `;
        alertBox.classList.remove("hidden");
    } else {
        alertBox.classList.add("hidden");
    }

    // Find routes passing through this stop
    const routesAtStop = allRoutes.filter(r => (r.stops || []).some(s => s.id === stopId));

    if (routesAtStop.length === 0) {
        routesList.innerHTML = `
            <div class="col-span-full bg-slate-50 border border-slate-200 p-5 rounded-xl text-slate-500 text-xs text-center">
                No active routes currently scheduled through this stop.
            </div>
        `;
    } else {
        // Fetch timetables for these routes
        let timetables = [];
        try {
            timetables = await apiCall("/api/timings");
        } catch (e) {
            timetables = [];
        }

        routesList.innerHTML = routesAtStop.map(r => {
            const routeTimes = timetables.filter(t => t.route_id === r.id);
            return `
                <div class="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="bg-rose-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg">
                            ${r.route_number}
                        </span>
                        <span class="text-xs font-semibold text-slate-500">${r.frequency_desc}</span>
                    </div>
                    <div>
                        <h5 class="font-bold text-slate-900 text-sm">${r.route_name}</h5>
                        <p class="text-xs text-slate-500">${r.origin_name} ➔ ${r.dest_name}</p>
                    </div>
                    <div class="border-t pt-2 space-y-1">
                        <span class="text-[10px] font-bold uppercase text-slate-400">Scheduled Departures:</span>
                        <div class="flex flex-wrap gap-1.5">
                            ${routeTimes.length > 0
                                ? routeTimes.map(t => `<span class="bg-white border border-slate-200 text-slate-800 text-xs px-2 py-0.5 rounded font-mono font-semibold">${t.departure_time}</span>`).join("")
                                : `<span class="text-xs text-slate-400 italic">Continuous service according to headway</span>`
                            }
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    container.classList.remove("hidden");
}

// --- TAB 3: Browse by Route Number ---
function renderRouteCodeDetails() {
    const routeId = parseInt(document.getElementById("public-route-code-select").value);
    const container = document.getElementById("route-code-detail-container");

    if (!routeId) {
        container.classList.add("hidden");
        return;
    }

    const route = allRoutes.find(r => r.id === routeId);
    if (!route) return;

    const stopsList = route.stops || [];

    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="bg-rose-600 text-white font-black text-sm px-3 py-0.5 rounded-lg">${route.route_number}</span>
                        <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">${route.verification_status || "Verified"}</span>
                    </div>
                    <h4 class="text-xl font-black text-slate-900">${route.route_name}</h4>
                    <p class="text-xs text-slate-500">${route.origin_name} to ${route.dest_name} • ${route.direction || "Both Directions"}</p>
                </div>
                <div class="text-right">
                    <span class="text-xs text-slate-400 block font-semibold uppercase">Operating Days</span>
                    <strong class="text-sm text-slate-800">${route.operating_days || "All Days"}</strong>
                </div>
            </div>

            <div>
                <h5 class="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">Sequence of Stops (${stopsList.length} total)</h5>
                <div class="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-rose-300">
                    ${stopsList.map((s, idx) => `
                        <div class="relative flex items-center space-x-3 text-xs">
                            <span class="absolute -left-6 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">${idx + 1}</span>
                            <span class="font-bold text-slate-800">${s.name}</span>
                            <span class="text-slate-400 font-mono text-[11px]">${s.code}</span>
                        </div>
                    `).join("")}
                </div>
            </div>
        </div>
    `;

    container.classList.remove("hidden");
}

// --- Live Bus Occupancy & Stop Demand Tracker ---
async function updateLiveCrowdMetric() {
    const stopSelect = document.getElementById("live-crowd-stop-select");
    const countEl = document.getElementById("live-passenger-count");
    const statusEl = document.getElementById("live-crowd-status");
    const occEl = document.getElementById("live-occupancy-pill");
    const nextBusEl = document.getElementById("live-next-bus");

    if (!stopSelect || !stopSelect.value) return;
    const stopId = parseInt(stopSelect.value);
    const stop = allStops.find(s => s.id === stopId);
    if (!stop) return;

    // Deterministic simulation based on stop ID to match real APSRTC patterns
    const baseTickets = (stopId * 47 + 120) % 340 + 60;
    countEl.innerText = baseTickets;

    if (baseTickets > 240) {
        statusEl.innerHTML = `<span class="text-rose-600 font-black">High Demand (${baseTickets} pax)</span>`;
        occEl.innerHTML = `<span class="bg-rose-100 text-rose-800 text-xs font-black px-3 py-1 rounded-full border border-rose-300">FULL (&gt;85% Capacity)</span>`;
    } else if (baseTickets > 140) {
        statusEl.innerHTML = `<span class="text-amber-600 font-black">Moderate Demand</span>`;
        occEl.innerHTML = `<span class="bg-amber-100 text-amber-800 text-xs font-black px-3 py-1 rounded-full border border-amber-300">MEDIUM (50-85%)</span>`;
    } else {
        statusEl.innerHTML = `<span class="text-emerald-600 font-black">Low Demand / Normal</span>`;
        occEl.innerHTML = `<span class="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full border border-emerald-300">FREE (&lt;50% Seats Available)</span>`;
    }

    const minsToNext = (stopId * 7) % 15 + 2;
    nextBusEl.innerText = `Next Bus: AP-05-Z-${1000 + stopId * 12} in ~${minsToNext} mins`;
}

// --- ADSA BFS Shortest Path Traversal ---
async function executeBFSPathfinding() {
    const start = document.getElementById("public-bfs-start").value;
    const target = document.getElementById("public-bfs-target").value;
    const output = document.getElementById("public-bfs-output");
    const badge = document.getElementById("public-bfs-badge");
    const details = document.getElementById("public-bfs-details");

    if (!start || !target) {
        showToast("Please select both a Start Node and Target Node.", "warning");
        return;
    }

    if (start === target) {
        showToast("Origin and Target nodes must be different stops.", "warning");
        return;
    }

    try {
        const res = await apiCall(`/api/algorithms/bfs?start=${encodeURIComponent(start)}&target=${encodeURIComponent(target)}`);
        output.classList.remove("hidden");

        if (res.success || res.found) {
            badge.innerText = `Found Path in ${res.hops} Hop${res.hops === 1 ? '' : 's'}`;
            badge.className = "bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded text-[11px] font-semibold";

            const routesStr = (res.routes_used && res.routes_used.length > 0) ? res.routes_used.join(", ") : "APSRTC City Line";

            details.innerHTML = `
                <div class="text-emerald-300 font-bold mb-1">
                    ✓ Optimal BFS Graph Traversal Completed:
                </div>
                <div class="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-200">
                    ${res.path.map((node, i) => `
                        <span class="${i === 0 ? 'text-rose-400 font-bold' : i === res.path.length - 1 ? 'text-emerald-400 font-bold' : 'text-slate-300'}">
                            ${node}
                        </span>
                    `).join(" <span class='text-slate-500'>➔</span> ")}
                </div>
                <div class="flex flex-wrap gap-4 pt-2 text-[11px] text-slate-400">
                    <span><strong>Total Stops:</strong> ${res.path.length}</span>
                    <span>•</span>
                    <span><strong>Connecting Routes:</strong> ${routesStr}</span>
                    <span>•</span>
                    <span><strong>Transfers:</strong> ${res.transfers || 0}</span>
                </div>
            `;
        } else {
            badge.innerText = "No Path Found";
            badge.className = "bg-rose-500/20 text-rose-400 px-2.5 py-0.5 rounded text-[11px] font-semibold";
            details.innerHTML = `
                <div class="text-rose-400 font-bold">
                    ${res.message || `No connected graph path found between "${start}" and "${target}".`}
                </div>
                <p class="text-slate-400 text-xs">Verify stop adjacency connectivity in the Bus Routes table.</p>
            `;
        }
    } catch (e) {
        showToast("Algorithmic pathfinding error: " + e.message, "error");
    }
}

// ==============================================================
// ==================== ADMIN DASHBOARD MODULE ==================
// ==============================================================

function switchAdminSection(sectionName) {
    const sections = [
        "overview", "routes", "bus-mgmt", "stops", "timings", "buses",
        "tickets", "occupancy", "frequency", "alerts", "reports", "profile",
        "remarks", "route-condition", "project-info", "revenue"
    ];

    sections.forEach(s => {
        const navBtn = document.getElementById(`adm-nav-${s}`);
        const secDiv = document.getElementById(`admin-sec-${s}`);
        if (s === sectionName) {
            if (navBtn) navBtn.classList.add("active");
            if (secDiv) secDiv.classList.remove("hidden");
        } else {
            if (navBtn) navBtn.classList.remove("active");
            if (secDiv) secDiv.classList.add("hidden");
        }
    });

    // Load dynamic data for current section
    switch (sectionName) {
        case "overview": loadAdminOverview(); renderRouteConditionTable(); break;
        case "routes": loadAdminRoutes(); break;
        case "bus-mgmt": loadAdminBusManagement(); break;
        case "stops": loadAdminStops(); break;
        case "timings": loadAdminTimings(); break;
        case "buses": loadAdminBuses(); break;
        case "tickets": loadAdminTickets(); break;
        case "occupancy": loadAdminOccupancy(); break;
        case "frequency": initFrequencySection(); break;
        case "alerts": loadAdminAlerts(); break;
        case "reports": loadAdminReports(); break;
        case "profile": loadAdminProfile(); break;
        case "remarks": loadAdminRemarks(); break;
        case "route-condition": renderRouteConditionTable(); break;
        case "revenue": loadAdminRevenue(); break;
    }
}

// --- Admin Section A: Overview ---
async function loadAdminOverview() {
    try {
        const data = await apiCall("/api/overview");
        if (!data) return;

        // KPI Counts - 8 Dynamic Metrics
        const routesEl = document.getElementById("kpi-routes");
        const busesEl = document.getElementById("kpi-buses");
        const stopsEl = document.getElementById("kpi-stops");
        const paxEl = document.getElementById("kpi-passengers");
        const ticketsEl = document.getElementById("kpi-tickets");
        const revenueEl = document.getElementById("kpi-revenue");
        const extraBusesEl = document.getElementById("kpi-extra-buses");
        const remarksEl = document.getElementById("kpi-remarks");

        if (routesEl) routesEl.innerText = data.total_routes || "0";
        if (busesEl) busesEl.innerText = data.total_buses || "0";
        if (stopsEl) stopsEl.innerText = data.total_stops || "0";
        if (paxEl) paxEl.innerText = (data.total_passengers || 0).toLocaleString();
        if (ticketsEl) ticketsEl.innerText = (data.total_tickets || 0).toLocaleString();
        if (revenueEl) revenueEl.innerText = `₹${(data.total_revenue || 0).toLocaleString()}`;
        if (extraBusesEl) extraBusesEl.innerText = data.routes_requiring_extra_bus !== undefined ? data.routes_requiring_extra_bus : "0";
        if (remarksEl) remarksEl.innerText = (data.total_remarks !== undefined ? data.total_remarks : (data.total_feedback || 0)).toString();

        // Also trigger live Route Condition analysis table render
        renderRouteConditionTable();

        // High demand stops table
        const highStopsTbody = document.getElementById("overview-high-demand-stops");
        if (highStopsTbody && data.high_demand_stops) {
            highStopsTbody.innerHTML = data.high_demand_stops.map(s => `
                <tr class="hover:bg-slate-50">
                    <td class="py-2.5 font-bold text-slate-800">${s.name || s.stop_name}</td>
                    <td class="py-2.5 text-center font-mono text-slate-500">${s.transactions || s.transaction_count || 1}</td>
                    <td class="py-2.5 text-right font-black text-rose-600">${s.total_passengers || s.passengers_boarded || 0}</td>
                </tr>
            `).join("");
        }

        // High occupancy buses table
        const highBusTbody = document.getElementById("overview-high-occupancy-buses");
        if (highBusTbody && data.high_occupancy_buses) {
            highBusTbody.innerHTML = data.high_occupancy_buses.map(b => `
                <tr class="hover:bg-slate-50">
                    <td class="py-2.5 font-bold text-slate-800">${b.route_number || "KKD-01"}</td>
                    <td class="py-2.5 font-mono text-slate-500">${b.trip_id || "TRIP-01"}</td>
                    <td class="py-2.5 font-semibold text-slate-700">${b.bus_number || "AP-05-Z-1088"}</td>
                    <td class="py-2.5 text-right">
                        <span class="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded">${b.occupancy_status || "FULL"}</span>
                    </td>
                </tr>
            `).join("");
        }

        // Ridership bars
        const barsContainer = document.getElementById("overview-ridership-bars");
        if (barsContainer && data.ridership_by_route) {
            const maxVal = Math.max(...data.ridership_by_route.map(r => (r.total_pax !== undefined ? r.total_pax : (r.passengers || 0))), 1);
            barsContainer.innerHTML = data.ridership_by_route.map(r => {
                const pax = r.total_pax !== undefined ? r.total_pax : (r.passengers || 0);
                const pct = Math.round((pax / maxVal) * 100);
                return `
                    <div class="space-y-1">
                        <div class="flex justify-between text-xs">
                            <span class="font-bold text-slate-800">${r.route_number}: ${r.route_name}</span>
                            <span class="font-mono text-slate-600 font-bold">${pax} passengers</span>
                        </div>
                        <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div class="bg-rose-600 h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                        </div>
                    </div>
                `;
            }).join("");
        }
    } catch (e) {
        console.error("Overview load failed:", e);
    }
}

// --- Admin Section B: Routes Management ---
async function loadAdminRoutes() {
    try {
        allRoutes = await apiCall("/api/routes");
        const tbody = document.getElementById("admin-routes-tbody");
        if (!tbody) return;

        tbody.innerHTML = allRoutes.map(r => {
            const stopsCount = (r.stops || []).length;
            const stopsNames = (r.stops || []).map(s => s.name).join(" ➔ ");
            return `
                <tr class="hover:bg-slate-50">
                    <td class="p-3 font-black text-rose-600">${r.route_number}</td>
                    <td class="p-3 font-bold text-slate-900">${r.route_name}</td>
                    <td class="p-3 text-slate-600">${r.origin_name} ➔ ${r.dest_name}</td>
                    <td class="p-3 text-slate-500 max-w-xs truncate" title="${stopsNames}">
                        <span class="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold">${stopsCount} stops</span>
                    </td>
                    <td class="p-3 text-slate-600 font-medium">${r.frequency_desc}</td>
                    <td class="p-3">
                        <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ${r.is_active ? "Active" : "Disabled"}
                        </span>
                    </td>
                    <td class="p-3 text-right space-x-2">
                        <button onclick="openRouteModal(${r.id})" class="text-blue-600 hover:text-blue-800 font-bold">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="deleteRoute(${r.id})" class="text-rose-600 hover:text-rose-800 font-bold">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    } catch (e) {
        showToast("Failed to load routes.", "error");
    }
}

// --- Sequential Stops Builder in Route Modal ---
let routeStopRowCounter = 0;

function addRouteStopRow(stopId = null, seq = null, arrTime = "", depTime = "") {
    const container = document.getElementById("route-stops-builder-container");
    if (!container) return;

    routeStopRowCounter++;
    const rowId = `stop-row-${routeStopRowCounter}`;
    const row = document.createElement("div");
    row.id = rowId;
    row.className = "flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm animate-fadeIn";

    const currentRowsCount = container.children.length + 1;
    const assignedSeq = seq !== null ? seq : currentRowsCount;

    const stopOpts = allStops.map(s => 
        `<option value="${s.id}" ${stopId === s.id ? 'selected' : ''}>${s.name} (${s.code})</option>`
    ).join("");

    row.innerHTML = `
        <div class="w-12">
            <label class="block text-[10px] font-bold text-slate-400 uppercase">Seq</label>
            <input type="number" min="1" value="${assignedSeq}" class="row-stop-seq w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-center">
        </div>
        <div class="flex-1">
            <label class="block text-[10px] font-bold text-slate-400 uppercase">Intermediate Stop</label>
            <select class="row-stop-id w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold">
                <option value="">-- Choose Stop --</option>
                ${stopOpts}
            </select>
        </div>
        <div class="w-24">
            <label class="block text-[10px] font-bold text-slate-400 uppercase">Arrival</label>
            <input type="text" placeholder="06:15 AM" value="${arrTime || ''}" class="row-stop-arr w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
        </div>
        <div class="w-24">
            <label class="block text-[10px] font-bold text-slate-400 uppercase">Departure</label>
            <input type="text" placeholder="06:20 AM" value="${depTime || ''}" class="row-stop-dep w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
        </div>
        <div class="pt-3">
            <button type="button" onclick="removeRouteStopRow('${rowId}')" class="text-slate-400 hover:text-rose-600 p-1.5 transition">
                <i class="fa-solid fa-trash-can text-sm"></i>
            </button>
        </div>
    `;

    container.appendChild(row);
}

function removeRouteStopRow(rowId) {
    const el = document.getElementById(rowId);
    if (el) el.remove();
}

function openRouteModal(routeId = null) {
    const modal = document.getElementById("route-modal");
    const origSelect = document.getElementById("route-form-orig");
    const destSelect = document.getElementById("route-form-dest");
    const title = document.getElementById("route-modal-title");
    const errBox = document.getElementById("route-form-error");
    const container = document.getElementById("route-stops-builder-container");

    if (errBox) errBox.classList.add("hidden");
    if (container) container.innerHTML = "";

    const stopOpts = allStops.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join("");
    origSelect.innerHTML = `<option value="">Select origin...</option>` + stopOpts;
    destSelect.innerHTML = `<option value="">Select destination...</option>` + stopOpts;

    if (routeId) {
        title.innerText = "Edit Bus Route Corridor";
        const route = allRoutes.find(r => r.id === routeId);
        if (route) {
            document.getElementById("route-form-id").value = route.id;
            document.getElementById("route-form-number").value = route.route_number;
            document.getElementById("route-form-name").value = route.route_name;
            origSelect.value = route.origin_stop_id;
            destSelect.value = route.dest_stop_id;
            document.getElementById("route-form-dist").value = route.distance_km || 12.0;
            document.getElementById("route-form-time").value = route.travel_time_mins || 35;
            document.getElementById("route-form-buses-req").value = route.required_buses || 2;
            document.getElementById("route-form-status").value = route.is_active ? "Active" : "Inactive";
            document.getElementById("route-form-start-time").value = route.start_time || "06:00 AM";
            document.getElementById("route-form-end-time").value = route.end_time || "09:30 PM";
            document.getElementById("route-form-freq").value = route.frequency_desc || "Every 15 mins";

            // Populate sequential intermediate stops
            const existingStops = route.stops || [];
            if (existingStops.length > 0) {
                existingStops.forEach((st, idx) => {
                    addRouteStopRow(st.id, st.sequence || (idx + 1), st.arrival_time || "", st.departure_time || "");
                });
            } else {
                addRouteStopRow();
            }
        }
    } else {
        title.innerText = "Add New Bus Route";
        document.getElementById("route-form-id").value = "";
        document.getElementById("route-form-number").value = `KKD-${String(allRoutes.length + 1).padStart(2, '0')}`;
        document.getElementById("route-form-name").value = "";
        document.getElementById("route-form-dist").value = "12.0";
        document.getElementById("route-form-time").value = "35";
        document.getElementById("route-form-buses-req").value = "2";
        document.getElementById("route-form-status").value = "Active";
        document.getElementById("route-form-start-time").value = "06:00 AM";
        document.getElementById("route-form-end-time").value = "09:30 PM";
        document.getElementById("route-form-freq").value = "Every 15 mins";

        // Add 2 initial blank stop rows
        addRouteStopRow();
        addRouteStopRow();
    }

    modal.classList.remove("hidden");
}

function closeRouteModal() {
    document.getElementById("route-modal").classList.add("hidden");
}

async function handleSaveRoute(event) {
    event.preventDefault();
    const id = document.getElementById("route-form-id").value;
    const number = document.getElementById("route-form-number").value.trim().toUpperCase();
    const name = document.getElementById("route-form-name").value.trim();
    const orig = parseInt(document.getElementById("route-form-orig").value);
    const dest = parseInt(document.getElementById("route-form-dest").value);
    const dist = parseFloat(document.getElementById("route-form-dist").value) || 10.0;
    const time = parseInt(document.getElementById("route-form-time").value) || 30;
    const reqBuses = parseInt(document.getElementById("route-form-buses-req").value) || 2;
    const status = document.getElementById("route-form-status").value;
    const startTime = document.getElementById("route-form-start-time").value.trim();
    const endTime = document.getElementById("route-form-end-time").value.trim();
    const freq = document.getElementById("route-form-freq").value.trim();

    const errBox = document.getElementById("route-form-error");
    const errText = document.getElementById("route-form-error-msg");

    // Client-side Duplicate Route ID Check
    const duplicate = allRoutes.find(r => 
        r.route_number.trim().toUpperCase() === number && 
        (!id || r.id !== parseInt(id))
    );
    if (duplicate) {
        if (errBox && errText) {
            errText.innerText = `Route ID "${number}" is already assigned to "${duplicate.route_name}". Please specify a unique Route ID.`;
            errBox.classList.remove("hidden");
        }
        showToast(`Route ID "${number}" already exists.`, "error");
        return;
    }

    // Collect sequential intermediate stops
    const container = document.getElementById("route-stops-builder-container");
    const rows = container ? container.querySelectorAll("[id^='stop-row-']") : [];
    const stops = [];

    rows.forEach(row => {
        const stopSelect = row.querySelector(".row-stop-id");
        const seqInput = row.querySelector(".row-stop-seq");
        const arrInput = row.querySelector(".row-stop-arr");
        const depInput = row.querySelector(".row-stop-dep");

        if (stopSelect && stopSelect.value) {
            stops.push({
                stop_id: parseInt(stopSelect.value),
                sequence: parseInt(seqInput.value) || (stops.length + 1),
                arrival_time: arrInput.value.trim(),
                departure_time: depInput.value.trim()
            });
        }
    });

    const payload = {
        route_number: number,
        route_name: name,
        origin_stop_id: orig,
        dest_stop_id: dest,
        distance_km: dist,
        travel_time_mins: time,
        required_buses: reqBuses,
        frequency_desc: freq,
        status: status,
        start_time: startTime,
        end_time: endTime,
        stops: stops
    };

    try {
        if (id) {
            payload.id = parseInt(id);
            await apiCall("/api/routes", "PUT", payload);
            showToast("Route corridor and stop sequences updated.", "success");
        } else {
            await apiCall("/api/routes", "POST", payload);
            showToast("New route corridor registered successfully.", "success");
        }
        closeRouteModal();
        await loadAdminRoutes();
        await loadAdminBusManagement();
        await loadAdminOverview();
        await loadPublicData();
    } catch (e) {
        if (errBox && errText) {
            errText.innerText = e.message || "Failed to save route.";
            errBox.classList.remove("hidden");
        }
        showToast("Error saving route: " + e.message, "error");
    }
}

function deleteRoute(id) {
    showConfirm("Delete Route Corridor", "Are you sure you want to delete this route? Associated intermediate stops and timetable trips will be removed.", async () => {
        try {
            await apiCall(`/api/routes?id=${id}`, "DELETE");
            showToast("Route deleted successfully.", "success");
            await loadAdminRoutes();
            await loadAdminBusManagement();
            await loadAdminOverview();
            await loadPublicData();
        } catch (e) {
            showToast("Error deleting route: " + e.message, "error");
        }
    });
}

// --- Admin Section C: Stops Management ---
async function loadAdminStops() {
    try {
        allStops = await apiCall("/api/stops");
        const tbody = document.getElementById("admin-stops-tbody");
        if (!tbody) return;

        tbody.innerHTML = allStops.map(s => `
            <tr class="hover:bg-slate-50">
                <td class="p-3 font-mono font-bold text-rose-600">${s.code}</td>
                <td class="p-3 font-bold text-slate-900">${s.name}</td>
                <td class="p-3 text-slate-500">${s.location_desc || "-"}</td>
                <td class="p-3 font-mono text-slate-600 text-[11px]">${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}</td>
                <td class="p-3">
                    <span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        ${s.operational_status || "Normal"}
                    </span>
                </td>
                <td class="p-3">
                    <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        ${s.is_active ? "Yes" : "No"}
                    </span>
                </td>
                <td class="p-3 text-right space-x-2">
                    <button onclick="openStopModal(${s.id})" class="text-blue-600 hover:text-blue-800 font-bold">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="deleteStop(${s.id})" class="text-rose-600 hover:text-rose-800 font-bold">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join("");
    } catch (e) {
        showToast("Failed to load stops.", "error");
    }
}

function openStopModal(stopId = null) {
    const modal = document.getElementById("stop-modal");
    const title = document.getElementById("stop-modal-title");

    if (stopId) {
        title.innerText = "Edit Bus Stop";
        const stop = allStops.find(s => s.id === stopId);
        if (stop) {
            document.getElementById("stop-form-id").value = stop.id;
            document.getElementById("stop-form-code").value = stop.code;
            document.getElementById("stop-form-name").value = stop.name;
            document.getElementById("stop-form-desc").value = stop.location_desc || "";
            document.getElementById("stop-form-lat").value = stop.latitude;
            document.getElementById("stop-form-lon").value = stop.longitude;
            document.getElementById("stop-form-status").value = stop.operational_status || "Normal";
        }
    } else {
        title.innerText = "Add New Bus Stop";
        document.getElementById("stop-form-id").value = "";
        document.getElementById("stop-form-code").value = `STP-${allStops.length + 1}`;
        document.getElementById("stop-form-name").value = "";
        document.getElementById("stop-form-desc").value = "";
        document.getElementById("stop-form-lat").value = "16.9400";
        document.getElementById("stop-form-lon").value = "82.2400";
        document.getElementById("stop-form-status").value = "Normal";
    }

    modal.classList.remove("hidden");
}

function closeStopModal() {
    document.getElementById("stop-modal").classList.add("hidden");
}

async function handleSaveStop(event) {
    event.preventDefault();
    const id = document.getElementById("stop-form-id").value;
    const code = document.getElementById("stop-form-code").value.trim();
    const name = document.getElementById("stop-form-name").value.trim();
    const desc = document.getElementById("stop-form-desc").value.trim();
    const lat = parseFloat(document.getElementById("stop-form-lat").value);
    const lon = parseFloat(document.getElementById("stop-form-lon").value);
    const status = document.getElementById("stop-form-status").value;

    const payload = { code, name, location_desc: desc, latitude: lat, longitude: lon, operational_status: status };

    try {
        if (id) {
            payload.id = parseInt(id);
            await apiCall("/api/stops", "PUT", payload);
            showToast("Stop updated successfully.", "success");
        } else {
            await apiCall("/api/stops", "POST", payload);
            showToast("Stop created successfully.", "success");
        }
        closeStopModal();
        loadAdminStops();
        loadPublicData();
    } catch (e) {
        showToast("Error saving stop: " + e.message, "error");
    }
}

function deleteStop(id) {
    showConfirm("Delete Stop", "Are you sure you want to remove this stop from the database?", async () => {
        try {
            await apiCall(`/api/stops?id=${id}`, "DELETE");
            showToast("Stop deleted successfully.", "success");
            loadAdminStops();
            loadPublicData();
        } catch (e) {
            showToast("Error deleting stop: " + e.message, "error");
        }
    });
}

// --- Admin Section D: Timings & Timetables ---
async function loadAdminTimings() {
    try {
        allTimetables = await apiCall("/api/timings");
        const tbody = document.getElementById("admin-timings-tbody");
        if (!tbody) return;

        tbody.innerHTML = allTimetables.map(t => `
            <tr class="hover:bg-slate-50">
                <td class="p-3 font-bold text-slate-900">${t.route_number || "KKD"}</td>
                <td class="p-3 font-mono font-bold text-rose-600">${t.trip_identifier}</td>
                <td class="p-3 font-semibold text-slate-700">${t.bus_number || "Unassigned"}</td>
                <td class="p-3 font-mono font-bold text-slate-800">${t.departure_time}</td>
                <td class="p-3 font-mono text-slate-600">${t.arrival_time}</td>
                <td class="p-3 text-slate-500">${t.operating_days || "Daily"}</td>
                <td class="p-3">
                    <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Verified
                    </span>
                </td>
                <td class="p-3 text-right">
                    <button onclick="deleteTimetable(${t.id})" class="text-rose-600 hover:text-rose-800 font-bold">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join("");
    } catch (e) {
        showToast("Failed to load timetables.", "error");
    }
}

function openTimetableModal() {
    const modal = document.getElementById("timetable-modal");
    const routeSelect = document.getElementById("time-form-route");
    const busSelect = document.getElementById("time-form-bus");

    routeSelect.innerHTML = allRoutes.map(r => `<option value="${r.id}">${r.route_number}: ${r.route_name}</option>`).join("");
    busSelect.innerHTML = `<option value="">Auto-Assign Fleet Bus</option>` + allBuses.map(b => `<option value="${b.id}">${b.bus_number} (${b.bus_type})</option>`).join("");

    document.getElementById("time-form-trip").value = `TRIP-${Math.floor(100 + Math.random() * 900)}`;
    document.getElementById("time-form-dep").value = "08:30 AM";
    document.getElementById("time-form-arr").value = "09:15 AM";

    modal.classList.remove("hidden");
}

function closeTimetableModal() {
    document.getElementById("timetable-modal").classList.add("hidden");
}

async function handleSaveTimetable(event) {
    event.preventDefault();
    const route_id = parseInt(document.getElementById("time-form-route").value);
    const bus_id = document.getElementById("time-form-bus").value ? parseInt(document.getElementById("time-form-bus").value) : null;
    const trip_identifier = document.getElementById("time-form-trip").value.trim();
    const departure_time = document.getElementById("time-form-dep").value.trim();
    const arrival_time = document.getElementById("time-form-arr").value.trim();

    try {
        await apiCall("/api/timings", "POST", { route_id, bus_id, trip_identifier, departure_time, arrival_time });
        showToast("Timetable trip scheduled.", "success");
        closeTimetableModal();
        loadAdminTimings();
    } catch (e) {
        showToast("Error scheduling trip: " + e.message, "error");
    }
}

function deleteTimetable(id) {
    showConfirm("Delete Timetable Schedule", "Are you sure you want to remove this trip?", async () => {
        try {
            await apiCall(`/api/timings?id=${id}`, "DELETE");
            showToast("Trip removed.", "success");
            loadAdminTimings();
        } catch (e) {
            showToast("Error deleting timetable: " + e.message, "error");
        }
    });
}

// --- Admin Section E: Buses Fleet Management ---
async function loadAdminBuses() {
    try {
        allBuses = await apiCall("/api/buses");
        const tbody = document.getElementById("admin-buses-tbody");
        if (!tbody) return;

        tbody.innerHTML = allBuses.map(b => `
            <tr class="hover:bg-slate-50">
                <td class="p-3 font-mono font-bold text-slate-900">${b.bus_number}</td>
                <td class="p-3 text-slate-700">${b.bus_type}</td>
                <td class="p-3 text-slate-800 font-bold">${b.capacity} seats</td>
                <td class="p-3 font-semibold text-rose-600">${b.route_number || "Unassigned"}</td>
                <td class="p-3">
                    <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Operational
                    </span>
                </td>
                <td class="p-3 text-slate-500 text-xs">${b.operational_notes || "Inspected"}</td>
                <td class="p-3 text-right space-x-2">
                    <button onclick="openBusModal(${b.id})" class="text-blue-600 hover:text-blue-800 font-bold">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="deleteBus(${b.id})" class="text-rose-600 hover:text-rose-800 font-bold">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join("");
    } catch (e) {
        showToast("Failed to load buses fleet.", "error");
    }
}

// --- Admin Bus Management & Allocation ---
async function loadAdminBusManagement() {
    const grid = document.getElementById("bus-mgmt-routes-grid");
    if (!grid) return;

    try {
        const [routes, buses] = await Promise.all([
            apiCall("/api/routes"),
            apiCall("/api/buses")
        ]);

        allRoutes = routes || [];
        allBuses = buses || [];

        if (allRoutes.length === 0) {
            grid.innerHTML = `<div class="col-span-full bg-white p-8 rounded-2xl border text-center text-slate-400">No routes registered yet.</div>`;
            return;
        }

        grid.innerHTML = allRoutes.map(r => {
            const assignedBuses = allBuses.filter(b => b.current_route_id === r.id);
            const reqBuses = r.required_buses || 2;
            const hasShortage = assignedBuses.length < reqBuses;

            return `
                <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                    <div class="flex justify-between items-start border-b border-slate-100 pb-3">
                        <div class="flex items-center gap-2.5">
                            <span class="bg-rose-600 text-white font-black text-sm px-2.5 py-1 rounded-xl shadow-sm">
                                ${r.route_number}
                            </span>
                            <div>
                                <h4 class="font-bold text-slate-900 text-base">${r.route_name}</h4>
                                <p class="text-xs text-slate-500">${r.origin_name} ➔ ${r.dest_name}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-xs font-bold ${hasShortage ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'} px-2.5 py-1 rounded-lg border">
                                ${assignedBuses.length} / ${reqBuses} Buses Assigned
                            </span>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <div class="flex justify-between items-center">
                            <span class="text-[11px] font-bold text-slate-500 uppercase">Assigned Fleet Vehicles:</span>
                            <button onclick="openBusModalForRoute(${r.id})" class="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1">
                                <i class="fa-solid fa-plus text-[10px]"></i> + Add Bus to this Route
                            </button>
                        </div>

                        ${assignedBuses.length === 0 ? `
                            <div class="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">
                                No bus assigned to this corridor yet. Click "+ Add Bus to this Route" to allocate a vehicle.
                            </div>
                        ` : `
                            <div class="space-y-2">
                                ${assignedBuses.map(b => `
                                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                                        <div>
                                            <div class="flex items-center gap-2">
                                                <strong class="font-mono font-bold text-slate-900">${b.bus_number}</strong>
                                                <span class="text-[10px] bg-white text-slate-600 border px-1.5 py-0.5 rounded font-semibold">${b.bus_type}</span>
                                                <span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">${b.capacity} seats</span>
                                            </div>
                                            <div class="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-2">
                                                ${b.driver_name ? `<span><i class="fa-solid fa-id-card text-slate-400"></i> ${b.driver_name}</span>` : ""}
                                                ${b.conductor_name ? `<span>• Cond: ${b.conductor_name}</span>` : ""}
                                                ${b.occupancy !== undefined ? `<span>• Load: ${b.occupancy} pax</span>` : ""}
                                                ${b.departure_time ? `<span>• Dep: ${b.departure_time}</span>` : ""}
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                                            <button onclick="openBusModal(${b.id})" class="text-blue-600 hover:text-blue-800 text-xs font-semibold px-2 py-1 rounded bg-blue-50">
                                                <i class="fa-solid fa-pen-to-square"></i> Edit
                                            </button>
                                            <button onclick="handleRemoveBusFromRoute(${b.id}, '${b.bus_number}')" class="text-rose-600 hover:text-rose-800 text-xs font-bold px-2.5 py-1 rounded bg-rose-50 border border-rose-200 flex items-center gap-1">
                                                <i class="fa-solid fa-arrow-right-from-bracket"></i> Remove Bus
                                            </button>
                                        </div>
                                    </div>
                                `).join("")}
                            </div>
                        `}
                    </div>
                </div>
            `;
        }).join("");
    } catch (e) {
        console.error("Failed to load bus management:", e);
    }
}

function openBusModalForRoute(routeId) {
    openBusModal(null);
    const routeSelect = document.getElementById("bus-form-route");
    if (routeSelect) routeSelect.value = routeId;
}

function handleRemoveBusFromRoute(busId, busNumber = "") {
    showConfirm("Remove Bus Assignment", `Are you sure you want to remove bus ${busNumber || "assignment"} from this route? The vehicle will be returned to the reserve depot pool.`, async () => {
        try {
            await apiCall("/api/buses/unassign", "POST", { bus_id: busId });
            showToast(`Bus ${busNumber} removed from route assignment.`, "success");
            await loadAdminBusManagement();
            await loadAdminBuses();
            await loadAdminOverview();
            await renderRouteConditionTable();
        } catch (e) {
            showToast("Error unassigning bus: " + e.message, "error");
        }
    });
}

function openBusModal(busId = null) {
    const modal = document.getElementById("bus-modal");
    const routeSelect = document.getElementById("bus-form-route");
    const title = document.getElementById("bus-modal-title");

    routeSelect.innerHTML = `<option value="">-- No Route Assigned (Reserve Pool) --</option>` + 
        allRoutes.map(r => `<option value="${r.id}">${r.route_number}: ${r.route_name}</option>`).join("");

    if (busId) {
        title.innerText = "Edit Fleet Bus";
        const bus = allBuses.find(b => b.id === busId);
        if (bus) {
            document.getElementById("bus-form-id").value = bus.id;
            document.getElementById("bus-form-number").value = bus.bus_number;
            document.getElementById("bus-form-type").value = bus.bus_type;
            document.getElementById("bus-form-capacity").value = bus.capacity;
            document.getElementById("bus-form-occupancy").value = bus.occupancy !== undefined ? bus.occupancy : 30;
            document.getElementById("bus-form-driver").value = bus.driver_name || "";
            document.getElementById("bus-form-conductor").value = bus.conductor_name || "";
            document.getElementById("bus-form-status").value = bus.operational_status || "Active";
            document.getElementById("bus-form-departure").value = bus.departure_time || "";
            document.getElementById("bus-form-arrival").value = bus.arrival_time || "";
            routeSelect.value = bus.current_route_id || "";
        }
    } else {
        title.innerText = "Register / Assign Fleet Bus";
        document.getElementById("bus-form-id").value = "";
        document.getElementById("bus-form-number").value = `AP-05-Z-${Math.floor(1000 + Math.random() * 9000)}`;
        document.getElementById("bus-form-capacity").value = "50";
        document.getElementById("bus-form-occupancy").value = "30";
        document.getElementById("bus-form-driver").value = "";
        document.getElementById("bus-form-conductor").value = "";
        document.getElementById("bus-form-status").value = "Active";
        document.getElementById("bus-form-departure").value = "06:30 AM";
        document.getElementById("bus-form-arrival").value = "07:15 AM";
        routeSelect.value = "";
    }

    modal.classList.remove("hidden");
}

function closeBusModal() {
    document.getElementById("bus-modal").classList.add("hidden");
}

async function handleSaveBus(event) {
    event.preventDefault();
    const id = document.getElementById("bus-form-id").value;
    const bus_number = document.getElementById("bus-form-number").value.trim().toUpperCase();
    const bus_type = document.getElementById("bus-form-type").value;
    const capacity = parseInt(document.getElementById("bus-form-capacity").value);
    const occupancy = parseInt(document.getElementById("bus-form-occupancy").value) || 0;
    const driver_name = document.getElementById("bus-form-driver").value.trim();
    const conductor_name = document.getElementById("bus-form-conductor").value.trim();
    const status = document.getElementById("bus-form-status").value;
    const departure_time = document.getElementById("bus-form-departure").value.trim();
    const arrival_time = document.getElementById("bus-form-arrival").value.trim();
    const current_route_id = document.getElementById("bus-form-route").value ? parseInt(document.getElementById("bus-form-route").value) : null;

    const payload = {
        bus_number,
        bus_type,
        capacity,
        occupancy,
        driver_name,
        conductor_name,
        status,
        departure_time,
        arrival_time,
        current_route_id
    };

    try {
        if (id) {
            payload.id = parseInt(id);
            await apiCall("/api/buses", "PUT", payload);
            showToast("Bus details and route assignment updated.", "success");
        } else {
            await apiCall("/api/buses", "POST", payload);
            showToast("New bus registered into depot fleet.", "success");
        }
        closeBusModal();
        await loadAdminBuses();
        await loadAdminBusManagement();
        await loadAdminOverview();
        await renderRouteConditionTable();
        await loadPublicData();
    } catch (e) {
        showToast("Error saving bus: " + e.message, "error");
    }
}

function deleteBus(id) {
    showConfirm("Deregister Bus", "Are you sure you want to remove this bus from the fleet?", async () => {
        try {
            await apiCall(`/api/buses?id=${id}`, "DELETE");
            showToast("Bus deregistered.", "success");
            await loadAdminBuses();
            await loadAdminBusManagement();
            await loadAdminOverview();
            await renderRouteConditionTable();
            await loadPublicData();
        } catch (e) {
            showToast("Error removing bus: " + e.message, "error");
        }
    });
}

// --- Admin Section F: Ticket Sales ---
async function loadAdminTickets() {
    const routeFilter = document.getElementById("filter-ticket-route");
    const stopFilter = document.getElementById("filter-ticket-stop");

    // Populate filter dropdowns if empty
    if (routeFilter && routeFilter.children.length <= 1) {
        routeFilter.innerHTML = `<option value="">All Routes</option>` + allRoutes.map(r => `<option value="${r.id}">${r.route_number}</option>`).join("");
    }
    if (stopFilter && stopFilter.children.length <= 1) {
        stopFilter.innerHTML = `<option value="">All Stops</option>` + allStops.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
    }

    let url = "/api/tickets?";
    if (routeFilter && routeFilter.value) url += `route_id=${routeFilter.value}&`;
    if (stopFilter && stopFilter.value) url += `stop_id=${stopFilter.value}&`;

    try {
        const tickets = await apiCall(url);
        const tbody = document.getElementById("admin-tickets-tbody");
        if (!tbody) return;

        if (!tickets || tickets.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-slate-400">No ticket records found for selected filter.</td></tr>`;
            return;
        }

        tbody.innerHTML = tickets.map(t => `
            <tr class="hover:bg-slate-50">
                <td class="p-3 font-mono font-bold text-slate-700">#${t.id}</td>
                <td class="p-3 font-bold text-rose-600">${t.route_number || "KKD"}</td>
                <td class="p-3 font-mono text-slate-500">${t.trip_id || "TRIP"}</td>
                <td class="p-3 font-semibold text-slate-800">${t.boarding_stop_name}</td>
                <td class="p-3 text-slate-500">${t.dest_stop_name || "-"}</td>
                <td class="p-3 text-center font-bold text-slate-900">${t.ticket_count}</td>
                <td class="p-3 font-bold text-emerald-700">₹${t.fare_collected}</td>
                <td class="p-3 text-slate-400 text-[11px]">${t.sale_date} ${t.sale_time || ""}</td>
                <td class="p-3 text-[11px] text-slate-500">${t.data_source || "ETM"}</td>
            </tr>
        `).join("");
    } catch (e) {
        showToast("Error loading tickets: " + e.message, "error");
    }
}

function openRecordTicketModal() {
    const modal = document.getElementById("ticket-modal");
    const routeSelect = document.getElementById("ticket-form-route");
    const stopSelect = document.getElementById("ticket-form-boarding");

    routeSelect.innerHTML = allRoutes.map(r => `<option value="${r.id}">${r.route_number}: ${r.route_name}</option>`).join("");
    stopSelect.innerHTML = allStops.map(s => `<option value="${s.id}">${s.name}</option>`).join("");

    modal.classList.remove("hidden");
}

function closeTicketModal() {
    document.getElementById("ticket-modal").classList.add("hidden");
}

async function handleSaveTicket(event) {
    event.preventDefault();
    const route_id = parseInt(document.getElementById("ticket-form-route").value);
    const trip_id = document.getElementById("ticket-form-trip").value.trim();
    const boarding_stop_id = parseInt(document.getElementById("ticket-form-boarding").value);
    const ticket_count = parseInt(document.getElementById("ticket-form-count").value);

    try {
        await apiCall("/api/tickets", "POST", { route_id, trip_id, boarding_stop_id, ticket_count });
        showToast("Ticket sales recorded.", "success");
        closeTicketModal();
        loadAdminTickets();
        loadAdminOverview();
    } catch (e) {
        showToast("Error logging ticket: " + e.message, "error");
    }
}

// --- Admin Section G: Bus Occupancy System ---
async function loadAdminOccupancy() {
    try {
        allOccupancy = await apiCall("/api/occupancy");
        const tbody = document.getElementById("admin-occupancy-tbody");
        if (!tbody) return;

        tbody.innerHTML = allOccupancy.map(o => {
            let badge = "bg-emerald-100 text-emerald-800 border-emerald-300";
            if (o.occupancy_status === "MEDIUM") badge = "bg-amber-100 text-amber-800 border-amber-300";
            if (o.occupancy_status === "FULL") badge = "bg-rose-100 text-rose-800 border-rose-300";

            const ratioPct = Math.round((o.occupancy_ratio || 0) * 100);

            return `
                <tr class="hover:bg-slate-50">
                    <td class="p-3 font-bold text-rose-600">${o.route_number || "KKD-01"}</td>
                    <td class="p-3 font-mono text-slate-500">${o.trip_id}</td>
                    <td class="p-3 font-semibold text-slate-800">${o.bus_number || "AP-05-Z-1088"}</td>
                    <td class="p-3 font-mono font-bold">${o.recorded_tickets} / ${o.bus_capacity}</td>
                    <td class="p-3">
                        <div class="flex items-center space-x-2">
                            <span class="font-bold text-xs">${ratioPct}%</span>
                            <div class="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div class="h-full ${ratioPct > 85 ? 'bg-rose-600' : ratioPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}" style="width: ${Math.min(100, ratioPct)}%"></div>
                            </div>
                        </div>
                    </td>
                    <td class="p-3">
                        <span class="text-[10px] font-black px-2.5 py-1 rounded-full border ${badge}">
                            ${o.occupancy_status}
                        </span>
                    </td>
                    <td class="p-3 text-[11px] text-slate-400">${o.status_label || "ETM Automatic"}</td>
                    <td class="p-3 text-right space-x-1">
                        <button onclick="setOccupancyOverride(${o.id}, 'FREE')" class="px-2 py-1 text-[10px] rounded font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100">FREE</button>
                        <button onclick="setOccupancyOverride(${o.id}, 'MEDIUM')" class="px-2 py-1 text-[10px] rounded font-bold bg-amber-50 text-amber-700 hover:bg-amber-100">MED</button>
                        <button onclick="setOccupancyOverride(${o.id}, 'FULL')" class="px-2 py-1 text-[10px] rounded font-bold bg-rose-50 text-rose-700 hover:bg-rose-100">FULL</button>
                    </td>
                </tr>
            `;
        }).join("");
    } catch (e) {
        showToast("Error loading occupancy records.", "error");
    }
}

async function setOccupancyOverride(id, status) {
    try {
        await apiCall("/api/occupancy", "PUT", {
            id,
            occupancy_status: status,
            status_label: `Manual override by ${currentUser ? currentUser.username : "Admin"}`
        });
        showToast(`Occupancy updated to ${status}.`, "success");
        loadAdminOccupancy();
    } catch (e) {
        showToast("Failed to update occupancy override: " + e.message, "error");
    }
}

// --- Admin Section H: Frequency Analysis & Optimizer ---
function initFrequencySection() {
    const routeSelect = document.getElementById("opt-route-select");
    if (routeSelect && allRoutes.length > 0) {
        routeSelect.innerHTML = allRoutes.map(r => `<option value="${r.id}">${r.route_number}: ${r.route_name}</option>`).join("");
    }
}

async function calculateFrequencyOptimization() {
    const route_id = parseInt(document.getElementById("opt-route-select").value || 1);
    const avg_boardings = parseFloat(document.getElementById("opt-boardings").value || 3800);
    const peak_congestion = parseFloat(document.getElementById("opt-congestion").value || 1.7);
    const bus_capacity = parseInt(document.getElementById("opt-capacity").value || 50);
    const available_fleet = parseInt(document.getElementById("opt-fleet").value || 6);

    try {
        const res = await apiCall("/api/optimize/frequency", "POST", {
            route_id,
            avg_boardings,
            peak_congestion,
            bus_capacity,
            available_fleet
        });

        const peakVal = res.predicted_peak_load !== undefined ? res.predicted_peak_load : (res.estimated_peak_volume || 0);
        const freqText = res.suggested_frequency_mins ? `Every ${res.suggested_frequency_mins} mins` : (res.recommended_headway_desc || "Every 10-12 mins");
        const tripsNeeded = res.trips_needed_per_hour !== undefined ? res.trips_needed_per_hour : (res.required_hourly_trips || 5);
        const deficit = res.fleet_deficit !== undefined ? res.fleet_deficit : (res.buses_shortage || 0);

        document.getElementById("out-peak-load").innerText = `${peakVal} passengers/hr`;
        document.getElementById("out-rec-freq").innerText = freqText;
        document.getElementById("out-trips-needed").innerText = `${tripsNeeded} trips / hr`;

        const balanceEl = document.getElementById("out-fleet-balance");
        if (deficit > 0 || res.fleet_balance_status === "Deficit") {
            balanceEl.className = "font-bold text-sm text-rose-400";
            balanceEl.innerText = `Fleet Deficit (-${deficit} buses needed)`;
        } else {
            balanceEl.className = "font-bold text-sm text-emerald-400";
            balanceEl.innerText = "Fleet Adequate & Optimal";
        }

        document.getElementById("out-recommendation-box").innerHTML = `
            <strong>Operational Recommendation:</strong><br>
            ${res.recommendation || res.recommendation_notes || "Maintain current frequency."}
        `;
        showToast("Frequency analysis computed successfully.", "success");
    } catch (e) {
        showToast("Frequency regression failed: " + e.message, "error");
    }
}

// --- Admin Section I: Operational Service Alerts ---
async function loadAdminAlerts() {
    try {
        allAlerts = await apiCall("/api/alerts");
        const tbody = document.getElementById("admin-alerts-tbody");
        if (!tbody) return;

        tbody.innerHTML = allAlerts.map(a => `
            <tr class="hover:bg-slate-50">
                <td class="p-3 font-bold text-slate-900">${a.title}</td>
                <td class="p-3 text-slate-600">${a.alert_type}</td>
                <td class="p-3">
                    <span class="bg-${a.severity === 'High' ? 'rose' : a.severity === 'Low' ? 'blue' : 'amber'}-100 text-${a.severity === 'High' ? 'rose' : a.severity === 'Low' ? 'blue' : 'amber'}-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                        ${a.severity}
                    </span>
                </td>
                <td class="p-3 text-slate-600 text-xs">${a.affected_route_ids || "All"} / ${a.affected_stop_ids || "All"}</td>
                <td class="p-3 font-mono text-[11px] text-slate-400">${a.start_date || "-"}</td>
                <td class="p-3">
                    <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        ${a.is_published ? "Published" : "Draft"}
                    </span>
                </td>
                <td class="p-3 text-right">
                    <button onclick="deleteAlert(${a.id})" class="text-rose-600 hover:text-rose-800 font-bold">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join("");
    } catch (e) {
        showToast("Failed to load alerts.", "error");
    }
}

function openAlertModal() {
    const modal = document.getElementById("alert-modal");
    document.getElementById("alert-form-id").value = "";
    document.getElementById("alert-form-title").value = "";
    document.getElementById("alert-form-routes").value = "All";
    document.getElementById("alert-form-stops").value = "All";
    document.getElementById("alert-form-desc").value = "";
    document.getElementById("alert-form-sdate").value = new Date().toISOString().split("T")[0];

    modal.classList.remove("hidden");
}

function closeAlertModal() {
    document.getElementById("alert-modal").classList.add("hidden");
}

async function handleSaveAlert(event) {
    event.preventDefault();
    const title = document.getElementById("alert-form-title").value.trim();
    const alert_type = document.getElementById("alert-form-type").value;
    const severity = document.getElementById("alert-form-severity").value;
    const affected_route_ids = document.getElementById("alert-form-routes").value.trim();
    const affected_stop_ids = document.getElementById("alert-form-stops").value.trim();
    const description = document.getElementById("alert-form-desc").value.trim();
    const start_date = document.getElementById("alert-form-sdate").value;
    const end_date = document.getElementById("alert-form-edate").value || null;
    const is_published = document.getElementById("alert-form-published").checked ? 1 : 0;

    try {
        await apiCall("/api/alerts", "POST", {
            title, alert_type, severity, affected_route_ids, affected_stop_ids, description, start_date, end_date, is_published
        });
        showToast("Service alert issued.", "success");
        closeAlertModal();
        loadAdminAlerts();
        renderPublicAlerts();
    } catch (e) {
        showToast("Error creating alert: " + e.message, "error");
    }
}

function deleteAlert(id) {
    showConfirm("Delete Service Alert", "Are you sure you want to remove this alert?", async () => {
        try {
            await apiCall(`/api/alerts?id=${id}`, "DELETE");
            showToast("Alert deleted.", "success");
            loadAdminAlerts();
            renderPublicAlerts();
        } catch (e) {
            showToast("Error deleting alert: " + e.message, "error");
        }
    });
}

// --- Admin Section J: CSV Export & Import ---
function exportCSV(type) {
    window.location.href = `/api/data/export-csv?type=${type}`;
    showToast(`Downloading official ${type} CSV dataset...`, "info");
}

async function handleCSVImport() {
    const textarea = document.getElementById("csv-import-area");
    const raw_csv = textarea.value.trim();

    if (!raw_csv) {
        showToast("Please paste CSV data rows first.", "warning");
        return;
    }

    try {
        const res = await apiCall("/api/data/import-csv", "POST", {
            type: "stops",
            csv_content: raw_csv
        });
        showToast(res.message || "CSV imported successfully.", "success");
        textarea.value = "";
        loadAdminStops();
        loadPublicData();
    } catch (e) {
        showToast("CSV Import error: " + e.message, "error");
    }
}

// --- Admin Section K: Profile & Audit Logs ---
async function loadAdminProfile() {
    updateAuthUI();
    try {
        const logs = await apiCall("/api/audit-logs");
        const tbody = document.getElementById("admin-audit-tbody");
        if (!tbody) return;

        if (!logs || logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-slate-400">No audit logs recorded yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = logs.map(l => `
            <tr class="hover:bg-slate-50">
                <td class="py-2 font-bold text-slate-800">${l.username || "admin"}</td>
                <td class="py-2">
                    <span class="font-mono text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">${l.action}</span>
                </td>
                <td class="py-2 text-slate-600 text-xs">${l.details || "-"}</td>
                <td class="py-2 text-right font-mono text-[11px] text-slate-400">${l.timestamp}</td>
            </tr>
        `).join("");
    } catch (e) {
        console.warn("Failed to load audit logs:", e);
    }
}


// --- 6 Core Computer Science Subject Presentations ---
const SUBJECT_DETAILS = {
    DBMS: {
        badge: "DBMS",
        title: "Database Management System",
        tagline: "Relational Modeling, 3NF Normalization, Foreign Key Constraints, and ACID Transactions",
        status: "Fully Implemented (SQLite3 Relational Engine)",
        theory: "Database Management Systems (DBMS) provide structured storage, retrieval, and modification of data while upholding ACID (Atomicity, Consistency, Isolation, Durability) properties. In municipal transit engineering, relational schemas prevent data anomalies and decouple transit topology from application logic.",
        concepts: [
            "Relational Entity-Relationship (ER) Architecture: Entities include bus_routes, bus_stops, route_stops, buses, timetables, and passenger feedback.",
            "Primary and Foreign Key Integrity: route_stops utilizes composite relationship between route_id (FK -> bus_routes.id) and stop_id (FK -> bus_stops.id) with ON DELETE CASCADE.",
            "Normal Forms (3NF): Non-key attributes depend strictly on candidate keys, eliminating update and deletion anomalies.",
            "Transaction Atomicity: Sequential route creation inserts the corridor and multi-stop sequence inside atomic transactions."
        ],
        implementation: `// SQLite3 Normalized Schema Definition (db.py)
CREATE TABLE IF NOT EXISTS bus_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_number TEXT UNIQUE NOT NULL,
    route_name TEXT NOT NULL,
    origin_stop_id INTEGER NOT NULL REFERENCES bus_stops(id),
    dest_stop_id INTEGER NOT NULL REFERENCES bus_stops(id),
    distance_km REAL DEFAULT 10.0,
    travel_time_mins INTEGER DEFAULT 30,
    required_buses INTEGER DEFAULT 2,
    status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS route_stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
    stop_id INTEGER NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
    stop_sequence INTEGER NOT NULL,
    arrival_time TEXT,
    departure_time TEXT,
    UNIQUE(route_id, stop_id)
);`,
        extension: "Future Extension: Replication with PostgreSQL clustering for statewide RTC deployment, partition pruning on historical ticketing transactions, and real-time CDC (Change Data Capture) event streams."
    },
    DMGT: {
        badge: "DMGT",
        title: "Discrete Mathematics & Graph Theory",
        tagline: "Graph Formalization, Adjacency Structures, Vertex-Edge Modeling, and Path Connectivity",
        status: "Fully Implemented (Topological Graph Representation)",
        theory: "Discrete Mathematics and Graph Theory (DMGT) represent network topologies using vertices (nodes) and edges (links). In transit systems, bus stops constitute vertices V = {s1, s2, ..., sn} and transit corridors form directed or undirected edges E = {(u, v)}, allowing algebraic reasoning about city connectivity.",
        concepts: [
            "Vertex Modeling: Every verified bus stop across Kakinada (APSRTC Complex, Bhanugudi, JNTUK, Jagannaickpur, etc.) is represented as a distinct vertex V.",
            "Edge & Multi-Graph Formulation: Road segments connecting consecutive stops are represented as edges E with weight attributes (distance_km, headway travel time).",
            "Degree Centrality: Identifying high-connectivity transit interchanges (e.g. APSRTC Complex with highest in-degree and out-degree).",
            "Adjacency List Structure: Stored in memory as an adjacency dictionary mapping each stop to its reachable neighbors across all operating routes."
        ],
        implementation: `// In-Memory Graph Adjacency Construction (db.py & server.py)
def build_transit_graph():
    # G = (V, E)
    graph = { stop['name']: [] for stop in get_all_stops() }
    for route in get_all_routes():
        stops = route['stops']
        for i in range(len(stops) - 1):
            u = stops[i]['name']
            v = stops[i+1]['name']
            graph[u].append({
                'neighbor': v,
                'route': route['route_number'],
                'distance': route['distance_km'] / len(stops)
            })
    return graph`,
        extension: "Future Extension: Eulerian and Hamiltonian cycle inspection for circular depot route design, and Minimum Spanning Trees (Kruskal/Prim) for optimal municipal feeder link construction."
    },
    ADSA: {
        badge: "ADSA",
        title: "Advanced Data Structures & Algorithms",
        tagline: "Breadth-First Search (BFS), Queue ADTs, Shortest Transfer Exploration, and Time Complexity",
        status: "Fully Implemented (BFS Traversal Engine)",
        theory: "Advanced Data Structures & Algorithms (ADSA) enable efficient computational traversal of complex networks. Breadth-First Search (BFS) is the optimal algorithm for finding shortest paths in unweighted graphs or minimizing transfer hops in urban transit grids with O(V + E) computational time complexity.",
        concepts: [
            "FIFO Queue Abstract Data Type: Used to explore transit vertices level by level, ensuring that the first path discovered between Origin and Destination minimizes bus changeover hops.",
            "Visited Hash Set: Tracks already inspected transit hubs in O(1) time to prevent infinite cycling in bi-directional circular corridors.",
            "Path Backtracking: Maintains parent pointers in an exploration map to reconstruct the exact sequential corridor path upon reaching target.",
            "Algorithmic Complexity: Guarantees optimal traversal in O(V + E) time and O(V) auxiliary space."
        ],
        implementation: `// BFS Algorithmic Engine (db.py: bfs_shortest_path)
def bfs_shortest_path(graph, start_node, target_node):
    queue = deque([[start_node]])
    visited = {start_node}
    
    while queue:
        path = queue.popleft()
        current = path[-1]
        
        if current == target_node:
            return path  # Optimal minimum-hop route
            
        for neighbor_info in graph.get(current, []):
            nxt = neighbor_info['neighbor']
            if nxt not in visited:
                visited.add(nxt)
                new_path = list(path)
                new_path.append(nxt)
                queue.append(new_path)
    return None`,
        extension: "Future Extension: Dijkstra's algorithm for continuous real-world travel time minimization, and A* heuristic search incorporating GPS geodesic coordinates."
    },
    OOP: {
        badge: "OOP",
        title: "Object-Oriented Programming",
        tagline: "Encapsulation, Class Hierarchies, Entity Domain Modeling, and Modular Interfaces",
        status: "Fully Implemented (Domain Model Architecture)",
        theory: "Object-Oriented Programming (OOP) organizes software design around real-world domain objects rather than procedural subroutines. Transit entities (Bus, Route, Stop, Trip, Conductor, PassengerFeedback) encapsulate their internal attributes and expose clean operational behaviors.",
        concepts: [
            "Encapsulation: Route and Bus entities bundle state (registration, capacity, occupancy, status) and guard mutator access via validated methods.",
            "Domain Abstraction: High-level controller interacts with clear interfaces without worrying about low-level SQL cursor operations.",
            "Polymorphism & Bus Specialization: Bus types (City Ordinary, Metro Express, AC City Liner) inherit common vehicle properties while tailoring fare multipliers and stopping policies.",
            "Modularity: Public commuter controllers and depot administration modules maintain separate, decoupled lifecycles."
        ],
        implementation: `// OOP Domain Modeling Concept
class TransitEntity:
    def __init__(self, id, name):
        self._id = id
        self._name = name

class BusRoute(TransitEntity):
    def __init__(self, id, route_number, route_name, origin, dest):
        super().__init__(id, route_name)
        self.route_number = route_number
        self.origin = origin
        self.dest = dest
        self._stops = []
        self._assigned_buses = []

    def assign_bus(self, bus):
        if bus.is_operational():
            self._assigned_buses.append(bus)
            bus.set_route(self.route_number)

    def calculate_extra_bus_required(self, demand):
        total_capacity = sum(b.capacity for b in self._assigned_buses)
        return demand > (total_capacity * 0.90)`,
        extension: "Future Extension: Full Python class-based ORM with event-driven pub/sub architecture and observer design pattern for real-time fleet vehicle events."
    },
    PYTHON: {
        badge: "PYTHON",
        title: "Python (Data Analytics & Forecasting)",
        tagline: "HTTP REST API, Relational Queries, SQLite3 Connection Pooling, and Demand Models",
        status: "Planned / Demonstration Concept (Analytics & Extra Bus Demand Model)",
        theory: "Python provides an ideal ecosystem for backend engineering and numerical data analysis. In this project, Python serves as the lightweight HTTP server while implementing algorithmic logic to analyze passenger load factors and forecast when a corridor requires additional fleet allocations.",
        concepts: [
            "RESTful API Service: Built on Python's http.server with JSON serialization and token verification.",
            "Dynamic Headway & Capacity Model: Evaluates assigned bus capacity against peak passenger demand. If occupancy exceeds 90% or ridership exceeds seat capacity, it flags RED status and computes the exact extra buses needed.",
            "ETL Pipeline: Extracts raw ETM ticket transactions, transforms them by corridor, and loads aggregated occupancy metrics.",
            "Predictive Demonstration: Demonstrates linear statistical regression models forecasting passenger surges during morning and evening rush hours."
        ],
        implementation: `// Predictive Route Condition & Extra Bus Algorithm (db.py)
def get_route_conditions():
    # Evaluates ridership demand vs fleet capacity
    for route in routes:
        capacity = sum(b['capacity'] for b in route['assigned_buses'])
        demand = route['total_passengers']
        occupancy_pct = (demand / capacity * 100) if capacity > 0 else 100.0
        
        extra_bus_required = occupancy_pct >= 90.0 or capacity == 0
        extra_buses_needed = max(1, math.ceil((demand - capacity) / 50)) if extra_bus_required else 0
        
        yield {
            'route_number': route['route_number'],
            'capacity': capacity,
            'demand': demand,
            'occupancy_pct': round(occupancy_pct, 1),
            'extra_bus_required': extra_bus_required,
            'extra_buses_needed': extra_buses_needed
        }`,
        extension: "Future Extension: Integrating Scikit-Learn Random Forest regressors and Prophet time-series models trained on weather, holiday calendars, and school term timetables."
    },
    WEB_DEV: {
        badge: "WEB DEV",
        title: "Web Development & Modern REST Architecture",
        tagline: "Semantic HTML5, Responsive Tailwind CSS, Vanilla JS State Machine, and Asynchronous HTTP",
        status: "Fully Implemented (Interactive Web Application)",
        theory: "Modern Web Engineering decouples presentation from backend services via REST APIs. A responsive single-page architecture ensures instant feedback, accessibility across mobile and desktop devices, and zero external framework lock-in.",
        concepts: [
            "Single Page Application (SPA): Dynamic view switching between Public Commuter Portal and Protected Admin Depot Command without full page refreshes.",
            "Reactive DOM State Management: Vanilla JavaScript functions synchronize SQLite backend records with UI cards, dynamic tables, and modal builders.",
            "Asynchronous HTTP Fetch: RESTful endpoints communicate through async/await JSON requests with structured error handling.",
            "Accessible Design System: High-contrast Tailwind palette (Slate-900, Rose-600, Emerald-600, Amber-500) optimized for readability in transit conditions."
        ],
        implementation: `// Asynchronous REST Client Pattern (script.js)
async function apiCall(endpoint, method = "GET", body = null) {
    const headers = {};
    if (authToken) headers["Authorization"] = \`Bearer \${authToken}\`;
    if (body) headers["Content-Type"] = "application/json";

    const res = await fetch(endpoint, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
}`,
        extension: "Future Extension: Progressive Web App (PWA) service workers for offline route lookup and WebSocket live socket connections for 1-second GPS vehicle markers."
    }
};

function openSubjectModal(subjectKey) {
    const data = SUBJECT_DETAILS[subjectKey];
    if (!data) return;

    document.getElementById("sub-modal-badge").innerText = data.badge;
    document.getElementById("sub-modal-title").innerText = data.title;
    document.getElementById("sub-modal-tagline").innerText = data.tagline;
    document.getElementById("sub-modal-status").innerText = data.status;
    document.getElementById("sub-modal-theory").innerText = data.theory;
    
    const conceptsUl = document.getElementById("sub-modal-concepts");
    conceptsUl.innerHTML = data.concepts.map(c => `<li>${c}</li>`).join("");

    document.getElementById("sub-modal-implementation").innerText = data.implementation;
    document.getElementById("sub-modal-extension").innerText = data.extension;

    document.getElementById("subject-detail-modal").classList.remove("hidden");
}

function closeSubjectModal() {
    document.getElementById("subject-detail-modal").classList.add("hidden");
}


// --- Public Routes Directory Table ---
function renderPublicRoutes(filter = "") {
    const tbody = document.getElementById("public-routes-tbody");
    if (!tbody) return;

    let routes = allRoutes || [];
    if (filter) {
        const q = filter.toLowerCase();
        routes = routes.filter(r => 
            r.route_number.toLowerCase().includes(q) ||
            r.route_name.toLowerCase().includes(q) ||
            (r.origin_name && r.origin_name.toLowerCase().includes(q)) ||
            (r.dest_name && r.dest_name.toLowerCase().includes(q)) ||
            (r.stops && r.stops.some(s => s.name.toLowerCase().includes(q)))
        );
    }

    if (routes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400">No matching bus routes found.</td></tr>`;
        return;
    }

    tbody.innerHTML = routes.map(r => {
        const stopsList = r.stops || [];
        const stopsCount = stopsList.length;
        const stopsPreview = stopsList.slice(0, 3).map(s => s.name).join(" ➔ ");
        const extraStops = stopsCount > 3 ? ` +${stopsCount - 3} more` : "";

        return `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-3.5">
                    <span class="bg-rose-600 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-sm">
                        ${r.route_number}
                    </span>
                </td>
                <td class="p-3.5 font-bold text-slate-900">${r.route_name}</td>
                <td class="p-3.5 text-slate-600 font-medium">
                    <div class="flex items-center gap-1.5">
                        <span class="text-rose-600 font-bold">${r.origin_name}</span>
                        <i class="fa-solid fa-arrow-right text-[10px] text-slate-400"></i>
                        <span class="text-emerald-700 font-bold">${r.dest_name}</span>
                    </div>
                </td>
                <td class="p-3.5 text-slate-500 max-w-xs">
                    <span class="text-xs text-slate-700 font-medium">${stopsPreview}${extraStops}</span>
                    <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded ml-1 font-semibold">${stopsCount} stops</span>
                </td>
                <td class="p-3.5 text-slate-600 font-semibold">${r.frequency_desc || "Every 15 mins"}</td>
                <td class="p-3.5">
                    <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                        ${r.is_active ? "Operational" : "Active"}
                    </span>
                </td>
                <td class="p-3.5 text-right">
                    <button onclick="viewRouteDetailsFromDirectory(${r.id})" class="text-xs bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-bold transition shadow-sm flex items-center gap-1 ml-auto">
                        <i class="fa-solid fa-clock"></i> <span>Timetable</span>
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

function filterPublicRoutesTable() {
    const input = document.getElementById("public-routes-filter-input");
    renderPublicRoutes(input ? input.value.trim() : "");
}

function viewRouteDetailsFromDirectory(routeId) {
    const selector = document.getElementById("public-route-code-select");
    if (selector) {
        selector.value = routeId;
        switchPublicSearchTab('route-no');
        handleRouteScheduleSearch();
        scrollToSection('passenger-search-center');
    }
}

// --- Public Remarks System ---
let currentRemarkRating = 5;

function setRemarkRating(stars) {
    currentRemarkRating = stars;
    const input = document.getElementById("remark-form-rating");
    if (input) input.value = stars;

    const label = document.getElementById("remark-rating-label");
    const labels = {
        1: "1 Star (Poor Experience)",
        2: "2 Stars (Needs Improvement)",
        3: "3 Stars (Average / Moderate)",
        4: "4 Stars (Good Service)",
        5: "5 Stars (Excellent Service)"
    };
    if (label) label.innerText = labels[stars] || `${stars} Stars`;

    const starBtns = document.querySelectorAll("#remark-star-picker .star-btn");
    starBtns.forEach((btn, idx) => {
        if (idx < stars) {
            btn.className = "star-btn text-amber-400 text-lg hover:scale-110 transition";
        } else {
            btn.className = "star-btn text-slate-300 text-lg hover:scale-110 transition";
        }
    });
}

async function loadPublicRemarks() {
    const list = document.getElementById("public-recent-remarks-list");
    if (!list) return;

    try {
        const remarks = await apiCall("/api/feedback");
        if (!remarks || remarks.length === 0) {
            list.innerHTML = `
                <div class="text-center py-6 text-slate-400 text-xs">
                    <i class="fa-solid fa-comment-slash text-xl mb-1 block"></i>
                    No passenger remarks logged yet. Be the first to submit!
                </div>
            `;
            return;
        }

        list.innerHTML = remarks.slice(0, 10).map(rm => {
            const starsStr = "★".repeat(rm.rating || 5) + "☆".repeat(Math.max(0, 5 - (rm.rating || 5)));
            let statusBadge = "bg-amber-100 text-amber-800 border-amber-200";
            if (rm.status === "Reviewed") statusBadge = "bg-blue-100 text-blue-800 border-blue-200";
            if (rm.status === "Resolved") statusBadge = "bg-emerald-100 text-emerald-800 border-emerald-200";

            return `
                <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-1.5 text-xs">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-1.5">
                            <span class="font-bold text-slate-800">${rm.passenger_name || "Commuter"}</span>
                            <span class="text-amber-500 font-bold">${starsStr}</span>
                        </div>
                        <span class="text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusBadge}">${rm.status || "Pending"}</span>
                    </div>
                    <p class="text-slate-600 text-xs leading-relaxed">"${rm.remark || rm.message}"</p>
                    <div class="flex flex-wrap gap-2 text-[10px] text-slate-400 pt-0.5">
                        <span class="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-semibold">${rm.route_number || "Route"}</span>
                        <span>•</span>
                        <span>${rm.stop_name || "Transit Stop"}</span>
                        <span>•</span>
                        <span class="text-slate-500 font-medium">${rm.feedback_type || "General"}</span>
                        ${rm.bus_number ? `<span>• Bus: ${rm.bus_number}</span>` : ""}
                    </div>
                </div>
            `;
        }).join("");
    } catch (e) {
        console.warn("Could not load public remarks:", e);
    }
}

async function handlePublicRemarkSubmit(event) {
    event.preventDefault();
    const name = document.getElementById("remark-form-name").value.trim();
    const contact = document.getElementById("remark-form-contact").value.trim();
    const route_id = parseInt(document.getElementById("remark-form-route").value);
    const bus_number = document.getElementById("remark-form-bus").value.trim();
    const stop_id = parseInt(document.getElementById("remark-form-stop").value);
    const feedback_type = document.getElementById("remark-form-type").value;
    const rating = parseInt(document.getElementById("remark-form-rating").value) || 5;
    const message = document.getElementById("remark-form-msg").value.trim();

    if (!route_id || !stop_id || !message) {
        showToast("Please select Route, Stop, and enter your remark message.", "warning");
        return;
    }

    try {
        const res = await apiCall("/api/feedback", "POST", {
            passenger_name: name || "Commuter",
            contact_info: contact,
            route_id,
            bus_number,
            stop_id,
            feedback_type,
            rating,
            message
        });

        const successBox = document.getElementById("public-remark-success-box");
        const successMsg = document.getElementById("public-remark-success-msg");
        if (successBox) {
            if (successMsg) {
                successMsg.innerText = `Thank you! Your remark regarding route has been recorded with Reference #${res.id || Math.floor(100 + Math.random() * 900)}.`;
            }
            successBox.classList.remove("hidden");
        }

        // Reset form
        document.getElementById("public-remark-form").reset();
        setRemarkRating(5);
        showToast("Thank you! Your remark has been logged successfully.", "success");
        await loadPublicRemarks();
    } catch (e) {
        showToast("Error submitting remark: " + e.message, "error");
    }
}


// --- Route Condition & Extra Bus Live Calculation Table ---
async function renderRouteConditionTable() {
    try {
        const conditions = await apiCall("/api/route-conditions");
        const tbodyOverview = document.getElementById("admin-route-condition-tbody");
        const tbodyDedicated = document.getElementById("admin-route-condition-dedicated-tbody");

        if (!conditions || conditions.length === 0) {
            const emptyRow = `<tr><td colspan="8" class="p-6 text-center text-slate-400">No route condition data available.</td></tr>`;
            if (tbodyOverview) tbodyOverview.innerHTML = emptyRow;
            if (tbodyDedicated) tbodyDedicated.innerHTML = emptyRow;
            return;
        }

        const rowsHtml = conditions.map(rc => {
            const isRequired = rc.extra_bus_required;
            const extraCount = rc.extra_buses_needed || 1;
            
            let statusBadge = "";
            if (isRequired) {
                statusBadge = `
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-300">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>Extra Bus Required (+${extraCount} Bus${extraCount > 1 ? 'es' : ''})</span>
                    </span>
                `;
            } else {
                statusBadge = `
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-700 border border-emerald-300">
                        <i class="fa-solid fa-circle-check"></i>
                        <span>Sufficient Fleet Capacity</span>
                    </span>
                `;
            }

            let condBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
            if (rc.condition_status === "Overcrowded / High Demand") condBadge = "bg-rose-50 text-rose-700 border-rose-200 font-bold";
            else if (rc.condition_status === "Moderate Load") condBadge = "bg-amber-50 text-amber-700 border-amber-200";

            const busesList = (rc.assigned_buses_list || []).map(b => `<span class="bg-slate-100 font-mono text-[10px] px-1.5 py-0.5 rounded border mr-1 font-semibold">${b}</span>`).join("");

            return `
                <tr class="hover:bg-slate-50 transition">
                    <td class="p-3">
                        <span class="bg-slate-900 text-white font-black text-xs px-2.5 py-1 rounded-lg">
                            ${rc.route_number}
                        </span>
                    </td>
                    <td class="p-3">
                        <div class="font-bold text-slate-900">${rc.route_name}</div>
                        <div class="text-[11px] text-slate-500">${rc.origin} ➔ ${rc.destination}</div>
                    </td>
                    <td class="p-3">
                        <div class="font-bold text-slate-800">${rc.assigned_buses_count} Bus${rc.assigned_buses_count !== 1 ? 'es' : ''}</div>
                        <div class="flex flex-wrap mt-0.5">${busesList || '<span class="text-slate-400 italic text-[11px]">None</span>'}</div>
                    </td>
                    <td class="p-3 font-semibold text-slate-700">${rc.total_capacity} seats</td>
                    <td class="p-3 font-bold text-slate-900">${rc.current_ridership} pax</td>
                    <td class="p-3">
                        <div class="flex items-center gap-2">
                            <span class="font-mono font-bold text-xs ${rc.occupancy_pct >= 90 ? 'text-rose-600' : 'text-slate-700'}">${rc.occupancy_pct}%</span>
                            <div class="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div class="${rc.occupancy_pct >= 90 ? 'bg-rose-600' : (rc.occupancy_pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500')} h-full" style="width: ${Math.min(100, rc.occupancy_pct)}%"></div>
                            </div>
                        </div>
                    </td>
                    <td class="p-3">
                        <span class="text-[10px] px-2 py-0.5 rounded-md border font-semibold ${condBadge}">
                            ${rc.condition_status}
                        </span>
                    </td>
                    <td class="p-3 text-right">
                        ${statusBadge}
                    </td>
                </tr>
            `;
        }).join("");

        if (tbodyOverview) tbodyOverview.innerHTML = rowsHtml;
        if (tbodyDedicated) tbodyDedicated.innerHTML = rowsHtml;
    } catch (e) {
        console.error("Error rendering route conditions:", e);
    }
}


// --- Admin Section: Passenger Remarks Triage ---
async function loadAdminRemarks() {
    const tbody = document.getElementById("admin-remarks-tbody");
    if (!tbody) return;

    try {
        const remarks = await apiCall("/api/feedback");
        if (!remarks || remarks.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" class="p-6 text-center text-slate-400">No passenger remarks recorded yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = remarks.map(rm => {
            const starsStr = "★".repeat(rm.rating || 5) + "☆".repeat(Math.max(0, 5 - (rm.rating || 5)));
            let badgeStyle = "bg-amber-100 text-amber-800";
            if (rm.status === "Reviewed") badgeStyle = "bg-blue-100 text-blue-800";
            if (rm.status === "Resolved") badgeStyle = "bg-emerald-100 text-emerald-800";

            return `
                <tr class="hover:bg-slate-50 transition">
                    <td class="p-3 font-mono text-slate-500 font-bold">#${rm.id}</td>
                    <td class="p-3 font-bold text-slate-900">${rm.passenger_name || "Commuter"}</td>
                    <td class="p-3 text-slate-600 font-mono text-[11px]">${rm.contact_info || "-"}</td>
                    <td class="p-3 font-mono font-bold text-rose-600">${rm.route_number || "-"}</td>
                    <td class="p-3 font-mono text-slate-700">${rm.bus_number || "-"}</td>
                    <td class="p-3 text-slate-700">${rm.stop_name || "-"}</td>
                    <td class="p-3 text-slate-600">${rm.feedback_type || "General"}</td>
                    <td class="p-3 text-amber-500 font-bold">${starsStr}</td>
                    <td class="p-3 text-slate-700 max-w-xs truncate" title="${rm.remark || rm.message}">${rm.remark || rm.message}</td>
                    <td class="p-3">
                        <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${badgeStyle}">${rm.status || "Pending"}</span>
                    </td>
                    <td class="p-3 text-right space-x-1">
                        <button onclick="updateRemarkStatus(${rm.id}, 'Reviewed')" class="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded font-semibold transition" title="Mark as Reviewed">
                            Review
                        </button>
                        <button onclick="updateRemarkStatus(${rm.id}, 'Resolved')" class="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded font-bold transition" title="Mark as Resolved">
                            Resolve
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    } catch (e) {
        showToast("Error loading remarks triage: " + e.message, "error");
    }
}

async function updateRemarkStatus(id, newStatus) {
    try {
        await apiCall("/api/feedback", "PUT", { id, status: newStatus });
        showToast(`Remark #${id} marked as ${newStatus}.`, "success");
        await loadAdminRemarks();
        await loadPublicRemarks();
    } catch (e) {
        showToast("Error updating remark: " + e.message, "error");
    }
}

// --- Admin Section: Fare Revenue Ledger ---
async function loadAdminRevenue() {
    try {
        const [overview, routes] = await Promise.all([
            apiCall("/api/overview"),
            apiCall("/api/routes")
        ]);

        const totalRev = overview.total_revenue || 0;
        const totalTickets = overview.total_tickets || 0;
        const avg = totalTickets > 0 ? (totalRev / totalTickets).toFixed(2) : "15.00";

        const revEl = document.getElementById("revenue-sec-total");
        const tixEl = document.getElementById("revenue-sec-tickets");
        const avgEl = document.getElementById("revenue-sec-avg");
        if (revEl) revEl.innerText = `₹${totalRev.toLocaleString()}`;
        if (tixEl) tixEl.innerText = totalTickets.toLocaleString();
        if (avgEl) avgEl.innerText = `₹${avg}`;

        const tbody = document.getElementById("revenue-by-route-tbody");
        if (tbody && routes) {
            tbody.innerHTML = routes.map(r => `
                <tr class="hover:bg-slate-50 transition">
                    <td class="p-3.5 font-bold font-mono text-rose-600">${r.route_number}</td>
                    <td class="p-3.5 font-semibold text-slate-800">${r.route_name}</td>
                    <td class="p-3.5 font-mono text-slate-600">${r.tickets || 0}</td>
                    <td class="p-3.5 font-bold text-slate-900">${r.passengers || 0}</td>
                    <td class="p-3.5 text-right font-black text-emerald-600">₹${(r.revenue || (r.passengers || 0) * 15).toLocaleString()}</td>
                </tr>
            `).join("");
        }
    } catch (e) {
        console.error("Failed to load revenue data:", e);
    }
}

// --- Application Bootstrap ---
document.addEventListener("DOMContentLoaded", async () => {
    await verifyExistingSession();
    await loadPublicData();
});
