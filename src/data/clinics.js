/* =========================================================================
   Clinics that have a short review link.

   A review ask needs only two things — the clinic's name and its Google
   review URL — and they are the same for every patient. So they live here
   instead of inside the link, which is how the link stays short:

       dentivo.app/go/sree

   Add one line per clinic when you set them up. Anything not listed still
   works: the link then carries the two values as readable parameters
   (…/go/sree?c=Sree%20Dental%20Care&g=…), which is longer but needs no
   code change. With a backend this table moves into the database.
   ========================================================================= */
export const CLINICS = {
  demo: {
    name: 'Smile Care Dental',
    google: 'https://g.page/r/CdemoPlaceId/review',
  },
}

export const slugify = (s) => String(s || '')
  .toLowerCase().trim()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 24)

export const clinicBySlug = (slug) => CLINICS[String(slug || '').toLowerCase()] || null
