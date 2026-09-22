// Production configuration. Keep private API keys on a server, never here.
window.NOODY_CONFIG = {
  // Google Apps Script web app URL (ends in /exec). See lead-relay/README.md.
  // Until this is set, the exchange form cannot reach Scott and says so.
  formEndpoint: '',

  // Where an exchange lands, and the address the manual fallback opens.
  notifyEmail: 'scott@noody.co.nz',

  // Noody's GA4 property. Traffic is separable by the scott.noody.co.nz hostname.
  ga4Id: 'G-NQLK5XR1TV'
};
