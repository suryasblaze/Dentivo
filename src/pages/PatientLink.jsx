import React, { useState } from 'react'
import { Card, Badge, Eyebrow, Tile, DataRow, Blank } from '../components/UI'
import { QRCode } from '../components/Visuals'
import { useClinic } from '../store/ClinicStore'
import { IconQr, IconCheck, IconPrint, IconArrowUpRight, IconPhone, IconFile } from '../lib/icons'
import { localISO } from '../lib/format'

export default function PatientLink() {
  const { clinic, submissions, toast } = useClinic()
  const [copied, setCopied] = useState(false)

  const url = `${window.location.origin}/intake`

  const copy = async () => {
    try { await navigator.clipboard.writeText(url) } catch { /* clipboard blocked */ }
    setCopied(true); toast('Link copied')
    setTimeout(() => setCopied(false), 1800)
  }

  const todaySubs = submissions.filter(s => s.date === localISO())

  return (
    <>
      <div className="page-head">
        <div>
          <Eyebrow>Step 1 · patient entry</Eyebrow>
          <h1>Patient Link / QR</h1>
          <p>Print this QR for the reception desk, or send the link on WhatsApp before the appointment</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><IconPrint size={12} /> Print</button>
          <a className="btn btn-primary btn-sm" href="/intake" target="_blank" rel="noreferrer">
            Open the form <IconArrowUpRight size={12} />
          </a>
        </div>
      </div>

      <div className="grid g-main">
        {/* ---------- The printable standee ---------- */}
        <Card>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <Badge tone="green" dot>Live — anyone with this link can submit</Badge>
            <h2 style={{ fontSize: 20, margin: '14px 0 4px' }}>Scan to register</h2>
            <p className="muted" style={{ fontSize: 'var(--fs-sm)', maxWidth: '38ch', margin: '0 auto' }}>
              Point your phone camera at the code. Fill in four things. That is it.
            </p>

            <div className="qr-box" style={{ margin: '18px auto' }}>
              <QRCode seed={url} size={146} />
            </div>

            <div className="row" style={{ justifyContent: 'center', gap: 6, marginBottom: 14 }}>
              <Badge tone="green">No app needed</Badge>
              <Badge tone="green">Under a minute</Badge>
              <Badge tone="green">Works on any phone</Badge>
            </div>

            <div className="row" style={{ maxWidth: 380, margin: '0 auto', gap: 6 }}>
              <input className="input mono-num" readOnly value={url} style={{ fontSize: 'var(--fs-sm)' }} />
              <button className="btn btn-primary btn-sm" onClick={copy} style={{ flexShrink: 0 }}>
                {copied ? <><IconCheck size={12} /> Copied</> : 'Copy'}
              </button>
            </div>
          </div>
        </Card>

        {/* ---------- Side ---------- */}
        <div className="col" style={{ gap: 10 }}>
          <Card title="What the patient fills in">
            <div style={{ margin: '0 -9px' }}>
              {[['Name', 'Full name'], ['Mobile', '10-digit number'],
                ['Gender', 'Female / Male / Other'], ['Problem', 'What brought them in']].map(([t, d]) => (
                <DataRow key={t} lead={<Tile tone="green"><IconCheck size={12} /></Tile>} title={t} sub={d} />
              ))}
            </div>
            <div className="divider-x" />
            <p className="faint" style={{ fontSize: 'var(--fs-xs)', lineHeight: 1.6 }}>
              Kept deliberately short. Everything else — medical history, address, consent —
              is captured at the desk when the record is created.
            </p>
          </Card>

          <Card title="Ways to share">
            <div style={{ margin: '0 -9px' }}>
              {[
                ['green', IconQr, 'Print the QR', 'Standee at the reception desk'],
                ['blue', IconPhone, 'Send on WhatsApp', 'When the appointment is booked'],
                ['violet', IconFile, 'Put it on your website', 'As a "Register" button'],
              ].map(([tone, Icon, t, d]) => (
                <DataRow key={t} lead={<Tile tone={tone}><Icon size={13} /></Tile>} title={t} sub={d} />
              ))}
            </div>
          </Card>

          <Card title="Submissions today" sub={`${todaySubs.length} received`}>
            {todaySubs.length === 0
              ? <Blank icon={<IconFile size={18} />} title="None yet">
                  Anything submitted through the link shows up here and under Submissions.
                </Blank>
              : <div style={{ margin: '0 -9px' }}>
                {todaySubs.slice(0, 5).map(s => (
                  <DataRow key={s.id} lead={<Tile tone="green"><IconFile size={12} /></Tile>}
                    title={s.name} sub={`${s.phone} · ${s.issue}`}
                    trail={<span className="faint" style={{ fontSize: 'var(--fs-micro)' }}>{s.time}</span>} />
                ))}
              </div>}
          </Card>
        </div>
      </div>
    </>
  )
}
