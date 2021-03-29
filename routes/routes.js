const { response } = require("express");
const pool = require('../data/config');

const router = app => {
    
    app.get('/start', async (request,response) => {
        // Start new game
        
        // check if there's already a game in progress
        let query = 'SELECT COUNT(gameid) AS unfinishedGames FROM games WHERE is_finished = 0';
        var result;
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
            response.status(201).send(`Game with ID ${result.insertId} started`);
        }
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

    app.get('/game', async (request,response) => {
        // See active game so far

        //TODO: add "score so far" to the object before sending it
        pool.query('select * FROM frames WHERE gameid = (SELECT gameid FROM games WHERE is_finished = 0)', (error, result) => {
            if (error) throw error;
    
            response.status(201).send(result);
        });
    });

    app.get('/oldgames', (request,response) => {
        // Fetch all finished games and their frames from DB

        //TODO: format as array of games, each game should be an object, containing the frames and final scoring
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
    let rolls = [];

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

    // old_score = await getScore(gameID,frame_number);
    // console.log("old_score = ", old_score);
    // old_rolls = await getRolls(gameID,frame_number);
    // console.log("old_rolls = ", old_rolls);
    

    let query = "INSERT INTO frames (gameid, frame_number, roll1" + ((rolls[1] == undefined)?'':', roll2') + ((rolls[2] == undefined)?'':', roll3') + ") VALUES (" + gameID + "," + frame_number + ",'" + rolls[0] + "'" + ((rolls[1] == undefined)?'': ', "'+rolls[1]+'"') + ((rolls[2] == undefined)?'': ', "'+rolls[2]+'"') + ");";

    try {
        result = await queryDB(query);
    } catch (e) {
        console.error('queryDB failed:', e);
    }

    score = calculateScore(gameID, frame_number, rolls);

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
    console.log("fetched frameNum: ", frameNum );

    if (frameNum == undefined){
        frameNum = 1;
    } else {
        frameNum += 1;
    }

    console.log("adjusted frameNum: ", frameNum )

    return frameNum;
}

async function getScore(gameID,frame_number){
    // fetch score for previous frame
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

async function calculateScore(gameID, frame_number, rolls){
    // console.log("calculateScore() called")
    // console.log("gameID: ", gameID);
    // console.log("frame: ", frame_number);
    // console.log("rolls:", rolls);

    // if (old_score == undefined){
    //     old_score = 0;

    // } else {
    //     let new_score = old_score;
    //     if (old_rolls[0] == "X"){
            
    //     } else if (old_rolls[1] == "/"){

    //     } else {

    //     }
    // }
    // return 0;

    // check if there's a strike or a spare in frame_number-1
    // check if there's a strike in frame_number -2
    // get score so far
    // calculate bonuses
    // add bonuses and current rolls to score

    //let query = 


    // if prev frame == X, add roll1 and roll2 to prev frame
    // if prev frame == X and curr frame = X do nothing
    // if prev frame == X and prev prev frame == X, add roll1 to prev frame
    // if prev frame roll2 == / add roll1 to prev frame
    // once prev frame score is calculated, add current frame score to get current total score
    var currentScore = 0;
    var finalScore = 0;
    var bonusPrev = 0;
    var bonusDoublePrev = 0;
    var result;
    
    if (rolls[0] == "X" || rolls[1] == "/"){
        currentScore = 0;
    } else {
        currentScore = rolls[0] + rolls[1];
    }


    if (frame_number > 0){
        // if prev frame == X, add roll1 and roll2 to prev frame
        // if prev frame == X and curr frame = X do nothing

        // use as example: https://bowlinggenius.com/ and https://www.wikihow.com/Score-Bowling
        
        let query = "SELECT COUNT(roll1) as strikes FROM frames WHERE roll1 = 'X' AND gameid = "+gameID+" AND frame_number >= " + (frame_number-2);
        try {
            result = await queryDB(query);
        } catch (e) {
            console.error('queryDB failed:', e);
        }

        switch (result[0]['strikes']){
            case 0: {
                finalScore = currentScore;
            }
            break;
            case 1: {
                bonusPrev = currentScore;
            }
            break;
            case 2: {}
            break;
        }

        
        if (frame_number > 1){
            // if prev frame == X and prev prev frame == X, add roll1 to prev frame
        }

        // if prev frame roll2 == / add roll1 to prev frame
        
    } else {

    }
}

function newRoll(remainingPins,rollNr){
    // return a random number of pins between 0 and remainingPins
    let droppedPins = Math.round(Math.random()*remainingPins);
    console.log("dropped pins: ", droppedPins);
    console.log("remaining pins: ", remainingPins);
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