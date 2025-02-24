const BACKEND_URL = "https://rag-system1-1.onrender.com"; // Change if needed

export async function uploadPDF(file) {
  const formData = new FormData();
  formData.append("document", file); // ✅ Match the backend

  const response = await fetch(`${BACKEND_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  return response.json();
}

export async function queryRAG(question) {
  try {
    const response = await fetch(`${BACKEND_URL}/qa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("DEBUG: Response from backend ->", JSON.stringify(data, null, 2)); // 🔍 Log full response

    return data; // Ensure the data is returned
  } catch (error) {
    console.error("Error fetching query result:", error);
    return { answer: "Error retrieving response." };
  }
}
