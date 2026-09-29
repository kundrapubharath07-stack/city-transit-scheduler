import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

/*
===========================================================
 BUS ROUTE OPTIMIZER - KAKINADA
===========================================================

PUBLIC:
- No login
- Origin / Destination
- Bus search
- Timings
- Number of buses
- Bus status
- Empty / Medium / Full
- Passenger information
- Route stops

ADMIN:
- Login
- Dashboard
- Route management
- Bus stop management
- Service/timing management
- Passenger/ticket/revenue data
- Bus occupancy
- Tracking/status
- Issues
- Extra bus decision

DEMO LOGIN:
Username: admin
Password: admin123

IMPORTANT:
This is a college-project frontend.
localStorage is used for demo persistence.
It is NOT production-grade authentication.

===========================================================
*/

/* -------------------------------------------------------
   APSRTC-PUBLISHED KAKINADA STOP DATA USED AS INITIAL DATA
------------------------------------------------------- */

const APSRTC_STOPS = [
  "KAKINADA APSRTC BUS STATION",
  "GOVT.HOSPITAL-KKD",
  "J P BRIDGE-KKD",
  "ANNAMMAGATI-KKD",
  "NADAKUDURU",
  "PENUGUDURU BRIDGE-KKD",
  "KARAPA",
  "VELANGI",
  "SARPAVARAM.JN-KKD",
  "APSP-KKD-MOHAN CONVENT CENTRE",
  "ACHAMPETA JUNCTION-KKD",
  "JNTU-KKD",
];

/* -------------------------------------------------------
   INITIAL ROUTES
------------------------------------------------------- */

const INITIAL_ROUTES = [
  {
    id: 1,
    routeName: "Kakinada - Bengaluru",
    serviceCode: "GRD3",
    busType: "AMARAVATHI MULTIAXLE AC",

    buses: 2,
    passengers: 155,
    tickets: 155,
    revenue: 32550,

    capacityPerBus: 50,

    occupancy: "Full",
    tracking: "Near Sarpavaram Junction",

    departure: "14:45",
    arrival: "09:45",

    status: "Running",

    extraBus: "auto",

    issue: "",

    stops: [
      "KAKINADA APSRTC BUS STATION",
      "SARPAVARAM.JN-KKD",
      "APSP-KKD-MOHAN CONVENT CENTRE",
      "ACHAMPETA JUNCTION-KKD",
    ],

    stopTimes: [
      ["KAKINADA APSRTC BUS STATION", "14:45"],
      ["SARPAVARAM.JN-KKD", "14:50"],
      ["APSP-KKD-MOHAN CONVENT CENTRE", "14:53"],
      ["ACHAMPETA JUNCTION-KKD", "14:55"],
    ],
  },

  {
    id: 2,
    routeName: "Kakinada - Hyderabad",
    serviceCode: "IND1",
    busType: "NIGHT RIDER",

    buses: 3,
    passengers: 180,
    tickets: 180,
    revenue: 28800,

    capacityPerBus: 60,

    occupancy: "Medium",
    tracking: "Near J.P. Bridge",

    departure: "19:30",
    arrival: "01:20",

    status: "Running",

    extraBus: "auto",

    issue: "",

    stops: [
      "KAKINADA APSRTC BUS STATION",
      "GOVT.HOSPITAL-KKD",
      "J P BRIDGE-KKD",
      "ANNAMMAGATI-KKD",
      "NADAKUDURU",
      "PENUGUDURU BRIDGE-KKD",
      "KARAPA",
      "VELANGI",
    ],

    stopTimes: [
      ["KAKINADA APSRTC BUS STATION", "19:30"],
      ["GOVT.HOSPITAL-KKD", "19:33"],
      ["J P BRIDGE-KKD", "19:35"],
      ["ANNAMMAGATI-KKD", "19:40"],
      ["NADAKUDURU", "19:45"],
      ["PENUGUDURU BRIDGE-KKD", "19:50"],
      ["KARAPA", "19:55"],
      ["VELANGI", "20:05"],
    ],
  },

  {
    id: 3,
    routeName: "BHEL - Kakinada",
    serviceCode: "GRD1",
    busType: "AMARAVATHI MULTIAXLE AC",

    buses: 2,
    passengers: 112,
    tickets: 112,
    revenue: 22400,

    capacityPerBus: 60,

    occupancy: "Medium",
    tracking: "Near JNTU-KKD",

    departure: "08:48",
    arrival: "09:00",

    status: "Running",

    extraBus: "auto",

    issue: "",

    stops: [
      "ACHAMPETA JUNCTION-KKD",
      "APSP-KKD-MOHAN CONVENT CENTRE",
      "SARPAVARAM.JN-KKD",
      "JNTU-KKD",
      "KAKINADA APSRTC BUS STATION",
    ],

    stopTimes: [
      ["ACHAMPETA JUNCTION-KKD", "08:48"],
      ["APSP-KKD-MOHAN CONVENT CENTRE", "08:50"],
      ["SARPAVARAM.JN-KKD", "08:53"],
      ["JNTU-KKD", "08:55"],
      ["KAKINADA APSRTC BUS STATION", "09:00"],
    ],
  },
];

/* -------------------------------------------------------
   EXTRA STOP DATA
------------------------------------------------------- */

const INITIAL_STOP_DATA = APSRTC_STOPS.map((name, index) => ({
  id: index + 1,
  name,
  tickets:
    name === "KAKINADA APSRTC BUS STATION"
      ? 420
      : Math.floor(Math.random() * 250) + 50,
  issue: "",
}));

/* -------------------------------------------------------
   ALERTS
------------------------------------------------------- */

const INITIAL_ALERTS = [
  {
    id: 1,
    title: "Road condition information",
    description:
      "Demo alert: Admin can update this when a road or bus-stop issue is reported.",
    severity: "Medium",
    active: true,
  },
];

/* -------------------------------------------------------
   STORAGE
------------------------------------------------------- */

function loadData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);

    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

/* =======================================================
   APP
======================================================= */

export default function App() {
  /* -----------------------------------------------------
     AUTH
  ----------------------------------------------------- */

  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  /* -----------------------------------------------------
     DATA
  ----------------------------------------------------- */

  const [routes, setRoutes] = useState(() =>
    loadData("kakinada_routes", INITIAL_ROUTES)
  );

  const [stops, setStops] = useState(() =>
    loadData("kakinada_stops", INITIAL_STOP_DATA)
  );

  const [alerts, setAlerts] = useState(() =>
    loadData("kakinada_alerts", INITIAL_ALERTS)
  );

  /* -----------------------------------------------------
     PUBLIC SEARCH
  ----------------------------------------------------- */

  const [origin, setOrigin] = useState(
    "KAKINADA APSRTC BUS STATION"
  );

  const [destination, setDestination] = useState(
    "SARPAVARAM.JN-KKD"
  );

  const [searchDone, setSearchDone] = useState(false);

  const [selectedRoute, setSelectedRoute] = useState(null);

  /* -----------------------------------------------------
     ADMIN
  ----------------------------------------------------- */

  const [adminPage, setAdminPage] = useState("dashboard");

  const [editingRoute, setEditingRoute] = useState(null);

  const [newStop, setNewStop] = useState("");

  const [newAlert, setNewAlert] = useState({
    title: "",
    description: "",
    severity: "Medium",
  });

  /* -----------------------------------------------------
     SAVE TO LOCAL STORAGE
  ----------------------------------------------------- */

  useEffect(() => {
    localStorage.setItem(
      "kakinada_routes",
      JSON.stringify(routes)
    );
  }, [routes]);

  useEffect(() => {
    localStorage.setItem(
      "kakinada_stops",
      JSON.stringify(stops)
    );
  }, [stops]);

  useEffect(() => {
    localStorage.setItem(
      "kakinada_alerts",
      JSON.stringify(alerts)
    );
  }, [alerts]);

  /* -----------------------------------------------------
     PUBLIC SEARCH RESULT
  ----------------------------------------------------- */

  const searchResults = useMemo(() => {
    if (!searchDone) return [];

    return routes.filter((route) => {
      const originIndex = route.stops.indexOf(origin);
      const destinationIndex =
        route.stops.indexOf(destination);

      return (
        originIndex !== -1 &&
        destinationIndex !== -1 &&
        originIndex < destinationIndex
      );
    });
  }, [routes, origin, destination, searchDone]);

  /* -----------------------------------------------------
     DASHBOARD CALCULATIONS
  ----------------------------------------------------- */

  const totalPassengers = routes.reduce(
    (sum, route) => sum + Number(route.passengers || 0),
    0
  );

  const totalTickets = routes.reduce(
    (sum, route) => sum + Number(route.tickets || 0),
    0
  );

  const totalRevenue = routes.reduce(
    (sum, route) => sum + Number(route.revenue || 0),
    0
  );

  const totalBuses = routes.reduce(
    (sum, route) => sum + Number(route.buses || 0),
    0
  );

  const extraBusRoutes = routes.filter(
    (route) => getRouteCondition(route).needsExtraBus
  );

  /* =====================================================
     LOGIN
  ===================================================== */

  function login(e) {
    e.preventDefault();

    if (
      username.trim() === "admin" &&
      password === "admin123"
    ) {
      setIsAdmin(true);
      setShowLogin(false);

      setUsername("");
      setPassword("");
      setLoginError("");

      setAdminPage("dashboard");

      setTimeout(() => {
        document
          .getElementById("admin-portal")
          ?.scrollIntoView({
            behavior: "smooth",
          });
      }, 100);
    } else {
      setLoginError(
        "Invalid username or password."
      );
    }
  }

  function logout() {
    setIsAdmin(false);
    setAdminPage("dashboard");
  }

  /* =====================================================
     ROUTE CONDITION
  ===================================================== */

  function getRouteCondition(route) {
    const capacity =
      Number(route.buses || 0) *
      Number(route.capacityPerBus || 0);

    const passengers = Number(
      route.passengers || 0
    );

    const occupancy =
      capacity > 0
        ? passengers / capacity
        : 0;

    /*
      Demo decision rule:

      >= 90% capacity = RED
      >= 75% capacity = RED / review
      otherwise GREEN

      Admin can manually choose YES/NO.
    */

    let needsExtraBus = occupancy >= 0.9;

    if (route.extraBus === "yes") {
      needsExtraBus = true;
    }

    if (route.extraBus === "no") {
      needsExtraBus = false;
    }

    return {
      capacity,
      occupancy,
      percentage: Math.round(
        occupancy * 100
      ),
      needsExtraBus,
    };
  }

  /* =====================================================
     ADMIN ROUTE UPDATE
  ===================================================== */

  function updateRoute(id, field, value) {
    setRoutes((current) =>
      current.map((route) =>
        route.id === id
          ? {
              ...route,
              [field]:
                [
                  "buses",
                  "passengers",
                  "tickets",
                  "revenue",
                  "capacityPerBus",
                ].includes(field)
                  ? Number(value)
                  : value,
            }
          : route
      )
    );
  }

  /* =====================================================
     ADD STOP
  ===================================================== */

  function addStop(e) {
    e.preventDefault();

    if (!newStop.trim()) return;

    const exists = stops.some(
      (stop) =>
        stop.name.toLowerCase() ===
        newStop.trim().toLowerCase()
    );

    if (exists) {
      alert("This stop already exists.");
      return;
    }

    setStops((current) => [
      ...current,
      {
        id: Date.now(),
        name: newStop.trim(),
        tickets: 0,
        issue: "",
      },
    ]);

    setNewStop("");
  }

  /* =====================================================
     DELETE STOP
  ===================================================== */

  function deleteStop(id) {
    const stop = stops.find(
      (item) => item.id === id
    );

    if (!stop) return;

    setStops((current) =>
      current.filter(
        (item) => item.id !== id
      )
    );

    setRoutes((current) =>
      current.map((route) => ({
        ...route,
        stops: route.stops.filter(
          (name) => name !== stop.name
        ),
        stopTimes: route.stopTimes.filter(
          ([name]) => name !== stop.name
        ),
      }))
    );
  }

  /* =====================================================
     UPDATE STOP
  ===================================================== */

  function updateStop(id, field, value) {
    setStops((current) =>
      current.map((stop) =>
        stop.id === id
          ? {
              ...stop,
              [field]:
                field === "tickets"
                  ? Number(value)
                  : value,
            }
          : stop
      )
    );
  }

  /* =====================================================
     ADD ALERT
  ===================================================== */

  function addAlert(e) {
    e.preventDefault();

    if (!newAlert.title.trim()) return;

    setAlerts((current) => [
      {
        id: Date.now(),
        title: newAlert.title,
        description: newAlert.description,
        severity: newAlert.severity,
        active: true,
      },
      ...current,
    ]);

    setNewAlert({
      title: "",
      description: "",
      severity: "Medium",
    });
  }

  function toggleAlert(id) {
    setAlerts((current) =>
      current.map((alert) =>
        alert.id === id
          ? {
              ...alert,
              active: !alert.active,
            }
          : alert
      )
    );
  }

  function deleteAlert(id) {
    setAlerts((current) =>
      current.filter(
        (alert) => alert.id !== id
      )
    );
  }

  /* =====================================================
     RESET
  ===================================================== */

  function resetData() {
    if (
      !window.confirm(
        "Reset all demo data?"
      )
    ) {
      return;
    }

    setRoutes(INITIAL_ROUTES);
    setStops(INITIAL_STOP_DATA);
    setAlerts(INITIAL_ALERTS);
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="app">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="topbar">

        <div className="brand">
          <div className="brand-logo">
            🚌
          </div>

          <div>
            <h1>
              Bus Route Optimizer
            </h1>

            <span>
              Kakinada Smart Transport
            </span>
          </div>
        </div>

        <nav>

          <button
            className="nav-link"
            onClick={() =>
              document
                .getElementById("public-portal")
                ?.scrollIntoView({
                  behavior: "smooth",
                })
            }
          >
            Public Portal
          </button>

          {!isAdmin ? (
            <button
              className="admin-login-button"
              onClick={() => {
                setShowLogin(true);
                setLoginError("");
              }}
            >
              🔐 Admin Login
            </button>
          ) : (
            <>
              <button
                className="admin-login-button"
                onClick={() =>
                  document
                    .getElementById(
                      "admin-portal"
                    )
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
              >
                Admin Portal
              </button>

              <button
                className="logout-button"
                onClick={logout}
              >
                Logout
              </button>
            </>
          )}

        </nav>

      </header>

      {/* =================================================
          PUBLIC PORTAL
      ================================================= */}

      <main id="public-portal">

        <section className="hero">

          <div className="hero-text">

            <span className="eyebrow">
              KAKINADA PUBLIC TRANSPORT
            </span>

            <h2>
              Find your bus,
              <br />
              route and timing.
            </h2>

            <p>
              Select your origin and destination to
              see available APSRTC route information,
              bus timings, service count, occupancy
              and current status.
            </p>

            <div className="public-badge">
              ✓ No passenger login required
            </div>

          </div>

          <div className="hero-visual">
            <div className="hero-bus">
              🚌
            </div>

            <strong>
              {routes.length}
            </strong>

            <span>
              Services in project database
            </span>
          </div>

        </section>

        {/* ---------------------------------------------
             SEARCH
        --------------------------------------------- */}

        <section className="search-panel">

          <div className="panel-heading">

            <div>
              <span className="eyebrow">
                PASSENGER SEARCH
              </span>

              <h3>
                Where do you want to go?
              </h3>
            </div>

          </div>

          <div className="search-grid">

            <div className="field">

              <label>
                Origin
              </label>

              <select
                value={origin}
                onChange={(e) => {
                  setOrigin(e.target.value);
                  setSearchDone(false);
                }}
              >
                {stops.map((stop) => (
                  <option
                    key={stop.id}
                    value={stop.name}
                  >
                    {stop.name}
                  </option>
                ))}
              </select>

            </div>

            <div className="swap">
              ⇄
            </div>

            <div className="field">

              <label>
                Destination
              </label>

              <select
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  setSearchDone(false);
                }}
              >
                {stops.map((stop) => (
                  <option
                    key={stop.id}
                    value={stop.name}
                  >
                    {stop.name}
                  </option>
                ))}
              </select>

            </div>

            <button
              className="search-button"
              onClick={() => {
                if (origin === destination) {
                  alert(
                    "Origin and destination cannot be the same."
                  );
                  return;
                }

                setSearchDone(true);
              }}
            >
              🔎 Search Buses
            </button>

          </div>

        </section>

        {/* ---------------------------------------------
             SEARCH RESULTS
        --------------------------------------------- */}

        {searchDone && (
          <section className="results-section">

            <div className="section-title">

              <div>
                <span className="eyebrow">
                  SEARCH RESULTS
                </span>

                <h3>
                  {origin}
                  <span> → </span>
                  {destination}
                </h3>
              </div>

              <span className="result-count">
                {searchResults.length}
                {" "}
                service(s)
              </span>

            </div>

            {searchResults.length === 0 ? (

              <div className="empty-result">
                <div>
                  🚌
                </div>

                <h3>
                  No service found
                </h3>

                <p>
                  There is no route in the current
                  project data covering this exact
                  origin and destination.
                </p>
              </div>

            ) : (

              <div className="bus-results">

                {searchResults.map((route) => {

                  const condition =
                    getRouteCondition(route);

                  return (
                    <div
                      className="bus-result-card"
                      key={route.id}
                    >

                      <div className="bus-result-top">

                        <div className="bus-icon">
                          🚌
                        </div>

                        <div>
                          <h3>
                            {route.routeName}
                          </h3>

                          <span>
                            {route.serviceCode}
                            {" • "}
                            {route.busType}
                          </span>
                        </div>

                      </div>

                      <div className="bus-detail-grid">

                        <div>
                          <small>
                            Buses on route
                          </small>

                          <strong>
                            {route.buses}
                          </strong>
                        </div>

                        <div>
                          <small>
                            Departure
                          </small>

                          <strong>
                            {route.departure}
                          </strong>
                        </div>

                        <div>
                          <small>
                            Passenger status
                          </small>

                          <strong
                            className={
                              `status-${route.occupancy.toLowerCase()}`
                            }
                          >
                            {route.occupancy}
                          </strong>
                        </div>

                        <div>
                          <small>
                            Tracking
                          </small>

                          <strong>
                            {route.tracking}
                          </strong>
                        </div>

                      </div>

                      <div className="route-progress">

                        <span>
                          {origin}
                        </span>

                        <div className="line">
                          <div />
                        </div>

                        <span>
                          {destination}
                        </span>

                      </div>

                      <div className="result-actions">

                        <button
                          onClick={() =>
                            setSelectedRoute(
                              route
                            )
                          }
                        >
                          View Bus Details
                        </button>

                        <span
                          className={
                            condition.needsExtraBus
                              ? "route-warning"
                              : "route-good"
                          }
                        >
                          {condition.needsExtraBus
                            ? "High demand"
                            : "Service available"}
                        </span>

                      </div>

                    </div>
                  );
                })}

              </div>
            )}

          </section>
        )}

        {/* ---------------------------------------------
             SELECTED BUS DETAILS
        --------------------------------------------- */}

        {selectedRoute && (
          <section className="details-section">

            <div className="details-header">

              <div>
                <span className="eyebrow">
                  BUS DETAILS
                </span>

                <h3>
                  {selectedRoute.routeName}
                </h3>

                <p>
                  Service {selectedRoute.serviceCode}
                </p>
              </div>

              <button
                className="close-details"
                onClick={() =>
                  setSelectedRoute(null)
                }
              >
                ×
              </button>

            </div>

            <div className="detail-cards">

              <div>
                <span>
                  🚌
                </span>

                <small>
                  Number of buses
                </small>

                <strong>
                  {selectedRoute.buses}
                </strong>
              </div>

              <div>
                <span>
                  👥
                </span>

                <small>
                  Passengers
                </small>

                <strong>
                  {selectedRoute.passengers}
                </strong>
              </div>

              <div>
                <span>
                  🎟️
                </span>

                <small>
                  Tickets
                </small>

                <strong>
                  {selectedRoute.tickets}
                </strong>
              </div>

              <div>
                <span>
                  📍
                </span>

                <small>
                  Tracking
                </small>

                <strong>
                  {selectedRoute.tracking}
                </strong>
              </div>

            </div>

            <div className="capacity-display">

              <div className="capacity-heading">

                <strong>
                  Bus Capacity
                </strong>

                <span>
                  {selectedRoute.occupancy}
                </span>

              </div>

              <div className="capacity-bar">
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      getRouteCondition(
                        selectedRoute
                      ).percentage
                    )}%`,
                  }}
                />
              </div>

              <p>
                {getRouteCondition(
                  selectedRoute
                ).percentage}
                % estimated occupancy based on
                administrator-entered passenger data.
              </p>

            </div>

            <div className="stop-timeline">

              <h4>
                Stops and Timings
              </h4>

              {selectedRoute.stopTimes.map(
                ([stop, time], index) => (

                  <div
                    className="timeline-row"
                    key={stop}
                  >

                    <span>
                      {time}
                    </span>

                    <div className="timeline-dot">
                      {index + 1}
                    </div>

                    <strong>
                      {stop}
                    </strong>

                  </div>

                )
              )}

            </div>

          </section>
        )}

        {/* ---------------------------------------------
             PUBLIC ALERTS
        --------------------------------------------- */}

        <section className="public-alerts">

          <div className="section-title">

            <div>
              <span className="eyebrow">
                SERVICE ALERTS
              </span>

              <h3>
                Current transport information
              </h3>
            </div>

          </div>

          <div className="alert-grid">

            {alerts
              .filter((alert) => alert.active)
              .map((alert) => (

                <div
                  className={
                    `public-alert ${alert.severity.toLowerCase()}`
                  }
                  key={alert.id}
                >

                  <strong>
                    ⚠️ {alert.title}
                  </strong>

                  <p>
                    {alert.description}
                  </p>

                </div>

              ))}

          </div>

        </section>

      </main>

      {/* =================================================
          ADMIN LOGIN MODAL
      ================================================= */}

      {showLogin && (

        <div className="modal-background">

          <div className="login-modal">

            <button
              className="modal-close"
              onClick={() =>
                setShowLogin(false)
              }
            >
              ×
            </button>

            <div className="login-icon">
              🔐
            </div>

            <span className="eyebrow">
              AUTHORIZED STAFF
            </span>

            <h2>
              Admin Login
            </h2>

            <p>
              Only authorized transport administration
              should update route information.
            </p>

            <form onSubmit={login}>

              <label>
                Username
              </label>

              <input
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                  )
                }
                placeholder="admin"
              />

              <label>
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="admin123"
              />

              {loginError && (
                <div className="login-error">
                  {loginError}
                </div>
              )}

              <button
                className="login-submit"
                type="submit"
              >
                Login to Admin Portal
              </button>

            </form>

            <div className="demo-account">

              <strong>
                Demo account
              </strong>

              <span>
                Username: admin
              </span>

              <span>
                Password: admin123
              </span>

            </div>

          </div>

        </div>

      )}

      {/* =================================================
          ADMIN PORTAL
      ================================================= */}

      {isAdmin && (

        <section
          id="admin-portal"
          className="admin-portal"
        >

          <div className="admin-title">

            <div>
              <span className="eyebrow">
                CITY TRANSPORT CORPORATION
              </span>

              <h2>
                Transport Administration Portal
              </h2>

              <p>
                Enter operational data here. The
                information is then reflected on the
                public passenger portal.
              </p>
            </div>

            <button
              className="reset-button"
              onClick={resetData}
            >
              Reset Demo Data
            </button>

          </div>

          <div className="admin-layout">

            {/* SIDEBAR */}

            <aside className="admin-sidebar">

              <button
                className={
                  adminPage === "dashboard"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setAdminPage("dashboard")
                }
              >
                📊 Dashboard
              </button>

              <button
                className={
                  adminPage === "routes"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setAdminPage("routes")
                }
              >
                🛣️ Route Data
              </button>

              <button
                className={
                  adminPage === "stops"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setAdminPage("stops")
                }
              >
                📍 Bus Stops
              </button>

              <button
                className={
                  adminPage === "buses"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setAdminPage("buses")
                }
              >
                🚌 Bus Operations
              </button>

              <button
                className={
                  adminPage === "revenue"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setAdminPage("revenue")
                }
              >
                💰 Revenue
              </button>

              <button
                className={
                  adminPage === "alerts"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setAdminPage("alerts")
                }
              >
                ⚠️ Issues
              </button>

            </aside>

            {/* ADMIN CONTENT */}

            <div className="admin-content">

              {/* =========================================
                  DASHBOARD
              ========================================= */}

              {adminPage === "dashboard" && (

                <>
                  <div className="admin-stat-grid">

                    <div className="admin-stat">
                      <span>🚌</span>
                      <small>
                        Total Buses
                      </small>
                      <strong>
                        {totalBuses}
                      </strong>
                    </div>

                    <div className="admin-stat">
                      <span>👥</span>
                      <small>
                        Passengers
                      </small>
                      <strong>
                        {totalPassengers}
                      </strong>
                    </div>

                    <div className="admin-stat">
                      <span>🎟️</span>
                      <small>
                        Tickets
                      </small>
                      <strong>
                        {totalTickets}
                      </strong>
                    </div>

                    <div className="admin-stat">
                      <span>💰</span>
                      <small>
                        Revenue
                      </small>
                      <strong>
                        ₹
                        {totalRevenue.toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </div>

                  </div>

                  <div className="admin-card">

                    <div className="card-title">

                      <div>
                        <span className="eyebrow">
                          ROUTE CONDITION
                        </span>

                        <h3>
                          Which routes need attention?
                        </h3>
                      </div>

                    </div>

                    <div className="route-condition-list">

                      {routes.map((route) => {

                        const condition =
                          getRouteCondition(
                            route
                          );

                        return (

                          <div
                            className={
                              condition.needsExtraBus
                                ? "condition-row red"
                                : "condition-row green"
                            }
                            key={route.id}
                          >

                            <div className="condition-status">
                              <div>
                                {condition.needsExtraBus
                                  ? "🔴"
                                  : "🟢"}
                              </div>

                              <div>
                                <strong>
                                  {route.routeName}
                                </strong>

                                <span>
                                  {route.serviceCode}
                                  {" • "}
                                  {route.buses}
                                  {" buses • "}
                                  {route.passengers}
                                  {" passengers"}
                                </span>
                              </div>
                            </div>

                            <div className="condition-percent">
                              {condition.percentage}%
                              occupancy
                            </div>

                            <div>

                              {condition.needsExtraBus ? (
                                <span className="red-label">
                                  EXTRA BUS NEEDED
                                </span>
                              ) : (
                                <span className="green-label">
                                  CURRENT SERVICE OK
                                </span>
                              )}

                            </div>

                            <div className="decision-buttons">

                              <button
                                className={
                                  route.extraBus ===
                                  "yes"
                                    ? "selected-red"
                                    : ""
                                }
                                onClick={() =>
                                  updateRoute(
                                    route.id,
                                    "extraBus",
                                    "yes"
                                  )
                                }
                              >
                                Need Extra Bus
                              </button>

                              <button
                                className={
                                  route.extraBus ===
                                  "no"
                                    ? "selected-green"
                                    : ""
                                }
                                onClick={() =>
                                  updateRoute(
                                    route.id,
                                    "extraBus",
                                    "no"
                                  )
                                }
                              >
                                No Extra Bus
                              </button>

                              <button
                                onClick={() => {
                                  updateRoute(
                                    route.id,
                                    "extraBus",
                                    "auto"
                                  );
                                }}
                              >
                                Auto
                              </button>

                            </div>

                          </div>

                        );
                      })}

                    </div>

                  </div>

                  <div className="admin-card">

                    <h3>
                      High Revenue / High Demand
                      Routes
                    </h3>

                    <p className="muted">
                      These routes can be reviewed by
                      transport planners when considering
                      additional service.
                    </p>

                    <div className="revenue-highlight">

                      {[
                        ...routes,
                      ]
                        .sort(
                          (a, b) =>
                            b.revenue -
                            a.revenue
                        )
                        .map((route) => (

                          <div
                            className="revenue-row"
                            key={route.id}
                          >

                            <div>
                              <strong>
                                {route.routeName}
                              </strong>

                              <span>
                                {route.passengers}
                                {" passengers • "}
                                {route.tickets}
                                {" tickets"}
                              </span>
                            </div>

                            <strong>
                              ₹
                              {Number(
                                route.revenue
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </strong>

                          </div>

                        ))}

                    </div>

                  </div>
                </>

              )}

              {/* =========================================
                  ROUTE DATA
              ========================================= */}

              {adminPage === "routes" && (

                <div className="admin-card">

                  <div className="card-title">

                    <div>
                      <span className="eyebrow">
                        MANUAL DATA ENTRY
                      </span>

                      <h3>
                        Route Data
                      </h3>
                    </div>

                  </div>

                  <p className="muted">
                    Enter the number of buses, passenger
                    count, tickets and revenue collected
                    for each route.
                  </p>

                  <div className="route-admin-list">

                    {routes.map((route) => {

                      const condition =
                        getRouteCondition(
                          route
                        );

                      return (

                        <div
                          className="route-admin-card"
                          key={route.id}
                        >

                          <div className="route-admin-heading">

                            <div>
                              <h3>
                                {route.routeName}
                              </h3>

                              <span>
                                {route.serviceCode}
                                {" • "}
                                {route.busType}
                              </span>
                            </div>

                            <span
                              className={
                                condition.needsExtraBus
                                  ? "red-label"
                                  : "green-label"
                              }
                            >
                              {condition.needsExtraBus
                                ? "RED - EXTRA BUS"
                                : "GREEN - OK"}
                            </span>

                          </div>

                          <div className="input-grid">

                            <label>
                              Number of Buses

                              <input
                                type="number"
                                min="0"
                                value={
                                  route.buses
                                }
                                onChange={(e) =>
                                  updateRoute(
                                    route.id,
                                    "buses",
                                    e.target
                                      .value
                                  )
                                }
                              />
                            </label>

                            <label>
                              Passengers Travelled

                              <input
                                type="number"
                                min="0"
                                value={
                                  route.passengers
                                }
                                onChange={(e) =>
                                  updateRoute(
                                    route.id,
                                    "passengers",
                                    e.target
                                      .value
                                  )
                                }
                              />
                            </label>

                            <label>
                              Tickets Sold

                              <input
                                type="number"
                                min="0"
                                value={
                                  route.tickets
                                }
                                onChange={(e) =>
                                  updateRoute(
                                    route.id,
                                    "tickets",
                                    e.target
                                      .value
                                  )
                                }
                              />
                            </label>

                            <label>
                              Revenue Generated ₹

                              <input
                                type="number"
                                min="0"
                                value={
                                  route.revenue
                                }
                                onChange={(e) =>
                                  updateRoute(
                                    route.id,
                                    "revenue",
                                    e.target
                                      .value
                                  )
                                }
                              />
                            </label>

                            <label>
                              Capacity / Bus

                              <input
                                type="number"
                                min="1"
                                value={
                                  route.capacityPerBus
                                }
                                onChange={(e) =>
                                  updateRoute(
                                    route.id,
                                    "capacityPerBus",
                                    e.target
                                      .value
                                  )
                                }
                              />
                            </label>

                            <label>
                              Passenger Condition

                              <select
                                value={
                                  route.occupancy
                                }
                                onChange={(e) =>
                                  updateRoute(
                                    route.id,
                                    "occupancy",
                                    e.target
                                      .value
                                  )
                                }
                              >
                                <option>
                                  Empty
                                </option>

                                <option>
                                  Medium
                                </option>

                                <option>
                                  Full
                                </option>
                              </select>
                            </label>

                          </div>

                        </div>

                      );
                    })}

                  </div>

                </div>

              )}

              {/* =========================================
                  STOPS
              ========================================= */}

              {adminPage === "stops" && (

                <div className="admin-card">

                  <div className="card-title">

                    <div>
                      <span className="eyebrow">
                        STOP MANAGEMENT
                      </span>

                      <h3>
                        Bus Stops
                      </h3>
                    </div>

                  </div>

                  <form
                    className="add-stop-form"
                    onSubmit={addStop}
                  >

                    <input
                      value={newStop}
                      onChange={(e) =>
                        setNewStop(
                          e.target.value
                        )
                      }
                      placeholder="Enter new Kakinada bus stop"
                    />

                    <button type="submit">
                      + Add Stop
                    </button>

                  </form>

                  <div className="stop-admin-table">

                    {stops.map((stop) => (

                      <div
                        className="stop-admin-row"
                        key={stop.id}
                      >

                        <strong>
                          {stop.name}
                        </strong>

                        <label>
                          Tickets

                          <input
                            type="number"
                            min="0"
                            value={
                              stop.tickets
                            }
                            onChange={(e) =>
                              updateStop(
                                stop.id,
                                "tickets",
                                e.target.value
                              )
                            }
                          />
                        </label>

                        <label>
                          Issue

                          <input
                            value={
                              stop.issue
                            }
                            onChange={(e) =>
                              updateStop(
                                stop.id,
                                "issue",
                                e.target.value
                              )
                            }
                            placeholder="No issue"
                          />
                        </label>

                        <button
                          className="delete-button"
                          onClick={() =>
                            deleteStop(
                              stop.id
                            )
                          }
                        >
                          Delete
                        </button>

                      </div>

                    ))}

                  </div>

                </div>

              )}

              {/* =========================================
                  BUS OPERATIONS
              ========================================= */}

              {adminPage === "buses" && (

                <div className="admin-card">

                  <div className="card-title">

                    <div>
                      <span className="eyebrow">
                        LIVE-STYLE DEMO DATA
                      </span>

                      <h3>
                        Bus Operations
                      </h3>
                    </div>

                  </div>

                  <p className="muted">
                    In this college-project version, the
                    Admin manually enters the current bus
                    situation. A real deployment could
                    receive these values from GPS and
                    transport systems.
                  </p>

                  <div className="operation-list">

                    {routes.map((route) => (

                      <div
                        className="operation-row"
                        key={route.id}
                      >

                        <div>
                          <strong>
                            {route.routeName}
                          </strong>

                          <span>
                            {route.serviceCode}
                          </span>
                        </div>

                        <label>
                          Tracking

                          <input
                            value={
                              route.tracking
                            }
                            onChange={(e) =>
                              updateRoute(
                                route.id,
                                "tracking",
                                e.target.value
                              )
                            }
                          />
                        </label>

                        <label>
                          Status

                          <select
                            value={
                              route.status
                            }
                            onChange={(e) =>
                              updateRoute(
                                route.id,
                                "status",
                                e.target.value
                              )
                            }
                          >
                            <option>
                              Running
                            </option>

                            <option>
                              Delayed
                            </option>

                            <option>
                              Stopped
                            </option>

                            <option>
                              Maintenance
                            </option>
                          </select>
                        </label>

                        <label>
                          Passenger Condition

                          <select
                            value={
                              route.occupancy
                            }
                            onChange={(e) =>
                              updateRoute(
                                route.id,
                                "occupancy",
                                e.target.value
                              )
                            }
                          >
                            <option>
                              Empty
                            </option>

                            <option>
                              Medium
                            </option>

                            <option>
                              Full
                            </option>
                          </select>
                        </label>

                      </div>

                    ))}

                  </div>

                </div>

              )}

              {/* =========================================
                  REVENUE
              ========================================= */}

              {adminPage === "revenue" && (

                <div className="admin-card">

                  <div className="card-title">

                    <div>
                      <span className="eyebrow">
                        FINANCIAL ANALYSIS
                      </span>

                      <h3>
                        Route Revenue
                      </h3>
                    </div>

                  </div>

                  <div className="revenue-summary">

                    <div>
                      <small>
                        Total Revenue
                      </small>

                      <strong>
                        ₹
                        {totalRevenue.toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </div>

                    <div>
                      <small>
                        Total Passengers
                      </small>

                      <strong>
                        {totalPassengers}
                      </strong>
                    </div>

                    <div>
                      <small>
                        Total Tickets
                      </small>

                      <strong>
                        {totalTickets}
                      </strong>
                    </div>

                  </div>

                  <div className="revenue-table">

                    {routes
                      .slice()
                      .sort(
                        (a, b) =>
                          b.revenue -
                          a.revenue
                      )
                      .map((route) => {

                        const revenuePerPassenger =
                          route.passengers >
                          0
                            ? Math.round(
                                route.revenue /
                                  route.passengers
                              )
                            : 0;

                        return (

                          <div
                            className="revenue-row"
                            key={route.id}
                          >

                            <div>
                              <strong>
                                {route.routeName}
                              </strong>

                              <span>
                                {route.serviceCode}
                              </span>
                            </div>

                            <div>
                              <small>
                                Passengers
                              </small>

                              <strong>
                                {
                                  route.passengers
                                }
                              </strong>
                            </div>

                            <div>
                              <small>
                                Tickets
                              </small>

                              <strong>
                                {
                                  route.tickets
                                }
                              </strong>
                            </div>

                            <div>
                              <small>
                                Revenue
                              </small>

                              <strong>
                                ₹
                                {Number(
                                  route.revenue
                                ).toLocaleString(
                                  "en-IN"
                                )}
                              </strong>
                            </div>

                            <div>
                              <small>
                                Revenue / Passenger
                              </small>

                              <strong>
                                ₹
                                {
                                  revenuePerPassenger
                                }
                              </strong>
                            </div>

                          </div>

                        );
                      })}

                  </div>

                </div>

              )}

              {/* =========================================
                  ALERTS
              ========================================= */}

              {adminPage === "alerts" && (

                <div className="admin-card">

                  <div className="card-title">

                    <div>
                      <span className="eyebrow">
                        PUBLIC INFORMATION
                      </span>

                      <h3>
                        Bus / Stop Issues
                      </h3>
                    </div>

                  </div>

                  <form
                    className="alert-form"
                    onSubmit={addAlert}
                  >

                    <input
                      placeholder="Issue title"
                      value={
                        newAlert.title
                      }
                      onChange={(e) =>
                        setNewAlert({
                          ...newAlert,
                          title:
                            e.target.value,
                        })
                      }
                    />

                    <input
                      placeholder="Issue description"
                      value={
                        newAlert.description
                      }
                      onChange={(e) =>
                        setNewAlert({
                          ...newAlert,
                          description:
                            e.target.value,
                        })
                      }
                    />

                    <select
                      value={
                        newAlert.severity
                      }
                      onChange={(e) =>
                        setNewAlert({
                          ...newAlert,
                          severity:
                            e.target.value,
                        })
                      }
                    >
                      <option>
                        Low
                      </option>

                      <option>
                        Medium
                      </option>

                      <option>
                        High
                      </option>
                    </select>

                    <button type="submit">
                      + Publish Alert
                    </button>

                  </form>

                  <div className="alert-admin-list">

                    {alerts.map((alert) => (

                      <div
                        className="admin-alert-row"
                        key={alert.id}
                      >

                        <div>
                          <strong>
                            {alert.title}
                          </strong>

                          <p>
                            {
                              alert.description
                            }
                          </p>

                          <span>
                            {
                              alert.severity
                            }
                            {" • "}
                            {alert.active
                              ? "Visible to public"
                              : "Hidden"}
                          </span>
                        </div>

                        <div>

                          <button
                            onClick={() =>
                              toggleAlert(
                                alert.id
                              )
                            }
                          >
                            {alert.active
                              ? "Hide"
                              : "Show"}
                          </button>

                          <button
                            className="delete-button"
                            onClick={() =>
                              deleteAlert(
                                alert.id
                              )
                            }
                          >
                            Delete
                          </button>

                        </div>

                      </div>

                    ))}

                  </div>

                </div>

              )}

            </div>

          </div>

        </section>
      )}

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer>

        <div>
          <strong>
            🚌 Bus Route Optimizer
          </strong>

          <span>
            Kakinada Smart Transport Project
          </span>
        </div>

        <div>
          Public information • Admin management
        </div>

      </footer>

    </div>
  );
}