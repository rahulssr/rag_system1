import React, { useState } from "react";
import { uploadPDF } from "../api.js";
import { FaCloudUploadAlt } from "react-icons/fa";

function Upload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus("📂 Please select a file first.");
      return;
    }

    setUploading(true);
    setUploadStatus("Uploading... ⏳");

    try {
      const response = await uploadPDF(selectedFile);
      console.log("Upload Response:", response);
      setUploadStatus("🎉 Upload Complete! ✅");
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("❌ Upload Failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-900 text-white rounded-2xl shadow-2xl w-full max-w-md mx-auto border border-gray-700 backdrop-blur-md">
      <label
        htmlFor="fileInput"
        className="flex items-center gap-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-5 py-3 rounded-xl cursor-pointer hover:scale-105 transition-transform shadow-lg"
      >
        <FaCloudUploadAlt className="text-2xl" />
        {selectedFile ? selectedFile.name : "Choose a File"}
      </label>
      <input
        type="file"
        id="fileInput"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        onClick={handleUpload}
        className={`mt-5 px-6 py-3 font-semibold rounded-xl transition-all shadow-lg ${
          uploading
            ? "bg-gray-500 cursor-not-allowed text-gray-300"
            : "bg-green-500 hover:bg-green-600 hover:scale-105"
        }`}
        disabled={uploading}
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {uploadStatus && (
        <p
          className={`mt-4 px-4 py-2 rounded-lg text-center ${
            uploadStatus.includes("✅")
              ? "bg-green-500 text-white"
              : uploadStatus.includes("❌")
              ? "bg-red-500 text-white"
              : "bg-yellow-500 text-black"
          } shadow-md`}
        >
          {uploadStatus}
        </p>
      )}
    </div>
  );
}

export default Upload;
