/* =========================================================================
   The bill as a real PDF, built in the browser.

   Note on the rupee sign: jsPDF's built-in fonts cannot draw "₹", so the PDF
   uses "Rs." — the same convention most Indian printed bills already use.
   ========================================================================= */
import { jsPDF } from 'jspdf'
import { prettyDate } from './format'

const rs = (n) => 'Rs. ' + Math.round(Number(n) || 0).toLocaleString('en-IN')

const INK = [34, 48, 58]       // --ink
const MUTED = [108, 116, 128]  // --muted
const GREEN = [25, 126, 101]   // --g-600
const LINE = [230, 232, 235]   // --line

export function billPdf({ clinic, patient, visit, bill, reviewUrl }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 44
  let y = M

  const text = (t, x, yy, { size = 10, color = INK, bold = false, align = 'left' } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    doc.text(String(t ?? ''), x, yy, { align })
  }
  const rule = (yy, color = LINE) => { doc.setDrawColor(...color); doc.setLineWidth(0.8); doc.line(M, yy, W - M, yy) }

  /* ---------- header ---------- */
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, W, 6, 'F')

  text(clinic?.name || 'Dental Clinic', M, y + 14, { size: 17, bold: true })
  const addr = [clinic?.address, clinic?.phone, clinic?.gstin ? 'GSTIN ' + clinic.gstin : '']
    .filter(Boolean).join('   ·   ')
  if (addr) text(addr, M, y + 30, { size: 8.5, color: MUTED })

  text('TAX INVOICE', W - M, y + 12, { size: 8.5, color: GREEN, bold: true, align: 'right' })
  text(visit?.invoice?.no || '-', W - M, y + 28, { size: 13, bold: true, align: 'right' })
  text(prettyDate(visit?.invoice?.date || visit?.date), W - M, y + 42, { size: 9, color: MUTED, align: 'right' })

  y += 62
  rule(y)

  /* ---------- bill to ---------- */
  y += 20
  text('BILL TO', M, y, { size: 7.5, color: MUTED, bold: true })
  text('VISIT', W / 2 + 20, y, { size: 7.5, color: MUTED, bold: true })
  y += 15
  text(patient?.name || '-', M, y, { size: 11.5, bold: true })
  text(`Token ${visit?.token || '-'}`, W / 2 + 20, y, { size: 10.5 })
  y += 14
  text([patient?.uhid, patient?.phone].filter(Boolean).join('   ·   '), M, y, { size: 9, color: MUTED })
  if (visit?.reason) text(visit.reason, W / 2 + 20, y, { size: 9, color: MUTED })

  /* ---------- line items ---------- */
  y += 28
  doc.setFillColor(248, 249, 250)
  doc.rect(M, y - 13, W - M * 2, 22, 'F')
  text('PROCEDURE', M + 8, y + 2, { size: 7.5, color: MUTED, bold: true })
  text('TOOTH', W - M - 150, y + 2, { size: 7.5, color: MUTED, bold: true })
  text('AMOUNT', W - M - 8, y + 2, { size: 7.5, color: MUTED, bold: true, align: 'right' })
  y += 22

  const items = bill?.done || []
  if (!items.length) {
    text('No procedures recorded.', M + 8, y + 4, { size: 10, color: MUTED })
    y += 22
  }
  items.forEach(it => {
    const name = doc.splitTextToSize(it.name || '', W - M * 2 - 190)
    text(name[0], M + 8, y + 4, { size: 10 })
    if (name[1]) text(name[1], M + 8, y + 16, { size: 10 })
    text(it.tooth && it.tooth !== '—' ? it.tooth : '-', W - M - 150, y + 4, { size: 10, color: MUTED })
    text(rs(it.price), W - M - 8, y + 4, { size: 10, bold: true, align: 'right' })
    y += name[1] ? 30 : 22
    rule(y - 8)
  })

  /* ---------- totals ---------- */
  y += 8
  const tx = W - M - 200
  const row = (label, value, opts = {}) => {
    text(label, tx, y, { size: opts.size || 9.5, color: opts.labelColor || MUTED, bold: opts.bold })
    text(value, W - M - 8, y, { size: opts.size || 9.5, color: opts.color || INK, bold: opts.bold ?? true, align: 'right' })
    y += opts.gap || 17
  }
  row('Subtotal', rs(bill?.subtotal))
  if (bill?.discount > 0) row('Discount', '- ' + rs(bill.discount))
  if (bill?.gstAmt > 0) row('GST 18%', rs(bill.gstAmt))
  doc.setDrawColor(...INK); doc.setLineWidth(1); doc.line(tx, y - 7, W - M, y - 7)
  y += 6
  row('Total', rs(bill?.total), { size: 12, labelColor: INK, bold: true, gap: 20 })
  row('Paid', rs(bill?.paid), { color: GREEN })
  if ((bill?.due || 0) > 0) row('Balance due', rs(bill.due), { color: [201, 63, 74] })

  /* ---------- payments ---------- */
  const pays = visit?.payments || []
  if (pays.length) {
    y += 10
    text('PAYMENTS RECEIVED', M, y, { size: 7.5, color: MUTED, bold: true })
    y += 14
    pays.forEach(p => {
      text(`${p.mode}${p.ref && p.ref !== p.mode ? '  ·  ' + p.ref : ''}`, M, y, { size: 9 })
      text(rs(p.amount), M + 260, y, { size: 9, bold: true })
      y += 14
    })
  }

  /* ---------- prescription ---------- */
  const rx = visit?.rx || []
  if (rx.length) {
    y += 12
    text('PRESCRIPTION', M, y, { size: 7.5, color: MUTED, bold: true })
    y += 14
    rx.forEach((d, i) => {
      text(`${i + 1}.  ${d.name}  —  ${d.dose}, ${d.days} days`, M, y, { size: 9 })
      y += 13
    })
  }

  if (visit?.nextVisit) {
    y += 10
    text(`Next visit: ${visit.nextVisit}`, M, y, { size: 9.5, bold: true, color: GREEN })
    y += 14
  }

  /* ---------- footer ---------- */
  const fy = doc.internal.pageSize.getHeight() - 70
  rule(fy)
  text('Thank you for visiting us.', M, fy + 20, { size: 10.5, bold: true })
  if (reviewUrl) {
    /* the full link can be very long (it carries the Google URL inside it),
       so show a short label and put the real address behind it */
    text('How did we do?', M, fy + 36, { size: 9, color: MUTED })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...GREEN)
    doc.textWithLink('Rate your visit — takes 10 seconds  >', M + 68, fy + 36, { url: reviewUrl })
  }
  text('Generated by Dentivo', W - M, fy + 36, { size: 8, color: MUTED, align: 'right' })

  const file = `${(visit?.invoice?.no || 'bill').replace(/[^\w-]/g, '')}-${(patient?.name || 'patient').replace(/\s+/g, '-')}.pdf`
  return { blob: doc.output('blob'), file, doc }
}
