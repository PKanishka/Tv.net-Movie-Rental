const express = require('express');
const fs = require('fs');
const xml2js = require('xml2js');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const multer = require('multer');

// Setup multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'assets/images')); // Save to assets/images
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + path.extname(file.originalname); // Create a unique file name
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

// Enable CORS for all requests
app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

const xmlFilePath = path.join(__dirname, 'data', 'users.xml');
const rentalsFilePath = path.join(__dirname, 'data', 'rentals.xml');
const returnsFilePath = path.join(__dirname, 'data', 'returns.xml');

// Serve static files from the 'assets' folder
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Serve static HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'pages', 'index.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'pages', 'register.html')));

// Route to handle user registration
app.post('/register', (req, res) => {
    const { nic, email, password } = req.body;

    // Hash the password before saving it
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            return res.status(500).send('Error hashing the password');
        }

        readXMLFile(xmlFilePath, (err, result) => {
            if (err) {
                return res.status(500).send('Error reading XML file');
            }

            if (!result || !result.users || !result.users.user) {
                result = { users: { user: [] } };
            }

            let users = result.users.user;

            if (!Array.isArray(users)) {
                users = [users];
            }

            // Check if NIC or email already exists, and ensure we're checking for valid objects
            const existingUser = users.find(user => user && (user.nic === nic || user.email === email));

            if (existingUser) {
                return res.status(400).send('NIC or Email already exists!');
            }

            // Add new user with hashed password
            const newUser = { nic, email, password: hashedPassword };
            users.push(newUser);
            result.users.user = users;

            // Write the updated XML back to file
            writeXMLFile(xmlFilePath, result, err => {
                if (err) {
                    return res.status(500).send('Error writing to XML file');
                }
                res.status(200).send('Registration successful!');
            });
        });
    });
});

// Route to handle user login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Read the XML file and find the user by email
    readXMLFile(xmlFilePath, (err, result) => {
        if (err) {
            return res.status(500).send('Error reading XML file');
        }

        // Check if the XML has users and user elements
        if (!result || !result.users || !result.users.user) {
            return res.status(400).send('No users found');
        }

        let users = result.users.user;

        // Ensure 'users' is treated as an array
        if (!Array.isArray(users)) {
            users = [users];  // Convert to array if it's a single user object
        }

        // Find the user by username (email)
        const existingUser = users.find(user => user && user.email === username);

        if (!existingUser) {
            return res.status(400).send('Invalid username or password');
        }

        // Compare the entered password with the hashed password
        bcrypt.compare(password, existingUser.password, (err, isMatch) => {
            if (err) {
                return res.status(500).send('Error verifying password');
            }

            if (!isMatch) {
                return res.status(400).send('Invalid username or password');
            }

            // On successful login, set session and redirect
            req.session.userEmail = existingUser.email;

            // Check if the user is admin
            if (existingUser.email === 'admin@test.com') {
                // Redirect admin to the admin dashboard
                res.json({ redirect: 'admin_dashboard.html' });
            } else {
                // Redirect regular users to the homepage
                res.json({ redirect: 'index.html' });
            }
        });
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error logging out');
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logout successful', redirect: 'login.html' });
    });
});

// Route to fetch session user data
app.get('/getSessionUser', (req, res) => {
    if (req.session.userEmail) {
        res.json({ email: req.session.userEmail });
    } else {
        res.status(401).json({ error: 'No user logged in' });
    }
});

// Route to fetch user details (including NIC) from users.xml
app.get('/getUserDetails', (req, res) => {
    if (!req.session.userEmail) {
        return res.status(401).json({ error: 'No user logged in' });
    }

    // Fetch the logged-in user's email from the session
    const userEmail = req.session.userEmail;

    // Read the users.xml file
    readXMLFile(xmlFilePath, (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error reading users.xml file' });
        }

        const users = result.users.user;
        const user = Array.isArray(users) ? users.find(u => u.email === userEmail) : (users.email === userEmail ? users : null);

        if (user) {
            res.json({
                email: user.email,
                nic: user.nic
            });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    });
});

// Profile password update route
app.post('/updateProfile', (req, res) => {
    if (!req.session.userEmail) {
        return res.status(401).json({ error: 'No user logged in' });
    }

    const userEmail = req.session.userEmail;
    const { password } = req.body;

    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            return res.status(500).json({ error: 'Error hashing the new password' });
        }

        readXMLFile(xmlFilePath, (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Error reading users.xml file' });
            }

            let users = Array.isArray(result.users.user) ? result.users.user : [result.users.user];
            const user = users.find(u => u.email === userEmail);

            if (user) {
                user.password = hashedPassword; // Update the password
                // Write updated data back to XML
                writeXMLFile(xmlFilePath, result, (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error writing to users.xml' });
                    }
                    res.json({ success: true, message: 'Password updated successfully.' });
                });
            } else {
                res.status(404).json({ error: 'User not found' });
            }
        });
    });
});

// Route to handle user deletion
app.post('/deleteUser', (req, res) => {
    if (!req.session.userEmail) {
        return res.status(401).json({ error: 'No user logged in' });
    }

    const userEmail = req.session.userEmail; // Get the email of the logged-in user

    readXMLFile(xmlFilePath, (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error reading users.xml file' });
        }

        let users = Array.isArray(result.users.user) ? result.users.user : [result.users.user];

        // Check if user exists
        const userIndex = users.findIndex(user => user.email === userEmail);
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Remove the user from the array
        users.splice(userIndex, 1);

        // Write the updated users list back to XML
        result.users.user = users.length > 0 ? users : []; // Ensure the users array is not undefined
        writeXMLFile(xmlFilePath, result, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error writing to users.xml' });
            }

            // Clear session data on successful deletion
            req.session.destroy(err => {
                if (err) {
                    return res.status(500).json({ error: 'Error logging out' });
                }
                res.json({ success: true, message: 'User deleted successfully.' });
            });
        });
    });
});

// Get user rentals route
app.get('/getUserRentals', (req, res) => {
    if (!req.session.userEmail) return res.status(401).json({ error: 'No user logged in' });

    const userEmail = req.session.userEmail;

    readXMLFile(rentalsFilePath, (err, result) => {
        if (err) return res.status(500).send('Error reading rentals file.');

        const rentals = Array.isArray(result.rentals.rental) ? result.rentals.rental : [result.rentals.rental];
        const activeRentals = rentals.filter(rental => rental.userEmail === userEmail);

        fs.readFile(returnsFilePath, 'utf-8', (err, returnsData) => {
            if (err) return res.status(500).send('Error reading returns file.');

            xml2js.parseString(returnsData, (err, returnsResult) => {
                if (err) return res.status(500).send('Error parsing returns XML.');

                const returns = returnsResult && returnsResult.returns && returnsResult.returns.return 
                ? (Array.isArray(returnsResult.returns.return) ? returnsResult.returns.return : [returnsResult.returns.return]) 
                : [];

                // Access userEmail correctly
                const watchedRentals = returns.filter(returnItem => {
                    return returnItem.userEmail[0] === userEmail;}); 

                // Send both active and watched rentals as a response
                res.json({ activeRentals, watchedRentals });
            });
        });
    });
});

// Confirm movie return route
app.post('/confirmReturn', (req, res) => {
    const { userEmail, packageID, movies } = req.body; // movies is an array of movie IDs to return
    console.log(`User Email: ${userEmail}, Movies: ${movies}, Package ID: ${packageID}`);

    // Now handle the return addition to returns.xml
    fs.readFile(returnsFilePath, 'utf-8', (err, returnsData) => {
        if (err) return res.status(500).json({ error: 'Error reading returns file.' });

        // Check if returnsData is empty or invalid
        if (!returnsData.trim()) {
            returnsData = '<returns></returns>'; // Initialize with an empty root element if the file is empty
        }

        xml2js.parseString(returnsData, (err, returnsResult) => {
            if (err) return res.status(500).json({ error: 'Error parsing returns XML.' });

            if (!returnsResult.returns) {
                returnsResult.returns = { return: [] };
            }

            // Prepare new return entry
            const newReturn = {
                packageID, // Include the package ID from the incoming request
                userEmail,
                returnDate: new Date().toISOString().split('T')[0], // ISO date format without time
                movies: { movie: movies.map(id => ({ id })) }
            };

            // Add the new return entry to the returns
            returnsResult.returns.return.push(newReturn);

            // Convert and save updated returns XML
            const builder = new xml2js.Builder();
            const updatedReturnsXML = builder.buildObject(returnsResult);
            fs.writeFile(returnsFilePath, updatedReturnsXML, (err) => {
                if (err) return res.status(500).json({ error: 'Error saving return data.' });

                // Return success message after saving the return
                res.json({ success: true});
            });
        });
    });
});

// Route to fetch movie title by movie ID
app.post('/getMovieTitle', (req, res) => {
    const { movieID } = req.body;

    // Read the movies.xml file to fetch the title
    readXMLFile(path.join(__dirname, 'data', 'movies.xml'), (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error reading movies.xml' });
        }

        const movies = Array.isArray(result.movies.movie) ? result.movies.movie : [result.movies.movie];
        const movie = movies.find(m => m.id === movieID);

        if (movie) {
            res.json({ title: movie.title });
        } else {
            res.status(404).json({ error: 'Movie not found' });
        }
    });
});

// Utility function to read and parse XML
function readXMLFile(filePath, callback) {
    fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
            callback(err, null);
        } else {
            xml2js.parseString(data, { explicitArray: false }, (err, result) => {
                callback(err, result);
            });
        }
    });
}

// Route to fetch all movies from movies.xml
app.get('/movies', (req, res) => {
    readXMLFile(path.join(__dirname, 'data', 'movies.xml'), (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error reading movies.xml' });
        }

        // Ensure movies is an array
        const movies = Array.isArray(result.movies.movie) ? result.movies.movie : [result.movies.movie];
        res.json(movies);
    });
});

// Route to fetch all returns from returns.xml
app.get('/returns', (req, res) => {
    readXMLFile(path.join(__dirname, 'data', 'returns.xml'), (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error reading returns.xml' });
        }

        // Ensure returns is an array
        const returns = Array.isArray(result.returns.return) ? result.returns.return : [result.returns.return];
        res.json(returns);
    });
});

// Route to add a new movie to movies.xml
app.post('/addMovie', upload.single('coverImage'), (req, res) => {
    const { title, genre, releaseYear, rating } = req.body;
    const imagePath = `../assets/images/${req.file.filename}`; // Path to the uploaded image

    // Here you can create the new movie object
    const newMovie = {
        title,
        genre,
        year: releaseYear,
        rating,
        image: imagePath // Save the image path
    };

    // Read the current movies.xml and add the new movie
    readXMLFile(path.join(__dirname, 'data', 'movies.xml'), (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error reading movies.xml' });
        }

        // Ensure movies is an array
        if (!result.movies || !result.movies.movie) {
            result.movies = { movie: [] }; // Initialize if it doesn't exist
        }

        // Check for duplicate ID (you can implement your own logic for ID generation)
        const newID = `YM2X00${result.movies.movie.length + 1}`; // Generate a new ID
        newMovie.id = newID;

        result.movies.movie.push(newMovie); // Add new movie to the movies array

        // Write back to movies.xml
        writeXMLFile(path.join(__dirname, 'data', 'movies.xml'), result, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error writing to movies.xml' });
            }
            res.json({ success: true });
        });
    });
});

// Utility function to generate a unique movie ID
function generateMovieID() {
    return 'YM2X' + Math.floor(Math.random() * 1000000).toString().padStart(3, '0'); // Generates an ID like YM2X001
}

// Utility function to write to XML
function writeXMLFile(filePath, xmlObj, callback) {
    const builder = new xml2js.Builder();
    const xml = builder.buildObject(xmlObj);
    fs.writeFile(filePath, xml, callback);
}

// Serve static HTML, JS, CSS files
app.use(express.static(path.join(__dirname, 'pages')));
app.use(express.static(path.join(__dirname, 'scripts')));
app.use(express.static(path.join(__dirname, 'assets')));

// Start the server on port 3000
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

// Handle finalizeRental POST request
app.post('/finalizeRental', (req, res) => {
    const rentalData = req.body;

    // Read existing rentals XML file
    fs.readFile(rentalsFilePath, 'utf-8', (err, data) => {
        if (err) return res.status(500).send('Error reading rentals XML file.');

        xml2js.parseString(data, (err, result) => {
            if (err) return res.status(500).send('Error parsing rentals XML.');

            // If no rentals exist yet, create the root element
            if (!result.rentals || !result.rentals.rental) {
                result = { rentals: { rental: [] } };
            }

            // Prepare new rental entry
            const newRental = {
                packageID: rentalData.packageID,
                userEmail: rentalData.userEmail,
                deliveryAddress: rentalData.deliveryAddress,
                contactNumber: rentalData.contactNumber,
                returnDate: rentalData.returnDate,
                movies: {
                    movie: rentalData.movies.map(movieID => ({ id: movieID }))
                }
            };

            // Add new rental to the list
            result.rentals.rental.push(newRental);

            // Convert the updated object back to XML
            const builder = new xml2js.Builder();
            const updatedXML = builder.buildObject(result);

            // Write the updated XML back to the rentals.xml file
            fs.writeFile(rentalsFilePath, updatedXML, (err) => {
                if (err) return res.status(500).send('Error saving rental data.');

                res.json({ success: true});
            });
        });
    });
});

