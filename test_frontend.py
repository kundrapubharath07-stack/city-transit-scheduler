import urllib.request
import json

base = 'http://localhost:8000'
def get(url):
    with urllib.request.urlopen(f'{base}{url}') as res:
        return res.status, res.read().decode('utf-8')

s_html, html = get('/')
print(f'HTML status: {s_html}, length: {len(html)}')

admin_pos = html.find('id="view-admin"')
public_part = html[:admin_pos]
admin_part = html[admin_pos:]

assert 'Academic Presentation & Project Defense' not in public_part, 'Academic presentation must NOT be in public view!'
assert 'Academic Presentation & Project Defense' in admin_part, 'Academic presentation MUST be in admin view!'
assert 'id="admin-sec-project-info"' in admin_part, 'admin-sec-project-info must exist in admin part!'
assert 'Depot Reserve Fleet Pool' in admin_part, 'Reserve Fleet Pool card must exist in admin bus management!'
assert '+ Add Bus' in admin_part, 'Quick Add Bus button must exist!'
assert '+ Add Route' in admin_part, 'Quick Add Route button must exist!'
assert '+ Add Stop' in admin_part, 'Quick Add Stop button must exist!'
assert 'Project Preparation & Docs' in admin_part, 'Project preparation tab must exist!'


assert 'cdn.jsdelivr.net/npm/chart.js' in html, 'Chart.js must be loaded in HTML'
assert 'id="adm-nav-graphs"' in admin_part, 'adm-nav-graphs button must exist!'
assert 'id="admin-sec-graphs"' in admin_part, 'admin-sec-graphs section must exist!'
assert 'id="overview-chart-route-demand"' in admin_part, 'overview-chart-route-demand canvas must exist!'
assert 'id="overview-chart-bus-fleet"' in admin_part, 'overview-chart-bus-fleet canvas must exist!'
assert 'id="chart-bus-types"' in admin_part, 'chart-bus-types canvas must exist!'
assert 'id="chart-bus-status"' in admin_part, 'chart-bus-status canvas must exist!'
assert 'id="chart-bus-occupancy"' in admin_part, 'chart-bus-occupancy canvas must exist!'
assert 'id="chart-bus-passengers-travelled"' in admin_part, 'chart-bus-passengers-travelled canvas must exist!'
assert 'id="chart-bus-stops-traversed"' in admin_part, 'chart-bus-stops-traversed canvas must exist!'
assert 'id="chart-bus-fleet-ranks"' in admin_part, 'chart-bus-fleet-ranks canvas must exist!'
assert 'id="bus-fleet-podium"' in admin_part, 'bus-fleet-podium element must exist!'
assert 'id="graph-bus-ranking-tbody"' in admin_part, 'graph-bus-ranking-tbody must exist!'
assert 'id="chart-route-demand"' in admin_part, 'chart-route-demand canvas must exist!'
assert 'id="chart-route-revenue"' in admin_part, 'chart-route-revenue canvas must exist!'
assert 'id="chart-route-congestion"' in admin_part, 'chart-route-congestion canvas must exist!'
assert 'id="chart-route-distance-time"' in admin_part, 'chart-route-distance-time canvas must exist!'
assert 'id="chart-route-buses"' in admin_part, 'chart-route-buses canvas must exist!'

s_js, js = get('/script.js')
print(f'JS status: {s_js}, length: {len(js)}')
assert 'switchView("admin")' in js, 'switchView admin must be present'
assert 'handleAssignBusToRoute' in js, 'handleAssignBusToRoute must be present'
assert 'loadProjectNotes' in js, 'loadProjectNotes must be present'
assert 'loadAdminGraphs' in js, 'loadAdminGraphs must be present'
assert 'chart-bus-passengers-travelled' in js, 'chart-bus-passengers-travelled must be handled in script.js'
assert 'chart-bus-stops-traversed' in js, 'chart-bus-stops-traversed must be handled in script.js'
assert 'chart-bus-fleet-ranks' in js, 'chart-bus-fleet-ranks must be handled in script.js'

assert 'loadOverviewQuickGraphs' in js, 'loadOverviewQuickGraphs must be present'
assert 'filterGraphsCategory' in js, 'filterGraphsCategory must be present'

print('All frontend asset checks passed successfully!')
