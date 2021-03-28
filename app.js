const bodyParser = require('body-parser');
const express = require('express');
const port = 3002;
const app = express();
const routes = require('./routes/routes');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended:true,
}));

app.get(routes(app));



const server = app.listen(port, (error) =>{
    if (error) return console.log(`Error! ${error}`);

    console.log(`Server  listening on port ${server.address().port}`);
});

