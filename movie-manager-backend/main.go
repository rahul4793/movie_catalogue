package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

// movie model
type Movie struct {
	ID     int    `json:"id"`
	Title  string `json:"title" binding:"required"`
	Genre  string `json:"genre"`
	Year   int    `json:"year" binding:"required"`
	Rating int    `json:"rating" binding:"gte=0,lte=5"`
}

// struct for handling partial updates
type UpdateMovieInput struct {
	Title  *string `json:"title"`
	Genre  *string `json:"genre"`
	Year   *int    `json:"year"`
	Rating *int    `json:"rating"`
}

var db *sql.DB

// initializes the PostgreSQL
func initDB() {
	err := godotenv.Load()
	if err != nil {
		log.Printf("Warning: Could not load .env file.%v", err)
	}
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		log.Fatalf("Fatal: DATABASE_URL environment variable is not set.")
	} else {
		log.Println("DATABASE_URL successfully loaded from environment.")
	}

	var openErr error
	db, openErr = sql.Open("postgres", connStr)
	if openErr != nil {
		log.Fatalf("Error opening database connection with string '%s': %v", connStr, openErr)
	}

	pingErr := db.Ping()
	if pingErr != nil {
		log.Fatalf("Error connecting to the database with string '%s': %v", connStr, pingErr)
	}

	log.Println("Successfully connected to PostgreSQL database!")

	createTableSQL := `
	CREATE TABLE IF NOT EXISTS movies (
		id SERIAL PRIMARY KEY,
		title VARCHAR(255) NOT NULL UNIQUE,
		genre VARCHAR(100),
		year INT,
		rating INT CHECK (rating >= 0 AND rating <= 5)
	);`
	_, err = db.Exec(createTableSQL)
	if err != nil {
		log.Fatalf("Error creating movies table: %v", err)
	}
	log.Println("Movies table checked or created.")
}

// create
func createMovie(c *gin.Context) {
	var movie Movie
	if err := c.ShouldBindJSON(&movie); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validating year
	currentYear := time.Now().Year()
	if movie.Year < 1900 || movie.Year > currentYear {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Year must be between 1900 and %d", currentYear)})
		return
	}

	// Checking for duplicate title
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM movies WHERE title ILIKE $1)", movie.Title).Scan(&exists)
	if err != nil {
		log.Printf("Error checking for duplicate title: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check for duplicate title", "details": err.Error()})
		return
	}
	if exists {
		c.JSON(http.StatusConflict, gin.H{"error": "Movie with this title already exists"})
		return
	}

	err = db.QueryRow(
		"INSERT INTO movies (title, genre, year, rating) VALUES ($1, $2, $3, $4) RETURNING id",
		movie.Title, movie.Genre, movie.Year, movie.Rating,
	).Scan(&movie.ID)

	if err != nil {
		log.Printf("Error inserting movie: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create movie", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, movie)
}

// updateMovie handles updating an existing movie
func updateMovie(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid movie ID"})
		return
	}

	var input UpdateMovieInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	setClauses := []string{}
	args := []interface{}{}
	argCount := 1

	if input.Title != nil {
		var existingID int
		err := db.QueryRow("SELECT id FROM movies WHERE title ILIKE $1 AND id != $2", *input.Title, id).Scan(&existingID)
		if err != nil && err != sql.ErrNoRows {
			log.Printf("Error checking for duplicate title on update: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check for duplicate title", "details": err.Error()})
			return
		}
		if existingID != 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "Movie with this title already exists"})
			return
		}

		setClauses = append(setClauses, fmt.Sprintf("title = $%d", argCount))
		args = append(args, *input.Title)
		argCount++
	}
	if input.Genre != nil {
		setClauses = append(setClauses, fmt.Sprintf("genre = $%d", argCount))
		args = append(args, *input.Genre)
		argCount++
	}
	if input.Year != nil {
		currentYear := time.Now().Year()
		if *input.Year < 1900 || *input.Year > currentYear {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Year must be between 1900 and %d", currentYear)})
			return
		}
		setClauses = append(setClauses, fmt.Sprintf("year = $%d", argCount))
		args = append(args, *input.Year)
		argCount++
	}
	if input.Rating != nil {
		if *input.Rating < 0 || *input.Rating > 5 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Rating must be between 0 and 5"})
			return
		}
		setClauses = append(setClauses, fmt.Sprintf("rating = $%d", argCount))
		args = append(args, *input.Rating)
		argCount++
	}

	if len(setClauses) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields to update provided"})
		return
	}

	args = append(args, id) // Add ID as the last argument for the WHERE clause
	query := fmt.Sprintf("UPDATE movies SET %s WHERE id = $%d RETURNING id", strings.Join(setClauses, ", "), argCount)

	var updatedID int
	err = db.QueryRow(query, args...).Scan(&updatedID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
			return
		}
		log.Printf("Error updating movie: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update movie", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Movie updated successfully", "id": updatedID})
}

// getMovies handles listing, searching, filtering, and pagination of movies
func getMovies(c *gin.Context) {
	searchQuery := c.Query("search")
	genreFilter := c.Query("genre")
	yearFilterStr := c.Query("year")
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("pageSize", "8")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 {
		pageSize = 8
	}

	offset := (page - 1) * pageSize

	// Build filter clauses and arguments
	filterClauses := []string{}
	filterArgs := []interface{}{}
	filterArgCount := 1

	if searchQuery != "" {
		filterClauses = append(filterClauses, fmt.Sprintf("title ILIKE $%d", filterArgCount))
		filterArgs = append(filterArgs, "%"+searchQuery+"%")
		filterArgCount++
	}
	if genreFilter != "" {
		filterClauses = append(filterClauses, fmt.Sprintf("genre ILIKE $%d", filterArgCount))
		filterArgs = append(filterArgs, "%"+genreFilter+"%")
		filterArgCount++
	}
	if yearFilterStr != "" {
		yearFilter, err := strconv.Atoi(yearFilterStr)
		if err == nil {
			filterClauses = append(filterClauses, fmt.Sprintf("year = $%d", filterArgCount))
			filterArgs = append(filterArgs, yearFilter)
			filterArgCount++
		}
	}

	whereSQL := ""
	if len(filterClauses) > 0 {
		whereSQL = " WHERE " + strings.Join(filterClauses, " AND ")
	}

	totalMoviesQuery := fmt.Sprintf("SELECT COUNT(*) FROM movies %s", whereSQL)
	var total int
	log.Printf("DEBUG: Count Query: %s, Args: %+v", totalMoviesQuery, filterArgs) // Use filterArgs for COUNT
	err = db.QueryRow(totalMoviesQuery, filterArgs...).Scan(&total)
	if err != nil {
		log.Printf("Error counting total movies: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count movies", "details": err.Error()})
		return
	}

	// Build the arguments for the main SELECT query
	selectArgs := make([]interface{}, len(filterArgs))
	copy(selectArgs, filterArgs)

	// for OFFSET and LIMIT
	offsetPlaceholder := filterArgCount
	limitPlaceholder := filterArgCount + 1

	// SELECT query string
	querySQL := fmt.Sprintf("SELECT id, title, genre, year, rating FROM movies %s ORDER BY id OFFSET $%d LIMIT $%d",
		whereSQL, offsetPlaceholder, limitPlaceholder)

	// Append OFFSET and LIMIT values to the selectArgs
	selectArgs = append(selectArgs, offset, pageSize)

	log.Printf("DEBUG: Select Query: %s, Args: %+v", querySQL, selectArgs)

	rows, err := db.Query(querySQL, selectArgs...)
	if err != nil {
		log.Printf("Error fetching movies: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch movies", "details": err.Error()})
		return
	}
	defer rows.Close()

	movies := []Movie{}
	for rows.Next() {
		var movie Movie
		if err := rows.Scan(&movie.ID, &movie.Title, &movie.Genre, &movie.Year, &movie.Rating); err != nil {
			log.Printf("Error scanning movie row: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan movie data", "details": err.Error()})
			return
		}
		movies = append(movies, movie)
	}

	if err := rows.Err(); err != nil {
		log.Printf("Error after iterating rows: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve movies", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"movies":     movies,
		"total":      total,
		"page":       page,
		"pageSize":   pageSize,
		"totalPages": (total + pageSize - 1) / pageSize,
	})
}

// deleting a movie by ID
func deleteMovie(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid movie ID"})
		return
	}

	result, err := db.Exec("DELETE FROM movies WHERE id = $1", id)
	if err != nil {
		log.Printf("Error deleting movie: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete movie", "details": err.Error()})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check delete status", "details": err.Error()})
		return
	}

	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Movie deleted successfully"})
}

func main() {
	initDB()
	defer db.Close()

	router := gin.Default()

	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept"}
	config.ExposeHeaders = []string{"Content-Length"}
	router.Use(cors.New(config))

	router.POST("/movies", createMovie)
	router.GET("/movies", getMovies)
	router.PUT("/movies/:id", updateMovie)
	router.DELETE("/movies/:id", deleteMovie)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8070"
	}

	port = ":" + port

	log.Printf("Server starting on port %s", port)
	if err := router.Run(port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
