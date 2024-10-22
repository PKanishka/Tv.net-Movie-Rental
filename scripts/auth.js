document.getElementById("loginForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const loginErrorMessage = document.getElementById("loginErrorMessage");

    loginErrorMessage.style.display = "none"; // Hide any previous error messages

    if (!username || !password) {
        loginErrorMessage.textContent = "Please fill in all fields.";
        loginErrorMessage.style.display = "block";
        return;
    }

    // Prepare data to be sent to the server
    const loginData = {
        username: username,
        password: password
    };

    // Send POST request to the server for login authentication
    fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
    })
    .then(response => {
        if (response.ok) {
            return response.json(); // Parse the JSON response
        } else {
            return response.text().then(errorMsg => {
                loginErrorMessage.textContent = errorMsg;
                loginErrorMessage.style.display = "block";
            });
        }
    })
    .then(data => {
        if (data.redirect) {
            window.location.href = data.redirect; // Redirect to the appropriate page
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
});
