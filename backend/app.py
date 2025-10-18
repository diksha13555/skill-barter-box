# 1️⃣ Import libraries
import sqlite3
from flask import Flask, request, jsonify, g
from flask_cors import CORS 
import datetime

# 2️⃣ Import AI modules (dummy or real from Member 2)
from recommender import recommend_skills 
from chatbot import get_response

# 3️⃣ Create Flask app and enable CORS
app = Flask(__name__)
# Enable CORS for all origins, allowing the frontend to connect
CORS(app) 

# Configuration for Database
DATABASE = 'feedback.db'

# ----------------------------------------------------
# 4️⃣ Database Connection Management (Best Practice)
# ----------------------------------------------------

def get_db():
    """Opens a new database connection if there is none yet for the current application context."""
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        # Use sqlite3.Row for dictionary-like access to rows
        db.row_factory = sqlite3.Row 
    return db

@app.teardown_appcontext
def close_connection(exception):
    """Closes the database connection at the end of the request."""
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    """Initializes the database schema (creates the table)."""
    with app.app_context(): # Use app context to call get_db outside of a request
        db = get_db()
        db.execute('''
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        db.commit()
    print("Database 'feedback.db' initialized successfully.")


# ----------------------------------------------------
# 5️⃣ Routes Definition
# ----------------------------------------------------

@app.route('/')
def home():
    """Home route to confirm the server is running."""
    return "Skill Barter Backend Running"

# 🟢 NEW TEST ROUTE ADDED HERE
@app.route('/test', methods=['POST'])
def test():
    """A simple route to test basic POST and JSON exchange with the frontend."""
    data = request.get_json()
    print(f"Received data: {data}") # Check your server terminal
    return jsonify({"message": f"Hello, {data.get('name', 'Guest')}! Data received successfully from frontend."})
# ------------------------------------

@app.route('/recommend', methods=['POST'])
def recommend():
    """Route for skill recommendation using data from the frontend."""
    data = request.json
    user_skills = data.get('skills', [])
    result = recommend_skills(user_skills) 
    return jsonify(result)

@app.route('/chat', methods=['POST'])
def chat():
    """Route for the chatbot functionality."""
    data = request.json
    message = data.get('message', '')
    reply = get_response(message) 
    return jsonify({'reply': reply})

@app.route('/contact', methods=['POST'])
def contact():
    """Route to receive and save contact/feedback data to SQLite."""
    data = request.json
    name = data.get('name', '')
    email = data.get('email', '')
    message = data.get('message', '')

    if not name or not email or not message:
         return jsonify({'status': 'error', 'message': 'Missing required fields (name, email, message).'}), 400

    try:
        db = get_db() 
        db.execute('INSERT INTO feedback (name, email, message) VALUES (?, ?, ?)',
                   (name, email, message))
        db.commit()
        return jsonify({'status': 'success', 'message': 'Feedback submitted successfully!'})
    except Exception as e:
        print(f"Database error: {e}")
        return jsonify({'status': 'error', 'message': 'Internal server error while submitting feedback.'}), 500


@app.route('/feedback', methods=['GET'])
def get_feedback():
    """Route to fetch all feedback entries from the SQLite database."""
    try:
        db = get_db() 
        rows = db.execute('SELECT id, name, email, message, timestamp FROM feedback ORDER BY id DESC').fetchall()
        
        feedback_list = [dict(row) for row in rows] 

        return jsonify(feedback_list)
    except Exception as e:
        print(f"Database error: {e}")
        return jsonify({'status': 'error', 'message': 'Internal server error while fetching feedback.'}), 500


# ----------------------------------------------------
# 6️⃣ Run the app
# ----------------------------------------------------

if __name__ == '__main__':
    # Initialize database when the application starts
    init_db()  
    # Run the application on port 5001
    app.run(debug=True, port=5000)
