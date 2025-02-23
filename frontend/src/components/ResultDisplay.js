import React from "react";



export default function ResultDisplay({ results }) {
  return (
    <div className="result-container">
      <h2 className="result-title">Query Results</h2>
      {results.length === 0 ? (
        <p className="no-results">No results yet.</p>
      ) : (
        <ul className="result-list">
          {results.map((item, index) => (
            <li key={index} className="result-item">
              <p><strong>Snippet:</strong> {item.snippet}</p>
              <p><strong>Document ID:</strong> {item.documentId}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
