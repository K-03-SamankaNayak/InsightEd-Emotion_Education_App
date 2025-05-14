/**
 * Convert Emotion Model from H5 to TensorFlow.js format
 * This script converts the emotion_model.h5 file to TensorFlow.js format
 */

const tf = require('@tensorflow/tfjs-node');
const path = require('path');
const fs = require('fs');

// Path to the model files
const INPUT_MODEL_PATH = path.join(__dirname, 'models', 'emotion_model.h5');
const OUTPUT_MODEL_DIR = path.join(__dirname, '..', 'frontend', 'model');

async function convertModel() {
  try {
    console.log(`Converting model from: ${INPUT_MODEL_PATH}`);
    console.log(`Output directory: ${OUTPUT_MODEL_DIR}`);

    // Check if model file exists
    if (!fs.existsSync(INPUT_MODEL_PATH)) {
      console.error(`Error: Model file not found at ${INPUT_MODEL_PATH}`);
      process.exit(1);
    }

    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_MODEL_DIR)) {
      fs.mkdirSync(OUTPUT_MODEL_DIR, { recursive: true });
      console.log(`Created output directory: ${OUTPUT_MODEL_DIR}`);
    }

    // Load the model
    console.log('Loading model...');
    const model = await tf.node.loadSavedModel(INPUT_MODEL_PATH);

    // Save the model in TensorFlow.js format
    console.log('Saving model in TensorFlow.js format...');
    await model.save(`file://${OUTPUT_MODEL_DIR}`);

    console.log('Model conversion complete!');
    console.log(`TensorFlow.js model saved to ${OUTPUT_MODEL_DIR}`);
  } catch (error) {
    console.error('Error converting model:', error);
    
    // Try direct copy as fallback
    try {
      console.log('Attempting direct copy of model file as fallback...');
      const outputFile = path.join(OUTPUT_MODEL_DIR, 'model.h5');
      fs.copyFileSync(INPUT_MODEL_PATH, outputFile);
      console.log(`Copied model file to ${outputFile}`);
      
      // Create a simple model.json file
      const modelJson = {
        format: 'h5',
        modelPath: 'model.h5',
        modelTopology: null,
        weightsManifest: [
          {
            paths: ['model.h5'],
            weights: []
          }
        ]
      };
      
      fs.writeFileSync(
        path.join(OUTPUT_MODEL_DIR, 'model.json'), 
        JSON.stringify(modelJson, null, 2)
      );
      
      console.log('Created basic model.json file');
    } catch (copyError) {
      console.error('Error copying model file:', copyError);
    }
  }
}

// Run the conversion
convertModel(); 