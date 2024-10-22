document.addEventListener("DOMContentLoaded", function () {
    const moviesPerPage = 8;
    let currentPage = 1;
    let totalPages = 1;
    let allMovies = [];
    let filteredMovies = [];

    // Load the XML file
    fetch('/data/movies.xml')
        .then(response => response.text())
        .then(data => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, "text/xml");
            const movies = xmlDoc.getElementsByTagName("movie");

            // Populate allMovies array with movie data
            Array.from(movies).forEach(movie => {
                const title = movie.getElementsByTagName("title")[0].textContent;
                const year = movie.getElementsByTagName("year")[0].textContent;
                const genre = movie.getElementsByTagName("genre")[0].textContent;
                const id = movie.getElementsByTagName("id")[0].textContent;
                const rating = movie.getElementsByTagName("rating")[0].textContent;
                const image = movie.getElementsByTagName("image")[0].textContent;

                allMovies.push({ title, year, genre, id, rating, image });
            });

            filteredMovies = [...allMovies]; // Initially, show all movies
            totalPages = Math.ceil(filteredMovies.length / moviesPerPage);

            renderGenresDropdown(); // Populate genre dropdown
            renderMovies(currentPage); // Render movies
            renderPagination(); // Render pagination
        })
        .catch(error => {
            console.error("Error loading XML file:", error);
        });

    // Function to render the genres dropdown
    function renderGenresDropdown() {
        const genreDropdown = document.getElementById('genre');
        const genres = [...new Set(allMovies.map(movie => movie.genre))]; // Get unique genres

        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreDropdown.appendChild(option);
        });
    }

    // Function to render movies based on the current page
    function renderMovies(page) {
        const moviesContainer = document.querySelector('.movies-container');
        moviesContainer.innerHTML = ''; // Clear the container

        const start = (page - 1) * moviesPerPage;
        const end = Math.min(start + moviesPerPage, filteredMovies.length);

        for (let i = start; i < end; i++) {
            const movie = filteredMovies[i];

            // Create movie card
            const movieCard = document.createElement('div');
            movieCard.classList.add('movie-card');
            movieCard.dataset.id = movie.id;
            movieCard.innerHTML = `
            <img src="${movie.image}" alt="${movie.title} Poster">
            <div class="movie-details">
                <h3>${movie.title}</h3>
                <p>
                    <span class="movie-year">${movie.year}</span> | 
                    <span class="movie-genre">${movie.genre}</span> | 
                    <span class="movie-id">${movie.id}</span>
                </p>
                <div class="movie-rating">${movie.rating}</div>
                <button class="rent-button">Rent +</button>
            </div>
        `;
            moviesContainer.appendChild(movieCard);
        }
    }

    // Function to render pagination dynamically
    function renderPagination() {
        const paginationContainer = document.querySelector('.pagination');
        paginationContainer.innerHTML = ''; // Clear existing pagination

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('span');
            pageButton.textContent = i;
            pageButton.classList.add('page-number');
            if (i === currentPage) {
                pageButton.classList.add('active');
            }

            pageButton.addEventListener('click', function () {
                currentPage = i;
                renderMovies(currentPage);
                renderPagination(); // Update pagination buttons
            });

            paginationContainer.appendChild(pageButton);
        }
    }

    // Event listener for filter button
    document.getElementById('filter-btn').addEventListener('click', function () {
        const titleFilter = document.getElementById('title').value.toLowerCase();
        const genreFilter = document.getElementById('genre').value;
        const yearFilter = document.getElementById('releaseYear').value;

        // Filter the movies based on user input
        filteredMovies = allMovies.filter(movie => {
            const matchesTitle = titleFilter === '' || movie.title.toLowerCase().includes(titleFilter);
            const matchesGenre = genreFilter === '' || movie.genre === genreFilter;
            const matchesYear = yearFilter === '' || movie.year === yearFilter;

            return matchesTitle && matchesGenre && matchesYear;
        });

        // Update pagination and render movies
        currentPage = 1; // Reset to the first page of filtered results
        totalPages = Math.ceil(filteredMovies.length / moviesPerPage);
        renderMovies(currentPage);
        renderPagination();
    });

    // Add event listener for adding movies to the cart (handled in app.js)
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('rent-button')) {
            const movieCard = event.target.closest('.movie-card');
            const movie = {
                id: movieCard.dataset.id,  // Get unique movie ID
                title: movieCard.querySelector('h3').textContent,
                year: movieCard.querySelector('.movie-year').textContent,
                genre: movieCard.querySelector('.movie-genre').textContent,
                rating: movieCard.querySelector('.movie-rating').textContent
            };
            addToCart(movie);  // Call the addToCart function from app.js
        }
    });
});
