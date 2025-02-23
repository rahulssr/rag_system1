




import dotenv from 'dotenv';
import weaviate from 'weaviate-client';

dotenv.config(); // Load environment variables


const openaiApiKey = process.env.OPENAI_API_KEY;
const weaviateInstanceUrl = process.env.WURL;
const weaviateApiKey = process.env.WKEY;


async function initWeaviateClient() {
  try {
    // Ensure that the protocol is stripped from the URL
    const weaviateHost = process.env.WURL.replace(/^https?:\/\//, ''); // Remove protocol

    const client = await weaviate.connectToWeaviateCloud(
      weaviateHost, // Use host only, no protocol
      {
        authCredentials: new weaviate.ApiKey(process.env.WKEY),
        headers: {
          'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY,
        },
        timeout: { init: 10000 },
        skipInitChecks: true,
        secure: true // Make sure secure is set to true for HTTPS
      }
    );

    console.log("Connected to Weaviate Cloud!");
    const readiness = await client.isReady();
    console.log("Client Readiness:", readiness);
    return client;
  } catch (error) {
    console.error('Error connecting to Weaviate:', error);
    return null;
  }
}

const client = await initWeaviateClient(); // Initialize Weaviate client
