import React, { useState } from 'react'
import './rf.css'
import { completeVisit } from './engine'
import { loadRF, saveRF } from './store'
import { IconCheck } from '../lib/icons'

/* =========================================================================
   The optional QR fallback: patient scans at the desk, types name and
   mobile, done. The same automation then takes over.
   ========================================================================= */
export default function Scan() {
  const [clinic] = useState(() => loadRF().clinic)
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [done, setDone] = useState(false)
  const valid = name.trim() && mobile.replace(/\D/g, '').length >= 10

  const submit = (e) => {
    e.preventDefault()
    if (!valid) return
    const s = loadRF()   // re-read: the dashboard may have changed it
    saveRF(completeVisit(s, { name: name.trim(), mobile, doctor: s.clinic.doctors[0] || s.clinic.doctor, visitType: 'QR check-out' }, s.now).state)
    setDone(true)
  }

  return (
    <div className="rf rf-scan">
      <div className="rf-card">
        <div className="rf-clogo">{clinic.initials}</div>
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div className="rf-done" style={{ margin: '4px auto 12px' }}><IconCheck size={26} /></div>
            <h2 style={{ fontSize: 20, margin: '0 0 6px' }}>Done, thank you!</h2>
            <p className="rf-muted" style={{ lineHeight: 1.55 }}>{clinic.name} will send you a short WhatsApp message to share your feedback.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2 style={{ fontSize: 20, textAlign: 'center', margin: '0 0 4px' }}>Share your feedback</h2>
            <p className="rf-muted" style={{ textAlign: 'center', margin: '0 0 18px' }}>{clinic.name} · takes 5 seconds</p>
            <div className="rf-field"><label>Your name</label><input className="rf-in" value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
            <div className="rf-field"><label>Mobile number</label><input className="rf-in" inputMode="tel" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="98400 12345" /></div>
            <button className="rf-btn pri lg block" disabled={!valid}>Done</button>
            <p className="rf-faint" style={{ textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>Used only to send you one feedback message. Reply STOP any time.</p>
          </form>
        )}
      </div>
    </div>
  )
}
