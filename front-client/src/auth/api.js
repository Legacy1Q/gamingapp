const baseUrl = import.meta.env?.VITE_API_BASE_URL || "http://localhost:5004";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(new URL(`/auth/${path}`, baseUrl), {
      ...options,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new Error("Unable to reach the account server. Please try again shortly.");
  }
  if (response.ok) return response;
  if (response.status === 401 && path === "me") return null;
  if (response.status === 401 && path === "logout") return null;
  const body = await response.json().catch(() => null);
  const message = response.status === 401
    ? "Unable to log in. Check your email and password. After repeated attempts, wait 15 minutes before trying again."
    : body?.message || (Array.isArray(body?.errors) ? body.errors.join(" ") : null)
      || "The request could not be completed. Please try again.";
  throw new Error(message);
}

export async function getCurrentUser() {
  const response = await request("me");
  return response ? response.json() : null;
}

export async function submitAccountAction(action, credentials = {}) {
  // Fetch a fresh token because logging in or out changes the current identity.
  const tokenResponse = await request("csrf");
  const { token } = await tokenResponse.json();
  await request(action, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": token },
    body: JSON.stringify(credentials),
  });
}
