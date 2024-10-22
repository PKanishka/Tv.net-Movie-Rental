document.addEventListener("DOMContentLoaded", function () {
    let returnCart = [];
    const cartItemsList = document.getElementById('cart-items');
    const cartPopup = document.getElementById('rental-popup');
    const confirmDeliveryBtn = document.querySelector('.btn-confirm');
    const closeBtn = document.querySelector('.close');
    const cartIconImg = document.querySelector('#cartIcon img.cart-icon');
    const cartCountElement = document.getElementById('cartCount');  // Cart count
    const packageID = generatePackageID();

    document.getElementById('package-id').textContent = packageID;

    // Hide cart popup initially
    cartPopup.style.display = 'none'; 

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

                // Fetch user details for NIC and additional info
                fetchUserProfile(data.email);
                fetchUserRentals();
            } else {
                window.location.href = 'login.html';
            }
        })
        .catch(error => {
            console.error("Error fetching user session:", error);
            window.location.href = 'login.html';
        });

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

    // Fetch user profile (NIC and email) and update the cart popup
    function fetchUserProfile(email) {
        fetch('/getUserDetails')
            .then(response => response.json())
            .then(userDetails => {
                if (userDetails && userDetails.nic) {
                    // Update the NIC in the popup
                    document.querySelector('.popup-content h3').textContent = userDetails.nic;
                    // For updating email in the profile section
                    const emailElementProfile = document.getElementById('user-email-popup');
                    if (emailElementProfile) {
                        emailElementProfile.textContent = email;
                    }

                    // For updating email in the cart popup
                    const emailElementCart = document.getElementById('user-email-cart');
                    if (emailElementCart) {
                        emailElementCart.textContent = email;
                    }
                } else {
                    console.error("User details not found");
                }
            })
            .catch(error => {
                console.error("Error fetching user details:", error);
            });
    }

     // event listener for the update password form submission
     document.getElementById('update-password-form').addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent default form submission
    
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
    
        // Check if passwords match
        if (newPassword !== confirmPassword) {
            alert("Passwords do not match. Please try again.");
            return;
        }
    
        // Prepare the data for the request
        const updateData = {
            password: newPassword
        };
    
        // Send the update password request
        fetch('/updateProfile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error); });
            }
            return response.json(); // Return JSON if response is ok
        })
        .then(data => {
            // Show success message
            const successMessageElement = document.getElementById('success-message');
            successMessageElement.textContent = 'Password updated successfully!';
            successMessageElement.style.display = 'block'; // Show the message
            // Optionally, clear the input fields after successful update
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
            setTimeout(() => {
                successMessageElement.style.display = 'none'; // Hide after 2 seconds
            }, 2000);
        })
        .catch(error => {
            console.error('Error updating password:', error);
            alert(error.message); // Show the error message
        });
    });
    
    // event listener for the update delete account
    document.querySelector('.delete-account').addEventListener('click', function () {
        const confirmation = confirm("Are you sure you want to delete your account? This action cannot be undone.");
        if (confirmation) {
            fetch('/deleteUser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error); });
                }
                return response.json();
            })
            .then(data => {
                alert(data.message); // Show success message
                window.location.href = 'login.html'; // Redirect to login page after deletion
            })
            .catch(error => {
                console.error('Error deleting account:', error);
                alert(error.message); // Show error message
            });
        }
    });

    // Handle adding items to the return cart when "Return" is clicked
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('return-btn')) {
            const movieID = event.target.dataset.movieId;
            const packageID = event.target.dataset.packageId;

            // Log to ensure movieID and packageID are being captured correctly
            console.log('Movie ID:', movieID, 'Package ID:', packageID);

            if (movieID && packageID) {
                addToReturnCart(movieID, packageID);  // Add to return cart
            } else {
                console.error('Invalid movieID or packageID.');
            }
        }
    });

    // Handle cart icon click to show cart popup
    cartIconImg.addEventListener('click', function () {
        renderReturnCart();  // Render the cart items
        cartPopup.style.display = 'block';  // Show the cart popup
    });

    // Event listener for closing the cart popup
    closeBtn.addEventListener('click', function () {
        cartPopup.style.display = 'none';
    });

    // Event listener for confirming return
    confirmDeliveryBtn.addEventListener('click', function () {
        const deliveryAddress = document.getElementById('delivery-address').value;
        const contactNumber = document.getElementById('contact-number').value;
        const returnDate = document.getElementById('return-date').value;

        if (!deliveryAddress || !contactNumber || !returnDate) {
            alert('Please fill in all delivery details.');
            return;
        }

        const returnData = {
            packageID: document.getElementById('package-id').textContent,
            userEmail: document.getElementById('user-email-popup').textContent,
            deliveryAddress,
            contactNumber,
            returnDate,
            movies: returnCart.map(movie => movie.movieID)  // Just movie IDs
        };
        console.log('Return Data:', returnData);
        // Send the return data to the server
        fetch('http://localhost:3000/confirmReturn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(returnData)
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(errMsg => { throw new Error(errMsg); });
            }
            return response.json(); // Return JSON if response is ok
        })
        .then(data => {
            returnCart = [];  // Clear the return cart
            renderReturnCart();  // Re-render cart
            const successMessageElement = document.getElementById('success-message');
            successMessageElement.textContent = 'Rental confirmed successfully!';
            successMessageElement.style.display = 'block';
            setTimeout(() => {
                cartPopup.style.display = 'none';
                successMessageElement.style.display = 'none';
            }, 2000);
            fetchUserRentals();  // Refresh rental data
        })
        .catch(error => {
            console.error('Error confirming return:', error);
            alert(error.message);  // Show the error message
        });
    });

    // Function to add a movie to the return cart
    function addToReturnCart(movieID, packageID) {
        returnCart.push({ movieID, packageID });
        updateCartCount();
    }

    // Function to render return cart
    function renderReturnCart() {
        cartItemsList.innerHTML = '';  // Clear existing items
        if (returnCart.length === 0) {
            cartItemsList.innerHTML = '<li>No items in the cart</li>';
        } else {
            returnCart.forEach(movie => {
                const cartItem = document.createElement('li');
                cartItem.innerHTML = `
                    Movie ID: ${movie.movieID} | Package ID: ${movie.packageID}
                    <button class="remove-btn" data-id="${movie.movieID}">Remove</button>
                `;
                cartItemsList.appendChild(cartItem);
            });
        }
    }

    // Function to update cart count
    function updateCartCount() {
        cartCountElement.textContent = returnCart.length;
    }

    // Handle removal of items from the return cart
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('remove-btn')) {
            const movieID = event.target.dataset.id;
            returnCart = returnCart.filter(movie => movie.movieID !== movieID);  // Remove item
            renderReturnCart();  // Re-render the cart
            updateCartCount();  // Update cart count
        }
    });

    // Function to fetch and display user's active and watched rentals
    function fetchUserRentals() {
        fetch('/getUserRentals')
            .then(response => response.json())
            .then(rentalsData => {
                console.log('Rentals Data:', rentalsData);
                const activeRentalsContainer = document.getElementById('active-rentals');
                const watchedRentalsContainer = document.getElementById('watched-rentals');
                activeRentalsContainer.innerHTML = '';  // Clear existing rentals
                watchedRentalsContainer.innerHTML = '';

                const watchedMovieIDs = new Set();
                rentalsData.watchedRentals.forEach(rental => {
                    let movies = Array.isArray(rental.movies) && rental.movies.length > 0 
                        ? rental.movies[0].movie 
                        : [];
                        movies.forEach(movie => {
                            watchedMovieIDs.add(movie.id[0]); // Assuming movie.id is an array
                        });
                    });

                // Display active rentals
                rentalsData.activeRentals.forEach(rental => {
                    let movies = Array.isArray(rental.movies.movie) ? rental.movies.movie : [rental.movies.movie];
                    movies.forEach(async movie => {
                        const movieID = movie.id;
                        if (!watchedMovieIDs.has(movieID)) {
                        const movieTitle = await fetchMovieTitle(movie.id);
                        const rentalItem = document.createElement('li');
                        rentalItem.textContent = movieTitle;
                        const returnButton = document.createElement('button');
                        returnButton.textContent = 'Return';
                        returnButton.classList.add('return-btn');
                        returnButton.dataset.packageId = rental.packageID;
                        returnButton.dataset.movieId = movie.id;
                        rentalItem.appendChild(returnButton);
                        activeRentalsContainer.appendChild(rentalItem);
                        }
                    });
                });

                // Display watched rentals
                rentalsData.watchedRentals.forEach(rental => {
                    let movies = Array.isArray(rental.movies) && rental.movies.length > 0 
                        ? rental.movies[0].movie 
                        : [];

                    if (movies && movies.length > 0) {
                        movies.forEach(async movie => {
                            const movieID = movie.id[0]; // Accessing the first element of the id array
                            const movieTitle = await fetchMovieTitle(movieID);
                            const rentalItem = document.createElement('li');
                            rentalItem.textContent = movieTitle;
                            watchedRentalsContainer.appendChild(rentalItem);
                        });
                    } else {
                        console.warn("No movies found for this watched rental.");
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching rentals:', error);
            });
    }

    // Function to fetch movie title by its ID
    async function fetchMovieTitle(movieID) {
        try {
            const response = await fetch('/getMovieTitle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieID })
            });
            const data = await response.json();
            return data.title;
        } catch (error) {
            console.error('Error fetching movie title:', error);
            return 'Unknown Movie';
        }
    }

    // Function to generate a unique package ID for returns
    function generatePackageID() {
        return 'PKG' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }
});
