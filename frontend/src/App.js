import React, { useState } from "react";
import Upload from "./components/Upload";
import QueryInput from "./components/QueryInput";
import ResultDisplay from "./components/ResultDisplay";
import "./App.css"; // Ensure styles are properly imported

function App() {
  const [queryResults, setQueryResults] = useState([]);

  return (
    <div className="app-container">
      {/* 🔥 Centered Title */}
      <h1 className="rag-title">RAG System</h1>

      {/* 🔼 Increased Space */}
      <div className="spacer"></div>

      {/* 🚀 Upload Component */}
      <Upload />

      {/* 🔼 More Space Between Upload & Result */}
      <div className="spacer-large"></div>

      {/* 📝 Query Input */}
      <QueryInput setQueryResults={setQueryResults} />

      {/* 🔼 More Space */}
      <div className="spacer-large"></div>

      {/* ✨ Beautiful Result Display */}
      <ResultDisplay results={queryResults} />
    </div>
  );
}

export default App;
