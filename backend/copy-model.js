/**
 * Copy Emotion Model from backend/models to frontend/model
 * This script copies the emotion_model.h5 file to the frontend
 */

const path = require('path');
const fs = require('fs');

// Path to the model files
const INPUT_MODEL_PATH = path.join(__dirname, 'models', 'emotion_model.h5');
const OUTPUT_DIR = path.join(__dirname, '..', 'frontend', 'model');
const OUTPUT_MODEL_PATH = path.join(OUTPUT_DIR, 'model.h5');

// Create model.json for TensorFlow.js
const createModelJson = () => {
  const modelJson = {
    format: "layers-model",
    generatedBy: "EmoEdu",
    convertedBy: "TensorFlow.js Converter",
    modelTopology: {
      class_name: "Sequential",
      config: {
        name: "emotion_model"
      },
      keras_version: "2.4.0",
      backend: "tensorflow"
    },
    weightsManifest: [
      {
        paths: ["group1-shard1of1.bin"],
        weights: []
      }
    ]
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'model.json'),
    JSON.stringify(modelJson, null, 2)
  );
  
  // Create a placeholder binary file
  const placeholderBin = Buffer.from([0, 0, 0, 0]);
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'group1-shard1of1.bin'),
    placeholderBin
  );
};

// Copy the model file
try {
  console.log(`Copying model from: ${INPUT_MODEL_PATH}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);

  // Check if model file exists
  if (!fs.existsSync(INPUT_MODEL_PATH)) {
    console.error(`Error: Model file not found at ${INPUT_MODEL_PATH}`);
    process.exit(1);
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }

  // Copy the model file
  fs.copyFileSync(INPUT_MODEL_PATH, OUTPUT_MODEL_PATH);
  console.log(`Copied model file to ${OUTPUT_MODEL_PATH}`);
  
  // Create model.json file for TensorFlow.js
  createModelJson();
  console.log('Created model.json and placeholder binary file');
  
  console.log('Model copy complete!');
} catch (error) {
  console.error('Error copying model:', error);
} 