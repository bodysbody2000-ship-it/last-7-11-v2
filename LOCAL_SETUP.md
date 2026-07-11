# Chemistry Lab: Mr. Ahmed Quiz - Local Setup Guide

This guide will help you set up and run the **Chemistry Lab Quiz** application locally on your computer.

## Prerequisites

Before starting, ensure you have the following installed on your system:
- [Node.js](https://nodejs.org/) (Version 18.x or higher)
- [npm](https://www.npmjs.com/) (usually comes packaged with Node.js)
- [Git](https://git-scm.com/) (to clone the repository)

---

## 🚀 Steps to Run Locally

### 1. Clone the Repository
Clone your GitHub repository to your local machine:
```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <REPOSITORY_FOLDER_NAME>
```

### 2. Install Dependencies
Install all required packages for both the client and the server:
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory by copying the example file:
```bash
cp .env.example .env
```
Open the `.env` file and configure the variables:
- `PORT`: Set to `3000` (or any port you prefer)
- `SESSION_SECRET`: Put a long random string (e.g., `my_secret_key_123`)
- *(Optional)* Google OAuth Configuration if you wish to enable Google Login.

### 4. Run the Development Server
Start the full-stack development environment (both backend and client) with hot reloading enabled:
```bash
npm run dev
```
Once the server starts, open your browser and navigate to:
👉 **`http://localhost:3000`**

---

## 📦 Production Build & Deployment

To prepare the app for production (highly optimized code):

1. **Build the assets:**
   ```bash
   npm run build
   ```
   This compiles the React frontend into static files under `dist/public` and bundles the Express server into `dist/server.cjs`.

2. **Start the production server:**
   ```bash
   npm start
   ```

---

## 🛠️ Features Included

- **Real-time WebSockets:** Dual-mode connection for high-interactivity real-time quiz gameplay between host, teacher, and students.
- **Sound Effects:** High-quality local sound triggers for correct/incorrect answers and streak achievements.
- **Optimized UI:** Designed to run beautifully on standard and low-spec devices alike.
