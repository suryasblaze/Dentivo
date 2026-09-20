import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Badge, Avatar, Eyebrow, Tile, DataRow, Modal, Field, Switch, Blank, SectionHead,
} from '../components/UI'
import { useClinic } from '../store/ClinicStore'
import { PERMISSIONS, ALL_PERMISSIONS } from '../data/plans'
import { ROLE_COLORS } from '../data/config'
import { NAV, ALL_PAGES, ALWAYS_ON } from '../data/nav'
import {
  IconPlus, IconX, IconCheck, IconShield, IconUsers, IconAlert, IconLock,
} from '../lib/icons'

export default function Roles() {
  const { roles, staff, hasFeature, dispatch, toast } = useClinic()
  const nav = useNavigate()
  const [sel, setSel] = useState(roles[0]?.id)
  const [add, setAdd] = useState(false)
  const [nf, setNf] = useState({ name: '', desc: '', perms: [] })

  const role = roles.find(r => r.id === sel) || roles[0]
  const inRole = (id) => staff.filter(s => s.roleId === id)

  const create = () => {
    const id = 'r' + Math.random().toString(36).slice(2, 8)
    dispatch({
      type: 'ADD_ROLE',
      data: { id, name: nf.name.trim(), desc: nf.desc.trim(), perms: nf.perms, color: ROLE_COLORS[roles.length % ROLE_COLORS.length] },
    })
    toast(`${nf.name} created`)
    setAdd(false); setNf({ name: '', desc: '', perms: [] }); setSel(id)
  }

  const locked = !hasFeature('roles')

  if (locked) {
    return (
      <>
        <div className="page-head">
          <div>
            <Eyebrow>Administration</Eyebrow>
            <h1>Roles & Permissions</h1>
            <p>Decide exactly what each person can see and do</p>
          </div>
        </div>
        <Blank icon={<IconLock size={20} />} title="Custom roles are on Professional and above"
          action={<button className="btn btn-primary btn-sm" onClick={() => nav('/subscription')}>
            See plans
          </button>}>
          On Starter everyone shares one access level. Upgrade to create roles like Reception,
          Dentist or Accounts and switch individual permissions on and off.
        </Blank>
      </>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Eyebrow>Administration</Eyebrow>
          <h1>Roles & Permissions</h1>
          <p>Switch on exactly what each role may do. Changes apply the moment you toggle them.</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setAdd(true)}>
            <IconPlus size={12} /> New role
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '248px minmax(0,1fr)', alignItems: 'start' }}>
        {/* ---------- role list ---------- */}
        <Card title="Roles" sub={`${roles.length} defined`}>
          <div style={{ margin: '0 -9px' }}>
            {roles.map(r => (
              <DataRow key={r.id} on={r.id === sel} onClick={() => setSel(r.id)}
                lead={<span className="tile" style={{ background: r.color + '22', color: r.color }}>
                  <IconShield size={13} />
                </span>}
                title={r.name}
                sub={`${r.perms.length} permission${r.perms.length === 1 ? '' : 's'} · ${inRole(r.id).length} staff`}
              />
            ))}
          </div>
        </Card>

        {/* ---------- permission editor ---------- */}
        <div className="col" style={{ gap: 10 }}>
          <Card>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <span className="tile lg" style={{ background: role.color + '22', color: role.color }}>
                <IconShield size={16} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="row" style={{ gap: 7 }}>
                  <h2 style={{ fontSize: 'var(--fs-lg)' }}>{role.name}</h2>
                  {role.system && <Badge>Built in</Badge>}
                </div>
                <div className="muted" style={{ fontSize: 'var(--fs-sm)' }}>{role.desc}</div>
              </div>
              <div className="spacer" />
              <div className="row" style={{ gap: 6 }}>
                <button className="btn btn-ghost btn-sm"
                  onClick={() => { dispatch({ type: 'UPDATE_ROLE', id: role.id, patch: { perms: ALL_PERMISSIONS } }); toast('All switched on') }}>
                  Allow all
                </button>
                <button className="btn btn-ghost btn-sm"
                  onClick={() => { dispatch({ type: 'UPDATE_ROLE', id: role.id, patch: { perms: [] } }); toast('All switched off') }}>
                  Clear
                </button>
                {!role.system && (
                  <button className="btn btn-danger btn-sm"
                    onClick={() => {
                      dispatch({ type: 'DELETE_ROLE', id: role.id })
                      setSel(roles[0]?.id); toast('Role deleted')
                    }}>
                    <IconX size={11} /> Delete
                  </button>
                )}
              </div>
            </div>

            {inRole(role.id).length > 0 && (
              <>
                <div className="divider-x" />
                <div className="row wrap" style={{ gap: 6 }}>
                  <span className="faint" style={{ fontSize: 'var(--fs-micro)', fontWeight: 700 }}>ON THIS ROLE</span>
                  {inRole(role.id).map(s => (
                    <Badge key={s.id}>
                      <Avatar name={s.name} initials={s.short} color={s.color} size={14} />{s.name}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* ---------- which side-navigation pages this role can open ---------- */}
          <Card title="Pages in the side menu"
            sub={`${(role.pages || ALL_PAGES).length} of ${ALL_PAGES.length} visible to this role`}
            actions={
              <div className="row" style={{ gap: 6 }}>
                <button className="btn btn-ghost btn-sm"
                  onClick={() => { dispatch({ type: 'UPDATE_ROLE', id: role.id, patch: { pages: ALL_PAGES } }); toast('All pages shown') }}>
                  Show all
                </button>
                <button className="btn btn-ghost btn-sm"
                  onClick={() => { dispatch({ type: 'UPDATE_ROLE', id: role.id, patch: { pages: ALWAYS_ON } }); toast('Minimum only') }}>
                  Minimum
                </button>
              </div>
            }>
            <p className="muted" style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.55, marginBottom: 10 }}>
              Switch a page off and it disappears from the side menu for everyone on this role.
              If they type the address directly they get a polite block instead.
            </p>

            {NAV.map(sec => (
              <div key={sec.label} style={{ marginBottom: 12 }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>{sec.label}</div>
                <div className="page-grid">
                  {sec.items.map(item => {
                    const pages = role.pages || ALL_PAGES
                    const on = pages.includes(item.key)
                    const forced = ALWAYS_ON.includes(item.key)
                    return (
                      <button key={item.key}
                        className={`page-toggle ${on ? 'on' : ''} ${forced ? 'locked' : ''}`}
                        disabled={forced}
                        onClick={() => dispatch({ type: 'TOGGLE_PAGE', id: role.id, page: item.key })}>
                        <item.Icon size={14} style={{ color: on ? 'var(--g-700)' : 'var(--faint)' }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="pt-l">{item.label}</div>
                          <div className="pt-s">{forced ? 'Always on' : on ? 'Visible' : 'Hidden'}</div>
                        </div>
                        <Switch on={on} onChange={() => !forced && dispatch({ type: 'TOGGLE_PAGE', id: role.id, page: item.key })} />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </Card>

          {PERMISSIONS.map(group => (
            <Card key={group.group} title={group.group}
              sub={`${group.items.filter(i => role.perms.includes(i.key)).length} of ${group.items.length} allowed`}>
              {group.items.map(item => {
                const on = role.perms.includes(item.key)
                const dangerous = ['data.reset', 'patients.delete', 'refund', 'roles', 'subscription'].includes(item.key)
                return (
                  <div className="row" key={item.key}
                    style={{ padding: '8px 0', borderBottom: '1px solid var(--line-2)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="row" style={{ gap: 6 }}>
                        <span className="strong" style={{ fontSize: 'var(--fs-base)' }}>{item.label}</span>
                        {dangerous && <Badge tone="red"><IconAlert size={8} />Sensitive</Badge>}
                      </div>
                      <div className="faint mono-num" style={{ fontSize: 'var(--fs-micro)' }}>{item.key}</div>
                    </div>
                    <div className="spacer" />
                    <Switch on={on} onChange={() => dispatch({ type: 'TOGGLE_PERM', id: role.id, perm: item.key })} />
                  </div>
                )
              })}
            </Card>
          ))}
        </div>
      </div>

      {/* ---------- assign staff ---------- */}
      <SectionHead title="Who has which role" />
      <Card>
        <div style={{ margin: '0 -9px' }}>
          {staff.map(s => {
            const r = roles.find(x => x.id === s.roleId)
            return (
              <DataRow key={s.id}
                lead={<Avatar name={s.name} initials={s.short} color={s.color} size={28} />}
                title={s.name} sub={s.email || s.role || 'No email'}
                trail={
                  <select className="select" style={{ width: 168, fontSize: 'var(--fs-sm)' }}
                    value={s.roleId || ''}
                    onChange={e => { dispatch({ type: 'UPDATE_STAFF', id: s.id, patch: { roleId: e.target.value } }); toast('Role changed') }}>
                    <option value="">No role — full access</option>
                    {roles.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                } />
            )
          })}
        </div>
        {staff.length <= 1 && (
          <>
            <div className="divider-x" />
            <div className="row">
              <IconUsers size={14} style={{ color: 'var(--muted)' }} />
              <span style={{ fontSize: 'var(--fs-sm)' }}>Add your team in Settings to assign roles.</span>
              <div className="spacer" />
              <button className="btn btn-ghost btn-sm" onClick={() => nav('/settings')}>Settings</button>
            </div>
          </>
        )}
      </Card>

      {/* ---------- new role ---------- */}
      {add && (
        <Modal wide title="Create a role" sub="Start empty and switch on what they need"
          onClose={() => setAdd(false)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setAdd(false)}>Cancel</button>
            <div className="spacer" />
            <button className="btn btn-primary" disabled={!nf.name.trim()} onClick={create}>
              <IconCheck size={13} /> Create role
            </button>
          </>}>
          <div className="grid g-2" style={{ marginBottom: 14 }}>
            <Field label="Role name">
              <input className="input" autoFocus value={nf.name} placeholder="e.g. Trainee, Lab technician"
                onChange={e => setNf(s => ({ ...s, name: e.target.value }))} />
            </Field>
            <Field label="Description">
              <input className="input" value={nf.desc} placeholder="What this role is for"
                onChange={e => setNf(s => ({ ...s, desc: e.target.value }))} />
            </Field>
          </div>

          {PERMISSIONS.map(g => (
            <div key={g.group} style={{ marginBottom: 12 }}>
              <div className="row" style={{ marginBottom: 6 }}>
                <span className="eyebrow" style={{ margin: 0 }}>{g.group}</span>
                <div className="spacer" />
                <button className="btn btn-ghost btn-sm"
                  onClick={() => setNf(s => ({
                    ...s,
                    perms: g.items.every(i => s.perms.includes(i.key))
                      ? s.perms.filter(p => !g.items.some(i => i.key === p))
                      : [...new Set([...s.perms, ...g.items.map(i => i.key)])],
                  }))}>
                  Toggle group
                </button>
              </div>
              <div className="chip-grid">
                {g.items.map(i => (
                  <button key={i.key} className={`chip ${nf.perms.includes(i.key) ? 'on' : ''}`}
                    onClick={() => setNf(s => ({
                      ...s,
                      perms: s.perms.includes(i.key) ? s.perms.filter(p => p !== i.key) : [...s.perms, i.key],
                    }))}>
                    {i.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Modal>
      )}
    </>
  )
}
