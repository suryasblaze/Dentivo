import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Badge, Eyebrow, Tile, DataRow, Seg, MetricBar, Blank, Modal, SectionHead,
} from '../components/UI'
import { useClinic } from '../store/ClinicStore'
import { PLANS, FEATURES, ADDONS, TRIAL_DAYS, planById } from '../data/plans'
import { inr, prettyDate } from '../lib/format'
import {
  IconCheck, IconX, IconArrowRight, IconAlert, IconSparkle, IconReceipt,
  IconUsers, IconChair, IconBranch, IconShield, IconPrint,
} from '../lib/icons'

const cap = (n) => (n === Infinity || n == null ? 'Unlimited' : n)

export default function Subscription() {
  const { sub, plan, trialLeft, onTrial, usage, staff, patients, chairs, dispatch, toast } = useClinic()
  const nav = useNavigate()
  const [cycle, setCycle] = useState(sub.billing || 'monthly')
  const [confirm, setConfirm] = useState(null)
  const [compare, setCompare] = useState(false)

  const price = (p) => (p.custom ? null : cycle === 'yearly' ? p.yearly : p.monthly)
  const saving = (p) => (p.custom || !p.monthly ? 0 : p.monthly * 12 - p.yearly)

  const choose = (p) => {
    if (p.custom) {
      toast('We will call you to scope an Enterprise plan')
      return setConfirm(null)
    }
    dispatch({ type: 'SET_PLAN', plan: p.id, billing: cycle })
    if (price(p) > 0) {
      dispatch({
        type: 'ADD_SUB_INVOICE',
        data: { plan: p.name, cycle, amount: price(p), status: 'paid' },
      })
    }
    toast(`Switched to ${p.name}`)
    setConfirm(null)
  }

  const limitRow = (label, used, allowed, Icon, tone) => {
    const pct = allowed === Infinity ? 8 : Math.min(100, (used / allowed) * 100)
    const over = allowed !== Infinity && used > allowed
    return (
      <div key={label} style={{ marginBottom: 4 }}>
        <div className="row" style={{ gap: 7, marginBottom: 3 }}>
          <Tile tone={over ? 'rose' : tone} size="sm"><Icon size={11} /></Tile>
          <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>{label}</span>
          <div className="spacer" />
          <span className="strong mono-num" style={{ fontSize: 'var(--fs-sm)', color: over ? 'var(--a-rose)' : 'var(--ink)' }}>
            {used} / {cap(allowed)}
          </span>
        </div>
        <div className="mbar-track">
          <div className="mbar-fill" style={{ width: `${pct}%`, background: over ? 'var(--a-rose)' : 'var(--g-600)' }} />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Eyebrow>Account</Eyebrow>
          <h1>Subscription</h1>
          <p>Your plan, what it includes, and what you are using</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setCompare(true)}>Compare all features</button>
        </div>
      </div>

      {/* ---------- current state ---------- */}
      <div className="grid g-main" style={{ marginBottom: 12 }}>
        <div className="card" style={{
          background: onTrial ? 'var(--dark)' : 'var(--g-600)', borderColor: 'transparent', color: '#fff',
          position: 'relative', overflow: 'hidden',
        }}>
          <div className="promo-glow" style={{ opacity: .3, width: 130, height: 130, right: -36, top: -50 }} />
          <div style={{ position: 'relative' }}>
            <div className="row" style={{ marginBottom: 8 }}>
              <span className="badge" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}>
                {onTrial ? 'Free trial' : sub.status === 'active' ? 'Active' : sub.status}
              </span>
              <div className="spacer" />
              {!onTrial && (
                <span style={{ fontSize: 'var(--fs-micro)', opacity: .7, fontWeight: 700 }}>
                  Billed {sub.billing}
                </span>
              )}
            </div>

            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1.1 }}>
              {plan.name}
            </div>
            <div style={{ fontSize: 'var(--fs-sm)', opacity: .75, marginBottom: 12 }}>{plan.tagline}</div>

            {onTrial ? (
              <>
                <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                  <span className="mono-num" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.05em' }}>
                    {trialLeft}
                  </span>
                  <span style={{ fontSize: 'var(--fs-sm)', opacity: .75, paddingBottom: 4 }}>
                    day{trialLeft === 1 ? '' : 's'} left of {TRIAL_DAYS}
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.18)', marginBottom: 12 }}>
                  <div style={{
                    width: `${(trialLeft / TRIAL_DAYS) * 100}%`, height: '100%', borderRadius: 3,
                    background: trialLeft <= 5 ? 'var(--a-amber)' : 'var(--g-400)',
                  }} />
                </div>
                <p style={{ fontSize: 'var(--fs-xs)', opacity: .7, lineHeight: 1.55, marginBottom: 12 }}>
                  {plan.note}
                </p>
                <button className="btn" style={{ background: '#fff', color: 'var(--dark)', width: '100%' }}
                  onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}>
                  Choose a plan <IconArrowRight size={13} />
                </button>
              </>
            ) : (
              <>
                <div className="mono-num" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.05em' }}>
                  {plan.custom ? 'Custom' : inr(sub.billing === 'yearly' ? plan.yearly : plan.monthly)}
                  {!plan.custom && (
                    <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, opacity: .6 }}>
                      {sub.billing === 'yearly' ? ' / year' : ' / month'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', opacity: .7, marginTop: 4 }}>
                  Started {prettyDate(sub.changedAt || sub.startedAt)}
                </div>
              </>
            )}
          </div>
        </div>

        <Card title="What you are using" sub="Against your plan limits">
          {limitRow('Staff logins', usage.users, plan.limits.users, IconUsers, 'blue')}
          {limitRow('Chairs', usage.chairs, plan.limits.chairs, IconChair, 'violet')}
          {limitRow('Patients', usage.patients, plan.limits.patients, IconUsers, 'green')}
          {limitRow('Branches', usage.branches, plan.limits.branches, IconBranch, 'amber')}
          <div className="divider-x" />
          <div className="faint" style={{ fontSize: 'var(--fs-micro)', lineHeight: 1.5 }}>
            Going over a limit never blocks you mid-treatment. We flag it here and ask you to
            upgrade at the end of the month.
          </div>
        </Card>
      </div>

      {/* ---------- plans ---------- */}
      <SectionHead title="Plans">
        <Seg value={cycle} onChange={setCycle} options={[
          { value: 'monthly', label: 'Monthly' },
          { value: 'yearly', label: 'Yearly — 2 months free' },
        ]} />
      </SectionHead>

      <div id="plans" className="plan-grid">
        {PLANS.filter(p => p.id !== 'trial').map(p => {
          const current = p.id === sub.plan
          return (
            <div key={p.id} className={`plan ${p.popular ? 'pop' : ''} ${current ? 'current' : ''}`}>
              {p.popular && <span className="plan-flag">Most chosen</span>}
              {current && <span className="plan-flag cur">Your plan</span>}

              <div className="plan-name">{p.name}</div>
              <div className="plan-tag">{p.tagline}</div>

              <div className="plan-price">
                {p.custom ? (
                  <span className="pp-num" style={{ fontSize: 22 }}>Let&apos;s talk</span>
                ) : (
                  <>
                    <span className="pp-num mono-num">{inr(price(p))}</span>
                    <span className="pp-per">/{cycle === 'yearly' ? 'year' : 'month'}</span>
                  </>
                )}
              </div>
              {!p.custom && cycle === 'yearly' && saving(p) > 0 && (
                <Badge tone="green" style={{ marginBottom: 8 }}>Save {inr(saving(p))}</Badge>
              )}
              {!p.custom && <div className="plan-gst">+ 18% GST</div>}

              <div className="plan-limits">
                {[['Branches', p.limits.branches], ['Chairs', p.limits.chairs],
                  ['Staff logins', p.limits.users], ['Patients', p.limits.patients]].map(([k, v]) => (
                  <div className="row" key={k} style={{ gap: 6 }}>
                    <span className="faint" style={{ fontSize: 'var(--fs-micro)', flex: 1 }}>{k}</span>
                    <span className="strong mono-num" style={{ fontSize: 'var(--fs-micro)' }}>{cap(v)}</span>
                  </div>
                ))}
              </div>

              {p.best && (
                <div className="plan-best">
                  {p.best.map(b => (
                    <div className="row" key={b} style={{ gap: 6, alignItems: 'flex-start' }}>
                      <IconCheck size={11} style={{ color: 'var(--g-600)', marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 'var(--fs-micro)', lineHeight: 1.45 }}>{b}</span>
                    </div>
                  ))}
                </div>
              )}

              <button className={`btn ${current ? 'btn-ghost' : p.popular ? 'btn-primary' : 'btn-ghost'} btn-block`}
                disabled={current} onClick={() => setConfirm(p)} style={{ marginTop: 'auto' }}>
                {current ? 'Current plan' : p.custom ? 'Request a quote' : 'Choose ' + p.name}
              </button>
            </div>
          )
        })}
      </div>

      {/* ---------- add-ons ---------- */}
      <SectionHead title="Add-ons" />
      <div className="grid g-3">
        {ADDONS.map(a => (
          <Card key={a.key} style={{ padding: 12 }}>
            <div className="row">
              <Tile tone="green"><IconSparkle size={12} /></Tile>
              <div style={{ minWidth: 0 }}>
                <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>{a.label}</div>
                <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>{a.per}</div>
              </div>
              <div className="spacer" />
              <span className="strong mono-num" style={{ fontSize: 'var(--fs-md)' }}>{inr(a.price)}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* ---------- invoices ---------- */}
      <SectionHead title="Billing history" />
      {(sub.invoices || []).length === 0 ? (
        <Blank icon={<IconReceipt size={20} />} title="No subscription invoices yet">
          While you are on the free trial there is nothing to pay.
        </Blank>
      ) : (
        <div className="panel">
          <div className="panel-body" style={{ paddingTop: 12 }}>
            <table className="tbl">
              <thead><tr><th>Date</th><th>Plan</th><th>Cycle</th>
                <th style={{ textAlign: 'right' }}>Amount</th><th>Status</th><th /></tr></thead>
              <tbody>
                {sub.invoices.map(i => (
                  <tr key={i.id}>
                    <td className="cell-strong">{prettyDate(i.date)}</td>
                    <td>{i.plan}</td>
                    <td className="faint">{i.cycle}</td>
                    <td className="cell-strong mono-num" style={{ textAlign: 'right' }}>{inr(i.amount)}</td>
                    <td><Badge tone="green"><IconCheck size={8} />{i.status}</Badge></td>
                    <td><button className="corner-btn"><IconPrint size={10} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------- confirm ---------- */}
      {confirm && (
        <Modal title={confirm.custom ? 'Request an Enterprise quote' : `Switch to ${confirm.name}`}
          sub={confirm.tagline} onClose={() => setConfirm(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button>
            <div className="spacer" />
            <button className="btn btn-primary" onClick={() => choose(confirm)}>
              <IconCheck size={13} /> {confirm.custom ? 'Request a call' : `Pay ${inr(price(confirm))}`}
            </button>
          </>}>
          {!confirm.custom && (
            <div className="lrow" style={{ marginBottom: 12, background: 'var(--g-50)', borderColor: 'var(--g-200)' }}>
              <Tile tone="green"><IconReceipt size={13} /></Tile>
              <div>
                <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>
                  {inr(price(confirm))} {cycle === 'yearly' ? 'per year' : 'per month'} + 18% GST
                </div>
                <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>
                  Cancel any time. Your data is never deleted on downgrade.
                </div>
              </div>
            </div>
          )}
          <div className="field" style={{ marginBottom: 7 }}><label>What this unlocks</label></div>
          <div className="chip-grid">
            {FEATURES.filter(f => confirm.features.includes(f.key)).map(f => (
              <Badge key={f.key} tone="green"><IconCheck size={8} />{f.label}</Badge>
            ))}
          </div>
          {FEATURES.some(f => !confirm.features.includes(f.key)) && (
            <>
              <div className="field" style={{ margin: '12px 0 7px' }}><label>Not included</label></div>
              <div className="chip-grid">
                {FEATURES.filter(f => !confirm.features.includes(f.key)).map(f => (
                  <Badge key={f.key}><IconX size={8} />{f.label}</Badge>
                ))}
              </div>
            </>
          )}
        </Modal>
      )}

      {/* ---------- full comparison ---------- */}
      {compare && (
        <Modal wide title="Feature comparison" sub="Everything, plan by plan" onClose={() => setCompare(false)}
          footer={<button className="btn btn-ghost" onClick={() => setCompare(false)}>Close</button>}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Feature</th>
                {PLANS.filter(p => p.id !== 'trial').map(p => (
                  <th key={p.id} style={{ textAlign: 'center' }}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map(f => (
                <tr key={f.key}>
                  <td>
                    <div className="cell-strong">{f.label}</div>
                    <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>{f.group}</div>
                  </td>
                  {PLANS.filter(p => p.id !== 'trial').map(p => (
                    <td key={p.id} style={{ textAlign: 'center' }}>
                      {p.features.includes(f.key)
                        ? <IconCheck size={13} style={{ color: 'var(--g-600)' }} />
                        : <IconX size={11} style={{ color: 'var(--line)' }} />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}

      <div className="lrow" style={{ marginTop: 14, alignItems: 'flex-start' }}>
        <IconShield size={14} style={{ color: 'var(--g-600)', marginTop: 1 }} />
        <div style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}>
          Prices exclude 18% GST. Cancel any time — on cancellation your data stays available
          for export for 90 days. Downgrading never deletes patient records; features simply
          stop appearing.
        </div>
      </div>
    </>
  )
}
