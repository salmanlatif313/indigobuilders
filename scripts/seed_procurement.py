import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = 'http://localhost:4000'

def req(method, path, data=None, token=None):
    body = json.dumps(data, ensure_ascii=False).encode('utf-8') if data else None
    headers = {'Content-Type': 'application/json; charset=utf-8'}
    if token: headers['Authorization'] = f'Bearer {token}'
    r = urllib.request.Request(f'{BASE}{path}', body, headers, method=method)
    try:
        resp = urllib.request.urlopen(r, timeout=60)
        return json.load(resp)
    except urllib.error.HTTPError as e:
        try: return json.load(e)
        except: return {'error': str(e)}

token = req('POST', '/api/auth/login', {'username': 'admin', 'password': 'admin'})['token']
POST = lambda path, data: req('POST', path, data, token)
PUT  = lambda path, data: req('PUT',  path, data, token)
GET  = lambda path:       req('GET',  path, token=token)
PROJECT_ID = 24

# ── Step 1: 5 Vendors ─────────────────────────────────────────────────────────
print('\nSTEP 1 — Vendors')
new_vendors = [
    {'vendorCode':'VND-005','vendorName':'Arabian Fire & Safety Systems','vendorNameAr':'الانظمة العربية للحريق','category':'Services','contactPerson':'Nasser Al-Qahtani','phone':'+966-12-3344567','email':'nasser@arabianfire.sa','vatNumber':'300111222300003','iban':'SA2920000000608010167001','bankCode':'1060','paymentTerms':'Net30','approvalStatus':'Approved','rating':4,'address':'Riyadh, Al-Olaya District'},
    {'vendorCode':'VND-006','vendorName':'National Elevator & Escalator Co.','vendorNameAr':'الشركة الوطنية للمصاعد','category':'Services','contactPerson':'Waleed Al-Shammari','phone':'+966-11-5566778','email':'waleed@nationalelevator.sa','vatNumber':'300222333400003','iban':'SA4405780008080005416780','bankCode':'1040','paymentTerms':'Net60','approvalStatus':'Approved','rating':5,'address':'Jeddah, King Road'},
    {'vendorCode':'VND-007','vendorName':'Integrated Building Management Systems','vendorNameAr':'انظمة ادارة المباني','category':'Electrical','contactPerson':'Faris Al-Dosari','phone':'+966-11-7788990','email':'faris@ibms.sa','vatNumber':'300333444500003','iban':'SA8020000000000099887766','bankCode':'1020','paymentTerms':'Net45','approvalStatus':'Approved','rating':4,'address':'Riyadh, Al-Malaz'},
    {'vendorCode':'VND-008','vendorName':'Pro-Tech HVAC & MEP Solutions','vendorNameAr':'حلول التكييف والميكانيكية','category':'HVAC','contactPerson':'Sami Al-Harbi','phone':'+966-11-4433221','email':'sami@protech-hvac.sa','vatNumber':'300444555600003','iban':'SA6305780008090005416730','bankCode':'1060','paymentTerms':'Net30','approvalStatus':'Approved','rating':4,'address':'Dammam, King Fahd Road'},
    {'vendorCode':'VND-009','vendorName':'Elite Plumbing & Drainage Contractors','vendorNameAr':'مقاولو السباكة والصرف','category':'Mechanical','contactPerson':'Rashid Al-Balawi','phone':'+966-11-9988776','email':'rashid@eliteplumbing.sa','vatNumber':'300555666700003','iban':'SA4080000000000012348765','bankCode':'1080','paymentTerms':'Net30','approvalStatus':'Approved','rating':3,'address':'Riyadh, Industrial Area 2'},
]
# Pre-load all existing vendor codes → IDs
existing = GET('/api/vendors')
vids = {v['VendorCode']: v['VendorID'] for v in existing['vendors']}
for v in new_vendors:
    if v['vendorCode'] in vids:
        print(f'  {v["vendorCode"]} already exists   ID={vids[v["vendorCode"]]}')
        continue
    r = POST('/api/vendors', v)
    vids[v['vendorCode']] = r['vendorId']
    print(f'  {v["vendorCode"]} {v["vendorName"][:40]:<40} ID={r["vendorId"]}')

# ── Step 2: 5 RFQs ────────────────────────────────────────────────────────────
print('\nSTEP 2 — RFQs')
rfq_specs = [
    {'rfqNumber':'RFQ-NADRA-002','title':'NADRA HQ - Electrical Works Package','dueDate':'2026-05-06',
     'lines':[
         {'description':'HV/LV panel boards, bus ducts, distribution boards — supply & install','unit':'L.S','quantity':1},
         {'description':'Wiring, conduit, trunking and cable trays — complete electrical installation','unit':'L.S','quantity':1},
         {'description':'Emergency lighting, exit signs and fire alarm cabling','unit':'L.S','quantity':1},
     ]},
    {'rfqNumber':'RFQ-NADRA-003','title':'NADRA HQ - HVAC Full Supply & Install','dueDate':'2026-05-08',
     'lines':[
         {'description':'Central chiller plant, AHUs, FCUs — complete HVAC system supply & install','unit':'L.S','quantity':1},
         {'description':'Ductwork, insulation, diffusers, grilles and VAV boxes','unit':'L.S','quantity':1},
         {'description':'BMS integration points for HVAC controls','unit':'No.','quantity':850},
     ]},
    {'rfqNumber':'RFQ-NADRA-004','title':'NADRA HQ - Plumbing, Drainage & Sanitary','dueDate':'2026-05-07',
     'lines':[
         {'description':'European water closet with flushing cistern — wall-hung complete set','unit':'Each','quantity':43},
         {'description':'Hot and cold water distribution pipework, valves and fittings — all floors','unit':'L.S','quantity':1},
         {'description':'Drainage, soil, waste and vent pipes — complete installation','unit':'L.S','quantity':1},
     ]},
    {'rfqNumber':'RFQ-NADRA-005','title':'NADRA HQ - Fire Fighting & Detection Systems','dueDate':'2026-05-09',
     'lines':[
         {'description':'Fire suppression system — sprinklers, pumps, tanks and pipework','unit':'L.S','quantity':1},
         {'description':'Addressable fire detection and alarm system — supply and install','unit':'L.S','quantity':1},
         {'description':'Fire extinguishers, hose reels and fire blankets','unit':'No.','quantity':120},
     ]},
    {'rfqNumber':'RFQ-NADRA-006','title':'NADRA HQ - Elevators, Escalators & BMS','dueDate':'2026-05-10',
     'lines':[
         {'description':'Passenger elevators 1000kg 1.6m/s — supply, install, test & commission','unit':'No.','quantity':6},
         {'description':'Service elevator 2000kg — supply, install, test & commission','unit':'No.','quantity':1},
         {'description':'Building Management System — full integration with HVAC, fire, access','unit':'L.S','quantity':1},
     ]},
]
existing_rfqs = {r['RFQNumber']: r['RFQHeaderID'] for r in GET('/api/rfq')['rfqs']}
rfq_ids = []
for spec in rfq_specs:
    if spec['rfqNumber'] in existing_rfqs:
        rid = existing_rfqs[spec['rfqNumber']]
        rfq_ids.append(rid)
        print(f'  {spec["rfqNumber"]} already exists ID={rid}')
        continue
    r = POST('/api/rfq', {**spec, 'projectId': PROJECT_ID, 'rfqDate': '2026-04-28'})
    rfq_ids.append(r['rfqId'])
    PUT(f'/api/rfq/{r["rfqId"]}/status', {'status': 'Sent'})
    print(f'  {spec["rfqNumber"]} ID={r["rfqId"]} (Sent)')

# ── Step 3: Quotes + Award ────────────────────────────────────────────────────
print('\nSTEP 3 — Quotes & Award')
# (rfq_id, [(vendor_id, [line_prices...])], competing_vendor, competing_prices)
quote_plan = [
    (rfq_ids[0], [(vids['VND-007'], [42000000, 38000000, 8500000]),
                   (vids['VND-002'], [45000000, 40000000, 9200000])]),
    (rfq_ids[1], [(vids['VND-008'], [121664270, 18000000, 85000]),
                   (vids['VND-007'], [130000000, 19500000, 92000])]),
    (rfq_ids[2], [(vids['VND-009'], [155000, 28000000, 32000000]),
                   (vids['VND-003'], [162000, 29500000, 34000000])]),
    (rfq_ids[3], [(vids['VND-005'], [54890087, 18000000, 4500])]),
    (rfq_ids[4], [(vids['VND-006'], [22000000, 38000000, 19001600])]),
]
for rfq_id, vendor_bids in quote_plan:
    detail = GET(f'/api/rfq/{rfq_id}')
    lines = detail['lines']
    for vendor_id, prices in vendor_bids:
        for i, line in enumerate(lines):
            POST(f'/api/rfq/{rfq_id}/quotes', {
                'rfqLineId': line['RFQLineID'], 'vendorId': vendor_id,
                'unitPrice': prices[i] if i < len(prices) else prices[-1],
                'deliveryDays': 21,
            })
    # Award cheapest per line
    detail2 = GET(f'/api/rfq/{rfq_id}')
    for line in lines:
        lq = [q for q in detail2['quotes'] if q['RFQLineID'] == line['RFQLineID']]
        if lq:
            best = min(lq, key=lambda q: q['UnitPrice'])
            PUT(f'/api/rfq/{rfq_id}/award', {'quoteId': best['QuoteID']})
    print(f'  RFQ {rfq_id} — quotes added & awarded')

# ── Step 4: Purchase Orders ───────────────────────────────────────────────────
print('\nSTEP 4 — Purchase Orders')
po_specs = [
    {'poNumber':'PO-NADRA-003','vendorName':'Integrated Building Management Systems','vendorEmail':'faris@ibms.sa','vendorVAT':'300333444500003','vendorAddress':'Riyadh, Al-Malaz','paymentTerms':'Net45','notes':'Electrical works — RFQ-NADRA-002',
     'items':[{'description':'HV/LV panel boards, bus ducts, distribution boards','quantity':1,'unitPrice':42000000},{'description':'Wiring, conduit, trunking and cable trays','quantity':1,'unitPrice':38000000},{'description':'Emergency lighting and fire alarm cabling','quantity':1,'unitPrice':8500000}]},
    {'poNumber':'PO-NADRA-004','vendorName':'Pro-Tech HVAC & MEP Solutions','vendorEmail':'sami@protech-hvac.sa','vendorVAT':'300444555600003','vendorAddress':'Dammam, King Fahd Road','paymentTerms':'Net30','notes':'HVAC package — RFQ-NADRA-003',
     'items':[{'description':'Chiller plant, AHUs, FCUs — HVAC system complete','quantity':1,'unitPrice':121664270},{'description':'Ductwork, insulation, diffusers and VAV boxes','quantity':1,'unitPrice':18000000},{'description':'BMS integration points for HVAC','quantity':850,'unitPrice':85000}]},
    {'poNumber':'PO-NADRA-005','vendorName':'Elite Plumbing & Drainage Contractors','vendorEmail':'rashid@eliteplumbing.sa','vendorVAT':'300555666700003','vendorAddress':'Riyadh, Industrial Area 2','paymentTerms':'Net30','notes':'Plumbing and sanitary — RFQ-NADRA-004',
     'items':[{'description':'European WC flushing cistern wall-hung complete set','quantity':43,'unitPrice':155000},{'description':'Hot and cold water distribution pipework all floors','quantity':1,'unitPrice':28000000},{'description':'Drainage, soil, waste and vent pipes complete','quantity':1,'unitPrice':32000000}]},
    {'poNumber':'PO-NADRA-006','vendorName':'Arabian Fire & Safety Systems','vendorEmail':'nasser@arabianfire.sa','vendorVAT':'300111222300003','vendorAddress':'Riyadh, Al-Olaya District','paymentTerms':'Net30','notes':'Fire fighting and detection — RFQ-NADRA-005',
     'items':[{'description':'Fire suppression system — sprinklers, pumps, tanks','quantity':1,'unitPrice':54890087},{'description':'Addressable fire detection and alarm system','quantity':1,'unitPrice':18000000},{'description':'Fire extinguishers, hose reels and fire blankets','quantity':120,'unitPrice':4500}]},
    {'poNumber':'PO-NADRA-007','vendorName':'National Elevator & Escalator Co.','vendorEmail':'waleed@nationalelevator.sa','vendorVAT':'300222333400003','vendorAddress':'Jeddah, King Road','paymentTerms':'Net60','notes':'Elevators and BMS — RFQ-NADRA-006',
     'items':[{'description':'Passenger elevators 1000kg 1.6m/s supply install test commission','quantity':6,'unitPrice':22000000},{'description':'Service elevator 2000kg supply install test commission','quantity':1,'unitPrice':38000000},{'description':'Building Management System full integration','quantity':1,'unitPrice':19001600}]},
]
existing_pos = {p['PONumber']: p['PurchaseOrderID'] for p in GET('/api/purchase-orders')['purchaseOrders']}
po_ids = []
for spec in po_specs:
    items = [{'description':it['description'],'quantity':it['quantity'],'unitPrice':it['unitPrice'],'discount':0,'vatRate':15} for it in spec['items']]
    if spec['poNumber'] in existing_pos:
        pid = existing_pos[spec['poNumber']]
        po_ids.append(pid)
        print(f'  {spec["poNumber"]} already exists ID={pid}')
        continue
    r = POST('/api/purchase-orders', {**{k:v for k,v in spec.items() if k!='items'},
              'projectID':PROJECT_ID,'orderDate':'2026-04-28','expectedDeliveryDate':'2026-05-20',
              'deliveryAddress':'NADRA HQ Site','vatRate':15,'shippingCost':0,'items':items})
    pid = r['poId']
    po_ids.append(pid)
    PUT(f'/api/purchase-orders/{pid}/submit', {})
    PUT(f'/api/purchase-orders/{pid}/status', {'status': 'Approved'})
    total = sum(it['quantity'] * it['unitPrice'] for it in spec['items'])
    print(f'  {spec["poNumber"]} Approved | SAR {total:>15,.0f} | {spec["vendorName"][:35]}')

# ── Step 5: GRNs ──────────────────────────────────────────────────────────────
print('\nSTEP 5 — GRNs')
grn_configs = [
    {'grnNumber':'GRN-NADRA-002','poIdx':0,'vehicleNo':'RYD-8812-B','driverName':'Ali Hassan','dn':'DN-IBMS-0341','store':'NADRA Site - Electrical Store',
     'line_qtys':[('L.S',1),('L.S',1)]},
    {'grnNumber':'GRN-NADRA-003','poIdx':1,'vehicleNo':'DAM-5543-C','driverName':'Saeed Iqbal','dn':'DN-PVAC-0892','store':'NADRA Site - MEP Store',
     'line_qtys':[('L.S',1),('L.S',1)]},
    {'grnNumber':'GRN-NADRA-004','poIdx':2,'vehicleNo':'RYD-3301-D','driverName':'Farhan Malik','dn':'DN-EPL-0123','store':'NADRA Site - Plumbing Store',
     'line_qtys':[('Each',43)]},
    {'grnNumber':'GRN-NADRA-005','poIdx':3,'vehicleNo':'RYD-7765-E','driverName':'Zubair Ahmad','dn':'DN-AFS-0456','store':'NADRA Site - Fire Store',
     'line_qtys':[('No.',120)]},
    {'grnNumber':'GRN-NADRA-006','poIdx':4,'vehicleNo':'JED-9921-F','driverName':'Mansoor Ali','dn':'DN-NEL-0789','store':'NADRA Site - Equipment Bay',
     'line_qtys':[('No.',6)]},
]
existing_grns = {g['GRNNumber']: g['GRNHeaderID'] for g in GET('/api/grn')['grns']}
for gc in grn_configs:
    po_detail = GET(f'/api/purchase-orders/{po_ids[gc["poIdx"]]}')
    po_items = po_detail['items']
    lines = []
    for i, (unit, qty) in enumerate(gc['line_qtys']):
        if i < len(po_items):
            lines.append({'poLineId':po_items[i]['LineID'],'description':po_items[i]['Description'],
                           'unit':unit,'orderedQty':qty,'previouslyReceivedQty':0,'thisReceiptQty':qty})
    if gc['grnNumber'] in existing_grns:
        print(f'  {gc["grnNumber"]} already exists')
        continue
    r = POST('/api/grn', {'grnNumber':gc['grnNumber'],'poHeaderId':po_ids[gc['poIdx']],
               'projectId':PROJECT_ID,'grnDate':'2026-04-28','vehicleNo':gc['vehicleNo'],
               'driverName':gc['driverName'],'deliveryNoteNo':gc['dn'],'storeLocation':gc['store'],
               'receivedBy':'Site Engineer','lines':lines})
    print(f'  {gc["grnNumber"]} GRN ID={r["grnId"]}')

# ── Step 6: QC all pending ────────────────────────────────────────────────────
print('\nSTEP 6 — QC Inspections')
pending = GET('/api/qc?status=Pending')['inspections']
for insp in pending:
    detail = GET(f'/api/qc/{insp["QCInspectionID"]}')
    qc_lines = [{'qcLineId':l['QCLineID'],'inspectedQty':l['ThisReceiptQty'],
                  'acceptedQty':l['ThisReceiptQty'],'rejectedQty':0,'decision':'Accepted'}
                for l in detail['lines'] if l['ThisReceiptQty'] > 0]
    if not qc_lines: continue
    r = PUT(f'/api/qc/{insp["QCInspectionID"]}/complete',
            {'inspectedBy':'QC Engineer Kamran Malik','lines':qc_lines})
    print(f'  QC {insp["QCInspectionID"]} ({insp["GRNNumber"]}): {r.get("grnStatus","?")}')

# ── Step 7: Advance payments ──────────────────────────────────────────────────
print('\nSTEP 7 — Vendor Payments (25% advances)')
advance_pmts = [
    (vids['VND-007'], po_ids[0], 22200000,  'TXN-2026-04-003', 'Advance - electrical works'),
    (vids['VND-008'], po_ids[1], 36000000,  'TXN-2026-04-004', 'Advance - HVAC package'),
    (vids['VND-009'], po_ids[2], 15032212,  'TXN-2026-04-005', 'Advance - plumbing works'),
    (vids['VND-005'], po_ids[3], 18357272,  'TXN-2026-04-006', 'Advance - fire fighting'),
    (vids['VND-006'], po_ids[4], 24375400,  'TXN-2026-04-007', 'Advance - elevators and BMS'),
]
for vid, poid, amt, ref, note in advance_pmts:
    r = POST('/api/vendor-payments', {'vendorId':vid,'poHeaderId':poid,'paymentDate':'2026-04-28',
              'paymentType':'Advance','amount':amt,'paymentMethod':'BankTransfer','referenceNo':ref,'notes':note})
    print(f'  Payment {r["paymentId"]}: SAR {amt:>14,.0f}')

# ── Summary ───────────────────────────────────────────────────────────────────
print('\n' + '='*55)
print('  5 PROCUREMENT CYCLES COMPLETE')
print('='*55)
v   = GET('/api/vendors')
pos = GET('/api/purchase-orders')
grn = GET('/api/grn')
qc  = GET('/api/qc')
st  = GET('/api/inventory?projectId=24')
vp  = GET('/api/vendor-payments')
approved = [p for p in pos['purchaseOrders'] if p['Status'] == 'Approved']
print(f'  Total vendors:   {v["count"]}')
print(f'  Approved POs:    {len(approved)} | SAR {sum(p["TotalAmount"] for p in approved):,.0f}')
print(f'  GRNs:            {grn["count"]}')
print(f'  QC completed:    {sum(1 for q in qc["inspections"] if q["Status"]=="Completed")}')
print(f'  Stock items:     {st["count"]}')
print(f'  AP payments:     {vp["count"]} | SAR {sum(p["Amount"] for p in vp["payments"]):,.0f}')
