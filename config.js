// Production configuration. Keep private API keys on a server, never here.
window.NOODY_CONFIG = {
  // Left empty deliberately. Scott's call, Sept 2026: for this trip the volume
  // does not justify a backend, so the exchange form collects and structures
  // the details, then hands the visitor a prefilled email to send. That is the
  // intended route, not a fallback.
  //
  // If it ever is worth automating, dropping a Google Apps Script /exec URL in
  // here switches the form to sending directly, with retries — no other change
  // needed. See lead-relay/README.md.
  formEndpoint: '',

  // Where the exchange email is addressed.
  notifyEmail: 'scott@noody.co.nz',

  // Noody's GA4 property. Traffic is separable by the scott.noody.co.nz hostname.
  ga4Id: 'G-NQLK5XR1TV'
};
