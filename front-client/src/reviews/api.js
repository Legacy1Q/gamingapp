const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5004";
export async function reviewRequest(path, method = "GET", body) {
  try {
    const headers = {};
    if (method !== "GET") {
      const response = await fetch(new URL("/auth/csrf", base), { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("Unable to prepare your request. Try again.");
      headers["X-CSRF-TOKEN"] = (await response.json()).token;
      headers["Content-Type"] = "application/json";
    }
    const response = await fetch(new URL(path, base), { method, headers, credentials: "include", cache: "no-store",
      body: body === undefined ? undefined : JSON.stringify(body) });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(response.status === 401 ? "Please log in again to save your review."
        : response.status === 404 ? "The game or review is no longer available."
        : data?.message || "Unable to load or save reviews. Try again.");
    }
    return response.status === 204 ? null : response.json();
  } catch (error) {
    if (error instanceof TypeError) throw new Error("Unable to reach the reviews server. Try again shortly.");
    throw error;
  }
}
