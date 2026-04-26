const fetch = require('node-fetch');
async function test() {
    const formData = new URLSearchParams();
    formData.append("client_id", "JNzguT766ARx5IK0Qk9DbpC4FL1cYLTm");
    formData.append("client_secret", "cQPXb6ogwhK96D8d936OZbKvsywFC4xT");

    try {
        const res = await fetch("https://api.torod.co/ar/api/token", {
            method: "POST",
            body: formData,
            headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" }
        });
        
        if (!res.ok) {
            console.log("Status:", res.status);
            const err = await res.text();
            console.log("Error:", err);
            return;
        }
        const data = await res.json();
        console.log("Success! Token received:", data?.data?.token ? "Yes" : "No");
        console.log("Data structure:", Object.keys(data).join(", "));
    } catch (e) {
        console.error("Fetch error:", e.message);
    }
}
test();
