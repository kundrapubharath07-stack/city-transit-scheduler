from db import DatabaseManager

db = DatabaseManager()
with db.get_connection() as conn:
    cursor = conn.cursor()
    cursor.execute('''
        SELECT b.id, b.bus_number, b.bus_type, b.capacity, b.current_route_id,
               r.route_number, r.route_name,
               COALESCE((SELECT COUNT(*) FROM route_stops rs WHERE rs.route_id = b.current_route_id), 0) AS stops_count,
               COALESCE((SELECT SUM(ticket_count) FROM ticket_sales ts WHERE ts.bus_id = b.id), 0) AS ticket_pax,
               COALESCE((SELECT SUM(fare_collected) FROM ticket_sales ts WHERE ts.bus_id = b.id), 0.0) AS ticket_revenue,
               COALESCE((SELECT recorded_tickets FROM occupancy_records occ WHERE occ.bus_id = b.id ORDER BY id DESC LIMIT 1), 0) AS occupancy_pax
        FROM buses b
        LEFT JOIN bus_routes r ON b.current_route_id = r.id
        ORDER BY b.bus_number ASC
    ''')
    rows = [dict(r) for r in cursor.fetchall()]
    for r in rows:
        pax = r['ticket_pax'] or r['occupancy_pax'] or 0
        cap = r['capacity'] or 50
        pct = round((pax / cap) * 100) if cap else 0
        stops = r['stops_count']
        score = round(min(1.0, pax/55)*40 + min(1.0, pct/100)*30 + min(1.0, stops/6)*30, 1) if r['current_route_id'] else 10.0
        r['pax'] = pax
        r['score'] = score
        r['pct'] = pct

    rows = sorted(rows, key=lambda x: (x['score'], x['pax']), reverse=True)
    for i, r in enumerate(rows, 1):
        print(f"Rank #{i}: Bus {r['bus_number']} ({r['route_number']}) -> {r['pax']} passengers travelled, {r['stops_count']} stops served, load={r['pct']}%, score={r['score']}")
