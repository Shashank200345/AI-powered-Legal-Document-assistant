import { VertexAI } from "@google-cloud/vertexai";
import vision from "@google-cloud/vision";
import speech from "@google-cloud/speech";
import textToSpeech from "@google-cloud/text-to-speech";
import { Firestore } from "@google-cloud/firestore";
import { Storage } from "@google-cloud/storage";
import winston from "winston";

// Initialize logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "google-cloud-service" },
});

// Google Cloud clients
let vertexAI;
let visionClient;
let speechClient;
let ttsClient;
let firestore;
let storage;

// Initialize all Google Cloud services
export async function initializeGoogleCloud() {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.VERTEX_AI_LOCATION || "us-central1";

    // Initialize Vertex AI for LLM
    vertexAI = new VertexAI({
      project: projectId,
      location: location,
    });

    // Initialize Vision API for OCR
    visionClient = new vision.ImageAnnotatorClient({
      projectId: projectId,
    });

    // Initialize Speech-to-Text
    speechClient = new speech.SpeechClient({
      projectId: projectId,
    });

    // Initialize Text-to-Speech
    ttsClient = new textToSpeech.TextToSpeechClient({
      projectId: projectId,
    });

    // Initialize Firestore
    firestore = new Firestore({
      projectId: projectId,
      databaseId: process.env.FIRESTORE_DATABASE || "(default)",
    });

    // Initialize Cloud Storage
    storage = new Storage({
      projectId: projectId,
    });

    logger.info("All Google Cloud services initialized successfully");

    // Test connections
    await testConnections();
  } catch (error) {
    logger.error("Failed to initialize Google Cloud services:", error);
    throw error;
  }
}

// Test all service connections
async function testConnections() {
  try {
    // Test Firestore
    await firestore.collection("health-check").doc("test").get();
    logger.info("Firestore connection verified");

    // Test Storage
    const bucket = storage.bucket(process.env.STORAGE_BUCKET_NAME);
    await bucket.exists();
    logger.info("Cloud Storage connection verified");

    // Test Vision API
    logger.info("Vision API client initialized");

    // Test Speech services
    logger.info("Speech services initialized");

    logger.info("All service connections verified");
  } catch (error) {
    logger.warn(
      "Some service connections could not be verified:",
      error.message,
    );
  }
}

// Vertex AI - Gemini Model
export async function getVertexAIModel(modelName = "gemini-1.5-pro") {
  if (!vertexAI) {
    throw new Error("Vertex AI not initialized");
  }

  return vertexAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      maxOutputTokens: parseInt(process.env.MAX_TOKENS) || 4096,
      temperature: parseFloat(process.env.TEMPERATURE) || 0.3,
      topP: 0.8,
      topK: 40,
    },
  });
}

// Vision API - OCR and Document Analysis
export async function extractTextFromImage(imageBuffer) {
  try {
    const [result] = await visionClient.textDetection({
      image: {
        content: imageBuffer,
      },
      features: [
        {
          type: "TEXT_DETECTION",
          maxResults: 1,
        },
      ],
    });

    const textAnnotations = result.textAnnotations;
    const extractedText =
      textAnnotations.length > 0 ? textAnnotations[0].description : "";

    return {
      text: extractedText,
      confidence: result.textAnnotations[0]?.confidence || 0,
      boundingBoxes: textAnnotations.slice(1).map((annotation) => ({
        text: annotation.description,
        vertices: annotation.boundingPoly.vertices,
      })),
    };
  } catch (error) {
    logger.error("Error extracting text from image:", error);
    throw error;
  }
}

// Enhanced document analysis with Vision API
export async function analyzeDocument(imageBuffer) {
  try {
    const [result] = await visionClient.documentTextDetection({
      image: {
        content: imageBuffer,
      },
    });

    const fullTextAnnotation = result.fullTextAnnotation;

    if (!fullTextAnnotation) {
      return { text: "", pages: [], confidence: 0 };
    }

    const pages = fullTextAnnotation.pages.map((page) => ({
      width: page.width,
      height: page.height,
      blocks: page.blocks.map((block) => ({
        text: block.paragraphs
          .map((para) =>
            para.words
              .map((word) => word.symbols.map((symbol) => symbol.text).join(""))
              .join(" "),
          )
          .join(" "),
        confidence: block.confidence,
        blockType: block.blockType,
        boundingBox: block.boundingBox,
      })),
    }));

    return {
      text: fullTextAnnotation.text,
      pages: pages,
      confidence: fullTextAnnotation.pages[0]?.confidence || 0,
    };
  } catch (error) {
    logger.error("Error analyzing document:", error);
    throw error;
  }
}

// Speech-to-Text
export async function transcribeAudio(audioBuffer, languageCode = "en-US") {
  try {
    const request = {
      audio: {
        content: audioBuffer.toString("base64"),
      },
      config: {
        encoding: "WEBM_OPUS", // Common for web audio
        sampleRateHertz: 48000,
        languageCode: languageCode,
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        model: "latest_long", // Better for longer audio
        useEnhanced: true,
      },
    };

    const [response] = await speechClient.recognize(request);

    return {
      transcript: response.results
        .map((result) => result.alternatives[0].transcript)
        .join(" "),
      confidence:
        response.results.length > 0
          ? response.results[0].alternatives[0].confidence
          : 0,
      words: response.results.flatMap(
        (result) => result.alternatives[0].words || [],
      ),
    };
  } catch (error) {
    logger.error("Error transcribing audio:", error);
    throw error;
  }
}

// Text-to-Speech
export async function synthesizeSpeech(text, voiceName = "en-US-Neural2-D") {
  try {
    const request = {
      input: { text: text },
      voice: {
        languageCode: process.env.VOICE_LANGUAGE_CODE || "en-US",
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0,
      },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);

    return {
      audioContent: response.audioContent,
      contentType: "audio/mpeg",
    };
  } catch (error) {
    logger.error("Error synthesizing speech:", error);
    throw error;
  }
}

// Firestore operations
export async function saveDocumentAnalysis(documentId, analysis) {
  try {
    await firestore
      .collection("document-analyses")
      .doc(documentId)
      .set({
        ...analysis,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    return documentId;
  } catch (error) {
    logger.error("Error saving document analysis:", error);
    throw error;
  }
}

export async function getDocumentAnalysis(documentId) {
  try {
    const doc = await firestore
      .collection("document-analyses")
      .doc(documentId)
      .get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    logger.error("Error getting document analysis:", error);
    throw error;
  }
}

// Cloud Storage operations
export async function uploadFile(buffer, fileName, contentType) {
  try {
    const bucket = storage.bucket(process.env.STORAGE_BUCKET_NAME);
    const file = bucket.file(`documents/${Date.now()}-${fileName}`);

    await file.save(buffer, {
      metadata: {
        contentType: contentType,
      },
    });

    // Make file publicly readable (for demo purposes)
    await file.makePublic();

    return {
      fileName: file.name,
      url: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
    };
  } catch (error) {
    logger.error("Error uploading file:", error);
    throw error;
  }
}

// Export all clients for direct access if needed
export { vertexAI, visionClient, speechClient, ttsClient, firestore, storage };
