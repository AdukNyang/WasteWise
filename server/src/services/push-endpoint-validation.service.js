const EXACT_PUSH_HOSTS = new Set([
  "fcm.googleapis.com",
  "web.push.apple.com",
]);
const PUSH_HOST_SUFFIXES = [
  "push.services.mozilla.com",
  "notify.windows.com",
];

const isValidPushEndpoint = (endpoint) => {
  if (typeof endpoint !== "string" || endpoint.length > 4096) return false;

  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" || (url.port && url.port !== "443") || url.username || url.password)
    return false;

  const hostname = url.hostname.toLowerCase();
  return EXACT_PUSH_HOSTS.has(hostname)
    || PUSH_HOST_SUFFIXES.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`));
};

module.exports = { isValidPushEndpoint };
