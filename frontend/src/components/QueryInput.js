import React, { useState } from "react";

const BACKEND_URL = "https://rag-system1-1.onrender.com"; // Change if needed
export default function QueryInput({ setQueryResults }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setQueryResults([]); // Clear previous results

    try {
      const response = await fetch(`${BACKEND_URL}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });

      const data = await response.json();
      
      if (data.results && Array.isArray(data.results)) {
        setQueryResults(data.results); // ✅ Store full result array
      } else {
        setQueryResults([{ snippet: "No results found.", partitionId: "-", documentId: "-" }]);
      }
    } catch (error) {
      console.error("Error fetching query results:", error);
      setQueryResults([{ snippet: "Error fetching results.", partitionId: "-", documentId: "-" }]);
    }

    setLoading(false);
  };

  return (
    <div className="query-container">
      <input
        type="text"
        placeholder="Enter your query..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="query-input"
      />
      <button onClick={handleQuery} className="query-button">
        {loading ? "Loading..." : "Ask"}
      </button>
    </div>
  );
}
