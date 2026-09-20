import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Field, Chip, Tabs, Eyebrow, Tile, ChipsWithOther } from '../../components/UI'
import { VisitStrip } from '../../components/Layout'
import Odontogram from '../../components/Odontogram'
import NoVisit from './NoVisit'
import { useClinic } from '../../store/ClinicStore'
import { MEDICAL_FLAGS, condLabel } from '../../data/catalog'
import { IconAlert, IconArrowRight, IconPlus } from '../../lib/icons'

const FINDINGS = [
  'Calculus deposits', 'Gingival inflammation', 'Bleeding on probing', 'Pocket depth > 4mm',
  'Tender on percussion', 'Mobility Grade I', 'Swelling', 'Food impaction', 'Defective filling',
]

const DIAGNOSES = [
  'Dental caries', 'Deep caries with pulp exposure', 'Irreversible pulpitis', 'Reversible pulpitis',
  'Apical periodontitis', 'Periapical abscess', 'Gingivitis', 'Periodontitis',
  'Pericoronitis', 'Sensitivity', 'Fractured restoration', 'Retained root', 'Malocclusion',
]

export default function Consultation() {
  const { visit, patient, dispatch, nextStage, toast } = useClinic()
  const nav = useNavigate()
  const [tab, setTab] = useState('chart')

  if (!visit || !patient) return <NoVisit stage="Consultation" />

  const findings = visit.findings || []
  const dx = visit.diagnosis || []
  const alerts = (patient.medical || []).filter(m => m !== 'none')
  const charted = Object.keys(visit.teeth || {})

  const toggle = (key, list, v) =>
    dispatch({ type: 'PATCH_VISIT', patch: { [key]: list.includes(v) ? list.filter(x => x !== v) : [...list, v] } })

  const go = () => {
    if (!dx.length) return toast('Record at least one diagnosis')
    nextStage(); nav('/treatment')
  }

  return (
    <>
      <VisitStrip />

      <div className="page-head">
        <div>
          <Eyebrow>Step 6 · dentist</Eyebrow>
          <h1>Consultation</h1>
          <p>Chart what you see, record the diagnosis. It drives the treatment plan.</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-primary btn-sm" disabled={!dx.length} onClick={go}>
            Treatment plan <IconArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* alerts */}
      {(alerts.length > 0 || (patient.allergies || []).length > 0) && (
        <div className="lrow" style={{
          marginBottom: 10, alignItems: 'flex-start',
          background: 'var(--a-rose-bg)', borderColor: 'rgba(201,63,74,.2)',
        }}>
          <IconAlert size={14} style={{ color: 'var(--a-rose)', marginTop: 1 }} />
          <div>
            <div className="strong" style={{ fontSize: 'var(--fs-base)', color: 'var(--a-rose)' }}>Clinical alerts</div>
            <div className="chip-grid" style={{ marginTop: 4 }}>
              {alerts.map(k => {
                const m = MEDICAL_FLAGS.find(x => x.key === k)
                return <Badge key={k} tone="red">{m?.label || k}</Badge>
              })}
              {(patient.allergies || []).map(a => <Badge key={a} tone="red">No {a}</Badge>)}
            </div>
          </div>
        </div>
      )}

      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'chart', label: 'Dental chart', count: charted.length || null },
        { key: 'exam', label: 'Findings & diagnosis', count: dx.length || null },
        { key: 'notes', label: 'Notes' },
      ]} />

      {tab === 'chart' && (
        <div className="fade-up">
          <Odontogram marks={{ ...(patient.teeth || {}), ...(visit.teeth || {}) }}
            onMark={(t, c) => dispatch({ type: 'SET_TOOTH', tooth: t, cond: c })} />
          {charted.length > 0 && (
            <Card style={{ marginTop: 10 }} title="Charted this visit">
              <div className="chip-grid">
                {Object.entries(visit.teeth).map(([t, c]) => (
                  <Badge key={t} tone="dark">{t} · {condLabel(c)}</Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === 'exam' && (
        <div className="col fade-up" style={{ gap: 10 }}>
          <Card title="Examination findings" sub="Not listed? Use Other and type it">
            <ChipsWithOther options={FINDINGS} value={findings}
              placeholder="e.g. Attrition on 16, 17"
              onChange={v => dispatch({ type: 'PATCH_VISIT', patch: { findings: v } })} />
          </Card>
          <Card title="Diagnosis" sub="Required before moving to treatment. Use Other for anything not listed.">
            <ChipsWithOther options={DIAGNOSES} value={dx}
              placeholder="e.g. Cracked tooth syndrome 46"
              onChange={v => dispatch({ type: 'PATCH_VISIT', patch: { diagnosis: v } })} />
          </Card>
        </div>
      )}

      {tab === 'notes' && (
        <Card className="fade-up" title="Clinical notes">
          <textarea className="textarea" value={visit.notes || ''} style={{ minHeight: 110 }}
            placeholder="What the patient reported, what you observed, what you advised…"
            onChange={e => dispatch({ type: 'PATCH_VISIT', patch: { notes: e.target.value } })} />
          <div className="chip-grid" style={{ marginTop: 8 }}>
            {['Percussion +ve', 'Cold test lingering', 'No mobility', 'Vitality −ve', 'Advised RCT', 'Advised extraction'].map(s => (
              <button key={s} className="chip"
                onClick={() => dispatch({ type: 'PATCH_VISIT', patch: { notes: (visit.notes ? visit.notes + '. ' : '') + s } })}>
                <IconPlus size={10} />{s}
              </button>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}
