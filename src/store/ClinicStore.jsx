import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect } from 'react'
import { DEFAULT_CLINIC, DEFAULT_STAFF, DEFAULT_CHAIRS, VISIT_STAGES } from '../data/config'
import { DEFAULT_ROLES, TRIAL_DAYS, planById, ALL_PERMISSIONS } from '../data/plans'
import { ROLE_PAGES, ALL_PAGES, ALWAYS_ON } from '../data/nav'
import { KEY, load, save, appendSubmission, setRev } from './persist'

/* ---------------------------------------------------------------
   The shape of a brand-new account. Empty of clinic data — every
   patient, visit and invoice below is created by using the app.
   --------------------------------------------------------------- */
const EMPTY = {
  user: null,
  clinic: DEFAULT_CLINIC,
  staff: DEFAULT_STAFF.map(x => ({ ...x, roleId: 'r_admin' })),
  chairs: DEFAULT_CHAIRS,
  roles: DEFAULT_ROLES.map(r => ({ ...r, pages: ROLE_PAGES[r.id] || ALL_PAGES })),
  subscription: {
    plan: 'trial',
    startedAt: new Date().toISOString().slice(0, 10),
    billing: 'monthly',
    status: 'trialing',
    invoices: [],
  },
  featureRequests: [],
  submissions: [],   // from the public link
  patients: [],
  appointments: [],
  visits: [],        // one per check-in; carries the whole clinical + money record
  activeVisitId: null,
  seq: { uhid: 0, token: 0, invoice: 0, receipt: 0 },
  toasts: [],
}

const pad = (n, w = 4) => String(n).padStart(w, '0')
const today = () => new Date().toISOString().slice(0, 10)
const now = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
const uid = (p) => p + Math.random().toString(36).slice(2, 9)

const blankVisit = (patientId, extra = {}) => ({
  id: uid('v'),
  patientId,
  date: today(),
  arrivedAt: now(),
  stage: 'checkin',
  doctorId: null,
  chairId: null,
  visitType: 'Walk-in',
  reason: '',
  token: null,
  // clinical
  teeth: {},
  findings: [],
  diagnosis: [],
  notes: '',
  plan: [],          // [{code,name,tooth,price,gst,mins,status}]
  rx: [],
  postOp: '',
  nextVisit: '',
  // money
  invoice: null,     // {no,date,subtotal,discount,gst,total}
  discount: 0,
  payments: [],
  receiptNo: null,
  // after
  whatsappSent: false,
  rating: 0,
  reviewRoute: null,
  reviewText: '',
  privateFeedback: '',
  ...extra,
})

function reducer(s, a) {
  switch (a.type) {
    /* ---------- auth ---------- */
    case 'LOGIN': return { ...s, user: s.staff.find(x => x.id === a.id) || s.staff[0] }
    case 'LOGOUT': return { ...s, user: null }

    /* ---------- public intake link ---------- */
    case 'SUBMIT_INTAKE':
      return {
        ...s,
        submissions: [a.prebuilt || {
          id: uid('s'), ...a.data, at: new Date().toISOString(),
          date: today(), time: now(), status: 'new',
        }, ...s.submissions],
      }
    case 'DISMISS_SUBMISSION':
      return { ...s, submissions: s.submissions.map(x => x.id === a.id ? { ...x, status: 'dismissed' } : x) }

    /* ---------- patients ---------- */
    case 'ADD_PATIENT': {
      const n = s.seq.uhid + 1
      const p = {
        id: uid('p'),
        uhid: `P-${pad(n)}`,
        createdAt: today(),
        visits: 0,
        balance: 0,
        teeth: {},
        medical: [],
        allergies: [],
        ...a.data,
      }
      return {
        ...s,
        seq: { ...s.seq, uhid: n },
        patients: [p, ...s.patients],
        submissions: a.fromSubmission
          ? s.submissions.map(x => x.id === a.fromSubmission ? { ...x, status: 'converted', patientId: p.id } : x)
          : s.submissions,
        lastPatientId: p.id,
      }
    }
    case 'UPDATE_PATIENT':
      return { ...s, patients: s.patients.map(p => p.id === a.id ? { ...p, ...a.patch } : p) }
    case 'DELETE_PATIENT':
      return { ...s, patients: s.patients.filter(p => p.id !== a.id) }

    /* ---------- appointments ---------- */
    case 'ADD_APPOINTMENT':
      return { ...s, appointments: [...s.appointments, { id: uid('a'), status: 'scheduled', ...a.data }] }
    case 'UPDATE_APPOINTMENT':
      return { ...s, appointments: s.appointments.map(x => x.id === a.id ? { ...x, ...a.patch } : x) }
    case 'DELETE_APPOINTMENT':
      return { ...s, appointments: s.appointments.filter(x => x.id !== a.id) }

    /* ---------- visits (the workflow) ---------- */
    case 'CHECK_IN': {
      const n = s.seq.token + 1
      const v = blankVisit(a.patientId, { ...a.data, token: `T-${pad(n, 2)}` })
      return {
        ...s,
        seq: { ...s.seq, token: n },
        visits: [v, ...s.visits],
        activeVisitId: v.id,
        patients: s.patients.map(p => p.id === a.patientId
          ? { ...p, visits: (p.visits || 0) + 1, lastVisit: today() } : p),
        appointments: a.appointmentId
          ? s.appointments.map(x => x.id === a.appointmentId ? { ...x, status: 'arrived' } : x)
          : s.appointments,
      }
    }
    case 'SET_ACTIVE_VISIT': return { ...s, activeVisitId: a.id }
    case 'PATCH_VISIT':
      return { ...s, visits: s.visits.map(v => v.id === (a.id || s.activeVisitId) ? { ...v, ...a.patch } : v) }
    case 'SET_STAGE':
      return { ...s, visits: s.visits.map(v => v.id === (a.id || s.activeVisitId) ? { ...v, stage: a.stage } : v) }

    case 'SET_TOOTH': {
      const id = a.id || s.activeVisitId
      return {
        ...s,
        visits: s.visits.map(v => {
          if (v.id !== id) return v
          const t = { ...v.teeth }
          if (a.cond === 'healthy') delete t[a.tooth]; else t[a.tooth] = a.cond
          return { ...v, teeth: t }
        }),
      }
    }

    case 'PLAN_ADD':
      return { ...s, visits: s.visits.map(v => v.id === s.activeVisitId ? { ...v, plan: [...v.plan, a.item] } : v) }
    case 'PLAN_PATCH':
      return {
        ...s, visits: s.visits.map(v => v.id === s.activeVisitId
          ? { ...v, plan: v.plan.map((p, i) => i === a.index ? { ...p, ...a.patch } : p) } : v),
      }
    case 'PLAN_REMOVE':
      return {
        ...s, visits: s.visits.map(v => v.id === s.activeVisitId
          ? { ...v, plan: v.plan.filter((_, i) => i !== a.index) } : v),
      }

    case 'MAKE_INVOICE': {
      const n = s.seq.invoice + 1
      return {
        ...s,
        seq: { ...s.seq, invoice: n },
        visits: s.visits.map(v => v.id === s.activeVisitId
          ? { ...v, invoice: { no: `INV-${pad(n)}`, date: today(), ...a.invoice } } : v),
      }
    }
    case 'ADD_PAYMENT':
      return {
        ...s, visits: s.visits.map(v => v.id === s.activeVisitId
          ? { ...v, payments: [...v.payments, { ...a.payment, at: now() }] } : v),
      }
    case 'REMOVE_PAYMENT':
      return {
        ...s, visits: s.visits.map(v => v.id === s.activeVisitId
          ? { ...v, payments: v.payments.filter((_, i) => i !== a.index) } : v),
      }
    case 'SETTLE': {
      const n = s.seq.receipt + 1
      const visit = s.visits.find(v => v.id === s.activeVisitId)
      const total = visit?.invoice?.total || 0
      const paid = (visit?.payments || []).reduce((x, p) => x + Number(p.amount || 0), 0)
      const due = Math.max(0, total - paid)
      return {
        ...s,
        seq: { ...s.seq, receipt: n },
        visits: s.visits.map(v => v.id === s.activeVisitId ? { ...v, receiptNo: `RCP-${pad(n)}` } : v),
        patients: s.patients.map(p => p.id === visit?.patientId ? { ...p, balance: (p.balance || 0) + due } : p),
      }
    }

    case 'CLOSE_VISIT': {
      const visit = s.visits.find(v => v.id === s.activeVisitId)
      return {
        ...s,
        visits: s.visits.map(v => v.id === s.activeVisitId ? { ...v, stage: 'done', closedAt: now() } : v),
        /* fold the visit's charting into the patient's permanent chart */
        patients: s.patients.map(p => p.id === visit?.patientId
          ? { ...p, teeth: { ...(p.teeth || {}), ...(visit?.teeth || {}) } } : p),
        activeVisitId: null,
      }
    }

    /* ---------- settings ---------- */
    case 'SET_CLINIC': return { ...s, clinic: { ...s.clinic, ...a.patch } }
    case 'ADD_STAFF': return { ...s, staff: [...s.staff, { id: uid('u'), ...a.data }] }
    case 'UPDATE_STAFF': return { ...s, staff: s.staff.map(x => x.id === a.id ? { ...x, ...a.patch } : x) }
    case 'DELETE_STAFF': return { ...s, staff: s.staff.filter(x => x.id !== a.id) }
    case 'ADD_CHAIR': return { ...s, chairs: [...s.chairs, { id: uid('c'), ...a.data }] }
    case 'DELETE_CHAIR': return { ...s, chairs: s.chairs.filter(x => x.id !== a.id) }

    /* ---------- roles ---------- */
    case 'ADD_ROLE':
      return { ...s, roles: [...s.roles, { id: uid('r'), perms: [], pages: ALWAYS_ON, ...a.data }] }
    case 'UPDATE_ROLE':
      return { ...s, roles: s.roles.map(r => r.id === a.id ? { ...r, ...a.patch } : r) }
    case 'DELETE_ROLE':
      return {
        ...s,
        roles: s.roles.filter(r => r.id !== a.id),
        staff: s.staff.map(x => x.roleId === a.id ? { ...x, roleId: 'r_reception' } : x),
      }
    case 'TOGGLE_PAGE':
      return {
        ...s,
        roles: s.roles.map(r => {
          if (r.id !== a.id) return r
          if (ALWAYS_ON.includes(a.page)) return r          // cannot be switched off
          const pages = r.pages || ALL_PAGES
          const has = pages.includes(a.page)
          return { ...r, pages: has ? pages.filter(x => x !== a.page) : [...pages, a.page] }
        }),
      }
    case 'TOGGLE_PERM':
      return {
        ...s,
        roles: s.roles.map(r => {
          if (r.id !== a.id) return r
          const has = r.perms.includes(a.perm)
          return { ...r, perms: has ? r.perms.filter(x => x !== a.perm) : [...r.perms, a.perm] }
        }),
      }

    /* ---------- subscription ---------- */
    case 'SET_PLAN':
      return {
        ...s,
        subscription: {
          ...s.subscription,
          plan: a.plan,
          billing: a.billing || s.subscription.billing,
          status: a.plan === 'trial' ? 'trialing' : 'active',
          changedAt: today(),
        },
      }
    case 'ADD_SUB_INVOICE':
      return {
        ...s,
        subscription: {
          ...s.subscription,
          invoices: [{ id: uid('si'), date: today(), ...a.data }, ...(s.subscription.invoices || [])],
        },
      }

    /* ---------- feature requests ---------- */
    case 'ADD_REQUEST':
      return {
        ...s,
        featureRequests: [{
          id: 'FR-' + String((s.featureRequests?.length || 0) + 1).padStart(3, '0'),
          stage: 'submitted', createdAt: today(), ...a.data,
        }, ...(s.featureRequests || [])],
      }
    case 'UPDATE_REQUEST':
      return {
        ...s,
        featureRequests: s.featureRequests.map(r => r.id === a.id ? { ...r, ...a.patch } : r),
      }
    case 'DELETE_REQUEST':
      return { ...s, featureRequests: s.featureRequests.filter(r => r.id !== a.id) }

    case 'RESET_ALL': return { ...EMPTY, user: s.user }

    /* another browser tab wrote to storage — adopt it, keep our own session */
    case 'SYNC': {
      if (Number(a.state?.rev || 0) < Number(s.rev || 0)) return s   // ignore stale
      return { ...a.state, user: s.user, toasts: s.toasts, activeVisitId: s.activeVisitId }
    }

    /* ---------- toasts ---------- */
    case 'TOAST': return { ...s, toasts: [...s.toasts, { id: a.id, text: a.text }] }
    case 'UNTOAST': return { ...s, toasts: s.toasts.filter(t => t.id !== a.id) }

    default: return s
  }
}

const Ctx = createContext(null)

export function ClinicProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => load(EMPTY))

  /* The public intake page is read-mostly. It must never write the whole
     store back, or a long-open tab would erase work done in the admin tab. */
  const publicOnly = typeof window !== 'undefined' && window.location.pathname.startsWith('/intake')

  useEffect(() => { if (!publicOnly) save(state) }, [state, publicOnly])

  /* The public intake page usually runs in a second tab. This keeps both in sync. */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== KEY || !e.newValue) return
      try {
        const incoming = JSON.parse(e.newValue)
        setRev(incoming.rev)                 // <- without this the tab could never save again
        dispatch({ type: 'SYNC', state: incoming })
      } catch { /* ignore bad payload */ }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toast = useCallback((text) => {
    const id = Date.now() + Math.random()
    dispatch({ type: 'TOAST', text, id })
    setTimeout(() => dispatch({ type: 'UNTOAST', id }), 2600)
  }, [])

  /* Used by the public form. Writes straight to storage, then updates
     this tab so the thank-you screen can show what was sent. */
  const submitIntake = useCallback((data) => {
    const sub = {
      id: 's' + Math.random().toString(36).slice(2, 9),
      ...data,
      at: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      status: 'new',
    }
    appendSubmission(sub)
    dispatch({ type: 'SUBMIT_INTAKE', data, prebuilt: sub })
    return sub
  }, [])

  const value = useMemo(() => {
    const visit = state.visits.find(v => v.id === state.activeVisitId) || null
    const patient = visit ? state.patients.find(p => p.id === visit.patientId) : null

    /* money maths shared by billing / payment / whatsapp */
    const done = visit ? visit.plan.filter(p => p.status === 'done') : []
    const subtotal = done.reduce((s, l) => s + Number(l.price || 0), 0)
    const discount = Number(visit?.discount || 0)
    const taxable = done.filter(l => l.gst > 0).reduce((s, l) => s + Number(l.price || 0), 0)
    const gstAmt = Math.round(taxable * 0.18)
    const total = Math.max(0, subtotal - discount + gstAmt)
    const paid = (visit?.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0)
    const due = Math.max(0, total - paid)

    const nextStage = () => {
      if (!visit) return
      const i = VISIT_STAGES.indexOf(visit.stage)
      if (i < VISIT_STAGES.length - 1) dispatch({ type: 'SET_STAGE', stage: VISIT_STAGES[i + 1] })
    }

    /* ---------- subscription maths ---------- */
    const sub = state.subscription || { plan: 'trial', startedAt: today() }
    const plan = planById(sub.plan)
    const started = new Date(sub.startedAt || today())
    const daysUsed = Math.floor((Date.now() - started.getTime()) / 86400000)
    const trialLeft = Math.max(0, TRIAL_DAYS - daysUsed)
    const onTrial = sub.plan === 'trial'
    const trialOver = onTrial && trialLeft === 0

    const usage = {
      users: state.staff.length,
      patients: state.patients.length,
      chairs: state.chairs.length,
      branches: 1,
    }

    /* ---------- what the signed-in user may do ---------- */
    const role = state.roles?.find(r => r.id === state.user?.roleId)
    const perms = role ? role.perms : ALL_PERMISSIONS          // no role set = full access
    const can = (key) => {
      if (trialOver) return key === 'subscription'             // lock the app when the trial ends
      if (!key) return true
      return perms.includes(key)
    }
    const hasFeature = (key) => plan.features.includes(key)
    const allowedPages = role ? (role.pages || ALL_PAGES) : ALL_PAGES
    const canOpen = (pageKey) => !pageKey || allowedPages.includes(pageKey)

    return {
      ...state, dispatch, toast, visit, patient, nextStage, submitIntake,
      plan, sub, trialLeft, onTrial, trialOver, usage, can, hasFeature, role, canOpen, allowedPages,
      bill: { done, subtotal, discount, gstAmt, total, paid, due },
      isEmpty: state.patients.length === 0 && state.submissions.length === 0,
    }
  }, [state, toast, submitIntake])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useClinic = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useClinic must be used inside <ClinicProvider>')
  return c
}
