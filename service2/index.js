const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Kafka } = require('kafkajs');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Service URLs (using environment variables or defaults)
const SERVICE1_URL = process.env.SERVICE1_URL || 'http://localhost:3001';
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const GRPC_SERVER = process.env.GRPC_SERVER || 'localhost:50051';

// Middleware
app.use(cors());
app.use(express.json());

// Kafka setup
const kafka = new Kafka({
  clientId: 'service2',
  brokers: [KAFKA_BROKER]
});

const consumer = kafka.consumer({ groupId: 'service2-group' });
const producer = kafka.producer();

// In-memory cache for demo purposes
// In a real app, this would be a database
const companyResponseCache = {};

// Setup Kafka consumer
async function setupKafkaConsumer() {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'service1-to-service2', fromBeginning: true });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageContent = message.value.toString();
          console.log(`Received message from Kafka: ${messageContent}`);
          
          // Parse message (Format: Companie:<nume companie>; Numar de angajati:25,000)
          const matches = messageContent.match(/Companie:([^;]+); Numar de angajati:(.+)/);
          
          if (matches && matches.length === 3) {
            const companyName = matches[1].trim();
            const employees = matches[2].trim();
            
            // Store in cache
            if (!companyResponseCache[companyName]) {
              companyResponseCache[companyName] = {};
            }
            
            companyResponseCache[companyName].employees = `Numar de angajati: ${employees}`;
            console.log(`Updated cache for company: ${companyName} with employees: ${employees}`);
          }
        } catch (error) {
          console.error('Error processing Kafka message:', error);
        }
      },
    });
    
    console.log('Kafka consumer is running');
  } catch (error) {
    console.error('Failed to setup Kafka consumer:', error);
  }
}

// Setup Kafka producer
async function setupKafkaProducer() {
  try {
    await producer.connect();
    console.log('Kafka producer is connected');
  } catch (error) {
    console.error('Failed to connect Kafka producer:', error);
  }
}

// Setup gRPC client
function createGrpcClient() {
  const PROTO_PATH = path.resolve(__dirname, './proto/service.proto');
  
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
  
  const serviceProto = grpc.loadPackageDefinition(packageDefinition).service;
  
  return new serviceProto.ValueEstimationService(
    GRPC_SERVER,
    grpc.credentials.createInsecure()
  );
}

// REST endpoint for client wealth info (called by Microservice 1)
app.get('/client-wealth/:name', (req, res) => {
  const { name } = req.params;
  
  // For demo purposes, return fixed value and send Kafka message
  const response = {
    wealth: '$USD 10,000,000'
  };
  
  // Send message via Kafka (Client:<nume client>; Functie in companie:CEO)
  try {
    const message = `Client:${name}; Functie in companie:CEO`;
    producer.send({
      topic: 'service2-to-service1',
      messages: [{ value: message }]
    });
    console.log(`Sent kafka message: ${message}`);
  } catch (error) {
    console.error('Failed to send Kafka message:', error);
  }
  
  return res.json(response);
});

// Search endpoint (main functionality)
app.post('/search', async (req, res) => {
  try {
    const { name, type } = req.body;
    
    // Validate request
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    if (type.toLowerCase() !== 'company') {
      return res.status(400).json({ message: 'This service only handles company searches' });
    }
    
    // For demo purposes: if name is not "Acme Corp", return not found
    if (name.toLowerCase() !== 'acme corp') {
      return res.status(404).json({ message: 'Nu s-a găsit niciun rezultat în baza de date.' });
    }
    
    // Step 1: Make gRPC call to Microservice 1
    let valueInfo;
    const client = createGrpcClient();
    
    try {
      valueInfo = await new Promise((resolve, reject) => {
        client.getValueEstimation({ name }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.value);
          }
        });
      });
    } catch (error) {
      console.error('Error calling Microservice 1 via gRPC:', error.message);
      return res.status(500).json({ message: 'Error retrieving company value information' });
    }
    
    // Step 2: Wait for employees info from Kafka (if not already in cache)
    // For demo, we'll use a timeout to wait for potential Kafka message
    let employeesInfo;
    
    if (companyResponseCache[name] && companyResponseCache[name].employees) {
      employeesInfo = companyResponseCache[name].employees;
    } else {
      // Wait a moment for Kafka message to arrive (in real world, might use websockets or polling)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (companyResponseCache[name] && companyResponseCache[name].employees) {
        employeesInfo = companyResponseCache[name].employees;
      } else {
        // Default value if Kafka message not received
        employeesInfo = "Numar de angajati: 25,000";
        
        // Store in cache
        if (!companyResponseCache[name]) {
          companyResponseCache[name] = {};
        }
        companyResponseCache[name].employees = employeesInfo;
      }
    }
    
    // Combine information and respond
    const responseData = {
      name,
      value: `Valoare estimata: ${valueInfo}`,
      employees: employeesInfo
    };
    
    return res.json(responseData);
    
  } catch (error) {
    console.error('Search error:', error.message);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'Microservice 2',
    status: 'running',
    timestamp: new Date()
  });
});

// Start Express server
app.listen(PORT, async () => {
  console.log(`Microservice 2 running on port ${PORT}`);
  
  // Setup Kafka
  await setupKafkaProducer();
  await setupKafkaConsumer();
  console.log(`gRPC client configured to connect to: ${GRPC_SERVER}`);
});