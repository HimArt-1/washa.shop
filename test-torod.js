async function test() {
    const clientId = process.env.TOROD_CLIENT_ID;
    const clientSecret = process.env.TOROD_CLIENT_SECRET;
    const apiUrl = (process.env.TOROD_API_URL || "https://torod.co/en/api").replace(/\/+$/, "");

    if (!clientId || !clientSecret) {
        console.error("Missing TOROD_CLIENT_ID or TOROD_CLIENT_SECRET");
        process.exitCode = 1;
        return;
    }

    const formData = new FormData();
    formData.append("client_id", clientId);
    formData.append("client_secret", clientSecret);

    try {
        const res = await fetch(`${apiUrl}/token`, {
            method: "POST",
            body: formData,
            headers: { "Accept": "application/json" }
        });
        
        if (!res.ok) {
            console.log("Status:", res.status);
            const err = await res.text();
            console.log("Error:", err);
            return;
        }
        const data = await res.json();
        console.log("Success! Token received:", data?.data?.bearer_token || data?.data?.token || data?.token ? "Yes" : "No");
        console.log("Data structure:", Object.keys(data).join(", "));
    } catch (e) {
        console.error("Fetch error:", e.message);
    }
}
test();
