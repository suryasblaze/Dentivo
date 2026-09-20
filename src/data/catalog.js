/* Procedure catalog, drug formulary, tooth conditions, consent templates.
   Prices are indicative INR for a Tier-1 South Indian clinic. */

export const PROCEDURE_CATEGORIES = [
  'Diagnostic', 'Preventive', 'Restorative', 'Endodontics', 'Oral Surgery',
  'Prosthodontics', 'Periodontics', 'Orthodontics', 'Implants', 'Cosmetic', 'Paedodontics',
]

export const PROCEDURES = [
  // Diagnostic
  { code: 'D0120', name: 'Consultation & Oral Examination', cat: 'Diagnostic', price: 300, mins: 15, perTooth: false, gst: 0 },
  { code: 'D0220', name: 'IOPA X-ray (single)', cat: 'Diagnostic', price: 200, mins: 10, perTooth: true, gst: 0 },
  { code: 'D0330', name: 'OPG / Panoramic X-ray', cat: 'Diagnostic', price: 800, mins: 15, perTooth: false, gst: 0 },
  { code: 'D0367', name: 'CBCT Scan (single arch)', cat: 'Diagnostic', price: 3500, mins: 20, perTooth: false, gst: 0 },

  // Preventive
  { code: 'D1110', name: 'Scaling & Polishing (full mouth)', cat: 'Preventive', price: 1500, mins: 40, perTooth: false, gst: 0 },
  { code: 'D1206', name: 'Fluoride Varnish Application', cat: 'Preventive', price: 800, mins: 20, perTooth: false, gst: 0 },
  { code: 'D1351', name: 'Pit & Fissure Sealant', cat: 'Preventive', price: 600, mins: 20, perTooth: true, gst: 0 },
  { code: 'D1330', name: 'Oral Hygiene Instruction', cat: 'Preventive', price: 0, mins: 10, perTooth: false, gst: 0 },

  // Restorative
  { code: 'D2391', name: 'Composite Filling — 1 surface', cat: 'Restorative', price: 1200, mins: 30, perTooth: true, gst: 0 },
  { code: 'D2392', name: 'Composite Filling — 2 surface', cat: 'Restorative', price: 1800, mins: 40, perTooth: true, gst: 0 },
  { code: 'D2140', name: 'GIC Restoration', cat: 'Restorative', price: 900, mins: 25, perTooth: true, gst: 0 },
  { code: 'D2950', name: 'Core Build-up with Post', cat: 'Restorative', price: 2500, mins: 45, perTooth: true, gst: 0 },

  // Endodontics
  { code: 'D3310', name: 'Root Canal Treatment — Anterior', cat: 'Endodontics', price: 4500, mins: 60, perTooth: true, gst: 0 },
  { code: 'D3320', name: 'Root Canal Treatment — Premolar', cat: 'Endodontics', price: 5500, mins: 75, perTooth: true, gst: 0 },
  { code: 'D3330', name: 'Root Canal Treatment — Molar', cat: 'Endodontics', price: 7000, mins: 90, perTooth: true, gst: 0 },
  { code: 'D3346', name: 'Re-treatment of Root Canal', cat: 'Endodontics', price: 8500, mins: 90, perTooth: true, gst: 0 },
  { code: 'D3220', name: 'Pulpotomy', cat: 'Endodontics', price: 2000, mins: 35, perTooth: true, gst: 0 },

  // Oral Surgery
  { code: 'D7140', name: 'Simple Extraction', cat: 'Oral Surgery', price: 1000, mins: 25, perTooth: true, gst: 0 },
  { code: 'D7210', name: 'Surgical Extraction', cat: 'Oral Surgery', price: 3000, mins: 45, perTooth: true, gst: 0 },
  { code: 'D7240', name: 'Impacted 3rd Molar Removal', cat: 'Oral Surgery', price: 6500, mins: 60, perTooth: true, gst: 0 },
  { code: 'D7510', name: 'Incision & Drainage of Abscess', cat: 'Oral Surgery', price: 1500, mins: 30, perTooth: true, gst: 0 },

  // Prosthodontics
  { code: 'D2740', name: 'Zirconia Crown', cat: 'Prosthodontics', price: 9000, mins: 60, perTooth: true, gst: 0, lab: true },
  { code: 'D2750', name: 'PFM Crown (Metal-Ceramic)', cat: 'Prosthodontics', price: 5500, mins: 60, perTooth: true, gst: 0, lab: true },
  { code: 'D2752', name: 'E-max Crown', cat: 'Prosthodontics', price: 12000, mins: 60, perTooth: true, gst: 0, lab: true },
  { code: 'D6240', name: 'Bridge — per unit', cat: 'Prosthodontics', price: 6000, mins: 50, perTooth: true, gst: 0, lab: true },
  { code: 'D5110', name: 'Complete Denture (per arch)', cat: 'Prosthodontics', price: 22000, mins: 60, perTooth: false, gst: 0, lab: true },
  { code: 'D5213', name: 'Cast Partial Denture', cat: 'Prosthodontics', price: 18000, mins: 60, perTooth: false, gst: 0, lab: true },

  // Periodontics
  { code: 'D4341', name: 'Deep Scaling & Root Planing (quadrant)', cat: 'Periodontics', price: 2500, mins: 45, perTooth: false, gst: 0 },
  { code: 'D4210', name: 'Gingivectomy (per quadrant)', cat: 'Periodontics', price: 4000, mins: 45, perTooth: false, gst: 0 },
  { code: 'D4263', name: 'Bone Graft (per site)', cat: 'Periodontics', price: 12000, mins: 60, perTooth: true, gst: 0 },
  { code: 'D4249', name: 'Crown Lengthening', cat: 'Periodontics', price: 5500, mins: 50, perTooth: true, gst: 0 },

  // Orthodontics
  { code: 'D8080', name: 'Metal Braces — full case', cat: 'Orthodontics', price: 38000, mins: 90, perTooth: false, gst: 0 },
  { code: 'D8090', name: 'Ceramic Braces — full case', cat: 'Orthodontics', price: 58000, mins: 90, perTooth: false, gst: 0 },
  { code: 'D8670', name: 'Ortho Monthly Adjustment', cat: 'Orthodontics', price: 1000, mins: 20, perTooth: false, gst: 0 },
  { code: 'D8680', name: 'Retainer (per arch)', cat: 'Orthodontics', price: 6000, mins: 30, perTooth: false, gst: 0, lab: true },
  { code: 'D8090A', name: 'Clear Aligners — full case', cat: 'Orthodontics', price: 145000, mins: 60, perTooth: false, gst: 0, lab: true },

  // Implants
  { code: 'D6010', name: 'Implant Fixture Placement', cat: 'Implants', price: 32000, mins: 90, perTooth: true, gst: 0 },
  { code: 'D6057', name: 'Implant Abutment', cat: 'Implants', price: 9000, mins: 40, perTooth: true, gst: 0, lab: true },
  { code: 'D6058', name: 'Implant Crown (Zirconia)', cat: 'Implants', price: 14000, mins: 50, perTooth: true, gst: 0, lab: true },
  { code: 'D6190', name: 'Sinus Lift', cat: 'Implants', price: 28000, mins: 90, perTooth: false, gst: 0 },

  // Cosmetic
  { code: 'D9972', name: 'Teeth Whitening — In-office', cat: 'Cosmetic', price: 9000, mins: 60, perTooth: false, gst: 18 },
  { code: 'D9973', name: 'Home Bleaching Kit', cat: 'Cosmetic', price: 5000, mins: 20, perTooth: false, gst: 18 },
  { code: 'D2962', name: 'Porcelain Veneer', cat: 'Cosmetic', price: 15000, mins: 60, perTooth: true, gst: 18, lab: true },
  { code: 'D9975', name: 'Smile Design Consultation (DSD)', cat: 'Cosmetic', price: 3000, mins: 45, perTooth: false, gst: 18 },

  // Paedodontics
  { code: 'D2930', name: 'Stainless Steel Crown (child)', cat: 'Paedodontics', price: 2200, mins: 35, perTooth: true, gst: 0 },
  { code: 'D1510', name: 'Space Maintainer', cat: 'Paedodontics', price: 4500, mins: 40, perTooth: false, gst: 0, lab: true },
  { code: 'D9230', name: 'Nitrous Oxide Sedation', cat: 'Paedodontics', price: 2500, mins: 30, perTooth: false, gst: 0 },
]

/* ---------------- Tooth conditions ---------------- */
export const TOOTH_CONDITIONS = [
  { key: 'healthy',  label: 'Healthy',        color: 'var(--t-healthy)', text: 'var(--muted)' },
  { key: 'caries',   label: 'Caries',         color: 'var(--t-caries)',  text: '#fff' },
  { key: 'filled',   label: 'Filled',         color: 'var(--t-filled)',  text: '#fff' },
  { key: 'rct',      label: 'Root Canal',     color: 'var(--t-rct)',     text: '#fff' },
  { key: 'crown',    label: 'Crown / Bridge', color: 'var(--t-crown)',   text: '#fff' },
  { key: 'missing',  label: 'Missing',        color: 'var(--t-missing)', text: '#fff' },
  { key: 'implant',  label: 'Implant',        color: 'var(--t-implant)', text: '#fff' },
  { key: 'planned',  label: 'Planned Work',   color: 'var(--t-planned)', text: '#fff' },
]
export const condColor = (k) => (TOOTH_CONDITIONS.find(c => c.key === k) || TOOTH_CONDITIONS[0]).color
export const condLabel = (k) => (TOOTH_CONDITIONS.find(c => c.key === k) || TOOTH_CONDITIONS[0]).label

/* FDI two-digit notation */
export const ADULT_ARCH = {
  upper: [[18,17,16,15,14,13,12,11], [21,22,23,24,25,26,27,28]],
  lower: [[48,47,46,45,44,43,42,41], [31,32,33,34,35,36,37,38]],
}
export const PRIMARY_ARCH = {
  upper: [[55,54,53,52,51], [61,62,63,64,65]],
  lower: [[85,84,83,82,81], [71,72,73,74,75]],
}
export const toothName = (n) => {
  const pos = Number(String(n)[1])
  const adultNames = ['', 'Central Incisor', 'Lateral Incisor', 'Canine', '1st Premolar',
    '2nd Premolar', '1st Molar', '2nd Molar', '3rd Molar (Wisdom)']
  const primaryNames = ['', 'Central Incisor', 'Lateral Incisor', 'Canine', '1st Molar', '2nd Molar']
  const q = Number(String(n)[0])
  const quad = { 1: 'Upper Right', 2: 'Upper Left', 3: 'Lower Left', 4: 'Lower Right',
    5: 'Upper Right (Primary)', 6: 'Upper Left (Primary)', 7: 'Lower Left (Primary)', 8: 'Lower Right (Primary)' }[q]
  const nm = q >= 5 ? primaryNames[pos] : adultNames[pos]
  return `${quad} ${nm}`
}
export const TOOTH_SURFACES = ['Mesial', 'Distal', 'Occlusal', 'Buccal', 'Lingual', 'Incisal']

/* ---------------- Drug formulary ---------------- */
export const DRUGS = [
  { name: 'Amoxicillin + Clavulanate 625mg', form: 'Tablet', dose: '1-0-1', days: 5, cls: 'Antibiotic',
    note: 'After food. Complete full course.' },
  { name: 'Amoxicillin 500mg', form: 'Capsule', dose: '1-1-1', days: 5, cls: 'Antibiotic', note: 'After food.' },
  { name: 'Metronidazole 400mg', form: 'Tablet', dose: '1-1-1', days: 5, cls: 'Antibiotic',
    note: 'Avoid alcohol completely during course.' },
  { name: 'Azithromycin 500mg', form: 'Tablet', dose: '1-0-0', days: 3, cls: 'Antibiotic',
    note: 'For penicillin-allergic patients.' },
  { name: 'Clindamycin 300mg', form: 'Capsule', dose: '1-1-1', days: 5, cls: 'Antibiotic',
    note: 'Alternative in penicillin allergy.' },
  { name: 'Ibuprofen 400mg + Paracetamol 325mg', form: 'Tablet', dose: '1-1-1', days: 3, cls: 'Analgesic',
    note: 'SOS for pain. After food.' },
  { name: 'Diclofenac 50mg + Serratiopeptidase', form: 'Tablet', dose: '1-0-1', days: 3, cls: 'Analgesic',
    note: 'Reduces swelling after surgery.' },
  { name: 'Paracetamol 650mg', form: 'Tablet', dose: '1-1-1', days: 3, cls: 'Analgesic', note: 'SOS for fever/pain.' },
  { name: 'Ketorolac 10mg', form: 'Tablet', dose: '1-0-1', days: 2, cls: 'Analgesic', note: 'Severe pain only. Max 2 days.' },
  { name: 'Pantoprazole 40mg', form: 'Tablet', dose: '1-0-0', days: 5, cls: 'Antacid',
    note: 'Empty stomach, 30 min before breakfast.' },
  { name: 'Chlorhexidine 0.2% Mouthwash', form: 'Rinse', dose: '10ml BD', days: 7, cls: 'Antiseptic',
    note: 'Do not swallow. Use 30 min after brushing.' },
  { name: 'Betadine Gargle 2%', form: 'Rinse', dose: 'Gargle TDS', days: 5, cls: 'Antiseptic', note: 'Dilute with warm water.' },
  { name: 'Mucopain / Lignocaine Gel 2%', form: 'Gel', dose: 'Apply SOS', days: 5, cls: 'Topical', note: 'Apply on sore area.' },
  { name: 'Sensodyne / Potassium Nitrate Paste', form: 'Paste', dose: 'BD brushing', days: 30, cls: 'Desensitiser',
    note: 'Rub on sensitive area, do not rinse immediately.' },
  { name: 'Calcium + Vitamin D3', form: 'Tablet', dose: '0-0-1', days: 30, cls: 'Supplement', note: 'After dinner.' },
  { name: 'Tranexamic Acid 500mg', form: 'Tablet', dose: '1-1-1', days: 2, cls: 'Haemostatic', note: 'If bleeding persists post-extraction.' },
]

export const RX_TEMPLATES = [
  { name: 'Post-Extraction', drugs: ['Amoxicillin + Clavulanate 625mg', 'Ibuprofen 400mg + Paracetamol 325mg', 'Pantoprazole 40mg', 'Chlorhexidine 0.2% Mouthwash'] },
  { name: 'RCT / Pulpitis', drugs: ['Amoxicillin 500mg', 'Metronidazole 400mg', 'Ibuprofen 400mg + Paracetamol 325mg', 'Pantoprazole 40mg'] },
  { name: 'Acute Abscess', drugs: ['Amoxicillin + Clavulanate 625mg', 'Metronidazole 400mg', 'Ketorolac 10mg', 'Betadine Gargle 2%'] },
  { name: 'Implant Surgery', drugs: ['Amoxicillin + Clavulanate 625mg', 'Diclofenac 50mg + Serratiopeptidase', 'Pantoprazole 40mg', 'Chlorhexidine 0.2% Mouthwash'] },
  { name: 'Sensitivity', drugs: ['Sensodyne / Potassium Nitrate Paste'] },
  { name: 'Penicillin Allergy', drugs: ['Azithromycin 500mg', 'Paracetamol 650mg', 'Pantoprazole 40mg'] },
]

/* ---------------- Medical history ---------------- */
export const MEDICAL_FLAGS = [
  { key: 'diabetes', label: 'Diabetes', critical: true, note: 'Delayed healing — check HbA1c before surgery' },
  { key: 'hypertension', label: 'High BP', critical: true, note: 'Limit adrenaline in local anaesthetic' },
  { key: 'cardiac', label: 'Heart Condition', critical: true, note: 'Antibiotic prophylaxis may be required' },
  { key: 'bloodthinner', label: 'Blood Thinners', critical: true, note: 'Bleeding risk — check INR' },
  { key: 'asthma', label: 'Asthma', critical: false, note: 'Avoid NSAIDs; keep inhaler at chairside' },
  { key: 'thyroid', label: 'Thyroid', critical: false, note: '' },
  { key: 'epilepsy', label: 'Epilepsy', critical: true, note: 'Seizure precautions' },
  { key: 'pregnancy', label: 'Pregnant / Nursing', critical: true, note: 'No X-rays; avoid certain drugs' },
  { key: 'hepatitis', label: 'Hepatitis B/C', critical: true, note: 'Enhanced sterilisation protocol' },
  { key: 'kidney', label: 'Kidney Disease', critical: true, note: 'Adjust drug dosage' },
  { key: 'bisphosphonate', label: 'Bisphosphonates', critical: true, note: 'MRONJ risk — avoid extraction' },
  { key: 'smoker', label: 'Smoker / Tobacco', critical: false, note: 'Screen for oral cancer; poor implant prognosis' },
  { key: 'none', label: 'None of these', critical: false, note: '' },
]

export const ALLERGY_OPTIONS = ['Penicillin', 'Sulpha drugs', 'Lignocaine / Local Anaesthetic', 'Latex', 'Iodine', 'Aspirin / NSAIDs', 'Metals (Nickel)']

export const CHIEF_COMPLAINTS = [
  'Tooth pain', 'Sensitivity to cold/hot', 'Swollen gums', 'Bleeding gums', 'Bad breath',
  'Broken / chipped tooth', 'Cavity / black spot', 'Loose tooth', 'Jaw pain / clicking',
  'Teeth cleaning', 'Crooked teeth', 'Teeth whitening', 'Denture problem', 'Routine check-up',
]

export const REFERRAL_SOURCES = ['Google Search', 'Google Maps', 'Friend / Family referral', 'Walk-in / Signboard', 'Instagram', 'WhatsApp forward', 'Existing patient', 'Insurance / Corporate tie-up']

/* ---------------- Consent templates ---------------- */
export const CONSENT_FORMS = [
  { id: 'c-general', name: 'General Treatment Consent', required: true,
    body: 'I authorise Sree Dental Care and its dentists to perform the dental examination, radiographs and treatment explained to me. I confirm the medical history I have provided is accurate and complete.' },
  { id: 'c-extract', name: 'Extraction Consent', required: false,
    body: 'I understand extraction may involve bleeding, swelling, bruising, infection, dry socket, injury to adjacent teeth, and in rare cases temporary or permanent numbness of the lip, chin or tongue.' },
  { id: 'c-rct', name: 'Root Canal Consent', required: false,
    body: 'I understand root canal treatment has a high but not guaranteed success rate, may require multiple visits, may need a crown afterwards, and that instrument separation or root fracture are known risks.' },
  { id: 'c-implant', name: 'Implant Surgery Consent', required: false,
    body: 'I understand implant placement is a surgical procedure with risks including infection, implant failure, sinus involvement and nerve injury, and that healing takes 3–6 months before the final crown.' },
  { id: 'c-ortho', name: 'Orthodontic Treatment Consent', required: false,
    body: 'I understand orthodontic treatment duration is an estimate, requires strict appointment compliance and oral hygiene, and that relapse can occur if retainers are not worn as instructed.' },
  { id: 'c-privacy', name: 'Data & Privacy Consent (DPDP Act)', required: true,
    body: 'I consent to Sree Dental Care storing my personal and health data for treatment and billing, and to receiving appointment, bill and recall messages on WhatsApp and SMS. I may withdraw consent at any time.' },
  { id: 'c-photo', name: 'Clinical Photography Consent', required: false,
    body: 'I consent to intra-oral and facial photographs being taken for my clinical record. Use for education or marketing requires my separate written permission.' },
]

/* ---------------- Post-op instruction sets ---------------- */
export const POSTOP = {
  extraction: ['Bite firmly on the gauze for 45 minutes', 'Do NOT spit, rinse or use a straw for 24 hours', 'Apply ice pack outside the cheek — 10 min on, 10 min off', 'Eat soft, cool food today. No hot/spicy food', 'No smoking or alcohol for 72 hours', 'Start warm salt-water rinses from tomorrow', 'Call us if bleeding does not stop or pain worsens after day 3'],
  rct: ['Avoid chewing on the treated tooth until the crown is fitted', 'Mild tenderness for 2–3 days is normal', 'Take the prescribed medicines as instructed', 'Return on the scheduled date — an incomplete RCT can fail', 'Crown must be placed within 2–3 weeks to prevent fracture'],
  scaling: ['Mild sensitivity for 3–5 days is normal', 'Use the desensitising paste twice daily', 'Avoid very hot or cold food for 48 hours', 'Brush twice daily with a soft brush and floss nightly', 'Return for cleaning every 6 months'],
  implant: ['Do not disturb the surgical site with tongue or fingers', 'Ice pack for the first 24 hours to control swelling', 'Soft diet for 1 week', 'No smoking — it is the leading cause of implant failure', 'Chlorhexidine rinse twice daily from day 2', 'Review appointment after 7 days for suture removal'],
  general: ['Brush twice daily for 2 minutes with fluoride toothpaste', 'Floss once daily before bed', 'Limit sugary snacks and aerated drinks', 'Routine check-up and cleaning every 6 months'],
}
