const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');

const DATA_DIR = path.join(__dirname, 'data');
const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Utility function to read data from a file
function loadData(filePath, callback) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File doesn't exist, initialize with empty array
        callback([]);
      } else {
        console.error('Error reading file:', err);
        callback([]);
      }
    } else {
      try {
        const parsedData = JSON.parse(data);
        callback(parsedData);
      } catch (e) {
        console.error('Error parsing JSON:', e);
        callback([]);
      }
    }
  });
}

// Utility function to save data to a file
function saveData(filePath, data, callback) {
  fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error('Error saving file:', err);
    }
    callback(err);
  });
}

function serveStaticFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end(`Error: ${err.code}`);
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

function parsePostData(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    const parsedData = querystring.parse(body);
    callback(parsedData);
  });
}

function displayEmployees(req, res) {
  loadData(EMPLOYEES_FILE, employees => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Employee List</title>
          <link rel="stylesheet" href="/styles.css">
      </head>
      <body>
          <div class="container">
              <h1>Employee List</h1>
              <table>
                  <thead>
                      <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Role</th>
                          <th>Salary</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${employees.map(emp => `
                          <tr>
                              <td>${emp.id}</td>
                              <td>${emp.name}</td>
                              <td>${emp.role}</td>
                              <td>$${emp.salary}</td>
                          </tr>
                      `).join('')}
                  </tbody>
              </table>
          </div>
      </body>
      </html>
    `);
    res.end();
  });
}

function handleRequest(req, res) {
  const urlParts = url.parse(req.url);
  const { pathname } = urlParts;

  console.log(`Handling request for ${pathname}`);

  if (pathname === '/') {
    serveStaticFile(res, path.join(__dirname, 'public', 'welcome.html'), 'text/html');
  } else if (pathname === '/signup') {
    if (req.method === 'POST') {
      parsePostData(req, (data) => {
        loadData(USERS_FILE, users => {
          const newUser = { username: data.username, password: data.password };
          users.push(newUser);
          saveData(USERS_FILE, users, (err) => {
            if (err) {
              res.writeHead(500);
              res.end('Error saving user data');
            } else {
              res.writeHead(302, { Location: '/' });
              res.end();
            }
          });
        });
      });
    } else {
      serveStaticFile(res, path.join(__dirname, 'public', 'signup.html'), 'text/html');
    }
  } else if (pathname === '/login') {
    if (req.method === 'POST') {
      parsePostData(req, (data) => {
        loadData(USERS_FILE, users => {
          const user = users.find(u => u.username === data.username && u.password === data.password);
          if (user) {
            res.writeHead(302, { Location: '/menu' });
            res.end();
          } else {
            res.writeHead(401);
            res.end('Invalid credentials');
          }
        });
      });
    } else {
      serveStaticFile(res, path.join(__dirname, 'public', 'login.html'), 'text/html');
    }
  } else if (pathname === '/menu') {
    serveStaticFile(res, path.join(__dirname, 'public', 'menu.html'), 'text/html');
  } else if (pathname === '/list') {
    displayEmployees(req, res);
  } else if (pathname === '/add') {
    if (req.method === 'POST') {
      parsePostData(req, (data) => {
        loadData(EMPLOYEES_FILE, employees => {
          const name = data.name;
          const role = data.role;
          const salary = parseInt(data.salary);
          employees.push({ id: employees.length + 1, name, role, salary });
          saveData(EMPLOYEES_FILE, employees, (err) => {
            if (err) {
              res.writeHead(500);
              res.end('Error saving data');
            } else {
              res.writeHead(302, { Location: '/list' });
              res.end();
            }
          });
        });
      });
    } else {
      serveStaticFile(res, path.join(__dirname, 'public', 'add.html'), 'text/html');
    }
  } else if (pathname === '/update') {
    if (req.method === 'POST') {
      parsePostData(req, (data) => {
        loadData(EMPLOYEES_FILE, employees => {
          const id = parseInt(data.id);
          const role = data.role;
          const salary = parseInt(data.salary);
          const employee = employees.find((emp) => emp.id === id);
          if (employee) {
            employee.role = role;
            employee.salary = salary;
            saveData(EMPLOYEES_FILE, employees, (err) => {
              if (err) {
                res.writeHead(500);
                res.end('Error saving data');
              } else {
                res.writeHead(302, { Location: '/list' });
                res.end();
              }
            });
          } else {
            res.writeHead(404);
            res.end('Employee not found');
          }
        });
      });
    } else {
      serveStaticFile(res, path.join(__dirname, 'public', 'update.html'), 'text/html');
    }
  } else if (pathname === '/delete') {
    if (req.method === 'POST') {
      parsePostData(req, (data) => {
        loadData(EMPLOYEES_FILE, employees => {
          const id = parseInt(data.id);
          const employeeIndex = employees.findIndex((emp) => emp.id === id);
          if (employeeIndex !== -1) {
            employees.splice(employeeIndex, 1);
            saveData(EMPLOYEES_FILE, employees, (err) => {
              if (err) {
                res.writeHead(500);
                res.end('Error saving data');
              } else {
                res.writeHead(302, { Location: '/list' });
                res.end();
              }
            });
          } else {
            res.writeHead(404);
            res.end('Employee not found');
          }
        });
      });
    } else {
      serveStaticFile(res, path.join(__dirname, 'public', 'delete.html'), 'text/html');
    }
  } else if (pathname === '/styles.css') {
    serveStaticFile(res, path.join(__dirname, 'public', 'styles.css'), 'text/css');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404 Not Found</h1>');
  }
}

const server = http.createServer(handleRequest);

const PORT = 8081;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
