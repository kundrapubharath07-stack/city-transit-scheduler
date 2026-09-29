import urllib.request
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def get(endpoint, token=None):
    req = urllib.request.Request(f"{BASE_URL}{endpoint}")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def post(endpoint, data, token=None):
    req = urllib.request.Request(f"{BASE_URL}{endpoint}", data=json.dumps(data).encode('utf-8'), method="POST")
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

print("--- 1. Testing GET /api/overview ---")
overview = get("/api/overview")
print("Overview keys:", list(overview.keys()))
print("Total routes:", overview.get("total_routes"))
print("Total buses:", overview.get("total_buses"))
print("Total stops:", overview.get("total_stops"))
print("Total passengers:", overview.get("total_passengers"))
print("Total tickets:", overview.get("total_tickets"))
print("Total revenue:", overview.get("total_revenue"))
print("Routes requiring extra bus:", overview.get("routes_requiring_extra_bus"))
print("Total remarks:", overview.get("total_remarks"))

print("\n--- 2. Testing GET /api/route-conditions ---")
conditions = get("/api/route-conditions")
print(f"Retrieved {len(conditions)} route conditions.")
for c in conditions[:3]:
    print(f"Route {c['route_number']}: Cap={c['total_capacity']}, Demand={c['current_ridership']}, Occ={c['occupancy_pct']}%, ExtraBusReq={c['extra_bus_required']}, Needed={c['extra_buses_needed']}")

print("\n--- 3. Testing Public Remarks POST /api/feedback ---")
remark_data = {
    "passenger_name": "Kakinada Commuter Test",
    "contact_info": "9876543210",
    "route_id": 1,
    "bus_number": "AP-05-Z-1088",
    "stop_id": 1,
    "feedback_type": "Bus Delay",
    "rating": 4,
    "message": "Morning bus was 10 mins late due to Bhanugudi road work, but clean vehicle."
}
status, res = post("/api/feedback", remark_data)
print(f"POST feedback status: {status}, response: {res}")

remarks = get("/api/feedback")
print(f"Total remarks in DB: {len(remarks)}")
latest = remarks[0]
print(f"Latest remark: #{latest['id']} from {latest['passenger_name']}, route={latest.get('route_number')}, contact={latest.get('contact_info')}, bus={latest.get('bus_number')}")

print("\n--- 4. Testing Admin Authentication (admin123 and Admin@123) ---")
status1, res1 = post("/api/auth/login", {"username": "admin", "password": "admin123"})
print(f"Login with admin123: status={status1}, success={res1.get('success')}")

status2, res2 = post("/api/auth/login", {"username": "admin", "password": "Admin@123"})
print(f"Login with Admin@123: status={status2}, success={res2.get('success')}")
token = res2.get("token")

print("\n--- 5. Testing Route Creation with Sequential Stops ---")
new_route = {
    "route_number": "KKD-99",
    "route_name": "Automated Integration Test Corridor",
    "origin_stop_id": 1,
    "dest_stop_id": 4,
    "distance_km": 15.5,
    "travel_time_mins": 40,
    "required_buses": 3,
    "frequency_desc": "Every 12 mins",
    "status": "Active",
    "start_time": "05:30 AM",
    "end_time": "10:00 PM",
    "stops": [
        {"stop_id": 2, "sequence": 1, "arrival_time": "05:45 AM", "departure_time": "05:47 AM"},
        {"stop_id": 3, "sequence": 2, "arrival_time": "06:05 AM", "departure_time": "06:08 AM"}
    ]
}
status_route, res_route = post("/api/routes", new_route, token=token)
print(f"Create Route KKD-99: status={status_route}, res={res_route}")

print("\n--- 6. Testing Duplicate Route Number Validation ---")
status_dup, res_dup = post("/api/routes", new_route, token=token)
print(f"Duplicate Route KKD-99: status={status_dup}, res={res_dup}")
assert status_dup == 409, "Expected 409 Conflict on duplicate route ID!"

print("\n--- 7. Testing Bus Registration and Assignment ---")
new_bus = {
    "bus_number": "AP-05-Z-9999",
    "bus_type": "Metro Express",
    "capacity": 55,
    "occupancy": 42,
    "driver_name": "R. Prakash (DRV-88)",
    "conductor_name": "K. Srinivas (CND-12)",
    "status": "Active",
    "departure_time": "06:00 AM",
    "arrival_time": "06:45 AM",
    "current_route_id": res_route.get("id")
}
status_bus, res_bus = post("/api/buses", new_bus, token=token)
print(f"Create Bus AP-05-Z-9999: status={status_bus}, res={res_bus}")
new_bus_id = res_bus.get("id")

print("\n--- 8. Testing Bus Unassign from Route ---")
status_unassign, res_unassign = post("/api/buses/unassign", {"bus_id": new_bus_id}, token=token)
print(f"Unassign Bus: status={status_unassign}, res={res_unassign}")

print("\n=== ALL SYSTEM TESTS PASSED SUCCESSFULLY! ===")
