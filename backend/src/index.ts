import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import orderRoutes from './routes/order.routes';
import authRoutes from './routes/auth.routes';
import navigationRoutes from './routes/navigation.routes';
import menuRoutes from './routes/menu.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/navigation', navigationRoutes);
app.use('/api/menu', menuRoutes);

// Server startup
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
