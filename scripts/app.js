let cart = [];
const cartCount = document.querySelector('.cart-count');

function updateCartCount() {
    cartCount.textContent = cart.length;
}

// Function to generate a unique package ID
function generatePackageID() {
    return 'PKG' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

document.addEventListener("DOMContentLoaded", function () {
    packageID = generatePackageID();
    document.getElementById('package-id').textContent = packageID;
    // Fetch the logged-in user email from the session
    fetch('/getSessionUser')
        .then(response => response.json())
        .then(data => {
            if (data && data.email) {
                const userEmailElement = document.querySelector('.user-info span');
                if (userEmailElement) {
                    userEmailElement.innerHTML = `<a href="profile.html" id="user-email">${data.email}</a>`;
                } else {
                    console.error('user-info span not found in the document');
                }
                fetch('/getUserDetails')
                    .then(response => response.json())
                    .then(userDetails => {
                        if (userDetails && userDetails.nic) {
                            // Update the NIC and email in the cart popup
                            document.querySelector('.user-info-section h3').textContent = userDetails.nic;
                            const emailElementPopUp = document.getElementById('user-email-popup');
                            if (emailElementPopUp) {
                                emailElementPopUp.textContent = data.email;   // Set email in the cart popup
                            } else {
                                console.error('Email element not found in the cart popup.');
                            } // Set email in the cart popup
                        } else {
                            console.error("User details not found");
                        }
                    })
                    .catch(error => {
                        console.error("Error fetching user details:", error);
                    });
            }else {
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

    const cartIcon = document.querySelector('.cart');
    const cartPopup = document.getElementById('rental-popup');
    const cartItemsList = document.getElementById('cart-items');
    const closeBtn = document.querySelector('.close');
    const confirmDeliveryBtn = document.querySelector('.btn-confirm');

    // Function to render cart items in the popup
    function renderCartItems() {
        cartItemsList.innerHTML = ''; // Clear existing items
        if (cart.length === 0) {
            cartItemsList.innerHTML = '<li>No items in the cart</li>';
        } else {
            cart.forEach(movie => {
                const cartItem = document.createElement('li');
                cartItem.innerHTML = `
                    ${movie.title} | ${movie.year} | ${movie.genre} | ${movie.rating}
                    <button class="remove-btn" data-id="${movie.id}">Remove</button>
                `;
                cartItemsList.appendChild(cartItem);
            });
        }
    }

    // Event listener for opening the cart popup when clicking the cart icon
    cartIcon.addEventListener('click', function () {
        renderCartItems();  // Render the cart items in the popup
        cartPopup.style.display = 'block';  // Show the cart popup
    });

    // Event listener for closing the cart popup
    closeBtn.addEventListener('click', function () {
        cartPopup.style.display = 'none';
    });

     // Event listener for removing items from the cart
     document.addEventListener('click', function (event) {
        if (event.target.classList.contains('remove-btn')) {
            const movieID = event.target.dataset.id;
            cart = cart.filter(movie => movie.id !== movieID);  // Remove movie from cart
            renderCartItems();  // Re-render cart items
            updateCartCount();  // Update cart count in the UI
        }
    });

    // Event listener for confirming delivery
    confirmDeliveryBtn.addEventListener('click', function () {
        const deliveryAddress = document.getElementById('delivery-address').value;
        const contactNumber = document.getElementById('contact-number').value;
        const returnDate = document.getElementById('return-date').value;

        if (!deliveryAddress || !contactNumber || !returnDate) {
            alert('Please fill in all delivery details.');
            return;
        }

        const rentalData = {
            packageID: document.getElementById('package-id').textContent,
            userEmail: document.getElementById('user-email').textContent,
            deliveryAddress: deliveryAddress,
            contactNumber: contactNumber,
            returnDate: returnDate,
            movies: cart.map(movie => movie.id)
        };

        // Send the rental data to the server
        fetch('/finalizeRental', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rentalData)
        })
        .then(response => response.json())
        .then(data => {
            cart = [];
            updateCartCount();
            renderCartItems();

            const successMessageElement = document.getElementById('success-message');
            successMessageElement.textContent = 'Rental confirmed successfully!';
            successMessageElement.style.display = 'block';
            setTimeout(() => {
                cartPopup.style.display = 'none';
                successMessageElement.style.display = 'none';
            }, 2000);
        })
        .catch(error => {
            console.error('Error confirming rental:', error);
        });
    });
});

// Function to add a movie to the cart
function addToCart(movie) {
    cart.push(movie);
    updateCartCount();
}
