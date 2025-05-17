const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Kafka } = require('kafkajs');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Service URLs (using environment variables or defaults)
const SERVICE2_URL = process.env.SERVICE2_URL || 'http://localhost:3002';
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';

// Middleware
app.use(cors());
app.use(express.json());

// Kafka setup
const kafka = new Kafka({
  clientId: 'service1',
  brokers: [KAFKA_BROKER]
});

const consumer = kafka.consumer({ groupId: 'service1-group' });
const producer = kafka.producer();

// In-memory cache for demo purposes
// In a real app, this would be a database
const clientResponseCache = {};

// Setup Kafka consumer
async function setupKafkaConsumer() {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'service2-to-service1', fromBeginning: true });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageContent = message.value.toString();
          console.log(`Received message from Kafka: ${messageContent}`);
          
          // Parse message (Format: Client:<name>; Functie in companie:CEO)
          const matches = messageContent.match(/Client:([^;]+); Functie in companie:(.+)/);
          
          if (matches && matches.length === 3) {
            const clientName = matches[1].trim();
            const position = matches[2].trim();
            
            // Store in cache
            if (!clientResponseCache[clientName]) {
              clientResponseCache[clientName] = {};
            }
            
            clientResponseCache[clientName].position = `Functie in companie: ${position}`;
            console.log(`Updated cache for client: ${clientName} with position: ${position}`);
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

// Setup gRPC server
function setupGrpcServer() {
  const PROTO_PATH = path.resolve(__dirname, './proto/service.proto');
  
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
  
  const serviceProto = grpc.loadPackageDefinition(packageDefinition).service;
  
  const server = new grpc.Server();
  
  // Implement the gRPC service
  server.addService(serviceProto.ValueEstimationService.service, {
    // When service2 calls this method via gRPC
    getValueEstimation: (call, callback) => {
      const { name } = call.request;
      console.log(`gRPC request received for company: ${name}`);
      
      // For the demo, return fixed value
      const response = {
        value: '$USD 70,000,000'
      };
      
      // Also send a message via Kafka (Companie:<nume companie>; Numar de angajati:25,000)
      try {
        const message = `Companie:${name}; Numar de angajati:25,000`;
        producer.send({
          topic: 'service1-to-service2',
          messages: [{ value: message }]
        });
        console.log(`Sent kafka message: ${message}`);
      } catch (error) {
        console.error('Failed to send Kafka message:', error);
      }
      
      callback(null, response);
    }
  });
  
  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) {
      console.error('Failed to start gRPC server:', error);
      return;
    }
    console.log(`gRPC server running on port ${port}`);
    server.start();
  });
}

// Search endpoint (main functionality)
app.post('/search', async (req, res) => {
  try {
    const { name, type } = req.body;
    
    // Validate request
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    if (type.toLowerCase() !== 'client') {
      return res.status(400).json({ message: 'This service only handles client searches' });
    }
    
    // For demo purposes: if name is not "John Doe", return not found
    if (name.toLowerCase() !== 'john doe') {
      return res.status(404).json({ message: 'Nu s-a găsit niciun rezultat în baza de date.' });
    }
    
    // Step 1: Make REST call to Microservice 2
    let wealthInfo;
    try {
      const response = await axios.get(`${SERVICE2_URL}/client-wealth/${name}`);
      wealthInfo = response.data.wealth;
    } catch (error) {
      console.error('Error calling Microservice 2:', error.message);
      return res.status(500).json({ message: 'Error retrieving client wealth information' });
    }
    
    // Step 2: Wait for position info from Kafka (if not already in cache)
    // For demo, we'll use a timeout to wait for potential Kafka message
    let positionInfo;
    
    if (clientResponseCache[name] && clientResponseCache[name].position) {
      positionInfo = clientResponseCache[name].position;
    } else {
      // Wait a moment for Kafka message to arrive (in real world, might use websockets or polling)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (clientResponseCache[name] && clientResponseCache[name].position) {
        positionInfo = clientResponseCache[name].position;
      } else {
        // Default value if Kafka message not received
        positionInfo = "Functie in companie: CEO";
        
        // Store in cache
        if (!clientResponseCache[name]) {
          clientResponseCache[name] = {};
        }
        clientResponseCache[name].position = positionInfo;
      }
    }
    
    // Combine information and respond
    const responseData = {
      name,
      wealth: `Avere detinuta: ${wealthInfo}`,
      position: positionInfo
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
    service: 'Microservice 1',
    status: 'running',
    timestamp: new Date()
  });
});

// Start Express server
app.listen(PORT, async () => {
  console.log(`Microservice 1 running on port ${PORT}`);
  
  // Setup Kafka and gRPC
  await setupKafkaProducer();
  await setupKafkaConsumer();
  setupGrpcServer();
});