const express = require('express');
const { CosmosClient } = require('@azure/cosmos');
const router = express.Router();

// Cosmos DB configuration
const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.DATABASE_ID;
const containerId = process.env.CONTAINER_ID;

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

// Create (POST) a new document
router.post('/', async (req, res) => {
  try {
    const { id, dub_name, dub_url } = req.body;
    const newItem = { id, dub_name, dub_url };
    const { resource } = await container.items.create(newItem);
    res.status(201).json(resource);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Read (GET) all documents
router.get('/', async (req, res) => {
  try {
    const { resources: items } = await container.items.readAll().fetchAll();
    res.status(200).json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve items' });
  }
});

// Read (GET) a single document by ID
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  const partitionKey = req.query.partitionKey;  // Optional: depends on your schema

  try {
    const { resource } = await container.item(id, partitionKey).read();
    res.status(200).json(resource);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve item' });
  }
});

// Update (PUT) a document
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { dub_name, dub_url } = req.body;
  const updatedItem = { id, dub_name, dub_url };
  const partitionKey = req.query.partitionKey; // Optional: depends on your schema

  try {
    const { resource } = await container.item(id, partitionKey).replace(updatedItem);
    res.status(200).json(resource);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete (DELETE) a document
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  const partitionKey = req.query.partitionKey;  // Optional: depends on your schema

  try {
    await container.item(id, partitionKey).delete();
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
