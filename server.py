"""
APSRTC Kakinada City Transit & Route Optimizer
Unified REST API & HTTP Web Server
Provides secure authentication, CRUD, ADSA BFS Routing, Regression Optimizer, and Static File Serving.
"""

import http.server
import socketserver
import json
import urllib.parse
import os
import sys
import csv
import io
from db import DatabaseManager

PORT = int(os.environ.get("PORT", 8000))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
db_manager = DatabaseManager()

class TransitRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs, directory=DIRECTORY)

    def send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(body)

    def send_csv(self, filename: str, content: str):
        body = content.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/csv; charset=utf-8")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def get_auth_user(self):
        auth_header = self.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            return db_manager.verify_token(token)
        return None

    def read_json_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 0:
            raw_body = self.rfile.read(content_length).decode("utf-8")
            try:
                return json.loads(raw_body)
            except Exception:
                return {}
        return {}

    # --- GET Handlers ---
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Fallback alias for app.js -> script.js
        if path == "/app.js":
            self.path = "/script.js"
            return super().do_GET()

        # Check API routes
        if path.startswith("/api/"):
            try:
                self.handle_api_get(path, query)
            except Exception as e:
                self.send_json({"error": str(e)}, status=500)
            return

        # Serve static assets
        return super().do_GET()

    def handle_api_get(self, path: str, query: dict):
        user = self.get_auth_user()

        if path == "/api/auth/verify":
            if user:
                self.send_json({"authenticated": True, "user": user})
            else:
                self.send_json({"authenticated": False}, status=401)
            return

        elif path == "/api/overview":
            data = db_manager.get_dashboard_overview()
            self.send_json(data)
            return

        elif path == "/api/stops":
            stops = db_manager.get_all_stops()
            self.send_json(stops)
            return

        elif path == "/api/routes":
            routes = db_manager.get_all_routes()
            self.send_json(routes)
            return

        elif path == "/api/timings":
            r_id = int(query["route_id"][0]) if "route_id" in query else None
            timings = db_manager.get_timetables(r_id)
            self.send_json(timings)
            return

        elif path == "/api/buses":
            buses = db_manager.get_all_buses()
            self.send_json(buses)
            return

        elif path == "/api/tickets":
            if not user:
                self.send_json({"error": "Admin authentication required."}, status=401)
                return
            r_id = int(query["route_id"][0]) if "route_id" in query else None
            s_id = int(query["stop_id"][0]) if "stop_id" in query else None
            date_str = query["date"][0] if "date" in query else None
            tickets = db_manager.get_tickets(r_id, s_id, date_str)
            self.send_json(tickets)
            return

        elif path == "/api/occupancy":
            r_id = int(query["route_id"][0]) if "route_id" in query else None
            records = db_manager.get_occupancy(r_id)
            self.send_json(records)
            return

        elif path == "/api/alerts":
            # If not admin, only show published alerts
            only_published = False if user else True
            alerts = db_manager.get_service_alerts(only_published=only_published)
            self.send_json(alerts)
            return

        elif path == "/api/algorithms/bfs":
            start_stop = query.get("start", [""])[0]
            target_stop = query.get("target", [""])[0]
            if not start_stop or not target_stop:
                self.send_json({"error": "Parameters 'start' and 'target' are required."}, status=400)
                return
            result = db_manager.compute_bfs_path(start_stop, target_stop)
            self.send_json(result)
            return

        elif path == "/api/audit-logs":
            if not user:
                self.send_json({"error": "Admin authentication required."}, status=401)
                return
            logs = db_manager.get_audit_logs()
            self.send_json(logs)
            return

        elif path == "/api/data/export-csv":
            if not user:
                self.send_json({"error": "Admin authentication required."}, status=401)
                return
            export_type = query.get("type", ["routes"])[0]
            output = io.StringIO()
            writer = csv.writer(output)

            if export_type == "routes":
                routes = db_manager.get_all_routes()
                writer.writerow(["Route Number", "Route Name", "Origin", "Destination", "Frequency", "Verification Status", "Stops"])
                for r in routes:
                    stops_str = " -> ".join([s["name"] for s in r.get("stops", [])])
                    writer.writerow([r["route_number"], r["route_name"], r["origin_name"], r["dest_name"], r["frequency_desc"], r["verification_status"], stops_str])
                self.send_csv("apsrtc_kakinada_routes.csv", output.getvalue())
            elif export_type == "tickets":
                tickets = db_manager.get_tickets()
                writer.writerow(["Ticket ID", "Route", "Bus", "Trip", "Boarding Stop", "Destination Stop", "Ticket Count", "Fare", "Date", "Source"])
                for t in tickets:
                    writer.writerow([t["id"], t["route_number"], t.get("bus_number", "N/A"), t["trip_id"], t["boarding_stop_name"], t.get("dest_stop_name", "N/A"), t["ticket_count"], t["fare_collected"], t["sale_date"], t["data_source"]])
                self.send_csv("apsrtc_kakinada_tickets.csv", output.getvalue())
            else:
                self.send_json({"error": "Unsupported export type."}, status=400)
            return

        elif path == "/api/feedback":
            status = query.get("status", [None])[0]
            r_id = int(query["route_id"][0]) if "route_id" in query else None
            items = db_manager.get_all_feedback(status, r_id)
            self.send_json(items)
            return

        elif path == "/api/route-conditions":
            conditions = db_manager.get_route_conditions()
            self.send_json(conditions)
            return

        else:
            self.send_json({"error": "API route not found"}, status=404)

    # --- POST Handlers ---
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.read_json_body()

        if not path.startswith("/api/"):
            self.send_json({"error": "Endpoint not found"}, status=404)
            return

        try:
            self.handle_api_post(path, body)
        except Exception as e:
            self.send_json({"error": str(e)}, status=500)

    def handle_api_post(self, path: str, body: dict):
        user = self.get_auth_user()

        if path == "/api/auth/login":
            username = body.get("username", "").strip()
            password = body.get("password", "").strip()
            if not username or not password:
                self.send_json({"error": "Please provide both username/email and password."}, status=400)
                return

            auth_result = db_manager.authenticate_user(username, password)
            if auth_result:
                self.send_json({"success": True, "token": auth_result["token"], "user": auth_result["user"]})
            else:
                self.send_json({"success": False, "error": "Invalid credentials. Please verify your username and password."}, status=401)
            return

        elif path == "/api/auth/logout":
            token = self.headers.get("Authorization", "")[7:].strip() if self.headers.get("Authorization", "").startswith("Bearer ") else ""
            if token:
                db_manager.logout_token(token)
            self.send_json({"success": True, "message": "Logged out successfully."})
            return

        elif path == "/api/feedback":
            p_name = body.get("passenger_name", "").strip()
            contact = body.get("contact_info", "").strip()
            r_id = body.get("route_id")
            bus_num = body.get("bus_number", "").strip()
            s_id = body.get("stop_id")
            f_type = body.get("feedback_type", "Other").strip()
            rating = int(body.get("rating", 5))
            remark = (body.get("remark") or body.get("message") or "").strip()

            if not remark:
                self.send_json({"error": "Please provide your remark or feedback text."}, status=400)
                return

            new_id = db_manager.add_feedback(p_name, r_id, s_id, f_type, rating, remark, contact, bus_num)
            if user:
                db_manager.log_action(user["id"], user["username"], "LOG_FEEDBACK", f"Logged passenger remark #{new_id}")
            self.send_json({
                "success": True, 
                "id": new_id, 
                "message": "Thank you! Your feedback has been submitted successfully."
            })
            return

        # Protected Admin Endpoints Below
        if path in ["/api/stops", "/api/routes", "/api/timings", "/api/buses", "/api/buses/unassign", "/api/buses/assign", "/api/alerts", "/api/data/import-csv"] and not user:
            self.send_json({"error": "Unauthorized. Please log in as an administrator."}, status=401)
            return

        if path == "/api/stops":
            code = body.get("code", "").strip()
            name = body.get("name", "").strip()
            desc = body.get("location_desc", "").strip()
            lat = float(body.get("latitude", 16.9400))
            lon = float(body.get("longitude", 82.2400))
            status = body.get("operational_status", "Normal")
            if not code or not name:
                self.send_json({"error": "Stop code and name are required."}, status=400)
                return
            new_id = db_manager.add_stop(code, name, desc, lat, lon, status)
            db_manager.log_action(user["id"], user["username"], "ADD_STOP", f"Created stop {name} ({code})")
            self.send_json({"success": True, "id": new_id, "message": "Stop created successfully."})
            return

        elif path == "/api/routes":
            num = body.get("route_number", "").strip()
            name = body.get("route_name", "").strip()
            orig = int(body.get("origin_stop_id", 0))
            dest = int(body.get("dest_stop_id", 0))
            # Support both legacy stops_ids (list of ints) and new stops (list of objects)
            stops_raw = body.get("stops", body.get("stops_ids", []))
            if stops_raw and isinstance(stops_raw[0], dict):
                stops = [s["stop_id"] for s in stops_raw if s.get("stop_id")]
            else:
                stops = [int(s) for s in stops_raw if s]
            direction = body.get("direction", "Both Directions")
            days = body.get("operating_days", "All Days (Mon-Sun)")
            freq = body.get("frequency_desc", "Every 15 mins")
            desc = body.get("description", "").strip()
            dist = float(body.get("distance_km", 10.0))
            time_m = int(body.get("travel_time_mins", 30))
            status = body.get("status", "Active")
            start_t = body.get("start_time", "06:00 AM").strip()
            end_t = body.get("end_time", "09:30 PM").strip()
            buses_req = int(body.get("required_buses", 2))

            if not num:
                self.send_json({"error": "Please enter Route ID."}, status=400)
                return
            if not name:
                self.send_json({"error": "Please enter Route Name."}, status=400)
                return
            if not orig or not dest:
                self.send_json({"error": "Origin and Destination stops are required."}, status=400)
                return
            if orig == dest:
                self.send_json({"error": "Origin and Destination cannot be the same stop."}, status=400)
                return

            # Build full sequential stop list: origin + intermediates + dest
            if not stops:
                stops = [orig, dest]
            elif orig not in stops:
                stops = [orig] + stops
            if dest not in stops:
                stops = stops + [dest]

            try:
                new_id = db_manager.add_route(num, name, orig, dest, stops, direction, days, freq, desc, dist, time_m, status, start_t, end_t, buses_req)
                db_manager.log_action(user["id"], user["username"], "ADD_ROUTE", f"Created route {num} - {name}")
                self.send_json({"success": True, "id": new_id, "message": "Route created successfully."})
            except ValueError as ve:
                self.send_json({"error": str(ve)}, status=409 if "already exists" in str(ve).lower() or "UNIQUE" in str(ve) else 400)
            return

        elif path == "/api/timings":
            r_id = int(body.get("route_id", 0))
            b_id = int(body.get("bus_id", 0)) if body.get("bus_id") else None
            trip = body.get("trip_identifier", "").strip()
            dep = body.get("departure_time", "").strip()
            arr = body.get("arrival_time", "").strip()
            days = body.get("operating_days", "Daily")
            eff = body.get("effective_date", "Active 2026")

            if not r_id or not trip or not dep or not arr:
                self.send_json({"error": "Route ID, Trip code, Departure and Arrival times are required."}, status=400)
                return

            new_id = db_manager.add_timetable(r_id, b_id, trip, dep, arr, days, eff)
            db_manager.log_action(user["id"], user["username"], "ADD_TIMETABLE", f"Scheduled trip {trip} for route {r_id}")
            self.send_json({"success": True, "id": new_id, "message": "Timetable schedule added."})
            return

        elif path == "/api/buses":
            num = body.get("bus_number", "").strip()
            btype = body.get("bus_type", "City Ordinary")
            cap = int(body.get("capacity", 50))
            r_id = int(body.get("current_route_id", 0)) if body.get("current_route_id") else None
            occ = int(body.get("occupancy", body.get("current_occupancy", 0)))
            driver = body.get("driver_name", "").strip()
            conductor = body.get("conductor_name", "").strip()
            status = body.get("status", body.get("bus_status", "Active")).strip()
            dep = body.get("departure_time", "").strip()
            arr = body.get("arrival_time", "").strip()
            notes = body.get("operational_notes", "").strip()

            if not num:
                self.send_json({"error": "Bus registration number is required."}, status=400)
                return

            try:
                new_id = db_manager.add_bus(num, btype, cap, r_id, occ, driver, conductor, status, dep, arr, notes)
                db_manager.log_action(user["id"], user["username"], "ADD_BUS", f"Added bus {num} ({btype})")
                self.send_json({"success": True, "id": new_id, "message": "Bus added to route and fleet successfully."})
            except ValueError as ve:
                self.send_json({"error": str(ve)}, status=400)
            return

        elif path == "/api/buses/unassign":
            bus_id = int(body.get("bus_id") or 0)
            if not bus_id:
                self.send_json({"error": "Bus ID is required."}, status=400)
                return
            db_manager.remove_bus_from_route(bus_id)
            db_manager.log_action(user["id"], user["username"], "UNASSIGN_BUS", f"Unassigned bus ID {bus_id} from route")
            self.send_json({"success": True, "message": "Bus unassigned from route successfully."})
            return

        elif path == "/api/buses/assign":
            bus_id = int(body.get("bus_id") or 0)
            route_id = int(body.get("route_id") or 0)
            if not bus_id or not route_id:
                self.send_json({"error": "bus_id and route_id are required."}, status=400)
                return
            db_manager.assign_bus_to_route(bus_id, route_id)
            db_manager.log_action(user["id"], user["username"], "ASSIGN_BUS", f"Assigned bus ID {bus_id} to route {route_id}")
            self.send_json({"success": True, "message": "Bus assigned to route successfully."})
            return

        elif path == "/api/tickets":
            r_id = int(body.get("route_id", 0))
            b_id = int(body.get("bus_id", 0)) if body.get("bus_id") else None
            trip = body.get("trip_id", "TRIP-REG").strip()
            b_stop = int(body.get("boarding_stop_id", 0))
            d_stop = int(body.get("dest_stop_id", 0)) if body.get("dest_stop_id") else None
            count = int(body.get("ticket_count", 1))
            fare = float(body.get("fare_collected", 15.0))
            source = body.get("data_source", "Admin Direct Entry")

            if not r_id or not b_stop or count <= 0:
                self.send_json({"error": "Route ID, Boarding Stop, and valid Ticket Count are required."}, status=400)
                return

            t_id = db_manager.record_ticket(r_id, b_id, trip, b_stop, d_stop, count, fare, source)
            self.send_json({"success": True, "id": t_id, "message": f"{count} tickets logged successfully."})
            return

        elif path == "/api/alerts":
            title = body.get("title", "").strip()
            atype = body.get("alert_type", "Advisory")
            sev = body.get("severity", "Moderate")
            desc = body.get("description", "").strip()
            r_ids = body.get("affected_route_ids", "All")
            s_ids = body.get("affected_stop_ids", "All")
            sdate = body.get("start_date", "").strip()
            edate = body.get("end_date", "").strip()
            pub = int(body.get("is_published", 1))

            if not title or not desc or not sdate:
                self.send_json({"error": "Title, Description, and Start Date are required."}, status=400)
                return

            new_id = db_manager.create_alert(title, atype, sev, desc, r_ids, s_ids, sdate, edate, pub)
            db_manager.log_action(user["id"], user["username"], "CREATE_ALERT", f"Issued alert: {title}")
            self.send_json({"success": True, "id": new_id, "message": "Service alert created."})
            return

        elif path == "/api/optimize/frequency":
            r_id = int(body.get("route_id", 1))
            boardings = float(body.get("avg_boardings", 3500))
            congestion = float(body.get("peak_congestion", 1.6))
            cap = int(body.get("bus_capacity", 50))
            fleet = int(body.get("available_fleet", 6))
            result = db_manager.optimize_frequency(r_id, boardings, congestion, cap, fleet)
            self.send_json(result)
            return

        elif path == "/api/data/import-csv":
            raw_csv = body.get("csv_content", "").strip()
            import_type = body.get("type", "routes")
            if not raw_csv:
                self.send_json({"error": "CSV content is empty."}, status=400)
                return

            reader = csv.reader(io.StringIO(raw_csv))
            rows = list(reader)
            if not rows or len(rows) < 2:
                self.send_json({"error": "Invalid CSV. Must contain headers and data rows."}, status=400)
                return

            headers = [h.strip().lower() for h in rows[0]]
            imported_count = 0

            # Import Stops or Routes
            if import_type == "stops":
                for r in rows[1:]:
                    if len(r) >= 2 and r[0].strip() and r[1].strip():
                        code, name = r[0].strip(), r[1].strip()
                        desc = r[2].strip() if len(r) > 2 else ""
                        lat = float(r[3]) if len(r) > 3 and r[3] else 16.9400
                        lon = float(r[4]) if len(r) > 4 and r[4] else 82.2400
                        db_manager.add_stop(code, name, desc, lat, lon)
                        imported_count += 1
            else:
                self.send_json({"error": "Unsupported CSV import type."}, status=400)
                return

            db_manager.log_action(user["id"], user["username"], "CSV_IMPORT", f"Imported {imported_count} records via CSV")
            self.send_json({"success": True, "count": imported_count, "message": f"Successfully imported {imported_count} records."})
            return

        else:
            self.send_json({"error": "Endpoint not recognized"}, status=404)

    # --- PUT Handlers ---
    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.read_json_body()
        user = self.get_auth_user()

        if not user:
            self.send_json({"error": "Administrator authentication required."}, status=401)
            return

        try:
            if path == "/api/stops":
                s_id = int(body.get("id", 0))
                name = body.get("name", "").strip()
                desc = body.get("location_desc", "").strip()
                lat = float(body.get("latitude", 16.9400))
                lon = float(body.get("longitude", 82.2400))
                active = int(body.get("is_active", 1))
                status = body.get("operational_status", "Normal")
                db_manager.update_stop(s_id, name, desc, lat, lon, active, status)
                db_manager.log_action(user["id"], user["username"], "UPDATE_STOP", f"Updated stop ID {s_id}")
                self.send_json({"success": True, "message": "Stop updated."})

            elif path == "/api/routes":
                r_id = int(body.get("id", 0))
                num = body.get("route_number", "").strip()
                name = body.get("route_name", "").strip()
                orig = int(body.get("origin_stop_id", 0))
                dest = int(body.get("dest_stop_id", 0))
                stops = body.get("stops_ids", [])
                direction = body.get("direction", "Both Directions")
                days = body.get("operating_days", "Daily")
                freq = body.get("frequency_desc", "Every 15 mins")
                active = int(body.get("is_active", 1))
                desc = body.get("description", "").strip()
                dist = float(body.get("distance_km", 0.0))
                time_m = int(body.get("travel_time_mins", 0))
                status = body.get("status", "Active")
                start_t = body.get("start_time", "06:00").strip()
                end_t = body.get("end_time", "21:30").strip()
                buses_req = int(body.get("required_buses", 3))

                if not num:
                    self.send_json({"error": "Please enter Route ID."}, status=400)
                    return
                if not name:
                    self.send_json({"error": "Please enter Route Name."}, status=400)
                    return
                if not orig or not dest:
                    self.send_json({"error": "Origin and Destination stops are required."}, status=400)
                    return
                if orig == dest:
                    self.send_json({"error": "Origin and Destination cannot be the same stop."}, status=400)
                    return
                if not stops or len(stops) == 0:
                    self.send_json({"error": "Please add at least one bus stop."}, status=400)
                    return

                try:
                    db_manager.update_route(r_id, num, name, orig, dest, stops, direction, days, freq, active, desc, dist, time_m, status, start_t, end_t, buses_req)
                    db_manager.log_action(user["id"], user["username"], "UPDATE_ROUTE", f"Updated route {num}")
                    self.send_json({"success": True, "message": "Route updated successfully."})
                except ValueError as ve:
                    self.send_json({"error": str(ve)}, status=400)
                return

            elif path == "/api/buses":
                b_id = int(body.get("id", 0))
                num = body.get("bus_number", "").strip()
                btype = body.get("bus_type", "City Ordinary")
                cap = int(body.get("capacity", 50))
                active = int(body.get("is_active", 1))
                r_id = int(body.get("current_route_id", 0)) if body.get("current_route_id") else None
                occ = int(body.get("occupancy", body.get("current_occupancy", 0)))
                driver = body.get("driver_name", "").strip()
                conductor = body.get("conductor_name", "").strip()
                status = body.get("status", body.get("bus_status", "Active")).strip()
                dep = body.get("departure_time", "").strip()
                arr = body.get("arrival_time", "").strip()
                notes = body.get("operational_notes", "")

                try:
                    db_manager.update_bus(b_id, num, btype, cap, active, r_id, occ, driver, conductor, status, dep, arr, notes)
                    db_manager.log_action(user["id"], user["username"], "UPDATE_BUS", f"Updated bus {num}")
                    self.send_json({"success": True, "message": "Bus updated successfully."})
                except ValueError as ve:
                    self.send_json({"error": str(ve)}, status=400)
                return

            elif path == "/api/occupancy":
                rec_id = int(body.get("id", 0))
                status = body.get("occupancy_status", "MEDIUM")
                label = body.get("status_label", "Updated by Admin")
                db_manager.update_occupancy_override(rec_id, status, label)
                db_manager.log_action(user["id"], user["username"], "OVERRIDE_OCCUPANCY", f"Overrode record {rec_id} to {status}")
                self.send_json({"success": True, "message": "Occupancy status updated."})

            elif path == "/api/alerts":
                a_id = int(body.get("id", 0))
                title = body.get("title", "").strip()
                atype = body.get("alert_type", "Advisory")
                sev = body.get("severity", "Moderate")
                desc = body.get("description", "").strip()
                r_ids = body.get("affected_route_ids", "All")
                s_ids = body.get("affected_stop_ids", "All")
                sdate = body.get("start_date", "").strip()
                edate = body.get("end_date", "").strip()
                pub = int(body.get("is_published", 1))

                db_manager.update_alert(a_id, title, atype, sev, desc, r_ids, s_ids, sdate, edate, pub)
                db_manager.log_action(user["id"], user["username"], "UPDATE_ALERT", f"Updated alert {a_id}")
                self.send_json({"success": True, "message": "Service alert updated."})

            elif path == "/api/feedback":
                f_id = int(body.get("id", 0))
                status = body.get("status", "Reviewed").strip()
                db_manager.update_feedback_status(f_id, status)
                db_manager.log_action(user["id"], user["username"], "UPDATE_FEEDBACK", f"Updated feedback #{f_id} status to {status}")
                self.send_json({"success": True, "message": "Feedback status updated."})

            else:
                self.send_json({"error": "Unknown PUT endpoint"}, status=404)
        except Exception as e:
            self.send_json({"error": str(e)}, status=500)

    # --- DELETE Handlers ---
    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)
        user = self.get_auth_user()

        if not user:
            self.send_json({"error": "Administrator authentication required."}, status=401)
            return

        try:
            item_id = int(query.get("id", [0])[0])
            if not item_id and len(path.strip("/").split("/")) > 2:
                try:
                    parts = path.strip("/").split("/")
                    item_id = int(parts[-1])
                    path = "/" + "/".join(parts[:-1])
                except (ValueError, IndexError):
                    pass

            if not item_id:
                self.send_json({"error": "Parameter 'id' is required."}, status=400)
                return

            if path == "/api/stops":
                db_manager.delete_stop(item_id)
                db_manager.log_action(user["id"], user["username"], "DELETE_STOP", f"Deleted stop ID {item_id}")
                self.send_json({"success": True, "message": "Stop deleted."})

            elif path == "/api/routes":
                db_manager.delete_route(item_id)
                db_manager.log_action(user["id"], user["username"], "DELETE_ROUTE", f"Deleted route ID {item_id}")
                self.send_json({"success": True, "message": "Route deleted."})

            elif path == "/api/timings":
                db_manager.delete_timetable(item_id)
                db_manager.log_action(user["id"], user["username"], "DELETE_TIMETABLE", f"Deleted timetable ID {item_id}")
                self.send_json({"success": True, "message": "Timetable deleted."})

            elif path == "/api/buses":
                db_manager.delete_bus(item_id)
                db_manager.log_action(user["id"], user["username"], "DELETE_BUS", f"Deleted bus ID {item_id}")
                self.send_json({"success": True, "message": "Bus removed successfully."})

            elif path == "/api/buses/unassign":
                db_manager.remove_bus_from_route(item_id)
                db_manager.log_action(user["id"], user["username"], "UNASSIGN_BUS", f"Unassigned bus ID {item_id} from route")
                self.send_json({"success": True, "message": "Bus removed from route successfully."})

            elif path == "/api/alerts":
                db_manager.delete_alert(item_id)
                db_manager.log_action(user["id"], user["username"], "DELETE_ALERT", f"Deleted alert ID {item_id}")
                self.send_json({"success": True, "message": "Alert deleted."})

            elif path == "/api/feedback":
                db_manager.delete_feedback(item_id)
                db_manager.log_action(user["id"], user["username"], "DELETE_FEEDBACK", f"Deleted feedback ID {item_id}")
                self.send_json({"success": True, "message": "Feedback deleted."})

            else:
                self.send_json({"error": "Unknown DELETE endpoint"}, status=404)
        except Exception as e:
            self.send_json({"error": str(e)}, status=500)


if __name__ == "__main__":
    if sys.platform.startswith("win"):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), TransitRequestHandler) as httpd:
        print("============================================================")
        print("[*] APSRTC Kakinada Transit & Route Optimizer API Server Running!")
        print(f"[*] Access Web Portal & APIs at: http://localhost:{PORT}")
        print("============================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")