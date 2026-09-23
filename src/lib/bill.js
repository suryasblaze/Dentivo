/* Money maths for one visit — shared by checkout, the patient bill link,
   the PDF and the Reviews page, so every screen shows the same numbers. */
export function billOf(visit) {
  const done = visit ? (visit.plan || []).filter(p => p.status === 'done') : []
  const subtotal = done.reduce((s, l) => s + Number(l.price || 0), 0)
  const discount = Number(visit?.discount || 0)
  const taxable = done.filter(l => l.gst > 0).reduce((s, l) => s + Number(l.price || 0), 0)
  const gstAmt = Math.round(taxable * 0.18)
  const total = Math.max(0, subtotal - discount + gstAmt)
  const paid = (visit?.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0)
  const due = Math.max(0, total - paid)
  return { done, subtotal, discount, gstAmt, total, paid, due }
}

/* Ask for a Google review only when the treatment is finished. Asking after
   the first sitting of a root canal, while the tooth still aches, gets the
   worst reviews a clinic will ever receive. */
export const treatmentComplete = (visit) =>
  !(visit?.plan || []).some(p => p.status !== 'done' && p.status !== 'declined')
