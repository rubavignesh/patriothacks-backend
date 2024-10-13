const express = require('express');
require('dotenv').config(); // Load environment variables
const itemRoutes = require('./routes/itemRoutes'); // Import the itemRoutes

const app = express();
app.use(express.json());

// Use the item routes
app.use('/items', itemRoutes);

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
