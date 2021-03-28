const { response } = require("express");
const pool = require('../data/config');

const router = app => {
    
    app.get('/start', async (request,response) => {
        // Start new game
        
        // check if there's already a game in progress
        let query = 'SELECT COUNT(gameid) AS unfinishedGames FROM games WHERE is_finished = 0';
        var result
        try {
            result = await queryDB(query);
            
        } catch (e) {
            console.error('queryDB failed:', e);
        }

        let unfinishedGames = result[0]['unfinishedGames'];

        if (unfinishedGames > 0){
            response.status(204).send(`There is already a game in progress`);
        } else {
            query = 'INSERT INTO games VALUES ()';
            result = await queryDB(query);
            console.log("Game inserted. Result: ", result);
            response.status(201).send(`Game with ID ${result.insertId} created`);
        };
    });

    app.get('/nextframe', async (request,response) => {
        // Adding a new frame to the current game

        // Find the ID of the game in progress
        var result;
        let query = "SELECT gameid FROM games WHERE is_finished = 0";
        try {
            result = await queryDB(query);
        } catch (e) {
            console.error('queryDB failed:', e);
        }
        
        let gameID = result[0]['gameid'];

        result = await addFrame(gameID);

        console.log("result, returned from addFrame():")
        console.log(result);
    
        response.status(201).send(result);

        // add a frame
    });

    app.get('/oldgames', (request,response) => {
        // Fetch all finished games and their frames from DB
        pool.query('select * FROM frames', (error, result) => {
            if (error) throw error;
    
            response.status(201).send(result);
        });
    });

    app.get('/oldgames/:id', (request,response) => {
        // Fetch data for specific game and its frames
    });

    app.get('/start/:num', (request,response) => {
        // Generate a specified number of games with all their frames

        const gameCount = request.params.num;

        for (var i = 0; i < gameCount; i++ ){
            // generate a new game

            // generate frames for the new game

            // get the ID of the new game

            for (var i = 1; i <= 10; i++ ){

            }
        }


    });
}

module.exports = router;

async function addFrame(gameID){
    // get the scoring of previous frame
    // call newRoll() to generate the result of current frame
    // calculate score
    // add a record to DB 
    // if last frame in game, set "finished" flag to 1

    console.log("adding frame to " + gameID);

    frame_number = await getFrameNumber(gameID);
    console.log("frame_number = ", frame_number);

    let pins = 10;
    let maxRolls = 2;
    let rolls = [0,0,0];

    for (i = 0; i < maxRolls; i++){
        console.log("enter cycle, i = ", i)
        console.log("current pins: ", pins)
        let result = newRoll(pins,i);

        console.log("result = ", result)

        if(result == "X"){
            if (frame_number < 10){
                maxRolls--;
            } else {
                maxRolls++;
            }
        } else if (result == "/"){
            maxRolls--;
        }

        if (!isNaN(result)){
            pins -= result;
        }

        rolls[i] = result;
    }

    console.log("rolls: ")
    console.log(rolls)
    console.log(rolls[0])
    console.log(rolls[1])
    console.log(rolls[2])

    old_score = await getScore(gameID,frame_number);
    console.log("old_score = ", old_score);
    old_rolls = await getRolls(gameID,frame_number);
    console.log("old_rolls = ", old_rolls);
    score = calculateScore(frame_number, old_score, old_rolls, rolls);

    let query = "INSERT INTO frames (gameid, frame_number, score, roll1, roll2, roll3) VALUES (" + gameID + "," + frame_number + "," + score + ",'" + rolls[0] + "','" + rolls[1] + "','" + rolls[2] + "');";

    try {
        result = await queryDB(query);
    } catch (e) {
        console.error('queryDB failed:', e);
    }

    if (frame_number == 10){
        query = "UPDATE games SET is_finished = 1 WHERE gameid = " + gameID;
        try {
            result = await queryDB(query);   
        } catch (e) {
            console.error('queryDB failed:', e);
        }
    
    }

    query = "SELECT * FROM frames WHERE gameid = " + gameID + " AND frame_number = " + frame_number;

    try {
        result = await queryDB(query);
    } catch (e) {
        console.error('queryDB failed:', e);
    }

    return result;

}
 
async function queryDB(query) {
    console.log("sending query to DB: ", query)
	return new Promise((resolve, reject) => {
		pool.query(query, (error, results, fields) => {
			if (error) {
				reject(error);
			} else {
				resolve(results);
			}
		});
	});
}

async function getFrameNumber(gameID){
    var result;
    let query = 'SELECT MAX(frame_number) AS frame_number FROM frames WHERE gameid = ' + gameID;
    try {
        result = await queryDB(query);
    } catch (e) {
        console.error('queryDB failed:', e);
    }

    let frameNum = result[0]['frame_number'];
    console.log("fetched frameNum: ", frameNum )

    if (frameNum == undefined){
        frameNum = 1;
    } else {
        frameNum += 1;
    }

    console.log("adjusted frameNum: ", frameNum )

    return frameNum;
}

async function getScore(gameID,frame_number){
    var result;
    let score = 0;
    let query = 'SELECT score FROM frames WHERE gameid = ' + gameID + ' AND frame_number = ' + (frame_number - 1);
    if (frame_number > 1){
        try {
            result = await queryDB(query);
            
        } catch (e) {
            console.error('queryDB failed:', e);
        }
        
        score = result[0]['score'];

        return score;
    }
}

async function getRolls(gameID,frame_number){
    var result;
    let rolls = [];
    let query = 'SELECT roll1, roll2, roll3 FROM frames WHERE gameid = ' + gameID + ' and frame_number = ' + (frame_number - 1);
    if (frame_number > 1){
        try {
            result = await queryDB(query);
            
        } catch (e) {
            console.error('queryDB failed:', e);
        }

        rolls[0] = result[0]['roll1'];
        rolls[1] = result[0]['roll2'];
        rolls[2] = result[0]['roll3'];

        return rolls;
    }
}

function calculateScore(frame_number, old_score, old_rolls, new_rolls){
    console.log("calculateScore() called")
    console.log("frame: ", frame_number);
    console.log("oldscore: ", old_score);
    console.log("old_rolls: ", old_rolls);
    console.log("new_rolls: ", new_rolls);

    if (old_score == undefined){
        return 0;
    } else {
        let new_score = old_score;
        if (old_rolls[0] == "X"){
            
        } else if (old_rolls[1] == "/"){

        } else {

        }
    }
    return 0;
}

function newRoll(remainingPins,rollNr){
    // return a random number of pins between 0 and remainingPins
    let droppedPins = Math.round(Math.random()*remainingPins);
    if (droppedPins == remainingPins){
        if (rollNr == 0){
            return "X";
        } else {
            return "/";
        }
    } else {
        return droppedPins;
    }
}