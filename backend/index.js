import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import weaviate from 'weaviate-client';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config(); // This should be at the top, before using any environment variables

const app = express();
const PORT = 3000;

app.use(cors({
  origin: 'https://rag-system1-2.onrender.com',
  methods: 'GET, POST',
  allowedHeaders: 'Content-Type'
}));
app.use(express.json());

const openaiApiKey = process.env.OPENAI_API_KEY;
const weaviateInstanceUrl = process.env.WURL;
const weaviateApiKey = process.env.WKEY;

// Async function to initialize Weaviate client
async function initWeaviateClient() {
  try {
    // Ensure that the protocol is stripped from the URL
    const weaviateHost = weaviateInstanceUrl.replace(/^https?:\/\//, ''); // Remove protocol
    const client = await weaviate.connectToWeaviateCloud(
      weaviateHost,
      {
        authCredentials: new weaviate.ApiKey(weaviateApiKey),
        headers: {
          'X-OpenAI-Api-Key': openaiApiKey,
        },
        timeout: { init: 10000 },
        skipInitChecks: true,
        secure: true, // Make sure to set secure to true for HTTPS
      }
    );

    console.log("Connected to Weaviate Cloud!");
    const readiness = await client.isReady();
    console.log("Client Readiness:", readiness);
    return client;
  } catch (error) {
    console.error("Error connecting to Weaviate:", error);
    throw error; // Re-throw to let the caller know there was an issue
  }
}

let client;
initWeaviateClient()
  .then((weaviateClient) => {
    client = weaviateClient; // Store the client instance once connected
  })
  .catch((error) => {
    console.error("Failed to initialize Weaviate client", error);
  });

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

let lastUploadedDocumentId = null;
function partitionText(text, filePath, partitionSize) {
  const partitions = [];

  for (let i = 0; i < text.length; i += partitionSize) {
    partitions.push({
      rag: text.slice(i, i + partitionSize),
      documentId: lastUploadedDocumentId,
      filePath,
      partition_index: partitions.length, // Correctly assigns an increasing partition index
    });
  }

  return partitions;
}

async function processDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let text = '';
  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    text = await pdfParse(dataBuffer).then(data => data.text);
  } else if (ext === '.docx') {
    text = await mammoth.extractRawText({ path: filePath }).then(result => result.value);
  } else if (ext === '.txt' || ext === '.json') {
    text = fs.readFileSync(filePath, 'utf8');
  } else {
    throw new Error('Unsupported file type: ' + ext);
  }
  return text;
}

app.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) throw new Error("No file uploaded!");
    lastUploadedDocumentId = crypto.randomUUID();
    const filePath = req.file.path;
    const extractedText = await processDocument(filePath);
    const partitions = partitionText(extractedText, filePath, 1000);
    
    const collection = client.collections.get("Rahul_Shukla");
    for (const partition of partitions) {
      await collection.data.insert(partition);
    }
    
    res.json({
      message: "File processed and stored in Weaviate successfully",
      documentId: lastUploadedDocumentId
    });
  } catch (error) {
    console.error("Error in /upload endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

async function fetchAndFilterByDocumentId(query, documentId) {
  const collection = client.collections.get('Rahul_Shukla');
  try {
    console.log(`DEBUG: Fetching all partitions for document_id: ${documentId}`);
    const dataRetrievalResult = await collection.query.bm25(
      query,
      {
        returnProperties: ['rag', 'documentId', 'filePath', 'partition_index'],
        limit: 20,
      }
    );
    if (!dataRetrievalResult || !dataRetrievalResult.objects || dataRetrievalResult.objects.length === 0) {
      return null;
    }
    const matchingPartitions = dataRetrievalResult.objects.filter(
      (item) => item.properties.documentId === documentId
    );
    if (matchingPartitions.length === 0) {
      return null;
    }
    matchingPartitions.sort((a, b) => a.properties.partition_index - b.properties.partition_index);
    return matchingPartitions.map(partition => partition.properties.rag).join(" ");
  } catch (error) {
    console.error('Error fetching partitions:', error);
    return null;
  }
}

app.post('/qa', async (req, res) => {
  try {
    let { question } = req.body;

    if (!question || typeof question !== "string" || question.trim() === "") {
      throw new Error("Invalid query: Question must be a non-empty string.");
    }

    console.log("DEBUG: Received Question ->", question);

    const collection = client.collections.get('Rahul_Shukla');

    // Get the latest uploaded document ID
    const latestDocResult = await collection.query.bm25(question, {
      returnProperties: ['documentId'],
      limit: 1,
      orderBy: [{ path: 'creationTimeUnix', order: 'desc' }]
    });

    if (!latestDocResult || !latestDocResult.objects || latestDocResult.objects.length === 0) {
      return res.json({ message: "No documents found in Weaviate." });
    }

    const latestDocumentId = latestDocResult.objects[0].properties.documentId;
    console.log("DEBUG: Latest Document ID ->", latestDocumentId);

    // Fetch relevant partitions of the document
    const partitionsResult = await collection.query.bm25(question, {
      returnProperties: ['rag', 'documentId', 'partition_index'],
      limit: 5
    });

    if (!partitionsResult || !partitionsResult.objects || partitionsResult.objects.length === 0) {
      return res.json({ message: "No relevant data found." });
    }

    // Filter by latest document ID
    const matchingPartitions = partitionsResult.objects.filter(
      (item) => item.properties.documentId === latestDocumentId
    );

    if (matchingPartitions.length === 0) {
      return res.json({ message: "No matching partitions found." });
    }

    // Sort by partition_index for proper order
    matchingPartitions.sort((a, b) => a.properties.partition_index - b.properties.partition_index);

    const results = matchingPartitions.map(part => ({
      snippet: part.properties.rag,
      partitionId: part.properties.partition_index,
      documentId: part.properties.documentId
    }));

    res.json({ results });

  } catch (error) {
    console.error("Error in /qa endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.listen(PORT, () => {
  console.log(`Backend server is running at http://localhost:${PORT}`);
});
