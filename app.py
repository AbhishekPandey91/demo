from flask import Flask, request, render_template_string, redirect
import sqlite3
import os
import pickle
import subprocess

app = Flask(__name__)

# VULNERABILITY 1: Hardcoded credentials
DATABASE_USER = "admin"
DATABASE_PASSWORD = "admin123"
SECRET_KEY = "my-secret-key-12345"
API_KEY = "sk-1234567890abcdef"

# VULNERABILITY 2: SQL Injection
@app.route('/login', methods=['POST'])
def login():
    username = request.form['username']
    password = request.form['password']
    
    # Direct string concatenation - SQL Injection vulnerability
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
    cursor.execute(query)
    user = cursor.fetchone()
    
    if user:
        return "Login successful!"
    return "Login failed!"

# VULNERABILITY 3: Command Injection
@app.route('/ping')
def ping():
    host = request.args.get('host', 'localhost')
    # Direct command execution without sanitization
    result = os.system(f"ping -c 4 {host}")
    return f"Ping result: {result}"

# VULNERABILITY 4: Path Traversal
@app.route('/read_file')
def read_file():
    filename = request.args.get('file')
    # No path validation - can access any file
    with open(filename, 'r') as f:
        content = f.read()
    return content

# VULNERABILITY 5: XSS (Cross-Site Scripting)
@app.route('/search')
def search():
    query = request.args.get('q', '')
    # Directly rendering user input without escaping
    template = f"""
    <html>
        <body>
            <h1>Search Results for: {query}</h1>
            <p>Your search: {query}</p>
        </body>
    </html>
    """
    return render_template_string(template)

# VULNERABILITY 6: Insecure Deserialization
@app.route('/load_data', methods=['POST'])
def load_data():
    data = request.data
    # Unpickling untrusted data - remote code execution
    obj = pickle.loads(data)
    return f"Loaded: {obj}"

# VULNERABILITY 7: No authentication/authorization
@app.route('/admin/delete_user/<user_id>')
def delete_user(user_id):
    # No authentication check - anyone can delete users
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute(f"DELETE FROM users WHERE id={user_id}")
    conn.commit()
    return f"User {user_id} deleted!"

# VULNERABILITY 8: Weak password storage
@app.route('/register', methods=['POST'])
def register():
    username = request.form['username']
    password = request.form['password']  # Plain text password
    
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    # Storing passwords in plain text
    cursor.execute(f"INSERT INTO users (username, password) VALUES ('{username}', '{password}')")
    conn.commit()
    return "User registered!"

# VULNERABILITY 9: Debug mode enabled in production
# VULNERABILITY 10: No HTTPS enforcement
# VULNERABILITY 11: Missing security headers

# VULNERABILITY 12: Insecure file upload
@app.route('/upload', methods=['POST'])
def upload():
    file = request.files['file']
    # No validation of file type or content
    file.save(f"uploads/{file.filename}")
    return "File uploaded!"

# VULNERABILITY 13: Information disclosure
@app.route('/debug')
def debug():
    # Exposing sensitive system information
    return {
        'env_vars': dict(os.environ),
        'secret_key': SECRET_KEY,
        'database_password': DATABASE_PASSWORD
    }

# VULNERABILITY 14: SSRF (Server-Side Request Forgery)
@app.route('/fetch_url')
def fetch_url():
    import urllib.request
    url = request.args.get('url')
    # No URL validation - can access internal services
    response = urllib.request.urlopen(url)
    return response.read()

# VULNERABILITY 15: Race condition in file operations
@app.route('/create_invoice')
def create_invoice():
    invoice_id = request.args.get('id')
    filename = f"invoice_{invoice_id}.txt"
    # Check then use - race condition
    if not os.path.exists(filename):
        with open(filename, 'w') as f:
            f.write("Invoice data")
    return "Invoice created"

if __name__ == '__main__':
    # VULNERABILITY 16: Running in debug mode
    # VULNERABILITY 17: Binding to all interfaces (0.0.0.0)
    app.run(debug=True, host='0.0.0.0', port=5000)