import React, { useState, useEffect, useCallback } from 'react';
import {
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Star as MuiStarIcon,
} from '@mui/icons-material';

const StarIcon = ({ filled }) => (
  <MuiStarIcon
    className={`w-5 h-5 ${filled ? 'text-yellow-400' : 'text-gray-300'}`}
  />
);

const TrashIcon = () => (
  <DeleteIcon
    className="w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer"
  />
);

const App = () => {
  const [movies, setMovies] = useState([]);
  const [editingMovie, setEditingMovie] = useState(null); 
  const [showForm, setShowForm] = useState(false); 
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [message, setMessage] = useState(''); 
  const [isMessageError, setIsMessageError] = useState(false);

  const API_BASE_URL = 'http://localhost:8080';

  // Memoized fetchMovies
  const fetchMovies = useCallback(async () => {
    setMessage('');
    setIsMessageError(false);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterGenre) params.append('genre', filterGenre);
      if (filterYear) params.append('year', filterYear);
      params.append('page', currentPage);
      params.append('pageSize', 6);

      const response = await fetch(`${API_BASE_URL}/movies?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setMovies(data.movies);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching movies:', error);
      setMessage('Failed to load movies. Please ensure the backend is running.');
      setIsMessageError(true);
    }
  }, [searchTerm, filterGenre, filterYear, currentPage]);

  // Fetch movies on component mount and when anything changes
  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  // Handle movie creation or update
  const handleSaveMovie = async (movieData) => {
    setMessage('');
    setIsMessageError(false);
    try {
      let response;
      if (editingMovie) {
        // Update 
        response = await fetch(`${API_BASE_URL}/movies/${editingMovie.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(movieData),
        });
      } else {
        // Create
        response = await fetch(`${API_BASE_URL}/movies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(movieData),
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save movie.');
      }

      setMessage(`Movie ${editingMovie ? 'updated' : 'created'} successfully!`);
      setIsMessageError(false);
      setShowForm(false);
      setEditingMovie(null); 
      fetchMovies(); 
    } catch (error) {
      console.error('Error saving movie:', error);
      setMessage(`Error saving movie: ${error.message}`);
      setIsMessageError(true);
    }
  };

  // Handle movie deletion
  const handleDeleteMovie = async (id) => {
    setMessage('');
    setIsMessageError(false);
    const userConfirmed = window.confirm('Are you sure you want to delete this movie?');

    if (userConfirmed) {
      try {
        const response = await fetch(`${API_BASE_URL}/movies/${id}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete movie.');
        }
        setMessage('Movie deleted successfully!');
        setIsMessageError(false);
        fetchMovies(); // Refresh movie list
      } catch (error) {
        console.error('Error deleting movie:', error);
        setMessage(`Error deleting movie: ${error.message}`);
        setIsMessageError(true);
      }
    }
  };

  // Editing a movie
  const handleEditClick = (movie) => {
    setEditingMovie(movie);
    setShowForm(true);
  };

  // To show the create movie form
  const handleCreateClick = () => {
    setEditingMovie(null);
    setShowForm(true);
  };

  // To close the form
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingMovie(null);
    setMessage('');
    setIsMessageError(false);
  };

  // Pagination
  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  // Get all unique genres from the current movies list for the filter dropdown
  const allGenres = [...new Set(movies.map((movie) => movie.genre).filter(Boolean))];

  // Get all unique years from the current movies list for the filter dropdown
  const allYears = [...new Set(movies.map((movie) => movie.year).filter(Boolean))].sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl">
        <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-8 tracking-wide">
          Movie Manager
        </h1>

        {/* Message Display */}
        {message && (
          <div
            className={`p-3 mb-4 rounded-md text-sm font-medium ${
              isMessageError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}
            role="alert"
          >
            {message}
          </div>
        )}

        {/* Search, Filter & Add New Movie */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 space-y-4 sm:space-y-0 sm:space-x-4">
          <input
            type="text"
            placeholder="Search by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
          />
          <select
            value={filterGenre}
            onChange={(e) => setFilterGenre(e.target.value)}
            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
          >
            <option value="">Filter by Genre</option>
            {allGenres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
          >
            <option value="">Filter by Year</option>
            {allYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreateClick}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-200 ease-in-out transform hover:scale-105 w-full sm:w-auto"
          >
            Add New Movie
          </button>
        </div>

        {/* Movie List */}
        {showForm ? (
          <MovieForm
            movie={editingMovie}
            onSave={handleSaveMovie}
            onCancel={handleCloseForm}
          />
        ) : (
          <>
            {movies.length === 0 && (
              <p className="text-center text-gray-600 text-lg mt-10">
                No movies found. Try adjusting your search/filters or add a new movie!
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteMovie}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-8">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {pageNumbers.map((number) => (
                  <button
                    key={number}
                    onClick={() => handlePageClick(number)}
                    className={`px-4 py-2 rounded-md ${
                      currentPage === number
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    {number}
                  </button>
                ))}
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// MovieCard Component
const MovieCard = ({ movie, onEdit, onDelete }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden transform transition duration-300 hover:scale-103 hover:shadow-lg">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold text-gray-900 truncate flex-grow mr-2">
            {movie.title} 
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(movie)}
              className="text-blue-500 hover:text-blue-700 focus:outline-none"
              aria-label="Edit Movie"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-5.121 5.121a2 2 0 010 2.828L5.293 17.586A2 2 0 012.464 18.28l-1.06-1.06a2 2 0 01-.707-2.121l5.364-5.364a2 2 0 012.828 0z"></path>
              </svg>
            </button>
            <button
              onClick={() => onDelete(movie.id)}
              className="text-red-500 hover:text-red-700 focus:outline-none"
              aria-label="Delete Movie"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium">Genre:</span> {movie.genre} 
        </p>
        <p className="text-sm text-gray-600 mb-3">
          <span className="font-medium">Year:</span> {movie.year} 
        </p>
        <div className="flex items-center">
          <span className="font-medium text-gray-700 mr-2">Rating: {movie.rating}</span>
          {[...Array(5)].map((_, i) => ( 
            <StarIcon key={i} filled={i < movie.rating} />
          ))}
        </div>
      </div>
    </div>
  );
};

// MovieForm Component for creating/updating movies
const MovieForm = ({ movie, onSave, onCancel }) => {
  const [title, setTitle] = useState(movie ? movie.title : ''); 
  const [genre, setGenre] = useState(movie ? movie.genre : ''); 
  const [year, setYear] = useState(movie ? movie.year : '');     
  const [rating, setRating] = useState(movie ? movie.rating : 0);
  const [formErrors, setFormErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    if (!title.trim()) {
      errors.title = 'Title is required.';
    }
    const currentYear = new Date().getFullYear();
    if (!year || isNaN(year) || year < 1900 || year > currentYear) {
      errors.year = `Year must be between 1900 and ${currentYear}.`;
    }
    if (rating < 0 || rating > 5) {
      errors.rating = 'Rating must be between 0 and 5.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave({ title, genre, year: parseInt(year), rating: parseInt(rating) });
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mt-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        {movie ? 'Edit Movie' : 'Add New Movie'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          />
          {formErrors.title && <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>}
        </div>
        <div>
          <label htmlFor="genre" className="block text-sm font-medium text-gray-700">
            Genre
          </label>
          <input
            type="text"
            id="genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="year" className="block text-sm font-medium text-gray-700">
            Year
          </label>
          <input
            type="number"
            id="year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          />
          {formErrors.year && <p className="text-red-500 text-xs mt-1">{formErrors.year}</p>}
        </div>
        <div>
          <label htmlFor="rating" className="block text-sm font-medium text-gray-700">
            Rating (0-5)
          </label>
          <input
            type="number"
            id="rating"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            min="0"
            max="5"
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          />
          {formErrors.rating && <p className="text-red-500 text-xs mt-1">{formErrors.rating}</p>}
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 font-medium transition duration-200 ease-in-out"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium shadow-md transition duration-200 ease-in-out transform hover:scale-105"
          >
            {movie ? 'Update Movie' : 'Add Movie'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default App;
