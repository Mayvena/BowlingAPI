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
            response.status(201).send(`Game with ID ${result.insertId} started`);
        }
    });

    app.get('/nextframe', async (request,response) => {
        // Add a new frame to the current game

        // Find the ID of the game in progress
        var result;
        let query = "SELECT gameid FROM games WHERE is_finished = 0";
        try {
            result = await queryDB(query);
        } catch (e) {
            console.error('queryDB failed:', e);
        }
        
        let gameID = result[0]['gameid'];

        // Create the new frame:
        result = await addFrame(gameID);
    
        response.status(201).send(result);
    });

    app.get('/game', async (request,response) => {
        // See active game so far

            let query = 'SELECT gameid, interim AS InterimScore FROM games WHERE is_finished = 0';
            try {
                var result = await queryDB(query);   
            } catch (e) {
                console.error('queryDB failed:', e);
            }

            query = 'SELECT frame_number, roll1, roll2, roll3 FROM frames WHERE gameid = ' + result[0].gameid;
            try {
                var frameResult = await queryDB(query);   
            } catch (e) {
                console.error('queryDB failed:', e);
            }

            var game = {};
            game.gamedata = result[0];
            game.frames = frameResult;

            response.status(201).send(game);

    });

    app.get('/oldgames', async (request,response) => {
        // Fetch all finished games and their frames from DB

        let query = 'SELECT gameid, score FROM games';
        try {
            var result = await queryDB(query);   
        } catch (e) {
            console.error('queryDB failed:', e);
        }

        var games = [];
        for (let i = 0; i < result.length; i++){

            let query = "SELECT frame_number, roll1, roll2, roll3, score FROM frames WHERE gameid = " + result[i].gameid;
            try {
                var resultFrames = await queryDB(query);   
            } catch (e) {
                console.error('queryDB failed:', e);
            }

            games[i] = {}
            games[i].gameid = result[i].gameid;
            games[i].score = result[i].score;
            games[i].frames = resultFrames;
 
        }
        
        response.status(201).send(games);

    });

}

module.exports = router;

async function addFrame(gameID){
    // get the scoring of previous frame
    // call newRoll() to generate the result of current frame
    // calculate score
    // add a record to DB 
    // if last frame in game, set "finished" flag to 1

    frame_number = await getFrameNumber(gameID);

    let pins = 10;
    let maxRolls = 2;
    let rolls = [];

    for (i = 0; i < maxRolls; i++){
        let result = newRoll(frame_number,pins,i);

        if (!isNaN(result)){
            pins -= result;
        }

        if(result == "X"){
            if (frame_number < 10){
                maxRolls--;
            } else {
                if ( i < 3){
                    maxRolls++;
                    pins = 10;
                } else {
                    break;
                }
                
            }
        } else if (result == "/"){
            if (frame_number < 10){
                maxRolls--;
            } else {
                if (i < 2){
                    maxRolls++;
                    pins = 10;
                }
                
            }
            
        }
        rolls[i] = result;
    }

    score = await calculateScore(gameID, frame_number, rolls);

    let query = "INSERT INTO frames (gameid, frame_number, score, roll1" + ((rolls[1] == undefined)?'':', roll2') + ((rolls[2] == undefined)?'':', roll3') + ") VALUES (" + gameID + "," + frame_number + "," + score + ",'" + rolls[0] + "'" + ((rolls[1] == undefined)?'': ', "'+rolls[1]+'"') + ((rolls[2] == undefined)?'': ', "'+rolls[2]+'"') + ");";

    try {
        result = await queryDB(query);
    } catch (e) {
        console.error('queryDB failed:', e);
    }

    if (frame_number == 10){

        query = "UPDATE games SET is_finished = 1, score = (SELECT SUM(score) FROM frames WHERE gameid = " + gameID + ") WHERE gameid = " + gameID;
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
    console.log("Executing query: ", query)
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

    if (frameNum == undefined){
        frameNum = 1;
    } else {
        frameNum += 1;
    }

    return frameNum;
}

async function calculateScore(gameID, frame_number, rolls){
    // Calculates scores and adds bonus points to previous frames
    // use as example: https://bowlinggenius.com/ and https://www.wikihow.com/Score-Bowling

    var currentScore = 0;
    var bonusPrev = 0;
    var bonusDoublePrev = 0;
    var result;
    
    if (rolls[0] == "X" || rolls[1] == "/"){
        currentScore = 10;
    } else if (frame_number != 10) {
        currentScore = rolls[0] + rolls[1];
        console.log("currentScore = rolls[0] + rolls[1] = ", currentScore)
    }

    if (frame_number > 0){

        if (frame_number > 1){
            var query = "SELECT roll1 FROM frames WHERE gameid = " + gameID + " AND frame_number = " + (frame_number -1);
            try {
                result = await queryDB(query);
            } catch (e) {
                console.error('queryDB failed:', e);
            }
            var prevX = result[0]['roll1'];

            if (prevX == 'X'){
                if(rolls[0] == 'X'){
                    bonusPrev = 10;
                } else {
                    bonusPrev = currentScore;
                }  
            }
        }

        if (frame_number > 2){
            query = "SELECT roll1 FROM frames WHERE gameid = " + gameID + " AND frame_number = " + (frame_number -2);
            try {
                result = await queryDB(query);
            } catch (e) {
                console.error('queryDB failed:', e);
            }
            var prevPrevX = result[0]['roll1'];
    
            if (prevPrevX == 'X'){
                if (prevX == 'X'){
                    if(rolls[0] == 'X'){
                        bonusDoublePrev = 10;
                    } else {
                        bonusDoublePrev += rolls[0];
                    }    
                } 
            } 
        }

        query = "SELECT COUNT(roll2) as spares FROM frames WHERE roll2 = '/' AND gameid = "+gameID+" AND frame_number = " + (frame_number-1);
        try {
            result = await queryDB(query);
        } catch (e) {
            console.error('queryDB failed:', e);
        }

        if (result[0]['spares'] > 0){
            if (rolls[0] == 'X'){
                bonusPrev = 10;
            } else {
                bonusPrev += rolls[0];
            }
        }

        if (frame_number == 10){
            if(rolls[0] == 'X'){
                currentScore = 10;
                if (rolls[1] == 'X'){
                    currentScore += 10;
                    if (rolls[2] == 'X'){
                        currentScore += 10;
                    } else {
                        currentScore += rolls[2];
                    }
                } else {
                    currentScore += rolls[1];
                    if (rolls[2] == '/'){
                        currentScore = 20;
                    } else {
                        currentScore += rolls[2];
                    }
                }
            } else {
                currentScore = rolls[0];
                if (rolls[1] == '/'){
                    currentScore += (10-rolls[0]);
                    if (rolls[2] == 'X'){
                        currentScore += 10;
                    } else {
                        currentScore += rolls[2];
                    }
                } else {
                    currentScore += rolls[1];
                }
            }
        }
        
    } 

    if(!rolls.includes('X') && !rolls.includes('/')){
        await updateInterim(currentScore,gameID);
    }

    if(bonusPrev != 0){
        query = "UPDATE frames AS a INNER JOIN frames AS b ON a.id = b.id SET a.score = (b.score + " +bonusPrev+ ") WHERE a.gameid = " + gameID +" AND a.frame_number = " + (frame_number-1);

        try {
            result = await queryDB(query);
        } catch (e) {
            console.error('queryDB failed:', e);
        }

        await updateInterim((bonusPrev + 10),gameID)
    }

    if(bonusDoublePrev != 0){
        query = "UPDATE frames AS a INNER JOIN frames AS b ON a.id = b.id SET a.score = (b.score + " + bonusDoublePrev + ") WHERE a.gameid = " + gameID +" AND a.frame_number = " + (frame_number-2);
        try {
            result = await queryDB(query);
        } catch (e) {
            console.error('queryDB failed:', e);
        }
        await updateInterim((bonusDoublePrev + 10),gameID)
    }

    return currentScore;
}

async function updateInterim(addition,gameID){
    let query = "UPDATE games AS a INNER JOIN games AS b on a.gameid = b.gameid SET a.interim = (b.interim + " + addition + ") WHERE a.gameid = " + gameID;
    try {
        result = await queryDB(query);
    } catch (e) {
        console.error('queryDB failed:', e);
    }
}

function newRoll(frame_number, remainingPins,rollNr){
    // return a random number of pins between 0 and remainingPins
    
    let droppedPins = Math.round(Math.random()*remainingPins);
    
    if (frame_number != 10){
        if (droppedPins == remainingPins){
            if (rollNr == 0){
                return "X";
            } else {
                return "/";
            } 
        } else {
            return droppedPins;
        }
    } else {
        if(droppedPins == remainingPins){
            if (droppedPins == 10){
                return "X";
            } else {
                return "/";
            }
        } else {
            return droppedPins;
        }
    }

}