// Page components
const pages = {
    songs: {
        title: 'Song Library',
        content: `
            <div class="page">
                <h2 class="page-title">Song Library</h2>
                <div class="page-actions">
                    <button class="btn btn-primary" onclick="router.navigate('editor')">
                        Create New Song
                    </button>
                </div>
                <div class="song-grid">
                    <div class="song-card">
                        <h3 class="song-title">Wonderwall</h3>
                        <p class="song-artist">Oasis</p>
                        <button class="btn btn-secondary" onclick="editSong('wonderwall')">Edit</button>
                    </div>
                    <div class="song-card">
                        <h3 class="song-title">Hotel California</h3>
                        <p class="song-artist">Eagles</p>
                        <button class="btn btn-secondary" onclick="editSong('hotel-california')">Edit</button>
                    </div>
                    <div class="song-card">
                        <h3 class="song-title">Stairway to Heaven</h3>
                        <p class="song-artist">Led Zeppelin</p>
                        <button class="btn btn-secondary" onclick="editSong('stairway-to-heaven')">Edit</button>
                    </div>
                </div>
            </div>
        `
    },
    
    editor: {
        title: 'Song Editor',
        content: `
            <div class="page">
                <h2 class="page-title">Song Editor</h2>
                <div class="form-group">
                    <label class="form-label">Song Title</label>
                    <input type="text" class="form-input" placeholder="Enter song title" id="songTitle">
                </div>
                <div class="form-group">
                    <label class="form-label">Artist</label>
                    <input type="text" class="form-input" placeholder="Enter artist name" id="songArtist">
                </div>
                <div class="editor-container">
                    <div class="editor-section">
                        <div class="editor-header">Lyrics & Chords</div>
                        <div class="editor-content">
                            <textarea class="editor-textarea" placeholder="Enter lyrics with chords here...
Example:
[G]Today is gonna be the day that they're [D]gonna throw it back to you
[C]By now you should've somehow real[G]ized what you gotta do
[G]I don't believe that anybody [D]feels the way I [C]do about you [G]now" id="lyricsEditor"></textarea>
                        </div>
                    </div>
                    <div class="editor-section">
                        <div class="editor-header">Preview</div>
                        <div class="editor-content">
                            <div id="songPreview" class="song-preview">
                                Preview will appear here as you type...
                            </div>
                        </div>
                    </div>
                </div>
                <div class="page-actions" style="margin-top: 2rem;">
                    <button class="btn btn-success" onclick="saveSong()">Save Song</button>
                    <button class="btn btn-secondary" onclick="router.navigate('songs')">Back to Library</button>
                </div>
            </div>
        `
    },
    
    login: {
        title: 'Login',
        content: `
            <div class="page">
                <h2 class="page-title">Login</h2>
                <form class="form" onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-input" required id="loginEmail">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" class="form-input" required id="loginPassword">
                    </div>
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary" style="width: 100%;">Login</button>
                    </div>
                    <div style="text-align: center; margin-top: 1rem;">
                        <p>Don't have an account? <a href="#/register" style="color: #3498db;">Register here</a></p>
                    </div>
                </form>
            </div>
        `
    },
    
    register: {
        title: 'Register',
        content: `
            <div class="page">
                <h2 class="page-title">Register</h2>
                <form class="form" onsubmit="handleRegister(event)">
                    <div class="form-group">
                        <label class="form-label">Full Name</label>
                        <input type="text" class="form-input" required id="registerName">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-input" required id="registerEmail">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" class="form-input" required id="registerPassword">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Confirm Password</label>
                        <input type="password" class="form-input" required id="registerConfirmPassword">
                    </div>
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary" style="width: 100%;">Register</button>
                    </div>
                    <div style="text-align: center; margin-top: 1rem;">
                        <p>Already have an account? <a href="#/login" style="color: #3498db;">Login here</a></p>
                    </div>
                </form>
            </div>
        `
    }
};

// App functionality
function renderPage(pageName) {
    const app = document.getElementById('app');
    const page = pages[pageName];
    
    if (page) {
        app.innerHTML = page.content;
        document.title = `ChordMe - ${page.title}`;
        
        // Add any page-specific functionality
        if (pageName === 'editor') {
            setupEditor();
        }
    }
}

// Song editor functionality
function setupEditor() {
    const lyricsEditor = document.getElementById('lyricsEditor');
    const songPreview = document.getElementById('songPreview');
    
    if (lyricsEditor && songPreview) {
        lyricsEditor.addEventListener('input', function() {
            updatePreview(this.value);
        });
    }
}

function updatePreview(lyrics) {
    const songPreview = document.getElementById('songPreview');
    if (!songPreview) return;
    
    // Simple chord parsing - convert [Chord] to styled chord notation
    const formattedLyrics = lyrics
        .replace(/\[([^\]]+)\]/g, '<span class="chord">$1</span>')
        .replace(/\n/g, '<br>');
    
    songPreview.innerHTML = formattedLyrics || 'Preview will appear here as you type...';
}

// Event handlers
function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // TODO: Implement actual authentication
    alert(`Login attempt for: ${email}`);
    // On successful login, redirect to songs
    router.navigate('songs');
}

function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    // TODO: Implement actual registration
    alert(`Registration attempt for: ${name} (${email})`);
    // On successful registration, redirect to login
    router.navigate('login');
}

function editSong(songId) {
    // TODO: Load song data for editing
    router.navigate('editor');
}

function saveSong() {
    const title = document.getElementById('songTitle').value;
    const artist = document.getElementById('songArtist').value;
    const lyrics = document.getElementById('lyricsEditor').value;
    
    if (!title.trim()) {
        alert('Please enter a song title');
        return;
    }
    
    // TODO: Implement actual save functionality
    alert(`Song saved: ${title} by ${artist}`);
    router.navigate('songs');
}

// Register routes
router.addRoute('songs', () => renderPage('songs'));
router.addRoute('editor', () => renderPage('editor'));
router.addRoute('login', () => renderPage('login'));
router.addRoute('register', () => renderPage('register'));

// Add chord styling
const style = document.createElement('style');
style.textContent = `
    .chord {
        color: #e74c3c;
        font-weight: bold;
        font-size: 0.9em;
        position: relative;
        top: -0.2em;
    }
    
    .song-preview {
        line-height: 1.8;
        font-family: 'Courier New', monospace;
        white-space: pre-wrap;
    }
    
    .page-actions {
        margin-top: 1.5rem;
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
    }
`;
document.head.appendChild(style);