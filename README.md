**Health Tracking App Backend**

**Overview:**
This project is the backend for a health tracking app designed to help users log their weight and store it alongside their account information. The backend is built using Node.js, Express.js for the API, and PostgreSQL (PG) for the database.

**Features:**

- **User Authentication:** Users can sign up and log in securely to access their account.
- **Weight Logging:** Users can log their weight, and the data is stored securely in the database.

**Prerequisites:**
Before running the project, make sure you have the following installed:

- Node.js
- PostgreSQL

**Installation:**

1. Clone this repository to your local machine.
2. Navigate to the project directory.
3. Run 'npm install' to install the dependencies.
4. Set up your PostgreSQL database and configure the connection in 'config/db.js'.
5. Run 'npm start' to start the server.

**Configuration:**
Make sure to set up the following environment variables:

- PORT: Port number for the Express server.
- // Database connection
  user: '',
  host: '',
  database: '',
  password: '',
  port: ,

**API Endpoints:**
**Authentication:**

- POST /createuser: Create a new user account.
- GET /retrieveuser/:id: Log in to an existing user account.

**Weight Tracking:**

- POST /adddata: Log a new weight entry.
