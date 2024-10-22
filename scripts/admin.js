document.addEventListener("DOMContentLoaded", function () {
    // Fetch the logged-in user email from the session
    fetch('/getSessionUser')
        .then(response => response.json())
        .then(data => {
            if (data && data.email) {
                // Set the user's email in the header
                const userEmailElement = document.querySelector('.user-info span');
                if (userEmailElement) {
                    userEmailElement.innerHTML = `<a href="profile.html" id="user-email">${data.email}</a>`;
                }

                // Fetch the movie list and user rentals
                fetchMovies();
                fetchUserRentals();
            } else {
                window.location.href = 'login.html';
            }
        })
        .catch(error => {
            console.error("Error fetching user session:", error);
            window.location.href = 'login.html';
        });

    // Add event listener for adding a new movie
    document.querySelector('.new-movie').addEventListener('click', function () {
        const title = document.getElementById('movie-title').value;
        const genre = document.getElementById('genre').value;
        const releaseYear = document.getElementById('release-year').value;
        const rating = document.getElementById('rating').value;
        const coverImage = document.getElementById('coverImage').files[0]; // Get the uploaded file

        const formData = new FormData(); // Create a FormData object
        formData.append('coverImage', coverImage); // Add the image file
        formData.append('title', title);
        formData.append('genre', genre);
        formData.append('releaseYear', releaseYear);
        formData.append('rating', rating);

        // Send new movie data to the server
        fetch('/addMovie', {
            method: 'POST',
            body: formData // Use FormData for file upload
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Movie added successfully!');
                fetchMovies(); // Refresh the movie list
            } else {
                alert('Error adding movie: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });

    // Logout functionality
    document.querySelector('.logout').addEventListener('click', function () {
        fetch('/logout', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.redirect) {
                window.location.href = data.redirect;
            }
        })
        .catch(error => {
            console.error("Error logging out:", error);
        });
    });

    // Function to fetch and display the movie list from /movies
    function fetchMovies() {
        fetch('/movies') // Fetch from the new movies route
            .then(response => response.json())
            .then(movies => {
                const movieListSection = document.getElementById('active-rentals');
                movieListSection.innerHTML = ''; // Clear existing movie list

                movies.forEach(movie => {
                    const title = movie.title;
                    const genre = movie.genre;
                    const releaseYear = movie.year; // Adjusted to match the XML
                    const rating = movie.rating;

                    const listItem = document.createElement('li');
                    listItem.textContent = `${title} | ${releaseYear} | ${genre} | ${rating}`;
                    movieListSection.appendChild(listItem);
                });
            })
            .catch(error => {
                console.error('Error fetching movies:', error);
            });
    }

    // Function to fetch and display user's active and watched rentals
    function fetchUserRentals() {
        fetch('/getUserRentals')
            .then(response => response.json())
            .then(rentalsData => {
                const activeRentalsContainer = document.getElementById('active-rentals');
                const watchedRentalsContainer = document.getElementById('watched-rentals');
                watchedRentalsContainer.innerHTML = ''; // Clear existing rentals

                // Display active rentals
                rentalsData.activeRentals.forEach(rental => {
                    const rentalItem = document.createElement('li');
                    rentalItem.textContent = `${rental.title} | ${rental.year} | ${rental.genre} | ${rental.rating}`;
                    activeRentalsContainer.appendChild(rentalItem);
                });

                // Display watched rentals
                rentalsData.watchedRentals.forEach(rental => {
                    const rentalItem = document.createElement('li');
                    rentalItem.textContent = `${rental.title} | ${rental.year} | ${rental.genre} | ${rental.rating}`;
                    watchedRentalsContainer.appendChild(rentalItem);
                });
            })
            .catch(error => {
                console.error('Error fetching rentals:', error);
            });
    }
});
