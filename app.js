const express = require("express");
const mysql = require("mysql");
const app = express();
const session = require("express-session");
module.exports = app;
const bcrypt = require("bcrypt");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

// Set up session management
app.use(
  session({
    secret: "my_secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

app.use((req, res, next) => {
  if (req.session.user_id) {
    console.log(`User ID: ${req.session.user_id}`);
    res.locals.username = req.session.username;
    res.locals.isLoggedIn = true;
  } else {
    console.log("User ID not found");
    res.locals.username = "Guest";
    res.locals.isLoggedIn = false;
  }
  next();
});

const connection = mysql.createConnection({
  host: "db", // Docker Composeで定義したMySQLサービス名
  user: "root", // 使用するMySQLユーザー名
  password: "a", // MySQLのrootユーザーパスワード
  database: "myapp", // 使用するデータベース名
});

app.get("/", (req, res) => {
  res.render("top.ejs");
});

app.get("/list", (req, res) => {
  connection.query("SELECT * FROM articles", (error, results) => {
    res.render("list.ejs", { articles: results });
  });
});

app.get("/article/:id", (req, res) => {
  const id = req.params.id;
  connection.query(
    "SELECT * FROM articles WHERE id = ?",
    [id],
    (error, results) => {
      res.render("article.ejs", { article: results[0] });
    }
  );
});

// ログイン画面を表示するルーティングを作成してください
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/list");
  });
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  connection.query(
    "SELECT * FROM users WHERE email =?",
    [email],
    (error, results) => {
      if (results.length > 0) {
        const plain = req.body.password;
        const hash = results[0].password;
        bcrypt.compare(plain, hash, (err, result) => {
          req.session.user_id = results[0].id;
          req.session.username = results[0].username;
          res.redirect("/list");
        });
      } else {
        res.render("login.ejs");
      }
    }
  );
});
app.get("/signup", (req, res) => {
  res.render("signup.ejs", { errors: [] });
});

app.post(
  "/register",
  (req, res, next) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const errors = [];

    if (!username) {
      errors.push("Username is required");
    }
    if (!email) {
      errors.push("Email is required");
    }
    if (!password) {
      errors.push("Password is required");
    }
    console.log(errors);
    if (errors.length > 0) {
      res.render("signup.ejs", { errors: errors });
    } else {
      next();
    }
  },
  (req, res, next) => {
    const email = req.body.email;
    const errors = [];
    connection.query(
      "SELECT * FROM users WHERE email =?",
      [email],
      (error, results) => {
        if (results.length > 0) {
          errors.push("Email already exists");
          res.render("signup.ejs", { errors: errors });
        } else {
          next();
        }
      }
    );
  },
  (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    bcrypt.hash(password, 10, (err, hash) => {
      connection.query(
        "INSERT INTO users (username, email, password) VALUES (?,?,?)",
        [username, email, hash],
        (error, results) => {
          req.session.user_id = results.insertId;
          req.session.username = username;
          res.redirect("/list");
        }
      );
    });
  }
);

app.listen(3001);
