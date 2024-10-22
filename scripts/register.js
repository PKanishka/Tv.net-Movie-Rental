document.getElementById("registrationForm").addEventListener("submit", function (event) {
    event.preventDefault();

    // Clear previous error messages
    clearErrors();

    // Validate form data
    const nic = document.getElementById("nic").value.trim();
    const email = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirm_password").value.trim();
    let isValid = true;

    if (!nic) {
        displayError("nicError", "NIC is required.");
        isValid = false;
    } else if (!/^[0-9]{9}[vVxX]$/.test(nic)) {
        displayError("nicError", "Invalid NIC format.");
        isValid = false;
    }

    if (!email) {
        displayError("emailError", "Email is required.");
        isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
        displayError("emailError", "Invalid email format.");
        isValid = false;
    }

    if (!password) {
        displayError("passwordError", "Password is required.");
        isValid = false;
    } else if (password.length < 6) {
        displayError("passwordError", "At least 6 characters needed.");
        isValid = false;
    }

    if (password !== confirmPassword) {
        displayError("confirmPasswordError", "Passwords do not match.");
        isValid = false;
    }

    // If validation fails, prevent form submission
    if (!isValid) return;

    // Create FormData object
    const formData = {
        nic: nic,
        email: email,
        password: password
    };

    // Send the data to the Node.js backend
    fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        if (response.ok) {
            window.location.href = 'login.html?status=success';
        } else {
            return response.text().then(text => {
                displayErrorMessage(text); // Display server-side error message
            });
        }
    })
    .catch(error => {
        console.error("Error:", error);
    });
});

// Helper functions for displaying and clearing error messages
function displayError(spanId, message) {
    const errorSpan = document.getElementById(spanId);
    errorSpan.textContent = message;
    errorSpan.style.display = "inline";
}

function clearErrors() {
    const errorMessages = document.querySelectorAll(".error-message");
    errorMessages.forEach(error => {
        error.textContent = '';
        error.style.display = 'none';
    });
}

function displayErrorMessage(message) {
    const form = document.getElementById("registrationForm");
    const errorElement = document.createElement("p");
    errorElement.classList.add("error-message");
    errorElement.style.color = "red";
    errorElement.textContent = message;
    form.appendChild(errorElement);
}
