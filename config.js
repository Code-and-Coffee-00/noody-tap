// Production configuration. Keep private API keys on a server, never here.
window.NOODY_CONFIG = {
  // FormSubmit (Scott's call, 2026-09-28): the form emails him directly, no
  // mail-app step for the visitor. Needs its one-time activation link clicked
  // in scott@noody.co.nz; until then sends fail and the form falls back to the
  // prefilled email. A Google Apps Script /exec URL also works here — see
  // lead-relay/README.md. Empty = prefilled email only.
  formEndpoint: 'https://formsubmit.co/ajax/scott@noody.co.nz',

  // Where the exchange email is addressed.
  notifyEmail: 'scott@noody.co.nz',

  // Noody's GA4 property. Traffic is separable by the scott.noody.co.nz hostname.
  ga4Id: 'G-NQLK5XR1TV'
};
