"""Rebuild extracted statistical facts from the BPS yearbook, not the copyrighted publication.
Requires pdftotext -f 829 -l 830 -bbox yearbook.pdf /tmp/indonesia-gdp.xml.
"""
import json, re, xml.etree.ElementTree as E
from pathlib import Path
root=Path(__file__).resolve().parents[1]
ns={'x':'http://www.w3.org/1999/xhtml'}
tables=[]
for p in E.parse('/tmp/indonesia-gdp.xml').findall('.//x:page',ns):
 words=p.findall('x:word',ns)
 # Province labels start near x=54. Footnotes and headings excluded by row range.
 ys=sorted(set(round(float(w.attrib['yMin']),3) for w in words if 53<float(w.attrib['xMin'])<55 and w.text in ['Aceh','Sumatera','Riau','Jambi','Bengkulu','Lampung','Kepulauan','DKI','Jawa','DI','Banten','Bali','Nusa','Kalimantan','Sulawesi','Gorontalo','Maluku','Papua']))
 rows=[]
 for y in ys:
  row=sorted([w for w in words if abs(float(w.attrib['yMin'])-y)<.1], key=lambda w:float(w.attrib['xMin']))
  name=' '.join(w.text for w in row if float(w.attrib['xMin'])<150)
  vals=[w.text for w in row if float(w.attrib['xMin'])>150 and re.fullmatch(r'[\d.]+|–',w.text or '') and len(w.text)>1]
  if len(vals)==5: rows.append((name,[float(v.replace('.','')) if v!='–' else None for v in vals]))
 # Missing historic cells are dashes; retain the new province rows explicitly.
 for y in ys:
  row=sorted([w for w in words if abs(float(w.attrib['yMin'])-y)<.1],key=lambda w:float(w.attrib['xMin']))
  name=' '.join(w.text for w in row if float(w.attrib['xMin'])<150)
  if any(n==name for n,v in rows):continue
  vals=[w.text for w in row if float(w.attrib['xMin'])>150 and re.fullmatch(r'[\d.]+|–',w.text or '') and (len(w.text)>1 or w.text=='–')]
  if len(vals)==5: rows.append((name,[float(v.replace('.','')) if v!='–' else None for v in vals]))
 assert len(rows)==38,(len(rows),rows)
 tables.append(dict(rows))
names=list(tables[0])
# Restore BPS row order, including the post-2022 Papua divisions.
names=[n for n in names if not n.startswith('Papua')]+['Papua Barat','Papua Barat Daya','Papua','Papua Selatan','Papua Tengah','Papua Pegunungan']
codes=['11','12','13','14','15','16','17','18','19','21','31','32','33','34','35','36','51','52','53','61','62','63','64','65','71','72','73','74','75','76','81','82','92','96','91','93','94','95']
pop=[5554.8,15588.5,5836.2,6728.1,3724.3,8837.3,2112.2,9419.6,1531.5,2183.3,10684.9,50345.2,37892.3,3759.5,41814.5,12431.4,4433.3,5646,5656,5695.5,2809.7,4273.4,4045.9,739.8,2701.8,3121.8,9463.4,2793.1,1227.8,1503.2,1945.6,1355.6,578.7,627.1,1060.6,542.1,1472.9,1467]
poverty=[12.64,7.19,5.42,6.36,7.26,10.51,12.52,10.62,5.08,4.78,4.14,7.08,9.58,10.40,9.56,5.70,3.80,11.91,19.02,6.25,5.26,4.02,5.51,5.38,6.70,11.04,7.77,10.63,13.87,10.71,15.78,6.03,21.09,16.95,18.09,19.35,27.60,29.66]
unemployment=[5.75,5.60,5.75,3.70,4.48,3.86,3.11,4.19,4.63,6.39,6.21,6.75,4.78,3.48,4.19,6.68,1.79,2.73,3.02,4.86,4.01,4.20,5.14,3.90,5.85,2.94,4.19,3.09,3.13,2.68,6.11,4.03,4.13,6.48,6.48,4.05,2.75,1.32]
scale=22139/sum(v[4]/1000 for v in tables[0].values())
provinces=[]
for i,n in enumerate(names):
 # Sector profiles and urban shares are deliberately labeled synthetic assumptions.
 sectors=[.25,.1,.2,.35,.1]; urban=.48
 if codes[i] in ['31','32','33','34','35','36','21']: sectors=[.08,.03,.33,.46,.1];urban=.72
 if codes[i]=='31':sectors=[.005,.005,.14,.75,.1];urban=1
 if codes[i] in ['14','63','64','65','94','92']:sectors=[.15,.4,.2,.17,.08]
 if codes[i] in ['51','34']:sectors=[.12,.01,.1,.65,.12]
 if codes[i] in ['53','95','93','76']:sectors=[.4,.03,.08,.32,.17];urban=.25
 provinces.append(dict(id=codes[i],name=n,population=pop[i]/1000,gdp=tables[0][n][4]/1000*scale,observedGrdp=tables[0][n][4]/1000,poverty=poverty[i],unemployment=unemployment[i],urban=urban,sectors=sectors))
sector_path=root/'src/data/sectors.json'
if sector_path.exists():
 observed=json.loads(sector_path.read_text())
 for p in provinces:
  p['sectors']=next(s['sectors'] for s in observed['provinces'] if s['id']==p['id'])
source='https://www.bps.go.id/en/publication/2025/02/28/8cfe1a589ad3693396d3db9f/statistik-indonesia-2025.html'
data={'version':'2024.1','national':{'gdp':22139,'debt':22139*.398},'provenance':{'source':source,'year':2024,'population':'Table 3.1.1 p133: mid-year projection, thousand persons /1000 to millions.','gdp':f'Table 15.2.1 p785: preliminary current-price billion IDR /1000 to trillion; province totals scaled by {scale:.8f} to GDP 22139T. Original GRDP preserved.','poverty':'Table 4.6.2 p315: September 2024 percent.','unemployment':'Table 3.2.11 p160: August 2024 percent.','inferred':'Urban shares, five-sector profiles, household weights/incomes, capacity, infrastructure, service indices and political variables are synthetic gameplay assumptions. Debt uses an illustrative 39.8% starting ratio.','papua':'2024 split-province observations are available. Historical evaluation excludes six Papua divisions to avoid unharmonized 2020–2022 boundaries.'},'provinces':provinces}
if sector_path.exists():
 data['version']='2024.2'
 data['provenance']['sectors']=observed['source']+' Table 89, 2024 observed industry percentages; aggregation and rounding documented in sectors.json.'
 data['provenance']['inferred']=data['provenance']['inferred'].replace('five-sector profiles, ', '')
(root/'src/data/baseline.json').write_text(json.dumps(data,indent=2))
(root/'src/data/historical.json').write_text(json.dumps({'source':source,'table':'15.2.2, p786; constant 2010 prices, billion IDR','years':[2020,2021,2022,2023,2024],'provinces':[{'name':n,'values':v} for n,v in tables[1].items() if not n.startswith('Papua')]},indent=2))
geo=json.loads((root/'public/data/provinces.geojson').read_text())
lookup={p['name']:p['id'] for p in provinces};lookup['Daerah Istimewa Yogyakarta']='34'
for f in geo['features']:
 f['id']=lookup[f['properties']['PROVINSI']];f['properties']['KODE_PROV']=f['id']
(root/'public/data/provinces.geojson').write_text(json.dumps(geo,separators=(',',':')))
print('Imported',len(provinces),'provinces; population',sum(pop)/1000,'million; GDP reconciliation',scale)
