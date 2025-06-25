#  Movie Management Web Application

A full-stack web application to manage your movie collection. Allows user to create, view, update, and delete movie details.

---
##  Live Link 
https://movie-catalogue-neon.vercel.app/

##  Features

###  Create/Update Movie Details
- Manage essential movie information: **Title**, **Genre**, **Year**, and **Rating**.

### Validation
- Prevents duplicate movie titles.
- Validates release year (between **1900** and **current year**).
- Ensures rating is within **0 to 5** range.

### Dynamic Movie Listing
- Beautiful tile (card) view with **Title**, **Genre**, and **Year**.
- Interactive star icons for ratings.
- Edit and Delete icons on each movie card.

### Search & Filter
- Search movies by **Title**.
- Filter by **Genre** and **Year**.

### Pagination
- Smoothly browse through your movie list using pagination controls.

---

## Technologies Used

### Frontend
- **React** – Interactive UIs
- **Material-UI** – Elegant UI components
- **Tailwind CSS**

### Backend (API)
- **GoLang** – High-performance backend
- **Gin** – Web framework for Go
- **godotenv**

### Database
- **PostgreSQL** – Robust relational DB

---

Create a PostgreSQL database (e.g., `moviesdb`) and ensure the server is running.

---

### 1. How to run it locally 

```bash
git clone <your-repo-url>
cd <your-repo-name>

### Step 1: Navigate to the backend directory

cd movie-manager-backend
go mod tidy
touch .env  // DATABASE_URL="secrey_key"
go run main.go

### Step 2: Navigate to the frotend directory

cd ../movie-manager-frontend
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material @mui/lab
npm start





