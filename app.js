const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));

const connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Mi18sqlBo',
    database: 'todos'
});

connection.connect(function(err) {
    if (err) throw err;
    console.log('MySQL is Connected');
});

app.use(
    session({
        secret: 'my_secret_key',
        resave: false,
        saveUninitialized: false,
    })
);

app.use((req, res, next) => {
    if (req.session.userid === undefined) {
        res.locals.name = 'Guest';
        res.locals.login = false;
    } 
    else {
        res.locals.name = req.session.name;
        res.locals.login = true;
    }
    next();
});

app.get('/', (req, res) => {
    res.render('top.ejs');
});

app.get('/list', (req, res) => {
    const id = req.session.userid;

    connection.query(
        'select * from lists where userid = ?',
        [id],
        (error, results) => {
            res.render('list.ejs', {ownlists: results});
        }
    );
});

app.get('/signup', (req, res) => {
    res.render('signup.ejs', {errors: []});
});

app.post('/signup', (req, res, next) => {
        const name = req.body.name;
        const email = req.body.email;
        const password = req.body.password;
        const repassword = req.body.repassword;
        const errors = [];

        if (name === '') {
            errors.push('ユーザー名が空です');
        }

        if (email === '') {
            errors.push('メールアドレスが空です');
        }

        if (password === '') {
            errors.push('パスワードが空です');
        }

        if (password != repassword) {
            errors.push('正しくパスワードを入力してください');
        }

        if (errors.length > 0) {
            res.render('signup.ejs', {errors: errors})
        }
        else {
            next();
        }
    },
    (req, res, next) => {
        const email = req.body.email;
        const errors = [];

        connection.query(
            'select * from users where email = ?',
            [email],
            (error, results) => {
                if (results.length > 0) {
                    errors.push('ユーザー登録に失敗しました');
                    res.render('signup.ejs', {errors: errors});
                }
                else {
                    next();
                }
            }
        );
    },
    (req, res) => {
        const name = req.body.name;
        const email = req.body.email;
        const password = req.body.password;
        
        bcrypt.hash(password, 10, (error, hashpass) => {
            connection.query(
                'insert into users (name, email, password) values (?, ?, ?)',
                [name, email, hashpass],
                (error, results) => {
                    req.session.userid = results.insertId;
                    req.session.name = name;
                    res.redirect('/list');
                }
            );
        });
    }
);

app.get('/login', (req, res) => {
    res.render('login.ejs');
});

app.post('/login', (req, res) => {
    const email = req.body.email;
    connection.query(
        'select * from users where email = ?',
        [email],
        (error, results) => {
            if (results.length > 0) {
                const plainpass = req.body.password;
                const hashpass = results[0].password;

                bcrypt.compare(plainpass, hashpass, (error, equal) => {
                    if (equal) {
                        req.session.userid = results[0].id;
                        req.session.name = results[0].name;
                        res.redirect('/list');
                    }
                    else {
                        res.redirect('/');
                    }
                })
            }
            else {
                res.redirect('/');
            }
        }
    );
});

app.get('/logout', (req, res) => {
    req.session.destroy((error) => {
        res.redirect('/list');
    });
});

app.get('/new', (req, res) => {
    res.render('new.ejs');
});

app.post('/create', (req, res) => {
    const id = req.session.userid;
    const content = req.body.itemname;
    
    if (content === "") {
        res.redirect('/list');
    }
    else {
        connection.query(
            'insert into lists (userid, content) values (?, ?)',
            [id, content],
            (error, results) => {
                res.redirect('/list');
            }
        );
    }
});

app.post('/delete/:id', (req, res) => {
    connection.query(
        'delete from lists where id = ?',
        [req.params.id],
        (error, results) => {
            res.redirect('/list');
        }
    );
});

app.get('/edit/:id', (req, res) => {
    connection.query(
        'select * from lists where id = ?',
        [req.params.id],
        (error, results) => {
            res.render('edit.ejs', {item: results[0]});
        }
    );
});

app.post('/update/:id', (req, res) => {
    connection.query(
        'update lists set content = ? where id = ?',
        [req.body.itemname, req.params.id],
        (error, results) => {
            res.redirect('/list');
        }
    );
});


app.listen(port, () => console.log(`asscess -> http://localhost:${port}/`));